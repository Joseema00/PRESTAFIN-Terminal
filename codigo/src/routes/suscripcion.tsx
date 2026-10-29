import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/app/site-header";
import { PaymentTestModeBanner } from "@/components/app/paywall";
import { RedeemCodeCard } from "@/components/app/redeem-code";
import { useSubscription } from "@/hooks/use-subscription";
import { useCheckout } from "@/hooks/use-checkout";
import { useAuth } from "@/hooks/use-auth";
import { PLANS, PLAN_ORDER, type Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { trackAdsEventOnce } from "@/lib/analytics/gtag";

export const Route = createFileRoute("/suscripcion")({
  component: SubscriptionPage,
  head: () => ({
    meta: [
      { title: "Planes y suscripción | Prestafin" },
      {
        name: "description",
        content:
          "Compara los planes Free, Premium y Premium Pro de Prestafin y gestiona tu suscripción, facturación y método de pago.",
      },
      { property: "og:title", content: "Planes y suscripción | Prestafin" },
      {
        property: "og:description",
        content: "Elige el plan que desbloquea la optimización patrimonial completa de Prestafin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function SubscriptionPage() {
  const { isAuthenticated } = useAuth();
  const { plan, status, subscription, isActive, isPastDue, loading, refresh } = useSubscription();
  const { startCheckout, loading: checkoutLoading, checkoutElement } = useCheckout();

  const search = typeof window !== "undefined" ? window.location.search : "";

  useEffect(() => {
    if (!search.includes("checkout=success")) return;
    toast.success("¡Gracias! Estamos activando tu plan…");
    const timers = [3000, 8000].map((ms) => setTimeout(refresh, ms));
    return () => timers.forEach(clearTimeout);
  }, [search, refresh]);

  // Google Ads purchase conversion: only once the paid plan is actually active.
  useEffect(() => {
    if (!search.includes("checkout=success")) return;
    if (!isActive || plan === "free") return;
    const ref = subscription?.provider_subscription_id ?? `${plan}`;
    trackAdsEventOnce(`purchase.${ref}`, "purchase", {
      currency: "EUR",
      value: PLANS[plan].amount,
      transaction_id: ref,
      items: [{ item_id: PLANS[plan].priceId, item_name: PLANS[plan].name }],
    });
  }, [search, isActive, plan, subscription]);

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-14">
        <header className="max-w-2xl">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="mr-1.5 size-3.5" /> Planes Prestafin
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight">Elige cómo quieres optimizar tu patrimonio</h1>
          <p className="mt-3 text-muted-foreground">
            Empieza gratis y desbloquea la optimización avanzada cuando la necesites. Cancela cuando quieras.
          </p>
        </header>

        {isAuthenticated && !loading && (
          <div className="surface-card mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-medium">
                Plan actual: {PLANS[plan].name}
                {isPastDue && <span className="ml-2 text-destructive">· pago pendiente</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {subscription?.current_period_end
                  ? `${subscription.cancel_at_period_end ? "Acceso hasta" : "Se renueva el"} ${new Date(
                      subscription.current_period_end,
                    ).toLocaleDateString("es-ES")}`
                  : `Estado: ${status}`}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/cuenta">
                Gestionar suscripción <ExternalLink className="ml-2 size-3.5" />
              </Link>
            </Button>
          </div>
        )}

        <RedeemCodeCard />

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            const current = plan === id && (id === "free" ? !isActive : true);
            const featured = id === "premium";
            return (
              <div
                key={id}
                className={cn(
                  "surface-card flex flex-col p-7",
                  featured && "border-brand/40 ring-1 ring-brand/20",
                )}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  {current ? (
                    <Badge variant="secondary">Tu plan</Badge>
                  ) : featured ? (
                    <Badge>Más elegido</Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">{p.priceLabel}</span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>
                <ul className="mt-6 grid gap-2.5 text-sm">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                      <span className="text-muted-foreground">{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  {id === "free" ? (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to={isAuthenticated ? "/mi-patrimonio" : "/auth"}>
                        {isAuthenticated ? "Ir a mi patrimonio" : "Empezar gratis"}
                      </Link>
                    </Button>
                  ) : current ? (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/cuenta">Gestionar plan</Link>
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={featured ? "default" : "outline"}
                      disabled={checkoutLoading}
                      onClick={() => void startCheckout(id as Exclude<Plan, "free">)}
                    >
                      {checkoutLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                      {isActive ? `Cambiar a ${p.name}` : `Elegir ${p.name}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {checkoutElement && (
          <div className="mt-8 rounded-xl border border-border p-4 shadow-sm">
            {checkoutElement}
          </div>
        )}

        <p className="mt-10 text-xs text-muted-foreground">

          Los pagos y las facturas los gestiona nuestro proveedor de pagos como vendedor autorizado (Merchant of
          Record), incluidos los impuestos aplicables. Prestafin ofrece simulaciones educativas y no constituye
          asesoramiento financiero personalizado.
        </p>
      </main>
    </div>
  );
}
