import Image from "next/image";
import { LandingPersonPicker } from "@/components/landing-person-picker";
import { readTable } from "@/lib/server/csv-repository";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const people = await readTable("people");

  return <main className="landing-page">
    <section className="landing-visual" aria-label="보구정 업무 흐름 이미지">
      <Image src="/images/landing-workflow.png" alt="연결된 프로젝트 과업과 작업을 표현한 일러스트" fill priority sizes="(max-width: 860px) 100vw, 50vw" />
      <div className="landing-visual-overlay">
        <span>BOS · BO9JEONG WORKSPACE</span>
        <h2>흩어진 과업을<br />하나의 흐름으로.</h2>
        <p>프로젝트부터 작업 증빙까지, 팀의 실행을 명확하게 연결합니다.</p>
      </div>
    </section>
    <section className="landing-entry">
      <div className="landing-brand"><Image src="/images/bo9jeong-logo.png" alt="보구정 로고" width={34} height={57} /><div className="landing-brand-copy"><strong>BOS</strong><small>BO9JEONG WORKSPACE</small></div></div>
      <div className="landing-entry-content">
        <p className="eyebrow">BOS</p>
        <h1>BO9JEONG<br />WORKSPACE</h1>
        <p className="landing-description">오늘도 반갑습니다. 업무를 시작하기 전에 현재 누구로 보고 있는지 알려주세요.</p>
        <LandingPersonPicker people={people} />
        <p className="privacy-note"><span aria-hidden="true">●</span> 선택한 담당자는 이 브라우저에만 저장됩니다.</p>
      </div>
    </section>
  </main>;
}
