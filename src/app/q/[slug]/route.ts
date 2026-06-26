import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function hashIp(ip: string) {
  const salt = process.env.QR_HASH_SALT || "nexawi";
  return crypto.createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  const { data: qrCode, error } = await supabaseAdmin
    .from("qr_codes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !qrCode || qrCode.status !== "active") {
    return NextResponse.redirect(new URL("/qr/inativo", request.url));
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "";
  const referrer = request.headers.get("referer") || "";

  await supabaseAdmin.from("qr_scans").insert({
    qr_code_id: qrCode.id,
    ip_hash: hashIp(ip),
    user_agent: userAgent,
    referrer,
  });

  if (qrCode.type === "wifi") {
    return NextResponse.redirect(new URL(`/q/${slug}/wifi`, request.url));
  }

  if (!qrCode.target_url) {
    return NextResponse.redirect(new URL("/qr/inativo", request.url));
  }

  return NextResponse.redirect(new URL(qrCode.target_url, request.url));
}