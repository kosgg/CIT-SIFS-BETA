export const SCHOOL_NAME = "서현고등학교";
export const BOARD_URL = "https://seohyun-h.goesn.kr/seohyun-h/na/ntt/selectNttList.do?bbsId=15547&mi=19943";
const BOARD_ORIGIN = "https://seohyun-h.goesn.kr";
const CACHE_TTL_MS = 30 * 60 * 1000;

let cachedPayload = null;
let cachedAt = 0;

function decodeHtml(value) {
  const named = value
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&middot;/gi, "·")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&hellip;/gi, "…");
  return named.replace(/&#x([0-9a-f]+);/gi, (_match, hex) => {
    const codePoint = Number.parseInt(hex, 16);
    return codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
      ? String.fromCodePoint(codePoint)
      : "";
  }).replace(/&#(\d+);/g, (_match, decimal) => {
    const codePoint = Number.parseInt(decimal, 10);
    return codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
      ? String.fromCodePoint(codePoint)
      : "";
  });
}

function textContent(markup) {
  return decodeHtml(markup.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function attribute(markup, name) {
  const expression = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = markup.match(expression);
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function parseDate(value) {
  const match = value.match(/(20\d{2})[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 3));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function hash(value) {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return (result >>> 0).toString(36);
}

function articleUrl(href, row, linkId) {
  try {
    const candidate = new URL(href, BOARD_URL);
    if (candidate.protocol === "https:" && candidate.origin === BOARD_ORIGIN && /selectNttInfo\.do/i.test(candidate.pathname)) {
      return candidate.href;
    }
  } catch (_error) {}
  const rowId = linkId.match(/^\d+$/)?.[0] || row.match(/\b(?:nttSn|data-id)\s*[:=]\s*['"]?(\d+)/i)?.[1];
  if (rowId) {
    const detail = new URL("/seohyun-h/na/ntt/selectNttInfo.do", BOARD_ORIGIN);
    detail.searchParams.set("mi", "19943");
    detail.searchParams.set("bbsId", "15547");
    detail.searchParams.set("nttSn", rowId);
    return detail.href;
  }
  return BOARD_URL;
}

export function parseNotices(html) {
  const safeHtml = html.replace(/<!--[^]*?-->/g, " ").replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, " ");
  const notices = [];
  const seen = new Set();

  for (const rowMatch of safeHtml.matchAll(/<tr\b[^>]*>([^]*?)<\/tr\s*>/gi)) {
    const row = rowMatch[1];
    const cells = [...row.matchAll(/<td\b[^>]*>([^]*?)<\/td\s*>/gi)].map(match => textContent(match[1]));
    if (cells.length < 2) continue;

    const links = [...row.matchAll(/<a\b([^>]*)>([^]*?)<\/a\s*>/gi)].map(match => ({
      title: textContent(match[2]),
      href: attribute(match[1], "href"),
      id: attribute(match[1], "data-id"),
    }));
    const titleLink = links.find(link => link.title.length > 1 && !/^(첨부|파일|새글|댓글|이전|다음|보기)$/i.test(link.title));
    const title = (titleLink?.title || cells[1] || "").replace(/\s+/g, " ").trim();
    const dateIndex = cells.findIndex(cell => /20\d{2}[./-]\s*\d{1,2}[./-]\s*\d{1,2}/.test(cell));
    const createdAt = dateIndex >= 0 ? parseDate(cells[dateIndex]) : null;
    if (!title || !createdAt || title.length < 2) continue;

    const author = dateIndex > 1 ? cells[dateIndex - 1] : "학교";
    const url = articleUrl(titleLink?.href || "", row, titleLink?.id || "");
    const articleId = new URL(url).searchParams.get("nttSn") || cells[0]?.match(/\d+/)?.[0] || hash(`${createdAt}:${title}`);
    const key = `${articleId}:${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    notices.push({
      id: `seohyun-${articleId}`,
      title: title.slice(0, 180),
      author: (author || "학교").slice(0, 80),
      createdAt,
      url,
    });
    if (notices.length >= 20) break;
  }
  return notices;
}

export async function fetchLatestNotices() {
  if (cachedPayload && Date.now() - cachedAt < CACHE_TTL_MS) return cachedPayload;

  const response = await fetch(BOARD_URL, {
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.7",
      "User-Agent": "Mozilla/5.0 (compatible; SIFS school notice reader)",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`School site returned ${response.status}`);
  const html = await response.text();
  if (html.length > 5_000_000) throw new Error("School notice page is too large");
  const notices = parseNotices(html);
  if (!notices.length) throw new Error("No public notice rows could be parsed");

  cachedPayload = { school: SCHOOL_NAME, sourceUrl: BOARD_URL, fetchedAt: new Date().toISOString(), notices };
  cachedAt = Date.now();
  return cachedPayload;
}
