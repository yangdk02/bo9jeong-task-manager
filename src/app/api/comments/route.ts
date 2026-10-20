import { NextResponse } from "next/server";
import { createComment } from "@/lib/server/mutations";

export async function POST(request: Request) {
  try { const id = await createComment(await request.json()); return NextResponse.json({ id }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "댓글을 등록하지 못했습니다." }, { status: 400 }); }
}
