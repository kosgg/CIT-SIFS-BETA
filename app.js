const STORAGE_KEYS = { posts: "sifs.beta.posts.v1", timetable: "sifs.beta.timetable.v1", profile: "sifs.beta.profile.v1" };
  const SUPABASE_URL = "https://wljqmhwshmbcaitfiudc.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mMBNZxl0RobMJTLJYxbN5Q_DeCC8llJ";
  const supabaseClient = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
  const DAYS = ["", "월", "화", "수", "목", "금"];
  const DEFAULT_SCHOOL_NAME = "서현고등학교";
  const SCHOOL_NOTICE_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
  const CATEGORY_LABELS = { official: "학교 공지", assessment: "수행평가", event: "행사", family: "가정통신문" };
  // Keep retired IDs so old local caches, backups, or cloud rows cannot revive bundled demo posts.
  const RETIRED_DEMO_POST_IDS = new Set([
    "demo-assessment-1", "demo-official-1", "demo-event-1",
    "demo-family-1", "demo-assessment-2", "demo-official-2"
  ]);
  const DEFAULT_POSTS = [];
  const LEGACY_SAMPLE_TIMETABLE = [
    {day:1,period:1,subject:"국어"},{day:1,period:2,subject:"수학 II"},{day:1,period:3,subject:"영어 I"},{day:1,period:4,subject:"화학 I"},{day:1,period:5,subject:"한국사"},{day:1,period:6,subject:"체육"},{day:1,period:7,subject:"창체"},
    {day:2,period:1,subject:"수학 II"},{day:2,period:2,subject:"화학 I"},{day:2,period:3,subject:"한국사"},{day:2,period:4,subject:"영어 I"},{day:2,period:5,subject:"국어"},{day:2,period:6,subject:"진로"},{day:2,period:7,subject:"자율"},
    {day:3,period:1,subject:"영어 I"},{day:3,period:2,subject:"국어"},{day:3,period:3,subject:"수학 II"},{day:3,period:4,subject:"체육"},{day:3,period:5,subject:"화학 I"},{day:3,period:6,subject:"한국사"},{day:3,period:7,subject:"진로"},
    {day:4,period:1,subject:"국어"},{day:4,period:2,subject:"영어 I"},{day:4,period:3,subject:"화학 I"},{day:4,period:4,subject:"수학 II"},{day:4,period:5,subject:"미술"},{day:4,period:6,subject:"동아리"},{day:4,period:7,subject:"동아리"},
    {day:5,period:1,subject:"화학 I"},{day:5,period:2,subject:"체육"},{day:5,period:3,subject:"국어"},{day:5,period:4,subject:"한국사"},{day:5,period:5,subject:"영어 I"},{day:5,period:6,subject:"수학 II"},{day:5,period:7,subject:"자율"}
  ];
  const DEFAULT_TIMETABLE = [];
  function normalizeTimetable(value) {
    if (!Array.isArray(value)) return [];
    const isLegacySample = value.length === LEGACY_SAMPLE_TIMETABLE.length && LEGACY_SAMPLE_TIMETABLE.every(sample =>
      value.some(item => item?.day === sample.day && item?.period === sample.period && item?.subject === sample.subject)
    );
    if (isLegacySample) return [];
    const slots = new Set();
    return value.map(item => {
      if (!item || !Number.isInteger(item.day) || item.day < 1 || item.day > 5 || !Number.isInteger(item.period) || item.period < 1 || item.period > 7 || typeof item.subject !== "string") return null;
      const code = typeof item.code === "string" && /^[A-Z]$/i.test(item.code.trim()) ? item.code.trim().toUpperCase() : "";
      if (!item.subject.trim() && !code) return null;
      const slot = `${item.day}-${item.period}`;
      if (slots.has(slot)) return null;
      slots.add(slot);
      return {day:item.day, period:item.period, subject:item.subject.trim(), ...(code ? {code} : {})};
    }).filter(Boolean);
  }
  function normalizeClassTimetable(value) {
    return normalizeTimetable(value).filter(item => !item.code && item.subject).map(({day,period,subject}) => ({day,period,subject}));
  }
  function normalizeProfile(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : "학생",
      studentId: typeof source.studentId === "string" ? source.studentId.trim() : "",
      schoolName: typeof source.schoolName === "string" && source.schoolName.trim() ? source.schoolName.trim() : DEFAULT_SCHOOL_NAME,
      grade: ["1학년", "2학년", "3학년"].includes(source.grade) ? source.grade : "",
      className: typeof source.className === "string" && source.className.trim() ? source.className.trim() : ""
    };
  }
  function profileStorageKey(userId = "") { return `${STORAGE_KEYS.profile}.${userId || "guest"}`; }
  function timetableStorageKey(userId = "") { return `${STORAGE_KEYS.timetable}.${userId || "guest"}`; }
  function classTimetableIdentity(targetProfile = profile) {
    if (!targetProfile.schoolName || !targetProfile.grade || !targetProfile.className) return null;
    return {school_name:targetProfile.schoolName.trim(), grade:targetProfile.grade.trim(), class_name:targetProfile.className.trim()};
  }
  function classTimetableStorageKey(identity = classTimetableIdentity()) {
    return identity ? `${STORAGE_KEYS.timetable}.class.${encodeURIComponent(`${identity.school_name}|${identity.grade}|${identity.class_name}`)}` : "";
  }
  function classTimetableKnownCloudKey(identity = classTimetableIdentity()) {
    const key=classTimetableStorageKey(identity);
    return key?`${key}.synced`:"";
  }
  function visibleTimetable() {
    const slots = new Map();
    normalizeClassTimetable(classTimetable).forEach(item => slots.set(`${item.day}-${item.period}`, item));
    normalizeTimetable(timetable).forEach(item => slots.set(`${item.day}-${item.period}`, item));
    return [...slots.values()].sort((a,b) => a.day-b.day || a.period-b.period);
  }
  function profileForUser(user) {
    const metadata = user?.user_metadata || {};
    const name = metadata.full_name || metadata.name || metadata.preferred_username || user?.email?.split("@")[0] || "학생";
    return normalizeProfile({name, studentId:"", schoolName:DEFAULT_SCHOOL_NAME, grade:"", className:""});
  }
  function audienceForPost(post) {
    const type = post?.audience_type || post?.audienceType;
    const audience = String(post?.audience || "").trim();
    const audienceSchool = post?.officialSource ? DEFAULT_SCHOOL_NAME : audience.match(/^(.+?)\s+전체$/)?.[1];
    const schoolName = post?.target_school || post?.targetSchool || post?.schoolName || audienceSchool || DEFAULT_SCHOOL_NAME;
    if (type === "class") return {type, schoolName, grade:post.target_grade || post.targetGrade || "", className:post.target_class || post.targetClass || ""};
    if (type === "subject") return {type, schoolName, subject:post.target_subject || post.targetSubject || post.subject || ""};
    if (type === "school") return {type, schoolName};
    if (audience === "내가 선택한 과목") return {type:"subject", schoolName, subject:post?.subject || ""};
    const classMatch = audience.match(/^([1-3]학년)\s+(.+반)$/);
    if (classMatch) return {type:"class", schoolName, grade:classMatch[1], className:classMatch[2]};
    return {type:"school", schoolName};
  }
  function isSchoolPost(post) { return audienceForPost(post).type === "school"; }
  function audienceLabel(post) {
    if (post?.officialSource) return post.category === "family" ? `${DEFAULT_SCHOOL_NAME} 전체` : "학교 공지";
    const audience = audienceForPost(post);
    if (audience.type === "class") return `${audience.schoolName} · ${audience.grade} ${audience.className}`;
    if (audience.type === "subject") return audience.subject ? `${audience.schoolName} · 과목: ${audience.subject}` : `${audience.schoolName} · 과목 대상`;
    return `${audience.schoolName} 전체`;
  }
  function postAudienceColumns(post) {
    const audience = audienceForPost(post);
    return {
      audience_type: audience.type,
      target_school: audience.schoolName,
      target_grade: audience.type === "class" ? audience.grade : null,
      target_class: audience.type === "class" ? audience.className : null,
      target_subject: audience.type === "subject" ? audience.subject : null
    };
  }
  function canViewPost(post) {
    if (post?.moderation_status === "hidden" && !isModerator) return false;
    const audience = audienceForPost(post);
    if (isModerator) return true;
    if (audience.type === "school") return audience.schoolName === profile.schoolName;
    if (!currentUser || audience.schoolName !== profile.schoolName) return false;
    if (audience.type === "class") return profile.grade === audience.grade && profile.className === audience.className;
    if (audience.type === "subject") return !!audience.subject && visibleTimetable().some(item => item.subject === audience.subject);
    return false;
  }
  function postFromRow(row) {
    if (RETIRED_DEMO_POST_IDS.has(row?.id)) return null;
    return {
      ...(row.post || {}),
      id: row.id,
      audience_type: row.audience_type,
      target_school: row.target_school,
      target_grade: row.target_grade,
      target_class: row.target_class,
      target_subject: row.target_subject,
      moderation_status: row.moderation_status || "published",
      persisted: true
    };
  }
  let posts = loadValue(STORAGE_KEYS.posts, DEFAULT_POSTS)
    .filter(post => isSchoolPost(post) && !RETIRED_DEMO_POST_IDS.has(post.id));
  const signedPostImageUrls = new Map();
  let schoolNoticePosts = [];
  let schoolNoticeSourceName = "서현고등학교";
  let familyLetterPosts = [];
  let familyLetterSourceName = "서현고등학교";
  let schoolScheduleEvents = [];
  let schoolMealDays = [];
  let schoolInformationLoading = false;
  let lastSchoolInformationAttemptAt = 0;
  let schoolNoticeLoading = false;
  let lastSchoolNoticeAttemptAt = 0;
  let familyLetterLoading = false;
  let lastFamilyLetterAttemptAt = 0;
  let schoolNoticeRefreshTimer = 0;
  let timetable = normalizeTimetable(loadValue(timetableStorageKey(), DEFAULT_TIMETABLE));
  let profile = normalizeProfile(loadValue(profileStorageKey(), {name:"학생", studentId:"", schoolName:DEFAULT_SCHOOL_NAME, grade:"", className:""}));
  let classTimetable = [];
  let classTimetableReady = false;
  let selectedCategory = "전체";
  let activePostId = "";
  let selectedSlot = null;
  let attachedImages = [];
  let toastTimer = 0;
  let currentUser = null;
  let realtimeChannel = null;
  let classTimetableChannel = null;
  let isModerator = false;

  function loadValue(key, fallback) {
    try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; }
    catch (error) { return fallback; }
  }
  function saveValue(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) { showToast("저장 공간이 부족합니다. 첨부 이미지 크기를 줄여 주세요."); return false; }
  }
  function savePublicPostCache() { return saveValue(STORAGE_KEYS.posts, posts.filter(post => isSchoolPost(post) && audienceForPost(post).schoolName === profile.schoolName)); }
  savePublicPostCache();
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[character]));
  }
  function getSafeUrl(value) {
    try { const url = new URL(value); return ["http:","https:"].includes(url.protocol) ? url.href : ""; }
    catch (error) { return ""; }
  }
  function getSafeImage(value) {
    if (typeof value === "string" && /^data:image\/(jpeg|png|webp);base64,/i.test(value)) return value;
    return getSafeUrl(value);
  }
  function postImageObjectPath(value) {
    if (typeof value !== "string" || !value.trim() || /^data:image\//i.test(value)) return "";
    try {
      const url = new URL(value);
      const base = new URL(SUPABASE_URL);
      const match = url.origin === base.origin
        ? url.pathname.match(/^\/storage\/v1\/object\/(?:public|authenticated|sign)\/post-images\/(.+)$/)
        : null;
      return match ? decodeURIComponent(match[1]) : "";
    } catch (error) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) return "";
      return value.trim().replace(/^\/+/, "").split(/[?#]/, 1)[0];
    }
  }
  function getPostImageUrl(value) {
    const safe = getSafeImage(value);
    if (safe.startsWith("data:")) return safe;
    const path = postImageObjectPath(value);
    if (!path) return safe;
    const signed = signedPostImageUrls.get(path);
    return signed && signed.expiresAt > Date.now() + 30000 ? signed.url : "";
  }
  function formatDate(value, options = {}) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", {month:"numeric",day:"numeric",...(options.time ? {hour:"2-digit",minute:"2-digit"} : {})}).format(date);
  }
  function getDday(value) {
    if (!value) return "";
    const due = new Date(value); const today = new Date();
    due.setHours(0,0,0,0); today.setHours(0,0,0,0);
    const diff = Math.ceil((due.getTime()-today.getTime())/86400000);
    return diff < 0 ? "마감" : diff === 0 ? "D-day" : `D-${diff}`;
  }
  function getCategoryLabel(post) { return post.categoryLabel || CATEGORY_LABELS[post.category] || post.category || "학교 소식"; }
  function getTagClass(post) { return post.origin === "직접 등록" ? "orange" : ["자동 수집", "실시간 연동"].includes(post.origin) ? "green" : "gray"; }
  function allFeedPosts() { return mergePostLists(posts, schoolNoticePosts, familyLetterPosts); }
  function getVisiblePosts() {
    const query = document.getElementById("searchInput").value.trim().toLocaleLowerCase("ko-KR");
    const sort = document.getElementById("sortSelect").value;
    const filtered = allFeedPosts().filter(post => {
      if (!canViewPost(post)) return false;
      const categoryMatch = selectedCategory === "전체" || getCategoryLabel(post) === selectedCategory;
      const searchText = `${post.title} ${post.body} ${post.subject || ""} ${getCategoryLabel(post)}`.toLocaleLowerCase("ko-KR");
      return categoryMatch && (!query || searchText.includes(query));
    });
    return filtered.sort((a,b) => sort === "oldest" ? new Date(a.createdAt)-new Date(b.createdAt) : new Date(b.createdAt)-new Date(a.createdAt));
  }
  function renderPostList() {
    const visible = getVisiblePosts();
    document.getElementById("resultCount").innerHTML = `${selectedCategory === "전체" ? "전체 소식" : escapeHtml(selectedCategory)} <b>${visible.length}</b>`;
    const list = document.getElementById("postList");
    if (!visible.length) {
      list.innerHTML = `<div class="empty-state"><strong>검색 결과가 없습니다.</strong><span>다른 키워드나 분류를 선택해 보세요.</span><br><button class="outline" style="margin-top:14px" id="resetSearch">검색 초기화</button></div>`;
      document.getElementById("resetSearch").addEventListener("click", resetSearch);
      return;
    }
    list.innerHTML = visible.map(post => {
      const imageUrl = getPostImageUrl(post.image);
      const imageNote = postImageObjectPath(post.image) && !imageUrl ? `<span class="tag gray">로그인 후 이미지 표시</span>` : "";
      return `<article class="post-row" data-post-id="${escapeHtml(post.id)}">${imageUrl ? `<img class="post-thumb" src="${escapeHtml(imageUrl)}" alt="게시글 첨부 이미지">` : imageNote}<div><span class="tag">${escapeHtml(getCategoryLabel(post))}</span><span class="tag ${getTagClass(post)}">${escapeHtml(post.origin || "직접 등록")}</span><span class="tag gray">${escapeHtml(audienceLabel(post))}</span>${post.moderation_status === "hidden" ? `<span class="tag red">숨김</span>` : ""}</div><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.body).replace(/\n/g," ").slice(0,100)}${post.body.length > 100 ? "…" : ""}</p><div class="post-meta">${escapeHtml(post.sourceName || post.author || "학생 등록")} · ${escapeHtml(post.author || "")} · ${formatDate(post.createdAt,{time:true})}</div><span class="post-arrow">›</span></article>`;
    }).join("");
    list.querySelectorAll("[data-post-id]").forEach(row => row.addEventListener("click", () => showDetail(row.dataset.postId)));
  }
  function getUpcomingPosts() {
    const selectedSubjects = new Set(visibleTimetable().map(item => item.subject).filter(Boolean));
    return allFeedPosts().filter(post => canViewPost(post) && post.dueAt && new Date(post.dueAt) >= new Date() && (!post.subject || selectedSubjects.has(post.subject))).sort((a,b) => new Date(a.dueAt)-new Date(b.dueAt)).slice(0,3);
  }
  function renderUpcoming() {
    const upcoming = getUpcomingPosts();
    const html = upcoming.length ? upcoming.map(post => `<div class="upcoming-item"><span class="dday">${getDday(post.dueAt)}</span><strong>${escapeHtml(post.subject || getCategoryLabel(post))}　${escapeHtml(post.title)}</strong><small>${formatDate(post.dueAt,{time:true})} 마감</small></div>`).join("") : `<div class="empty-state" style="padding:18px 4px">예정된 일정이 없어요.</div>`;
    document.getElementById("upcomingList").innerHTML = html;
    document.getElementById("timetableAssignments").innerHTML = html;
  }
  function updateAudienceControls() {
    const select = document.getElementById("postAudience");
    if (!select) return;
    const previous = ["school","class","subject"].includes(select.value) ? select.value : "school";
    const classLabel = profile.grade && profile.className ? profile.grade + " " + profile.className : "학년·반 미설정";
    select.innerHTML = '<option value="school">' + escapeHtml(profile.schoolName) + ' 전체</option>' +
      '<option value="class">내 학급 (' + escapeHtml(classLabel) + ')</option>' +
      '<option value="subject">내가 선택한 과목</option>';
    select.value = previous;
    document.getElementById("imageInput").disabled = false;
    document.getElementById("imageHelp").textContent = "JPG, PNG, WebP 이미지 1장(최대 500KB)을 비공개 저장소에 보관합니다. 게시글 공개 범위에 맞는 로그인 사용자에게만 표시됩니다.";
    document.getElementById("audienceHelp").textContent = select.value === "school"
      ? `${profile.schoolName}의 학교 전체 공개 게시글입니다.`
      : select.value === "class"
        ? profile.grade && profile.className ? `${profile.schoolName} ${profile.grade} ${profile.className} 학생에게만 표시됩니다.` : "먼저 학교·학급 설정에서 학년과 반을 입력해 주세요."
        : "내 시간표에 해당 과목이 있는 로그인 사용자에게만 표시됩니다.";
  }
  function renderTimetable() {
    const grid = document.getElementById("weekGrid");
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const shortDate = value => new Intl.DateTimeFormat("ko-KR", {month:"numeric",day:"numeric"}).format(value);
    const weekday = today.getDay();
    document.getElementById("weekRangeLabel").textContent = `${shortDate(monday)} ~ ${shortDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()+4))} · 내 실제 시간표`;
    let html = `<div class="week-cell head">교시</div>${DAYS.slice(1).map((day,index) => {
      const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()+index);
      return `<div class="week-cell head ${weekday===index+1?"this-day":""}">${day} ${date.getDate()}</div>`;
    }).join("")}`;
    for (let period=1; period<=7; period++) {
      html += `<div class="week-cell time">${period}교시</div>`;
      for (let day=1; day<=5; day++) {
        const personalItem = timetable.find(entry => entry.day === day && entry.period === period);
        const sharedItem = classTimetable.find(entry => entry.day === day && entry.period === period);
        const item = personalItem || sharedItem;
        const content = item
          ? `${item.code ? `<span class="slot-code">${escapeHtml(item.code)}</span>` : ""}<span>${item.subject ? escapeHtml(item.subject) : "과목 입력"}</span>`
          : "＋";
        const itemClass = personalItem?.code ? "personal-slot" : (personalItem||sharedItem) ? "shared-slot" : "";
        const itemTitle=personalItem?.code?"내 계정에만 저장되는 선택과목":(personalItem||sharedItem)?"같은 학급과 공유되는 공통 수업":"빈 시간 칸";
        html += `<div class="week-cell course ${item?"has-course":""} ${itemClass}" data-slot="${day}-${period}" title="${itemTitle} · 눌러서 편집">${content}</div>`;
      }
    }
    grid.innerHTML = html;
    grid.querySelectorAll("[data-slot]").forEach(cell => cell.addEventListener("click", () => {
      const [day,period] = cell.dataset.slot.split("-").map(Number);
      selectedSlot={day,period};const current=timetable.find(item=>item.day===day&&item.period===period)||classTimetable.find(item=>item.day===day&&item.period===period);
      document.getElementById("dayInput").value = String(day); document.getElementById("periodInput").value = String(period); document.getElementById("courseInput").value=current?.subject||""; document.getElementById("courseCodeInput").value=current?.code||"";
      document.getElementById("addCourseButton").textContent=current?"과목 수정":"과목 추가";
      document.getElementById("deleteCourseButton").classList.toggle("page-hidden",!current);
      document.getElementById("courseInput").focus();
    }));
    document.getElementById("courseCodeInput").onchange = () => {
      const code = document.getElementById("courseCodeInput").value;
      const mapped = timetable.find(item => item.code === code && item.subject);
      const input = document.getElementById("courseInput");
      if (mapped && !input.value.trim()) input.value = mapped.subject;
    };
    const initials = profile.name.slice(0,2) || "학생";
    document.getElementById("topAvatar").textContent = initials; document.getElementById("topName").textContent = profile.name;
    document.getElementById("profileAvatar").textContent = initials; document.getElementById("profileName").textContent = profile.name;
    document.getElementById("authorAvatar").textContent = initials; document.getElementById("authorName").textContent = profile.name;
    document.getElementById("schoolNameLabel").textContent = profile.schoolName;
    const hasSeohyeonOfficialFeed = profile.schoolName === DEFAULT_SCHOOL_NAME;
    document.getElementById("schoolNoticeSection").classList.toggle("page-hidden", !hasSeohyeonOfficialFeed);
    document.getElementById("familyLetterSection").classList.toggle("page-hidden", !hasSeohyeonOfficialFeed);
    document.getElementById("schoolDataSection").classList.toggle("page-hidden", !hasSeohyeonOfficialFeed);
    document.getElementById("schoolOfficialScopeNote").classList.toggle("page-hidden", hasSeohyeonOfficialFeed);
    document.getElementById("profileStudentId").textContent = profile.studentId ? `학번 ${profile.studentId}` : "학번 미설정";
    const classLabel = profile.grade && profile.className ? `${profile.grade} ${profile.className}` : "학년·반 미설정";
    document.getElementById("profileClass").textContent = `${profile.schoolName} · ${classLabel}`;
    document.getElementById("authorClass").textContent = classLabel;
    document.getElementById("classTag").textContent = classLabel;
    document.getElementById("homeClassTag").textContent = classLabel;
    document.getElementById("homeName").textContent = profile.name;
    document.getElementById("personalGreeting").textContent = `${profile.name}님의 한 주를 한눈에.`;
    document.getElementById("timetableAccountStatus").textContent = currentUser
      ? classTimetableReady ? "● 흰칸은 같은 반과 공유 · 파란 선택과목은 이 계정에만 저장됩니다." : "● 파란 선택과목은 이 계정에 저장됩니다. 흰칸 공유는 학급 설정과 Supabase SQL 적용이 필요해요."
      : "로그인 후 흰칸은 같은 반과 공유하고, 선택과목은 내 계정에 저장할 수 있어요.";
    document.getElementById("scheduleNote").textContent = !currentUser
      ? "흰칸은 같은 반과 공유되고, 선택코드는 내 시간표에서 같은 과목끼리 연결됩니다. 로그인 후 시간표를 저장할 수 있어요."
      : !classTimetableIdentity() ? "학교·학년·반을 설정하면 흰칸이 해당 반 계정과 공유됩니다. 선택과목은 개인별로 저장됩니다."
      : !classTimetableReady ? "반별 흰칸 동기화를 사용할 수 없습니다. 최신 supabase-setup.sql 적용 여부를 확인해 주세요. 선택과목은 개인별로 저장됩니다."
      : timetable.some(item => item.code)
        ? "흰칸은 같은 반과 공유됩니다. 파란 선택코드는 이 계정 안에서만 같은 과목을 연결하며, 한 칸에 과목명을 입력하면 내 같은 코드 칸에 적용됩니다."
        : "흰칸은 같은 반과 공유됩니다. 선택과목은 개인 시간표에서 같은 알파벳 코드를 지정하면 한 번 입력한 과목명이 내 같은 코드 칸에 적용됩니다.";
    const visible = visibleTimetable();
    const todayCourses = visible.filter(item => item.day === weekday && item.subject).sort((a,b)=>a.period-b.period).map(item=>`${item.period}교시 ${item.subject}`).join(" · ");
    document.getElementById("todayCourseSummary").textContent = weekday === 0 || weekday === 6
      ? "주말에는 정규 수업이 없습니다. 평일 시간표를 직접 입력해 둘 수 있어요."
      : todayCourses || (visible.length ? "오늘 등록한 수업이 없어요." : "시간표가 비어 있어요. 실제 시간표를 직접 입력해 주세요.");
    const subjectSelect = document.getElementById("postSubject");
    const subjects = [...new Set(visible.map(item => item.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ko"));
    const priorValue = subjectSelect.value;
    subjectSelect.innerHTML = `<option value="">과목 선택 안 함</option>${subjects.map(subject=>`<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("")}`;
    if (subjects.includes(priorValue)) subjectSelect.value = priorValue;
    updateAudienceControls();
    if (hasSeohyeonOfficialFeed && Date.now() - lastFamilyLetterAttemptAt >= SCHOOL_NOTICE_REFRESH_INTERVAL_MS) void loadSchoolFamilyLetters(true);
  }
  function showView(name) {
    ["search","timetable","register","detail","moderation"].forEach(view => document.getElementById(`${view}View`).classList.toggle("page-hidden", view !== name));
    document.querySelectorAll(".nav button[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === name));
    if (name === "search") renderPostList();
    if (name === "timetable") renderTimetable();
    if (name === "register") renderTimetable();
    if (name === "moderation" && !isModerator) { showToast("운영자 권한이 필요합니다."); showView("search"); return; }
    if (name === "moderation") renderReportQueue();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function showDetail(postId, allowImageRefresh = true) {
    const post = allFeedPosts().find(item => item.id === postId); if (!post) return;
    activePostId = postId;
    if (allowImageRefresh && currentUser && postImageObjectPath(post.image) && !getPostImageUrl(post.image)) {
      void refreshPostImageUrls().then(() => {
        if (activePostId === postId) showDetail(postId, false);
      });
      return;
    }
    const detail = document.getElementById("detailView");
    const dueDate = post.dueAt ? new Date(post.dueAt) : null;
    const related = allFeedPosts().filter(item => item.id !== post.id && (item.subject && item.subject === post.subject || item.category === post.category)).slice(0,3);
    detail.innerHTML = `<div class="detail-back"><button class="subtle-link" id="backToSearch">← 전체 소식으로 돌아가기</button><span>통합 검색　/　${escapeHtml(getCategoryLabel(post))}</span></div><div class="detail-layout"><article class="card article"><div><span class="tag">${escapeHtml(getCategoryLabel(post))}</span><span class="tag green">${escapeHtml(post.origin || "직접 등록")}</span><span class="tag gray">${escapeHtml(audienceLabel(post))}</span></div><h1>${escapeHtml(post.title)}</h1><div class="article-meta"><span class="avatar" style="display:inline-grid;vertical-align:middle;margin-right:6px">${escapeHtml((post.author||"학생").slice(0,1))}</span>${escapeHtml(post.author || "학생 등록")}　·　${escapeHtml(post.sourceName||"로컬 베타")}　·　${formatDate(post.createdAt,{time:true})}</div>${dueDate?`<div class="due-banner"><div><small style="color:var(--blue)">▦　보고서 제출 기한</small><b>${formatDate(post.dueAt,{time:true})}까지</b></div><span class="dday">${getDday(post.dueAt)}</span></div>`:""}${getPostImageUrl(post.image)?`<img class="hero-image" src="${escapeHtml(getPostImageUrl(post.image))}" alt="게시글 첨부 이미지">`:postImageObjectPath(post.image)&&!currentUser?`<span class="tag gray">로그인 후 첨부 이미지 확인</span>`:""}<div class="article-body">${escapeHtml(post.body)}</div>${post.attachments&&post.attachments.length?post.attachments.map(file=>`<div class="attachment"><span>▤　${escapeHtml(file)}</span><span style="color:var(--muted)">첨부 파일</span></div>`).join(""):""}<div class="detail-actions"><span>수업 관련 질문은 담당 선생님께 문의해 주세요.</span><button class="outline" id="restorePostButton" type="button">게시글 다시 공개</button><button class="outline" id="reportPostButton" type="button">⚑ 게시글 신고</button></div></article><aside class="right-stack">${post.subject?`<section class="card side-card"><h2>수행평가 한눈에 보기</h2><p>과목 <b style="float:right;color:var(--ink)">${escapeHtml(post.subject)}</b></p><p>대상 <b style="float:right;color:var(--ink)">${escapeHtml(post.audience||"전체")}</b></p><p>제출 방식 <b style="float:right;color:var(--ink)">${escapeHtml(post.sourceName||"게시글 확인")}</b></p><button class="outline" data-go="timetable">▦　내 수행평가 일정 보기</button></section>`:""}<section class="card side-card"><h2>원문 정보</h2><div class="source-row"><span class="source-dot">↗</span>${escapeHtml(post.sourceName||"학생 등록")}</div><p>이 정보는 ${escapeHtml(post.origin||"기기 내 등록")}된 내용입니다. 자세한 사항은 원문 또는 작성자에게 확인해 주세요.</p>${getSafeUrl(post.sourceUrl)?`<a class="primary" style="display:inline-block;margin:3px 0" href="${escapeHtml(getSafeUrl(post.sourceUrl))}" target="_blank" rel="noreferrer">↗ 원문 보기</a>`:`<span class="tag orange">로컬 베타 게시글</span>`}<p>등록 일시 ${formatDate(post.createdAt,{time:true})}</p></section><section class="card side-card blue-panel"><span style="font-size:17px;color:var(--blue)">◷</span><h2 style="margin-top:8px">정보가 달라졌나요?</h2><p>잘못된 일정이나 내용을 발견하면 작성자에게 알려 주세요.</p></section>${related.length?`<section class="card side-card"><h2>함께 보면 좋은 정보</h2>${related.map(item=>`<div class="upcoming-item" data-post-id="${escapeHtml(item.id)}"><button class="subtle-link" data-open-related="${escapeHtml(item.id)}">${escapeHtml(item.title)}　›</button></div>`).join("")}</section>`:""}</aside></div>`;
    detail.querySelector("#backToSearch").addEventListener("click", () => showView("search"));
    if (!post.persisted) detail.querySelector("#reportPostButton").classList.add("page-hidden");
    if (!isModerator || post.moderation_status !== "hidden") detail.querySelector("#restorePostButton").classList.add("page-hidden");
    detail.querySelector("#restorePostButton").addEventListener("click", () => restorePost(post.id));
    detail.querySelector("#reportPostButton").addEventListener("click", () => openReportDialog(post.id));
    detail.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click",()=>showView(button.dataset.go)));
    detail.querySelectorAll("[data-open-related]").forEach(button=>button.addEventListener("click",()=>showDetail(button.dataset.openRelated)));
    showView("detail");
  }
  function resetSearch() { document.getElementById("searchInput").value="";selectedCategory="전체";document.querySelectorAll("#categoryRow .chip").forEach(button=>button.classList.toggle("active",button.dataset.category==="전체"));renderPostList(); }
  function showToast(message, duration = 2600) { const toast=document.getElementById("toast");toast.textContent=message;toast.classList.remove("page-hidden");window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>toast.classList.add("page-hidden"),duration); }
  function describePostSubmissionError(error, stage, audienceType) {
    const code = String(error?.code || "");
    const message = String(error?.message || "");
    const normalized = message.toLowerCase();
    if (stage === "image") {
      return "이미지 저장 권한이 없거나 post-images 저장소가 설정되지 않았어요. 이미지 없이 등록하거나 Supabase 설정 SQL을 다시 실행해 주세요.";
    }
    if (["42P01", "42703", "PGRST204", "PGRST205"].includes(code) || /schema cache|column .* does not exist|relation .* does not exist/.test(normalized)) {
      return "게시글 공개 범위 DB 설정이 빠져 있어요. Supabase SQL Editor에서 최신 supabase-setup.sql을 실행해 주세요.";
    }
    if (code === "42501" || /row-level security|permission denied|violates.*policy/.test(normalized)) {
      return audienceType === "school"
        ? "학교 전체 게시글 등록 정책이 거부했어요. Supabase SQL Editor에서 최신 supabase-setup.sql을 다시 실행해 주세요."
        : "선택한 공개 대상의 등록 권한이 거부됐어요. 내 학년·반 또는 시간표를 계정에 저장한 뒤 다시 시도해 주세요. 계속되면 최신 supabase-setup.sql을 실행해 주세요.";
    }
    if (code === "23505") return "같은 게시글 ID가 이미 등록되어 있어요. 다시 한 번 등록해 주세요.";
    if (code === "22P02") return "게시글 ID 형식이 DB와 맞지 않아요. supabase-setup.sql의 posts.id가 text 형식인지 확인해 주세요.";
    if (/failed to fetch|network|timeout/.test(normalized)) return "Supabase에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.";
    const detail = message.trim().replace(/\s+/g, " ").slice(0, 100);
    return `등록 요청이 실패했어요${code ? ` (${code})` : ""}${detail ? `: ${detail}` : "."}`;
  }
  async function addCourse() {
    if (!currentUser) { showToast("시간표를 계정에 저장하려면 로그인해 주세요."); openAuthDialog(); return; }
    const input=document.getElementById("courseInput");
    let subject=input.value.trim();
    const code=document.getElementById("courseCodeInput").value;
    const day=Number(document.getElementById("dayInput").value);
    const period=Number(document.getElementById("periodInput").value);
    if(code&&!subject)subject=timetable.find(item=>item.code===code&&item.subject)?.subject||"";
    if(!subject&&!code){showToast("과목 이름을 입력하거나 선택과목 코드를 지정해 주세요.");input.focus();return;}
    const isEditingSelectedSlot = selectedSlot?.day === day && selectedSlot?.period === period;
    if (code) {
      const existing=timetable.find(item=>item.day===day&&item.period===period);
      if(existing&&!isEditingSelectedSlot){showToast(`${DAYS[day]}요일 ${period}교시에 내 선택과목이 이미 있어요.`);return;}
      const updatedItem={day,period,subject,code};
      if(existing)Object.assign(existing,updatedItem);else timetable.push(updatedItem);
      const matchingCodeSlots = timetable.filter(item=>item.code===code).length;
      timetable.forEach(item=>{if(item.code===code)item.subject=subject;});
      if(!saveValue(timetableStorageKey(currentUser.id),timetable))return;
      clearCourseEditor();
      renderTimetable();renderUpcoming();
      syncUserData().then(loadCloudPosts).then(()=>showToast(matchingCodeSlots>1?`${code} 코드는 내 시간표의 ${matchingCodeSlots}개 칸에 적용했어요.`:"선택과목을 내 계정에 저장했어요.")).catch(()=>showToast("선택과목을 계정에 저장하지 못했습니다."));
      return;
    }
    if (!classTimetableIdentity()) { showToast("흰칸을 반과 공유하려면 학교·학년·반을 먼저 설정해 주세요."); openProfileEditor(); return; }
    if (!classTimetableReady) { showToast("반별 시간표 공유 설정이 필요해요. 최신 supabase-setup.sql을 Supabase SQL Editor에서 실행해 주세요."); return; }
    const personalExisting=timetable.find(item=>item.day===day&&item.period===period);
    const sharedExisting=classTimetable.find(item=>item.day===day&&item.period===period);
    if((personalExisting||sharedExisting)&&!isEditingSelectedSlot){const existing=personalExisting||sharedExisting;showToast(`${DAYS[day]}요일 ${period}교시에 ${existing.subject||`코드 ${existing.code}`}이(가) 이미 있어요.`);return;}
    const nextClassTimetable=normalizeClassTimetable(classTimetable.filter(item=>item.day!==day||item.period!==period).concat({day,period,subject}));
    try {
      await persistClassTimetable(nextClassTimetable);
      if(personalExisting){
        timetable=timetable.filter(item=>item.day!==day||item.period!==period);
        if(!saveValue(timetableStorageKey(currentUser.id),timetable))return;
        await syncUserData();
      }
      clearCourseEditor();
      renderTimetable();renderUpcoming();
      await loadCloudPosts();
      showToast("흰칸 수업을 같은 반 시간표에 공유했어요.");
    } catch (error) {
      showToast(describeClassTimetableError(error));
    }
  }
  function clearCourseEditor() {
    document.getElementById("courseInput").value="";
    document.getElementById("courseCodeInput").value="";
    selectedSlot=null;
    document.getElementById("addCourseButton").textContent="과목 추가";
    document.getElementById("deleteCourseButton").classList.add("page-hidden");
  }
  function describeClassTimetableError(error) {
    const code=String(error?.code||"");
    const message=String(error?.message||"").toLowerCase();
    if (["42P01","PGRST205","PGRST204"].includes(code)||/class_timetable_slots|schema cache|does not exist/.test(message)) return "반별 시간표 테이블이 아직 없어요. 최신 supabase-setup.sql을 Supabase SQL Editor에서 실행해 주세요.";
    if (code==="42501"||/row-level security|permission denied|policy/.test(message)) return "학급 시간표 공유 권한이 없어요. 최신 supabase-setup.sql을 다시 적용하고 학교·학년·반 설정을 확인해 주세요.";
    return "반별 시간표를 저장하지 못했어요. 인터넷 연결과 Supabase 설정을 확인해 주세요.";
  }
  async function deleteSelectedCourse() {
    if (!currentUser) { showToast("시간표를 계정에 저장하려면 로그인해 주세요."); openAuthDialog(); return; }
    if(!selectedSlot)return;
    const {day,period}=selectedSlot;
    const personalExisting=timetable.find(item=>item.day===day&&item.period===period);
    if(personalExisting){
      timetable=timetable.filter(item=>item.day!==day||item.period!==period);
      if(!saveValue(timetableStorageKey(currentUser.id),timetable))return;
      clearCourseEditor();renderTimetable();renderUpcoming();
      syncUserData().then(loadCloudPosts).then(()=>showToast("내 계정의 선택과목을 삭제했어요.")).catch(()=>showToast("시간표 변경을 클라우드에 저장하지 못했습니다."));
      return;
    }
    if(!classTimetableReady){showToast("반별 시간표 공유 설정을 확인한 뒤 다시 시도해 주세요.");return;}
    try {
      await persistClassTimetable(classTimetable.filter(item=>item.day!==day||item.period!==period));
      clearCourseEditor();renderTimetable();renderUpcoming();
      await loadCloudPosts();
      showToast("같은 반 시간표에서 공통 수업을 삭제했어요.");
    } catch(error) { showToast(describeClassTimetableError(error)); }
  }
  function openProfileEditor() {
    if (!currentUser) { showToast("로그인한 뒤 학교·학급을 계정에 저장할 수 있어요."); openAuthDialog(); return; }
    document.getElementById("modalRoot").innerHTML=`<div class="modal-backdrop" id="modalBackdrop"><section class="modal"><h2>학교·학급 설정</h2><p>입력한 정보와 시간표는 이 계정에 저장되어 다른 기기에서도 사용할 수 있어요.</p><div class="field" style="margin:12px 0"><label for="editName">이름 *</label><input id="editName" value="${escapeHtml(profile.name)}" maxlength="20" autocomplete="name" required></div><div class="field" style="margin:0 0 12px"><label for="editSchool">학교명 *</label><input id="editSchool" value="${escapeHtml(profile.schoolName)}" maxlength="60" autocomplete="organization" placeholder="예: 서현고등학교" required></div><div class="form-grid" style="grid-template-columns:1fr 1fr;margin:0 0 12px"><div class="field"><label for="editGrade">학년 *</label><select id="editGrade"><option value="">선택</option>${[1,2,3].map(grade=>`<option value="${grade}학년" ${profile.grade===`${grade}학년`?"selected":""}>${grade}학년</option>`).join("")}</select></div><div class="field"><label for="editClass">반 *</label><input id="editClass" type="number" min="1" max="99" value="${escapeHtml(profile.className.replace(/반$/, ""))}" inputmode="numeric" placeholder="예: 3" required></div></div><div class="field" style="margin:0 0 10px"><label for="editStudentId">학번 <em>선택</em></label><input id="editStudentId" value="${escapeHtml(profile.studentId)}" maxlength="20" inputmode="numeric" autocomplete="off" placeholder="예: 2307"></div><p class="profile-privacy-note">같은 학교 친구와 공개 게시글을 주고받으려면 학교명을 똑같이 입력하세요. 학교·학급은 직접 입력한 정보로 재학 인증은 아닙니다. 학번은 본인 계정에만 저장되고 게시글에는 표시되지 않아요. 공식 공지·학사일정 연동은 현재 서현고 전용입니다.</p><div class="modal-actions"><button class="outline" id="cancelProfile" type="button">취소</button><button class="primary" id="saveProfile" type="button">저장</button></div></section></div>`;
    document.getElementById("cancelProfile").addEventListener("click",()=>document.getElementById("modalRoot").innerHTML="");
    document.getElementById("modalBackdrop").addEventListener("click",event=>{if(event.target.id==="modalBackdrop")document.getElementById("modalRoot").innerHTML="";});
    document.getElementById("saveProfile").addEventListener("click",async()=>{
      const name=document.getElementById("editName").value.trim();
      const studentId=document.getElementById("editStudentId").value.trim();
      const schoolName=document.getElementById("editSchool").value.trim();
      const grade=document.getElementById("editGrade").value;
      const classValue=document.getElementById("editClass").value.trim();
      if(!name||!schoolName||!grade||!classValue){showToast("이름, 학교, 학년, 반을 모두 입력해 주세요.");return;}
      if(name.length>20||schoolName.length>60){showToast("이름은 20자, 학교명은 60자 이내로 입력해 주세요.");return;}
      if(!/^[0-9]{1,2}$/.test(classValue)||Number(classValue)<1||Number(classValue)>99){showToast("반은 1부터 99 사이의 숫자로 입력해 주세요.");return;}
      if(studentId.length>20){showToast("학번은 20자 이내로 입력해 주세요.");return;}
      const saveButton=document.getElementById("saveProfile");
      saveButton.disabled=true;saveButton.textContent="저장 중…";
      const nextProfile=normalizeProfile({name,studentId,schoolName,grade,className:`${classValue}반`});
      try {
        const {error}=await supabaseClient.from("profiles").upsert({user_id:currentUser.id,profile:nextProfile},{onConflict:"user_id"});
        if(error)throw error;
        profile=nextProfile;
        await loadClassTimetable({migratePersonal:false});
        const localSaved=saveValue(profileStorageKey(currentUser.id),profile);
        document.getElementById("modalRoot").innerHTML="";
        renderTimetable();
        await loadCloudPosts();
        showToast(localSaved?"학교·학급 설정을 계정에 저장했어요.":"계정에는 저장했지만 이 기기 저장에 실패했어요.");
      } catch(error) {
        saveButton.disabled=false;saveButton.textContent="저장";
        showToast("학교·학급 설정을 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
      }
    });
  }
  async function readImages(files) {
    const selected=[...files];
    if(selected.length+attachedImages.length>1){showToast("이미지는 1장까지 첨부할 수 있어요.");return;}
    for(const file of selected){
      if(!["image/jpeg","image/png","image/webp"].includes(file.type)){showToast("JPG, PNG, WebP 이미지 파일만 첨부할 수 있어요.");continue;}
      if(file.size>512000){showToast("이미지 파일은 500KB 이하로 선택해 주세요.");continue;}
      attachedImages.push(file);
    }
    renderFileList();document.getElementById("imageInput").value="";
  }
  function renderFileList() {
    const list=document.getElementById("fileList");
    list.innerHTML=attachedImages.map((file,index)=>`<span class="file-pill">▧ ${escapeHtml(file.name)} <button type="button" data-remove-image="${index}" aria-label="이미지 삭제" style="border:0;background:none;color:#78869b">×</button></span>`).join("");
    list.querySelectorAll("[data-remove-image]").forEach(button=>button.addEventListener("click",()=>{attachedImages.splice(Number(button.dataset.removeImage),1);renderFileList();}));
  }
  function resetForm() { document.getElementById("postForm").reset();attachedImages=[];renderFileList();updateAudienceControls(); }
  function makePostImagePath(postId, contentType) {
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
    return currentUser.id + "/" + postId + "/image-" + uniqueId + "." + extension;
  }
  async function uploadPostImage(file, postId) {
    if (!currentUser) throw new Error("로그인이 필요합니다.");
    const path = makePostImagePath(postId, file.type);
    const result = await supabaseClient.storage.from("post-images").upload(path, file, {contentType:file.type, upsert:false});
    if (result.error) throw result.error;
    return path;
  }
  async function submitPost(event) {
    event.preventDefault();
    if (!currentUser) {
      showToast("게시글을 등록하려면 먼저 로그인해 주세요.");
      openAuthDialog();
      return;
    }
    const title = document.getElementById("postTitle").value.trim();
    const body = document.getElementById("postBody").value.trim();
    const audienceType = document.getElementById("postAudience").value;
    const label = document.getElementById("postCategory").value;
    const subject = document.getElementById("postSubject").value;
    const dueInput = document.getElementById("postDue").value;
    if (!title || !body) {
      showToast("제목과 내용을 모두 입력해 주세요.");
      return;
    }
    if (audienceType === "class" && (!profile.schoolName || !profile.grade || !profile.className)) {
      showToast("학급 공개를 위해 먼저 학교·학급 설정을 완료해 주세요.");
      openProfileEditor();
      return;
    }
    if (audienceType === "subject" && !subject) {
      showToast("과목 공개를 선택하려면 과목을 먼저 지정해 주세요.");
      document.getElementById("postSubject").focus();
      return;
    }
    const category = label === "학교 공지" ? "official" : label === "수행평가" ? "assessment" : label === "가정통신문" ? "family" : "event";
    const audience = audienceType === "school"
      ? `${profile.schoolName} 전체`
      : audienceType === "class"
        ? profile.grade + " " + profile.className
        : "내가 선택한 과목";
    const id = "post-" + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2));
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "등록 중…";
    let failureStage = attachedImages.length ? "image" : "database";
    try {
      const image = attachedImages[0] ? await uploadPostImage(attachedImages[0], id) : "";
      failureStage = "database";
      const newPost = {
        id, category, categoryLabel:label, title, body, author:profile.name,
        createdAt:new Date().toISOString(), subject, audience, schoolName:profile.schoolName,
        audience_type:audienceType,
        target_school:profile.schoolName,
        target_grade:audienceType === "class" ? profile.grade : null,
        target_class:audienceType === "class" ? profile.className : null,
        target_subject:audienceType === "subject" ? subject : null,
        moderation_status:"published",
        dueAt:dueInput ? new Date(dueInput).toISOString() : "",
        sourceName:"학생 등록", sourceUrl:"", origin:"직접 등록", image,
        attachments:[]
      };
      const result = await supabaseClient.from("posts").insert({
        id,
        user_id:currentUser.id,
        post:newPost,
        ...postAudienceColumns(newPost)
      });
      if (result.error) throw result.error;
      newPost.persisted = true;
      posts.unshift(newPost);
      await refreshPostImageUrls();
      savePublicPostCache();
      resetForm();
      renderUpcoming();
      renderPostList();
      showView("search");
      showToast("게시글을 공개 범위에 맞춰 등록했어요.");
    } catch (error) {
      console.error("[SIFS] 게시글 등록 실패", {
        stage:failureStage,
        code:error?.code || "",
        message:error?.message || String(error),
        details:error?.details || "",
        hint:error?.hint || "",
        status:error?.status || error?.statusCode || ""
      });
      showToast(describePostSubmissionError(error, failureStage, audienceType), 9000);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "✓ 정보 등록하기";
    }
  }
  function exportBackup() {
    const identity=classTimetableIdentity();
    const sharedItems=identity?normalizeClassTimetable([...classTimetable,...timetable.filter(item=>!item.code)]):[];
    const personalItems=identity?timetable.filter(item=>item.code):timetable;
    const payload = {
      app: "SIFS",
      version: 3,
      exportedAt: new Date().toISOString(),
      posts,
      timetable:personalItems,
      classTimetable:sharedItems,
      profile
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0,10);
    link.href = url;
    link.download = "sifs-backup-" + date + ".json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("게시글, 시간표, 프로필을 백업했어요.");
  }
  function normalizeImportedPosts(incoming) {
    if (!Array.isArray(incoming) || !incoming.every(item => item && typeof item === "object" && !Array.isArray(item) && typeof item.title === "string" && typeof item.body === "string")) {
      throw new Error("게시글 데이터 형식이 올바르지 않습니다.");
    }
    const importedAt = new Date().toISOString();
    return incoming.map((item, index) => ({
      ...item,
      id: typeof item.id === "string" && item.id ? item.id : "import-" + Date.now() + "-" + index,
      createdAt: typeof item.createdAt === "string" && !Number.isNaN(new Date(item.createdAt).getTime()) ? item.createdAt : importedAt,
      origin: typeof item.origin === "string" && item.origin ? item.origin : "가져오기"
    })).filter(item => !RETIRED_DEMO_POST_IDS.has(item.id));
  }
  function validateBackup(data) {
    if (!data || data.app !== "SIFS" || ![2,3].includes(data.version)) throw new Error("지원하지 않는 전체 백업 형식입니다.");
    const importedPosts = normalizeImportedPosts(data.posts);
    if (!Array.isArray(data.timetable)) throw new Error("시간표 데이터 형식이 올바르지 않습니다.");
    const slots = new Set();
    const importedTimetable = data.timetable.map(item => {
      const code = typeof item?.code === "string" && /^[A-Z]$/i.test(item.code.trim()) ? item.code.trim().toUpperCase() : "";
      if (!item || !Number.isInteger(item.day) || item.day < 1 || item.day > 5 || !Number.isInteger(item.period) || item.period < 1 || item.period > 7 || typeof item.subject !== "string" || (!item.subject.trim() && !code) || (item.code && !code)) {
        throw new Error("시간표 데이터 형식이 올바르지 않습니다.");
      }
      const slot = item.day + "-" + item.period;
      if (slots.has(slot)) throw new Error("시간표에 중복된 교시가 있습니다.");
      slots.add(slot);
      return {day:item.day, period:item.period, subject:item.subject.trim(), ...(code?{code}:{})};
    });
    const importedClassTimetable=[];
    if(data.version===3){
      if(!Array.isArray(data.classTimetable))throw new Error("학급 시간표 데이터 형식이 올바르지 않습니다.");
      const classSlots=new Set();
      data.classTimetable.forEach(item=>{
        if(!item||!Number.isInteger(item.day)||item.day<1||item.day>5||!Number.isInteger(item.period)||item.period<1||item.period>7||typeof item.subject!=="string"||!item.subject.trim()||item.code){throw new Error("공유 시간표 데이터 형식이 올바르지 않습니다.");}
        const slot=`${item.day}-${item.period}`;
        if(classSlots.has(slot))throw new Error("공유 시간표에 중복된 교시가 있습니다.");
        classSlots.add(slot);
        importedClassTimetable.push({day:item.day,period:item.period,subject:item.subject.trim()});
      });
    }
    const importedProfile = data.profile;
    if (!importedProfile || typeof importedProfile.name !== "string" || !importedProfile.name.trim() || (importedProfile.schoolName !== undefined && typeof importedProfile.schoolName !== "string") || (importedProfile.grade !== undefined && typeof importedProfile.grade !== "string") || (importedProfile.className !== undefined && typeof importedProfile.className !== "string") || (importedProfile.studentId !== undefined && typeof importedProfile.studentId !== "string")) {
      throw new Error("프로필 데이터 형식이 올바르지 않습니다.");
    }
    const importedStudentId = typeof importedProfile.studentId === "string" ? importedProfile.studentId.trim() : "";
    if (importedStudentId.length > 20) throw new Error("학번은 20자 이내여야 합니다.");
    const schoolName = typeof importedProfile.schoolName === "string" && importedProfile.schoolName.trim() ? importedProfile.schoolName.trim() : DEFAULT_SCHOOL_NAME;
    const grade = typeof importedProfile.grade === "string" ? importedProfile.grade.trim() : "";
    const className = typeof importedProfile.className === "string" ? importedProfile.className.trim() : "";
    if (schoolName.length > 60 || (grade && !["1학년","2학년","3학년"].includes(grade)) || (className && !/^\d{1,2}반$/.test(className))) {
      throw new Error("학교·학급 프로필 데이터가 올바르지 않습니다.");
    }
    const importedProfileValue={
      name: importedProfile.name.trim(),
      studentId: importedStudentId,
      schoolName,
      grade,
      className
    };
    const hasClass=!!classTimetableIdentity(importedProfileValue);
    const normalizedImportedTimetable=normalizeTimetable(importedTimetable);
    const classItems=hasClass
      ? normalizeClassTimetable([...importedClassTimetable,...normalizedImportedTimetable.filter(item=>!item.code)])
      : [];
    return {
      posts: importedPosts,
      timetable: hasClass?normalizedImportedTimetable.filter(item=>item.code):normalizedImportedTimetable,
      classTimetable:classItems,
      profile: importedProfileValue
    };
  }
  function saveFullBackup(backup) {
    const savedProfileKey = profileStorageKey(currentUser?.id || "");
    const savedTimetableKey = timetableStorageKey(currentUser?.id || "");
    const identity=classTimetableIdentity(backup.profile);
    const savedClassTimetableKey=classTimetableStorageKey(identity);
    const savedPublicPosts = backup.posts.filter(post => isSchoolPost(post) && audienceForPost(post).schoolName === backup.profile.schoolName && !RETIRED_DEMO_POST_IDS.has(post.id));
    const values = {
      [STORAGE_KEYS.posts]: savedPublicPosts,
      [savedTimetableKey]: backup.timetable,
      [savedProfileKey]: backup.profile,
      ...(identity?{[savedClassTimetableKey]:backup.classTimetable,[classTimetableKnownCloudKey(identity)]:false}:{})
    };
    const previous = Object.keys(values).map(key => [key, localStorage.getItem(key)]);
    try {
      [savedTimetableKey, savedProfileKey, STORAGE_KEYS.posts, ...(identity?[savedClassTimetableKey,classTimetableKnownCloudKey(identity)]:[])].forEach(key => {
        localStorage.setItem(key, JSON.stringify(values[key]));
      });
    } catch (error) {
      previous.forEach(([key, value]) => {
        try {
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        } catch (rollbackError) {}
      });
      showToast("저장 공간이 부족해 복원하지 못했습니다. 기존 데이터는 유지됩니다.");
      return false;
    }
    posts = savedPublicPosts;
    timetable = backup.timetable;
    profile = backup.profile;
    classTimetable=identity?backup.classTimetable:[];
    classTimetableReady=false;
    renderTimetable();
    renderUpcoming();
    renderPostList();
    showToast("게시글, 시간표, 프로필을 복원했어요.");
    if (currentUser) (async()=>{
      await syncUserData();
      if(identity){await persistClassTimetable(classTimetable);subscribeToClassTimetable(identity);}
      await publishLocalPosts();
      await loadCloudPosts();
    })().catch(() => showToast("백업은 이 기기에 복원했지만 클라우드 동기화에 실패했습니다."));
    return true;
  }
  async function importBackup(file) {
    try {
      const data = JSON.parse(await file.text());
      const isFullBackup = !Array.isArray(data) && data && data.app === "SIFS" && [2,3].includes(data.version);
      if (isFullBackup) {
        const backup = validateBackup(data);
        const confirmed = window.confirm(
          "전체 백업을 복원할까요?\n게시글 " + backup.posts.length + "개, 내 선택과목 " + backup.timetable.length + "개, 반 공유 수업 " + backup.classTimetable.length + "개, 프로필 1개가 적용됩니다.\n현재 이 기기의 게시글, 시간표, 프로필은 백업 내용으로 교체됩니다."
        );
        if (confirmed) saveFullBackup(backup);
        return;
      }
      if (!Array.isArray(data) && data && Number.isInteger(data.version) && data.version > 1) {
        throw new Error("지원하지 않는 백업 버전입니다.");
      }
      const incoming = Array.isArray(data) ? data : data && data.posts;
      const valid = normalizeImportedPosts(incoming);
      const existing = new Set(posts.map(item => item.id));
      const additions = [];
      valid.forEach(item => {
        if (!existing.has(item.id)) {
          existing.add(item.id);
          additions.push(item);
        }
      });
      if (!additions.length) {
        showToast("가져올 새 게시글이 없습니다.");
        return;
      }
      const previousPosts = posts;
      posts = [...additions, ...posts];
      if (savePublicPostCache()) {
        renderPostList();
        renderUpcoming();
        showToast("게시글 " + additions.length + "개를 가져왔어요. 시간표와 프로필은 유지했습니다.");
        if (currentUser) publishLocalPosts().then(loadCloudPosts).catch(() => showToast("게시글 일부를 클라우드에 올리지 못했습니다."));
      } else {
        posts = previousPosts;
      }
    } catch (error) {
      showToast("가져올 수 없는 백업 파일입니다. JSON 형식과 파일 내용을 확인해 주세요.");
    }
  }
  async function restorePost(postId) {
    const result = await supabaseClient.rpc("sifs_set_post_moderation_status", {
      p_post_id: postId,
      p_status: "published"
    });
    if (result.error) {
      showToast("게시글을 다시 공개하지 못했습니다.");
      return;
    }
    await loadCloudPosts();
    const restored = posts.find(post => post.id === postId);
    if (restored) showDetail(postId);
    showToast("게시글을 다시 공개했어요.");
  }
  function openReportDialog(postId) {
    if (!currentUser) {
      showToast("게시글 신고는 로그인 후 이용할 수 있어요.");
      openAuthDialog();
      return;
    }
    const post = posts.find(item => item.id === postId);
    if (!post) return;
    const modalRoot = document.getElementById("modalRoot");
    modalRoot.innerHTML = '<div class="modal-backdrop" id="reportBackdrop"><section class="modal"><h2>게시글 신고</h2><p><b>' + escapeHtml(post.title) + '</b><br>신고는 Supabase에 저장되며 지정 운영자 계정의 신고 관리 화면에서만 확인합니다. 이메일 알림은 보내지 않습니다.</p><form id="reportForm"><div class="field"><label for="reportReason">신고 사유</label><select id="reportReason"><option>잘못된 정보</option><option>스팸/광고</option><option>개인정보 노출</option><option>부적절한 내용</option><option>기타</option></select></div><div class="field" style="margin-top:10px"><label for="reportDetails">추가 설명 <em>선택</em></label><textarea id="reportDetails" maxlength="500" rows="4" placeholder="확인이 필요한 내용을 적어 주세요."></textarea></div><div class="modal-actions"><button class="outline" id="cancelReport" type="button">취소</button><button class="primary" type="submit">신고 제출</button></div></form></section></div>';
    document.getElementById("cancelReport").addEventListener("click", () => { modalRoot.innerHTML = ""; });
    document.getElementById("reportBackdrop").addEventListener("click", event => {
      if (event.target.id === "reportBackdrop") modalRoot.innerHTML = "";
    });
    document.getElementById("reportForm").addEventListener("submit", async event => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = "제출 중…";
      const result = await supabaseClient.from("reports").insert({
        post_id: postId,
        reporter_id: currentUser.id,
        reason: document.getElementById("reportReason").value,
        details: document.getElementById("reportDetails").value.trim()
      });
      if (result.error) {
        button.disabled = false;
        button.textContent = "신고 제출";
        showToast(result.error.code === "23505" ? "이 게시글은 이미 신고했어요." : "신고를 제출하지 못했습니다. Supabase 설정을 확인해 주세요.");
        return;
      }
      modalRoot.innerHTML = "";
      showToast("신고가 접수됐어요. 지정 운영자 계정의 신고 관리 화면에서 확인할 수 있어요.");
    });
  }
  async function renderReportQueue() {
    const queue = document.getElementById("reportQueue");
    if (!isModerator || !currentUser) {
      queue.innerHTML = '<div class="empty-state"><strong>운영자 권한이 필요합니다.</strong></div>';
      return;
    }
    queue.innerHTML = '<div class="empty-state">신고 목록을 불러오는 중…</div>';
    const result = await supabaseClient.from("reports")
      .select("id,post_id,reporter_id,reason,details,status,created_at")
      .eq("status", "open")
      .order("created_at", {ascending:true});
    if (result.error) {
      queue.innerHTML = '<div class="empty-state"><strong>신고 목록을 불러오지 못했어요.</strong><span>Supabase SQL 설정을 확인해 주세요.</span></div>';
      return;
    }
    const reports = result.data || [];
    if (!reports.length) {
      queue.innerHTML = '<div class="empty-state"><strong>확인할 신고가 없습니다.</strong><span>새 신고가 들어오면 여기에 표시됩니다.</span></div>';
      return;
    }
    const ids = [...new Set(reports.map(report => report.post_id))];
    const postResult = await supabaseClient.from("posts")
      .select("id,post,audience_type,target_school,target_grade,target_class,target_subject,moderation_status")
      .in("id", ids);
    if (postResult.error) {
      queue.innerHTML = '<div class="empty-state"><strong>신고 대상 게시글을 불러오지 못했어요.</strong></div>';
      return;
    }
    const postMap = new Map((postResult.data || []).map(row => [row.id, postFromRow(row)]));
    queue.innerHTML = reports.map(report => {
      const post = postMap.get(report.post_id);
      return '<article class="report-row"><div class="report-row-head"><span class="tag orange">' + escapeHtml(report.reason) + '</span><small>' + formatDate(report.created_at,{time:true}) + '</small></div><h3>' + escapeHtml(post?.title || "게시글을 찾을 수 없습니다.") + '</h3><p>' + escapeHtml(report.details || "추가 설명 없음") + '</p><small>신고자 ' + escapeHtml(report.reporter_id.slice(0,8)) + ' · 공개 범위 ' + escapeHtml(post ? audienceLabel(post) : "확인 불가") + '</small><div class="report-actions"><button class="outline" data-report-action="resolve" data-report-id="' + escapeHtml(report.id) + '" data-post-id="' + escapeHtml(report.post_id) + '">게시글 유지 · 처리 완료</button><button class="outline" data-report-action="dismiss" data-report-id="' + escapeHtml(report.id) + '" data-post-id="' + escapeHtml(report.post_id) + '">신고 기각</button><button class="primary" data-report-action="hide" data-report-id="' + escapeHtml(report.id) + '" data-post-id="' + escapeHtml(report.post_id) + '">게시글 숨기고 처리</button></div></article>';
    }).join("");
    queue.querySelectorAll("[data-report-action]").forEach(button => {
      button.addEventListener("click", () => handleReportAction(button));
    });
  }
  async function handleReportAction(button) {
    const action = button.dataset.reportAction;
    const status = action === "dismiss" ? "dismissed" : "resolved";
    button.disabled = true;
    if (action === "hide") {
      const hidden = await supabaseClient.rpc("sifs_set_post_moderation_status", {
        p_post_id: button.dataset.postId,
        p_status: "hidden"
      });
      if (hidden.error) {
        button.disabled = false;
        showToast("게시글을 숨기지 못했습니다. 운영자 설정을 확인해 주세요.");
        return;
      }
    }
    const updated = await supabaseClient.from("reports").update({
      status,
      reviewer_id: currentUser.id,
      reviewed_at: new Date().toISOString()
    }).eq("id", button.dataset.reportId);
    if (updated.error) {
      button.disabled = false;
      showToast("신고 상태를 저장하지 못했습니다.");
      return;
    }
    await loadCloudPosts();
    await renderReportQueue();
    showToast(action === "hide" ? "게시글을 숨기고 신고를 처리했어요." : status === "dismissed" ? "신고를 기각했어요." : "신고를 처리했어요.");
  }
  function handleNavigation(event) {
    const viewButton=event.target.closest("[data-view]");const goButton=event.target.closest("[data-go]");
    if(viewButton)showView(viewButton.dataset.view);else if(goButton)showView(goButton.dataset.go);
  }
  function mergePostLists(...lists) {
    const byId = new Map();
    lists.flat().forEach(post => { if (post && post.id) byId.set(post.id, post); });
    return [...byId.values()];
  }
  function setSchoolNoticeStatus(message, error = false) {
    const status = document.getElementById("schoolNoticeStatus");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("error", error);
  }
  function startSchoolNoticeRefresh() {
    if (schoolNoticeRefreshTimer) window.clearInterval(schoolNoticeRefreshTimer);
    schoolNoticeRefreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadSchoolNotices(true);
        void loadSchoolFamilyLetters(true);
        void loadSchoolInformation(true);
      }
    }, SCHOOL_NOTICE_REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      void refreshPostImageUrls().then(() => {
        if (!document.getElementById("searchView").classList.contains("page-hidden")) renderPostList();
        if (!document.getElementById("detailView").classList.contains("page-hidden") && activePostId) showDetail(activePostId);
      });
      if (Date.now() - lastSchoolNoticeAttemptAt >= SCHOOL_NOTICE_REFRESH_INTERVAL_MS) void loadSchoolNotices(true);
      if (Date.now() - lastFamilyLetterAttemptAt >= SCHOOL_NOTICE_REFRESH_INTERVAL_MS) void loadSchoolFamilyLetters(true);
      if (Date.now() - lastSchoolInformationAttemptAt >= SCHOOL_NOTICE_REFRESH_INTERVAL_MS) void loadSchoolInformation(true);
    });
  }
  function schoolDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }
  function schoolDateLabel(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "" : formatDate(date);
  }
  function renderOfficialSchoolSchedule() {
    const list = document.getElementById("schoolScheduleList");
    if (!list) return;
    const today = schoolDateKey();
    const upcoming = schoolScheduleEvents
      .filter(event => event?.startDate && event?.endDate >= today && !/토요휴업일/.test(event.title || ""))
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title))
      .slice(0, 5);
    list.innerHTML = upcoming.length ? upcoming.map(event => {
      const inProgress = event.startDate <= today && event.endDate >= today;
      const dateLabel = event.startDate === event.endDate
        ? schoolDateLabel(event.startDate)
        : `${schoolDateLabel(event.startDate)} ~ ${schoolDateLabel(event.endDate)}`;
      return `<div class="school-data-item"><span class="school-data-dday">${inProgress ? "진행 중" : getDday(`${event.startDate}T00:00:00`)}</span><div><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(dateLabel)}</small></div></div>`;
    }).join("") : `<div class="empty-state" style="padding:14px 4px">예정된 학사일정이 없어요.</div>`;
  }
  function renderSchoolMeals() {
    const list = document.getElementById("schoolMealList");
    if (!list) return;
    const today = schoolDateKey();
    const day = schoolMealDays.find(item => item.date === today);
    const meals = (day?.meals || []).filter(meal => Array.isArray(meal.items) && meal.items.length);
    if (!day) {
      list.innerHTML = `<div class="empty-state" style="padding:14px 4px">오늘 급식 정보를 불러오지 못했어요.</div>`;
      return;
    }
    if (!meals.length) {
      list.innerHTML = `<div class="empty-state" style="padding:14px 4px">오늘 등록된 급식이 없어요.</div>`;
      return;
    }
    list.innerHTML = meals.map(meal => `<section class="school-meal-group"><div class="school-meal-heading"><strong>${escapeHtml(meal.type)}</strong>${meal.calories ? `<small>${escapeHtml(meal.calories)}</small>` : ""}</div><ul>${meal.items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>${meal.allergenCodes?.length ? `<small class="school-meal-allergens">알레르기 번호 ${escapeHtml(meal.allergenCodes.join(", "))}</small>` : ""}</section>`).join("");
  }
  function setSchoolInformationStatus(id, message, error = false) {
    const status = document.getElementById(id);
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("error", error);
  }
  async function loadSchoolInformation(quiet = false) {
    const button = document.getElementById("refreshSchoolInformation");
    const localPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname) && ["8765", "8766"].includes(window.location.port);
    if (!supabaseClient && !localPreview) {
      setSchoolInformationStatus("schoolScheduleStatus", "공식 일정 연동을 위해 Supabase 함수 배포가 필요합니다.", true);
      setSchoolInformationStatus("schoolMealStatus", "급식 연동을 위해 Supabase 함수 배포가 필요합니다.", true);
      return false;
    }
    if (schoolInformationLoading) return false;
    schoolInformationLoading = true;
    lastSchoolInformationAttemptAt = Date.now();
    if (button) { button.disabled = true; button.textContent = "불러오는 중…"; }
    setSchoolInformationStatus("schoolScheduleStatus", "서현고 공식 학사일정을 불러오는 중입니다.");
    setSchoolInformationStatus("schoolMealStatus", "서현고 공식 급식표를 불러오는 중입니다.");
    try {
      let data;
      if (localPreview && !supabaseClient) {
        const response = await fetch("/api/school-information", { cache: "no-store" });
        data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Local school information proxy failed");
      } else {
        const result = await supabaseClient.functions.invoke("school-information", { body: {} });
        if (result.error) throw result.error;
        data = result.data;
      }
      if (!data || (data.schedule == null && data.meals == null)) throw new Error("Invalid school information response");
      schoolScheduleEvents = Array.isArray(data.schedule?.events) ? data.schedule.events : [];
      schoolMealDays = Array.isArray(data.meals?.days) ? data.meals.days : [];
      renderOfficialSchoolSchedule();
      renderSchoolMeals();
      const scheduleFailed = !!data.errors?.schedule || !data.schedule;
      const mealsFailed = !!data.errors?.meals || !data.meals;
      if (scheduleFailed) {
        setSchoolInformationStatus("schoolScheduleStatus", "공식 학사일정을 가져오지 못했어요.", true);
      } else {
        const year = data.schedule.year || new Date().getFullYear();
        setSchoolInformationStatus("schoolScheduleStatus", `${year}년 학교 공식 일정 · ${formatDate(data.schedule.fetchedAt, { time: true })} 확인`);
      }
      if (mealsFailed) {
        setSchoolInformationStatus("schoolMealStatus", "공식 급식표를 가져오지 못했어요.", true);
      } else {
        setSchoolInformationStatus("schoolMealStatus", `학교 홈페이지 · ${formatDate(data.meals.fetchedAt, { time: true })} 확인`);
      }
      if (!quiet) showToast(scheduleFailed || mealsFailed ? "학교 정보를 일부만 불러왔어요." : "학사일정과 급식을 새로 불러왔어요.");
      return !scheduleFailed || !mealsFailed;
    } catch (error) {
      const message = localPreview && !supabaseClient
        ? "공식 학사일정·급식을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요."
        : "실시간 연동을 사용할 수 없습니다. Supabase 학교 정보 함수 배포를 확인해 주세요.";
      setSchoolInformationStatus("schoolScheduleStatus", message, true);
      setSchoolInformationStatus("schoolMealStatus", message, true);
      if (!quiet) showToast("학교 정보를 불러오지 못했습니다. 연결 상태를 확인해 주세요.");
      return false;
    } finally {
      schoolInformationLoading = false;
      if (button) { button.disabled = false; button.textContent = "학교 정보 새로고침"; }
    }
  }
  async function loadSchoolNotices(quiet = false) {
    const button = document.getElementById("refreshSchoolNotices");
    const localPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname) && ["8765", "8766"].includes(window.location.port);
    if (!supabaseClient && !localPreview) {
      setSchoolNoticeStatus("공지 연동을 위해 Supabase SDK가 필요합니다.", true);
      return false;
    }
    if (schoolNoticeLoading) return false;
    schoolNoticeLoading = true;
    lastSchoolNoticeAttemptAt = Date.now();
    if (button) { button.disabled = true; button.textContent = "불러오는 중…"; }
    setSchoolNoticeStatus("서현고 공식 홈페이지에서 공지를 불러오는 중입니다.");
    try {
      let data;
      if (localPreview && !supabaseClient) {
        const response = await fetch("/api/school-notices", {cache:"no-store"});
        data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Local school notice proxy failed");
      } else {
        const result = await supabaseClient.functions.invoke("school-notices", {body:{}});
        if (result.error) throw result.error;
        data = result.data;
      }
      if (!data || !Array.isArray(data.notices)) throw new Error("Invalid notice response");
      schoolNoticeSourceName = typeof data.school === "string" && data.school.trim() ? data.school.trim().slice(0,60) : "서현고등학교";
      const boardUrl = "https://seohyun-h.goesn.kr/seohyun-h/na/ntt/selectNttList.do?bbsId=15547&mi=19943";
      const fetched = new Date(data.fetchedAt || Date.now());
      schoolNoticePosts = data.notices.slice(0,20).map((notice, index) => {
        const title = typeof notice?.title === "string" ? notice.title.trim().slice(0,180) : "";
        const createdAt = new Date(notice?.createdAt || fetched);
        if (!title || Number.isNaN(createdAt.getTime())) return null;
        let sourceUrl = boardUrl;
        try {
          const candidate = new URL(notice.url || boardUrl);
          if (candidate.protocol === "https:" && candidate.hostname === "seohyun-h.goesn.kr") sourceUrl = candidate.href;
        } catch (invalidUrl) {}
        const stableId = String(notice.id || `${createdAt.toISOString()}-${title}`).slice(0,160);
        return {
          id: `official-${stableId}`,
          category: "official",
          categoryLabel: "학교 공지",
          title,
          body: `${schoolNoticeSourceName} 공식 공지입니다. 본문과 첨부 파일은 원문에서 확인해 주세요.`,
          author: typeof notice.author === "string" ? notice.author.slice(0,80) : "학교",
          createdAt: createdAt.toISOString(),
          subject: "",
          audience: "학교 전체",
          audience_type: "school",
          officialSource: true,
          sourceName: `${schoolNoticeSourceName} 공식 홈페이지`,
          sourceUrl,
          origin: "실시간 연동",
          image: "",
          attachments: [],
          persisted: false,
          sourceOrder: index
        };
      }).filter(Boolean);
      const fetchedLabel = Number.isNaN(fetched.getTime()) ? "방금" : formatDate(fetched, {time:true});
      setSchoolNoticeStatus(`${schoolNoticeSourceName} · 최신 공지 ${schoolNoticePosts.length}건 · ${fetchedLabel} 확인`);
      renderPostList();
      if (!quiet) showToast(`공식 공지 ${schoolNoticePosts.length}건을 새로 불러왔어요.`);
      return true;
    } catch (error) {
      setSchoolNoticeStatus(localPreview && !supabaseClient ? "공식 홈페이지에서 공지를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요." : "실시간 연동을 사용할 수 없습니다. Supabase 함수 배포 상태를 확인해 주세요.", true);
      if (!quiet) showToast("학교 공지를 불러오지 못했습니다. 연결 상태를 확인해 주세요.");
      return false;
    } finally {
      schoolNoticeLoading = false;
      if (button) { button.disabled = false; button.textContent = "공지 새로고침"; }
    }
  }
  function setFamilyLetterStatus(message, error = false) {
    const status = document.getElementById("familyLetterStatus");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("error", error);
  }
  async function loadSchoolFamilyLetters(quiet = false) {
    if (profile.schoolName !== DEFAULT_SCHOOL_NAME) return false;
    const button = document.getElementById("refreshFamilyLetters");
    const localPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname) && ["8765", "8766"].includes(window.location.port);
    if (!supabaseClient && !localPreview) {
      setFamilyLetterStatus("가정통신문 연동을 위해 Supabase SDK가 필요합니다.", true);
      return false;
    }
    if (familyLetterLoading) return false;
    familyLetterLoading = true;
    lastFamilyLetterAttemptAt = Date.now();
    if (button) { button.disabled = true; button.textContent = "불러오는 중…"; }
    setFamilyLetterStatus("서현고 공식 홈페이지에서 가정통신문을 불러오는 중입니다.");
    try {
      let data;
      if (localPreview && !supabaseClient) {
        const response = await fetch("/api/school-family-letters", {cache:"no-store"});
        data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Local family letter proxy failed");
      } else {
        const result = await supabaseClient.functions.invoke("school-family-letters", {body:{}});
        if (result.error) throw result.error;
        data = result.data;
      }
      if (!data || !Array.isArray(data.notices)) throw new Error("Invalid family letter response");
      familyLetterSourceName = typeof data.school === "string" && data.school.trim() ? data.school.trim().slice(0,60) : DEFAULT_SCHOOL_NAME;
      const boardUrl = "https://seohyun-h.goesn.kr/seohyun-h/na/ntt/selectNttList.do?bbsId=15548&mi=19944";
      const fetched = new Date(data.fetchedAt || Date.now());
      familyLetterPosts = data.notices.slice(0,20).map((notice, index) => {
        const title = typeof notice?.title === "string" ? notice.title.trim().slice(0,180) : "";
        const createdAt = new Date(notice?.createdAt || fetched);
        if (!title || Number.isNaN(createdAt.getTime())) return null;
        let sourceUrl = boardUrl;
        try {
          const candidate = new URL(notice.url || boardUrl);
          if (candidate.protocol === "https:" && candidate.hostname === "seohyun-h.goesn.kr") sourceUrl = candidate.href;
        } catch (invalidUrl) {}
        const stableId = String(notice.id || `${createdAt.toISOString()}-${title}`).slice(0,160);
        return {
          id: `official-family-${stableId}`,
          category: "family",
          categoryLabel: "가정통신문",
          title,
          body: `${familyLetterSourceName} 공식 가정통신문입니다. 본문과 첨부 파일은 원문에서 확인해 주세요.`,
          author: typeof notice.author === "string" ? notice.author.slice(0,80) : "학교",
          createdAt: createdAt.toISOString(),
          subject: "",
          audience: "학교 전체",
          audience_type: "school",
          target_school: DEFAULT_SCHOOL_NAME,
          officialSource: true,
          sourceName: `${familyLetterSourceName} 공식 홈페이지`,
          sourceUrl,
          origin: "실시간 연동",
          image: "",
          attachments: [],
          persisted: false,
          sourceOrder: index
        };
      }).filter(Boolean);
      const fetchedLabel = Number.isNaN(fetched.getTime()) ? "방금" : formatDate(fetched, {time:true});
      setFamilyLetterStatus(`${familyLetterSourceName} · 최신 가정통신문 ${familyLetterPosts.length}건 · ${fetchedLabel} 확인`);
      renderPostList();
      if (!quiet) showToast(`공식 가정통신문 ${familyLetterPosts.length}건을 새로 불러왔어요.`);
      return true;
    } catch (error) {
      setFamilyLetterStatus(localPreview && !supabaseClient ? "공식 홈페이지에서 가정통신문을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요." : "실시간 연동을 사용할 수 없습니다. Supabase 함수 배포 상태를 확인해 주세요.", true);
      if (!quiet) showToast("가정통신문을 불러오지 못했습니다. 연결 상태를 확인해 주세요.");
      return false;
    } finally {
      familyLetterLoading = false;
      if (button) { button.disabled = false; button.textContent = "통신문 새로고침"; }
    }
  }
  async function loadCloudPosts() {
    if (!supabaseClient) return false;
    const {data, error} = await supabaseClient.from("posts")
      .select("id,post,audience_type,target_school,target_grade,target_class,target_subject,moderation_status")
      .order("created_at", {ascending:false});
    if (error) { showToast("Supabase SQL 설정을 실행한 뒤 새로고침해 주세요."); return false; }
    const remotePosts = (data || []).map(postFromRow).filter(Boolean);
    const publicCache = posts.filter(post => isSchoolPost(post) && audienceForPost(post).schoolName === profile.schoolName);
    const schoolDefaults = DEFAULT_POSTS.filter(post => audienceForPost(post).schoolName === profile.schoolName);
    posts = mergePostLists(schoolDefaults, publicCache, remotePosts);
    await refreshPostImageUrls();
    savePublicPostCache();
    renderPostList();
    renderUpcoming();
    return true;
  }
  async function refreshPostImageUrls() {
    if (!currentUser || !supabaseClient) {
      signedPostImageUrls.clear();
      return;
    }
    const paths = [...new Set(posts.map(post => postImageObjectPath(post.image)).filter(Boolean))];
    const pathSet = new Set(paths);
    for (const path of signedPostImageUrls.keys()) {
      if (!pathSet.has(path)) signedPostImageUrls.delete(path);
    }
    const refreshBefore = Date.now() + 30000;
    await Promise.all(paths.map(async path => {
      const cached = signedPostImageUrls.get(path);
      if (cached && cached.expiresAt > refreshBefore) return;
      try {
        const {data, error} = await supabaseClient.storage.from("post-images").createSignedUrl(path, 3600);
        if (error || !data?.signedUrl) {
          signedPostImageUrls.delete(path);
          return;
        }
        signedPostImageUrls.set(path, {url:data.signedUrl, expiresAt:Date.now() + 3600000});
      } catch (error) {
        signedPostImageUrls.delete(path);
      }
    }));
  }
  async function syncUserData() {
    if (!currentUser || !supabaseClient) return;
    const profileResult = await supabaseClient.from("profiles").upsert({user_id:currentUser.id, profile}, {onConflict:"user_id"});
    if (profileResult.error) throw profileResult.error;
    const timetableResult = await supabaseClient.from("timetables").upsert({user_id:currentUser.id, items:timetable}, {onConflict:"user_id"});
    if (timetableResult.error) throw timetableResult.error;
  }
  async function persistClassTimetable(items) {
    const identity=classTimetableIdentity();
    if(!currentUser||!supabaseClient||!identity)throw new Error("학급 설정이 필요합니다.");
    const normalized=normalizeClassTimetable(items);
    const slotRows=normalized.map(item=>({...identity,...item}));
    if(slotRows.length){
      const result=await supabaseClient.from("class_timetable_slots").upsert(slotRows,{onConflict:"school_name,grade,class_name,day,period"});
      if(result.error)throw result.error;
    }
    const nextSlots=new Set(normalized.map(item=>`${item.day}-${item.period}`));
    const removed=classTimetable.filter(item=>!nextSlots.has(`${item.day}-${item.period}`));
    for(const item of removed){
      const result=await supabaseClient.from("class_timetable_slots").delete().match({...identity,day:item.day,period:item.period});
      if(result.error)throw result.error;
    }
    classTimetable=normalized;
    classTimetableReady=true;
    saveValue(classTimetableStorageKey(identity),classTimetable);
    saveValue(classTimetableKnownCloudKey(identity),true);
    return classTimetable;
  }
  function subscribeToClassTimetable(identity) {
    if(!supabaseClient)return;
    if(classTimetableChannel){supabaseClient.removeChannel(classTimetableChannel);classTimetableChannel=null;}
    classTimetableChannel=supabaseClient.channel("sifs-class-timetable")
      .on("postgres_changes",{event:"*",schema:"public",table:"class_timetable_slots",filter:`school_name=eq.${identity.school_name}`},payload=>{
        const row=payload.new||payload.old;
        const currentIdentity=classTimetableIdentity();
        if(!row||!currentIdentity||row.school_name!==currentIdentity.school_name||row.grade!==currentIdentity.grade||row.class_name!==currentIdentity.class_name)return;
        const slotKey=`${row.day}-${row.period}`;
        if(payload.eventType==="DELETE")classTimetable=classTimetable.filter(item=>`${item.day}-${item.period}`!==slotKey);
        else classTimetable=normalizeClassTimetable([...classTimetable.filter(item=>`${item.day}-${item.period}`!==slotKey),row]);
        classTimetableReady=true;
        saveValue(classTimetableStorageKey(currentIdentity),classTimetable);
        saveValue(classTimetableKnownCloudKey(currentIdentity),true);
        renderTimetable();renderUpcoming();
      }).subscribe();
  }
  async function loadClassTimetable({migratePersonal=true}={}) {
    const identity=classTimetableIdentity();
    if(!identity){
      classTimetable=[];classTimetableReady=false;
      if(classTimetableChannel){supabaseClient.removeChannel(classTimetableChannel);classTimetableChannel=null;}
      return false;
    }
    const localKey=classTimetableStorageKey(identity);
    classTimetable=normalizeClassTimetable(loadValue(localKey,[]));
    const knownCloudState=loadValue(classTimetableKnownCloudKey(identity),false)===true;
    classTimetableReady=false;
    try {
      let result=await supabaseClient.from("class_timetable_slots").select("day,period,subject").match(identity);
      if(result.error)throw result.error;
      let shared=normalizeClassTimetable(result.data||[]);
      if(!shared.length){
        const cachedItems=migratePersonal&&!knownCloudState?classTimetable:[];
        const initialItems=normalizeClassTimetable([...cachedItems,...(migratePersonal?timetable:[])]);
        if(initialItems.length)await persistClassTimetable(initialItems);
        result=await supabaseClient.from("class_timetable_slots").select("day,period,subject").match(identity);
        if(result.error)throw result.error;
        shared=normalizeClassTimetable(result.data||[]);
      }
      const legacyPersonal=migratePersonal?normalizeClassTimetable(timetable):[];
      if(legacyPersonal.length){
        const slots=new Set(shared.map(item=>`${item.day}-${item.period}`));
        const additions=legacyPersonal.filter(item=>!slots.has(`${item.day}-${item.period}`));
        if(additions.length){
          shared=normalizeClassTimetable([...shared,...additions]);
          await persistClassTimetable(shared);
        }
        const personalOnly=timetable.filter(item=>item.code);
        if(personalOnly.length!==timetable.length){
          timetable=personalOnly;
          saveValue(timetableStorageKey(currentUser.id),timetable);
          await syncUserData();
        }
      }
      classTimetable=shared;
      classTimetableReady=true;
      saveValue(localKey,classTimetable);
      saveValue(classTimetableKnownCloudKey(identity),true);
      subscribeToClassTimetable(identity);
      return true;
    } catch(error) {
      classTimetableReady=false;
      if(classTimetableChannel){supabaseClient.removeChannel(classTimetableChannel);classTimetableChannel=null;}
      return false;
    }
  }
  async function publishLocalPosts() {
    if (!currentUser) return;
    const localPosts = posts.filter(post => !RETIRED_DEMO_POST_IDS.has(post.id) && !post.id.startsWith("post-"));
    if (!localPosts.length || !window.confirm("이 기기에만 저장된 게시글 " + localPosts.length + "개를 선택한 공개 대상에게 공유할까요?")) return;
    for (const localPost of localPosts) {
      const existing = await supabaseClient.from("posts").select("id").eq("id", localPost.id).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) continue;
      let post = {...localPost};
      const audienceColumns = postAudienceColumns(post);
      if (/^data:image\/(jpeg|png|webp);base64,/i.test(post.image || "")) {
        const blob = await (await fetch(post.image)).blob();
        const path = makePostImagePath(post.id, blob.type);
        const upload = await supabaseClient.storage.from("post-images").upload(path, blob, {contentType:blob.type, upsert:false});
        if (upload.error) throw upload.error;
        post.image = path;
      }
      const inserted = await supabaseClient.from("posts").insert({id:post.id, user_id:currentUser.id, post, ...audienceColumns});
      if (inserted.error) throw inserted.error;
    }
  }
  async function loadUserData() {
    if (!currentUser || !supabaseClient) return;
    const profileResult = await supabaseClient.from("profiles").select("profile").eq("user_id", currentUser.id).maybeSingle();
    if (profileResult.error) throw profileResult.error;
    const timetableResult = await supabaseClient.from("timetables").select("items").eq("user_id", currentUser.id).maybeSingle();
    if (timetableResult.error) throw timetableResult.error;
    if (profileResult.data) profile = normalizeProfile(profileResult.data.profile);
    else profile = normalizeProfile(loadValue(profileStorageKey(currentUser.id), profileForUser(currentUser)));
    const accountTimetableKey = timetableStorageKey(currentUser.id);
    const savedAccountTimetable = loadValue(accountTimetableKey, null);
    const remoteTimetable = timetableResult.data?.items;
    timetable = normalizeTimetable(Array.isArray(remoteTimetable) ? remoteTimetable : Array.isArray(savedAccountTimetable) ? savedAccountTimetable : []);
    const timetableNeedsCleanup = Array.isArray(remoteTimetable) && JSON.stringify(remoteTimetable) !== JSON.stringify(timetable);
    if (!profileResult.data || !timetableResult.data || timetableNeedsCleanup) await syncUserData();
    saveValue(profileStorageKey(currentUser.id), profile);
    saveValue(accountTimetableKey, timetable);
    await loadClassTimetable();
    renderTimetable();renderUpcoming();
  }
  function subscribeToCloudPosts() {
    if (!supabaseClient) return;
    if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = supabaseClient.channel("sifs-posts-feed").on("postgres_changes", {event:"*", schema:"public", table:"posts"}, payload => {
      if (payload.eventType === "DELETE") posts = posts.filter(post => post.id !== payload.old.id);
      else if (payload.new && payload.new.post) posts = mergePostLists(posts, [postFromRow(payload.new)]);
      savePublicPostCache();
      void refreshPostImageUrls().then(() => renderPostList());
      renderPostList();renderUpcoming();
    }).subscribe();
  }
  function updateModeratorNav() {
    const button = document.getElementById("moderationNav");
    if (button) button.classList.toggle("page-hidden", !isModerator);
  }
  async function loadModeratorStatus() {
    if (!currentUser || !supabaseClient) {
      isModerator = false;
      updateModeratorNav();
      return;
    }
    const result = await supabaseClient.from("moderators")
      .select("user_id")
      .eq("user_id", currentUser.id)
      .maybeSingle();
    isModerator = !result.error && !!result.data;
    updateModeratorNav();
  }
  function updateAuthButton() {
    const button = document.getElementById("authButton");
    if (!button) return;
    button.textContent = currentUser ? "로그아웃" : "로그인";
    button.title = currentUser ? currentUser.email : "Google 로그인";
  }
  function openAuthDialog() {
    if (!supabaseClient) { showToast("Supabase 라이브러리를 불러오지 못했습니다."); return; }
    document.getElementById("modalRoot").innerHTML = '<div class="modal-backdrop" id="authBackdrop"><section class="modal"><h2>Google 계정으로 로그인</h2><p>Google 계정으로 로그인하면 게시글은 함께 공유되고, 프로필과 시간표는 내 계정에 저장됩니다.</p><button class="outline" id="googleSignIn" type="button" style="width:100%;height:42px;margin:8px 0 3px;font-weight:700">G　Google 계정으로 계속</button><p style="font-size:9px;margin-bottom:0">Google 로그인을 처음 사용하는 계정은 자동으로 등록됩니다.</p><div class="modal-actions"><button class="outline" id="closeAuth" type="button">닫기</button></div></section></div>';
    document.getElementById("closeAuth").addEventListener("click", () => document.getElementById("modalRoot").innerHTML="");
    document.getElementById("authBackdrop").addEventListener("click", event => { if (event.target.id === "authBackdrop") document.getElementById("modalRoot").innerHTML=""; });
    document.getElementById("googleSignIn").addEventListener("click", signInWithGoogle);
  }
  async function signInWithGoogle() {
    if (!supabaseClient) { showToast("Supabase 라이브러리를 불러오지 못했습니다."); return; }
    if (window.location.protocol === "file:") { showToast("Google 로그인은 HTTPS로 배포한 앱 주소에서 사용할 수 있어요."); return; }
    try {
      const redirectTo = window.location.origin + window.location.pathname;
      const {error} = await supabaseClient.auth.signInWithOAuth({provider:"google", options:{redirectTo}});
      if (error) showToast("Google 로그인 설정을 확인해 주세요.");
    } catch (error) {
      showToast("Google 로그인 설정을 확인해 주세요.");
    }
  }
  async function finishCloudLogin() {
    if (!currentUser) return;
    try {
      await loadUserData();
      await loadModeratorStatus();
      if (!await loadCloudPosts()) return;
      await publishLocalPosts();
      await loadCloudPosts();
      subscribeToCloudPosts();
      showToast("로그인했어요. 이 계정으로 게시글 공개 범위가 적용됩니다.");
    } catch (error) {
      showToast("계정 데이터를 불러오지 못했습니다. Supabase 설정을 확인해 주세요.");
    }
  }
  async function initializeApp() {
    const date=new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"long"}).format(new Date());document.getElementById("todayLabel").textContent=date;
    document.querySelectorAll(".nav button[data-view]").forEach(button=>button.addEventListener("click",()=>showView(button.dataset.view)));
    document.querySelectorAll("[data-go]").forEach(button=>button.addEventListener("click",()=>showView(button.dataset.go)));
    document.getElementById("searchForm").addEventListener("submit",event=>{event.preventDefault();renderPostList();});
    document.getElementById("refreshSchoolNotices").addEventListener("click",()=>loadSchoolNotices());
    document.getElementById("refreshFamilyLetters").addEventListener("click",()=>loadSchoolFamilyLetters());
    document.getElementById("refreshSchoolInformation").addEventListener("click",()=>loadSchoolInformation());
    document.getElementById("searchInput").addEventListener("input",renderPostList);
    document.querySelectorAll("#filterRow [data-query]").forEach(button=>button.addEventListener("click",()=>{document.getElementById("searchInput").value=button.dataset.query;renderPostList();}));
    document.querySelectorAll("#categoryRow [data-category]").forEach(button=>button.addEventListener("click",()=>{selectedCategory=button.dataset.category;document.querySelectorAll("#categoryRow .chip").forEach(item=>item.classList.toggle("active",item===button));renderPostList();}));
    document.getElementById("sortSelect").addEventListener("change",renderPostList);
    document.getElementById("addCourseButton").addEventListener("click",addCourse);
    document.getElementById("courseInput").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();addCourse();}});
    document.querySelectorAll("[data-edit-profile]").forEach(button=>button.addEventListener("click",openProfileEditor));
    document.getElementById("schoolSwitchButton").addEventListener("click",openProfileEditor);
    document.getElementById("deleteCourseButton").addEventListener("click",deleteSelectedCourse);
    document.getElementById("postForm").addEventListener("submit",submitPost);
    document.getElementById("imageInput").addEventListener("change",event=>readImages(event.target.files));
    document.getElementById("postAudience").addEventListener("change", event => {
      updateAudienceControls();
      if (event.target.value === "subject" && visibleTimetable().length === 0) showToast("먼저 나의 학교생활에서 과목을 추가해 주세요.");
    });
    document.getElementById("importButton").addEventListener("click",()=>document.getElementById("importInput").click());
    document.getElementById("importInput").addEventListener("change",event=>{if(event.target.files[0])importBackup(event.target.files[0]);event.target.value="";});
    document.getElementById("exportButton").addEventListener("click",exportBackup);
    document.getElementById("authButton").addEventListener("click", async () => {
      if (!currentUser) { openAuthDialog(); return; }
      await supabaseClient.auth.signOut();
    });
    renderPostList();renderTimetable();renderUpcoming();
    startSchoolNoticeRefresh();
    void loadSchoolInformation(true);
    void loadSchoolFamilyLetters(true);
    if (!supabaseClient) { setSchoolNoticeStatus("Supabase SDK를 불러오지 못했습니다. 로컬 공지 연결을 시도합니다.", true); void loadSchoolNotices(true); showToast("Supabase SDK를 불러오지 못했습니다."); return; }
    void loadSchoolNotices(true);
    supabaseClient.auth.onAuthStateChange((event, session) => {
      const previousUserId = currentUser?.id;
      currentUser = session?.user || null;
      updateAuthButton();
      if (event === "SIGNED_IN" && currentUser && currentUser.id !== previousUserId) {
        signedPostImageUrls.clear();
        isModerator = false;
        updateModeratorNav();
        profile = normalizeProfile(loadValue(profileStorageKey(currentUser.id), profileForUser(currentUser)));
        timetable = normalizeTimetable(loadValue(timetableStorageKey(currentUser.id), DEFAULT_TIMETABLE));
        classTimetable = [];
        classTimetableReady = false;
        posts = posts.filter(post => isSchoolPost(post) && audienceForPost(post).schoolName === profile.schoolName && !RETIRED_DEMO_POST_IDS.has(post.id));
        renderTimetable();
        window.setTimeout(() => finishCloudLogin(), 0);
      }
      if (event === "SIGNED_OUT") {
        signedPostImageUrls.clear();
        if (realtimeChannel) { supabaseClient.removeChannel(realtimeChannel); realtimeChannel = null; }
        if (classTimetableChannel) { supabaseClient.removeChannel(classTimetableChannel); classTimetableChannel = null; }
        classTimetable = [];
        classTimetableReady = false;
        isModerator = false;
        updateModeratorNav();
        timetable = normalizeTimetable(loadValue(timetableStorageKey(), DEFAULT_TIMETABLE));
        profile = normalizeProfile(loadValue(profileStorageKey(), {name:"학생", studentId:"", schoolName:DEFAULT_SCHOOL_NAME, grade:"", className:""}));
        const savedPublicPosts = loadValue(STORAGE_KEYS.posts, DEFAULT_POSTS).filter(post => isSchoolPost(post) && audienceForPost(post).schoolName === profile.schoolName && !RETIRED_DEMO_POST_IDS.has(post.id));
        const schoolDefaults = DEFAULT_POSTS.filter(post => audienceForPost(post).schoolName === profile.schoolName);
        posts = mergePostLists(schoolDefaults, savedPublicPosts);
        if (!document.getElementById("moderationView").classList.contains("page-hidden") || !document.getElementById("detailView").classList.contains("page-hidden")) showView("search");
        else renderPostList();
        renderTimetable();
      }
    });
    const {data:sessionData, error:sessionError} = await supabaseClient.auth.getSession();
    if (sessionError) { showToast("로그인 상태를 확인하지 못했습니다."); return; }
    currentUser = sessionData.session?.user || null;
    updateAuthButton();
    if (currentUser) await finishCloudLogin();
    else { await loadCloudPosts(); subscribeToCloudPosts(); }
  }
  initializeApp();
