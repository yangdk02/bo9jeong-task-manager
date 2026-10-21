import { NextResponse } from "next/server";
import { generateReportPptx, reportInputSchema } from "@/lib/server/report-pptx";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const input = reportInputSchema.parse(await request.json());
    const file = await generateReportPptx(input);
    const safeName = `보구정_결과보고서_${input.start_date}_${input.end_date}.pptx`;
    const body = new ArrayBuffer(file.byteLength);
    new Uint8Array(body).set(file);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "content-disposition": `attachment; filename="bo9jeong-report-${input.start_date}-${input.end_date}.pptx"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "보고서를 생성하지 못했습니다." }, { status: 400 });
  }
}
