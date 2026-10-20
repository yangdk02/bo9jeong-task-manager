import Link from "next/link";

export default function NotFound() {
  return (
    <main className="centered-message">
      <p className="eyebrow">404</p>
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>아직 만들지 않은 화면이거나 주소가 올바르지 않습니다.</p>
      <Link className="primary-link" href="/">
        홈으로 돌아가기
      </Link>
    </main>
  );
}
