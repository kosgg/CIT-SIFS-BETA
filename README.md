# SIFS Supabase 베타

SIFS는 정적 웹 앱에 Supabase를 연결하는 베타입니다. index.html, styles.css, app.js를 같은 폴더에 두고 배포하면 게시글은 공용 피드에서 읽고, 로그인한 사용자의 프로필과 시간표는 계정에 저장합니다.

## 포함 기능

- 제목·본문 검색, 분류 필터, 최신순 정렬
- 공용 게시글 피드와 새 게시글 실시간 반영
- 로그인한 사용자의 게시글 등록 및 이미지 업로드
- 계정별 이름·학번·학급 프로필과 시간표 저장·동기화
- 전체 백업 내보내기와 복원, 이전 게시글 JSON 가져오기

## Supabase 초기 설정

1. Supabase 대시보드에서 **SQL Editor**를 열고 supabase-setup.sql 전체를 실행합니다. HTTPS 배포 시에는 site 폴더만 올리면 됩니다. 이 폴더에는 index.html, styles.css, app.js가 함께 있습니다. 앱 파일을 수정한 뒤에는 site 폴더의 파일도 최신 내용으로 갱신하세요. 게시글·프로필·시간표 테이블, RLS 정책, 이미지 버킷, 게시글 실시간 구독을 설정합니다.
2. index.html에는 사용자가 제공한 Project URL과 publishable key가 들어 있습니다. publishable key는 브라우저에 공개되는 키입니다. service_role이나 secret 키는 절대 HTML에 넣지 마세요.
3. 앱을 HTTPS 주소로 배포한 뒤 Google OAuth를 설정합니다. Google Cloud에서 OAuth 클라이언트(웹 애플리케이션)를 만들고, 승인된 JavaScript 출처에 배포된 앱의 origin을, 승인된 리디렉션 URI에 https://wljqmhwshmbcaitfiudc.supabase.co/auth/v1/callback 을 등록합니다.
4. Google Cloud의 **Google Auth Platform → Audience**에서 사용자 유형을 **External**로 설정합니다. 일반 Google 계정 모두가 로그인할 수 있게 하려면 테스트 상태에 두지 말고 **In production**으로 게시합니다. Supabase의 **Authentication → Sign In / Providers → Google**에서 Google Client ID와 Client Secret을 입력하고 Google 로그인을 켭니다. Client Secret은 HTML에 넣지 않습니다.
5. Supabase의 **Authentication → URL Configuration**에서 Site URL과 Redirect URLs에 앱의 실제 HTTPS 주소를 등록합니다. file://은 OAuth 로그인을 지원하지 않으며 다른 사용자에게 공유할 주소도 아닙니다.

Google Cloud에 추가하는 범위는 openid, email, profile만 사용합니다. 앱에서 Google Drive 등 다른 Google 데이터를 요청하지 않습니다. 테스트 모드에서는 로그인할 수 있는 계정이 제한되므로 공개 사용 전에 게시 상태를 확인하세요. 자세한 내용은 [Supabase Google 로그인 안내](https://supabase.com/docs/guides/auth/social-login/auth-google)를 참고하세요.

## 데이터와 접근 권한

게시글은 로그인 여부와 관계없이 읽을 수 있으며, 게시글 작성은 로그인한 사용자만 할 수 있습니다. 각 사용자는 본인 프로필과 시간표만 읽고 수정할 수 있습니다. 학번은 본인 프로필에 저장되며 공용 게시글에는 표시하지 않습니다. 이름은 게시글 작성자 이름으로 표시될 수 있습니다. 전체 백업 JSON에는 학번도 포함되므로 파일을 공유할 때 주의하세요. 이미지 파일은 공용 게시글에서 표시하기 위해 공개 버킷에 저장되므로, 전화번호나 학생 얼굴 등 민감한 이미지는 올리지 마세요.

현재 화면에 표시되는 학교 공지 일부는 예시 데이터이며, 실제 학교 사이트에서 자동 수집하지 않습니다.

## 데이터 백업

**전체 백업 내보내기**는 게시글, 시간표, 이름·학번·학급 프로필을 하나의 JSON 파일로 저장합니다. 학번이 포함되므로 백업 파일을 다른 사람과 공유하지 마세요. 전체 백업을 가져오면 현재 브라우저 데이터를 교체하기 전에 확인 안내를 표시합니다. 로그인 상태에서 복원한 게시글은 공용 피드에 올리기 전에 별도 확인을 받습니다.

기존 게시글 전용 JSON도 계속 가져올 수 있습니다. 로그인한 상태에서는 가져온 게시글을 공용 피드에 올리기 전에 확인합니다. Supabase 무료 프로젝트에는 다운로드 가능한 자동 데이터베이스 백업이 포함되지 않으므로 전체 백업 파일을 별도로 보관하세요.

## 개발 확인 항목

- Supabase SQL을 실행한 뒤 앱에서 게시글 피드를 불러오는지 확인
- Google OAuth 로그인·로그아웃
- 한 기기에서 만든 게시글이 다른 기기에서 보이는지 확인
- 이미지 업로드와 계정별 시간표·프로필 동기화 확인
- 전체 JSON 백업을 내보내고 복원
