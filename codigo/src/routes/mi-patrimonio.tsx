import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/app/site-header";
import { WealthDashboard } from "@/components/app/wealth-dashboard";
import { useAuth } from "@/hooks/use-auth";

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 14) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
}

export const Route = createFileRoute("/mi-patrimonio")({
  head: () => ({
    meta: [
      { title: "Motor Patrimonial — Patrimonio, deuda y escenarios | Prestafin" },
      {
        name: "description",
        content:
          "Panel patrimonial con proyección Monte Carlo, comparativa amortizar vs invertir, cuadro de amortización y Health Score financiero.",
      },
      { property: "og:title", content: "Motor Patrimonial | Prestafin" },
      {
        property: "og:description",
        content:
          "Visualiza patrimonio, deuda y liquidez, y descubre cuándo tu cartera igualará el prestamo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const name =
    (user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0];
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[84rem] px-6 py-14 lg:px-10">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">{name ? `${greeting()}, ${name}` : "Motor Patrimonial"}</p>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl">Así evoluciona tu patrimonio.</h1>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Deuda, liquidez y capital invertido en una sola lectura, con escenarios, progreso
            patrimonial y salud financiera.
          </p>
        </div>
        <WealthDashboard />
      </main>
    </div>
  );
}