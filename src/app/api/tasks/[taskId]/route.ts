import { NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/server/mutations";

type Context = { params: Promise<{ taskId: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try { const { taskId } = await params; await updateTask(taskId, await request.json()); return NextResponse.json({ id: taskId }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "과업을 수정하지 못했습니다." }, { status: 400 }); }
}
export async function DELETE(_: Request, { params }: Context) {
  try { const { taskId } = await params; await deleteTask(taskId); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "과업을 삭제하지 못했습니다." }, { status: 400 }); }
}
