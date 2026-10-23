# SIFS 베타

학교 공지와 학생이 직접 등록한 정보를 모아 보는 웹 앱입니다. 프런트엔드는 정적 웹사이트로 배포하고, 계정·게시글·시간표 데이터는 Supabase에 저장합니다.

## 현재 진행 상황 (2026-10-23)

### 완료한 설정과 확인

- 기본 Supabase SQL 설정은 적용되어 있습니다. 학급 시간표 공유용 `class_timetable_slots` 테이블과 같은 반 전용 RLS 정책도 2026-10-23에 Supabase에 적용했습니다.
- Supabase Edge Functions의 `school-notices`, `school-information` 배포를 완료했습니다.
- Supabase 로그인 URL과 Google OAuth 웹 클라이언트 주소를 설정했습니다.
- Netlify 사이트에서 로그인한 뒤 서현고 공지·학사일정·급식 정보가 표시되는 것을 확인했습니다.
- 앱에 포함되어 있던 기본 데모 게시글은 현재 코드에서 제거했습니다. 사용자가 직접 만든 테스트 게시글은 별도로 남아 있을 수 있습니다.
- 앱 코드와 이 진행 상황 문서는 GitHub `main` 브랜치에서 관리합니다. 이번 시간표 변경 사항은 아직 로컬 소스에만 반영되어 공개 배포가 필요합니다.
- 학급·과목 게시글 이미지 첨부는 코드와 공개 범위 정책을 적용했으며, Netlify 배포 기록에서 배포를 확인했습니다.
- 서현고 공식 가정통신문을 `가정통신문` 분류와 통합 검색 피드에 표시하는 코드와 `school-family-letters` Edge Function을 추가했습니다. 이 함수와 웹 코드가 각각 배포된 뒤 공개 사이트에 반영됩니다.
- 시간표에서 코드 없는 흰칸은 같은 학교·학년·반과 공유하고, 파란 선택코드 칸은 계정별로 분리하도록 구현했습니다. SQL은 적용했지만 웹 코드는 아직 GitHub에 올리지 않아 실제 공개 사이트 반영과 두 계정 간 확인이 남아 있습니다.

### 다음에 할 일

1. **Netlify 최신 배포 확인:** Netlify의 **Deploys**에서 GitHub `main`의 최신 커밋이 성공적으로 배포됐는지 확인하고, 사이트를 시크릿 창에서 새로고침합니다. 기본 데모 글이 없어졌는지 확인하고, 직접 등록한 `test` 등의 글은 앱에서 따로 삭제합니다.
2. **공개 범위 확인:** 서로 다른 두 계정으로 같은 학교·같은 학급, 다른 학급, 다른 학교 게시글이 각 대상에게만 보이는지 확인합니다.
3. **시간표 공개 범위 확인:** 같은 반의 두 계정에서 흰칸 변경이 동기화되고, F~J 선택과목은 서로의 계정에 나타나지 않는지 확인합니다. 같은 계정 안에서 같은 코드 과목명은 함께 바뀌는지도 점검합니다.
4. **신고 흐름 확인:** 테스트 게시글을 신고하고 `hongsg821@gmail.com` 운영자 계정의 **신고 관리**에서 확인·처리·숨김이 되는지 점검한 뒤 테스트 자료를 정리합니다.
5. **공개 전 개인정보 점검:** 예전 베타의 공개 URL 이미지가 남아 있는지 아래 SQL로 찾고, 백업 JSON에 학번이 포함될 수 있다는 안내가 사용자에게 보이는지 확인합니다.
6. **공개 범위 확대 전 준비:** 현재 학교·학년·반은 직접 입력한 값이라 재학이나 반 배정을 증명하지 않습니다. 더 넓게 공개하거나 학급 소속을 신뢰해야 한다면 초대 코드 같은 확인 절차를 추가합니다. 일반 사용자에게 Google 로그인을 열기 전에는 OAuth 앱 게시 및 필요한 검증을 마칩니다. 테스트 중이라면 Google OAuth를 Testing 상태로 유지해도 됩니다.

로컬 미리보기는 `http://127.0.0.1:8765/`에서 열립니다. 공개 주소는 [https://cit-sifs.netlify.app](https://cit-sifs.netlify.app)입니다. 로컬 파일이 GitHub에 올라갔다고 Netlify 배포까지 완료된 것은 아니므로, 위 1번에서 최신 배포를 확인하세요.

## 아직 다듬지 않은 점과 제한

- **공식 학교 정보는 서현고 전용입니다.** 다른 학교를 프로필에 설정할 수 있지만, 그 학교의 공지·급식·학사일정은 아직 연결되어 있지 않습니다.
- **학교·학급은 직접 입력한 값입니다.** 실제 재학이나 반 배정을 확인하지 않으므로, 공개 범위는 사용자 입력과 학교명 일치 여부를 기준으로 적용됩니다. 같은 학교 사용자끼리는 학교명을 똑같이 입력해야 합니다.
- **시간표는 기본 수동 입력입니다.** 코드가 없는 흰칸은 같은 학교·학년·반으로 설정한 로그인 계정 사이에서 공유됩니다. 선택코드가 있는 파란칸은 개인 계정에 저장되며, 한 계정 안에서 같은 코드의 과목명이 동기화됩니다. 학급 정보는 직접 입력이라 실제 반 배정을 확인하지 않습니다. 월~금, 하루 1~7교시를 지원하며 격주 시간표, 교실·교사 정보, 공휴일 자동 반영, 학교 시간표 파일 가져오기는 아직 없습니다.
- **기본 데모 게시글은 현재 코드에서 제외했습니다.** 이전 빌드에 남은 데모 글이나 직접 입력한 테스트 게시글은 실제 정보와 구분해 공개 전에 정리하세요.
- **신고 알림은 이메일로 오지 않습니다.** 신고는 Supabase에 저장되며 `hongsg821@gmail.com` 계정으로 로그인해 앱의 **신고 관리** 화면에서 직접 확인해야 합니다.
- **이전 이미지 공개 여부를 확인해야 합니다.** 예전 베타에서 학급·과목 게시글에 올린 이미지는 공개 URL로 계속 열릴 수 있습니다. 아래 SQL로 찾은 파일은 Supabase Storage에서도 별도로 삭제해야 합니다.
- **백업은 수동 보관입니다.** 전체 백업 JSON에 학번이 포함될 수 있으니 안전하게 보관하고 공유하지 마세요.

## 로컬 미리보기

프로젝트 폴더에서 다음 명령을 실행합니다. 기본 포트는 `8765`이며, 이미 다른 미리보기 서버가 그 포트를 사용 중이면 다른 포트를 지정할 수 있습니다.

~~~powershell
node dev-server.mjs
~~~

브라우저에서 `http://127.0.0.1:8765/`를 엽니다. 미리보기 서버는 현재 PC에서만 접속할 수 있으며, 다른 기기나 공개 사이트에 배포하는 서버가 아닙니다.

## Supabase와 Google 로그인 설정

1. **SQL Editor**에서 최신 `supabase-setup.sql` 전체를 실행합니다. 게시글·프로필·개인 시간표·학급별 시간표 슬롯 테이블, 공개 범위 RLS 정책, 이미지 버킷, 실시간 구독, 지정 신고 운영자를 설정합니다. 학급 시간표 슬롯은 같은 학교·학년·반의 프로필을 가진 로그인 계정에만 열립니다.
2. `app.js`의 Supabase Project URL과 publishable key는 브라우저에서 사용하는 공개 값입니다. `service_role`이나 비밀 키를 프런트엔드에 넣지 마세요.
3. Google Cloud에서 OAuth 웹 클라이언트를 설정하고 승인된 JavaScript 출처에 실제 앱 주소, 리디렉션 URI에 `https://wljqmhwshmbcaitfiudc.supabase.co/auth/v1/callback`을 등록합니다.
4. Supabase **Authentication → Sign In / Providers → Google**에 Client ID와 Client Secret을 입력합니다. Secret은 프런트엔드에 넣지 않습니다. 테스트 중에는 OAuth 앱을 Testing 상태로 둘 수 있으며, 일반 사용자에게 공개하기 전에는 게시 상태와 필요한 검증 요건을 확인합니다.
5. Supabase **Authentication → URL Configuration**의 Site URL과 Redirect URLs에 앱의 실제 HTTPS 주소를 등록합니다. `file://` 주소에서는 OAuth 로그인이 되지 않습니다.

앱은 Google의 `openid`, `email`, `profile` 범위만 사용합니다. 자세한 내용은 [Supabase Google 로그인 안내](https://supabase.com/docs/guides/auth/social-login/auth-google)를 참고하세요.

## 공지·학사일정·급식 함수 배포

`supabase/functions/school-notices/index.ts`는 서현고 공식 공지사항을, `supabase/functions/school-family-letters/index.ts`는 가정통신문을, `supabase/functions/school-information/index.ts`는 서현고 학사일정과 급식표를 가져옵니다. 앱은 30분마다 갱신하며, 각 함수가 배포되지 않으면 공개 사이트에서 해당 정보가 갱신되지 않습니다.

Supabase CLI가 설치된 환경에서 프로젝트 폴더를 열고 실행합니다.

~~~powershell
supabase login
supabase functions deploy school-notices --project-ref wljqmhwshmbcaitfiudc
supabase functions deploy school-family-letters --project-ref wljqmhwshmbcaitfiudc
supabase functions deploy school-information --project-ref wljqmhwshmbcaitfiudc
~~~

두 함수는 학교가 공개한 정보만 반환합니다. 공식 데이터는 사용자 게시글 테이블에 복사하지 않습니다. 배포 절차는 [Supabase Edge Functions 안내](https://supabase.com/docs/guides/functions/deploy)를 참고하세요.

## 공개 범위와 신고

- 학교 전체 게시글은 같은 학교의 계정에 표시됩니다. 로그인하지 않은 방문자는 서현고 전체 게시글을 볼 수 있습니다.
- 학급 게시글은 학교·학년·반이 모두 일치하는 로그인 사용자에게 표시됩니다.
- 과목 게시글은 같은 학교이고 본인 시간표에 해당 과목이 있는 로그인 사용자에게 표시됩니다.
- 이미지는 비공개 `post-images` 버킷에 저장하고, 게시글 공개 범위에 해당하는 로그인 사용자에게만 1시간짜리 임시 URL을 제공합니다. 로그인하지 않은 방문자는 이미지를 볼 수 없습니다. 학교·학급·과목 게시글에 이미지 1장을 첨부할 수 있습니다.
- 신고는 로그인한 사용자만 제출할 수 있습니다. 신고 목록은 지정 운영자 계정 `hongsg821@gmail.com`만 볼 수 있고, 신고자에게 이메일 알림은 전송하지 않습니다.

이전 공개 이미지가 비공개 게시글에 연결되어 있는지 확인하려면 SQL Editor에서 실행합니다.

~~~sql
select id, post->>'title' as title, post->>'audience' as audience, post->>'image' as image_reference
from public.posts
where audience_type <> 'school'
  and coalesce(post->>'image', '') ~* '/storage/v1/object/public/post-images/';
~~~

쿼리는 목록만 보여 줍니다. 해당 이미지 파일은 Supabase Storage의 `post-images` 버킷에서 별도로 정리해야 합니다.

## 백업

**전체 백업 내보내기**는 게시글, 개인 선택과목, 반 공유 시간표, 학교·학급·이름·학번 프로필을 JSON으로 저장합니다. 전체 백업을 가져오면 현재 브라우저 데이터를 교체하기 전에 확인합니다. Supabase 자동 백업을 대신하지 않으므로 백업 파일을 별도로 보관하세요.

기존 게시글 전용 JSON도 가져올 수 있습니다. 로그인 상태에서 가져온 게시글을 온라인에 공유하기 전에는 앱에서 확인을 요청합니다.

## 공개 전 확인 목록

- [x] 학급 시간표 슬롯/RLS SQL 적용 (2026-10-23)
- [x] `school-notices`, `school-information` Edge Function 배포 (완료 확인)
- [ ] `school-family-letters` Edge Function 배포
- [x] Netlify에서 로그인 후 공지·학사일정·급식 표시 확인
- [ ] GitHub `main`의 최신 커밋이 Netlify에 성공적으로 배포되고 기본 데모 글이 사라졌는지 확인
- [ ] Google 로그인 버튼으로 테스트 계정 로그인·로그아웃 확인 (사용한 로그인 제공자가 Google인지 별도 확인 필요)
- [ ] 서로 다른 계정·학교·학급으로 게시글 공개 범위를 확인함
- [ ] 같은 반 계정 사이에서 흰칸 시간표 공유 확인
- [ ] 파란 F~J 선택과목이 개인별로 유지되고, 같은 계정 내 같은 코드가 함께 입력되는지 확인
- [ ] 신고가 운영자 계정에서만 보이고 처리·숨김 동작이 확인됨
- [ ] 이전 공개 이미지 점검 및 직접 등록한 테스트 게시글 정리 완료
- [ ] 백업에 학번이 포함될 수 있다는 안내와 학교·학급 수동 입력 한계 확인
