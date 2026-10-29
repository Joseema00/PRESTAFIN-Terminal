import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { planFromPriceId } from "@/lib/plans";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}



async function resolveUserId(
  subscription: any,
): Promise<{ userId: string | null; customerId: string | null }> {
  const userIdFromSub = subscription.metadata?.userId;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (userIdFromSub) return { userId: userIdFromSub, customerId };

  if (!customerId) return { userId: null, customerId: null };

  try {
    const { data, error } = await getSupabase()
      .from("subscriptions")
      .select("user_id")
      .eq("provider_customer_id", customerId)
      .limit(1)
      .maybeSingle() as { data: { user_id: string } | null; error: Error | null };
    if (!error && data) return { userId: data.user_id, customerId };
  } catch (e) {
    console.error("resolveUserId error", e);
  }


  return { userId: null, customerId };
}

function extractPriceId(item: any): string | null {
  return item?.price?.lookup_key || item?.price?.metadata?.plan || item?.price?.id || null;
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const { userId, customerId } = await resolveUserId(subscription);
  if (!userId) {
    console.error("No userId resolved for subscription", subscription.id);
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId = extractPriceId(item);
  const plan = planFromPriceId(priceId ?? "") || "premium";
  const productId = typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id;

  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      provider_subscription_id: subscription.id,
      provider_customer_id: customerId,
      plan,
      price_id: priceId ?? "",
      product_id: productId ?? "",
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

}

async function updateSubscription(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = extractPriceId(item);
  const plan = planFromPriceId(priceId ?? "") || undefined;
  const productId = typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id;

  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("subscriptions").update({
    status: subscription.status,
    price_id: priceId ?? undefined,
    product_id: productId ?? undefined,
    ...(plan && { plan }),
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    updated_at: new Date().toISOString(),
  }).eq("provider_subscription_id", subscription.id).eq("environment", env);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq("provider_subscription_id", subscription.id)
    .eq("environment", env);
}

async function handleCheckoutSessionCompleted(session: any, env: StripeEnv) {
  if (session.payment_status !== "unpaid" && session.subscription) {
    const stripe = await import("@/lib/stripe.server").then((m) => m.createStripeClient(env));
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    await upsertSubscription(subscription, env);
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "customer.subscription.created":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.updated":
      await updateSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object, env);
      break;
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutSessionCompleted(event.data.object, env);
      break;
    case "invoice.paid":
      // Subscription state is handled by customer.subscription.* events.
      break;
    default:
      console.log("Unhandled Stripe event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
