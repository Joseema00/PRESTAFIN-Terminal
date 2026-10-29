import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Env = "sandbox" | "live";
const envOf = (v: unknown): Env => (v === "live" ? "live" : "sandbox");

/**
 * Redeems an access code that grants a plan (e.g. Premium Pro) to the signed-in
 * user. Codes can be locked to a specific email, limited by number of uses,
 * expiry date and access duration.
 */
export const redeemAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string; environment: Env }) => data)
  .handler(async ({ data, context }) => {
    const environment = envOf(data.environment);
    const code = (data.code ?? "").trim().toUpperCase();
    if (!code) throw new Error("Introduce un código");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("access_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (!row || !row.active) throw new Error("Código no válido");
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now())
      throw new Error("Este código ha caducado");
    if (row.used_count >= row.max_uses) throw new Error("Este código ya se ha utilizado");

    const email = (context.claims as { email?: string } | null)?.email?.toLowerCase() ?? null;
    if (row.allowed_email && row.allowed_email.toLowerCase() !== email)
      throw new Error("Este código está reservado para otra cuenta");

    const { data: already } = await supabaseAdmin
      .from("access_code_redemptions")
      .select("id")
      .eq("code_id", row.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!already) {
      const { error: redeemError } = await supabaseAdmin
        .from("access_code_redemptions")
        .insert({ code_id: row.id, user_id: context.userId, environment });
      if (redeemError) throw new Error("No se pudo canjear el código");
      await supabaseAdmin
        .from("access_codes")
        .update({ used_count: row.used_count + 1 })
        .eq("id", row.id);
    }

    const periodEnd = row.duration_days
      ? new Date(Date.now() + row.duration_days * 86_400_000).toISOString()
      : null;

    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: context.userId,
        environment,
        plan: row.plan,
        status: "active",
        price_id: null,
        product_id: null,
        provider_subscription_id: `code:${row.code}`,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.error("[redeemAccessCode] upsert failed", error);
      throw new Error(`No se pudo activar el plan: ${error.message}`);
    }

    return { ok: true as const, plan: row.plan as "free" | "premium" | "pro" };
  });
