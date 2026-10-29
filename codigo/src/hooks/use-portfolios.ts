import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Holding, Portfolio } from "@/lib/portfolio";
import { MODEL_PORTFOLIOS, modelToHoldings } from "@/lib/model-portfolios";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyPortfolio, loadMyWorkspace, saveMyWorkspace } from "@/lib/private-data.functions";

const KEY = "prestafin.guest.portfolios.v1";

export type WealthProfile = {
  cash: number;
  otherAssets: number;
  monthlyContribution: number;
};

export type WealthSettings = {
  contribGrowth: number;
  inflation: number;
  taxRate: number;
  expenses: number;
  share: number;
  realTerms: boolean;
};

export const DEFAULT_SETTINGS: WealthSettings = {
  contribGrowth: 2,
  inflation: 2.5,
  taxRate: 20,
  expenses: 1800,
  share: 0,
  realTerms: false,
};

const PROFILE_KEY = "prestafin.guest.wealth.v1";
const MORTGAGE_KEY = "prestafin.guest.mortgage.v1";
const SETTINGS_KEY = "prestafin.guest.settings.v1";

export const DEFAULT_PROFILE: WealthProfile = {
  cash: 15000,
  otherAssets: 0,
  monthlyContribution: 600,
};

export type MortgageProfile = {
  principal: number;
  rate: number;
  years: number;
  extraMonthly: number;
};

export const DEFAULT_MORTGAGE: MortgageProfile = {
  principal: 180000,
  rate: 3.1,
  years: 25,
  extraMonthly: 0,
};

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `p-${Math.random().toString(36).slice(2, 9)}`;
}

function seed(): Portfolio[] {
  const model = MODEL_PORTFOLIOS[0];
  if (!model) return [];
  return [
    {
      id: newId(),
      name: "Cartera principal",
      origin: model.name,
      createdAt: Date.now(),
      holdings: modelToHoldings(model, 40000),
    },
  ];
}

type Row = {
  id: string;
  name: string;
  origin: string | null;
  holdings: unknown;
  created_at: string;
};

function mapRow(r: Row): Portfolio {
  return {
    id: r.id,
    name: r.name,
    holdings: (Array.isArray(r.holdings) ? r.holdings : []) as Holding[],
    createdAt: new Date(r.created_at).getTime(),
    ...(r.origin ? { origin: r.origin } : {}),
  };
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// The server functions require a bearer token. During sign-out, token refresh
// or a stale tab the session can be gone while React state still holds a user,
// which would make the RPC throw "Unauthorized: No authorization header".
async function hasSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session?.access_token;
  } catch {
    return false;
  }
}

export function usePortfolios() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const loadWorkspace = useServerFn(loadMyWorkspace);
  const saveWorkspace = useServerFn(saveMyWorkspace);
  const deletePortfolio = useServerFn(deleteMyPortfolio);
  const [hydrated, setHydrated] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [portfolios, setPortfolios] = useState<Portfolio[]>(seed);
  const [activeId, setActiveId] = useState<string>("");
  const [profile, setProfile] = useState<WealthProfile>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<WealthSettings>(DEFAULT_SETTINGS);
  const [mortgage, setMortgage] = useState<MortgageProfile>(DEFAULT_MORTGAGE);
  const [mortgageId, setMortgageId] = useState<string | null>(null);
  const identityRef = useRef<string | null>(userId);

  // Guests may use local storage. Signed-in accounts are hydrated exclusively
  // from their own RLS-protected cloud rows, never from browser cache.
  useEffect(() => {
    if (authLoading) return;
    identityRef.current = userId;
    pendingRef.current = { portfolios: false, wealth: false, mortgage: false };
    setHydrated(false);
    setMortgageId(null);
    const stored = userId ? null : read<Portfolio[] | null>(KEY, null);
    if (stored && stored.length) {
      setPortfolios(stored);
      setActiveId(stored[0]?.id ?? "");
    } else {
      const fresh = seed();
      setPortfolios(fresh);
      setActiveId(fresh[0]?.id ?? "");
    }
    setProfile(userId ? DEFAULT_PROFILE : read<WealthProfile>(PROFILE_KEY, DEFAULT_PROFILE));
    setSettings({
      ...DEFAULT_SETTINGS,
      ...(userId ? {} : read<Partial<WealthSettings>>(SETTINGS_KEY, {})),
    });
    setMortgage(userId ? DEFAULT_MORTGAGE : read<MortgageProfile>(MORTGAGE_KEY, DEFAULT_MORTGAGE));
    setHydrated(true);
  }, [userId, authLoading]);

  // Cloud hydration per signed-in account
  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!userId) {
      setCloudReady(false);
      return;
    }
    setCloudReady(false);
    const ownerAtStart = userId;
    (async () => {
      if (!(await hasSession())) return;
      const workspace = await loadWorkspace();
      if (cancelled || identityRef.current !== ownerAtStart || workspace.ownerId !== ownerAtStart) return;
      let rows = workspace.portfolios;
      const wp = workspace.wealth;
      let mg = workspace.mortgage;

      if (!rows || rows.length === 0) {
        const initial = seed()[0];
        if (!initial) return;
        await saveWorkspace({
          data: {
            portfolios: [{
              id: initial.id,
              name: initial.name,
              origin: initial.origin ?? null,
              isActive: true,
              holdings: initial.holdings,
            }],
          },
        });
        rows = [{
          id: initial.id,
          name: initial.name,
          origin: initial.origin ?? null,
          holdings: initial.holdings,
          created_at: new Date(initial.createdAt).toISOString(),
          is_active: true,
        }];
      }
      const mapped = rows.map(mapRow);
      setPortfolios(mapped);
      const activeRow = rows.find((row) => row.is_active);
      setActiveId(activeRow ? activeRow.id : (mapped[0]?.id ?? ""));

      if (wp) {
        setProfile({
          cash: Number(wp.cash),
          otherAssets: Number(wp.other_assets),
          monthlyContribution: Number(wp.monthly_contribution),
        });
        const s = (wp.settings ?? {}) as Partial<WealthSettings>;
        setSettings({ ...DEFAULT_SETTINGS, ...s });
      }

      if (mg) {
        setMortgageId(mg.id);
        setMortgage({
          principal: Number(mg.principal),
          rate: Number(mg.annual_rate),
          years: Number(mg.term_years),
          extraMonthly: Number(mg.extra_monthly),
        });
      } else {
        const created = await saveWorkspace({ data: { mortgage: { id: null, ...DEFAULT_MORTGAGE } } });
        if (cancelled || identityRef.current !== ownerAtStart) return;
        if (created.mortgageId) setMortgageId(created.mortgageId);
        setMortgage(DEFAULT_MORTGAGE);
      }
      if (!cancelled) setCloudReady(true);
    })().catch(() => {
      if (!cancelled && identityRef.current === ownerAtStart) setCloudReady(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading, loadWorkspace, saveWorkspace]);

  // ---- Persistence -------------------------------------------------------
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const snapRef = useRef({ portfolios, activeId, profile, settings, mortgage, mortgageId, userId, cloudReady });
  snapRef.current = { portfolios, activeId, profile, settings, mortgage, mortgageId, userId, cloudReady };
  const pendingRef = useRef({ portfolios: false, wealth: false, mortgage: false });

  const saveNow = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const s = snapRef.current;
    if (!s.userId || !s.cloudReady) return { ok: false, error: "Sin sesión activa" };
    if (!(await hasSession())) {
      return { ok: false, error: "Sin sesión activa" };
    }
    const authenticatedUserId = s.userId;
    const pending = { ...pendingRef.current };
    if (!pending.portfolios && !pending.wealth && !pending.mortgage) return { ok: true };
    pendingRef.current = { portfolios: false, wealth: false, mortgage: false };
    setSaving(true);
    setSaveError(null);
    try {
      await saveWorkspace({
        data: {
          ...(pending.portfolios && {
            portfolios: s.portfolios.map((portfolio) => ({
              id: portfolio.id,
              name: portfolio.name,
              origin: portfolio.origin ?? null,
              isActive: portfolio.id === s.activeId,
              holdings: portfolio.holdings,
            })),
          }),
          ...(pending.wealth && {
            wealth: {
              cash: s.profile.cash,
              otherAssets: s.profile.otherAssets,
              monthlyContribution: s.profile.monthlyContribution,
              settings: s.settings,
            },
          }),
          ...(pending.mortgage && {
            mortgage: { id: s.mortgageId, ...s.mortgage },
          }),
        },
      });
      if (identityRef.current !== authenticatedUserId) return { ok: false, error: "La sesión ha cambiado" };
      setSavedAt(Date.now());
      setDirty(
        pendingRef.current.portfolios || pendingRef.current.wealth || pendingRef.current.mortgage,
      );
      return { ok: true };
    } catch (e) {
      pendingRef.current = { ...pendingRef.current, ...pending };
      const msg = e instanceof Error ? e.message : "Error al guardar";
      setSaveError(msg);
      return { ok: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, [saveWorkspace]);

  const queue = useCallback(
    (key: "portfolios" | "wealth" | "mortgage") => {
      pendingRef.current[key] = true;
      setDirty(true);
    },
    [],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      sessionStorage.setItem(KEY, JSON.stringify(portfolios));
      return;
    }
    if (!cloudReady) return;
    queue("portfolios");
    const t = setTimeout(() => void saveNow(), 700);
    return () => clearTimeout(t);
  }, [portfolios, hydrated, userId, cloudReady, activeId, queue, saveNow]);

  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return;
    }
    if (!cloudReady) return;
    queue("wealth");
    const t = setTimeout(() => void saveNow(), 700);
    return () => clearTimeout(t);
  }, [profile, settings, hydrated, userId, cloudReady, queue, saveNow]);

  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      sessionStorage.setItem(MORTGAGE_KEY, JSON.stringify(mortgage));
      return;
    }
    if (!cloudReady || !mortgageId) return;
    queue("mortgage");
    const t = setTimeout(() => void saveNow(), 700);
    return () => clearTimeout(t);
  }, [mortgage, hydrated, userId, cloudReady, mortgageId, queue, saveNow]);

  // Flush pending writes when leaving the page/route so nothing is lost.
  useEffect(() => {
    const flush = () => void saveNow();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, [saveNow]);

  const active = portfolios.find((p) => p.id === activeId) ?? portfolios[0];

  const create = useCallback((name: string, holdings: Holding[] = [], origin?: string) => {
    const p: Portfolio = {
      id: newId(),
      name,
      holdings,
      createdAt: Date.now(),
      ...(origin ? { origin } : {}),
    };
    setPortfolios((s) => [...s, p]);
    setActiveId(p.id);
    return p;
  }, []);

  const remove = useCallback((id: string) => {
    if (userId) {
      void (async () => {
        if (await hasSession()) await deletePortfolio({ data: { id } });
      })().catch(() => undefined);
    }
    setPortfolios((s) => {
      const next = s.filter((p) => p.id !== id);
      const safe = next.length ? next : seed();
      setActiveId(safe[0]?.id ?? "");
      return safe;
    });
  }, [deletePortfolio, userId]);

  const rename = useCallback((id: string, name: string) => {
    setPortfolios((s) => s.map((p) => (p.id === id ? { ...p, name } : p)));
  }, []);

  const setHoldings = useCallback((id: string, holdings: Holding[]) => {
    setPortfolios((s) => s.map((p) => (p.id === id ? { ...p, holdings } : p)));
  }, []);

  const addAsset = useCallback((id: string, assetId: string, amount: number, meta?: Holding["meta"]) => {
    setPortfolios((s) =>
      s.map((p) => {
        if (p.id !== id) return p;
        const exists = p.holdings.find((h) => h.assetId === assetId);
        return {
          ...p,
          holdings: exists
            ? p.holdings.map((h) => (h.assetId === assetId ? { ...h, amount: h.amount + amount } : h))
            : [...p.holdings, meta ? { assetId, amount, meta } : { assetId, amount }],
        };
      }),
    );
  }, []);

  return {
    hydrated,
    userId,
    cloudReady,
    syncing: !!userId && !cloudReady,
    saving,
    dirty,
    savedAt,
    saveError,
    saveNow,
    portfolios,
    active,
    activeId: active?.id ?? "",
    setActiveId,
    create,
    remove,
    rename,
    setHoldings,
    addAsset,
    profile,
    setProfile,
    settings,
    setSettings,
    mortgage,
    setMortgage,
  };
}