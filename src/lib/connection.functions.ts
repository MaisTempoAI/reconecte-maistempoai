import { createServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";

import {
  pickString,
  randomPairCode,
  validateConnectionInput,
  type ConnectionResult,
} from "./connection-helpers";

export type { ConnectionResult, DeviceType } from "./connection-helpers";

export const requestConnection = createServerFn({ method: "POST" })
  .inputValidator(validateConnectionInput)
  .handler(async ({ data }): Promise<ConnectionResult> => {
    const QR_DEFAULT =
      "https://n8n-stack-prod-n8n.pkgaq6.easypanel.host/webhook/reconecta-qr?chave=mtq2026reconecta";
    const base = process.env["WHATSAPP_WEBHOOK_URL"] ?? QR_DEFAULT;
    const pairBase = process.env["WHATSAPP_PAIRCODE_WEBHOOK_URL"] ?? null;
    const endpoint = data.device === "celular" ? pairBase : base;
    const fullNumber = `55${data.phone}`;

    if (endpoint) {
      const url = new URL(endpoint);
      url.searchParams.set("telefone", fullNumber);
      url.searchParams.set("number", fullNumber);
      url.searchParams.set("device", data.device);
      url.searchParams.set("mode", data.device === "celular" ? "paircode" : "qrcode");

      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok) {
        throw new Error(`Falha ao contatar o servidor de conexão (${res.status}).`);
      }
      const text = await res.text();
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(text) as Record<string, unknown>;
      } catch {
        payload = { qrcode: text.trim() };
      }

      const pair = pickString(payload, "pairCode", "pairingCode", "paircode", "code");
      if (data.device === "celular" && pair) {
        return {
          mode: "paircode",
          pairCode: pair.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8),
          expiresIn: 120,
          demo: false,
        };
      }

      const raw = pickString(payload, "qrcode", "qrCode", "base64", "qr", "image");
      if (raw) {
        const qrImage = raw.startsWith("data:")
          ? raw
          : /^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 256
            ? `data:image/png;base64,${raw.replace(/\s/g, "")}`
            : await QRCode.toDataURL(raw, { margin: 1, width: 512 });
        return { mode: "qrcode", qrImage, expiresIn: 120, demo: false };
      }

      throw new Error("O servidor não retornou um código de conexão válido.");
    }

    // Sem webhook configurado: modo demonstração para validar a experiência.
    if (data.device === "celular") {
      return { mode: "paircode", pairCode: randomPairCode(), expiresIn: 120, demo: true };
    }
    const qrImage = await QRCode.toDataURL(`maistempo.ai/demo/${fullNumber}/${Date.now()}`, {
      margin: 1,
      width: 512,
    });
    return { mode: "qrcode", qrImage, expiresIn: 120, demo: true };
  });
