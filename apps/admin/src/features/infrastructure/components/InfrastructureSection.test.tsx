import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InfrastructureSection } from "./InfrastructureSection";
import { useInfrastructure } from "../hooks/useInfrastructure";
import type { InfrastructureSnapshot } from "../types";

vi.mock("../hooks/useInfrastructure", () => ({
  useInfrastructure: vi.fn(),
}));

// The charts read Grafana through a server-only module, which refuses to load
// outside a server component. This suite is about the live counters, so the
// history block is stubbed rather than pulled in.
vi.mock("./MetricsHistory", () => ({
  MetricsHistory: () => null,
}));

const mocked = vi.mocked(useInfrastructure);

function snapshot(
  overrides: Partial<InfrastructureSnapshot> = {}
): InfrastructureSnapshot {
  return {
    endpoints: [
      {
        label: "validation_cloud",
        host: "mainnet.stellar.validationcloud.io",
        priority: 0,
        state: "up",
        latestLedger: 64188050,
        ledgerLag: 0,
        consecutiveFailures: 0,
        lastCheckedAt: "2026-08-30T03:33:34.044Z",
        lastError: null,
      },
      {
        label: "onfinality",
        host: "stellar.api.onfinality.io",
        priority: 1,
        state: "down",
        latestLedger: null,
        ledgerLag: null,
        consecutiveFailures: 21,
        lastCheckedAt: "2026-08-30T03:33:34.044Z",
        lastError: "Request failed with status code 429",
      },
    ],
    usableCount: 1,
    byMethod: [
      { method: "simulateTransaction", ok: 90, error: 10, successRate: 0.9 },
    ],
    byEndpoint: [{ endpoint: "validation_cloud", ok: 90, error: 10 }],
    cache: [
      { method: "simulateTransaction", hit: 75, miss: 25, hitRate: 0.75 },
    ],
    failovers: [
      { from: "onfinality", to: "quasar", reason: "connection", count: 3 },
    ],
    totals: { ok: 90, error: 10, successRate: 0.9 },
    collectedAt: "2026-08-30T03:33:34.044Z",
    ...overrides,
  };
}

function mock(value: Partial<ReturnType<typeof useInfrastructure>>) {
  mocked.mockReturnValue(value as ReturnType<typeof useInfrastructure>);
}

afterEach(cleanup);

describe("InfrastructureSection", () => {
  it("shows an error state rather than zeroed stats when the call failed", () => {
    mock({ data: undefined, isLoading: false, error: new Error("boom") });

    render(<InfrastructureSection />);

    expect(
      screen.getByText(/could not load infrastructure metrics/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("Endpoint pool")).not.toBeInTheDocument();
  });

  it("renders pool state, rates and failovers", () => {
    mock({ data: snapshot(), isLoading: false, error: null });

    render(<InfrastructureSection />);

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    // 90% shows twice on purpose: the headline card and the per-method row.
    expect(screen.getAllByText("90.0%")).toHaveLength(2);
    expect(screen.getAllByText("75.0%")).toHaveLength(2);
    expect(screen.getByText("onfinality → quasar")).toBeInTheDocument();
    expect(screen.getByText("90 ok · 10 error")).toBeInTheDocument();
  });

  it("surfaces the reason an endpoint is down", () => {
    mock({ data: snapshot(), isLoading: false, error: null });

    render(<InfrastructureSection />);

    // Without this the table says "down" and leaves you guessing — the 429 is
    // what tells you it is a credential or quota problem, not an outage.
    expect(
      screen.getByText(/Request failed with status code 429/)
    ).toBeInTheDocument();
  });

  it("renders no traffic as unknown, not as zero percent", () => {
    mock({
      data: snapshot({
        byMethod: [],
        byEndpoint: [],
        cache: [],
        failovers: [],
        totals: { ok: 0, error: 0, successRate: null },
      }),
      isLoading: false,
      error: null,
    });

    render(<InfrastructureSection />);

    // An idle backend is not a broken one. Printing 0% here is the mistake
    // that made the Grafana success-rate alert page on an empty window.
    expect(screen.queryByText("0.0%")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/the primary has served every call/i)
    ).toBeInTheDocument();
  });
});
