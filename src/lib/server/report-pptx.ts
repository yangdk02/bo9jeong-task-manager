import path from "node:path";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import sharp from "sharp";
import { z } from "zod";
import type { PlaceMonthlyMetric, Task, WorkFile } from "@/lib/domain/schemas";
import { getReportSetupData, type ReportProject } from "@/lib/server/reports";
import { readStoredFile } from "@/lib/server/storage-backend";
import { metricMonthLabel, metricValueLabel, placeMetricComparison } from "@/lib/domain/place-metrics";
import { PLACE_MONTHLY_TASK_NAME } from "@/lib/domain/task-catalog";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const reportInputSchema = z.object({
  project_id: z.string().min(1, "프로젝트를 선택해 주세요."),
  start_date: date,
  end_date: date,
  comment: z.string().trim().max(1500, "보고서 코멘트는 1,500자 이하로 입력해 주세요.").default(""),
}).refine((value) => value.start_date <= value.end_date, { message: "종료일은 시작일보다 빠를 수 없습니다.", path: ["end_date"] });

export type ReportInput = z.input<typeof reportInputSchema>;
type CompletedWork = ReportProject["works"][number];

const COLORS = {
  brown: "B08955",
  warmGray: "E6E0D6",
  lightGray: "D9D9D9",
  border: "242424",
  text: "191919",
  muted: "666666",
  blue: "0563C1",
  white: "FFFFFF",
};
const FONT_HEAD = "G마켓 산스 TTF Bold";
const FONT_BODY = "G마켓 산스 TTF Medium";
const SLIDE_W = 8.27;
const SLIDE_H = 11.69;
const MASTER_NAME = "BO9JEONG_REPORT";

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}.${month}.${day}`;
}

export function reportPeriodLabel(startDate: string, endDate: string) {
  return `${displayDate(startDate)} ~ ${displayDate(endDate)}`;
}

function generatedDate() {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function addFrame(slide: PptxGenJS.Slide) {
  slide.background = { color: COLORS.white };
  slide.addShape("rect", { x: 0, y: 0, w: SLIDE_W, h: 0.54, line: { color: COLORS.brown, transparency: 100 }, fill: { color: COLORS.brown } });
  slide.addShape("rect", { x: 0, y: 11.51, w: SLIDE_W, h: 0.18, line: { color: COLORS.brown, transparency: 100 }, fill: { color: COLORS.brown } });
}

function addText(slide: PptxGenJS.Slide, text: string, options: PptxGenJS.TextPropsOptions) {
  slide.addText(text, { fontFace: FONT_BODY, color: COLORS.text, margin: 0, breakLine: false, ...options });
}

function addSectionTitle(slide: PptxGenJS.Slide, title: string, pageNumber: number, pageTotal: number) {
  addText(slide, title, { x: 0.42, y: 0.78, w: 6.75, h: 0.42, fontFace: FONT_HEAD, fontSize: 18, bold: true, fit: "shrink" });
  addText(slide, `${pageNumber} / ${pageTotal}`, { x: 7.15, y: 0.85, w: 0.68, h: 0.2, fontSize: 8.5, color: COLORS.muted, align: "right" });
}

async function evidenceImage(file?: WorkFile) {
  if (!file || !/\.(png|jpe?g|gif|webp|svg)$/i.test(file.file_name)) return undefined;
  try {
    const original = await readStoredFile(file.file_path);
    const optimized = await sharp(original, { animated: false }).rotate().resize(1000, 760, { fit: "cover", position: "attention" }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    return `data:image/jpeg;base64,${optimized.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function prepareEvidenceImages(works: CompletedWork[]) {
  const files = [...new Map(works.flatMap((work) => work.files[0] ? [[work.files[0].file_path, work.files[0]] as const] : [])).values()];
  const images = new Map<string, string>();
  for (let index = 0; index < files.length; index += 5) {
    const batch = files.slice(index, index + 5);
    const loaded = await Promise.all(batch.map(async (file) => ({ path: file.file_path, image: await evidenceImage(file) })));
    for (const item of loaded) if (item.image) images.set(item.path, item.image);
  }
  return images;
}

function chunkWorks(works: CompletedWork[]) {
  if (!works.length) return [[]] as CompletedWork[][];
  const chunks: CompletedWork[][] = [];
  for (let index = 0; index < works.length; index += 4) chunks.push(works.slice(index, index + 4));
  return chunks;
}

async function repairPresentationPackage(file: Uint8Array) {
  const zip = await JSZip.loadAsync(file);
  const contentTypesPart = zip.file("[Content_Types].xml");
  if (!contentTypesPart) throw new Error("PPTX 콘텐츠 형식 정보를 찾을 수 없습니다.");
  let contentTypes = await contentTypesPart.async("string");
  const slideMasters = Object.keys(zip.files).filter((name) => /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(name));
  const existingMasters = new Set(slideMasters.map((name) => `/${name}`));
  contentTypes = contentTypes.replace(/<Override PartName="(\/ppt\/slideMasters\/slideMaster\d+\.xml)" ContentType="application\/vnd\.openxmlformats-officedocument\.presentationml\.slideMaster\+xml"\/>/g, (entry, partName: string) => existingMasters.has(partName) ? entry : "");
  for (const masterPath of slideMasters) {
    const partName = `/${masterPath}`;
    if (!contentTypes.includes(`PartName="${partName}"`)) {
      contentTypes = contentTypes.replace("</Types>", `<Override PartName="${partName}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/></Types>`);
    }
  }
  zip.file("[Content_Types].xml", contentTypes);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export function reportSlideCount(project: ReportProject, startDate: string, endDate: string) {
  const completed = project.works.filter((work) => work.status === "completed" && work.work_date >= startDate && work.work_date <= endDate);
  return 1 + project.tasks.reduce((sum, task) => sum + chunkWorks(completed.filter((work) => work.task_id === task.task_id)).length, 0);
}

function coverRows(project: ReportProject, completedWorks: CompletedWork[]) {
  return project.tasks.map((task) => {
    const count = completedWorks.filter((work) => work.task_id === task.task_id).length;
    return [
      { text: task.target_scope, options: { bold: true, fontFace: FONT_HEAD, valign: "middle" as const } },
      { text: `${task.task_name} ${count}${task.target_unit}`, options: { valign: "middle" as const } },
    ];
  });
}

async function addCover(pptx: PptxGenJS, selected: ReportProject, input: z.output<typeof reportInputSchema>, completedWorks: CompletedWork[], pageTotal: number) {
  const slide = pptx.addSlide({ masterName: MASTER_NAME });
  addFrame(slide);
  addText(slide, "BO9JEONGJEJU", { x: 0.55, y: 0.92, w: 3.5, h: 0.32, fontFace: FONT_HEAD, fontSize: 19, bold: true, color: COLORS.brown, charSpacing: 0.8 });
  addText(slide, "온라인 마케팅 결과 보고서", { x: 0.55, y: 1.42, w: 7.15, h: 0.7, fontFace: FONT_HEAD, fontSize: 29, bold: true, fit: "shrink" });

  const header: PptxGenJS.TableCellProps = { fill: { color: COLORS.warmGray }, bold: true, fontFace: FONT_HEAD, align: "center", valign: "middle" };
  slide.addTable([
    [
      { text: "관리업체", options: header }, { text: "관리 기간", options: header }, { text: "관리종목", options: header }, { text: "보고일자", options: header },
    ],
    [{ text: selected.project.vendor_name }, { text: `${displayDate(input.start_date)}\n${displayDate(input.end_date)}` }, { text: selected.project.management_category || "온라인 마케팅" }, { text: generatedDate() }],
  ], { x: 0.55, y: 2.18, w: 7.17, h: 1.06, colW: [2.16, 1.44, 2.04, 1.53], rowH: [0.38, 0.68], border: { type: "solid", color: COLORS.border, pt: 1 }, fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.text, align: "center", valign: "middle", margin: 0.06 });

  const taskRows = coverRows(selected, completedWorks);
  const rowHeight = Math.min(0.63, 2.72 / Math.max(taskRows.length, 1));
  slide.addTable([
    [{ text: "진행 내역", options: { ...header, colspan: 2 } }],
    ...(taskRows.length ? taskRows : [[{ text: "과업" }, { text: "등록된 과업이 없습니다." }]]),
  ], { x: 0.55, y: 3.38, w: 7.17, h: 0.38 + rowHeight * Math.max(taskRows.length, 1), colW: [2.8, 4.37], rowH: [0.38, ...Array(Math.max(taskRows.length, 1)).fill(rowHeight)], border: { type: "solid", color: COLORS.border, pt: 1 }, fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.text, valign: "middle", margin: 0.08 });

  const boxY = Math.min(7.15, 3.92 + rowHeight * Math.max(taskRows.length, 1));
  const evidenceCount = completedWorks.reduce((sum, work) => sum + work.files.length, 0);
  slide.addTable([
    [{ text: "보구정’s 코멘트", options: header }, { text: "진행 요약", options: header }],
    [
      { text: input.comment || "입력된 코멘트가 없습니다.", options: { valign: "middle", bold: Boolean(input.comment) } },
      { text: `완료 실적 ${completedWorks.length}건\n진행 과업 ${selected.tasks.length}개\n증빙 파일 ${evidenceCount}개`, options: { valign: "middle" } },
    ],
  ], { x: 0.55, y: boxY, w: 7.17, h: 3.25, colW: [4.35, 2.82], rowH: [0.38, 2.87], border: { type: "solid", color: COLORS.border, pt: 1 }, fontFace: FONT_BODY, fontSize: 11, color: COLORS.text, valign: "middle", margin: 0.12 });

  const logoPath = path.join(process.cwd(), "public", "images", "bo9jeong-logo.png");
  slide.addImage({ path: logoPath, x: 3.9, y: 10.78, w: 0.25, h: 0.42, transparency: 5, altText: "보구정 로고" });
  addText(slide, `1 / ${pageTotal}`, { x: 7.15, y: 11.18, w: 0.68, h: 0.16, fontSize: 8.5, color: COLORS.muted, align: "right" });
}

async function addTaskSlide(pptx: PptxGenJS, task: Task, works: CompletedWork[], evidenceImages: Map<string, string>, placeMonthlyMetrics: PlaceMonthlyMetric[], taskWorkCount: number, taskNumber: number, chunkIndex: number, chunkTotal: number, startDate: string, endDate: string, pageNumber: number, pageTotal: number) {
  const slide = pptx.addSlide({ masterName: MASTER_NAME });
  addFrame(slide);
  const suffix = chunkTotal > 1 ? ` (${chunkIndex + 1}/${chunkTotal})` : "";
  addSectionTitle(slide, `${taskNumber}. ${task.task_name}${suffix}`, pageNumber, pageTotal);
  addText(slide, `${task.target_scope} · ${task.cycle === "monthly" ? "월간 반복" : "일회성"} · ${displayDate(startDate)} ~ ${displayDate(endDate)}`, { x: 0.42, y: 1.24, w: 7.3, h: 0.28, fontSize: 10.5, color: COLORS.brown, bold: true });

  const rate = task.target_count ? Math.round(taskWorkCount / task.target_count * 100) : 0;
  const completedLabel = taskWorkCount > task.target_count
    ? `${taskWorkCount}${task.target_unit} (+${taskWorkCount - task.target_count} 초과)`
    : `${taskWorkCount}${task.target_unit}`;
  const header: PptxGenJS.TableCellProps = { fill: { color: COLORS.warmGray }, bold: true, fontFace: FONT_HEAD, align: "center", valign: "middle" };
  slide.addTable([
    [{ text: "목표", options: header }, { text: "기간 내 완료", options: header }, { text: "달성률", options: header }, { text: "보고 기간", options: header }],
    [{ text: `${task.target_count}${task.target_unit}` }, { text: completedLabel }, { text: `${rate}%` }, { text: reportPeriodLabel(startDate, endDate) }],
  ], { x: 0.42, y: 1.64, w: 7.4, h: 0.82, colW: [1.35, 1.65, 1.35, 3.05], rowH: [0.32, 0.5], border: { type: "solid", color: COLORS.border, pt: 0.8 }, fontFace: FONT_BODY, fontSize: 9.5, align: "center", valign: "middle", margin: 0.04 });

  if (task.task_name === PLACE_MONTHLY_TASK_NAME) {
    const displayWorks = works.slice(0, 2);
    if (!displayWorks.length) {
      slide.addShape("rect", { x: 0.62, y: 2.82, w: 7.03, h: 4.75, line: { color: COLORS.lightGray, pt: 1 }, fill: { color: "F3F3F3" } });
      addText(slide, "선택한 기간에 완료된 통계 캡처 작업이 없습니다.", { x: 1.0, y: 4.82, w: 6.25, h: 0.4, fontFace: FONT_HEAD, fontSize: 15, bold: true, align: "center", color: COLORS.muted });
    } else {
      const imageW = displayWorks.length === 1 ? 6.45 : 3.42;
      const positions = displayWorks.length === 1 ? [0.91] : [0.62, 4.2];
      for (const [index, work] of displayWorks.entries()) {
        const x = positions[index];
        slide.addShape("rect", { x, y: 2.82, w: imageW, h: 4.35, line: { color: COLORS.lightGray, pt: 0.8 }, fill: { color: COLORS.lightGray } });
        const image = work.files[0] ? evidenceImages.get(work.files[0].file_path) : undefined;
        if (image) slide.addImage({ data: image, x, y: 2.82, w: imageW, h: 4.35, sizing: { type: "contain", w: imageW, h: 4.35 }, altText: `${work.title} 대표 증빙` });
        else addText(slide, work.files[0] ? `${work.files[0].file_name}\n미리보기 미지원` : "증빙 파일 없음", { x: x + 0.2, y: 4.65, w: imageW - 0.4, h: 0.58, fontSize: 10.5, color: COLORS.muted, align: "center", valign: "middle", fit: "shrink" });
        slide.addShape("rect", { x, y: 7.17, w: imageW, h: 0.62, line: { color: COLORS.lightGray, pt: 0.8 }, fill: { color: COLORS.white } });
        addText(slide, work.title, { x: x + 0.12, y: 7.34, w: imageW - 0.95, h: 0.2, fontFace: FONT_HEAD, fontSize: 9.5, bold: true, fit: "shrink" });
        addText(slide, work.work_date.slice(5).replace("-", "."), { x: x + imageW - 0.76, y: 7.34, w: 0.62, h: 0.18, fontSize: 8, color: COLORS.muted, align: "right" });
      }
    }
    const comparison = placeMetricComparison(placeMonthlyMetrics, task.task_id, endDate.slice(0, 7));
    const difference = comparison.difference === undefined ? "—" : `${comparison.difference >= 0 ? "+" : ""}${comparison.difference.toLocaleString("ko-KR")}`;
    slide.addTable([
      ["방문 지표", metricMonthLabel(comparison.previousMonth), metricMonthLabel(comparison.month), "증감", "증감률"].map((text) => ({ text, options: header })),
      [
        { text: "방문자 수", options: { bold: true, fontFace: FONT_HEAD } },
        { text: metricValueLabel(comparison.previous, "전월 자료 없음") },
        { text: metricValueLabel(comparison.current, "미입력") },
        { text: difference },
        { text: comparison.rate ?? "—", options: { bold: true } },
      ],
    ], { x: 0.42, y: 8.45, w: 7.4, h: 1.08, colW: [1.28, 1.72, 1.72, 1.28, 1.4], rowH: [0.42, 0.66], border: { type: "solid", color: COLORS.border, pt: 0.8 }, fontFace: FONT_BODY, fontSize: 9, color: COLORS.text, align: "center", valign: "middle", margin: 0.04 });
    addText(slide, "작업 등록 시 입력한 방문자 수를 기준으로 전월과 비교합니다.", { x: 0.44, y: 9.72, w: 7.3, h: 0.24, fontSize: 8.5, color: COLORS.muted });
    return;
  }

  if (!works.length) {
    slide.addShape("rect", { x: 0.62, y: 3.12, w: 7.03, h: 5.7, line: { color: COLORS.lightGray, pt: 1 }, fill: { color: "F3F3F3" } });
    addText(slide, "선택한 기간에 완료된 작업이 없습니다.", { x: 1.0, y: 5.52, w: 6.25, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, align: "center", color: COLORS.muted });
    addText(slide, "작업 상태와 보고 기간을 확인해 주세요.", { x: 1.0, y: 6.05, w: 6.25, h: 0.3, fontSize: 10.5, align: "center", color: COLORS.muted });
  } else {
    const imageW = works.length === 1 ? 5.65 : works.length === 2 ? 3.46 : 3.64;
    const imageH = works.length === 1 ? 6.2 : works.length === 2 ? 5.8 : 3.12;
    const captionH = works.length <= 2 ? 0.78 : 0.7;
    const positions = works.length === 1
      ? [{ x: 1.31, y: 2.88 }]
      : works.length === 2
        ? [{ x: 0.62, y: 2.88 }, { x: 4.18, y: 2.88 }]
        : [{ x: 0.42, y: 2.82 }, { x: 4.18, y: 2.82 }, { x: works.length === 3 ? 2.3 : 0.42, y: 6.9 }, { x: 4.18, y: 6.9 }];
    for (const [index, work] of works.entries()) {
      const position = positions[index];
      const imageY = position.y;
      slide.addShape("rect", { x: position.x, y: imageY, w: imageW, h: imageH, line: { color: COLORS.lightGray, pt: 0.8 }, fill: { color: COLORS.lightGray } });
      const image = work.files[0] ? evidenceImages.get(work.files[0].file_path) : undefined;
      if (image) {
        slide.addImage({ data: image, x: position.x, y: imageY, w: imageW, h: imageH, sizing: { type: "cover", w: imageW, h: imageH }, altText: `${work.title} 대표 증빙` });
      } else {
        addText(slide, work.files[0] ? `${work.files[0].file_name}\n미리보기 미지원` : "증빙 파일 없음", { x: position.x + 0.2, y: imageY + imageH / 2 - 0.3, w: imageW - 0.4, h: 0.58, fontSize: 10.5, color: COLORS.muted, align: "center", valign: "middle", fit: "shrink" });
      }
      slide.addShape("rect", { x: position.x, y: imageY + imageH, w: imageW, h: captionH, line: { color: COLORS.lightGray, pt: 0.8 }, fill: { color: COLORS.white } });
      addText(slide, work.title, { x: position.x + 0.12, y: imageY + imageH + 0.12, w: imageW - 0.94, h: 0.22, fontFace: FONT_HEAD, fontSize: works.length <= 2 ? 10.5 : 9.5, bold: true, fit: "shrink" });
      addText(slide, work.work_date.slice(5).replace("-", "."), { x: position.x + imageW - 0.78, y: imageY + imageH + 0.12, w: 0.64, h: 0.2, fontSize: 8.5, color: COLORS.muted, align: "right" });
      if (work.result_url) slide.addText([{ text: "결과 URL", options: { hyperlink: { url: work.result_url }, color: COLORS.blue, underline: { color: COLORS.blue }, fontFace: FONT_BODY, fontSize: 8.5 } }], { x: position.x + 0.12, y: imageY + imageH + 0.46, w: 1.25, h: 0.18, margin: 0 });
    }
  }
}

export async function generateReportPptx(raw: ReportInput) {
  const input = reportInputSchema.parse(raw);
  const data = await getReportSetupData();
  const selected = data.projects.find((item) => item.project.project_id === input.project_id);
  if (!selected) throw new Error("프로젝트를 찾을 수 없습니다.");
  const completedWorks = selected.works.filter((work) => work.status === "completed" && work.work_date >= input.start_date && work.work_date <= input.end_date);
  const pageTotal = reportSlideCount(selected, input.start_date, input.end_date);
  const evidenceImages = await prepareEvidenceImages(completedWorks);

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "BO9JEONG_A4", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "BO9JEONG_A4";
  pptx.defineSlideMaster({ title: MASTER_NAME, background: { color: COLORS.white }, objects: [] });
  pptx.author = "보구정";
  pptx.company = "보구정";
  pptx.subject = `${selected.project.vendor_name} 온라인 마케팅 결과 보고서`;
  pptx.title = `${selected.project.vendor_name}_${input.start_date}_${input.end_date}_결과보고서`;
  pptx.theme = { headFontFace: FONT_HEAD, bodyFontFace: FONT_BODY };

  await addCover(pptx, selected, input, completedWorks, pageTotal);
  let pageNumber = 2;
  for (const [taskIndex, task] of selected.tasks.entries()) {
    const taskWorks = completedWorks.filter((work) => work.task_id === task.task_id);
    const chunks = chunkWorks(taskWorks);
    for (const [chunkIndex, chunk] of chunks.entries()) {
      await addTaskSlide(pptx, task, chunk, evidenceImages, selected.placeMonthlyMetrics, taskWorks.length, taskIndex + 1, chunkIndex, chunks.length, input.start_date, input.end_date, pageNumber, pageTotal);
      pageNumber += 1;
    }
  }

  const output = await pptx.write({ outputType: "uint8array", compression: true });
  if (output instanceof Uint8Array) return repairPresentationPackage(output);
  if (output instanceof ArrayBuffer) return repairPresentationPackage(new Uint8Array(output));
  throw new Error("PPTX 파일을 생성하지 못했습니다.");
}
