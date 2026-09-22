/**
 * Builds the request payloads the k6 scenario replays.
 *
 * k6 runs its own JS VM with no npm modules, so it cannot build Stellar XDR
 * itself. The envelopes are generated here once and written to fixtures.json.
 *
 * The balance envelopes mirror how the app actually reads balances — building
 * a `balance()` transaction and simulating it, not reading a ledger entry (see
 * packages/orchestrator/src/stellar/sorobanBalance.ts). Getting this wrong
 * would benchmark a method the app barely calls.
 *
 *   node scripts/load/generate-fixtures.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAssetsConfig, parseAllVaultIds } from "@neko-protocol/keeper";
import {
  Account,
  Address,
  Contract,
  Networks,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

const PASSPHRASE = Networks.PUBLIC;

/** Public endpoint, used only to check the envelopes before freezing them. */
const PROBE_RPC_URL = "https://mainnet.sorobanrpc.com";

/**
 * A source account that exists on mainnet, taken from a recent transaction.
 *
 * Simulation checks neither the signature nor the sequence number, but it does
 * price the transaction against a real account, so an address that has never
 * been funded makes the call fail for a reason that has nothing to do with
 * what we are measuring.
 */
const SOURCE = "GDYDTMY46RNAUIIUVG6RPD2D3I3ES4J2SSXGCKIQP2OET4Q5PV75LSPL";

/**
 * Contracts come from the asset catalogue rather than being copied here, so
 * the benchmark keeps exercising whatever the app actually holds and cannot
 * drift into testing addresses that no longer exist.
 */
const CODES = ["USDC", "XLM", "EURC", "CETES"];
const TOKENS = Object.fromEntries(
  CODES.map((code) => {
    const asset = getAssetsConfig("mainnet")[code];
    if (!asset?.contract) {
      throw new Error(`${code} has no contract in the mainnet catalogue`);
    }
    return [code, asset.contract];
  })
);

/**
 * Two shapes of holder, because they cache differently.
 *
 * Shared addresses stand in for state every visitor reads — vault positions,
 * oracle-backed totals — which one cache entry serves for everyone. The others
 * stand in for per-wallet balances, which are distinct per user and are the
 * part that does not collapse. A run made only of shared reads would flatter
 * the cache; only of per-wallet reads would hide it.
 */
/**
 * Holders are funded mainnet accounts, pulled from recent ledger activity.
 *
 * A generated address would be simpler, but `balance()` against an account
 * holding nothing aborts on the missing trustline before the contract does any
 * real work. That call is cheaper than the one the app makes, so it would
 * understate what a balance read costs.
 *
 * Every envelope is simulated once at generation time and only kept if it
 * returns a value, so the scenario cannot silently drift into measuring an
 * error path.
 */
async function fetchFundedAccounts(limit) {
  const res = await fetch(
    `https://horizon.stellar.org/transactions?order=desc&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Horizon returned ${res.status}`);
  const body = await res.json();
  return [
    ...new Set(body._embedded.records.map((r) => r.source_account)),
  ];
}

async function fetchRecentTxHashes(limit) {
  const res = await fetch(
    `https://horizon.stellar.org/transactions?order=desc&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Horizon returned ${res.status}`);
  const body = await res.json();
  return body._embedded.records.map((r) => r.hash);
}

async function simulates(envelope) {
  const res = await fetch(PROBE_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "simulateTransaction",
      params: { transaction: envelope },
    }),
  });
  if (!res.ok) return false;
  const body = await res.json();
  const result = body.result;
  return Boolean(result && !result.error && result.results?.length);
}

function balanceEnvelope(contractId, holder) {
  const account = new Account(SOURCE, "0");
  const operation = new Contract(contractId).call(
    "balance",
    new Address(holder).toScVal()
  );
  return new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(300)
    .build()
    .toXDR();
}

/** Ledger key for a contract's instance entry — shared state, highly cacheable. */
function contractInstanceKey(contractId) {
  return xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(contractId).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent(),
    })
  ).toXDR("base64");
}

/**
 * Holders come from two places on purpose.
 *
 * Vault contracts hold the assets the app is built around, and reading their
 * balances is literally what the dashboard does on every load — so they cover
 * the tokens no ordinary account holds. Funded user accounts cover the native
 * asset and keep the set from being entirely contract-shaped.
 */
const vaults = parseAllVaultIds();
const accounts = await fetchFundedAccounts(30);
if (accounts.length < 6) {
  throw new Error(`only ${accounts.length} funded accounts found`);
}

/**
 * Two shapes of read, because they cache differently. The first two accounts
 * stand in for state every visitor loads — one cache entry serves everyone.
 * The rest stand in for per-wallet balances, which stay distinct per user and
 * are the part a cache cannot collapse. A run made only of the first would
 * flatter the cache; only of the second would hide it.
 */
const shared = vaults.slice(0, 3);
const perWallet = accounts.slice(0, 6);

const simulate = [];
const rejected = [];
for (const [code, contractId] of Object.entries(TOKENS)) {
  for (const [holders, isShared] of [
    [shared, true],
    [perWallet, false],
  ]) {
    for (const holder of holders) {
      const envelope = balanceEnvelope(contractId, holder);
      if (await simulates(envelope)) {
        simulate.push({
          label: `${code}:${isShared ? "shared" : "wallet"}`,
          shared: isShared,
          envelope,
        });
      } else {
        rejected.push(`${code}/${holder.slice(0, 8)}`);
      }
    }
  }
}

if (simulate.length === 0) {
  throw new Error("no envelope simulated successfully; cannot build fixtures");
}

/**
 * Real hashes, so status polling resolves a transaction the node has to look
 * up rather than short-circuiting on a malformed argument.
 */
const txHashes = await fetchRecentTxHashes(6);

const fixtures = {
  generatedFor: "mainnet",
  note: "Regenerate with: node scripts/load/generate-fixtures.mjs",
  simulate,
  ledgerKeys: Object.values(TOKENS).map(contractInstanceKey),
  txHashes,
};

const outPath = join(dirname(fileURLToPath(import.meta.url)), "fixtures.json");
writeFileSync(outPath, `${JSON.stringify(fixtures, null, 2)}\n`);
console.log(
  `wrote ${outPath}: ${simulate.length} verified simulate envelopes ` +
    `(${simulate.filter((s) => s.shared).length} shared, ` +
    `${simulate.filter((s) => !s.shared).length} per-wallet), ` +
    `${fixtures.ledgerKeys.length} ledger keys, ${txHashes.length} tx hashes`
);
if (rejected.length) {
  console.log(
    `skipped ${rejected.length} that did not return a value ` +
      `(no trustline or no holding): ${rejected.join(", ")}`
  );
}
