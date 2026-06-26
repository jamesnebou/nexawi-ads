import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function checkAdmin(request: NextRequest) {
  const adminKey = request.headers.get("x-admin-key");
  return adminKey && adminKey === process.env.QR_ADMIN_KEY;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const updates: Record<string, string | null> = {};

  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.type !== undefined) updates.type = String(body.type).trim();
  if (body.target_url !== undefined)
    updates.target_url = String(body.target_url).trim();
  if (body.status !== undefined) updates.status = String(body.status).trim();
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