# Trocar o endpoint de reconexão para HTTPS

A causa do "Não foi possível falar com o servidor" é o transporte: o app roda em runtime que bloqueia HTTP puro em IP/porta não-padrão (`http://46.62.202.200:8839`). O novo endpoint HTTPS com certificado válido já está testado e funcionando.

## O que muda

1. **Fallback no código** — em `src/lib/connection.functions.ts`, trocar o fallback da URL de:
   - `http://46.62.202.200:8839/reconect`
   - para: `https://reconecta-quepasa.pkgaq6.easypanel.host/reconect`

2. **Secret `RECONECTA_URL`** — atualizar o valor do segredo existente para a mesma URL HTTPS. Os nomes das variáveis (`RECONECTA_URL`, `RECONECTA_USER`, `RECONECTA_SENHA`) já existem no projeto e continuam os mesmos — não há motivo para renomear, evitando retrabalho e risco de config errada. O usuário pediu `RECONECT_API_*`, mas manteremos os nomes atuais porque já estão configurados e o código os lê; só o valor da URL muda.

3. **Credenciais** — `RECONECTA_USER` e `RECONECTA_SENHA` já estão configuradas com os mesmos valores que o usuário forneceu (`maistempo_reconect` / senha). Sem alteração.

4. **Nada mais muda no fluxo** — o método continua POST, JSON `{user, senha, telefone, modo}`, tratamento de respostas idêntico (QR 60s, paircode 180s, já conectado, erros). Nenhuma mudança em `src/routes/index.tsx` ou em `connection-helpers.ts`.

## Pós-troca

- Redeploy/publicar para o novo valor de ambiente surtir efeito em produção.
- Validar a reconexão ponta a ponta no preview publicado.

## Observação sobre nomes de variáveis

Mantive os nomes `RECONECTA_*` já cadastrados. Se preferir adotar `RECONECT_API_*` exatamente como escreveu, é só renomear os 3 segredos e ajustar as 3 chaves no `process.env[...]` — mas isso adiciona risco de inconsistência sem ganho real.
