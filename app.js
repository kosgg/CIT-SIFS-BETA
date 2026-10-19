const STORAGE_KEYS = { posts: "sifs.beta.posts.v1", timetable: "sifs.beta.timetable.v1", profile: "sifs.beta.profile.v1" };
  const SUPABASE_URL = "https://wljqmhwshmbcaitfiudc.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mMBNZxl0RobMJTLJYxbN5Q_DeCC8llJ";
  const supabaseClient = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
  const DAYS = ["", "월", "화", "수", "목", "금"];
  const CATEGORY_LABELS = { official: "학교 공지", assessment: "수행평가", event: "행사", family: "가정통신문" };
  const DEFAULT_POSTS = [
    { id:"demo-assessment-1", category:"assessment", title:"화학 I 산화·환원 실험 보고서 안내", body:"2학년 3반 여러분, 오늘 진행한 산화·환원 실험을 바탕으로 실험 보고서를 작성해 주세요.\n\n보고서에 포함할 내용\n1. 실험 목적과 준비물\n2. 실험 과정 및 관찰 결과\n3. 산화·환원 반응식과 전자 이동 방향\n4. 결과 해석 및 실험을 통해 알게 된 점\n\n제공한 양식에 작성한 뒤 Google Classroom에 제출해 주세요.", author:"박지훈 선생님", createdAt:"2026-10-12T09:10:00", categoryLabel:"수행평가", subject:"화학 I", audience:"2학년 3반", dueAt:"2026-10-15T23:59", sourceName:"Google Classroom", sourceUrl:"https://classroom.google.com", origin:"자동 수집", image:"", attachments:["산화환원_실험보고서_양식.hwp"] },
    { id:"demo-official-1", category:"official", title:"2학기 중간고사 시험 시간표 및 유의사항", body:"10월 26일~29일 중간고사 일정과 시험실 배치도를 확인해 주세요. 상세 내용은 학교 홈페이지 원문을 확인해 주세요.", author:"교무부", createdAt:"2026-10-12T08:40:00", categoryLabel:"학교 공지", subject:"", audience:"한빛고등학교 전체", dueAt:"", sourceName:"리로스쿨", sourceUrl:"https://seohyun-h.goesn.kr/seohyun-h/main.do", origin:"자동 수집", image:"", attachments:[] },
    { id:"demo-event-1", category:"event", title:"한빛제 부스 운영팀을 모집합니다", body:"우리 반의 아이디어를 축제로! 부스 기획안을 10월 16일까지 보내 주세요.\n\n관심 있는 친구는 담임 선생님께 알려 주세요.", author:"학생회", createdAt:"2026-10-11T16:20:00", categoryLabel:"행사", subject:"", audience:"한빛고등학교 전체", dueAt:"2026-10-16T15:00", sourceName:"학생 등록", sourceUrl:"", origin:"직접 등록", image:"", attachments:[] },
    { id:"demo-family-1", category:"family", title:"2026학년도 2학기 학부모 상담 주간 안내", body:"상담 기간은 10월 19일~23일입니다. 희망 시간과 상담 내용을 신청해 주세요.", author:"학생생활부", createdAt:"2026-10-11T14:00:00", categoryLabel:"가정통신문", subject:"", audience:"한빛고등학교 전체", dueAt:"2026-10-19T09:00", sourceName:"학교 홈페이지", sourceUrl:"https://seohyun-h.goesn.kr/seohyun-h/na/ntt/selectNttList.do?bbsId=15548&mi=19944", origin:"자동 수집", image:"", attachments:[] },
    { id:"demo-assessment-2", category:"assessment", title:"국어 주제 탐구 발표 자료 제출 안내", body:"발표 자료는 10월 19일 수업 전까지 제출해 주세요. 발표 순서는 수업 시간에 안내합니다.", author:"정유진 선생님", createdAt:"2026-10-10T11:30:00", categoryLabel:"수행평가", subject:"국어", audience:"2학년 3반", dueAt:"2026-10-19T09:00", sourceName:"교사 등록", sourceUrl:"", origin:"직접 등록", image:"", attachments:[] },
    { id:"demo-official-2", category:"official", title:"2026학년도 학교 안전 교육 자료 안내", body:"학생 안전 교육 자료와 확인 일정을 안내합니다. 학급 공지를 확인해 주세요.", author:"학생안전부", createdAt:"2026-10-09T10:00:00", categoryLabel:"학교 공지", subject:"", audience:"한빛고등학교 전체", dueAt:"", sourceName:"학교 홈페이지", sourceUrl:"https://seohyun-h.goesn.kr/seohyun-h/main.do", origin:"자동 수집", image:"", attachments:[] }
  ];
  const DEFAULT_TIMETABLE = [
    {day:1,period:1,subject:"국어"},{day:1,period:2,subject:"수학 II"},{day:1,period:3,subject:"영어 I"},{day:1,period:4,subject:"화학 I"},{day:1,period:5,subject:"한국사"},{day:1,period:6,subject:"체육"},{day:1,period:7,subject:"창체"},
    {day:2,period:1,subject:"수학 II"},{day:2,period:2,subject:"화학 I"},{day:2,period:3,subject:"한국사"},{day:2,period:4,subject:"영어 I"},{day:2,period:5,subject:"국어"},{day:2,period:6,subject:"진로"},{day:2,period:7,subject:"자율"},
    {day:3,period:1,subject:"영어 I"},{day:3,period:2,subject:"국어"},{day:3,period:3,subject:"수학 II"},{day:3,period:4,subject:"체육"},{day:3,period:5,subject:"화학 I"},{day:3,period:6,subject:"한국사"},{day:3,period:7,subject:"진로"},
    {day:4,period:1,subject:"국어"},{day:4,period:2,subject:"영어 I"},{day:4,period:3,subject:"화학 I"},{day:4,period:4,subject:"수학 II"},{day:4,period:5,subject:"미술"},{day:4,period:6,subject:"동아리"},{day:4,period:7,subject:"동아리"},
    {day:5,period:1,subject:"화학 I"},{day:5,period:2,subject:"체육"},{day:5,period:3,subject:"국어"},{day:5,period:4,subject:"한국사"},{day:5,period:5,subject:"영어 I"},{day:5,period:6,subject:"수학 II"},{day:5,period:7,subject:"자율"}
  ];
  function normalizeProfile(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : "김서연",
      studentId: typeof source.studentId === "string" ? source.studentId.trim() : "",
      grade: ["1학년", "2학년", "3학년"].includes(source.grade) ? source.grade : "2학년",
      className: typeof source.className === "string" && source.className.trim() ? source.className.trim() : "3반"
    };
  }
  function profileStorageKey(userId = "") { return `${STORAGE_KEYS.profile}.${userId || "guest"}`; }
  function profileForUser(user) {
    const metadata = user?.user_metadata || {};
    const name = metadata.full_name || metadata.name || metadata.preferred_username || user?.email?.split("@")[0] || "학생";
    return normalizeProfile({name, studentId:"", grade:"2학년", className:"3반"});
  }
  let posts = loadValue(STORAGE_KEYS.posts, DEFAULT_POSTS);
  let timetable = loadValue(STORAGE_KEYS.timetable, DEFAULT_TIMETABLE);
  let profile = normalizeProfile(loadValue(profileStorageKey(), {name:"김서연", studentId:"", grade:"2학년", className:"3반"}));
  let selectedCategory = "전체";
  let activePostId = "";
  let selectedSlot = null;
  let attachedImages = [];
  let toastTimer = 0;
  let currentUser = null;
  let realtimeChannel = null;

  function loadValue(key, fallback) {
    try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; }
    catch (error) { return fallback; }
  }
  function saveValue(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) { showToast("저장 공간이 부족합니다. 첨부 이미지 크기를 줄여 주세요."); return false; }
  }
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
  function getTagClass(post) { return post.origin === "직접 등록" ? "orange" : post.origin === "자동 수집" ? "green" : "gray"; }
  function getVisiblePosts() {
    const query = document.getElementById("searchInput").value.trim().toLocaleLowerCase("ko-KR");
    const sort = document.getElementById("sortSelect").value;
    const filtered = posts.filter(post => {
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
    list.innerHTML = visible.map(post => `<article class="post-row" data-post-id="${escapeHtml(post.id)}">${getSafeImage(post.image) ? `<img class="post-thumb" src="${getSafeImage(post.image)}" alt="게시글 첨부 이미지">` : ""}<div><span class="tag">${escapeHtml(getCategoryLabel(post))}</span><span class="tag ${getTagClass(post)}">${escapeHtml(post.origin || "직접 등록")}</span>${post.dueAt && post.subject ? `<span class="tag gray">내 학급</span>` : ""}</div><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.body).replace(/\n/g," ").slice(0,100)}${post.body.length > 100 ? "…" : ""}</p><div class="post-meta">${escapeHtml(post.sourceName || post.author || "학생 등록")} · ${escapeHtml(post.author || "")} · ${formatDate(post.createdAt,{time:true})}</div><span class="post-arrow">›</span></article>`).join("");
    list.querySelectorAll("[data-post-id]").forEach(row => row.addEventListener("click", () => showDetail(row.dataset.postId)));
  }
  function getUpcomingPosts() {
    const selectedSubjects = new Set(timetable.map(item => item.subject));
    return posts.filter(post => post.dueAt && new Date(post.dueAt) >= new Date() && (!post.subject || selectedSubjects.has(post.subject))).sort((a,b) => new Date(a.dueAt)-new Date(b.dueAt)).slice(0,3);
  }
  function renderUpcoming() {
    const upcoming = getUpcomingPosts();
    const html = upcoming.length ? upcoming.map(post => `<div class="upcoming-item"><span class="dday">${getDday(post.dueAt)}</span><strong>${escapeHtml(post.subject || getCategoryLabel(post))}　${escapeHtml(post.title)}</strong><small>${formatDate(post.dueAt,{time:true})} 마감</small></div>`).join("") : `<div class="empty-state" style="padding:18px 4px">예정된 일정이 없어요.</div>`;
    document.getElementById("upcomingList").innerHTML = html;
    document.getElementById("timetableAssignments").innerHTML = html;
  }
  function renderTimetable() {
    const grid = document.getElementById("weekGrid");
    let html = `<div class="week-cell head">교시</div>${DAYS.slice(1).map((day,index) => `<div class="week-cell head ${index===0?"this-day":""}">${day} ${12+index}</div>`).join("")}`;
    for (let period=1; period<=7; period++) {
      html += `<div class="week-cell time">${period}교시</div>`;
      for (let day=1; day<=5; day++) {
        const item = timetable.find(entry => entry.day === day && entry.period === period);
        html += `<div class="week-cell course ${item?"has-course":""}" data-slot="${day}-${period}" title="눌러서 과목 편집">${item?escapeHtml(item.subject):"＋"}</div>`;
      }
    }
    grid.innerHTML = html;
    grid.querySelectorAll("[data-slot]").forEach(cell => cell.addEventListener("click", () => {
      const [day,period] = cell.dataset.slot.split("-").map(Number);
      selectedSlot={day,period};const current=timetable.find(item=>item.day===day&&item.period===period);
      document.getElementById("dayInput").value = String(day); document.getElementById("periodInput").value = String(period); document.getElementById("courseInput").value=current?.subject||"";
      document.getElementById("addCourseButton").textContent=current?"과목 수정":"과목 추가";
      document.getElementById("deleteCourseButton").classList.toggle("page-hidden",!current);
      document.getElementById("courseInput").focus();
    }));
    const initials = profile.name.slice(0,2) || "학생";
    document.getElementById("topAvatar").textContent = initials; document.getElementById("topName").textContent = profile.name;
    document.getElementById("profileAvatar").textContent = initials; document.getElementById("profileName").textContent = profile.name;
    document.getElementById("authorAvatar").textContent = initials; document.getElementById("authorName").textContent = profile.name;
    document.getElementById("profileStudentId").textContent = profile.studentId ? `학번 ${profile.studentId}` : "학번 미설정";
    document.getElementById("profileClass").textContent = `한빛고등학교 · ${profile.grade} ${profile.className}`;
    document.getElementById("authorClass").textContent = `${profile.grade} ${profile.className}`;
    document.getElementById("classTag").textContent = `${profile.grade} ${profile.className}`;
    document.getElementById("personalGreeting").textContent = `${profile.name.slice(1)}님의 한 주를 한눈에.`;
    const today = new Date().getDay();
    const todayCourses = timetable.filter(item => item.day === (today===0?1:Math.min(today,5))).sort((a,b)=>a.period-b.period).map(item=>`${item.period}교시 ${item.subject}`).join(" · ");
    document.getElementById("todayCourseSummary").textContent = todayCourses || "시간표에서 오늘 수업을 확인해 보세요.";
    const subjectSelect = document.getElementById("postSubject");
    const subjects = [...new Set(timetable.map(item => item.subject))].sort((a,b)=>a.localeCompare(b,"ko"));
    const priorValue = subjectSelect.value;
    subjectSelect.innerHTML = `<option value="">과목 선택 안 함</option>${subjects.map(subject=>`<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("")}`;
    if (subjects.includes(priorValue)) subjectSelect.value = priorValue;
  }
  function showView(name) {
    ["search","timetable","register","detail"].forEach(view => document.getElementById(`${view}View`).classList.toggle("page-hidden", view !== name));
    document.querySelectorAll(".nav button[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === name));
    if (name === "search") renderPostList();
    if (name === "timetable") renderTimetable();
    if (name === "register") renderTimetable();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function showDetail(postId) {
    const post = posts.find(item => item.id === postId); if (!post) return;
    activePostId = postId;
    const detail = document.getElementById("detailView");
    const dueDate = post.dueAt ? new Date(post.dueAt) : null;
    const related = posts.filter(item => item.id !== post.id && (item.subject && item.subject === post.subject || item.category === post.category)).slice(0,3);
    detail.innerHTML = `<div class="detail-back"><button class="subtle-link" id="backToSearch">← 전체 소식으로 돌아가기</button><span>통합 검색　/　${escapeHtml(getCategoryLabel(post))}</span></div><div class="detail-layout"><article class="card article"><div><span class="tag">${escapeHtml(getCategoryLabel(post))}</span><span class="tag green">${escapeHtml(post.origin || "직접 등록")}</span><span class="tag gray">${escapeHtml(post.audience || "한빛고등학교 전체")}</span></div><h1>${escapeHtml(post.title)}</h1><div class="article-meta"><span class="avatar" style="display:inline-grid;vertical-align:middle;margin-right:6px">${escapeHtml((post.author||"학생").slice(0,1))}</span>${escapeHtml(post.author || "학생 등록")}　·　${escapeHtml(post.sourceName||"로컬 베타")}　·　${formatDate(post.createdAt,{time:true})}</div>${dueDate?`<div class="due-banner"><div><small style="color:var(--blue)">▦　보고서 제출 기한</small><b>${formatDate(post.dueAt,{time:true})}까지</b></div><span class="dday">${getDday(post.dueAt)}</span></div>`:""}${getSafeImage(post.image)?`<img class="hero-image" src="${getSafeImage(post.image)}" alt="게시글 첨부 이미지">`:""}<div class="article-body">${escapeHtml(post.body)}</div>${post.attachments&&post.attachments.length?post.attachments.map(file=>`<div class="attachment"><span>▤　${escapeHtml(file)}</span><span style="color:var(--muted)">첨부 파일</span></div>`).join(""):""}<div class="detail-actions"><span>수업 관련 질문은 담당 선생님께 문의해 주세요.</span><span>♧　☆</span></div></article><aside class="right-stack">${post.subject?`<section class="card side-card"><h2>수행평가 한눈에 보기</h2><p>과목 <b style="float:right;color:var(--ink)">${escapeHtml(post.subject)}</b></p><p>대상 <b style="float:right;color:var(--ink)">${escapeHtml(post.audience||"전체")}</b></p><p>제출 방식 <b style="float:right;color:var(--ink)">${escapeHtml(post.sourceName||"게시글 확인")}</b></p><button class="outline" data-go="timetable">▦　내 수행평가 일정 보기</button></section>`:""}<section class="card side-card"><h2>원문 정보</h2><div class="source-row"><span class="source-dot">↗</span>${escapeHtml(post.sourceName||"학생 등록")}</div><p>이 정보는 ${escapeHtml(post.origin||"기기 내 등록")}된 내용입니다. 자세한 사항은 원문 또는 작성자에게 확인해 주세요.</p>${getSafeUrl(post.sourceUrl)?`<a class="primary" style="display:inline-block;margin:3px 0" href="${escapeHtml(getSafeUrl(post.sourceUrl))}" target="_blank" rel="noreferrer">↗ 원문 보기</a>`:`<span class="tag orange">로컬 베타 게시글</span>`}<p>등록 일시 ${formatDate(post.createdAt,{time:true})}</p></section><section class="card side-card blue-panel"><span style="font-size:17px;color:var(--blue)">◷</span><h2 style="margin-top:8px">정보가 달라졌나요?</h2><p>잘못된 일정이나 내용을 발견하면 작성자에게 알려 주세요.</p></section>${related.length?`<section class="card side-card"><h2>함께 보면 좋은 정보</h2>${related.map(item=>`<div class="upcoming-item" data-post-id="${escapeHtml(item.id)}"><button class="subtle-link" data-open-related="${escapeHtml(item.id)}">${escapeHtml(item.title)}　›</button></div>`).join("")}</section>`:""}</aside></div>`;
    detail.querySelector("#backToSearch").addEventListener("click", () => showView("search"));
    detail.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click",()=>showView(button.dataset.go)));
    detail.querySelectorAll("[data-open-related]").forEach(button=>button.addEventListener("click",()=>showDetail(button.dataset.openRelated)));
    showView("detail");
  }
  function resetSearch() { document.getElementById("searchInput").value="";selectedCategory="전체";document.querySelectorAll("#categoryRow .chip").forEach(button=>button.classList.toggle("active",button.dataset.category==="전체"));renderPostList(); }
  function showToast(message) { const toast=document.getElementById("toast");toast.textContent=message;toast.classList.remove("page-hidden");window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>toast.classList.add("page-hidden"),2600); }
  function addCourse() {
    if (!currentUser) { showToast("시간표를 계정에 저장하려면 로그인해 주세요."); openAuthDialog(); return; }
    const input=document.getElementById("courseInput");const subject=input.value.trim();const day=Number(document.getElementById("dayInput").value);const period=Number(document.getElementById("periodInput").value);
    if(!subject){showToast("과목 이름을 입력해 주세요.");input.focus();return;}
    const existing=timetable.find(item=>item.day===day&&item.period===period);
    if(existing&&(!selectedSlot||selectedSlot.day!==day||selectedSlot.period!==period)){showToast(`${DAYS[day]}요일 ${period}교시에 ${existing.subject}이(가) 이미 있어요.`);return;}
    if(existing)existing.subject=subject;else timetable.push({day,period,subject});
    if(saveValue(STORAGE_KEYS.timetable,timetable)){input.value="";selectedSlot=null;document.getElementById("addCourseButton").textContent="과목 추가";document.getElementById("deleteCourseButton").classList.add("page-hidden");renderTimetable();renderUpcoming();syncUserData().then(()=>showToast("내 시간표를 클라우드에 저장했어요.")).catch(()=>showToast("시간표를 클라우드에 저장하지 못했습니다."));}
  }
  function deleteSelectedCourse() {
    if (!currentUser) { showToast("시간표를 계정에 저장하려면 로그인해 주세요."); openAuthDialog(); return; }
    if(!selectedSlot)return;
    timetable=timetable.filter(item=>item.day!==selectedSlot.day||item.period!==selectedSlot.period);
    if(saveValue(STORAGE_KEYS.timetable,timetable)){selectedSlot=null;document.getElementById("courseInput").value="";document.getElementById("addCourseButton").textContent="과목 추가";document.getElementById("deleteCourseButton").classList.add("page-hidden");renderTimetable();renderUpcoming();syncUserData().then(()=>showToast("시간표에서 과목을 삭제했어요.")).catch(()=>showToast("시간표 변경을 클라우드에 저장하지 못했습니다."));}
  }
  function openProfileEditor() {
    if (!currentUser) { showToast("로그인한 뒤 이름과 학번을 설정할 수 있어요."); openAuthDialog(); return; }
    document.getElementById("modalRoot").innerHTML=`<div class="modal-backdrop" id="modalBackdrop"><section class="modal"><h2>내 이름·학번 설정</h2><p>저장한 정보는 이 계정에 연결되어 다른 기기에서도 사용할 수 있어요.</p><div class="field" style="margin:12px 0"><label for="editName">이름 *</label><input id="editName" value="${escapeHtml(profile.name)}" maxlength="20" autocomplete="name" required></div><div class="field" style="margin:0 0 12px"><label for="editStudentId">학번 *</label><input id="editStudentId" value="${escapeHtml(profile.studentId)}" maxlength="20" inputmode="numeric" autocomplete="off" placeholder="예: 2307" required></div><p class="profile-privacy-note">학번은 본인 계정에서만 보이며 게시글에는 표시되지 않아요. 전체 백업 파일에는 포함됩니다.</p><div class="form-grid" style="grid-template-columns:1fr 1fr;margin:0"><div class="field"><label for="editGrade">학년</label><select id="editGrade">${[1,2,3].map(grade=>`<option ${profile.grade===`${grade}학년`?"selected":""}>${grade}학년</option>`).join("")}</select></div><div class="field"><label for="editClass">반</label><input id="editClass" value="${escapeHtml(profile.className.replace("반", ""))}" maxlength="3" inputmode="numeric" required></div></div><div class="modal-actions"><button class="outline" id="cancelProfile" type="button">취소</button><button class="primary" id="saveProfile" type="button">저장</button></div></section></div>`;
    document.getElementById("cancelProfile").addEventListener("click",()=>document.getElementById("modalRoot").innerHTML="");
    document.getElementById("modalBackdrop").addEventListener("click",event=>{if(event.target.id==="modalBackdrop")document.getElementById("modalRoot").innerHTML="";});
    document.getElementById("saveProfile").addEventListener("click",async()=>{
      const name=document.getElementById("editName").value.trim();
      const studentId=document.getElementById("editStudentId").value.trim();
      const classValue=document.getElementById("editClass").value.trim();
      if(!name||!studentId||!classValue){showToast("이름, 학번, 반을 모두 입력해 주세요.");return;}
      if(studentId.length>20){showToast("학번은 20자 이내로 입력해 주세요.");return;}
      const saveButton=document.getElementById("saveProfile");
      saveButton.disabled=true;saveButton.textContent="저장 중…";
      const nextProfile=normalizeProfile({name,studentId,grade:document.getElementById("editGrade").value,className:`${classValue}반`});
      try {
        const {error}=await supabaseClient.from("profiles").upsert({user_id:currentUser.id,profile:nextProfile},{onConflict:"user_id"});
        if(error)throw error;
        profile=nextProfile;
        const localSaved=saveValue(profileStorageKey(currentUser.id),profile);
        document.getElementById("modalRoot").innerHTML="";
        renderTimetable();
        showToast(localSaved?"이름과 학번을 계정에 저장했어요.":"계정에는 저장했지만 이 기기 저장에 실패했어요.");
      } catch(error) {
        saveButton.disabled=false;saveButton.textContent="저장";
        showToast("프로필을 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
      }
    });
  }
  async function readImages(files) {
    const selected=[...files];
    if(selected.length+attachedImages.length>3){showToast("이미지는 최대 3장까지 첨부할 수 있어요.");return;}
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
  function resetForm() { document.getElementById("postForm").reset();attachedImages=[];renderFileList(); }
  async function uploadPostImage(file, postId) {
    if (!currentUser) throw new Error("로그인이 필요합니다.");
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = currentUser.id + "/" + postId + "/image." + extension;
    const result = await supabaseClient.storage.from("post-images").upload(path, file, {contentType:file.type, upsert:true});
    if (result.error) throw result.error;
    return supabaseClient.storage.from("post-images").getPublicUrl(path).data.publicUrl;
  }
  async function submitPost(event) {
    event.preventDefault();
    if (!currentUser) { showToast("여러 기기에서 공유하려면 먼저 로그인해 주세요."); openAuthDialog(); return; }
    const title=document.getElementById("postTitle").value.trim();const body=document.getElementById("postBody").value.trim();
    if(!title||!body){showToast("제목과 내용을 모두 입력해 주세요.");return;}
    const label=document.getElementById("postCategory").value;
    const category=label==="학교 공지"?"official":label==="수행평가"?"assessment":label==="가정통신문"?"family":"event";
    const subject=document.getElementById("postSubject").value;
    const dueInput=document.getElementById("postDue").value;
    const id = "post-" + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2));
    try {
      const image = attachedImages[0] ? await uploadPostImage(attachedImages[0], id) : "";
      const newPost={id,category,categoryLabel:label,title,body,author:profile.name,createdAt:new Date().toISOString(),subject,audience:document.getElementById("postAudience").value,dueAt:dueInput?new Date(dueInput).toISOString():"",sourceName:"학생 등록",sourceUrl:"",origin:"직접 등록",image,attachments:attachedImages.slice(1).map(item=>item.name)};
      const result = await supabaseClient.from("posts").insert({id, user_id:currentUser.id, post:newPost});
      if (result.error) throw result.error;
      posts.unshift(newPost);
      saveValue(STORAGE_KEYS.posts,posts);
      resetForm();renderUpcoming();renderPostList();showView("search");showToast("정보를 등록해 모든 기기와 공유했어요.");
    } catch (error) {
      showToast("등록에 실패했어요. Supabase 테이블과 Storage 정책을 확인해 주세요.");
    }
  }
  function exportBackup() {
    const payload = {
      app: "SIFS",
      version: 2,
      exportedAt: new Date().toISOString(),
      posts,
      timetable,
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
    }));
  }
  function validateBackup(data) {
    if (!data || data.app !== "SIFS" || data.version !== 2) throw new Error("지원하지 않는 전체 백업 형식입니다.");
    const importedPosts = normalizeImportedPosts(data.posts);
    if (!Array.isArray(data.timetable)) throw new Error("시간표 데이터 형식이 올바르지 않습니다.");
    const slots = new Set();
    const importedTimetable = data.timetable.map(item => {
      if (!item || !Number.isInteger(item.day) || item.day < 1 || item.day > 5 || !Number.isInteger(item.period) || item.period < 1 || item.period > 7 || typeof item.subject !== "string" || !item.subject.trim()) {
        throw new Error("시간표 데이터 형식이 올바르지 않습니다.");
      }
      const slot = item.day + "-" + item.period;
      if (slots.has(slot)) throw new Error("시간표에 중복된 교시가 있습니다.");
      slots.add(slot);
      return {day:item.day, period:item.period, subject:item.subject.trim()};
    });
    const importedProfile = data.profile;
    if (!importedProfile || typeof importedProfile.name !== "string" || !importedProfile.name.trim() || typeof importedProfile.grade !== "string" || !importedProfile.grade.trim() || typeof importedProfile.className !== "string" || !importedProfile.className.trim() || (importedProfile.studentId !== undefined && typeof importedProfile.studentId !== "string")) {
      throw new Error("프로필 데이터 형식이 올바르지 않습니다.");
    }
    const importedStudentId = typeof importedProfile.studentId === "string" ? importedProfile.studentId.trim() : "";
    if (importedStudentId.length > 20) throw new Error("학번은 20자 이내여야 합니다.");
    return {
      posts: importedPosts,
      timetable: importedTimetable,
      profile: {
        name: importedProfile.name.trim(),
        studentId: importedStudentId,
        grade: importedProfile.grade.trim(),
        className: importedProfile.className.trim()
      }
    };
  }
  function saveFullBackup(backup) {
    const savedProfileKey = profileStorageKey(currentUser?.id || "");
    const values = {
      [STORAGE_KEYS.posts]: backup.posts,
      [STORAGE_KEYS.timetable]: backup.timetable,
      [savedProfileKey]: backup.profile
    };
    const previous = Object.keys(values).map(key => [key, localStorage.getItem(key)]);
    try {
      [STORAGE_KEYS.timetable, savedProfileKey, STORAGE_KEYS.posts].forEach(key => {
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
    posts = backup.posts;
    timetable = backup.timetable;
    profile = backup.profile;
    renderTimetable();
    renderUpcoming();
    renderPostList();
    showToast("게시글, 시간표, 프로필을 복원했어요.");
    if (currentUser) syncUserData().then(() => publishLocalPosts()).then(() => loadCloudPosts()).catch(() => showToast("백업은 이 기기에 복원했지만 클라우드 동기화에 실패했습니다."));
    return true;
  }
  async function importBackup(file) {
    try {
      const data = JSON.parse(await file.text());
      const isFullBackup = !Array.isArray(data) && data && data.app === "SIFS" && data.version === 2;
      if (isFullBackup) {
        const backup = validateBackup(data);
        const confirmed = window.confirm(
          "전체 백업을 복원할까요?\n게시글 " + backup.posts.length + "개, 시간표 " + backup.timetable.length + "개, 프로필 1개가 적용됩니다.\n현재 이 기기의 게시글, 시간표, 프로필은 백업 내용으로 교체됩니다."
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
      if (saveValue(STORAGE_KEYS.posts, posts)) {
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
  function handleNavigation(event) {
    const viewButton=event.target.closest("[data-view]");const goButton=event.target.closest("[data-go]");
    if(viewButton)showView(viewButton.dataset.view);else if(goButton)showView(goButton.dataset.go);
  }
  function mergePostLists(...lists) {
    const byId = new Map();
    lists.flat().forEach(post => { if (post && post.id) byId.set(post.id, post); });
    return [...byId.values()];
  }
  async function loadCloudPosts() {
    if (!supabaseClient) return false;
    const {data, error} = await supabaseClient.from("posts").select("id,post").order("created_at", {ascending:false});
    if (error) { showToast("Supabase 설정 SQL을 실행한 뒤 새로고침해 주세요."); return false; }
    const remotePosts = (data || []).map(row => row.post).filter(Boolean);
    posts = mergePostLists(DEFAULT_POSTS, posts, remotePosts);
    saveValue(STORAGE_KEYS.posts, posts);
    renderPostList();renderUpcoming();
    return true;
  }
  async function syncUserData() {
    if (!currentUser || !supabaseClient) return;
    const profileResult = await supabaseClient.from("profiles").upsert({user_id:currentUser.id, profile}, {onConflict:"user_id"});
    if (profileResult.error) throw profileResult.error;
    const timetableResult = await supabaseClient.from("timetables").upsert({user_id:currentUser.id, items:timetable}, {onConflict:"user_id"});
    if (timetableResult.error) throw timetableResult.error;
  }
  async function publishLocalPosts() {
    if (!currentUser) return;
    const demoIds = new Set(DEFAULT_POSTS.map(post => post.id));
    const localPosts = posts.filter(post => !demoIds.has(post.id) && !post.id.startsWith("post-"));
    if (!localPosts.length || !window.confirm("이 기기에만 저장된 게시글 " + localPosts.length + "개를 학교 공용 피드에 올릴까요? 게시글 내용과 첨부 이미지를 다른 사용자도 볼 수 있습니다.")) return;
    for (const localPost of localPosts) {
      const existing = await supabaseClient.from("posts").select("id").eq("id", localPost.id).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) continue;
      let post = {...localPost};
      if (/^data:image\/(jpeg|png|webp);base64,/i.test(post.image || "")) {
        const blob = await (await fetch(post.image)).blob();
        const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        const path = currentUser.id + "/" + post.id + "/image." + extension;
        const upload = await supabaseClient.storage.from("post-images").upload(path, blob, {contentType:blob.type, upsert:true});
        if (upload.error) throw upload.error;
        post.image = supabaseClient.storage.from("post-images").getPublicUrl(path).data.publicUrl;
      }
      const inserted = await supabaseClient.from("posts").insert({id:post.id, user_id:currentUser.id, post});
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
    if (timetableResult.data) timetable = timetableResult.data.items;
    if (!profileResult.data || !timetableResult.data) await syncUserData();
    saveValue(profileStorageKey(currentUser.id), profile);
    saveValue(STORAGE_KEYS.timetable, timetable);
    renderTimetable();renderUpcoming();
  }
  function subscribeToCloudPosts() {
    if (!supabaseClient) return;
    if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = supabaseClient.channel("sifs-posts-feed").on("postgres_changes", {event:"*", schema:"public", table:"posts"}, payload => {
      if (payload.eventType === "DELETE") posts = posts.filter(post => post.id !== payload.old.id);
      else if (payload.new && payload.new.post) posts = mergePostLists(posts, [payload.new.post]);
      saveValue(STORAGE_KEYS.posts, posts);
      renderPostList();renderUpcoming();
    }).subscribe();
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
      if (!await loadCloudPosts()) return;
      await publishLocalPosts();
      await loadCloudPosts();
      await loadUserData();
      subscribeToCloudPosts();
      showToast("로그인했어요. 이 계정으로 기기 간 동기화가 됩니다.");
    } catch (error) {
      showToast("계정 데이터를 불러오지 못했습니다. Supabase 설정을 확인해 주세요.");
    }
  }
  async function initializeApp() {
    const date=new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"long"}).format(new Date());document.getElementById("todayLabel").textContent=date;
    document.querySelectorAll(".nav button[data-view]").forEach(button=>button.addEventListener("click",()=>showView(button.dataset.view)));
    document.querySelectorAll("[data-go]").forEach(button=>button.addEventListener("click",()=>showView(button.dataset.go)));
    document.getElementById("searchForm").addEventListener("submit",event=>{event.preventDefault();renderPostList();});
    document.getElementById("searchInput").addEventListener("input",renderPostList);
    document.querySelectorAll("#filterRow [data-query]").forEach(button=>button.addEventListener("click",()=>{document.getElementById("searchInput").value=button.dataset.query;renderPostList();}));
    document.querySelectorAll("#categoryRow [data-category]").forEach(button=>button.addEventListener("click",()=>{selectedCategory=button.dataset.category;document.querySelectorAll("#categoryRow .chip").forEach(item=>item.classList.toggle("active",item===button));renderPostList();}));
    document.getElementById("sortSelect").addEventListener("change",renderPostList);
    document.getElementById("addCourseButton").addEventListener("click",addCourse);
    document.getElementById("courseInput").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();addCourse();}});
    document.querySelectorAll("[data-edit-profile]").forEach(button=>button.addEventListener("click",openProfileEditor));
    document.getElementById("deleteCourseButton").addEventListener("click",deleteSelectedCourse);
    document.getElementById("postForm").addEventListener("submit",submitPost);
    document.getElementById("imageInput").addEventListener("change",event=>readImages(event.target.files));
    document.getElementById("postAudience").addEventListener("change",event=>{if(event.target.value==="내가 선택한 과목"&&timetable.length===0)showToast("먼저 나의 학교생활에서 과목을 추가해 주세요.");});
    document.getElementById("importButton").addEventListener("click",()=>document.getElementById("importInput").click());
    document.getElementById("importInput").addEventListener("change",event=>{if(event.target.files[0])importBackup(event.target.files[0]);event.target.value="";});
    document.getElementById("exportButton").addEventListener("click",exportBackup);
    document.getElementById("authButton").addEventListener("click", async () => {
      if (!currentUser) { openAuthDialog(); return; }
      await supabaseClient.auth.signOut();
    });
    renderPostList();renderTimetable();renderUpcoming();
    if (!supabaseClient) { showToast("Supabase SDK를 불러오지 못했습니다."); return; }
    supabaseClient.auth.onAuthStateChange((event, session) => {
      const previousUserId = currentUser?.id;
      currentUser = session?.user || null;
      updateAuthButton();
      if (event === "SIGNED_IN" && currentUser && currentUser.id !== previousUserId) {
        profile = normalizeProfile(loadValue(profileStorageKey(currentUser.id), profileForUser(currentUser)));
        renderTimetable();
        window.setTimeout(() => finishCloudLogin(), 0);
      }
      if (event === "SIGNED_OUT") {
        if (realtimeChannel) { supabaseClient.removeChannel(realtimeChannel); realtimeChannel = null; }
        profile = normalizeProfile(loadValue(profileStorageKey(), {name:"김서연", studentId:"", grade:"2학년", className:"3반"}));
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
