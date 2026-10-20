import { describe, expect, it } from "vitest";
import { assetInputSchema, commentInputSchema } from "./mutations";

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
