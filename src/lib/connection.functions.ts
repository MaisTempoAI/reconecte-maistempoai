import { createServerFn } from "@tanstack/react-start";

import {
  mapStatusPayload,
  mapWebhookPayload,
  parseWebhookBody,
  validateConnectionInput,
  validateStatusInput,
  type ConnectionResult,
  type ConnectionStatus,
} from "./connection-helpers";

export type { ConnectionResult, ConnectionMode, DeviceType, ConnectionStatus } from "./connection-helpers";

export const requestConnection = createServerFn({ method: "POST" })
  .inputValidator(validateConnectionInput)
  .handler(async ({ data }): Promise<ConnectionResult> => {
    const url = process.env["RECONECTA_URL"] ?? "https://reconecta-quepasa.pkgaq6.easypanel.host/reconect";
    const user = process.env["RECONECTA_USER"] ?? "";
    const senha = process.env["RECONECTA_SENHA"] ?? "";
    const mode = data.device === "celular" ? "paircode" : "qr";

    let text: string;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user,
          senha,
          telefone: `55${data.phone}`,
          modo: mode,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      text = await res.text();
    } catch {
      return {
        kind: "error",
        erro: "falha_rede",
        mensagem: "Não foi possível falar com o servidor. Tente de novo em instantes.",
      };
    }

    return mapWebhookPayload(parseWebhookBody(text), mode);
  });

export const checkConnectionStatus = createServerFn({ method: "POST" })
  .inputValidator(validateStatusInput)
  .handler(async ({ data }): Promise<ConnectionStatus> => {
    const url = process.env["RECONECTA_URL"] ?? "https://reconecta-quepasa.pkgaq6.easypanel.host/reconect";
    const user = process.env["RECONECTA_USER"] ?? "";
    const senha = process.env["RECONECTA_SENHA"] ?? "";

    let text: string;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user,
          senha,
          telefone: `55${data.phone}`,
          acao: "status",
        }),
        signal: AbortSignal.timeout(30_000),
      });
      text = await res.text();
    } catch {
      return { connected: false, error: "falha_rede" };
    }

    return mapStatusPayload(parseWebhookBody(text));
  });
