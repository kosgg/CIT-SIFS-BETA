# SIFS 베타

학교 공지와 학생이 직접 등록한 정보를 모아 보는 웹 앱입니다. 프런트엔드는 정적 웹사이트로 배포하고, 계정·게시글·시간표 데이터는 Supabase에 저장합니다.

## 현재 상태

- 검색, 게시글 등록, 공개 범위, 신고와 운영자 신고 검토 기능이 코드에 반영되어 있습니다.
- 학교·학년·반은 사용자가 계정별로 설정하고, 실제 시간표는 빈 표에서 직접 입력합니다. 같은 계정으로 로그인하면 다른 기기에서도 불러옵니다.
- 서현고 공지·학사일정·급식 연동용 Supabase Edge Function 코드가 있습니다. 공개 프로젝트에 배포됐는지는 Supabase 대시보드에서 확인해야 합니다.
- 최신 코드의 로컬 미리보기는 `http://127.0.0.1:8766/`에서 열려 있습니다. 현재 Netlify 사이트는 마지막으로 배포한 파일을 보여 주므로, 최신 코드를 올리기 전까지 이 변경 사항이 반영되지 않습니다.

## 지금 해야 할 일

아래 순서대로 진행하면 최신 코드를 온라인에 반영할 수 있습니다.

1. **Supabase SQL 적용:** Supabase 대시보드의 **SQL Editor**에서 이 폴더의 최신 `supabase-setup.sql` 전체를 한 번 실행합니다. 새 `target_school` 컬럼과 학교별 공개 권한을 추가하고 기존 게시글을 서현고 대상으로 보정합니다. `hongsg821@gmail.com` 계정이 Supabase Auth에 등록되어 있어야 합니다.
2. **공지·학사정보 함수 확인:** Edge Function 메뉴에 `school-notices`, `school-information`이 없다면 아래 명령으로 배포합니다. 이미 배포돼 있어도 코드가 바뀐 경우 다시 배포합니다.
3. **웹사이트 재배포:** 최신 `index.html`, `app.js`, `styles.css`를 Netlify에 올립니다. SQL 적용 전에 새 프런트엔드를 배포하면 `target_school` 컬럼을 찾지 못해 게시글 피드가 실패할 수 있으므로 SQL을 먼저 실행합니다.
4. **Google 로그인 주소 확인:** Supabase Authentication의 Site URL과 Redirect URLs에 실제 Netlify 주소가 등록되어 있는지 확인합니다. 공개 사용자는 Google OAuth 앱도 테스트 모드가 아닌 게시 상태여야 합니다.
5. **계정별 동작 확인:** 두 계정으로 로그인해 같은 학교·같은 학급 게시글, 다른 학급·다른 학교 게시글이 각각 의도한 범위로 보이는지 확인합니다. 시간표 입력 후 로그아웃·재로그인 및 다른 기기에서도 같은 계정 데이터를 불러오는지 확인합니다.

## 아직 다듬지 않은 점과 제한

- **공식 학교 정보는 서현고 전용입니다.** 다른 학교를 프로필에 설정할 수 있지만, 그 학교의 공지·급식·학사일정은 아직 연결되어 있지 않습니다.
- **학교·학급은 직접 입력한 값입니다.** 실제 재학이나 반 배정을 확인하지 않으므로, 공개 범위는 사용자 입력과 학교명 일치 여부를 기준으로 적용됩니다. 같은 학교 사용자끼리는 학교명을 똑같이 입력해야 합니다.
- **시간표는 기본 수동 입력입니다.** 월~금, 하루 1~7교시를 지원합니다. 격주 시간표, 교실·교사 정보, 공휴일 자동 반영, 학교에서 받은 시간표 파일 가져오기는 아직 없습니다.
- **예시 게시글을 정리해야 합니다.** 현재 코드에 데모 게시글과 지난 날짜의 마감일이 남아 있습니다. 실제 공개 전에 최신 정보로 바꾸거나 예시 데이터를 제거하세요.
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

1. **SQL Editor**에서 최신 `supabase-setup.sql` 전체를 실행합니다. 게시글·프로필·시간표 테이블, 공개 범위 RLS 정책, 이미지 버킷, 게시글 실시간 구독, 지정 신고 운영자를 설정합니다.
2. `app.js`의 Supabase Project URL과 publishable key는 브라우저에서 사용하는 공개 값입니다. `service_role`이나 비밀 키를 프런트엔드에 넣지 마세요.
3. Google Cloud에서 OAuth 웹 클라이언트를 설정하고 승인된 JavaScript 출처에 실제 앱 주소, 리디렉션 URI에 `https://wljqmhwshmbcaitfiudc.supabase.co/auth/v1/callback`을 등록합니다.
4. Google Auth Platform에서 일반 Google 계정의 로그인을 허용하도록 OAuth 앱을 게시하고, Supabase **Authentication → Sign In / Providers → Google**에 Client ID와 Client Secret을 입력합니다. Secret은 프런트엔드에 넣지 않습니다.
5. Supabase **Authentication → URL Configuration**의 Site URL과 Redirect URLs에 앱의 실제 HTTPS 주소를 등록합니다. `file://` 주소에서는 OAuth 로그인이 되지 않습니다.

앱은 Google의 `openid`, `email`, `profile` 범위만 사용합니다. 자세한 내용은 [Supabase Google 로그인 안내](https://supabase.com/docs/guides/auth/social-login/auth-google)를 참고하세요.

## 공지·학사일정·급식 함수 배포

`supabase/functions/school-notices/index.ts`는 서현고 공식 공지사항을, `supabase/functions/school-information/index.ts`는 서현고 학사일정과 급식표를 가져옵니다. 앱은 30분마다 갱신하며, 함수가 배포되지 않으면 공개 사이트에서 이 정보가 갱신되지 않습니다.

Supabase CLI가 설치된 환경에서 프로젝트 폴더를 열고 실행합니다.

~~~powershell
supabase login
supabase functions deploy school-notices --project-ref wljqmhwshmbcaitfiudc
supabase functions deploy school-information --project-ref wljqmhwshmbcaitfiudc
~~~

두 함수는 학교가 공개한 정보만 반환합니다. 공식 데이터는 사용자 게시글 테이블에 복사하지 않습니다. 배포 절차는 [Supabase Edge Functions 안내](https://supabase.com/docs/guides/functions/deploy)를 참고하세요.

## 공개 범위와 신고

- 학교 전체 게시글은 같은 학교의 계정에 표시됩니다. 로그인하지 않은 방문자는 서현고 전체 게시글을 볼 수 있습니다.
- 학급 게시글은 학교·학년·반이 모두 일치하는 로그인 사용자에게 표시됩니다.
- 과목 게시글은 같은 학교이고 본인 시간표에 해당 과목이 있는 로그인 사용자에게 표시됩니다.
- 공개 이미지 URL을 비공개 게시글에서 노출하지 않도록 학급·과목 게시글에는 이미지 첨부를 막았습니다. 학교 전체 게시글에는 이미지 한 장을 첨부할 수 있습니다.
- 신고는 로그인한 사용자만 제출할 수 있습니다. 신고 목록은 지정 운영자 계정 `hongsg821@gmail.com`만 볼 수 있고, 신고자에게 이메일 알림은 전송하지 않습니다.

이전 공개 이미지가 비공개 게시글에 연결되어 있는지 확인하려면 SQL Editor에서 실행합니다.

~~~sql
select id, post->>'title' as title, post->>'audience' as audience, post->>'image' as public_image_url
from public.posts
where audience_type <> 'school'
  and coalesce(post->>'image', '') <> '';
~~~

쿼리는 목록만 보여 줍니다. 해당 이미지 파일은 Supabase Storage의 `post-images` 버킷에서 별도로 정리해야 합니다.

## 백업

**전체 백업 내보내기**는 게시글, 시간표, 학교·학급·이름·학번 프로필을 JSON으로 저장합니다. 전체 백업을 가져오면 현재 브라우저 데이터를 교체하기 전에 확인합니다. Supabase 자동 백업을 대신하지 않으므로 백업 파일을 별도로 보관하세요.

기존 게시글 전용 JSON도 가져올 수 있습니다. 로그인 상태에서 가져온 게시글을 온라인에 공유하기 전에는 앱에서 확인을 요청합니다.

## 공개 전 확인 목록

- [ ] 최신 `supabase-setup.sql` 실행 성공
- [ ] Google OAuth가 실제 Netlify 주소에서 로그인·로그아웃됨
- [ ] 최신 프런트엔드 파일을 Netlify에 배포함
- [ ] 필요한 두 Edge Function이 배포되고 공지·학사일정·급식이 새로고침됨
- [ ] 서로 다른 계정·학교·학급으로 게시글 공개 범위를 확인함
- [ ] 시간표가 같은 계정의 다른 기기에서 동기화됨
- [ ] 신고가 운영자 계정에서만 보이고 처리·숨김 동작이 확인됨
- [ ] 이전 공개 이미지 점검 및 예시 게시글의 마감일 정리 완료
