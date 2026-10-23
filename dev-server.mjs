import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { BOARD_URL, FAMILY_LETTERS_BOARD_URL, fetchLatestFamilyLetters, fetchLatestNotices } from "./supabase/functions/_shared/seohyun-notices.mjs";
import { fetchSchoolInformation } from "./supabase/functions/_shared/seohyun-school-data.mjs";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PORT = Number(process.env.SIFS_PREVIEW_PORT || 8765);
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;

  if (pathname === "/api/school-notices") {
    if (request.method !== "GET") {
      response.writeHead(405, { "Content-Type": "application/json; charset=utf-8", Allow: "GET" });
      response.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }
    try {
      const payload = await fetchLatestNotices();
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=1800" });
      response.end(JSON.stringify(payload));
    } catch (_error) {
      response.writeHead(502, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ error: "학교 공식 공지를 가져오지 못했습니다.", sourceUrl: BOARD_URL }));
    }
    return;
  }

  if (pathname === "/api/school-family-letters") {
    if (request.method !== "GET") {
      response.writeHead(405, { "Content-Type": "application/json; charset=utf-8", Allow: "GET" });
      response.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }
    try {
      const payload = await fetchLatestFamilyLetters();
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=1800" });
      response.end(JSON.stringify(payload));
    } catch (_error) {
      response.writeHead(502, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ error: "학교 공식 가정통신문을 가져오지 못했습니다.", sourceUrl: FAMILY_LETTERS_BOARD_URL }));
    }
    return;
  }

  if (pathname === "/api/school-information") {
    if (request.method !== "GET") {
      response.writeHead(405, { "Content-Type": "application/json; charset=utf-8", Allow: "GET" });
      response.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }
    try {
      const payload = await fetchSchoolInformation();
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=1800" });
      response.end(JSON.stringify(payload));
    } catch (_error) {
      response.writeHead(502, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ error: "서현고 공식 학사일정·급식 정보를 가져오지 못했습니다." }));
    }
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  let decodedPath;
  try { decodedPath = decodeURIComponent(pathname); }
  catch (_error) { response.writeHead(400); response.end("Bad request"); return; }
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const filePath = resolve(ROOT, relativePath);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (_error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`SIFS preview running at http://127.0.0.1:${PORT}/`);
});
