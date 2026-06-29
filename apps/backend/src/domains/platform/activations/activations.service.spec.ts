jest.mock("@domains/platform/audit/audit.service", () => ({
  AuditService: class {},
}));

import { ConflictException, NotFoundException } from "@nestjs/common";
import { EmailService } from "@core/email/email.service";
import { StellarRpcService } from "@core/stellar/stellar-rpc.service";
import { SupabaseService } from "@core/supabase/supabase.service";
import { AuditService } from "@domains/platform/audit/audit.service";
import { ActivationsService } from "./activations.service";

const ACTIVATION_ID = "11111111-1111-4111-8111-111111111111";
const PARTICIPANT_ID = "22222222-2222-4222-8222-222222222222";
const STELLAR_ADMIN =
  "GBVA5GERSXES3G47GHQWZMDJ4IXT72SV4BBCJV3PUPQ4QDRF5UCYH5HQ";
const STELLAR_DEST = "GCUQVPUT6OX6NMHJ2HUWWBTW2CZ4NIRXSMXB5K3JV2ZD3CGELK6KMDW3";
const STELLAR_DEST_SKIP =
  "GARKF5ASIYKJXBYDJMXXVACE3FSXT3OAODWVMTGPRILZKZZSH4R22FRX";

type DbResult = { data?: unknown; error?: unknown };

function makeDb(results: Record<string, DbResult[]>) {
  const queues = new Map<string, DbResult[]>(
    Object.entries(results).map(([k, v]) => [k, [...v]])
  );
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];

  const next = (table: string): DbResult => {
    const queue = queues.get(table);
    if (!queue?.length) return { data: null, error: null };
    return queue.shift()!;
  };

  const from = jest.fn((table: string) => {
    const builder: Record<string, unknown> = {};
    const chainMethods = [
      "select",
      "insert",
      "update",
      "delete",
      "eq",
      "lt",
      "in",
      "not",
      "order",
      "limit",
    ];
    for (const method of chainMethods) {
      builder[method] = jest.fn((...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      });
    }
    const terminal = () => Promise.resolve(next(table));
    builder.single = jest.fn(terminal);
    builder.maybeSingle = jest.fn(terminal);
    builder.then = (
      resolve: (value: DbResult) => unknown,
      reject?: (reason: unknown) => unknown
    ) => terminal().then(resolve, reject);
    return builder;
  });

  const rpc = jest.fn(() => Promise.resolve({ data: 0, error: null }));

  const supabase = {
    get client() {
      return { from, rpc };
    },
  } as unknown as SupabaseService;

  return { supabase, from, rpc, calls };
}

function mockSourceAccount(publicKey: string) {
  let seq = 1;
  return {
    accountId: () => publicKey,
    sequenceNumber: () => String(seq),
    incrementSequenceNumber: () => {
      seq += 1;
    },
  };
}

function makeAudit(): AuditService {
  return {
    record: jest.fn(() => Promise.resolve({ ok: true })),
  } as unknown as AuditService;
}

function makeStellar(
  overrides?: Partial<{
    loadAccount: jest.Mock;
    submitTransaction: jest.Mock;
  }>
): StellarRpcService {
  return {
    getNetworkPassphrase: () => "Test SDF Network ; September 2015",
    horizon: {
      loadAccount: overrides?.loadAccount ?? jest.fn(),
      submitTransaction: overrides?.submitTransaction ?? jest.fn(),
    },
  } as unknown as StellarRpcService;
}

function makeEmail(): EmailService {
  return {
    send: jest.fn(),
    sendBatch: jest.fn(),
  } as unknown as EmailService;
}

function buildService(
  db: ReturnType<typeof makeDb>,
  stellar?: StellarRpcService
) {
  return new ActivationsService(
    db.supabase,
    stellar ?? makeStellar(),
    makeEmail(),
    makeAudit()
  );
}

describe("ActivationsService", () => {
  describe("create()", () => {
    it("lowercases, trims and dedupes emails before inserting participants", async () => {
      const db = makeDb({
        activations: [
          { data: { id: ACTIVATION_ID, name: "Bootcamp" }, error: null },
        ],
        activation_participants: [{ data: null, error: null }],
      });
      const svc = buildService(db);

      const result = await svc.create({
        name: "Bootcamp",
        reward_xlm: 5,
        expires_at: "2026-12-31T00:00:00.000Z",
        emails: ["  Alice@Example.com ", "alice@example.com", "bob@x.io"],
      });

      expect(result.email_count).toBe(2);
      const participantInsert = db.calls.find(
        (c) => c.table === "activation_participants" && c.method === "insert"
      );
      expect(participantInsert?.args[0]).toEqual([
        { activation_id: ACTIVATION_ID, email: "alice@example.com" },
        { activation_id: ACTIVATION_ID, email: "bob@x.io" },
      ]);
    });

    it("persists payout_asset and reward_amount for USDC activations", async () => {
      const db = makeDb({
        activations: [
          { data: { id: ACTIVATION_ID, name: "USDC Bootcamp" }, error: null },
        ],
        activation_participants: [{ data: null, error: null }],
      });
      const svc = buildService(db);

      await svc.create({
        name: "USDC Bootcamp",
        reward_xlm: 10,
        payout_asset: "USDC",
        expires_at: "2026-12-31T00:00:00.000Z",
        emails: ["a@b.co"],
      });

      const activationInsert = db.calls.find(
        (c) => c.table === "activations" && c.method === "insert"
      );
      expect(activationInsert?.args[0]).toMatchObject({
        reward_xlm: 10,
        reward_amount: 10,
        payout_asset: "USDC",
      });
    });

    it("rolls back the activation when participant insert fails", async () => {
      const db = makeDb({
        activations: [
          { data: { id: ACTIVATION_ID }, error: null },
          { data: null, error: null },
        ],
        activation_participants: [{ data: null, error: { message: "boom" } }],
      });
      const svc = buildService(db);

      await expect(
        svc.create({
          name: "X",
          reward_xlm: 1,
          expires_at: "2026-12-31T00:00:00.000Z",
          emails: ["a@b.co"],
        })
      ).rejects.toThrow();

      expect(
        db.calls.some((c) => c.table === "activations" && c.method === "delete")
      ).toBe(true);
    });
  });

  describe("list()", () => {
    it("reconciles then aggregates participant counts per activation", async () => {
      const db = makeDb({
        activations: [
          {
            data: [
              {
                id: ACTIVATION_ID,
                name: "Bootcamp",
                reward_xlm: "5",
                expires_at: "2026-12-31T00:00:00.000Z",
                created_by: null,
                created_at: "2026-06-01T00:00:00.000Z",
              },
            ],
            error: null,
          },
        ],
        activation_participants: [
          {
            data: [
              { activation_id: ACTIVATION_ID, status: "pending" },
              { activation_id: ACTIVATION_ID, status: "payable" },
              { activation_id: ACTIVATION_ID, status: "paying" },
              { activation_id: ACTIVATION_ID, status: "paid" },
            ],
            error: null,
          },
        ],
      });
      const svc = buildService(db);

      const list = await svc.list();

      expect(db.rpc).toHaveBeenCalledWith("activation_reconcile", {
        p_activation_id: null,
      });
      expect(list).toHaveLength(1);
      expect(list[0].reward_xlm).toBe(5);
      expect(list[0].counts).toEqual({
        total: 4,
        pending: 1,
        payable: 2,
        paid: 1,
      });
    });
  });

  describe("getById()", () => {
    it("404s for an unknown activation", async () => {
      const db = makeDb({
        activations: [{ data: null, error: null }],
        activation_participants: [{ data: [], error: null }],
      });
      const svc = buildService(db);

      await expect(svc.getById(ACTIVATION_ID)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe("submitPayout()", () => {
    it("409s when the participant is not in 'paying' state", async () => {
      const db = makeDb({
        activation_participants: [
          {
            data: {
              id: PARTICIPANT_ID,
              activation_id: ACTIVATION_ID,
              status: "paid",
              matched_wallet: "GDEST",
            },
            error: null,
          },
        ],
      });
      const svc = buildService(db);

      await expect(
        svc.submitPayout({
          participant_id: PARTICIPANT_ID,
          signed_xdr: "AAAA",
        })
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("cancelPayout()", () => {
    it("conditionally reverts paying -> payable", async () => {
      const db = makeDb({
        activation_participants: [{ data: null, error: null }],
      });
      const svc = buildService(db);

      await expect(svc.cancelPayout(PARTICIPANT_ID)).resolves.toEqual({
        ok: true,
      });

      const update = db.calls.find(
        (c) => c.table === "activation_participants" && c.method === "update"
      );
      expect(update?.args[0]).toEqual({
        status: "payable",
        payout_started_at: null,
      });
      const eqs = db.calls.filter(
        (c) => c.table === "activation_participants" && c.method === "eq"
      );
      expect(eqs.map((c) => c.args)).toEqual(
        expect.arrayContaining([
          ["id", PARTICIPANT_ID],
          ["status", "paying"],
        ])
      );
    });
  });

  describe("preparePayout()", () => {
    const ADMIN = STELLAR_ADMIN;
    const DEST = STELLAR_DEST;

    it("throws NO_TRUSTLINE for USDC when recipient lacks a trustline", async () => {
      const loadAccount = jest.fn(async (id: string) => {
        if (id === DEST) {
          return { balances: [{ asset_type: "native", balance: "10" }] };
        }
        return mockSourceAccount(ADMIN);
      });
      const stellar = makeStellar({ loadAccount });

      const db = makeDb({
        activation_participants: [
          {
            data: {
              id: PARTICIPANT_ID,
              activation_id: ACTIVATION_ID,
              status: "payable",
              matched_wallet: DEST,
              payout_started_at: null,
            },
            error: null,
          },
          { data: [{ id: PARTICIPANT_ID }], error: null },
          { data: null, error: null },
        ],
        activations: [
          {
            data: {
              id: ACTIVATION_ID,
              reward_xlm: "5",
              reward_amount: "5",
              payout_asset: "USDC",
            },
            error: null,
          },
        ],
      });
      const svc = buildService(db, stellar);

      await expect(
        svc.preparePayout({
          participant_id: PARTICIPANT_ID,
          admin_wallet: ADMIN,
        })
      ).rejects.toMatchObject({
        response: { code: "NO_TRUSTLINE" },
      });
    });

    it("returns XDR for XLM activations", async () => {
      const loadAccount = jest.fn(async (id: string) => {
        if (id === DEST) {
          return { balances: [{ asset_type: "native", balance: "10" }] };
        }
        return mockSourceAccount(ADMIN);
      });
      const stellar = makeStellar({ loadAccount });

      const db = makeDb({
        activation_participants: [
          {
            data: {
              id: PARTICIPANT_ID,
              activation_id: ACTIVATION_ID,
              status: "payable",
              matched_wallet: DEST,
              payout_started_at: null,
            },
            error: null,
          },
          { data: [{ id: PARTICIPANT_ID }], error: null },
        ],
        activations: [
          {
            data: {
              id: ACTIVATION_ID,
              reward_xlm: "5",
              reward_amount: "5",
              payout_asset: "XLM",
            },
            error: null,
          },
        ],
      });
      const svc = buildService(db, stellar);

      const result = await svc.preparePayout({
        participant_id: PARTICIPANT_ID,
        admin_wallet: ADMIN,
      });

      expect(result.payout_asset).toBe("XLM");
      expect(result.xdr).toBeTruthy();
    });
  });

  describe("prepareBatchPayout()", () => {
    const ADMIN = STELLAR_ADMIN;
    const DEST_OK = STELLAR_DEST;
    const DEST_SKIP = STELLAR_DEST_SKIP;
    const PARTICIPANT_OK = "33333333-3333-4333-8333-333333333333";
    const PARTICIPANT_SKIP = "44444444-4444-4444-8444-444444444444";

    it("returns skipped for USDC recipients without a trustline", async () => {
      const loadAccount = jest.fn(async (id: string) => {
        if (id === DEST_SKIP) {
          return { balances: [{ asset_type: "native", balance: "10" }] };
        }
        if (id === DEST_OK) {
          return {
            balances: [
              { asset_type: "native", balance: "10" },
              {
                asset_type: "credit_alphanum4",
                asset_code: "USDC",
                asset_issuer:
                  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
              },
            ],
          };
        }
        return mockSourceAccount(ADMIN);
      });
      const stellar = makeStellar({ loadAccount });

      const db = makeDb({
        activations: [
          {
            data: {
              id: ACTIVATION_ID,
              reward_xlm: "5",
              reward_amount: "5",
              payout_asset: "USDC",
            },
            error: null,
          },
        ],
        activation_participants: [
          {
            data: [
              {
                id: PARTICIPANT_OK,
                activation_id: ACTIVATION_ID,
                status: "payable",
                matched_wallet: DEST_OK,
                payout_started_at: null,
              },
              {
                id: PARTICIPANT_SKIP,
                activation_id: ACTIVATION_ID,
                status: "payable",
                matched_wallet: DEST_SKIP,
                payout_started_at: null,
              },
            ],
            error: null,
          },
          { data: [{ id: PARTICIPANT_OK }], error: null },
          { data: [{ id: PARTICIPANT_SKIP }], error: null },
          { data: null, error: null },
        ],
      });
      const svc = buildService(db, stellar);

      const result = await svc.prepareBatchPayout({
        activation_id: ACTIVATION_ID,
        admin_wallet: ADMIN,
      });

      expect(result.payout_asset).toBe("USDC");
      expect(result.skipped).toEqual([
        { participant_id: PARTICIPANT_SKIP, reason: "NO_TRUSTLINE" },
      ]);
      expect(result.participant_ids).toEqual([PARTICIPANT_OK]);
      expect(result.xdr).toBeTruthy();
    });
  });
});
