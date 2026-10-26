import { describe, expect, it } from "vitest";
import type { PlaceMonthlyMetric } from "./schemas";
import { placeMetricComparison } from "./place-metrics";

function metric(yearMonth: string, visitorCount: number): PlaceMonthlyMetric {
  return { place_metric_id: `PMM-${yearMonth}`, task_id: "TSK-PLACE", year_month: yearMonth, visitor_count: visitorCount, entered_by: "USR-1", entered_at: "2026-10-01T00:00:00+09:00", updated_at: "2026-10-01T00:00:00+09:00" };
}

describe("place visitor comparison", () => {
  it("calculates the previous-month difference and rate", () => {
    const result = placeMetricComparison([metric("2026-09", 1240), metric("2026-10", 1480)], "TSK-PLACE", "2026-10");
    expect(result).toMatchObject({ previous: 1240, current: 1480, difference: 240, rate: "+19.4%" });
  });

  it("distinguishes missing data, actual zero, and a new increase from zero", () => {
    expect(placeMetricComparison([], "TSK-PLACE", "2026-10")).toMatchObject({ previous: undefined, current: undefined, rate: undefined });
    expect(placeMetricComparison([metric("2026-09", 0), metric("2026-10", 0)], "TSK-PLACE", "2026-10").rate).toBe("변동 없음");
    expect(placeMetricComparison([metric("2026-09", 0), metric("2026-10", 12)], "TSK-PLACE", "2026-10").rate).toBe("신규");
  });
});
