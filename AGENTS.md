# 프로젝트 지침

## 목적

이 저장소는 `보구정 과업 관리 도구`라는 이름으로 보구정의 마케팅 프로젝트, 과업, 작업 실적, 증빙 파일과 자료 DB를 관리하는 로컬 우선 MVP 웹 앱을 구현한다.

작업을 시작하기 전에 다음 파일을 순서대로 읽는다.

1. `docs/HANDOFF.md`
2. `docs/DATA_SCHEMA.md`

요구사항이 충돌하면 아래 우선순위를 따른다.

1. 사용자의 최신 명시적 지시
2. `docs/HANDOFF.md`
3. `docs/DATA_SCHEMA.md`
4. 외부 기획 링크

## MVP 범위

- 프로젝트 생성·목록·상세 조회
- 체크리스트 방식의 과업 선택과 목표 수량·단위 입력
- 프로젝트·과업·작업의 복수 담당자 배정
- 과업 아래 작업 등록과 진행률 집계
- 작업 한 건에 여러 장의 캡처본·증빙 파일 등록
- 담당자 이름 또는 부서 기준 조회
- 로고, 로고 배치 가이드, 브랜드 가이드, 패키지 시안 등 자료 저장·검색
- 작업 및 자료 상세의 댓글·활동 기록
- 선택한 프로젝트·기간의 보고서 즉시 생성

## 현재 제외 범위

- Google Sheets 또는 Google Drive 연동
- 회사 내부 서버 배포
- 로그인, 권한, 팀 관리
- `departments`, `vendors`, `task_catalog` 같은 별도 테이블
- 보고서 데이터의 영구 테이블 저장
- 블로그 `account_type` 입력

## 핵심 업무 규칙

- 프로젝트 아래에 과업이 있고 과업 아래에 작업이 있다.
- 작업은 실무자가 등록하는 최소 실행 단위다.
- 상태가 `completed`인 작업 1행을 실적 1건으로 집계한다.
- 한 작업에 캡처본이 여러 장이어도 실적은 1건이다.
- 목표 진행률은 완료 작업 수를 `tasks.target_count`와 비교해 계산한다.
- 프로젝트, 과업, 작업은 각각 연결 테이블을 통해 담당자를 여러 명 가질 수 있다.
- 담당자의 부서는 `people.department`에 직접 저장한다.
- 화면과 문서에서 `사용자`보다 `담당자`라는 용어를 우선 사용한다.
- `프로젝트 계약 과업`은 `과업`으로 표기한다.
- 보고서는 요청 시 CSV와 파일을 읽어 첨부된 보구정 결과 보고 양식 기반의 편집 가능한 PPTX 1종으로 즉시 생성하며 별도 보고서 테이블에 저장하지 않는다.
- 자료 상태는 `planned`, `active`, `completed`를 사용한다.
- 작업 삭제는 MVP에서 소프트 삭제 없이 작업 행과 연결 데이터·파일을 함께 삭제한다. 수동 ZIP 백업·복구는 제공하지만 삭제 직전 자동 백업과 휴지통은 후속 범위다.
- 로컬 개발은 CSV와 로컬 파일을 사용한다. Vercel 검증 배포는 Supabase Postgres와 비공개 Storage를 사용한다.
- Vercel Hobby는 시연·검증용으로만 사용하며 실제 운영 전 플랜 적합성을 다시 검토한다.

## 로컬 저장 규칙

- 실제 CSV 경로는 `data/local/*.csv`다.
- 초기 헤더는 `data/templates/*.csv`에서 복사한다.
- CSV 인코딩은 UTF-8, 구분자는 쉼표, 첫 행은 컬럼명으로 통일한다.
- 날짜는 `YYYY-MM-DD`, 일시는 ISO 8601 형식으로 저장한다.
- ID와 ENUM 값은 영문 코드로 저장하고 화면에서 한글 라벨로 변환한다.
- 업로드 파일은 `storage/work_files` 또는 `storage/assets`에 저장한다.
- 한 번의 저장 요청에 첨부하는 파일 합계는 4MB 이하로 제한한다.
- 이미지·PDF·문서·디자인 원본·압축 파일을 허용하고 동영상은 허용하지 않는다.
- CSV의 `file_path`는 프로젝트 루트 기준 상대 경로를 사용한다.
- 파일명 충돌을 피하도록 저장 파일명에 ID 또는 고유값을 포함한다.
- CSV 갱신은 임시 파일 작성 후 교체하는 방식으로 처리해 중간 실패로 인한 손상을 줄인다.
- 화면 컴포넌트가 CSV 파일을 직접 읽고 쓰지 않도록 저장소 모듈을 분리한다.
- 배포 환경에서는 11개 CSV와 동일한 컬럼을 가진 Supabase 테이블을 사용하고 `file_path` 논리 형식을 유지한다.

## 구현 시 주의사항

- 스키마에 없는 화면 입력값을 임의로 영구 저장하지 않는다.
- 자유 입력이 아닌 필드는 `docs/DATA_SCHEMA.md`에 정의된 전체 허용값을 사용한다.
- 새 테이블을 추가하기 전에 기존 테이블로 해결할 수 있는지 먼저 확인한다.
- 비밀키, 토큰, 개인정보를 저장소에 추가하지 않는다.
- 구현 범위가 문서와 충돌하거나 저장 구조 변경이 필요하면 코드 변경 전에 사용자에게 알린다.

## 검증 기준

- 로컬 초기 데이터가 없어도 앱이 템플릿에서 안전하게 시작되어야 한다.
- CSV가 비어 있어도 목록·상세 화면이 오류 없이 빈 상태를 표시해야 한다.
- 잘못된 FK, 중복 담당자 연결, 허용되지 않은 ENUM 값은 저장 전에 검증한다.
- 파일 업로드 실패 시 CSV 메타데이터만 남지 않아야 한다.
- 작업 상태 변경 시 과업 진행률이 즉시 다시 계산되어야 한다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
