import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { BrazilFlag } from "@/components/BrazilFlag";
import {
  requestConnection,
  type ConnectionResult,
  type DeviceType,
} from "@/lib/connection.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Conectar WhatsApp — MaisTempo.ai" },
      {
        name: "description",
        content:
          "Informe seu número, escolha o dispositivo e conecte ao servidor de WhatsApp da MaisTempo.ai por QR Code ou código de pareamento.",
      },
      { property: "og:title", content: "Conectar WhatsApp — MaisTempo.ai" },
      {
        property: "og:description",
        content:
          "Conexão segura de instância WhatsApp em três passos: número, dispositivo e código.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectPage,
});

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(digits: string) {
  const d = digits.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

const QR_STEPS = [
  "No celular, abra o WhatsApp",
  "Toque em Configurações (ou os 3 pontinhos) > Aparelhos conectados",
  "Toque em Conectar um aparelho",
  "Aponte a câmera para o QR code desta tela",
];

const PAIR_STEPS: { text: string; highlight?: boolean }[] = [
  { text: "No celular, abra o WhatsApp" },
  { text: "Toque em Configurações (ou os 3 pontinhos) > Aparelhos conectados" },
  { text: "Toque em Conectar um aparelho" },
  {
    text: "Vai abrir a câmera. Logo ABAIXO dela, toque em 'Conectar com número de telefone'",
    highlight: true,
  },
  { text: "Digite o código que aparece nesta tela" },
  {
    text: "O WhatsApp vai mostrar um AVISO DE SEGURANÇA sobre golpes. Isso é normal — confirme para continuar.",
    highlight: true,
  },
];

function ProgressTrack({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-1 w-8 rounded-full transition-colors ${
            n <= step ? "bg-brand" : "bg-secondary"
          }`}
        />
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 flex items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
      Voltar
    </button>
  );
}

function StepList({ mode }: { mode: "qr" | "paircode" }) {
  const items =
    mode === "qr" ? QR_STEPS.map((text) => ({ text, highlight: false })) : PAIR_STEPS;
  return (
    <ol className="flex w-full flex-col gap-2">
      {items.map((item, i) => (
        <li
          key={i}
          className={`flex items-start gap-3 rounded-xl p-3 text-xs leading-relaxed ${
            item.highlight
              ? "bg-brand/10 ring-1 ring-brand/40"
              : "bg-panel-elevated/50"
          }`}
        >
          <span
            className={`flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${
              item.highlight
                ? "bg-brand text-brand-foreground"
                : "bg-panel-border/60 text-panel-muted"
            }`}
          >
            {i + 1}
          </span>
          <span className={item.highlight ? "text-panel-foreground" : "text-panel-foreground/80"}>
            {item.highlight && (
              <span className="mr-1.5 font-semibold uppercase tracking-wide text-brand">
                Atenção:
              </span>
            )}
            {item.text}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ConnectPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [digits, setDigits] = useState("");
  const [device, setDevice] = useState<DeviceType>("computador");
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [copied, setCopied] = useState(false);

  const connect = useServerFn(requestConnection);
  const isValid = digits.length === 10 || digits.length === 11;
  const masked = useMemo(() => formatPhone(digits), [digits]);
  const expired = remaining <= 0;

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => setRemaining((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  const mmss = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(
    remaining % 60,
  ).padStart(2, "0")}`;

  async function start() {
    setLoading(true);
    setPhoneError(null);
    setCopied(false);
    try {
      const res = await connect({ data: { phone: digits, device } });
      if (res.kind === "error" && res.erro === "numero_nao_encontrado") {
        setResult(null);
        setRemaining(0);
        setPhoneError(res.mensagem);
        setStep(1);
        return;
      }
      setResult(res);
      setRemaining(res.kind === "qr" || res.kind === "paircode" ? res.validadeSegundos : 0);
      setStep(3);
    } catch (e) {
      setResult({
        kind: "error",
        erro: "falha_inesperada",
        mensagem: e instanceof Error ? e.message : "Não foi possível gerar o código.",
      });
      setRemaining(0);
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  function reset(target: 1 | 2) {
    setResult(null);
    setRemaining(0);
    setCopied(false);
    if (target === 1) setPhoneError(null);
    setStep(target);
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const title =
    step === 3
      ? result?.kind === "paircode"
        ? "Use o código de pareamento"
        : result?.kind === "qr"
          ? "Escaneie o QR Code"
          : result?.kind === "connected"
            ? "Número já conectado"
            : "Não foi possível conectar"
      : "Conecte sua conta";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 font-sans antialiased sm:p-6 lg:p-12">
      <div className="flex w-full max-w-[440px] flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-tight text-foreground">
              MaisTempo.ai
            </span>
            <ProgressTrack step={step} />
          </div>

          {step !== 1 && <BackButton onClick={() => reset(step === 3 ? 2 : 1)} />}

          <header className="flex flex-col gap-2">
            <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground">
              {title}
            </h1>
            <p className="max-w-[35ch] text-pretty text-sm text-muted-foreground">
              {step === 1 &&
                "Inicie a integração com o servidor inserindo o número do WhatsApp da sua empresa."}
              {step === 2 &&
                "Informe onde você está agora para gerarmos o método de conexão correto."}
              {step === 3 && `Número +55 ${masked}.`}
            </p>
          </header>
        </div>

        {step !== 3 && (
          <div className="flex flex-col gap-8 rounded-[20px] bg-card p-6 ring-1 ring-border sm:p-8">
            <div className="flex flex-col gap-4">
              <label
                htmlFor="phone"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Número de WhatsApp
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 flex items-center gap-2 border-r border-border pr-3">
                  <BrazilFlag />
                  <span className="text-sm font-medium text-foreground">+55</span>
                </div>
                <input
                  id="phone"
                  type="text"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  disabled={step === 2}
                  value={masked}
                  aria-invalid={!!phoneError}
                  onChange={(e) => {
                    setPhoneError(null);
                    setDigits(onlyDigits(e.target.value).slice(0, 11));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isValid && step === 1) setStep(2);
                  }}
                  placeholder="(11) 98765-4321"
                  className={`w-full rounded-[12px] bg-surface py-4 pl-20 pr-4 text-base font-medium text-foreground outline-none ring-1 transition-shadow placeholder:text-muted-foreground/50 focus:ring-2 disabled:opacity-60 ${
                    phoneError
                      ? "ring-destructive focus:ring-destructive/40"
                      : "ring-border focus:ring-brand/30"
                  }`}
                />
              </div>
              {phoneError ? (
                <p className="text-[12px] font-medium text-destructive">{phoneError}</p>
              ) : (
                <p className="text-[12px] leading-normal text-muted-foreground">
                  Insira apenas números. O prefixo internacional é fixo para o Brasil.
                </p>
              )}
            </div>

            <div
              className={`flex flex-col gap-3 transition-opacity ${
                step === 2 ? "" : "pointer-events-none opacity-40"
              }`}
            >
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Dispositivo
              </span>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["computador", "Computador"],
                    ["celular", "Celular / Tablet"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDevice(value)}
                    className={`rounded-[12px] p-4 text-left transition-colors ${
                      device === value
                        ? "bg-surface ring-2 ring-brand"
                        : "bg-secondary/40 ring-1 ring-border hover:ring-brand/40"
                    }`}
                  >
                    <span className="block text-sm font-medium text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!isValid || loading}
              onClick={() => (step === 1 ? setStep(2) : start())}
              className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-brand py-3.5 text-sm font-medium text-brand-foreground shadow-sm ring-1 ring-brand transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Spinner />}
              {loading ? "Gerando..." : step === 1 ? "Próximo Passo" : "Conectar"}
            </button>
          </div>
        )}

        {step === 3 && result?.kind === "connected" && (
          <div className="flex flex-col items-center gap-6 rounded-[20px] bg-online/10 p-8 text-center ring-1 ring-online/40">
            <span className="flex size-12 items-center justify-center rounded-full bg-online/20">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-online"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <p className="max-w-[32ch] text-sm font-medium text-foreground">{result.mensagem}</p>
            <button
              type="button"
              onClick={() => reset(1)}
              className="text-xs font-medium text-brand transition-colors hover:text-brand-hover"
            >
              Conectar outro número
            </button>
          </div>
        )}

        {step === 3 && result?.kind === "error" && (
          <div className="flex flex-col items-center gap-6 rounded-[20px] bg-card p-8 text-center ring-1 ring-destructive/40">
            <p className="max-w-[34ch] text-sm font-medium text-foreground">{result.mensagem}</p>
            <button
              type="button"
              disabled={loading}
              onClick={start}
              className="flex items-center justify-center gap-2 rounded-[12px] bg-brand px-5 py-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {loading && <Spinner />}
              {loading ? "Gerando..." : "Tentar de novo"}
            </button>
          </div>
        )}

        {step === 3 && (result?.kind === "qr" || result?.kind === "paircode") && (
          <div className="flex flex-col items-center gap-6 rounded-[20px] bg-panel p-6 shadow-2xl sm:p-8">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-lg font-medium text-panel-foreground">
                {result.kind === "qr" ? "Escaneie o QR Code" : "Digite o código no aparelho"}
              </h2>
              <p className="text-sm text-panel-muted">
                {expired ? (
                  result.kind === "qr" ? (
                    "QR Code expirado."
                  ) : (
                    "Código expirado."
                  )
                ) : (
                  <>
                    Expira em{" "}
                    <span className="font-medium tabular-nums text-brand">{mmss}</span>
                  </>
                )}
              </p>
            </div>

            {result.kind === "qr" &&
              (expired ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={start}
                  className="flex items-center justify-center gap-2 rounded-[12px] bg-brand px-5 py-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
                >
                  {loading && <Spinner />}
                  {loading ? "Gerando..." : "Gerar novo QR"}
                </button>
              ) : (
                <div className="relative rounded-[12px] bg-surface p-4">
                  <span className="absolute -left-1 -top-1 size-6 rounded-tl-lg border-l-2 border-t-2 border-brand" />
                  <span className="absolute -right-1 -top-1 size-6 rounded-tr-lg border-r-2 border-t-2 border-brand" />
                  <span className="absolute -bottom-1 -left-1 size-6 rounded-bl-lg border-b-2 border-l-2 border-brand" />
                  <span className="absolute -bottom-1 -right-1 size-6 rounded-br-lg border-b-2 border-r-2 border-brand" />
                  <img
                    src={result.qrImage}
                    alt="QR Code de conexão do WhatsApp"
                    className="size-48 rounded-[4px] sm:size-56"
                  />
                </div>
              ))}

            {result.kind === "paircode" &&
              (expired ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={start}
                  className="flex items-center justify-center gap-2 rounded-[12px] bg-brand px-5 py-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
                >
                  {loading && <Spinner />}
                  {loading ? "Gerando..." : "Gerar novo código"}
                </button>
              ) : (
                <div className="flex w-full flex-col items-center gap-3">
                  <p className="select-all break-all text-center font-mono text-3xl font-semibold tracking-[0.15em] text-panel-foreground sm:text-4xl">
                    {result.pairCode}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyCode(result.pairCode)}
                    className="rounded-[10px] border border-panel-border px-4 py-2 text-xs font-medium text-panel-foreground transition-colors hover:bg-panel-elevated"
                  >
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              ))}

            <div className="w-full border-t border-panel-border pt-6">
              <StepList mode={result.kind === "qr" ? "qr" : "paircode"} />
            </div>

            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={start}
                disabled={loading}
                className="text-xs font-medium text-brand transition-colors hover:text-brand-hover disabled:opacity-50"
              >
                {loading ? "Gerando..." : "Gerar novo código"}
              </button>
              <button
                type="button"
                onClick={() => reset(1)}
                className="text-xs font-medium text-panel-muted transition-colors hover:text-panel-foreground"
              >
                Alterar número
              </button>
            </div>
          </div>
        )}

        <footer className="flex flex-col gap-4 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-online" />
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Servidor estável em São Paulo (br-east)
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
