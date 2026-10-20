import { NextResponse } from "next/server";
import { deleteWorkFile } from "@/lib/server/mutations";

type Context = { params: Promise<{ workId: string; fileId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { workId, fileId } = await params;
    await deleteWorkFile(workId, fileId, await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "증빙 파일을 삭제하지 못했습니다." }, { status: 400 });
  }
}
