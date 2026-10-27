# 보구정 과업 관리 도구

보구정의 프로젝트, 과업, 작업, 증빙 파일과 마케팅 자료를 관리하고 편집 가능한 PPTX 보고서를 생성하는 웹 앱입니다.

담당자 선택 랜딩, 홈 대시보드, 프로젝트·과업·작업의 조회 및 생성·수정·삭제 화면이 구현되어 있습니다. 이름·부서 자동완성으로 현재 담당자를 선택하면 프로젝트별 월간 목표, 완료 작업, 최근 작업과 과업별 상세 실적을 확인하고 직접 관리할 수 있습니다.

## 실행

```powershell
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 담당자 선택 후 대시보드는 `/dashboard`로 연결됩니다. Supabase 환경변수가 없으면 로컬 CSV·파일 저장소를 사용하며, 첫 실행에 `data/local` CSV가 없다면 `data/templates`의 헤더를 안전하게 복사합니다.

## 먼저 읽을 문서

1. `AGENTS.md` — 개발 중 지켜야 할 범위와 규칙
2. `docs/HANDOFF.md` — 기획·설계 결과와 MVP 완료 기준
3. `docs/DATA_SCHEMA.md` — CSV 테이블 및 컬럼 정의

## 로컬 데이터 초기화

Node.js가 설치된 환경에서 다음 명령을 실행합니다.

```powershell
node scripts/init-local-data.mjs
```

초기화 결과:

- `data/templates/*.csv`: 헤더만 포함한 원본 템플릿
- `data/local/*.csv`: 앱이 실제로 읽고 쓰는 로컬 데이터
- `storage/work_files/`: 작업 캡처본과 증빙 파일
- `storage/assets/`: 로고, 가이드, 시안 등의 자료 파일
- `storage/generated_reports/`: 즉시 생성한 보고서

초기화 스크립트는 기존 로컬 CSV를 덮어쓰지 않습니다.

샘플 데이터까지 초기화하려면 다음 명령을 사용합니다. 기존 데이터와 파일은 그대로 보존됩니다.

```powershell
npm run init:data:seed
```

샘플 원본 백업과 배포용 seed 구성은 [`docs/SAMPLE_DATA.md`](docs/SAMPLE_DATA.md)에 기록되어 있습니다.

## 현재 저장 방식

- 로컬 개발은 UTF-8 CSV와 `storage` 폴더를 사용합니다.
- Vercel 검증 배포는 Supabase Postgres와 비공개 Storage bucket을 사용합니다.
- CSV의 `file_path` 형식인 `storage/...`를 Postgres에서도 그대로 유지합니다.
- Google Sheets·Google Drive 연동과 실제 로그인은 구현하지 않습니다.
- 화면 코드는 저장소를 직접 다루지 않고 별도 저장소 계층을 거칩니다.

## Vercel 검증 배포

배포 준비와 Supabase 초기화 순서는 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)를 따릅니다. 남은 단계는 [`docs/TODO.md`](docs/TODO.md)에서 관리합니다.

## 확정된 보고서 형식

- 사용자가 제공한 A4 세로 보구정 결과 보고 양식의 디자인과 구성을 기준으로 합니다.
- 생성되는 페이지 수는 고정하지 않고 선택한 기간과 포함할 실적에 따라 조정합니다.
- 보고서는 프로젝트와 기간을 선택할 때 편집 가능한 PPTX 1종으로 즉시 생성합니다.
- 보고서 이력 테이블은 만들지 않습니다.

## 원본 요구사항

- 보구정 Notion: https://perfect-salary-063.notion.site/_-3fdcbfafb8b9808497fed772c464f456
- 데이터 스키마 정의 Google Sheets: https://docs.google.com/spreadsheets/d/1Gc1GySvCY8n01IQ4FEWsy_n6aA3B1-DQkTy3GYdXi28/edit

