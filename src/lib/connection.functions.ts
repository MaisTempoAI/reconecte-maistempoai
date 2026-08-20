import { createServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";

export type DeviceType = "computador" | "celular";

export type ConnectionResult = {
  mode: "qrcode" | "paircode";
  /** data URL of the QR image (mode === "qrcode") */
  qrImage?: string;
  /** pairing code, already normalized (mode === "paircode") */
  pairCode?: string;
  /** seconds until the code expires */
  expiresIn: number;
  demo: boolean;
};

const validate = (input: { phone: string; device: DeviceType }) => {
  const digits = (input.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    throw new Error("Número inválido. Informe DDD + telefone (10 ou 11 dígitos).");
  }
  const device: DeviceType = input.device === "celular" ? "celular" : "computador";
  return { phone: digits, device };
};

function randomPairCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export const requestConnection = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }): Promise<ConnectionResult> => {
    const base = process.env["WHATSAPP_WEBHOOK_URL"];
    const pairBase = process.env["WHATSAPP_PAIRCODE_WEBHOOK_URL"] ?? base;
    const endpoint = data.device === "celular" ? pairBase : base;
    const fullNumber = `55${data.phone}`;

    if (endpoint) {
      const url = new URL(endpoint);
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

      const pick = (...keys: string[]) => {
        for (const k of keys) {
          const v = payload[k];
          if (typeof v === "string" && v.trim().length > 0) return v.trim();
        }
        return undefined;
      };

      const pair = pick("pairCode", "pairingCode", "paircode", "code");
      if (data.device === "celular" && pair) {
        return {
          mode: "paircode",
          pairCode: pair.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8),
          expiresIn: 120,
          demo: false,
        };
      }

      const raw = pick("qrcode", "qrCode", "base64", "qr", "image");
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
    const qrImage = await QRCode.toDataURL(
      `maistempo.ai/demo/${fullNumber}/${Date.now()}`,
      { margin: 1, width: 512 },
    );
    return { mode: "qrcode", qrImage, expiresIn: 120, demo: true };
  });
