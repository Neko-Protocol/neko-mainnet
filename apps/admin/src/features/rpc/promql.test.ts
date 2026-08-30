import { describe, expect, it } from "vitest";
import { jobFor, toSeries } from "./promql";

describe("toSeries", () => {
  it("maps NaN to null rather than zero", () => {
    // Prometheus returns NaN for an empty division — no traffic in that
    // window. Charting it as 0 draws a success-rate collapse where nothing
    // was happening, which is the failure this whole page exists to avoid.
    const [s] = toSeries(
      [
        {
          metric: {},
          values: [
            [1700000000, "1"],
            [1700000060, "NaN"],
            [1700000120, "0.5"],
          ],
        },
      ],
      "success"
    );

    expect(s.points.map((p) => p.v)).toEqual([1, null, 0.5]);
  });

  it("maps infinities to null too", () => {
    // A quantile over an empty histogram is unknown, not enormous.
    const [s] = toSeries([
      {
        metric: {},
        values: [
          [1700000000, "+Inf"],
          [1700000060, "-Inf"],
        ],
      },
    ]);

    expect(s.points.every((p) => p.v === null)).toBe(true);
  });

  it("converts Prometheus seconds to milliseconds", () => {
    const [s] = toSeries([{ metric: {}, values: [[1700000000, "1"]] }]);

    expect(s.points[0].t).toBe(1700000000 * 1000);
  });

  it("names a series by its first real label, ignoring __name__", () => {
    const [s] = toSeries([
      {
        metric: { __name__: "neko_rpc_requests_total", outcome: "ok" },
        values: [],
      },
    ]);

    expect(s.key).toBe("ok");
  });

  it("prefers an explicit label when given one", () => {
    const [s] = toSeries(
      [{ metric: { outcome: "ok" }, values: [] }],
      "success"
    );

    expect(s.key).toBe("success");
  });

  it("returns nothing for an absent result rather than throwing", () => {
    // A counter that has never incremented simply does not exist in
    // Prometheus — neko_rpc_failover_total does not until a failover happens.
    expect(toSeries(undefined)).toEqual([]);
  });
});

describe("jobFor", () => {
  it("builds the scrape job name from the instance id", () => {
    expect(jobFor("production", "3548126")).toBe(
      "integrations/metrics_endpoint/3548126-metrics-endpoint-neko-backend-production"
    );
  });
});
