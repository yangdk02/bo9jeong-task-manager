import Image from "next/image";
import Link from "next/link";
import type { Person } from "@/lib/domain/schemas";
import { CurrentPersonSelector } from "@/components/current-person-selector";

type Props = { people: Person[]; active: "dashboard" | "projects" | "assets" | "reports" | "guide" };

export function AppSidebar({ people, active }: Props) {
  return <aside className="sidebar">
    <Link className="brand" href="/">
      <Image className="brand-logo" src="/images/bo9jeong-logo.png" alt="보구정" width={28} height={40} />
      <div className="brand-copy"><strong>보구정</strong><small>과업 관리 도구</small></div>
    </Link>
    <nav aria-label="주요 메뉴">
      <Link className={`nav-item${active === "dashboard" ? " active" : ""}`} href="/dashboard" aria-label="홈"><span className="nav-icon">⌂</span><span className="nav-label">홈</span></Link>
      <Link className={`nav-item${active === "projects" ? " active" : ""}`} href="/projects" aria-label="프로젝트"><span className="nav-icon">▦</span><span className="nav-label">프로젝트</span></Link>
      <Link className={`nav-item${active === "assets" ? " active" : ""}`} href="/assets" aria-label="자료 검색"><span className="nav-icon">⌕</span><span className="nav-label">자료 검색</span></Link>
      <Link className={`nav-item${active === "reports" ? " active" : ""}`} href="/reports" aria-label="보고서"><span className="nav-icon">▤</span><span className="nav-label">보고서</span></Link>
      <Link className={`nav-item${active === "guide" ? " active" : ""}`} href="/guide" aria-label="이용 가이드"><span className="nav-icon">?</span><span className="nav-label">이용 가이드</span></Link>
    </nav>
    <div className="sidebar-bottom"><CurrentPersonSelector people={people} /></div>
  </aside>;
}
