import { timingSafeEqual } from "node:crypto";

const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

export function hasValidQrAdminKey(headers: Headers) {
  const provided = String(headers.get("x-admin-key") || "");
  const configured = String(process.env.QR_ADMIN_KEY || "");

  if (!provided || !configured) return false;

  const providedBuffer = Buffer.from(provided, "utf8");
  const configuredBuffer = Buffer.from(configured, "utf8");

  if (providedBuffer.length !== configuredBuffer.length) return false;
  return timingSafeEqual(providedBuffer, configuredBuffer);
}

export function normalizeQrTargetUrl(value: unknown) {
  const target = String(value || "").trim();

  if (!target) return null;
  if (target.startsWith("/") && !target.startsWith("//")) return target;

  try {
    const parsed = new URL(target);
    return HTTP_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}
