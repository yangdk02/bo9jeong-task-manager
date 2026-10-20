# Vercel 무료 검증 배포

## 결정된 구성

- 웹 앱: Vercel
- 구조화 데이터: Supabase Postgres
- 첨부 파일: 비공개 Supabase Storage bucket `bo9jeong-files`
- 원본 CSV: `data/seed`에 초기 샘플로만 보관
- 실제 로그인과 권한 화면: 구현하지 않음

Vercel 실행 환경에서는 로컬 파일 쓰기가 유지되지 않으므로 운영 데이터는 CSV에 기록하지 않는다. 환경변수가 없는 로컬 개발에서는 기존 CSV 저장 방식을 계속 사용할 수 있다.

## 배포 전 준비

1. GitHub에 비공개 저장소를 만든다.
2. Supabase Free 프로젝트를 만든다.
3. `.env.example`의 값을 `.env.local`에 설정한다.
4. 아래 명령으로 테이블·비공개 bucket·샘플 데이터를 최초 1회 생성한다.

```powershell
npm run setup:supabase
```

기존 Supabase 데이터가 있으면 seed를 덮어쓰지 않는다. `--force`는 전체 샘플 초기화가 명시적으로 필요할 때만 직접 실행한다.

5. Vercel에서 GitHub 저장소를 Import한다.
6. Supabase Marketplace 연동 또는 Project Settings에서 다음 환경변수를 연결한다.

```text
POSTGRES_URL
SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_STORAGE_BUCKET=bo9jeong-files
```

7. Preview와 Production에서 프로젝트·과업·작업 CRUD, 파일 열기와 삭제를 확인한다.

## 무료 플랜 검토 사항

- Supabase Free 한도는 DB 500MB, Storage 1GB다. 사용량을 정기적으로 확인한다.
- Vercel Hobby는 비상업적 개인 용도로 제한된다.
- 이 배포는 시연·검증용으로만 사용한다.
- **실제 운영 전 발주처 사용 형태가 Vercel Hobby 정책에 맞는지 다시 검토하고, 필요하면 Vercel Pro 또는 다른 운영 호스팅으로 전환한다.**

## 현재 업로드 유의사항

파일은 서버를 거쳐 Supabase Storage로 전송된다. 앱 자체의 확장자 정책 외에도 Vercel 요청 크기와 실행 시간 제한을 받는다. 대용량 영상 업로드가 실제로 필요해지면 Supabase signed/resumable upload 방식으로 전환한다.

