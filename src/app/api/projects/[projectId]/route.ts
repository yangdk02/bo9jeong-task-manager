import { NextResponse } from "next/server";
import { deleteProject, updateProject } from "@/lib/server/mutations";

type Context = { params: Promise<{ projectId: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try { const { projectId } = await params; await updateProject(projectId, await request.json()); return NextResponse.json({ id: projectId }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "프로젝트를 수정하지 못했습니다." }, { status: 400 }); }
}
export async function DELETE(_: Request, { params }: Context) {
  try { const { projectId } = await params; await deleteProject(projectId); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "프로젝트를 삭제하지 못했습니다." }, { status: 400 }); }
}
