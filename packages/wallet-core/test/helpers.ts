import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

export const PASSPHRASE = Networks.PUBLIC;
export const USDC = new Asset(
  "USDC",
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
);
export const USDC_ID = `USDC:${USDC.getIssuer()}`;

export function buildTx(
  source: string,
  ops: ReturnType<typeof Operation.payment>[]
): string {
  const builder = new TransactionBuilder(new Account(source, "1"), {
    fee: "100",
    networkPassphrase: PASSPHRASE,
  }).setTimeout(60);
  for (const op of ops) builder.addOperation(op);
  return builder.build().toXDR();
}

export function activationOps(sponsor: string, user: string) {
  return [
    Operation.beginSponsoringFutureReserves({
      sponsoredId: user,
      source: sponsor,
    }),
    Operation.createAccount({
      destination: user,
      startingBalance: "0",
      source: sponsor,
    }),
    Operation.changeTrust({ asset: USDC, source: user }),
    Operation.endSponsoringFutureReserves({ source: user }),
  ];
}

export const keys = () => ({
  sponsor: Keypair.random(),
  user: Keypair.random(),
});
