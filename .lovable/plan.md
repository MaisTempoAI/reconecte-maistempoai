# Verificação automática de conexão após o QR / pair code

Hoje o QR expira em 60s e mostra "QR Code expirado" mesmo quando a conexão deu certo. Vamos consultar o servidor a cada 3 segundos e mostrar a tela de sucesso assim que o número conectar.

## O que muda para o usuário

1. Logo que o QR (ou o código de pareamento) aparece, o app começa a perguntar ao servidor se o número já conectou.
2. Enquanto não conectar: o QR/código continua na tela com a legenda "Aguardando você escanear pelo celular..." e um spinner discreto. Nada mais expira automaticamente.
3. Quando conectar: para a consulta e mostra "Número conectado com sucesso!" e, menor, "quepasakey: ...".
4. Depois de ~2 minutos sem conectar: aviso leve "O QR pode ter expirado — gerar um novo?" com botão que gera outro QR/código e reinicia a verificação. O QR antigo permanece visível.

## Detalhes técnicos

- Nova server function `checkConnectionStatus` em `src/lib/connection.functions.ts` (mesmo molde de `requestConnection`): POST em `RECONECTA_URL` com `{ user, senha, telefone: "55"+digits, acao: "status" }`, credenciais lidas via `process.env` dentro do handler (nunca no cliente). As env vars já existentes no projeto são `RECONECTA_URL` / `RECONECTA_USER` / `RECONECTA_SENHA` — mantemos esses nomes e o fallback HTTPS atual.
- Mapeamento da resposta `{ ok, estado, conectado, quepasakey }` em `src/lib/connection-helpers.ts`, retornando `{ connected: boolean; estado: string; quepasakey?: string }`, ou `{ connected: false, error: "..." }` em falha de rede/JSON inválido.
- Em `src/routes/index.tsx`: `setInterval` de 3s iniciado quando `result.kind` é `qr` ou `paircode`, limpo ao conectar, ao gerar novo código, ao voltar/reset e no unmount. Nada de polling nos estados de erro/conectado.
- O contador de 60/180s deixa de bloquear o QR: vira apenas o gatilho do aviso "pode ter expirado" aos ~120s.
- Novo estado de sucesso pós-scan exibindo `quepasakey` (com botão "Conectar outro número"), separado da tela "já conectado" existente.
- Geração de QR/paircode e o resto do fluxo ficam iguais.

## Observação

O `acao: "status"` depende do serviço `reconecta-quepasa` ter sido reiniciado. Se ainda não estiver ativo, a verificação simplesmente não confirma a conexão (o QR fica na tela) — sem quebrar o fluxo atual.
