# 샘플 데이터와 백업

최종 갱신: 2026-10-27

## 현재 seed 구성

`data/seed`는 로컬 최초 실행과 Supabase 초기 검증에 사용하는 현재 샘플 원본입니다.

| 표 | 행 수 |
|---|---:|
| `people` | 20 |
| `projects` | 4 |
| `project_assignees` | 16 |
| `tasks` | 20 |
| `task_assignees` | 36 |
| `works` | 64 |
| `work_assignees` | 114 |
| `work_files` | 64 |
| `place_monthly_metrics` | 12 |
| `assets` | 16 |
| `comments` | 22 |

샘플 프로젝트는 제주담음식품, 바람결카페, 숨비해녀마을협동조합, 오름책방 4개입니다. 모든 프로젝트에 `플레이스 관리 (월 통계 캡처)` 과업이 있고 2026년 8·9·10월 작업과 방문자 수가 들어 있습니다.

담당자는 20명이며 `경영관리`, `총무`, `기획`, `영상촬영`, `디자인`, `마케팅` 6개 부서에 분산되어 있습니다. 양다경, 최승경, 김경환, 오은비, 라예진이 포함됩니다.

## 샘플 파일

- `data/seed-files/manifest.json`: 80개 논리 파일 경로를 seed 이미지에 연결
- 기존 일반 시안 이미지 6개
- 프로젝트별 플레이스 방문자 그래프 이미지 4개
- Supabase Storage 키는 영문 안전 경로를 사용하고 화면용 `file_name`은 한글을 유지할 수 있음

`npm run init:data:seed`는 없는 로컬 CSV와 파일만 생성하며 기존 로컬 데이터를 덮어쓰지 않습니다. 기존 데이터를 샘플로 완전히 되돌리려면 앱의 ZIP 복구 또는 명시적인 Supabase `--force` 초기화를 사용해야 합니다.

## 보존된 ZIP

### 최초 샘플 백업

- 파일: `backups/bo9jeong-sample-data-2026-10-20.zip`
- 크기: 144,741,971 bytes
- SHA-256: `CD476CF615120DFA38F3DA928839B04D8517C1C88E0F524B42A2494D9504FEC6`
- 내용: 당시 로컬 CSV 10개와 전체 등록 파일

### 운영 샘플 교체 전 백업

- 파일: `backups/production-before-sample-refresh-2026-10-26.zip`
- 크기: 149,252,798 bytes
- SHA-256: `AEB1F83487178DE19EEA2492DBD3051C5C529F4134EEC833F06888D553A08D76`
- 내용: 운영 Supabase 데이터를 현재 4개 프로젝트 샘플로 교체하기 직전의 11개 표와 등록 파일

`backups/`는 Git에서 제외합니다. 두 ZIP은 복구 자료이므로 임시 빌드 산출물과 함께 삭제하지 않습니다.
