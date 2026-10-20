import { NextResponse } from "next/server";
import { createTask } from "@/lib/server/mutations";

export async function POST(request: Request) {
  try { const id = await createTask(await request.json()); return NextResponse.json({ id }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "과업을 저장하지 못했습니다." }, { status: 400 }); }
}
