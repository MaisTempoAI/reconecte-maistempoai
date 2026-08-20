# Reconexão WhatsApp: contrato real da API + botão Voltar

## O que muda

### 1. Botão "Voltar" no canto superior esquerdo
Aparece em todas as telas exceto a inicial (digitar número):
- Passo 2 (escolha do dispositivo) → volta ao passo 1
- Passo 3 (QR / paircode / já conectado / erro) → volta ao passo 2
Ícone de seta + "Voltar", alinhado à esquerda no topo do cartão, acima do título. O botão "Voltar" duplicado no rodapé do passo 2 é removido.

### 2. Chamada da API exatamente como o contrato
Uma única URL, GET, com três parâmetros:
- `telefone` = só dígitos, `55` + DDD + número
- `chave` = fixa (nunca exibida na tela)
- `modo` = `qr` quando "Computador", `paircode` quando "Celular/Tablet"

Sempre HTTP 200; a decisão é feita pelo corpo, nesta ordem:
1. `ok === false` → erro
2. `ja_conectado === true` → sucesso verde
3. `qrcode_base64` → QR
4. `paircode` → código

O modo demonstração e a variável de webhook de paircode separada saem — passa a existir só o endpoint real.

### 3. Telas de resultado
- **QR**: imagem gerada de `data:image/png;base64,<qrcode_base64>`, contador com `validade_segundos` (60). Ao zerar, o QR é substituído por botão "Gerar novo QR".
- **Paircode**: código grande em fonte monoespaçada com botão "Copiar" (feedback "Copiado!"), contador de `validade_segundos` (180). Ao zerar, botão "Gerar novo código".
- **Já conectado**: tela de sucesso verde com a `mensagem` da API, sem QR nem código.
- **numero_nao_encontrado**: volta ao passo 1 com erro no campo de telefone e permite corrigir e tentar de novo.
- **Outros erros**: exibe a `mensagem` da API + botão "Tentar de novo".

### 4. Instruções na tela (texto exato do contrato)
Lista numerada conforme o modo. No paircode, os passos 4 ("Conectar com número de telefone") e 6 (aviso de segurança sobre golpes) ganham destaque visual próprio — bloco com borda/realce e rótulo de atenção — por serem os que mais confundem.

### 5. Comportamento
- Botão desabilitado durante a chamada, com spinner e "Gerando...".
- Sem polling e sem tentativa de detectar conexão: após expirar, só "gerar de novo".
- Máscara mantém +55 fixo e envia apenas dígitos.
- Layout mobile-first (o usuário de paircode está no celular).
- Chave, URL e qualquer dado de servidor nunca aparecem em texto na tela.

## Detalhes técnicos
- `src/lib/connection-helpers.ts`: novo tipo de resultado discriminado (`qr` | `paircode` | `connected` | `error`) carregando `mensagem`, `validadeSegundos`, `erro`.
- `src/lib/connection.functions.ts`: server function passa a montar a URL única com `telefone`/`chave`/`modo`, parseia o JSON (objeto ou primeiro item de array) e mapeia para o resultado na ordem de precedência definida. Erros de API voltam como resultado (não `throw`), para a UI mostrar `mensagem`. A chave fica no servidor (com fallback para `WHATSAPP_WEBHOOK_KEY`/`WHATSAPP_WEBHOOK_URL` se definidas), nunca no cliente.
- `src/routes/index.tsx`: header com botão Voltar condicional, timer usando `validadeSegundos`, blocos de instrução por modo, cópia do paircode via `navigator.clipboard` em handler de clique, estados de erro por campo e global.
