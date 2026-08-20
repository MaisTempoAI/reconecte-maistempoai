export type DeviceType = "computador" | "celular";

export type ConnectionResult = {
  mode: "qrcode" | "paircode" | "connected";
  /** mensagem do servidor (ex.: número já conectado) */
  message?: string;
  /** data URL of the QR image (mode === "qrcode") */
  qrImage?: string;
  /** pairing code, already normalized (mode === "paircode") */
  pairCode?: string;
  /** seconds until the code expires */
  expiresIn: number;
  demo: boolean;
};

export const validateConnectionInput = (input: { phone: string; device: DeviceType }) => {
  const digits = (input.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    throw new Error("Número inválido. Informe DDD + telefone (10 ou 11 dígitos).");
  }
  const device: DeviceType = input.device === "celular" ? "celular" : "computador";
  return { phone: digits, device };
};

export function randomPairCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function pickString(payload: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}
