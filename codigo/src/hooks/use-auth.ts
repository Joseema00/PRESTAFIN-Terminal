import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { sendWelcomeEmail } from "@/lib/welcome-email.functions";
import { trackAdsEventOnce } from "@/lib/analytics/gtag";

/** Google Ads sign_up conversion, once per brand-new account. No PII is sent. */
function maybeTrackSignUp(user: User | null) {
  if (!user) return;
  const createdAt = new Date(user.created_at).getTime();
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > 10 * 60 * 1000) return;
  trackAdsEventOnce(`signup.${user.id}`, "sign_up", { method: user.app_metadata?.provider ?? "email" });
}

/**
 * Fallback: makes sure every brand-new account receives the welcome email even
 * if the signup page navigated away before its own call completed.
 * Server-side it is idempotent (only fires for accounts < 10 min old).
 */
function maybeSendWelcome(user: User | null) {
  if (!user?.email) return;
  const createdAt = new Date(user.created_at).getTime();
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > 10 * 60 * 1000) return;
  const key = `prestafin.welcome.${user.id}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    /* storage unavailable — still try once */
  }
  const nombre =
    (user.user_metadata?.["full_name"] as string | undefined) ||
    (user.user_metadata?.["name"] as string | undefined);
  void sendWelcomeEmail({ data: { email: user.email, nombre: nombre || undefined } }).catch(
    () => {}
  );
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      maybeSendWelcome(s?.user ?? null);
      maybeTrackSignUp(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      maybeSendWelcome(data.session?.user ?? null);
      maybeTrackSignUp(data.session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading, isAuthenticated: !!user };
}
