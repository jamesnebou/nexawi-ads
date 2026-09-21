import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  hasValidQrAdminKey,
  normalizeQrTargetUrl,
} from "@/lib/qr-security";

export const runtime = "nodejs";

const RATE_LIMIT = {
  keyPrefix: "admin:qrcodes",
  limit: 120,
  windowMs: 60_000,
};

const ALLOWED_TYPES = new Set(["link", "wifi"]);
const ALLOWED_WIFI_SECURITY = new Set(["nopass", "WPA"]);

function isRateLimited(request: NextRequest) {
  return !checkRateLimit(request, RATE_LIMIT).allowed;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function GET(request: NextRequest) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Muitas requisicoes." }, { status: 429 });
  }

  if (!hasValidQrAdminKey(request.headers)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("qr_code_stats")
    .select(`
      id, name, slug, type, target_url, status, customer_name,
      location_name, campaign_name, created_at, updated_at,
      total_scans, scans_today, scans_7d, scans_30d, last_scan_at
    `)
    .is("empresa_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexawi.com.br";

  const items = data.map((item) => ({
    ...item,
    dynamic_url: `${siteUrl}/q/${item.slug}`,
  }));

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(request)) {
      return NextResponse.json({ error: "Muitas requisicoes." }, { status: 429 });
    }

    if (!hasValidQrAdminKey(request.headers)) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = await request.json();

    const name = String(body.name || "").trim();
    const type = String(body.type || "link").trim();
    const targetUrl = String(body.target_url || "").trim();

    const wifiSsid = String(body.wifi_ssid || "").trim();
    const wifiSecurity = String(body.wifi_security || "nopass").trim();
    const wifiPassword = String(body.wifi_password || "").trim();
    const wifiHidden = Boolean(body.wifi_hidden);
    const normalizedTargetUrl =
      type === "wifi" ? null : normalizeQrTargetUrl(targetUrl);

    if (!name) {
      return NextResponse.json(
        { error: "Nome é obrigatório." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        { error: "Tipo de QR Code invalido." },
        { status: 400 }
      );
    }

    if (type === "wifi" && !wifiSsid) {
      return NextResponse.json(
        { error: "Nome da rede Wi-Fi é obrigatório." },
        { status: 400 }
      );
    }

    if (type === "wifi" && !ALLOWED_WIFI_SECURITY.has(wifiSecurity)) {
      return NextResponse.json(
        { error: "Seguranca Wi-Fi invalida." },
        { status: 400 }
      );
    }

    if (type === "wifi" && wifiSecurity === "WPA" && !wifiPassword) {
      return NextResponse.json(
        { error: "Senha Wi-Fi obrigatoria para WPA." },
        { status: 400 }
      );
    }

    if (type !== "wifi" && !normalizedTargetUrl) {
      return NextResponse.json(
        { error: "Destino é obrigatório." },
        { status: 400 }
      );
    }

    const baseSlug = slugify(body.slug || name);
    const slug = baseSlug || randomUUID().slice(0, 8);

    const { data: existing } = await supabaseAdmin
      .from("qr_codes")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Esse slug já existe. Escolha outro." },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("qr_codes")
      .insert({
        name,
        slug,
        type,
        destination_type: type,
        target_url: normalizedTargetUrl,
        wifi_ssid: type === "wifi" ? wifiSsid : null,
        wifi_security: type === "wifi" ? wifiSecurity : null,
        wifi_password:
          type === "wifi" && wifiSecurity !== "nopass" ? wifiPassword : null,
        wifi_hidden: type === "wifi" ? wifiHidden : false,
        customer_name: body.customer_name || null,
        location_name: body.location_name || null,
        campaign_name: body.campaign_name || null,
        status: "active",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexawi.com.br";

    return NextResponse.json({
      qr_code: data,
      dynamic_url: `${siteUrl}/q/${data.slug}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao criar QR Code." },
      { status: 500 }
    );
  }
}
