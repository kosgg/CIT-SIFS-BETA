import { SCHOOL_NAME } from "./seohyun-notices.mjs";

const SCHOOL_ORIGIN = "https://seohyun-h.goesn.kr";
export const SCHOOL_SCHEDULE_URL = `${SCHOOL_ORIGIN}/seohyun-h/ps/schdul/selectSchdulMainList.do?mi=19746`;
export const SCHOOL_FOOD_URL = `${SCHOOL_ORIGIN}/seohyun-h/ad/fm/foodmenu/selectFoodMenuView.do?mi=19760`;
const SCHOOL_SCHEDULE_LIST_URL = `${SCHOOL_ORIGIN}/seohyun-h/ps/schdul/selectSchdulList.do?mi=19746`;
const CACHE_TTL_MS = 30 * 60 * 1000;
const scheduleCache = new Map();
let mealsCache = null;

function decodeNumericEntity(value, radix) {
  const codePoint = Number.parseInt(value, radix);
  return codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
    ? String.fromCodePoint(codePoint)
    : "";
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&middot;/gi, "·")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => decodeNumericEntity(hex, 16))
    .replace(/&#(\d+);/g, (_match, decimal) => decodeNumericEntity(decimal, 10));
}

function textContent(markup) {
  return decodeHtml(markup.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function lineContent(markup) {
  return decodeHtml(markup
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li)\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " "))
    .replace(/\r/g, "")
    .split("\n")
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function attribute(markup, name) {
  const expression = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = markup.match(expression);
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function seoulYear() {
  return Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric" }).format(new Date()));
}

function normalizeSlashDate(value) {
  const match = value.match(/^(20\d{2})\/(\d{2})\/(\d{2})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function daysBetween(left, right) {
  return (Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) / 86400000;
}

function mergeAdjacentScheduleEvents(events) {
  const byTitle = new Map();
  for (const event of events) {
    if (!byTitle.has(event.title)) byTitle.set(event.title, []);
    byTitle.get(event.title).push(event);
  }

  const merged = [];
  for (const [title, group] of byTitle) {
    group.sort((a, b) => a.startDate.localeCompare(b.startDate));
    for (const event of group) {
      const previous = merged.findLast(item => item.title === title);
      if (previous && daysBetween(event.startDate, previous.endDate) <= 3) {
        if (event.endDate > previous.endDate) previous.endDate = event.endDate;
        previous.ids.push(event.id);
      } else {
        merged.push({ ...event, ids: [event.id] });
      }
    }
  }
  return merged.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));
}

export function parseSchoolScheduleResponse(responseBody, year = seoulYear()) {
  let html = responseBody;
  try {
    const decoded = JSON.parse(responseBody);
    if (typeof decoded === "string") html = decoded;
    else if (typeof decoded?.html === "string") html = decoded.html;
  } catch (_error) {}

  const safeHtml = html.replace(/<!--[^]*?-->/g, " ").replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, " ");
  const events = [];
  const seen = new Set();
  for (const rowMatch of safeHtml.matchAll(/<tr\b[^>]*>([^]*?)<\/tr\s*>/gi)) {
    const row = rowMatch[1];
    const date = row.match(/viewSchdulInfo\(\s*['"](\d+)['"]\s*,\s*['"](20\d{2}\/\d{2}\/\d{2})['"]\s*,\s*['"](20\d{2}\/\d{2}\/\d{2})['"]/i);
    if (!date || Number(date[2].slice(0, 4)) !== year) continue;
    const link = [...row.matchAll(/<a\b([^>]*)>([^]*?)<\/a\s*>/gi)].find(match => /viewSchdulInfo/i.test(attribute(match[1], "href")));
    const title = textContent(link?.[2] || "");
    const startDate = normalizeSlashDate(date[2]);
    const endDate = normalizeSlashDate(date[3]);
    if (!title || !startDate || !endDate || startDate > endDate) continue;
    const id = date[1];
    const key = `${id}:${startDate}:${endDate}:${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({ id: `seohyun-calendar-${id}`, title: title.slice(0, 120), startDate, endDate });
  }
  return mergeAdjacentScheduleEvents(events);
}

export function parseSchoolMeals(html) {
  const safeHtml = html.replace(/<!--[^]*?-->/g, " ").replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, " ");
  const table = [...safeHtml.matchAll(/<table\b[^>]*>([^]*?)<\/table\s*>/gi)]
    .map(match => match[1])
    .find(markup => /주간식단안내/.test(textContent((markup.match(/<caption\b[^>]*>([^]*?)<\/caption\s*>/i) || [])[1] || "")));
  if (!table) return [];

  const headerRow = (table.match(/<thead\b[^>]*>[^]*?<tr\b[^>]*>([^]*?)<\/tr\s*>[^]*?<\/thead\s*>/i) || [])[1] || "";
  const dates = [...headerRow.matchAll(/(20\d{2}-\d{2}-\d{2})/g)].map(match => match[1]);
  if (!dates.length) return [];
  const days = dates.map(date => ({ date, meals: [] }));
  const body = (table.match(/<tbody\b[^>]*>([^]*?)<\/tbody\s*>/i) || [])[1] || table;

  for (const rowMatch of body.matchAll(/<tr\b[^>]*>([^]*?)<\/tr\s*>/gi)) {
    const row = rowMatch[1];
    const mealType = textContent((row.match(/<th\b[^>]*>([^]*?)<\/th\s*>/i) || [])[1] || "");
    if (!["조식", "중식", "석식"].includes(mealType)) continue;
    const cells = [...row.matchAll(/<td\b[^>]*>([^]*?)<\/td\s*>/gi)].map(match => match[1]);
    for (let index = 0; index < Math.min(days.length, cells.length); index++) {
      const lines = lineContent(cells[index]).filter(line => line !== "상세보기");
      const calories = lines.find(line => /\b\d+(?:\.\d+)?\s*Kcal\b/i.test(line)) || "";
      const items = lines.filter(line => !/\b\d+(?:\.\d+)?\s*Kcal\b/i.test(line));
      if (!items.length) continue;
      const allergenCodes = [...new Set(items.flatMap(item => [...item.matchAll(/\(([0-9.]+)\)/g)].flatMap(match => match[1].split("."))).filter(code => /^\d{1,2}$/.test(code)))].sort((a, b) => Number(a) - Number(b));
      days[index].meals.push({ type: mealType, calories, items, allergenCodes });
    }
  }
  return days;
}

export async function fetchSchoolSchedule(year = seoulYear()) {
  const cached = scheduleCache.get(year);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.payload;

  const form = new URLSearchParams({
    schdulSeq: "", schdulLevel: "Y", fromDate: "", toDate: "", date: "", weekNum: "", chkNP: "",
    srchDate: "", schType: "", schColor: "", srchYear: String(year), menuId: "19746",
  });
  const response = await fetch(SCHOOL_SCHEDULE_LIST_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.7",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": "Mozilla/5.0 (compatible; SIFS school schedule reader)",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: form.toString(),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`School schedule returned ${response.status}`);
  const body = await response.text();
  if (body.length > 3_000_000) throw new Error("School schedule page is too large");
  const events = parseSchoolScheduleResponse(body, year);
  if (!events.length) throw new Error("No public school schedule events could be parsed");
  const payload = { year, fetchedAt: new Date().toISOString(), sourceUrl: SCHOOL_SCHEDULE_URL, events };
  scheduleCache.set(year, { payload, cachedAt: Date.now() });
  return payload;
}

export async function fetchSchoolMeals() {
  if (mealsCache && Date.now() - mealsCache.cachedAt < CACHE_TTL_MS) return mealsCache.payload;
  const response = await fetch(SCHOOL_FOOD_URL, {
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.7",
      "User-Agent": "Mozilla/5.0 (compatible; SIFS school meal reader)",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`School food menu returned ${response.status}`);
  const html = await response.text();
  if (html.length > 5_000_000) throw new Error("School food menu page is too large");
  const days = parseSchoolMeals(html);
  if (!days.length) throw new Error("No public school food menu could be parsed");
  const payload = { fetchedAt: new Date().toISOString(), sourceUrl: SCHOOL_FOOD_URL, days };
  mealsCache = { payload, cachedAt: Date.now() };
  return payload;
}

export async function fetchSchoolInformation() {
  const year = seoulYear();
  const [scheduleResult, mealsResult] = await Promise.allSettled([
    fetchSchoolSchedule(year),
    fetchSchoolMeals(),
  ]);
  if (scheduleResult.status === "rejected" && mealsResult.status === "rejected") {
    throw new Error("Could not load official school information");
  }
  return {
    school: SCHOOL_NAME,
    fetchedAt: new Date().toISOString(),
    schedule: scheduleResult.status === "fulfilled" ? scheduleResult.value : null,
    meals: mealsResult.status === "fulfilled" ? mealsResult.value : null,
    errors: {
      schedule: scheduleResult.status === "rejected",
      meals: mealsResult.status === "rejected",
    },
  };
}