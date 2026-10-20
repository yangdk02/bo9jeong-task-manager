import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "보구정 과업 관리 도구",
  description: "프로젝트와 과업 실적을 관리하고 보고서를 만드는 로컬 우선 웹 앱",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
