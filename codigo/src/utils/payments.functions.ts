import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import type Stripe from "stripe";

type CheckoutSessionResult = { clientSecret: string } | { error: string };

type PortalSessionResult = { url: string } | { error: string };

type Plan = string | null;

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

const THREE_DECIMAL_CURRENCIES = new Set(["bhd", "jod", "kwd", "omr", "tnd"]);

function planFromPrice(price: any): Plan {
  return price?.lookup_key ?? price?.metadata?.plan ?? null;
}

function toMajorUnit(amount: number | null | undefined, currency: string): number {
  const value = amount ?? 0;
  const c = (currency ?? "").toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return value;
  if (THREE_DECIMAL_CURRENCIES.has(c)) return value / 1000;
  return value / 100;
}

function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0]!.id;

  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0]!;
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      priceId: string;
      quantity?: number;
      customerEmail?: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const stripePrice = prices.data[0]!;
      const isRecurring = stripePrice.type === "recurring";

      const customerOptions: { email?: string; userId?: string } = {};
      const authenticatedEmail = typeof context.claims.email === "string" ? context.claims.email : data.customerEmail;
      if (authenticatedEmail) customerOptions.email = authenticatedEmail;
      customerOptions.userId = context.userId;
      const customerId = await resolveOrCreateCustomer(stripe, customerOptions);

      let productDescription: string | undefined;
      if (!isRecurring) {
        const productId =
          typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product?.id;
        if (!productId) throw new Error("Price has no product");
        const product = await stripe.products.retrieve(productId);
        productDescription = product.name;
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        managed_payments: { enabled: true },
        ...(customerId && { customer: customerId }),
        ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
        metadata: { userId: context.userId },
        ...(isRecurring && { subscription_data: { metadata: { userId: context.userId } } }),
      } as Stripe.Checkout.SessionCreateParams);


      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    const { supabase, userId } = context;

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError || !sub?.provider_customer_id) {
      return { error: "Todavía no tienes una suscripción activa" };
    }

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.provider_customer_id,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

async function findCustomerIds(
  stripe: ReturnType<typeof createStripeClient>,
  options: { userId: string; email?: string },
): Promise<string[]> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  const ids = new Set<string>();

  const subs = await stripe.subscriptions.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 100,
  });
  for (const sub of subs.data) {
    const customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (customer) ids.add(customer);
  }

  const customers = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 100,
  });
  for (const c of customers.data) ids.add(c.id);

  if (ids.size === 0 && options.email) {
    const byEmail = await stripe.customers.list({ email: options.email, limit: 100 });
    for (const c of byEmail.data) ids.add(c.id);
  }

  return [...ids];
}

async function fetchSubscriptionsForCustomers(
  stripe: ReturnType<typeof createStripeClient>,
  customerIds: string[],
) {
  const out: Array<{
    id: string;
    status: string;
    plan: Plan;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    customer_id: string;
  }> = [];
  for (const customerId of customerIds) {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    for (const sub of list.data) {
      const item = sub.items?.data?.[0];
      const periodEnd = item?.current_period_end ?? (sub as any).current_period_end;
      out.push({
        id: sub.id,
        status: sub.status,
        plan: planFromPrice(item?.price),
        current_period_end: isoFromUnix(periodEnd),
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        customer_id: customerId,
      });
    }
  }
  return out;
}

async function fetchInvoicesForCustomers(
  stripe: ReturnType<typeof createStripeClient>,
  customerIds: string[],
) {
  const out: Array<{
    id: string;
    status: string | null;
    amount_paid: number;
    currency: string;
    created: string | null;
    hosted_invoice_url: string | null;
    pdf_url: string | null;
    plan: Plan;
    customer_id: string;
  }> = [];
  for (const customerId of customerIds) {
    const list = await stripe.invoices.list({ customer: customerId, limit: 100 });
    for (const inv of list.data) {
      const line = inv.lines?.data?.[0];
      out.push({
        id: inv.id ?? "",
        status: inv.status ?? null,
        amount_paid: toMajorUnit(inv.amount_paid, inv.currency),
        currency: inv.currency,
        created: isoFromUnix(inv.created),
        hosted_invoice_url: inv.hosted_invoice_url ?? null,
        pdf_url: inv.invoice_pdf ?? null,
        plan: planFromPrice((line as any)?.price),
        customer_id: customerId,
      });
    }
  }
  return out;
}

export type StripeDataResult =
  | { subscriptions: Awaited<ReturnType<typeof fetchSubscriptionsForCustomers>>; invoices: Awaited<ReturnType<typeof fetchInvoicesForCustomers>> }
  | { error: string };

export const getStripeData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<StripeDataResult> => {
    try {
      const { userId, supabase } = context;
      const { data: userRes } = await supabase.auth.getUser();
      const stripe = createStripeClient(data.environment);
      const email = userRes.user?.email ?? undefined;
      const customerIds = await findCustomerIds(stripe, {
        userId,
        ...(email && { email }),
      });


      if (customerIds.length === 0) {
        return { subscriptions: [], invoices: [] };
      }

      const [subscriptions, invoices] = await Promise.all([
        fetchSubscriptionsForCustomers(stripe, customerIds),
        fetchInvoicesForCustomers(stripe, customerIds),
      ]);

      return { subscriptions, invoices };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
