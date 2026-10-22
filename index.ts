// @ts-ignore Shared parser is plain JavaScript for local preview and Supabase Edge Functions.
import { fetchSchoolInformation } from "../_shared/seohyun-school-data.mjs";

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
    return jsonResponse(await fetchSchoolInformation());
  } catch (_error) {
    return jsonResponse({ error: "서현고 공식 학사일정·급식 정보를 가져오지 못했습니다." }, 502);
  }
});