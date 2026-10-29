import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/app/site-header";
import { PortfolioLab } from "@/components/app/portfolio-lab";

export const Route = createFileRoute("/portfolio-lab")({
  head: () => ({
    meta: [
      { title: "Portfolio Lab — Optimización de carteras | Prestafin" },
      {
        name: "description",
        content:
          "Crea carteras con ETFs, fondos, acciones, REITs, oro y cripto y optimízalas con teoría moderna de carteras: frontera eficiente, Sharpe y Monte Carlo.",
      },
      { property: "og:title", content: "Portfolio Lab — Optimización de carteras | Prestafin" },
      {
        property: "og:description",
        content:
          "Frontera eficiente, máxima ratio de Sharpe, mínima volatilidad, correlaciones y simulaciones Monte Carlo sobre tu propia cartera.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[84rem] px-6 py-14 lg:px-10">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">Laboratorio de carteras</p>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl">Análisis de cartera.</h1>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Construye carteras con activos reales y analízalas con teoría moderna de carteras
            (Markowitz), riesgo y escenarios. Todo son simulaciones educativas.
          </p>
        </div>
        <PortfolioLab />
      </main>
    </div>
  );
}