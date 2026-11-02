# 보구정 과업 관리 도구

보구정의 마케팅 프로젝트, 과업, 작업 실적, 증빙 파일과 자료 DB를 관리하고 편집 가능한 PPTX 결과 보고서를 생성하는 웹 앱입니다.

- 운영 화면: https://bo9jeong-task-manager.vercel.app
- 저장소: https://github.com/yangdk02/bo9jeong-task-manager
- 제품명: `보구정 과업 관리 도구` / 화면 브랜드: `BOS` · `BO9JEONG WORKSPACE`

## 구현된 기능

- 담당자 검색·선택 및 신규 담당자 추가
- 프로젝트·과업·작업 생성, 조회, 수정, 삭제
- 프로젝트·과업·작업 복수 담당자 지정과 부서별 조회
- 월간 반복·일회성 과업 구분, 목표·초과 수행 진행률
- 프로젝트 계약 만료 분류
- 여러 증빙 파일 등록, 교체, 개별 삭제와 Ctrl+V 붙여넣기
- 자료 DB 생성, 검색, 수정, 삭제
- 작업·자료 댓글과 자동 활동 기록
- 네이버 플레이스 월별 방문자 수 입력 및 전월 비교
- 월 범위 기반 PPTX 결과 보고서 미리보기·다운로드
- CSV 11개와 등록 파일의 ZIP 백업·복구

## 로컬 실행

Node.js 설치 후 프로젝트 루트에서 실행합니다.

```powershell
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. `npm run dev`는 로컬 데이터가 없을 때 샘플 CSV와 파일을 준비하며, 기존 `data/local` 데이터는 덮어쓰지 않습니다.

검증 명령:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

## 데이터 저장

| 환경 | 구조화 데이터 | 파일 |
|---|---|---|
| 로컬 | `data/local/*.csv` 11개 | `storage/work_files`, `storage/assets` |
| Vercel | Supabase Postgres 11개 테이블 | 비공개 Supabase Storage |

- 빈 CSV 헤더: `data/templates`
- 샘플 원본: `data/seed`
- 샘플 파일과 경로 매핑: `data/seed-files`
- 로컬 빈 데이터 초기화: `npm run init:data`
- 로컬 샘플 초기화: `npm run init:data:seed`
- Supabase 최초 초기화: `npm run setup:supabase`

파일은 한 번의 저장 요청에서 합계 4MB까지 허용합니다. 이미지, PDF, 일반 문서, 디자인 원본과 ZIP을 지원하며 동영상 업로드는 지원하지 않습니다.

## 보고서 규칙

- 프로젝트와 시작 월·종료 월을 선택합니다.
- 월간 반복 과업은 선택 기간에 포함됩니다.
- 일회성 과업은 생성 월이 선택 기간 안에 있을 때만 포함됩니다.
- 선택 기간에 완료된 작업만 실적으로 집계합니다.
- 플레이스 관리 과업은 대표 캡처와 전월·조회 월 방문자 수 비교표를 한 페이지에 표시합니다.
- 결과물은 편집 가능한 PPTX 1종이며 보고서 이력 테이블은 만들지 않습니다.

## 문서

1. `AGENTS.md` — 저장소 작업 규칙
2. `docs/HANDOFF.md` — 현재 구현 범위와 업무 규칙
3. `docs/DATA_SCHEMA.md` — 11개 데이터 표와 검증 규칙
4. `docs/DEPLOYMENT.md` — Vercel·Supabase 구성과 배포 절차
5. `docs/SAMPLE_DATA.md` — 현재 샘플 데이터와 백업
6. `docs/TODO.md` — 남은 작업

Google Sheets·Google Drive 연동, 실제 로그인·권한, 회사 내부 서버 배포는 현재 범위에 포함하지 않습니다. Vercel Hobby는 시연·검증용이며 실제 운영 전 플랜 적합성을 다시 검토해야 합니다.
