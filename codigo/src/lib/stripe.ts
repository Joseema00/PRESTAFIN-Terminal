import { loadStripe, Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

export function getStripeEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Stripe payments are not configured for this build. " +
      "Set VITE_PAYMENTS_CLIENT_TOKEN to a Stripe publishable key (pk_test_... or pk_live_...).",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    getStripeEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}
