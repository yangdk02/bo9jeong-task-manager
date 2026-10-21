import { describe, expect, it } from "vitest";
import type { ReportProject } from "./reports";
import { reportInputSchema, reportSlideCount } from "./report-pptx";

describe("report input", () => {
  it("accepts a valid project period and trims the comment", () => {
    const result = reportInputSchema.parse({ project_id: "PRJ-1", start_date: "2026-10-01", end_date: "2026-10-31", comment: "  월간 결과입니다.  " });
    expect(result.comment).toBe("월간 결과입니다.");
  });

  it("rejects a reversed period", () => {
    expect(reportInputSchema.safeParse({ project_id: "PRJ-1", start_date: "2026-10-31", end_date: "2026-10-01", comment: "" }).success).toBe(false);
  });
});

describe("report pages", () => {
  it("splits each task into pages of four completed works", () => {
    const project = {
      project: { project_id: "PRJ-1" },
      tasks: [{ task_id: "TSK-1" }, { task_id: "TSK-2" }],
      works: [
        ...Array.from({ length: 5 }, (_, index) => ({ work_id: `WRK-${index}`, task_id: "TSK-1", status: "completed", work_date: "2026-10-10", files: [] })),
        { work_id: "WRK-DRAFT", task_id: "TSK-2", status: "draft", work_date: "2026-10-10", files: [] },
      ],
    } as unknown as ReportProject;
    expect(reportSlideCount(project, "2026-10-01", "2026-10-31")).toBe(4);
  });
});
