import { describe, expect, it } from "vitest";
import type { Task, Work } from "@/lib/domain/schemas";
import { isTaskVisibleInMonth, onceTaskCompletionMonth, taskWorksForMonth } from "./task-period";

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

describe("once task carry-over", () => {
  it("carries an incomplete October task into later months", () => {
    expect(isTaskVisibleInMonth(onceTask, [work("W1", "2026-10-10")], "2026-10")).toBe(true);
    expect(isTaskVisibleInMonth(onceTask, [work("W1", "2026-10-10")], "2026-11")).toBe(true);
  });

  it("shows a completed task through its completion month but not the next month", () => {
    const works = [work("W1", "2026-10-10"), work("W2", "2026-11-03")];
    expect(onceTaskCompletionMonth(onceTask, works)).toBe("2026-11");
    expect(isTaskVisibleInMonth(onceTask, works, "2026-11")).toBe(true);
    expect(isTaskVisibleInMonth(onceTask, works, "2026-12")).toBe(false);
  });

  it("does not show a one-time task before its creation month", () => {
    expect(isTaskVisibleInMonth(onceTask, [], "2026-09")).toBe(false);
  });

  it("uses cumulative works for one-time tasks", () => {
    const works = [work("W1", "2026-10-10"), work("W2", "2026-11-03"), work("W3", "2026-12-01", "draft")];
    expect(taskWorksForMonth(onceTask, works, "2026-11").map((item) => item.work_id)).toEqual(["W1", "W2"]);
  });
});
