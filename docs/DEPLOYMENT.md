# Vercel·Supabase 검증 배포

최종 갱신: 2026-10-27

## 현재 배포

- 운영 URL: https://bo9jeong-task-manager.vercel.app
- GitHub: https://github.com/yangdk02/bo9jeong-task-manager
- 웹 앱: Vercel
- 데이터베이스: Supabase Postgres
- 첨부 파일: 비공개 Supabase Storage bucket `bo9jeong-files`
- 상태: 샘플 데이터 4개 프로젝트로 검증 배포 완료

Vercel 환경에서는 로컬 파일 쓰기를 데이터 저장소로 사용하지 않습니다. 환경변수가 없는 로컬 개발에서만 CSV와 `storage` 폴더를 사용합니다.

## 환경변수

`.env.local` 또는 Vercel Project Settings에 다음 값을 설정합니다.

```text
POSTGRES_URL
SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_STORAGE_BUCKET=bo9jeong-files
```

기존 연동에서 제공하는 `SUPABASE_ANON_KEY`도 읽을 수 있지만, 서버의 전체 CRUD와 백업·복구에는 서버 전용 키를 사용해야 합니다. 비밀값은 Git에 커밋하지 않습니다.

## 최초 Supabase 설정

```powershell
npm install
npm run setup:supabase
```

이 명령은 다음을 수행합니다.

1. `supabase/schema.sql` 적용
2. 11개 테이블 생성
3. 비공개 Storage bucket 준비
4. 데이터가 비어 있을 때 `data/seed`와 `data/seed-files` 적재

기존 데이터가 있으면 seed 적재를 건너뜁니다. 전체 초기화가 명시적으로 필요한 경우에만 다음 명령을 사용합니다.

```powershell
node --env-file-if-exists=.env.local scripts/setup-supabase.mjs --force
```

`--force`는 운영 테이블 내용을 삭제하고 샘플로 교체하므로 먼저 앱의 `자료 백업 및 복구`에서 ZIP을 내려받아야 합니다.

## Vercel 배포 흐름

1. `main` 브랜치에 검증된 변경을 push합니다.
2. Vercel이 GitHub 변경을 자동 빌드·배포합니다.
3. 빌드 시 `setup-supabase.mjs --if-configured`가 스키마를 확인합니다.
4. 운영 URL에서 핵심 흐름을 확인합니다.

```powershell
npm test
npm run lint
npm run typecheck
npm run build
git push origin main
```

## 배포 후 점검

- 랜딩 담당자 검색·추가
- 프로젝트·과업·작업 생성·수정·삭제
- 담당자·부서 필터와 월 이동
- 증빙·자료 파일 업로드, 열기, 교체, 삭제
- 플레이스 방문자 수 입력과 전월 비교
- 월 범위 보고서 미리보기와 PPTX 다운로드
- 일회성 과업이 생성 월 밖의 보고서에 나오지 않는지 확인
- ZIP 백업 다운로드와 검증 단계 확인

## 파일 제한

- 한 요청의 첨부 파일 합계는 4MB 이하입니다.
- 이미지, PDF, 일반 문서, 디자인 원본과 ZIP을 허용합니다.
- 동영상은 허용하지 않습니다.
- 대용량 파일이 필요해지면 Supabase signed/resumable upload 방식으로 변경합니다.

## 플랜 주의사항

- Vercel Hobby는 시연·검증용으로만 사용합니다.
- 실제 발주처 운영 전 Vercel 이용 조건과 트래픽·Function 한도를 다시 검토합니다.
- Supabase DB·Storage 사용량과 Free 프로젝트 일시 중지 조건을 운영 전에 확인합니다.
- 필요하면 Vercel Pro, 유료 Supabase 또는 다른 운영 호스팅으로 전환합니다.
