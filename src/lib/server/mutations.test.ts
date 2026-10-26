import { describe, expect, it } from "vitest";
import { assetInputSchema, commentInputSchema, personInputSchema, placeMonthlyMetricInputSchema, projectCreationInputSchema, workCreationInputSchema, workFileDeleteInputSchema } from "./mutations";

const validAsset = {
  project_id: "PRJ-1",
  asset_name: "브랜드 가이드",
  asset_category: "브랜드 가이드",
  version: "v1",
  status: "active",
  note: "최종 배포본",
  owner_person_id: "USR-1",
  actor_id: "USR-2",
};

describe("place monthly metric input", () => {
  it("allows an actual zero but rejects negative and decimal visitor counts", () => {
    const base = { task_id: "TSK-1", year_month: "2026-10", actor_id: "USR-1" };
    expect(placeMonthlyMetricInputSchema.parse({ ...base, visitor_count: "0" }).visitor_count).toBe(0);
    expect(placeMonthlyMetricInputSchema.safeParse({ ...base, visitor_count: -1 }).success).toBe(false);
    expect(placeMonthlyMetricInputSchema.safeParse({ ...base, visitor_count: 1.5 }).success).toBe(false);
  });
});

describe("asset input", () => {
  it("accepts the existing asset schema fields", () => {
    expect(assetInputSchema.parse(validAsset)).toMatchObject(validAsset);
  });

  it("rejects an unsupported category", () => {
    expect(assetInputSchema.safeParse({ ...validAsset, asset_category: "임의 유형" }).success).toBe(false);
  });
});

describe("comment input", () => {
  it("accepts a trimmed assignee comment", () => {
    expect(commentInputSchema.parse({ target_type: "work", target_id: "WRK-1", author_person_id: "USR-1", body: "  확인했습니다.  " }).body).toBe("확인했습니다.");
  });

  it("rejects an empty or oversized comment", () => {
    expect(commentInputSchema.safeParse({ target_type: "asset", target_id: "AST-1", author_person_id: "USR-1", body: " " }).success).toBe(false);
    expect(commentInputSchema.safeParse({ target_type: "asset", target_id: "AST-1", author_person_id: "USR-1", body: "가".repeat(2001) }).success).toBe(false);
  });
});

describe("work file deletion input", () => {
  it("requires the current person", () => {
    expect(workFileDeleteInputSchema.parse({ actor_id: "USR-1" })).toEqual({ actor_id: "USR-1" });
    expect(workFileDeleteInputSchema.safeParse({ actor_id: "" }).success).toBe(false);
  });
});

describe("work asset registration input", () => {
  const work = { task_id: "TSK-1", work_date: "2026-10-22", title: "완료 작업", result_url: "", memo: "", status: "completed", assignee_ids: ["USR-1"], actor_id: "USR-1" };

  it("accepts asset options when creating a work", () => {
    expect(workCreationInputSchema.parse({ ...work, register_as_assets: true, asset_category: "카드뉴스", asset_version: "v2", asset_status: "completed" })).toMatchObject({ register_as_assets: true, asset_category: "카드뉴스", asset_version: "v2", asset_status: "completed" });
  });

  it("uses safe defaults when asset registration is not selected", () => {
    expect(workCreationInputSchema.parse(work)).toMatchObject({ register_as_assets: false, asset_category: "기타", asset_version: "v1", asset_status: "active" });
  });
});

describe("project creation input", () => {
  const project = {
    vendor_name: "테스트 업체",
    project_name: "통합 마케팅",
    management_category: "온라인 홍보",
    start_date: "2026-10-01",
    end_date: "2026-12-31",
    status: "active",
    assignee_ids: ["USR-1"],
    actor_id: "USR-1",
  };

  it("accepts tasks with their own targets and assignees", () => {
    const parsed = projectCreationInputSchema.parse({ ...project, tasks: [{ target_scope: "블로그", task_name: "블로그 포스팅", cycle: "monthly", target_count: "8", target_unit: "건", status: "active", assignee_ids: ["USR-1", "USR-1"] }] });
    expect(parsed.tasks[0].target_count).toBe(8);
    expect(parsed.tasks[0].assignee_ids).toEqual(["USR-1"]);
  });

  it("requires at least one selected task", () => {
    expect(projectCreationInputSchema.safeParse({ ...project, tasks: [] }).success).toBe(false);
  });
});

describe("person input", () => {
  it("accepts the six current departments and trims the name", () => {
    for (const department of ["경영관리", "총무", "기획", "영상촬영", "디자인", "마케팅"]) {
      expect(personInputSchema.parse({ name: "  홍길동  ", department })).toEqual({ name: "홍길동", department });
    }
  });

  it("rejects an unknown department or empty name", () => {
    expect(personInputSchema.safeParse({ name: "홍길동", department: "개발" }).success).toBe(false);
    expect(personInputSchema.safeParse({ name: " ", department: "마케팅" }).success).toBe(false);
  });
});
