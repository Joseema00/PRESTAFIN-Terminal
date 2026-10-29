import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  can as planCan,
  limitOf,
  ENTITLED_STATUSES,
  PLANS,
  planFromPriceId,
  type Capability,
  type LimitKey,
  type Plan,
} from "@/lib/plans";

export type SubscriptionRow = {
  plan: Plan;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  current_period_start: string | null;
  cancel_at_period_end: boolean;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
};

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const environment = getStripeEnvironment();

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["subscription", user?.id ?? null, environment],
    enabled: !!user && !authLoading,
    staleTime: 30_000,
    queryFn: async (): Promise<SubscriptionRow | null> => {
      if (!user) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select(
          "plan,status,price_id,current_period_end,current_period_start,cancel_at_period_end,provider_subscription_id,provider_customer_id",
        )
        .eq("user_id", user.id)
        .eq("environment", environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as SubscriptionRow | null) ?? null;
    },
  });

  const status = data?.status ?? "active";
  const entitled = !!data && ENTITLED_STATUSES.includes(status);
  const plan: Plan = entitled ? (data?.plan ?? planFromPriceId(data?.price_id)) : "free";

  const can = useCallback((capability: Capability) => planCan(plan, capability), [plan]);
  const limit = useCallback((key: LimitKey) => limitOf(plan, key), [plan]);
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["subscription"] });
  }, [queryClient]);

  return {
    plan,
    planName: PLANS[plan].name,
    definition: PLANS[plan],
    status,
    subscription: data ?? null,
    isActive: entitled && plan !== "free",
    isPastDue: status === "past_due",
    loading: authLoading || isLoading,
    environment,
    can,
    limit,
    refresh,
  };
}
