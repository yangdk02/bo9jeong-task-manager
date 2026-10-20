import path from "node:path";
import { NextResponse } from "next/server";
import { getStoredFileUrl, readLocalStoredFile } from "@/lib/server/storage-backend";

const contentTypes: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  if (pathSegments.some((segment) => segment === ".." || segment.includes("/") || segment.includes("\\"))) {
    return NextResponse.json({ message: "잘못된 파일 경로입니다." }, { status: 400 });
  }
  const logicalPath = path.posix.join("storage", ...pathSegments);

  try {
    const signedUrl = await getStoredFileUrl(logicalPath);
    if (signedUrl) return NextResponse.redirect(signedUrl);

    const file = await readLocalStoredFile(logicalPath);
    return new NextResponse(file, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": contentTypes[path.extname(logicalPath).toLowerCase()] ?? "application/octet-stream",
      },
    });
  } catch {
    return NextResponse.json({ message: "파일을 찾을 수 없습니다." }, { status: 404 });
  }
}
