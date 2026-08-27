import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  Copy,
  Laptop,
  Loader2,
  RefreshCw,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrazilFlag } from "@/components/BrazilFlag";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  checkConnectionStatus,
  requestConnection,
  type ConnectionResult,
  type ConnectionStatus,
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

const QR_STEPS: { text: string; highlight?: boolean }[] = [
  { text: "No celular, abra o WhatsApp" },
  { text: "Toque em Configurações (ou os 3 pontinhos) > Aparelhos conectados" },
  { text: "Toque em Conectar um aparelho" },
  { text: "Aponte a câmera para o QR code desta tela" },
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

function StepList({ mode }: { mode: "qr" | "paircode" }) {
  const items = mode === "qr" ? QR_STEPS : PAIR_STEPS;
  return (
    <ol className="flex w-full flex-col gap-2">
      {items.map((item, i) => (
        <li
          key={i}
          className={`flex items-start gap-3 rounded-lg border p-3 text-xs leading-relaxed ${
            item.highlight
              ? "border-primary/40 bg-primary/5 text-foreground"
              : "border-transparent bg-muted/50 text-muted-foreground"
          }`}
        >
          <Badge
            variant={item.highlight ? "default" : "secondary"}
            className="size-5 shrink-0 justify-center rounded-md p-0 text-[11px] tabular-nums"
          >
            {i + 1}
          </Badge>
          <span>
            {item.highlight && (
              <span className="mr-1.5 font-semibold uppercase tracking-wide text-primary">
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
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [precisaNovoQrManual, setPrecisaNovoQrManual] = useState(false);
  const jaRegenerouRef = useRef(false);

  const connect = useServerFn(requestConnection);
  const checkStatus = useServerFn(checkConnectionStatus);
  const isValid = digits.length === 10 || digits.length === 11;
  const masked = formatPhone(digits);
  const connected = status?.connected === true;
  const stale = elapsed >= 120;

  // Cronômetro de tempo decorrido (1s) enquanto aguarda conexão.
  useEffect(() => {
    if (step !== 3) return;
    if (result?.kind !== "qr" && result?.kind !== "paircode") return;
    if (connected) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [step, result, connected]);

  // Polling de status a cada 10s assim que o QR/pair code aparece.
  useEffect(() => {
    if (result?.kind !== "qr" && result?.kind !== "paircode") return;
    if (connected) return;

    let cancelled = false;
    let intervalId = 0;

    // O servidor pediu um QR novo (sessão limpa): regenera uma vez por ciclo.
    const regenerate = async () => {
      if (jaRegenerouRef.current) {
        setPrecisaNovoQrManual(true);
        return;
      }
      jaRegenerouRef.current = true;
      setRegenerating(true);
      await new Promise((r) => window.setTimeout(r, 1000));
      if (cancelled) return;
      try {
        const res = await connect({ data: { phone: digits, device } });
        if (cancelled) return;
        if (res.kind === "qr" || res.kind === "paircode") {
          setResult(res);
          setElapsed(0);
          setCopied(false);
          setPrecisaNovoQrManual(false);
          jaRegenerouRef.current = false; // QR novo exibido: reseta o flag
        } else {
          setPrecisaNovoQrManual(true);
        }
      } catch {
        if (!cancelled) setPrecisaNovoQrManual(true);
      } finally {
        if (!cancelled) setRegenerating(false);
      }
    };

    const poll = async () => {
      if (cancelled || connected) return;
      setVerifying(true);
      try {
        const res = await checkStatus({ data: { phone: digits } });
        if (cancelled) return;
        setStatus(res);
        if (res.connected) {
          setVerifying(false);
          window.clearInterval(intervalId);
        } else if (res.precisaNovoQr) {
          void regenerate();
        }
      } catch {
        /* mantém o polling silencioso */
      } finally {
        if (!cancelled && !connected) setVerifying(false);
      }
    };

    poll();
    intervalId = window.setInterval(poll, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, digits]);

  async function start() {
    setLoading(true);
    setPhoneError(null);
    setCopied(false);
    setStatus(null);
    setElapsed(0);
    setRegenerating(false);
    setPrecisaNovoQrManual(false);
    jaRegenerouRef.current = false;
    try {
      const res = await connect({ data: { phone: digits, device } });
      if (res.kind === "error" && res.erro === "numero_nao_encontrado") {
        setResult(null);
        setPhoneError(res.mensagem);
        setStep(1);
        return;
      }
      setResult(res);
      setStep(3);
    } catch (e) {
      setResult({
        kind: "error",
        erro: "falha_inesperada",
        mensagem: e instanceof Error ? e.message : "Não foi possível gerar o código.",
      });
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  function reset(target: 1 | 2) {
    setResult(null);
    setStatus(null);
    setElapsed(0);
    setCopied(false);
    setRegenerating(false);
    setPrecisaNovoQrManual(false);
    jaRegenerouRef.current = false;
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

  const heading =
    step === 1
      ? "Conecte sua conta"
      : step === 2
        ? "Onde você está agora?"
        : connected
          ? "Número conectado"
          : result?.kind === "paircode"
            ? "Use o código de pareamento"
            : result?.kind === "qr"
              ? "Escaneie o QR Code"
              : result?.kind === "connected"
                ? "Número já conectado"
                : "Não foi possível conectar";

  const description =
    step === 1
      ? "Informe o número de WhatsApp da sua empresa para iniciar a integração."
      : step === 2
        ? "Escolha o dispositivo para gerarmos o método de conexão correto."
        : `Número +55 ${masked}`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 font-sans antialiased sm:p-6 lg:p-10">
      <div className="flex w-full max-w-[460px] flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight">MaisTempo.ai</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">Passo {step} de 3</span>
            <Progress value={(step / 3) * 100} className="h-1 w-16" />
          </div>
        </div>

        <Card className="gap-6 shadow-sm">
          <CardHeader className="gap-2">
            {step !== 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 mb-1 w-fit text-muted-foreground"
                onClick={() => reset(step === 3 ? 2 : 1)}
              >
                <ArrowLeft />
                Voltar
              </Button>
            )}
            <CardTitle className="text-2xl tracking-tight">{heading}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>

          {step === 1 && (
            <>
              <CardContent className="flex flex-col gap-3">
                <Label htmlFor="phone">Número de WhatsApp</Label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 flex items-center gap-2 border-r pr-2.5">
                    <BrazilFlag />
                    <span className="text-sm font-medium">+55</span>
                  </span>
                  <Input
                    id="phone"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={masked}
                    aria-invalid={!!phoneError}
                    onChange={(e) => {
                      setPhoneError(null);
                      setDigits(onlyDigits(e.target.value).slice(0, 11));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isValid) setStep(2);
                    }}
                    placeholder="(11) 98765-4321"
                    className="h-12 pl-[5.25rem] text-base font-medium md:text-base"
                  />
                </div>
                {phoneError ? (
                  <p className="text-xs font-medium text-destructive">{phoneError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Insira apenas números, com DDD. O prefixo +55 é fixo para o Brasil.
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled={!isValid} onClick={() => setStep(2)}>
                  Próximo passo
                </Button>
              </CardFooter>
            </>
          )}

          {step === 2 && (
            <>
              <CardContent className="flex flex-col gap-4">
                <Badge variant="secondary" className="gap-1.5">
                  <BrazilFlag className="h-3 w-4" />
                  +55 {masked}
                </Badge>
                <RadioGroup
                  value={device}
                  onValueChange={(v) => setDevice(v as DeviceType)}
                  className="gap-3"
                >
                  {(
                    [
                      ["computador", "Computador", "Conexão por QR Code", Laptop],
                      ["celular", "Celular / Tablet", "Conexão por código de pareamento", Smartphone],
                    ] as const
                  ).map(([value, label, hint, Icon]) => (
                    <Label
                      key={value}
                      htmlFor={value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                        device === value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value={value} id={value} className="mt-0.5" />
                      <Icon className="mt-0.5 size-4 text-muted-foreground" />
                      <span className="flex flex-col gap-1">
                        <span className="text-sm font-medium leading-none">{label}</span>
                        <span className="text-xs font-normal text-muted-foreground">{hint}</span>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled={loading} onClick={start}>
                  {loading && <Loader2 className="animate-spin" />}
                  {loading ? "Gerando..." : "Conectar"}
                </Button>
              </CardFooter>
            </>
          )}

          {step === 3 && result?.kind === "connected" && (
            <>
              <CardContent>
                <Alert className="border-primary/40 bg-primary/5">
                  <Check className="text-primary" />
                  <AlertTitle>Tudo pronto</AlertTitle>
                  <AlertDescription>{result.mensagem}</AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => reset(1)}>
                  Conectar outro número
                </Button>
              </CardFooter>
            </>
          )}

          {step === 3 && result?.kind === "error" && (
            <>
              <CardContent>
                <Alert variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>Falha na conexão</AlertTitle>
                  <AlertDescription>{result.mensagem}</AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="gap-3">
                <Button className="flex-1" disabled={loading} onClick={start}>
                  {loading && <Loader2 className="animate-spin" />}
                  {loading ? "Gerando..." : "Tentar de novo"}
                </Button>
                <Button variant="outline" onClick={() => reset(1)}>
                  Alterar número
                </Button>
              </CardFooter>
            </>
          )}

          {step === 3 && (result?.kind === "qr" || result?.kind === "paircode") && connected && (
            <>
              <CardContent>
                <Alert className="border-primary/40 bg-primary/5">
                  <Check className="text-primary" />
                  <AlertTitle>Número conectado com sucesso!</AlertTitle>
                  <AlertDescription>
                    <span className="block">{status?.estado}</span>
                    {status?.quepasakey && (
                      <span className="mt-1 block font-mono text-xs text-muted-foreground">
                        quepasakey: {status.quepasakey}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => reset(1)}>
                  Conectar outro número
                </Button>
              </CardFooter>
            </>
          )}

          {step === 3 &&
            (result?.kind === "qr" || result?.kind === "paircode") &&
            !connected && (
              <>
                <CardContent className="flex flex-col items-center gap-6">
                  <div className="flex w-full items-center gap-2 text-xs text-muted-foreground">
                    {(verifying || regenerating) && <Loader2 className="size-3 animate-spin" />}
                    <span>
                      {regenerating
                        ? "Sessão reiniciada pelo servidor, gerando um novo QR..."
                        : "Aguardando você escanear pelo celular..."}
                    </span>
                  </div>

                  {result.kind === "qr" ? (
                    <div className="rounded-xl border bg-card p-4">
                      <img
                        src={result.qrImage}
                        alt="QR Code de conexão do WhatsApp"
                        className="size-48 rounded-sm sm:size-56"
                      />
                    </div>
                  ) : (
                    <div className="flex w-full flex-col items-center gap-3">
                      <p className="select-all break-all text-center font-mono text-3xl font-semibold tracking-[0.15em] sm:text-4xl">
                        {result.pairCode}
                      </p>
                      <Button variant="outline" size="sm" onClick={() => copyCode(result.pairCode)}>
                        {copied ? <Check /> : <Copy />}
                        {copied ? "Copiado!" : "Copiar código"}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">
                        Enviamos este mesmo código por WhatsApp para o número informado.
                      </p>
                    </div>
                  )}

                  {precisaNovoQrManual && (
                    <div className="flex w-full flex-col items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-center">
                      <p className="text-xs font-medium text-foreground">
                        Precisamos de um novo QR — toque para gerar
                      </p>
                      <Button size="sm" variant="outline" disabled={loading} onClick={start}>
                        {loading && <Loader2 className="animate-spin" />}
                        Gerar novo
                      </Button>
                    </div>
                  )}

                  {stale && (
                    <div className="flex w-full flex-col items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-center">
                      <p className="text-xs font-medium text-foreground">
                        O QR pode ter expirado — gerar um novo?
                      </p>
                      <Button size="sm" variant="outline" disabled={loading} onClick={start}>
                        {loading && <Loader2 className="animate-spin" />}
                        Gerar novo
                      </Button>
                    </div>
                  )}

                  <Separator />
                  <StepList mode={result.kind === "qr" ? "qr" : "paircode"} />
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="ghost" size="sm" disabled={loading} onClick={start}>
                    {loading && <Loader2 className="animate-spin" />}
                    {loading ? "Gerando..." : "Gerar novo código"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => reset(1)}>
                    Alterar número
                  </Button>
                </CardFooter>
              </>
            )}
        </Card>

        <footer className="flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Servidor MaisTempo.ai ®
        </footer>
      </div>
    </main>
  );
}
