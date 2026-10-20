import { NextResponse } from "next/server";
import { deleteAsset, updateAsset } from "@/lib/server/mutations";

type Context = { params: Promise<{ assetId: string }> };
function input(form: FormData) { return { project_id: String(form.get("project_id") ?? ""), asset_name: String(form.get("asset_name") ?? ""), asset_category: String(form.get("asset_category") ?? ""), version: String(form.get("version") ?? ""), status: String(form.get("status") ?? ""), note: String(form.get("note") ?? ""), owner_person_id: String(form.get("owner_person_id") ?? ""), actor_id: String(form.get("actor_id") ?? "") }; }
export async function PATCH(request: Request, { params }: Context) {
  try { const { assetId } = await params; const form = await request.formData(); const candidate = form.get("file"); await updateAsset(assetId, input(form), candidate instanceof File ? candidate : undefined); return NextResponse.json({ id: assetId }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "자료를 수정하지 못했습니다." }, { status: 400 }); }
}
export async function DELETE(_: Request, { params }: Context) {
  try { const { assetId } = await params; await deleteAsset(assetId); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "자료를 삭제하지 못했습니다." }, { status: 400 }); }
}
