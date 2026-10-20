import { describe, expect, it } from "vitest";
import { assetInputSchema } from "./mutations";

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
