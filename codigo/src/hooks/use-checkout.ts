import { useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { getStripeEnvironment } from "@/lib/stripe";
import { changeSubscriptionPlan } from "@/lib/billing.functions";
import { PLANS, type Plan } from "@/lib/plans";
import { trackAdsEvent } from "@/lib/analytics/gtag";

export function useCheckout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscription, isActive, refresh } = useSubscription();
  const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();

  const startCheckout = useCallback(
    async (plan: Exclude<Plan, "free">) => {
      if (!user) {
        toast.info("Crea tu cuenta para suscribirte");
        void navigate({ to: "/auth" });
        return;
      }
      const priceId = PLANS[plan].priceId;
      if (!priceId) return;

      try {
        if (isActive && subscription?.provider_subscription_id) {
          await changeSubscriptionPlan({ data: { environment: getStripeEnvironment(), priceId } });
          toast.success(`Plan cambiado a ${PLANS[plan].name}`);
          setTimeout(refresh, 2500);
          return;
        }

        trackAdsEvent("begin_checkout", {
          currency: "EUR",
          value: PLANS[plan].amount,
          items: [{ item_id: priceId, item_name: PLANS[plan].name }],
        });

        openCheckout({
          priceId,
          quantity: 1,
          returnUrl: `${window.location.origin}/suscripcion?checkout=success`,
          environment: getStripeEnvironment(),
          ...(user.email && { customerEmail: user.email }),
        });

      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo abrir el pago");
      }
    },
    [user, navigate, isActive, subscription, openCheckout, refresh],
  );

  return { startCheckout, closeCheckout, isOpen, checkoutElement, loading: isOpen };
}
