# Regeneração automática de QR quando o servidor pede (`precisa_novo_qr`)

Quando o servidor limpa a sessão, ele passa a responder `precisa_novo_qr: true` no status. Hoje o app ignora esse campo e o QR velho fica na tela até o aviso de expirado. Vamos fazer o app gerar um QR novo sozinho (uma vez por ciclo) e continuar o polling normalmente.

## O que muda para o usuário

1. Se o servidor reiniciar a sessão enquanto o QR está na tela, aparece "Sessão reiniciada pelo servidor, gerando um novo QR..." por ~1 segundo e um QR novo aparece automaticamente, com o cronômetro reiniciado. A verificação de conexão continua sem pausa.
2. Se a regeneração automática já aconteceu uma vez e o servidor pedir de novo no mesmo ciclo, em vez de regenerar em loop aparece o aviso "Precisamos de um novo QR — toque para gerar" com o botão manual.
3. Tudo o resto fica igual: conectou → tela de sucesso com a `quepasakey`; ~2 min sem conectar → aviso "pode ter expirado — gerar um novo?".

## Detalhes técnicos

- `src/lib/connection-helpers.ts`:
  - `ConnectionStatus` ganha `precisaNovoQr?: boolean`.
  - `mapStatusPayload` lê `precisa_novo_qr` do JSON (`payload["precisa_novo_qr"] === true`, default `false`) e repassa como `precisaNovoQr`.
- `src/lib/connection.functions.ts`: apenas o tipo exportado muda via helper; a chamada `acao: "status"` fica igual.
- `src/routes/index.tsx` (polling a cada 10s, como aprovado anteriormente — não 3s):
  - Novo estado local `regenerating` (boolean) para exibir a mensagem por ~1s, e ref `jaRegenerouRef` (ref, não state, para não re-renderizar nem entrar nas deps do effect; reseta junto com o ciclo do effect).
  - No `poll()`: se `res.connected` → comportamento atual. Senão, se `res.precisaNovoQr === true`:
    - Se `jaRegenerouRef.current === false`: marca `true`, seta `regenerating = true`, após ~1s chama `connect({ data: { phone: digits, device } })`; se vier `qr`/`paircode`, `setResult(novo)` + `setElapsed(0)` + `setCopied(false)` e `jaRegenerouRef.current = false` (QR novo exibido com sucesso reseta o flag). O interval não é limpo — o polling continua (o effect depende de `result`, então ao trocar o result o effect reexecuta com intervalo novo; o flag sobrevive porque é ref de fora).
    - Se `jaRegenerouRef.current === true`: não regenera; seta um estado `precisaNovoQrManual = true` que exibe o aviso "Precisamos de um novo QR — toque para gerar" com o botão que chama `start()` (que já reseta tudo e gera novo QR).
  - Aviso manual renderizado junto do aviso de expirado existente (mesmo estilo), sem remover o QR da tela.
  - Se a chamada de regeneração falhar ou voltar erro, mostra o aviso manual em vez de tentar de novo em loop.
- Nada mais muda: geração inicial, telas de sucesso/erro, botão Voltar e o aviso de ~2 min continuam iguais.
