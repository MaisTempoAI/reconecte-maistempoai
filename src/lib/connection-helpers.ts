export type DeviceType = "computador" | "celular";
export type ConnectionMode = "qr" | "paircode";

export type ConnectionResult =
  | { kind: "qr"; qrImage: string; validadeSegundos: number; mensagem?: string }
  | { kind: "paircode"; pairCode: string; validadeSegundos: number; mensagem?: string }
  | { kind: "connected"; mensagem: string }
  | { kind: "error"; erro: string; mensagem: string };

export type ConnectionStatus =
  | { connected: true; estado: string; quepasakey?: string; precisaNovoQr?: boolean }
  | { connected: false; estado?: string; error?: string; precisaNovoQr?: boolean };

export const validateConnectionInput = (input: { phone: string; device: DeviceType }) => {
  const digits = (input.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    throw new Error("Número inválido. Informe DDD + telefone (10 ou 11 dígitos).");
  }
  const device: DeviceType = input.device === "celular" ? "celular" : "computador";
  return { phone: digits, device };
};

export const validateStatusInput = (input: { phone: string }) => {
  const digits = (input.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    throw new Error("Número inválido.");
  }
  return { phone: digits };
};

export function pickString(payload: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

export function pickNumber(payload: Record<string, unknown>, key: string, fallback: number) {
  const v = payload[key];
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

export function parseWebhookBody(text: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(text);
    const obj = Array.isArray(parsed) ? parsed[0] : parsed;
    if (obj && typeof obj === "object") return obj as Record<string, unknown>;
  } catch {
    /* corpo não-JSON */
  }
  return {};
}

export function mapWebhookPayload(
  payload: Record<string, unknown>,
  mode: ConnectionMode,
): ConnectionResult {
  const mensagem = pickString(payload, "mensagem");

  if (payload["ok"] === false) {
    return {
      kind: "error",
      erro: pickString(payload, "erro") ?? "erro_desconhecido",
      mensagem: mensagem ?? "Não foi possível concluir a solicitação. Tente de novo.",
    };
  }

  if (payload["ja_conectado"] === true) {
    return {
      kind: "connected",
      mensagem: mensagem ?? "Este número já está conectado. Nada a fazer.",
    };
  }

  const qr = pickString(payload, "qrcode_base64");
  if (qr) {
    const clean = qr.replace(/\s/g, "");
    return {
      kind: "qr",
      qrImage: clean.startsWith("data:") ? clean : `data:image/png;base64,${clean}`,
      validadeSegundos: pickNumber(payload, "validade_segundos", 60),
      ...(mensagem ? { mensagem } : {}),
    };
  }

  const pair = pickString(payload, "paircode");
  if (pair) {
    return {
      kind: "paircode",
      pairCode: pair.toUpperCase(),
      validadeSegundos: pickNumber(payload, "validade_segundos", 180),
      ...(mensagem ? { mensagem } : {}),
    };
  }

  return {
    kind: "error",
    erro: "resposta_invalida",
    mensagem:
      mensagem ??
      (mode === "qr"
        ? "Não recebemos o QR Code. Tente de novo."
        : "Não recebemos o código de pareamento. Tente de novo."),
  };
}

export function mapStatusPayload(payload: Record<string, unknown>): ConnectionStatus {
  if (payload["ok"] === false) {
    return { connected: false, error: pickString(payload, "erro") ?? "erro_desconhecido" };
  }

  const conectado =
    payload["conectado"] === true || payload["estado"] === "conectado";
  const estado = pickString(payload, "estado") ?? (conectado ? "conectado" : "aguardando");
  const quepasakey = pickString(payload, "quepasakey");

  if (conectado) {
    return { connected: true, estado, ...(quepasakey ? { quepasakey } : {}) };
  }

  return { connected: false, estado };
}
