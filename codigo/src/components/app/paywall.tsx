import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Loader2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { useCheckout } from "@/hooks/use-checkout";
import { CAPABILITY_COPY, PLANS, requiredPlan, type Capability, type Plan } from "@/lib/plans";
import { getStripeEnvironment } from "@/lib/stripe";

export function PlanBadge({ className }: { className?: string }) {
  const { planName, isPastDue, loading } = useSubscription();
  if (loading) return null;
  return (
    <Badge variant={isPastDue ? "destructive" : "secondary"} className={cn("font-medium", className)}>
      {isPastDue ? "Pago pendiente" : `Plan ${planName}`}
    </Badge>
  );
}

export function PaymentTestModeBanner() {
  const env = getStripeEnvironment();
  if (env !== "sandbox") return null;

  return (
    <div className="w-full border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-700 dark:text-amber-300">
      Los pagos en la vista previa son de prueba: no se realizan cobros reales.
    </div>
  );
}

export function UpgradeCard({
  title,
  description,
  plan,
  compact,
}: {
  title: string;
  description: string;
  plan: Plan;
  compact?: boolean;
}) {
  const { startCheckout, loading, checkoutElement } = useCheckout();

  const target = PLANS[plan];

  return (
    <div
      className={cn(
        "surface-card flex flex-col items-start gap-4 border-gold/30 bg-gold/[0.05] p-6",
        compact && "p-4",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-gold/35 text-gold">
          <Lock className="size-4" strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-display text-lg">{title}</p>
          <p className="text-xs text-muted-foreground">Disponible en {target.name}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {!compact && (
        <ul className="grid gap-1.5 text-sm text-muted-foreground">
          {target.highlights.map((h) => (
            <li key={h} className="flex items-center gap-2">
              <Minus className="size-3.5 text-gold" /> {h}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          className="rounded-full"
          disabled={loading}
          onClick={() => void startCheckout(plan === "pro" ? "pro" : "premium")}
        >
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Desbloquear {target.name} · {target.priceLabel}/mes
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to="/suscripcion">Explorar Premium</Link>
        </Button>
      </div>
      {checkoutElement && (
        <div className="mt-4 w-full rounded-lg border border-gold/30 p-3">{checkoutElement}</div>
      )}
    </div>
  );
}


/**
 * Renders children only when the current plan includes the capability.
 * Client-side gating is UX; sensitive data stays protected by RLS + server checks.
 */
export function FeatureGate({
  capability,
  children,
  compact,
  fallback,
}: {
  capability: Capability;
  children: ReactNode;
  compact?: boolean;
  fallback?: ReactNode;
}) {
  const { can, loading } = useSubscription();
  if (loading) return null;
  if (can(capability)) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  const copy = CAPABILITY_COPY[capability];
  return (
    <UpgradeCard
      title={copy.title}
      description={copy.description}
      plan={requiredPlan(capability)}
      {...(compact ? { compact: true } : {})}
    />
  );
}

export function LimitNotice({
  message,
  plan = "premium",
}: {
  message: string;
  plan?: Plan;
}) {
  const { startCheckout, loading, checkoutElement } = useCheckout();
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/30 bg-gold/[0.05] px-4 py-3 text-sm">
        <span className="text-muted-foreground">{message}</span>
        <Button size="sm" className="rounded-full" disabled={loading} onClick={() => void startCheckout(plan === "pro" ? "pro" : "premium")}>
          Pasar a {PLANS[plan].name}
        </Button>
      </div>
      {checkoutElement && (
        <div className="mt-4 rounded-lg border border-gold/30 p-3">{checkoutElement}</div>
      )}
    </div>
  );
}

