import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeQrTargetUrl } from "@/lib/qr-security";

export const runtime = "nodejs";

const ALLOWED_CHANNELS = new Set(["qr", "nfc"]);
const BOT_PATTERN = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegrambot|slackbot/i;

function hashVisitor(ip: string, userAgent: string) {
  const salt = String(process.env.QR_HASH_SALT || "").trim();
  if (!salt) return null;

  const day = new Date().toISOString().slice(0, 10);
  return crypto
    .createHash("sha256")
    .update(`${ip}:${userAgent}:${day}:${salt}`)
    .digest("hex");
}

function inactiveRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL("/qr/inativo", request.url), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string; channel: string }> }
) {
  const { token, channel } = await context.params;

  if (!ALLOWED_CHANNELS.has(channel)) return inactiveRedirect(request);

  const { data: qrCode, error } = await supabaseAdmin
    .from("qr_codes")
    .select("id, slug, type, destination_type, target_url, status, empresa_id, public_token")
    .eq("public_token", token)
    .maybeSingle();

  if (error || !qrCode || qrCode.status !== "active") {
    return inactiveRedirect(request);
  }

  const { data: asset, error: assetError } = await supabaseAdmin
    .from("qr_assets")
    .select("id, status")
    .eq("qr_code_id", qrCode.id)
    .maybeSingle();

  if (assetError || !asset || ["inactive", "replaced"].includes(asset.status)) {
    return inactiveRedirect(request);
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "";
  const visitorHash = hashVisitor(ip, userAgent);

  const { error: scanError } = await supabaseAdmin.from("qr_scans").insert({
    qr_code_id: qrCode.id,
    empresa_id: qrCode.empresa_id,
    asset_id: asset?.id || null,
    channel,
    ip_hash: visitorHash,
    visitor_hash: visitorHash,
    user_agent: userAgent,
    referrer: request.headers.get("referer") || "",
    bot_detected: BOT_PATTERN.test(userAgent),
  });

  if (scanError) {
    console.error("Falha ao registrar acesso QR/NFC:", scanError.message);
  }

  if (qrCode.type === "wifi" || qrCode.destination_type === "wifi") {
    return NextResponse.redirect(new URL(`/q/${qrCode.slug}/wifi`, request.url), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const targetUrl = normalizeQrTargetUrl(qrCode.target_url);
  if (!targetUrl) return inactiveRedirect(request);

  return NextResponse.redirect(new URL(targetUrl, request.url), {
    headers: { "Cache-Control": "no-store" },
  });
}
