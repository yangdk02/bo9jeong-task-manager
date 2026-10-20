# 샘플 데이터 보존

## 원본 백업

- 파일: `backups/bo9jeong-sample-data-2026-10-20.zip`
- SHA-256: `CD476CF615120DFA38F3DA928839B04D8517C1C88E0F524B42A2494D9504FEC6`
- 내용: 백업 시점의 `data/local` CSV 10개와 전체 `storage` 파일
- Git 포함 여부: 제외

ZIP은 앱에서 수정·삭제·추가되는 실행 데이터와 분리된 원본이다. 같은 이름의 기존 ZIP을 초기화 스크립트가 덮어쓰지 않는다.

## GitHub 배포용 seed

- `data/seed`: 샘플 CSV 10개
- `data/seed-files`: 중복을 제거한 이미지 원본 6개와 `manifest.json`

로컬에서는 `npm run init:data:seed`, Supabase에서는 `npm run setup:supabase`로 비어 있는 저장소에 샘플을 초기화한다. 두 명령 모두 기존 데이터를 기본적으로 덮어쓰지 않는다.

