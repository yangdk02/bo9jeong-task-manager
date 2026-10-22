import { describe, expect, it } from "vitest";
import type { Task, Work } from "@/lib/domain/schemas";
import { isTaskVisibleInMonth, taskWorksForMonth } from "./task-period";

const onceTask = {
  task_id: "T-ONCE",
  project_id: "P1",
  target_scope: "촬영",
  task_name: "일회성 촬영",
  cycle: "once",
  target_count: 2,
  target_unit: "회",
  status: "active",
  created_by: "U1",
  created_at: "2026-10-02T09:00:00+09:00",
} as Task;

function work(id: string, date: string, status: Work["status"] = "completed") {
  return { work_id: id, task_id: onceTask.task_id, work_date: date, status } as Work;
}

describe("one-time task period", () => {
  it("shows a one-time task only in its creation month", () => {
    expect(isTaskVisibleInMonth(onceTask, "2026-10")).toBe(true);
    expect(isTaskVisibleInMonth(onceTask, "2026-11")).toBe(false);
  });

  it("does not show a one-time task before its creation month", () => {
    expect(isTaskVisibleInMonth(onceTask, "2026-09")).toBe(false);
  });

  it("counts only works completed in the selected month", () => {
    const works = [work("W1", "2026-10-10"), work("W2", "2026-11-03"), work("W3", "2026-12-01", "draft")];
    expect(taskWorksForMonth(onceTask, works, "2026-10").map((item) => item.work_id)).toEqual(["W1"]);
    expect(taskWorksForMonth(onceTask, works, "2026-11").map((item) => item.work_id)).toEqual(["W2"]);
  });
});
