import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OverviewSection } from "./OverviewSection";
import { useOverview } from "../hooks/useOverview";

vi.mock("../hooks/useOverview", () => ({
  useOverview: vi.fn(),
}));

const mockedUseOverview = vi.mocked(useOverview);

afterEach(cleanup);

describe("OverviewSection", () => {
  it("renders a visible error state instead of zeroed stats when the backend call failed", () => {
    mockedUseOverview.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    } as ReturnType<typeof useOverview>);

    render(<OverviewSection />);

    expect(screen.getByText(/couldn't load this data/i)).toBeInTheDocument();
    expect(screen.queryByText("TVL")).not.toBeInTheDocument();
  });

  it("renders real stat values on success", () => {
    mockedUseOverview.mockReturnValue({
      data: {
        tvlUsd: 1000,
        volumeUsd: 500,
        swapsCount: 3,
        swapsVolumeUsd: 200,
      },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useOverview>);

    render(<OverviewSection />);

    expect(screen.getByText("TVL")).toBeInTheDocument();
    expect(screen.getByText("$1.00K")).toBeInTheDocument();
    expect(
      screen.queryByText(/couldn't load this data/i)
    ).not.toBeInTheDocument();
  });
});
