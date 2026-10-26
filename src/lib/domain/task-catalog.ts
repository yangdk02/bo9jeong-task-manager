import type { Task } from "@/lib/domain/schemas";

export const PLACE_MONTHLY_TASK_NAME = "플레이스 관리 (월 통계 캡처)";

export type TaskCatalogItem = {
  key: string;
  group: string;
  name: string;
  scope: Task["target_scope"];
  cycle: Task["cycle"];
  count: number;
  unit: Task["target_unit"];
};

export const TASK_CATALOG: TaskCatalogItem[] = [
  { key: "blog", group: "블로그", name: "블로그 포스팅", scope: "블로그", cycle: "monthly", count: 8, unit: "건" },
  { key: "card", group: "인스타그램", name: "카드디자인", scope: "디자인", cycle: "monthly", count: 4, unit: "건" },
  { key: "post", group: "인스타그램", name: "일반 포스팅", scope: "SNS", cycle: "monthly", count: 8, unit: "건" },
  { key: "reels", group: "인스타그램", name: "릴스 · 숏폼 영상", scope: "영상", cycle: "monthly", count: 4, unit: "건" },
  { key: "shoot", group: "촬영", name: "출사 (사진·영상 촬영)", scope: "촬영", cycle: "monthly", count: 2, unit: "회" },
  { key: "thumbnail", group: "콘텐츠 제작", name: "맛집 소식 썸네일 제작", scope: "디자인", cycle: "once", count: 1, unit: "건" },
  { key: "detail", group: "콘텐츠 제작", name: "상세페이지 디자인", scope: "디자인", cycle: "once", count: 1, unit: "건" },
  { key: "place", group: "네이버 플레이스", name: PLACE_MONTHLY_TASK_NAME, scope: "네이버 플레이스", cycle: "monthly", count: 1, unit: "회" },
  { key: "ad", group: "네이버 플레이스", name: "플레이스 광고 집행", scope: "광고", cycle: "monthly", count: 1, unit: "회" },
];

export function catalogItemForTaskName(taskName: string) {
  return TASK_CATALOG.find((item) => item.name === taskName);
}
