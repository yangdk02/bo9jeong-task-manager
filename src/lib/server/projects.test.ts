import { describe, expect, it } from "vitest";
import { isContractExpired } from "@/lib/server/projects";

describe("project contract period", () => {
  it("classifies only projects whose end date has passed", () => {
    expect(isContractExpired({ end_date: "2026-10-22" }, "2026-10-23")).toBe(true);
    expect(isContractExpired({ end_date: "2026-10-23" }, "2026-10-23")).toBe(false);
    expect(isContractExpired({ end_date: "2026-12-31" }, "2026-10-23")).toBe(false);
  });
});
