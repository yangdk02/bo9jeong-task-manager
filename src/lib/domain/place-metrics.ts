import type { PlaceMonthlyMetric } from "@/lib/domain/schemas";

export function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function placeMetricComparison(metrics: PlaceMonthlyMetric[], taskId: string, month: string) {
  const previousMonth = shiftMonth(month, -1);
  const current = metrics.find((metric) => metric.task_id === taskId && metric.year_month === month)?.visitor_count;
  const previous = metrics.find((metric) => metric.task_id === taskId && metric.year_month === previousMonth)?.visitor_count;
  const difference = current !== undefined && previous !== undefined ? current - previous : undefined;
  const rate = difference === undefined || previous === undefined
    ? undefined
    : previous === 0
      ? current === 0 ? "변동 없음" : "신규"
      : `${difference >= 0 ? "+" : ""}${((difference / previous) * 100).toFixed(1)}%`;
  return { month, previousMonth, current, previous, difference, rate };
}

export function metricMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${year}년 ${Number(monthNumber)}월`;
}

export function metricValueLabel(value: number | undefined, missing: string) {
  return value === undefined ? missing : value.toLocaleString("ko-KR");
}
