import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  deletePortfolioSchema,
  preferencesSchema,
  profileSchema,
  saveWorkspaceSchema,
} from "@/lib/private-data.schemas";

export const loadMyWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [portfoliosResult, wealthResult, mortgageResult] = await Promise.all([
      supabase
        .from("portfolios")
        .select("id,name,origin,holdings,created_at,is_active")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("wealth_profile")
        .select("cash,other_assets,monthly_contribution,settings")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("mortgages")
        .select("id,principal,annual_rate,term_years,extra_monthly")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    const error = portfoliosResult.error ?? wealthResult.error ?? mortgageResult.error;
    if (error) throw new Error(error.message);

    return {
      ownerId: userId,
      portfolios: portfoliosResult.data ?? [],
      wealth: wealthResult.data ?? null,
      mortgage: mortgageResult.data ?? null,
    };
  });

export const saveMyWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveWorkspaceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.portfolios) {
      if (data.portfolios.length > 0) {
        const { error } = await supabase.from("portfolios").upsert(
          data.portfolios.map((portfolio) => ({
            id: portfolio.id,
            user_id: userId,
            name: portfolio.name,
            origin: portfolio.origin,
            is_active: portfolio.isActive,
            holdings: portfolio.holdings,
          })),
        );
        if (error) throw new Error(error.message);
      }
    }

    if (data.wealth) {
      const { error } = await supabase.from("wealth_profile").upsert({
        user_id: userId,
        cash: data.wealth.cash,
        other_assets: data.wealth.otherAssets,
        monthly_contribution: data.wealth.monthlyContribution,
        settings: data.wealth.settings,
      });
      if (error) throw new Error(error.message);
    }

    if (data.mortgage) {
      if (data.mortgage.id) {
        const { error } = await supabase
          .from("mortgages")
          .update({
            principal: data.mortgage.principal,
            annual_rate: data.mortgage.rate,
            term_years: data.mortgage.years,
            extra_monthly: data.mortgage.extraMonthly,
          })
          .eq("id", data.mortgage.id)
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
      } else {
        const { data: created, error } = await supabase
          .from("mortgages")
          .insert({
            user_id: userId,
            principal: data.mortgage.principal,
            annual_rate: data.mortgage.rate,
            term_years: data.mortgage.years,
            extra_monthly: data.mortgage.extraMonthly,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        return { ok: true as const, ownerId: userId, mortgageId: created.id };
      }
    }

    return { ok: true as const, ownerId: userId, mortgageId: data.mortgage?.id ?? null };
  });

export const deleteMyPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deletePortfolioSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("portfolios")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("full_name,currency")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.fullName, currency: data.currency })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getMyEmailPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("email_preferences")
      .select("transactional,newsletter,newsletter_frequency")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

export const updateMyEmailPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => preferencesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("email_preferences").upsert({
      user_id: context.userId,
      transactional: data.transactional,
      newsletter: data.newsletter,
      newsletter_frequency: data.newsletterFrequency,
      consent_at: data.newsletter ? new Date().toISOString() : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });