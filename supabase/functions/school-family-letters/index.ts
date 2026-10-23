// @ts-ignore Shared parser is plain JavaScript so the same code can run in local preview.
import { FAMILY_LETTERS_BOARD_URL, SCHOOL_NAME, fetchLatestFamilyLetters } from "../_shared/seohyun-notices.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=1800" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  try {
    return jsonResponse(await fetchLatestFamilyLetters());
  } catch (_error) {
    return jsonResponse({ error: "서현고 공식 가정통신문을 가져오지 못했습니다.", school: SCHOOL_NAME, sourceUrl: FAMILY_LETTERS_BOARD_URL }, 502);
  }
});
