import { NextResponse } from "next/server";
import { createPerson } from "@/lib/server/mutations";

export async function POST(request: Request) {
  try {
    const person = await createPerson(await request.json());
    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "담당자를 추가하지 못했습니다." }, { status: 400 });
  }
}
