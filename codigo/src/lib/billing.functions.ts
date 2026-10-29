import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { planFromPriceId } from "@/lib/plans";

const envOf = (v: unknown): StripeEnv => (v === "live" ? "live" : "sandbox");

async function loadSubscription(
  supabase: any,
  environment: StripeEnv,
  userId: string,
): Promise<{ provider_subscription_id: string | null; provider_customer_id: string | null } | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id, provider_customer_id")
    .eq("user_id", userId)
    .eq("environment", environment)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export const getBillingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }) => {
    const environment = envOf(data.environment);
    const { supabase, userId } = context;

    const [{ data: subscription }, { data: payments }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("environment", environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .eq("environment", environment)
        .order("occurred_at", { ascending: false })
        .limit(24),
    ]);

    return { subscription: subscription ?? null, payments: payments ?? [] };
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; returnUrl?: string }) => data)
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.provider_customer_id) {
      throw new Error("Todavía no tienes una suscripción activa");
    }

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.provider_customer_id,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      throw new Error(getStripeErrorMessage(error));
    }
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const sub = await loadSubscription(context.supabase, data.environment, userId);
    if (!sub?.provider_subscription_id) throw new Error("No hay ninguna suscripción que cancelar");

    try {
      const stripe = createStripeClient(data.environment);
      await stripe.subscriptions.update(sub.provider_subscription_id, {
        cancel_at_period_end: true,
      });
      return { ok: true };
    } catch (error) {
      throw new Error(getStripeErrorMessage(error));
    }
  });

export const resumeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { userId } = context;
    const sub = await loadSubscription(context.supabase, data.environment, userId);
    if (!sub?.provider_subscription_id) throw new Error("No hay ninguna suscripción que reactivar");

    try {
      const stripe = createStripeClient(data.environment);
      await stripe.subscriptions.update(sub.provider_subscription_id, {
        cancel_at_period_end: false,
      });
      return { ok: true };
    } catch (error) {
      throw new Error(getStripeErrorMessage(error));
    }
  });

export const changeSubscriptionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; priceId: string }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { userId } = context;
    const sub = await loadSubscription(context.supabase, data.environment, userId);
    if (!sub?.provider_subscription_id) throw new Error("No hay ninguna suscripción que modificar");

    try {
      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Plan no disponible");
      const stripePrice = prices.data[0]!;

      const subscription = await stripe.subscriptions.retrieve(sub.provider_subscription_id);
      const currentItem = subscription.items?.data?.[0];
      if (!currentItem) throw new Error("No se encontró el item de suscripción");

      await stripe.subscriptions.update(sub.provider_subscription_id, {
        items: [{ id: currentItem.id, price: stripePrice.id }],
        proration_behavior: "create_prorations",
        metadata: { priceId: data.priceId, plan: planFromPriceId(data.priceId) },
      });

      return { ok: true };
    } catch (error) {
      throw new Error(getStripeErrorMessage(error));
    }
  });
