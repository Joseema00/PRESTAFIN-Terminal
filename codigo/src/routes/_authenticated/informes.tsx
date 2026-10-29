import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/app/site-header";
import { ReportPanel } from "@/components/app/report-panel";

export const Route = createFileRoute("/_authenticated/informes")({
  head: () => ({
    meta: [
      { title: "Informes ejecutivos en PDF | Prestafin" },
      {
        name: "description",
        content:
          "Genera un informe financiero personalizado en PDF con tu patrimonio, préstamo, cartera, escenarios y plan de acción.",
      },
      { property: "og:title", content: "Informes ejecutivos | Prestafin" },
      {
        property: "og:description",
        content:
          "Documento profesional en PDF con diagnóstico patrimonial, riesgo de cartera y plan de acción personalizado.",
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
          <p className="eyebrow">Informes</p>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl">Tu informe ejecutivo.</h1>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Un PDF profesional con el análisis completo de tu situación financiera, adaptado a las
            secciones incluidas en tu plan.
          </p>
        </div>
        <ReportPanel />
      </main>
    </div>
  );
}
