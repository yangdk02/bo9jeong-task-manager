import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import type { ReportProject } from "./reports";
import { getReportSetupData } from "./reports";
import { generateReportPptx, reportInputSchema, reportPeriodLabel, reportSlideCount, reportTasksForPeriod } from "./report-pptx";
import { PLACE_MONTHLY_TASK_NAME } from "@/lib/domain/task-catalog";

vi.mock("./reports", async (importOriginal) => ({ ...(await importOriginal<typeof import("./reports")>()), getReportSetupData: vi.fn() }));

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
  it("prints the report period with full dates", () => {
    expect(reportPeriodLabel("2026-10-01", "2026-10-31")).toBe("2026.10.01 ~ 2026.10.31");
  });
  it("splits each task into pages of four completed works", () => {
    const project = {
      project: { project_id: "PRJ-1" },
      tasks: [{ task_id: "TSK-1", cycle: "monthly" }, { task_id: "TSK-2", cycle: "monthly" }],
      works: [
        ...Array.from({ length: 5 }, (_, index) => ({ work_id: `WRK-${index}`, task_id: "TSK-1", status: "completed", work_date: "2026-10-10", files: [] })),
        { work_id: "WRK-DRAFT", task_id: "TSK-2", status: "draft", work_date: "2026-10-10", files: [] },
      ],
    } as unknown as ReportProject;
    expect(reportSlideCount(project, "2026-10-01", "2026-10-31")).toBe(4);
  });

  it("excludes a one-time task outside its creation month", () => {
    const project = {
      project: { project_id: "PRJ-1" },
      tasks: [
        { task_id: "TSK-MONTHLY", cycle: "monthly", created_at: "2026-08-02T09:00:00+09:00" },
        { task_id: "TSK-ONCE", cycle: "once", created_at: "2026-08-02T09:00:00+09:00" },
      ],
      works: [],
    } as unknown as ReportProject;
    expect(reportTasksForPeriod(project, "2026-10-01", "2026-10-31").map((task) => task.task_id)).toEqual(["TSK-MONTHLY"]);
    expect(reportTasksForPeriod(project, "2026-08-01", "2026-10-31").map((task) => task.task_id)).toEqual(["TSK-MONTHLY", "TSK-ONCE"]);
    expect(reportSlideCount(project, "2026-10-01", "2026-10-31")).toBe(2);
  });

  it("does not generate an October slide for an August one-time shoot", async () => {
    const project = {
      project: { project_id: "PRJ-1", vendor_name: "제주담음식품", project_name: "온라인 홍보", management_category: "온라인 마케팅", start_date: "2026-08-01", end_date: "2027-01-31", status: "active", created_by: "USR-1", created_at: "2026-08-01T09:00:00+09:00" },
      tasks: [
        { task_id: "TSK-MONTHLY", project_id: "PRJ-1", target_scope: "블로그", task_name: "블로그 포스팅", cycle: "monthly", target_count: 1, target_unit: "건", status: "active", created_by: "USR-1", created_at: "2026-08-02T09:00:00+09:00" },
        { task_id: "TSK-SHOOT", project_id: "PRJ-1", target_scope: "촬영", task_name: "출사 (사진·영상 촬영)", cycle: "once", target_count: 1, target_unit: "회", status: "active", created_by: "USR-1", created_at: "2026-08-02T09:00:00+09:00" },
      ],
      works: [],
      placeMonthlyMetrics: [],
    } satisfies ReportProject;
    vi.mocked(getReportSetupData).mockResolvedValue({ people: [], projects: [project] });
    const output = await generateReportPptx({ project_id: "PRJ-1", start_date: "2026-10-01", end_date: "2026-10-31", comment: "" });
    const zip = await JSZip.loadAsync(output);
    expect(await zip.file("ppt/slides/slide2.xml")!.async("text")).toContain("블로그 포스팅");
    expect(zip.file("ppt/slides/slide3.xml")).toBeNull();
  });

  it("puts the place capture section and visitor comparison table on one slide", async () => {
    const project = {
      project: { project_id: "PRJ-1", vendor_name: "테스트 업체", project_name: "테스트 프로젝트", management_category: "온라인 홍보", start_date: "2026-01-01", end_date: "2026-12-31", status: "active", created_by: "USR-1", created_at: "2026-01-01T00:00:00+09:00" },
      tasks: [{ task_id: "TSK-PLACE", project_id: "PRJ-1", target_scope: "네이버 플레이스", task_name: PLACE_MONTHLY_TASK_NAME, cycle: "monthly", target_count: 1, target_unit: "회", status: "active", created_by: "USR-1", created_at: "2026-01-01T00:00:00+09:00" }],
      works: [{ work_id: "WRK-1", task_id: "TSK-PLACE", work_date: "2026-10-20", title: "10월 통계 캡처", result_url: "", memo: "", status: "completed", created_by: "USR-1", created_at: "2026-10-20T00:00:00+09:00", updated_at: "2026-10-20T00:00:00+09:00", files: [] }],
      placeMonthlyMetrics: [
        { place_metric_id: "PMM-1", task_id: "TSK-PLACE", year_month: "2026-09", visitor_count: 1240, entered_by: "USR-1", entered_at: "2026-10-01T00:00:00+09:00", updated_at: "2026-10-01T00:00:00+09:00" },
        { place_metric_id: "PMM-2", task_id: "TSK-PLACE", year_month: "2026-10", visitor_count: 1480, entered_by: "USR-1", entered_at: "2026-10-20T00:00:00+09:00", updated_at: "2026-10-20T00:00:00+09:00" },
      ],
    } satisfies ReportProject;
    vi.mocked(getReportSetupData).mockResolvedValue({ people: [], projects: [project] });
    const output = await generateReportPptx({ project_id: "PRJ-1", start_date: "2026-10-01", end_date: "2026-10-31", comment: "" });
    const zip = await JSZip.loadAsync(output);
    const taskSlide = await zip.file("ppt/slides/slide2.xml")!.async("text");
    expect(taskSlide).toContain("방문자 수");
    expect(taskSlide).toContain("1,240");
    expect(taskSlide).toContain("+19.4%");
  });
});
