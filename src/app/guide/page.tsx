import { AppSidebar } from "@/components/app-sidebar";
import { readTable } from "@/lib/server/csv-repository";

export const dynamic = "force-dynamic";

const steps = [
  ["01", "담당자 선택", "첫 화면이나 사이드바에서 현재 담당자를 선택합니다. 등록자 정보가 필요한 기능에서 이 담당자를 사용합니다."],
  ["02", "프로젝트 확인", "프로젝트 목록에서 업체, 계약 기간, 과업 수와 이번 달 수행 현황을 확인합니다."],
  ["03", "과업과 작업 조회", "프로젝트의 과업을 펼치고 작업 행을 선택해 담당자, 결과 URL, 증빙과 활동 기록을 확인합니다."],
  ["04", "자료 검색", "자료명, 업체, 담당자, 부서와 자료 유형을 기준으로 로고·가이드·시안을 검색합니다."],
  ["05", "보고서 준비", "프로젝트와 기간을 지정하고 포함될 완료 실적과 코멘트를 검토합니다."],
] as const;

export default async function GuidePage() {
  const people = await readTable("people");
  return <div className="app-shell"><AppSidebar people={people} active="guide" /><main className="dashboard-main">
    <header className="page-header"><div><p className="eyebrow">GUIDE</p><h1>이용 가이드</h1><p>보구정 과업 관리 도구의 기본 흐름을 빠르게 확인하세요.</p></div></header>
    <section className="guide-grid">{steps.map(([number, title, body]) => <article className="card guide-card" key={number}><span>{number}</span><h2>{title}</h2><p>{body}</p></article>)}</section>
    <section className="card guide-rule"><div><p className="eyebrow">COUNTING RULE</p><h2>완료 작업 1행은 실적 1건입니다</h2></div><p>한 작업에 캡처본이 여러 장이어도 실적은 한 건으로 집계합니다. 목표를 넘기면 실제 달성률과 초과한 수량도 그대로 표시합니다.</p></section>
  </main></div>;
}
