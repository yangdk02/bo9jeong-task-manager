import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, validateUploadFiles } from "@/lib/upload-policy";

describe("upload policy", () => {
  it("accepts supported files within the combined limit", () => {
    expect(validateUploadFiles([{ name: "capture.png", size: 1024 }, { name: "report.pdf", size: 2048 }])).toBe("");
  });

  it("rejects video files", () => {
    expect(validateUploadFiles([{ name: "clip.mp4", size: 1024 }])).toContain("동영상");
  });

  it("rejects a combined payload larger than 4MB", () => {
    expect(validateUploadFiles([{ name: "one.png", size: MAX_UPLOAD_BYTES / 2 + 1 }, { name: "two.jpg", size: MAX_UPLOAD_BYTES / 2 }])).toContain("4MB");
  });
});
