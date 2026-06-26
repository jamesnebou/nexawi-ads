"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

function escapeWifiValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/:/g, "\\:");
}

export default function WifiQrBox({
  ssid,
  security,
  password,
  hidden,
}: {
  ssid: string;
  security: string;
  password: string;
  hidden: boolean;
}) {
  const [dataUrl, setDataUrl] = useState("");

  const payload = useMemo(() => {
    const safeSsid = escapeWifiValue(ssid);
    const safePassword = escapeWifiValue(password || "");
    const safeHidden = hidden ? "true" : "false";

    if (security === "nopass") {
      return `WIFI:T:nopass;S:${safeSsid};H:${safeHidden};;`;
    }

    return `WIFI:T:WPA;S:${safeSsid};P:${safePassword};H:${safeHidden};;`;
  }, [ssid, security, password, hidden]);

  useEffect(() => {
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 900,
    }).then(setDataUrl);
  }, [payload]);

  if (!dataUrl) {
    return (
      <div className="flex aspect-square items-center justify-center text-black">
        Gerando QR...
      </div>
    );
  }

  return (
    <div>
      <img src={dataUrl} alt="QR Code Wi-Fi" className="w-full" />
    </div>
  );
}