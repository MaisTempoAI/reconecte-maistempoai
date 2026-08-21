# Trocar o webhook n8n pelo novo serviço Python

O app hoje chama o antigo webhook do n8n por GET com `?telefone=&chave=`, e esse fluxo está recusando a chave ("Acesso negado"). Vou trocar a chamada pelo novo serviço POST/JSON.

Confirmei o novo endpoint funcionando a partir do sandbox: um POST de teste retornou `{"ok": false, "erro": "numero_nao_encontrado", ...}` — ou seja, autenticação aceita e contrato conforme descrito.

## O que muda

- A chamada passa a ser **POST** para `http://46.62.202.200:8839/reconect` com `Content-Type: application/json` e corpo `{user, senha, telefone, modo}`.
- `telefone` continua sendo enviado como `55 + DDD + número` (só dígitos).
- `modo` = `qr` para Computador e `paircode` para Celular/Tablet (regra atual mantida).
- Usuário e senha ficam guardados como segredos do projeto (nunca no código nem visíveis no navegador); a URL também fica configurável por variável, com o endereço acima como padrão.

## Tratamento das respostas (sem mudar as telas)

- `ok:true` + `qrcode_base64` → tela do QR Code, timer usando `validade_segundos` (padrão 60).
- `ok:true` + `paircode` → tela do código de pareamento, timer com `validade_segundos` (padrão 180). Vou acrescentar um aviso de que o código também é enviado por WhatsApp para o próprio número.
- `ok:true` + `ja_conectado:true` → tela verde de "já conectado".
- `ok:false` → alerta com a `mensagem` do servidor; `numero_nao_encontrado` continua voltando para o passo 1 com erro no campo do telefone.
- Falha de rede/timeout → mensagem amigável de indisponibilidade.

## Detalhes técnicos

- Reescrever `src/lib/connection.functions.ts`: `fetch` POST com JSON, credenciais lidas de `process.env` dentro do `.handler()` (`RECONECTA_URL`, `RECONECTA_USER`, `RECONECTA_SENHA`), e timeout via `AbortSignal.timeout`.
- `src/lib/connection-helpers.ts`: manter `mapWebhookPayload`/`parseWebhookBody`; só ajustar o texto padrão de erro do paircode.
- `src/routes/index.tsx`: sem mudança de fluxo, apenas a nota do envio do código por WhatsApp.
- Registrar os segredos `RECONECTA_USER` e `RECONECTA_SENHA` (e `RECONECTA_URL`) antes do teste.
- Ponto de atenção: o endpoint é HTTP simples em porta alta; se o ambiente publicado bloquear essa saída, o caminho é expor o serviço via HTTPS/porta padrão. Vou validar depois da troca.

## Sobre o push bloqueado no GitHub

A edição do repositório acontece por aqui — não dependo do seu token. O erro 403 é do seu lado; depois de liberar escrita no token, os commits feitos aqui aparecem normalmente.
