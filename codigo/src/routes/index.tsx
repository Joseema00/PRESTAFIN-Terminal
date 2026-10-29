import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Landmark,
  Wallet,
  LineChart,
  PieChart,
  Coins,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/app/site-header";
import { BrandMark } from "@/components/app/brand-mark";
import { WealthCurve } from "@/components/app/wealth-curve";
import { cn } from "@/lib/utils";

const TITLE = "Prestafin · Gestión patrimonial con prestamo";
const DESCRIPTION =
  "Prestafin te ayuda a entender, analizar y optimizar tu patrimonio mientras gestionas tu prestamo: escenarios, carteras y riesgo en una sola visión.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  component: Index,
});

/* ---------------------------------------------------------------- layout */

function Section({
  eyebrow,
  title,
  intro,
  children,
  tone = "plain",
  id,
}: {
  eyebrow?: string;
  title?: string;
  intro?: string;
  children?: React.ReactNode;
  tone?: "plain" | "panel";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-24 sm:py-32",
        tone === "panel" && "border-y border-border bg-surface-2/50",
      )}
    >
      <div className="mx-auto max-w-[84rem] px-6 lg:px-10">
        {eyebrow || title ? (
          <div className="max-w-3xl">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? (
              <h2 className="mt-4 font-display text-3xl text-balance sm:text-[2.6rem] sm:leading-[1.1]">
                {title}
              </h2>
            ) : null}
            {intro ? (
              <p className="mt-5 max-w-2xl text-[1.0625rem] leading-relaxed text-pretty text-muted-foreground">
                {intro}
              </p>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- content */

const SILOS = [
  { icon: Landmark, label: "Prestamo", note: "Capital pendiente e intereses futuros" },
  { icon: Wallet, label: "Liquidez", note: "Colchón y aportación mensual" },
  { icon: LineChart, label: "Inversiones", note: "Acciones, REITs y materias primas" },
  { icon: PieChart, label: "Fondos", note: "Indexados y gestión activa" },
  { icon: Coins, label: "ETFs", note: "Exposición global diversificada" },
  { icon: Building2, label: "Otros activos", note: "Inmuebles, oro y alternativos" },
];

const FLOW = [
  { step: "01", title: "Prestamo", text: "Conocemos tu deuda real: cuadro de amortización, coste financiero y margen." },
  { step: "02", title: "Ahorro", text: "Definimos cuánto puedes destinar cada mes sin comprometer tu liquidez." },
  { step: "03", title: "Inversión", text: "Ese ahorro se asigna a una cartera con un perfil de riesgo explícito." },
  { step: "04", title: "Patrimonio", text: "Proyectamos el punto en el que tu patrimonio iguala y supera la deuda." },
];

const LAB = [
  { title: "Optimización Markowitz", text: "Frontera eficiente, máxima ratio de Sharpe y mínima volatilidad." },
  { title: "Monte Carlo", text: "Miles de trayectorias con bandas de probabilidad P10 · P50 · P90." },
  { title: "Métricas de riesgo", text: "VaR, CVaR, contribución marginal al riesgo y correlaciones." },
  { title: "Escenarios de estrés", text: "Comportamiento estimado ante crisis históricas de mercado." },
];

const HORIZONS = [
  { years: "5 años", text: "Consolidas el colchón y las primeras aportaciones periódicas." },
  { years: "10 años", text: "El interés compuesto empieza a pesar más que la amortización." },
  { years: "20 años", text: "La deuda decrece mientras el patrimonio invertido gana protagonismo." },
  { years: "30 años", text: "El prestamo desaparece y queda una estructura patrimonial propia." },
];

const PLANS = [
  {
    name: "Free",
    price: "0 €",
    tag: "Para empezar",
    features: ["Motor Patrimonial básico", "1 cartera", "Escenarios esenciales", "Datos guardados en tu cuenta"],
    cta: "Empezar gratis",
  },
  {
    name: "Premium",
    price: "12,99 €",
    tag: "El más elegido",
    highlight: true,
    features: [
      "Carteras ilimitadas",
      "Optimización Markowitz",
      "Monte Carlo y Wealth Score",
      "Análisis de riesgo avanzado",
      "Exportación de datos",
    ],
    cta: "Explorar Premium",
  },
  {
    name: "Premium Pro",
    price: "24,99 €",
    tag: "Patrimonio complejo",
    features: [
      "Todo lo de Premium",
      "Escenarios de estrés y rebalanceo",
      "Comparación de carteras",
      "Proyecciones a 30 años",
      "Soporte prioritario",
    ],
    cta: "Explorar Premium Pro",
  },
];

const FAQ = [
  {
    q: "¿Prestafin es asesoramiento financiero?",
    a: "No. Prestafin es una herramienta de análisis y simulación educativa. No emite recomendaciones personalizadas ni garantiza rentabilidades.",
  },
  {
    q: "¿Debo amortizar o invertir?",
    a: "Depende del tipo de interés, tu fiscalidad, tu horizonte y tu tolerancia al riesgo. Prestafin compara ambas vías y las estrategias híbridas con tus propios datos.",
  },
  {
    q: "¿De dónde salen los datos de mercado?",
    a: "De proveedores externos cuando están disponibles, complementados con parámetros históricos de rentabilidad y volatilidad por clase de activo.",
  },
  {
    q: "¿Mis datos son privados?",
    a: "Sí. Cada cuenta accede exclusivamente a su propia información, aislada a nivel de base de datos.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. La suscripción se gestiona desde tu área de cuenta y puedes cancelarla o reactivarla en cualquier momento.",
  },
];

/* ---------------------------------------------------------------- page */

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* 1 · Hero */}
        <section className="hero-glow relative overflow-hidden border-b border-border">
          <div className="mx-auto grid max-w-[84rem] gap-16 px-6 py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:px-10 lg:py-32">
            <div>
              <p className="animate-rise eyebrow">{"\n"}</p>
              <h1 className="animate-rise mt-6 font-display text-[2.75rem] leading-[1.05] text-balance sm:text-6xl">
                Tu patrimonio merece una estrategia.
              </h1>
              <div className="hairline mt-8 max-w-xs" />
              <p className="animate-rise mt-8 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
                Prestafin te ayuda a entender, analizar y optimizar tu patrimonio mientras gestionas
                tu prestamo.
              </p>
              <div className="animate-rise mt-10 flex flex-wrap gap-3">
                <Button size="lg" asChild className="rounded-full px-7">
                  <Link to="/auth">
                    Empieza gratis <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="rounded-full px-7">
                  <Link to="/mi-patrimonio">Explorar Prestafin</Link>
                </Button>
              </div>
              <p className="mt-8 text-xs text-muted-foreground">
                Análisis y simulación&nbsp;
              </p>
            </div>
            <div className="animate-fade">
              <WealthCurve />
            </div>
          </div>
        </section>

        {/* 2 · Cómo se utiliza — storytelling */}
        <Section
          eyebrow="Cómo funciona"
          title="Tres decisiones al mes. Una estrategia para décadas."
        >
          <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
                Imagina que recibes tu nómina. Una parte se va en gastos, otra en el prestamo y
                queda un margen que normalmente decide por ti: amortizar, ahorrar o invertir. Prestafin
                nace para darle voz a ese margen.
              </p>
              <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
                Primero cuentas cómo es tu prestamo: capital pendiente, tipo de interés, plazo y
                cuota. En segundos ves el mapa real de tu deuda: cuánto pagarás en intereses, en qué
                punto empiezas a ganar terreno y cuánto cuesta cada euro que no amortizas hoy.
              </p>
              <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
                Luego defines tu cartera. No eliges al azar: buscas activos reales por ticker o nombre,
                comparas rentabilidad y riesgo, y el motor de Markowitz te propone la combinación más
                eficiente para tu perfil. Monte Carlo te dibuja los caminos posibles, no solo el más
                probable.
              </p>
              <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
                Al final, cada mes recibes una pregunta clara: ¿amortizar, invertir o repartir? Y la
                respuesta ya no es un instinto. Es un número. Es una fecha. Es el día en el que tu
                patrimonio iguala tu deuda y empiezas a ganar de verdad.
              </p>
            </div>
            <div className="surface-card p-8">
              <ol className="relative space-y-8 before:absolute before:top-2 before:bottom-2 before:left-4 before:w-px before:bg-border">
                {[
                  { step: "1", title: "Cuenta tu prestamo", text: "Capital, tipo, plazo y cuota. En segundos lo modelamos real." },
                  { step: "2", title: "Diseña tu cartera", text: "ETFs, fondos, acciones, REITs, oro y cripto con datos de mercado reales." },
                  { step: "3", title: "Compara escenarios", text: "Amortizar, invertir o híbrido. Lo mismo en dinero, distinto en riesgo." },
                  { step: "4", title: "Actúa cada mes", text: "Recálculo, alertas y un plan que se ajusta a tu vida sin perder el rumbo." },
                ].map((item) => (
                  <li key={item.step} className="relative pl-12">
                    <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 font-display text-sm text-gold">
                      {item.step}
                    </span>
                    <h3 className="font-display text-xl">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Section>

        {/* 3 · Silos */}
        <Section
          tone="panel"
          eyebrow="Visión única"
          title="Tu dinero no debería estar trabajando en silos."
          intro="Prestamo, liquidez, fondos, ETFs y activos alternativos suelen vivir en aplicaciones distintas. Prestafin los conecta en una única visión patrimonial coherente."
        >
          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {SILOS.map((s) => (
              <div key={s.label} className="bg-surface p-8">
                <s.icon className="size-5 text-gold" strokeWidth={1.4} />
                <h3 className="mt-5 font-display text-xl">{s.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.note}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 4 · De la deuda al patrimonio */}
        <Section
          eyebrow="Recorrido"
          title="De la deuda al patrimonio."
          intro="Una secuencia ordenada, sin atajos ni promesas."
        >
          <ol className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
            {FLOW.map((f) => (
              <li key={f.step} className="bg-surface p-8">
                <span className="font-display text-sm text-gold">{f.step}</span>
                <h3 className="mt-4 font-display text-2xl">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* 5 · Motor Patrimonial */}
        <Section tone="panel">
          <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <p className="eyebrow">Motor Patrimonial</p>
              <h2 className="mt-4 font-display text-3xl text-balance sm:text-[2.6rem] sm:leading-[1.1]">
                El motor de tu patrimonio.
              </h2>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-muted-foreground">
                Patrimonio neto, deuda pendiente, liquidez y capital invertido en una sola lectura,
                con el cruce entre patrimonio y deuda como métrica central.
              </p>
              <Button variant="outline" asChild className="mt-8 rounded-full px-6">
                <Link to="/mi-patrimonio">
                  Abrir Motor Patrimonial <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="surface-card p-8">
              <div className="grid gap-8 sm:grid-cols-3">
                {[
                  { k: "Patrimonio neto", v: "312.400 €" },
                  { k: "Deuda pendiente", v: "148.900 €" },
                  { k: "Capital invertido", v: "196.200 €" },
                ].map((m) => (
                  <div key={m.k}>
                    <p className="eyebrow">{m.k}</p>
                    <p className="mt-3 font-display text-2xl tabular-nums">{m.v}</p>
                  </div>
                ))}
              </div>
              <div className="my-8 h-px w-full bg-border" />
              <WealthCurve compact />
              <p className="mt-6 text-xs text-muted-foreground">
                Cifras ilustrativas de una simulación. No representan resultados reales.
              </p>
            </div>
          </div>
        </Section>

        {/* 6 · Portfolio Lab */}
        <Section
          eyebrow="Portfolio Lab"
          title="Análisis de cartera de nivel institucional."
          intro="La misma matemática que utilizan las gestoras, presentada para que una persona pueda entenderla y usarla."
        >
          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {LAB.map((l) => (
              <div key={l.title} className="bg-surface p-9">
                <h3 className="font-display text-2xl">{l.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{l.text}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" asChild className="mt-10 rounded-full px-6">
            <Link to="/portfolio-lab">
              Abrir Portfolio Lab <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Section>

        {/* 7 · Datos reales */}
        <Section tone="panel">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow">Rigor</p>
              <h2 className="mt-4 font-display text-3xl sm:text-[2.6rem] sm:leading-[1.1]">
                Datos reales.
              </h2>
            </div>
            <p className="text-[1.0625rem] leading-relaxed text-muted-foreground">
              Los activos de la plataforma utilizan datos de mercado procedentes de proveedores
              externos cuando están disponibles. Cuando no lo están, se emplean parámetros
              históricos de rentabilidad y volatilidad por clase de activo, siempre indicados como
              estimaciones.
            </p>
          </div>
        </Section>

        {/* 8 · Escenarios */}
        <Section
          eyebrow="Escenarios"
          title="Un patrimonio. Miles de escenarios."
          intro="Amortizar, invertir o combinar ambas vías. Cada decisión se simula sobre tu propia estructura financiera."
        >
          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            {[
              { k: "Amortizar", v: "Rentabilidad cierta e igual al tipo de tu prestamo." },
              { k: "Invertir", v: "Rentabilidad esperada mayor, con volatilidad asociada." },
              { k: "Híbrido", v: "Reparto del ahorro entre deuda y cartera, mes a mes." },
            ].map((s) => (
              <div key={s.k} className="bg-surface p-9">
                <p className="eyebrow">Estrategia</p>
                <h3 className="mt-3 font-display text-2xl">{s.k}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.v}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 9 · Largo plazo */}
        <Section tone="panel" eyebrow="Horizonte" title="Construido para largo plazo.">
          <div className="mt-14 border-t border-border">
            {HORIZONS.map((h) => (
              <div
                key={h.years}
                className="grid gap-4 border-b border-border py-7 sm:grid-cols-[10rem_1fr] sm:items-baseline"
              >
                <p className="font-display text-2xl text-gold">{h.years}</p>
                <p className="text-[1.0625rem] leading-relaxed text-muted-foreground">{h.text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 10 · Planes */}
        <Section
          id="planes"
          eyebrow="Planes"
          title="Acceso proporcional a tu patrimonio."
          intro="Empieza gratis y amplía cuando necesites análisis avanzado."
        >
          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={cn("relative bg-surface p-9", p.highlight && "bg-surface-2")}
              >
                {p.highlight ? (
                  <span className="gold-chip absolute top-9 right-9 rounded-full px-3 py-1 text-[0.6875rem] tracking-wide uppercase">
                    {p.tag}
                  </span>
                ) : (
                  <span className="eyebrow">{p.tag}</span>
                )}
                <h3 className="mt-4 font-display text-2xl">{p.name}</h3>
                <p className="mt-4 font-display text-4xl tabular-nums">
                  {p.price}
                  <span className="ml-1 font-sans text-sm text-muted-foreground">/mes</span>
                </p>
                <ul className="mt-8 space-y-3.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={1.6} />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-9 w-full rounded-full"
                  variant={p.highlight ? "default" : "outline"}
                  asChild
                >
                  <Link to="/suscripcion">{p.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </Section>

        {/* 11 · FAQ */}
        <Section tone="panel" eyebrow="Preguntas" title="Lo que conviene saber antes de empezar.">
          <div className="mt-14 border-t border-border">
            {FAQ.map((f) => (
              <div
                key={f.q}
                className="grid gap-4 border-b border-border py-8 md:grid-cols-[1fr_1.4fr]"
              >
                <h3 className="font-display text-xl text-balance">{f.q}</h3>
                <p className="leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 12 · CTA final */}
        <section className="hero-glow border-t border-border">
          <div className="mx-auto max-w-3xl px-6 py-28 text-center sm:py-36">
            <BrandMark size={40} className="mx-auto" />
            <h2 className="mt-8 font-display text-3xl text-balance sm:text-5xl sm:leading-[1.1]">
              Empieza a tratar tu dinero como un patrimonio.
            </h2>
            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-muted-foreground">
              Crea tu cuenta, introduce tu prestamo y observa cómo evoluciona tu estrategia.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild className="rounded-full px-7">
                <Link to="/auth">
                  Empieza gratis <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full px-7">
                <Link to="/suscripcion">Ver planes</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-2/40 py-16">
      <div className="mx-auto max-w-[84rem] px-6 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div className="max-w-md">
            <BrandMark size={26} />
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Prestafin es una herramienta de análisis y simulación. No constituye
              asesoramiento financiero, fiscal ni de inversión personalizado. Las rentabilidades
              pasadas no garantizan rentabilidades futuras.
            </p>
          </div>
          <nav className="grid gap-3 text-sm text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">
              Inicio
            </Link>
            <Link to="/mi-patrimonio" className="transition-colors hover:text-foreground">
              Motor Patrimonial
            </Link>
            <Link to="/portfolio-lab" className="transition-colors hover:text-foreground">
              Portfolio Lab
            </Link>
            <Link to="/suscripcion" className="transition-colors hover:text-foreground">
              Planes
            </Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">
              Términos de Servicio
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Política de Privacidad
            </Link>
            <Link to="/refund" className="transition-colors hover:text-foreground">
              Política de Reembolsos
            </Link>
          </nav>
        </div>
        <div className="mt-12 h-px w-full bg-border" />
        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Prestafin&nbsp;
          </p>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Nuestro proceso de pedidos se realiza a través de Stripe, que actúa como Merchant of Record
            para todos nuestros pedidos.
          </p>
        </div>

      </div>
    </footer>
  );
}

