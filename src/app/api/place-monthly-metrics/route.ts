import { NextResponse } from "next/server";

export async function PUT() {
  return NextResponse.json({ error: "방문자 수는 플레이스 관리 작업 등록에서 입력해 주세요." }, { status: 410 });
}
