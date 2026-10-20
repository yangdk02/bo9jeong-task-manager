# 로컬 CSV 데이터 스키마

## 공통 규칙

- 로컬 실제 데이터 경로: `data/local/<table>.csv`
- Vercel 검증 배포: 동일한 테이블명과 컬럼을 Supabase Postgres에 저장
- 초기 템플릿 경로: `data/templates/<table>.csv`
- 인코딩: UTF-8
- 첫 행: 컬럼명
- 날짜: `YYYY-MM-DD`
- 일시: ISO 8601, 예: `2026-10-20T15:30:00+09:00`
- ID: 앱에서 자동 생성하며 CSV 안에서 유일해야 한다.
- 필수값 `Y`는 빈 문자열을 허용하지 않는다.
- 파일 경로는 저장소 종류와 무관하게 `storage/...` 형식의 논리 상대 경로를 사용한다.
- ID와 ENUM은 영문 코드로 저장하고 화면에서 한글 라벨을 표시한다.
- `created_by`, `uploaded_by`는 저장 시점의 현재 담당자로 자동 입력한다.
- `created_at`, `uploaded_at`은 최초 저장 시 자동 입력한다.
- `updated_at`은 작업을 수정할 때마다 자동 갱신한다.

## 테이블 목록

| 테이블명 | 한글명 | 구분 | 목적 |
|---|---|---|---|
| `people` | 담당자 | 보조 | 이름·부서 관리와 현재 담당자 선택 |
| `projects` | 프로젝트 | 핵심 | 프로젝트 기본 정보와 상태 관리 |
| `project_assignees` | 프로젝트 담당자 | 보조 | 프로젝트 복수 담당자 연결 |
| `tasks` | 과업 | 핵심 | 프로젝트 아래 과업과 목표 수량 관리 |
| `task_assignees` | 과업 담당자 | 보조 | 과업 복수 담당자 연결 |
| `works` | 작업 | 핵심 | 과업 아래 최소 실행 단위 관리 |
| `work_assignees` | 작업 담당자 | 보조 | 작업 복수 담당자 연결 |
| `work_files` | 작업 파일 | 핵심 | 작업별 여러 증빙 파일 연결 |
| `assets` | 자료 DB | 보조 | 마케팅 자료 검색·조회 |
| `comments` | 댓글·활동 기록 | 보조 | 작업·자료 상세의 소통 이력 |

## `people` 담당자

| 컬럼명 | 타입 | 필수 | 키·참조 | 예시 | 화면에서의 쓰임 |
|---|---|---|---|---|---|
| `person_id` | STRING | Y | PK | `USR-001` | 현재 담당자·업무 담당자 선택 |
| `name` | STRING | Y |  | `홍길동` | 인사말·이름별 조회 |
| `department` | STRING | Y |  | `마케팅` | `홍길동 (마케팅)`·부서별 조회 |

`name`은 앱에서 사용하는 업무용 표시명이다. 별도 부서 테이블을 만들지 않는다.

## `projects` 프로젝트

| 컬럼명 | 타입 | 필수 | 키·참조 | 예시 | 화면에서의 쓰임 |
|---|---|---|---|---|---|
| `project_id` | STRING | Y | PK | `PRJ-2026-001` | 프로젝트 목록·상세 |
| `vendor_name` | STRING | Y |  | `제주감귤협동조합` | 업체 검색·표시 |
| `project_name` | STRING | Y |  | `2026 온라인 홍보 대행` | 프로젝트 카드·작업 등록 |
| `management_category` | STRING | N |  | `온라인 홍보` | 프로젝트 분류·보고서 표지 |
| `start_date` | DATE | Y |  | `2026-01-01` | 계약 기간 |
| `end_date` | DATE | Y |  | `2026-12-31` | 계약 기간 |
| `status` | ENUM | Y |  | `active` | 상태 표시·필터 |
| `created_by` | STRING | Y | FK → `people.person_id` | `USR-001` | 등록 담당자 |
| `created_at` | DATETIME | Y |  | `2026-10-20T10:00:00+09:00` | 생성 일시 |

`status` 전체 값:

- `planned`: 예정
- `active`: 진행
- `completed`: 완료

`end_date`는 `start_date`보다 빠를 수 없다.

업체 테이블을 따로 만들지 않고 업체명은 `vendor_name`에 직접 저장한다. `created_by`는 현재 담당자, `created_at`은 저장 시각으로 자동 입력한다.

## `project_assignees` 프로젝트 담당자

| 컬럼명 | 타입 | 필수 | 키·참조 | 예시 | 화면에서의 쓰임 |
|---|---|---|---|---|---|
| `project_assignee_id` | STRING | Y | PK | `PA-001` | 내부 연결 ID |
| `project_id` | STRING | Y | FK → `projects.project_id` | `PRJ-2026-001` | 프로젝트 담당자 목록 |
| `person_id` | STRING | Y | FK → `people.person_id` | `USR-001` | 복수 담당자·이름/부서 조회 |

`project_id + person_id` 조합은 중복될 수 없다.

## `tasks` 과업

| 컬럼명 | 타입 | 필수 | 키·참조 | 예시 | 화면에서의 쓰임 |
|---|---|---|---|---|---|
| `task_id` | STRING | Y | PK | `TSK-001` | 과업 카드·작업 등록 |
| `project_id` | STRING | Y | FK → `projects.project_id` | `PRJ-2026-001` | 프로젝트 상세 |
| `target_scope` | ENUM | Y |  | `블로그` | 과업 그룹·필터 |
| `task_name` | STRING | Y |  | `블로그 포스팅` | 과업명 |
| `cycle` | ENUM | Y |  | `monthly` | 수행 주기 |
| `target_count` | INTEGER | Y |  | `5` | 목표·진행률 계산 |
| `target_unit` | ENUM | Y |  | `건` | 목표 단위 표시 |
| `status` | ENUM | Y |  | `active` | 상태 표시·필터 |
| `created_by` | STRING | Y | FK → `people.person_id` | `USR-001` | 등록 담당자 |
| `created_at` | DATETIME | Y |  | `2026-10-20T10:05:00+09:00` | 생성 일시 |

`target_scope` 전체 값:

- `SNS`
- `블로그`
- `디자인`
- `촬영`
- `영상`
- `네이버 플레이스`
- `광고`
- `기타`

현재 MVP에서는 `네이버 플레이스`도 과업 분류명으로는 저장할 수 있지만 별도 월별 지표 기능은 구현하지 않는다.

`cycle` 전체 값:

- `monthly`: 월간 반복
- `once`: 일회성

`target_unit` 전체 값:

- `건`
- `장`
- `곳`
- `회`
- `기타`

`status` 전체 값:

- `planned`: 예정
- `active`: 진행
- `completed`: 완료

`target_count`는 0 이상의 정수다.

`once` 과업은 `created_at`의 월을 최초 수행 월로 사용한다. 완료 작업 수가 `target_count`에 도달하지 않으면 다음 월 조회에도 이월해 표시하고, 목표를 달성한 다음 월부터는 표시하지 않는다. 별도의 이월 데이터는 저장하지 않는다.

과업은 반드시 하나의 프로젝트에 속한다. `created_by`는 현재 담당자, `created_at`은 저장 시각으로 자동 입력한다.

## `task_assignees` 과업 담당자

| 컬럼명 | 타입 | 필수 | 키·참조 | 예시 | 화면에서의 쓰임 |
|---|---|---|---|---|---|
| `task_assignee_id` | STRING | Y | PK | `TA-001` | 내부 연결 ID |
| `task_id` | STRING | Y | FK → `tasks.task_id` | `TSK-001` | 과업 담당자 목록 |
| `person_id` | STRING | Y | FK → `people.person_id` | `USR-001` | 담당자·이름/부서 조회 |

`task_id + person_id` 조합은 중복될 수 없다.

## `works` 작업

| 컬럼명 | 타입 | 필수 | 키·참조 | 예시 | 화면에서의 쓰임 |
|---|---|---|---|---|---|
| `work_id` | STRING | Y | PK | `WRK-001` | 작업 목록·상세 |
| `task_id` | STRING | Y | FK → `tasks.task_id` | `TSK-001` | 과업 선택·진행률 집계 |
| `work_date` | DATE | Y |  | `2026-10-20` | 게시일·작업일 |
| `title` | STRING | Y |  | `가을 제주 감귤 소개` | 작업 카드·상세 제목 |
| `result_url` | URL | N |  | `https://blog.naver.com/example/123` | 결과물 링크 |
| `memo` | TEXT | N |  | `시안 2안 반영` | 작업 메모 |
| `status` | ENUM | Y |  | `completed` | 상태·목표 집계 |
| `created_by` | STRING | Y | FK → `people.person_id` | `USR-001` | 등록 담당자 |
| `created_at` | DATETIME | Y |  | `2026-10-20T15:30:00+09:00` | 등록 일시 |
| `updated_at` | DATETIME | Y |  | `2026-10-20T15:40:00+09:00` | 수정 일시 |

`status` 전체 값:

- `draft`: 임시저장
- `completed`: 완료

`completed`인 작업만 실적에 포함한다. `account_type`은 저장하지 않는다.

`result_url`은 블로그 포스팅처럼 외부 게시 결과가 있는 작업에서 사용한다. `created_by`와 `created_at`은 최초 저장 시 자동 입력하고 `updated_at`은 수정 시 자동 갱신한다.

## `work_assignees` 작업 담당자

| 컬럼명 | 타입 | 필수 | 키·참조 | 예시 | 화면에서의 쓰임 |
|---|---|---|---|---|---|
| `work_assignee_id` | STRING | Y | PK | `WA-001` | 내부 연결 ID |
| `work_id` | STRING | Y | FK → `works.work_id` | `WRK-001` | 작업 담당자 목록 |
| `person_id` | STRING | Y | FK → `people.person_id` | `USR-001` | 복수 담당자·이름/부서 조회 |

`work_id + person_id` 조합은 중복될 수 없다.

## `work_files` 작업 파일

| 컬럼명 | 타입 | 필수 | 키·참조 | 예시 | 화면에서의 쓰임 |
|---|---|---|---|---|---|
| `work_file_id` | STRING | Y | PK | `WF-001` | 작업 파일 목록 |
| `work_id` | STRING | Y | FK → `works.work_id` | `WRK-001` | 작업 상세 첨부 목록 |
| `file_path` | STRING | Y |  | `storage/work_files/WRK-001/blog_capture_01.png` | 이미지 표시·다운로드 |
| `file_name` | STRING | Y |  | `blog_capture_01.png` | 원본 파일명 표시 |
| `uploaded_by` | STRING | Y | FK → `people.person_id` | `USR-001` | 업로드 담당자 |
| `uploaded_at` | DATETIME | Y |  | `2026-10-20T15:31:00+09:00` | 업로드 일시 |

한 작업에 여러 행을 저장할 수 있다. `file_path`에는 프로젝트 루트 기준 상대 경로를 기록한다. `uploaded_by`와 `uploaded_at`은 파일 저장 성공 후 자동 입력한다. `mime_type`, 대표 이미지 여부, 정렬 순서는 저장하지 않는다.

보고서에 대표 캡처가 필요할 때는 `uploaded_at`이 가장 빠른 파일을 사용한다. 시각이 같으면 `work_file_id` 오름차순의 첫 파일을 사용한다. 대표 이미지 직접 지정 기능은 현재 스키마에 추가하지 않는다.

## `assets` 자료 DB

| 컬럼명 | 타입 | 필수 | 키·참조 | 예시 | 화면에서의 쓰임 |
|---|---|---|---|---|---|
| `asset_id` | STRING | Y | PK | `AST-001` | 자료 검색·상세 |
| `project_id` | STRING | Y | FK → `projects.project_id` | `PRJ-2026-001` | 프로젝트별 조회 |
| `asset_name` | STRING | Y |  | `감귤 패키지 전면 시안` | 자료명·검색 |
| `asset_category` | ENUM | Y |  | `패키지 시안` | 자료 유형 필터 |
| `version` | STRING | Y |  | `v3` | 버전 표시 |
| `file_path` | STRING | Y |  | `storage/assets/PRJ-2026-001/package_front_v3.ai` | 파일 열기·다운로드 |
| `file_name` | STRING | Y |  | `package_front_v3.ai` | 원본 파일명 표시 |
| `status` | ENUM | Y |  | `active` | 자료 상태·필터 |
| `note` | TEXT | N |  | `인쇄소 전달본` | 자료 메모 |
| `owner_person_id` | STRING | N | FK → `people.person_id` | `USR-001` | 담당자·부서별 조회 |
| `uploaded_by` | STRING | Y | FK → `people.person_id` | `USR-001` | 업로드 담당자 |
| `uploaded_at` | DATETIME | Y |  | `2026-10-20T16:00:00+09:00` | 업로드 일시 |

`asset_category` 전체 값:

- `로고`
- `로고 배치 가이드`
- `브랜드 가이드`
- `패키지 시안`
- `카드뉴스`
- `배너`
- `썸네일`
- `상세페이지`
- `사진 원본`
- `영상 원본`
- `보고서`
- `기타`

`status` 전체 값:

- `planned`: 예정
- `active`: 진행
- `completed`: 완료

`status`의 기본값은 `active`다. `version`은 `v1`, `v2-final`처럼 입력할 수 있다. `file_path`에는 프로젝트 루트 기준 상대 경로를 기록한다. 담당자의 부서는 `people.department`에서 조회한다. `owner_person_id`는 담당자를 지정하지 않은 자료에서는 비워 둘 수 있다. `uploaded_by`와 `uploaded_at`은 파일 저장 성공 후 자동 입력한다. `mime_type`은 저장하지 않는다.

## `comments` 댓글·활동 기록

| 컬럼명 | 타입 | 필수 | 키·참조 | 예시 | 화면에서의 쓰임 |
|---|---|---|---|---|---|
| `comment_id` | STRING | Y | PK | `CMT-001` | 작업·자료 상세 댓글 |
| `target_type` | ENUM | Y |  | `work` | 댓글 대상 구분 |
| `target_id` | STRING | Y | 논리 FK | `WRK-001` | 대상 상세 연결 |
| `author_person_id` | STRING | 조건부 | FK → `people.person_id` | `USR-002` | 작성 담당자 |
| `comment_type` | ENUM | Y |  | `assignee` | 담당자 댓글·자동 기록 구분 |
| `body` | TEXT | Y |  | `대표 이미지 교체 부탁드립니다.` | 댓글 본문·활동 문구 |
| `created_at` | DATETIME | Y |  | `2026-10-20T16:10:00+09:00` | 댓글 시각 |

`target_type` 전체 값:

- `work`: `target_id`가 `works.work_id`를 참조
- `asset`: `target_id`가 `assets.asset_id`를 참조

`comment_type` 전체 값:

- `assignee`: 담당자가 작성한 댓글이며 `author_person_id` 필수
- `system`: 앱이 생성한 활동 기록이며 `author_person_id`는 비어 있을 수 있음

`comment_id`와 `created_at`은 저장 시 자동 입력한다.

자동 활동 기록은 작업·자료의 생성, 수정, 상태 변경, 담당자 변경, 파일 추가·삭제 시 `comment_type=system`으로 저장한다.

## 업로드 파일 정책

- 앱 자체 파일 크기 제한은 두지 않는다.
- 작업 파일은 일반적인 이미지, PDF, 문서와 영상 형식을 허용한다.
- 자료 DB는 이미지, PDF, 오피스 문서, 디자인 원본, 압축 파일과 영상 형식을 허용한다.
- 파일 확장자와 실제 파일 형식을 함께 검사하고 실행 파일과 스크립트 파일은 허용하지 않는다.
- 실행 환경이나 브라우저의 전송 한계는 앱 화면에서 별도 오류로 안내한다.

## 삭제 처리

현재 스키마에는 삭제 상태 컬럼을 두지 않는다.

- 작업 삭제는 소프트 삭제 없이 즉시 처리한다.
- 작업을 삭제할 때 `works` 행과 연결된 `work_assignees`, `work_files`, 작업 대상 `comments`를 함께 삭제한다.
- `work_files.file_path`가 가리키는 실제 파일도 함께 삭제한다.
- CSV와 파일 삭제 중 일부가 실패하면 가능한 변경을 되돌리고 오류를 표시한다.
- MVP에서는 삭제 백업과 휴지통을 만들지 않는다. 백업 기능은 후속 범위다.
- 프로젝트·과업·담당자 삭제는 현재 MVP 화면 범위에 포함하지 않는다.
- 참조 중인 담당자·프로젝트·과업·작업을 고아 데이터가 생기도록 삭제하지 않는다.
