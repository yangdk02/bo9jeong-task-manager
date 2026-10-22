import path from "node:path";
import { NextResponse } from "next/server";
import { saveStoredFile } from "@/lib/server/storage-backend";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: segments } = await params;
    if (segments.length < 2 || !["assets", "work_files"].includes(segments[0]) || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))) {
      throw new Error("잘못된 파일 경로입니다.");
    }
    const logicalPath = path.posix.join("storage", ...segments);
    const contents = Buffer.from(await request.arrayBuffer());
    await saveStoredFile(logicalPath, contents, request.headers.get("content-type") || undefined, { upsert: true });
    return NextResponse.json({ uploaded: true, file_path: logicalPath });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "백업 파일을 업로드하지 못했습니다." }, { status: 400 });
  }
}
