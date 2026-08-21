# Refazer o visual com shadcn/ui e ajustar o fluxo

## Objetivo
Reconstruir a tela de conexão usando somente componentes shadcn/ui já instalados no projeto, corrigir a bandeira do Brasil, ajustar o rodapé e separar de verdade os passos: telefone primeiro, dispositivo só depois.

## Fluxo (3 passos, um por tela)
```text
Passo 1  Telefone            -> Card + Input + Button "Próximo passo"
Passo 2  Dispositivo         -> Card + RadioGroup (Computador / Celular-Tablet) + Button "Conectar"
Passo 3  QR ou PairCode      -> Card + QR (60s) ou código grande (180s) + instruções
```
- No passo 1 aparece apenas o campo de telefone. Nenhuma menção a Computador/Celular.
- O bloco de dispositivo passa a ser uma tela própria (passo 2), com o número escolhido mostrado como badge.
- A chamada ao webhook continua igual: `modo=qr` para Computador, `modo=paircode` para Celular/Tablet. Nenhuma mudança na lógica de API.
- Botão Voltar (canto superior esquerdo) segue nos passos 2 e 3; passo 1 sem Voltar.

## Visual
- Componentes: `Card`, `Input`, `Label`, `Button`, `RadioGroup`, `Badge`, `Separator`, `Progress`, `Alert`, `Skeleton` — todos já presentes em `src/components/ui`.
- Estados de erro passam a usar `Alert` (destructive) em vez de divs soltas; “já conectado” usa `Alert` de sucesso.
- Instruções de QR/PairCode viram lista com `Badge` numerada; os passos críticos do paircode continuam destacados.
- Timer com `Progress` + contagem mm:ss.
- Sem cores hardcoded: apenas tokens semânticos do design system atual (`src/styles.css`), com pequeno refinamento de tipografia/espaçamento para um resultado mais sóbrio e elegante.

## Correções pontuais
- Bandeira: substituir `src/components/BrazilFlag.tsx` pela bandeira brasileira correta — retângulo verde, losango amarelo e círculo azul central (o layout atual em três faixas parece a da Bolívia).
- Rodapé: trocar “Servidor estável em São Paulo (br-east)” por “Servidor MaisTempo.ai ®”.

## Detalhes técnicos
- Arquivos alterados: `src/routes/index.tsx` (reescrita da UI e separação dos passos), `src/components/BrazilFlag.tsx`, e ajustes menores em `src/styles.css` se algum token novo for necessário.
- `src/lib/connection.functions.ts` e `src/lib/connection-helpers.ts` permanecem intactos (contrato da API inalterado).
- Head/SEO da rota mantidos.

## Sobre a skill de design
Não há skill de design ativa neste workspace, então não posso executá-la. Skills são ativadas em Settings > Skills; se você ativar essa, eu a aplico numa próxima rodada. Enquanto isso, sigo o padrão de bom gosto visual descrito acima com shadcn puro.
