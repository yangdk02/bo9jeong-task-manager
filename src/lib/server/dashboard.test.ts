import { describe, expect, it } from "vitest";
import { calculateProjectProgress, getDashboardData, seoulMonthKey } from "./dashboard";
import type { Project, Task, Work } from "@/lib/domain/schemas";
import { readTable } from "@/lib/server/csv-repository";
import { getProjectDetailData, getProjectListData } from "@/lib/server/projects";
import { getWorkDetailData } from "@/lib/server/works";
import { getTaskDetailData } from "@/lib/server/tasks";
import { getAssetDetailData, getAssetListData } from "@/lib/server/assets";
import { getReportSetupData } from "@/lib/server/reports";

const project = { project_id: "P1", vendor_name: "업체", project_name: "프로젝트" } as Project;
const task = { task_id: "T1", project_id: "P1", cycle: "monthly", target_count: 4 } as Task;

describe("dashboard metrics", () => {
  it("uses the Seoul calendar month", () => {
    expect(seoulMonthKey(new Date("2026-09-30T15:30:00Z"))).toBe("2026-10");
  });

  it("counts one completed work row as one result", () => {
    const works = [
      { task_id: "T1", work_date: "2026-10-02", status: "completed" },
      { task_id: "T1", work_date: "2026-10-03", status: "draft" },
      { task_id: "T1", work_date: "2026-09-30", status: "completed" },
    ] as Work[];
    expect(calculateProjectProgress([project], [task], works, "2026-10")[0]).toMatchObject({
      target: 4,
      completed: 1,
      remaining: 3,
      percent: 25,
    });
  });

  it("keeps the real rate and excess count when work exceeds the target", () => {
    const works = Array.from({ length: 5 }, (_, index) => ({
      task_id: "T1", work_date: `2026-10-${String(index + 1).padStart(2, "0")}`, status: "completed",
    })) as Work[];
    expect(calculateProjectProgress([project], [task], works, "2026-10")[0]).toMatchObject({
      target: 4,
      completed: 5,
      remaining: 0,
      exceeded: 1,
      percent: 125,
    });
  });

  it("reads the October sample data through the repository", async () => {
    const dashboard = await getDashboardData(new Date("2026-10-20T03:00:00Z"));
    expect(dashboard.totals).toMatchObject({ target: 40, completed: 29, remaining: 11 });
    expect(dashboard.projectProgress).toHaveLength(3);
    expect(dashboard.people).toHaveLength(20);
    expect(dashboard.recentWorks).toHaveLength(5);
  });

  it("validates all ten sample CSV tables", async () => {
    const tables = await Promise.all([
      readTable("people"), readTable("projects"), readTable("project_assignees"),
      readTable("tasks"), readTable("task_assignees"), readTable("works"),
      readTable("work_assignees"), readTable("work_files"), readTable("assets"),
      readTable("comments"),
    ]);
    expect(tables.map((rows) => rows.length)).toEqual([20, 3, 14, 11, 22, 45, 64, 46, 12, 30]);
  });

  it("builds project list progress from October sample work", async () => {
    const result = await getProjectListData(new Date("2026-10-20T03:00:00Z"));
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({ target: 14, completed: 9, percent: 64, monthlyTaskCount: 3, onceTaskCount: 1 });
  });

  it("carries only the incomplete October one-time task into November", async () => {
    const result = await getProjectListData(new Date("2026-11-20T03:00:00Z"));
    expect(result.items.map((item) => item.onceTaskCount)).toEqual([0, 0, 1]);
    expect(result.items[2]).toMatchObject({ target: 6, completed: 1, onceTaskCount: 1 });
  });

  it("builds a project detail with assignments and nested work", async () => {
    const result = await getProjectDetailData("PRJ-2026-001", new Date("2026-10-20T03:00:00Z"));
    expect(result?.assignees).toHaveLength(5);
    expect(result?.tasks).toHaveLength(4);
    expect(result?.tasks.flatMap((task) => task.works)).not.toHaveLength(0);
  });

  it("builds a work detail with its project, assignees, files, and activity", async () => {
    const result = await getWorkDetailData("WRK-001");
    expect(result?.project.project_id).toBe("PRJ-2026-001");
    expect(result?.assignees).toHaveLength(2);
    expect(result?.files).toHaveLength(2);
    expect(result?.comments).toHaveLength(2);
  });

  it("builds the remaining data-backed pages", async () => {
    const [task, assets, asset, reports] = await Promise.all([
      getTaskDetailData("TSK-001"),
      getAssetListData(),
      getAssetDetailData("AST-001"),
      getReportSetupData(),
    ]);
    expect(task?.task.works.length).toBeGreaterThan(0);
    expect(assets.items).toHaveLength(12);
    expect(asset?.project.project_id).toBe("PRJ-2026-001");
    expect(reports.projects).toHaveLength(3);
  });
});
