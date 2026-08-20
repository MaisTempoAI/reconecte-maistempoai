import { createServerFn } from "@tanstack/react-start";

import {
  mapWebhookPayload,
  parseWebhookBody,
  validateConnectionInput,
  type ConnectionResult,
} from "./connection-helpers";

export type { ConnectionResult, ConnectionMode, DeviceType } from "./connection-helpers";

export const requestConnection = createServerFn({ method: "POST" })
  .inputValidator(validateConnectionInput)
  .handler(async ({ data }): Promise<ConnectionResult> => {
    const base =
      process.env["WHATSAPP_WEBHOOK_URL"] ??
      "https://n8n-stack-prod-n8n.pkgaq6.easypanel.host/webhook/reconecta-qr";
    const chave = process.env["WHATSAPP_WEBHOOK_KEY"] ?? "mtq2026reconecta";
    const mode = data.device === "celular" ? "paircode" : "qr";

    const url = new URL(base);
    url.searchParams.set("telefone", `55${data.phone}`);
    url.searchParams.set("chave", chave);
    url.searchParams.set("modo", mode);

    let text: string;
    try {
      const res = await fetch(url.toString(), { method: "GET" });
      text = await res.text();
    } catch {
      return {
        kind: "error",
        erro: "falha_rede",
        mensagem: "Não foi possível falar com o servidor. Tente de novo.",
      };
    }

    return mapWebhookPayload(parseWebhookBody(text), mode);
  });
