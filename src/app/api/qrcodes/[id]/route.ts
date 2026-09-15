import { NextRequest, NextResponse } from "next/server";
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
const ALLOWED_STATUSES = new Set(["active", "inactive"]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!checkRateLimit(request, RATE_LIMIT).allowed) {
    return NextResponse.json({ error: "Muitas requisicoes." }, { status: 429 });
  }

  if (!hasValidQrAdminKey(request.headers)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const updates: Record<string, string | null> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json(
        { error: "Nome nao pode ficar vazio." },
        { status: 400 }
      );
    }
    updates.name = name;
  }

  if (body.type !== undefined) {
    const type = String(body.type).trim();
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        { error: "Tipo de QR Code invalido." },
        { status: 400 }
      );
    }
    updates.type = type;
  }

  if (body.target_url !== undefined) {
    const targetUrl = normalizeQrTargetUrl(body.target_url);
    if (!targetUrl) {
      return NextResponse.json(
        { error: "Destino deve usar HTTP, HTTPS ou um caminho interno." },
        { status: 400 }
      );
    }
    updates.target_url = targetUrl;
  }

  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Status de QR Code invalido." },
        { status: 400 }
      );
    }
    updates.status = status;
  }
  if (body.customer_name !== undefined)
    updates.customer_name = body.customer_name
      ? String(body.customer_name).trim()
      : null;
  if (body.location_name !== undefined)
    updates.location_name = body.location_name
      ? String(body.location_name).trim()
      : null;
  if (body.campaign_name !== undefined)
    updates.campaign_name = body.campaign_name
      ? String(body.campaign_name).trim()
      : null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Nenhum campo valido para atualizar." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("qr_codes")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ qr_code: data });
}
