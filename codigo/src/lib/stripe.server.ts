import Stripe from "stripe";

export type StripeEnv = "sandbox" | "live";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
}

export function getConnectionApiKey(env: StripeEnv): string {
  return env === "sandbox" ? getEnv("STRIPE_SANDBOX_SECRET_KEY") : getEnv("STRIPE_LIVE_SECRET_KEY");
}

const clients: Partial<Record<StripeEnv, Stripe>> = {};

/**
 * Talks to the Stripe API directly. No proxy/gateway in front of it — the
 * secret key never leaves this server-only module.
 */
export function createStripeClient(env: StripeEnv): Stripe {
  const existing = clients[env];
  if (existing) return existing;

  const secretKey = getConnectionApiKey(env);
  const client = new Stripe(secretKey);
  clients[env] = client;
  return client;
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const stripeError = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: {
        message?: string;
        type?: string;
        code?: string;
        decline_code?: string;
        param?: string;
        requestId?: string;
      };
    };

    const message = stripeError.raw?.message ?? stripeError.message;
    if (message) {
      const details = [
        stripeError.raw?.type ?? stripeError.type,
        stripeError.raw?.code ?? stripeError.code,
        stripeError.raw?.decline_code ?? stripeError.decline_code,
        stripeError.raw?.param ?? stripeError.param,
        stripeError.raw?.requestId ?? stripeError.requestId,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(", ")})` : message;
    }
  }

  return "Stripe request failed";
}

/** Verifies a Stripe webhook signature using the SDK's own (timing-safe) implementation. */
export async function verifyWebhook(req: Request, env: StripeEnv): Promise<Stripe.Event> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret =
    env === "sandbox" ? getEnv("STRIPE_SANDBOX_WEBHOOK_SECRET") : getEnv("STRIPE_LIVE_WEBHOOK_SECRET");

  if (!secret || !signature || !body) {
    throw new Error("Missing signature or body");
  }

  const stripe = createStripeClient(env);
  return stripe.webhooks.constructEvent(body, signature, secret);
}
