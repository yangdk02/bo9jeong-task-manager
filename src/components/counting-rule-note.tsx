export function CountingRuleNote({ dashboardProgress = false }: { dashboardProgress?: boolean }) {
  return <p className="counting-rule-note">
    <span aria-hidden="true">ⓘ</span>
    {dashboardProgress && <>진행률은 목표 수량을 채운 과업 수를 이번 달 전체 과업 수와 비교해 계산해요. </>}
    월간 반복은 매달 새로 집계해요. 일회성은 등록한 달에만 집계하고 다음 달로 넘기지 않아요.
  </p>;
}
