import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";

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

function ConnectPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [digits, setDigits] = useState("");
  const [device, setDevice] = useState<DeviceType>("computador");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [remaining, setRemaining] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const connect = useServerFn(requestConnection);
  const isValid = digits.length === 10 || digits.length === 11;
  const masked = useMemo(() => formatPhone(digits), [digits]);

  useEffect(() => {
    if (!result || remaining <= 0) return;
    const id = window.setInterval(() => setRemaining((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [result, remaining]);

  const mmss = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(
    remaining % 60,
  ).padStart(2, "0")}`;

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await connect({ data: { phone: digits, device } });
      setResult(res);
      setRemaining(res.expiresIn);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar o código.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6 font-sans antialiased lg:p-12">
      <div className="flex w-full max-w-[440px] flex-col gap-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-tight text-foreground">
              MaisTempo.ai
            </span>
            <ProgressTrack step={step} />
          </div>

          <header className="flex flex-col gap-2">
            <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground">
              {step === 3 && result?.mode === "paircode"
                ? "Use o código de pareamento"
                : step === 3
                  ? "Escaneie o QR Code"
                  : "Conecte sua conta"}
            </h1>
            <p className="max-w-[35ch] text-pretty text-sm text-muted-foreground">
              {step === 1 &&
                "Inicie a integração com o servidor inserindo o número do WhatsApp da sua empresa."}
              {step === 2 &&
                "Informe onde você está agora para gerarmos o método de conexão correto."}
              {step === 3 &&
                `Conectando o número +55 ${masked}${result?.demo ? " · modo demonstração" : ""}.`}
            </p>
          </header>
        </div>

        {step !== 3 && (
          <div className="flex flex-col gap-8 rounded-[20px] bg-card p-8 ring-1 ring-border">
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
                  ref={inputRef}
                  id="phone"
                  type="text"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  disabled={step === 2}
                  value={masked}
                  onChange={(e) => setDigits(onlyDigits(e.target.value).slice(0, 11))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isValid && step === 1) setStep(2);
                  }}
                  placeholder="(11) 98765-4321"
                  className="w-full rounded-[12px] bg-surface py-4 pl-20 pr-4 text-base font-medium text-foreground outline-none ring-1 ring-border transition-shadow placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
                />
              </div>
              <p className="text-[12px] leading-normal text-muted-foreground">
                Insira apenas números. O prefixo internacional é fixo para o Brasil.
              </p>
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

            {error && (
              <p className="text-[12px] font-medium text-destructive">{error}</p>
            )}

            <button
              type="button"
              disabled={!isValid || loading}
              onClick={() => (step === 1 ? setStep(2) : start())}
              className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-brand py-3.5 text-sm font-medium text-brand-foreground shadow-sm ring-1 ring-brand transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Gerando código..." : step === 1 ? "Próximo Passo" : "Conectar"}
            </button>
          </div>
        )}

        {step === 3 && result && (
          <div className="flex flex-col items-center gap-8 rounded-[20px] bg-panel p-8 shadow-2xl">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-lg font-medium text-panel-foreground">
                {result.mode === "qrcode"
                  ? "Escaneie o QR Code"
                  : "Digite o código no aparelho"}
              </h2>
              <p className="text-sm text-panel-muted">
                {remaining > 0 ? (
                  <>
                    Expira em{" "}
                    <span className="font-medium tabular-nums text-brand">{mmss}</span>
                  </>
                ) : (
                  "Código expirado. Gere um novo."
                )}
              </p>
            </div>

            {result.mode === "qrcode" && result.qrImage && (
              <div className="relative rounded-[12px] bg-surface p-4">
                <span className="absolute -left-1 -top-1 size-6 rounded-tl-lg border-l-2 border-t-2 border-brand" />
                <span className="absolute -right-1 -top-1 size-6 rounded-tr-lg border-r-2 border-t-2 border-brand" />
                <span className="absolute -bottom-1 -left-1 size-6 rounded-bl-lg border-b-2 border-l-2 border-brand" />
                <span className="absolute -bottom-1 -right-1 size-6 rounded-br-lg border-b-2 border-r-2 border-brand" />
                <img
                  src={result.qrImage}
                  alt="QR Code de conexão do WhatsApp"
                  className={`size-48 rounded-[4px] transition-opacity ${
                    remaining > 0 ? "" : "opacity-30"
                  }`}
                />
              </div>
            )}

            <div className="flex w-full flex-col gap-4 border-t border-panel-border pt-8">
              <div className="flex flex-col gap-3">
                <p className="text-center text-xs uppercase tracking-widest text-panel-muted">
                  {result.mode === "paircode"
                    ? "Código de pareamento"
                    : "Ou use o código de pareamento"}
                </p>
                <div className="flex justify-center gap-2">
                  {(result.pairCode ?? "--------").split("").map((c, i) => (
                    <span key={`${c}-${i}`} className="contents">
                      {i === 4 && <span className="flex items-center text-panel-border">-</span>}
                      <span className="flex size-10 items-center justify-center rounded-md border border-panel-border bg-panel-elevated font-semibold text-panel-foreground">
                        {c}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl bg-panel-elevated/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-panel-muted">01.</span>
                  <p className="text-xs text-panel-foreground/80">
                    Abra o WhatsApp {">"} Configurações {">"} Dispositivos Conectados
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-panel-muted">02.</span>
                  <p className="text-xs text-panel-foreground/80">
                    {result.mode === "paircode"
                      ? "Toque em Conectar um dispositivo e selecione 'Conectar com número'"
                      : "Toque em Conectar um dispositivo e aponte a câmera para o código"}
                  </p>
                </div>
              </div>
            </div>

            {error && <p className="text-[12px] font-medium text-destructive">{error}</p>}

            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={start}
                disabled={loading}
                className="text-xs font-medium text-brand transition-colors hover:text-brand-foreground disabled:opacity-50"
              >
                {loading ? "Gerando..." : "Gerar novo código"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError(null);
                  setStep(1);
                }}
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
