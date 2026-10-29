import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, CreditCard, ShieldCheck, UserRound, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SiteHeader } from "@/components/app/site-header";
import { EmailPreferencesCard } from "@/components/app/email-preferences";
import { PaymentTestModeBanner } from "@/components/app/paywall";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { PLANS } from "@/lib/plans";
import {
  getBillingOverview,
  createPortalSession,
  cancelSubscription,
  resumeSubscription,
} from "@/lib/billing.functions";
import { deleteMyAccount } from "@/lib/account.functions";
import { getMyProfile, updateMyProfile } from "@/lib/private-data.functions";

export const Route = createFileRoute("/_authenticated/cuenta")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Mi cuenta | Prestafin" },
      {
        name: "description",
        content: "Gestiona tu perfil, tu seguridad, tu plan y tus facturas de Prestafin.",
      },
      { property: "og:title", content: "Mi cuenta | Prestafin" },
      { property: "og:description", content: "Perfil, seguridad, suscripción y facturación de tu cuenta Prestafin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

function AccountPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plan, status, subscription, isActive, isPastDue, environment, refresh } = useSubscription();

  const billingOverview = useServerFn(getBillingOverview);
  const portalFn = useServerFn(createPortalSession);
  const cancelFn = useServerFn(cancelSubscription);
  const resumeFn = useServerFn(resumeSubscription);
  const deleteFn = useServerFn(deleteMyAccount);
  const getProfileFn = useServerFn(getMyProfile);
  const updateProfileFn = useServerFn(updateMyProfile);

  const [fullName, setFullName] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [savingProfile, setSavingProfile] = useState(false);
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: getProfileFn,
  });

  const { data: billing } = useQuery({
    queryKey: ["billing", user?.id, environment],
    enabled: !!user,
    queryFn: () => billingOverview({ data: { environment } }),
  });

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setCurrency(profile?.currency ?? "EUR");
  }, [profile, user?.id]);

  async function saveProfile() {
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateProfileFn({
        data: {
          fullName: fullName.trim() || null,
          currency: currency as "EUR" | "USD" | "GBP" | "CHF",
        },
      });
    } catch (cause) {
      setSavingProfile(false);
      toast.error(cause instanceof Error ? cause.message : "No se pudo actualizar el perfil");
      return;
    }
    setSavingProfile(false);
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Perfil actualizado");
  }

  async function changePassword() {
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    toast.success("Contraseña actualizada");
  }

  async function run(key: string, fn: () => Promise<unknown>, okMessage: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(okMessage);
      setTimeout(refresh, 2500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Algo no ha salido bien");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    try {
      const { url } = await portalFn({ data: { environment } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo abrir el portal");
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    setBusy("delete");
    try {
      await deleteFn({});
      await supabase.auth.signOut();
      queryClient.clear();
      toast.success("Tu cuenta ha sido eliminada");
      void navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar la cuenta");
    } finally {
      setBusy(null);
    }
  }

  const payments = billing?.payments ?? [];

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Mi cuenta</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        </header>

        <section className="surface-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <UserRound className="size-4 text-brand" />
            <h2 className="font-medium">Perfil</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Nombre</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Moneda</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button className="mt-5" size="sm" onClick={() => void saveProfile()} disabled={savingProfile}>
            {savingProfile && <Loader2 className="mr-2 size-4 animate-spin" />}Guardar cambios
          </Button>
        </section>

        <EmailPreferencesCard />

        <section className="surface-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <CreditCard className="size-4 text-brand" />
            <h2 className="font-medium">Suscripción</h2>
            <Badge variant={isPastDue ? "destructive" : "secondary"} className="ml-auto">
              {PLANS[plan].name}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {isActive
              ? subscription?.current_period_end
                ? `${subscription.cancel_at_period_end ? "Tu plan finaliza el" : "Próxima renovación el"} ${new Date(
                    subscription.current_period_end,
                  ).toLocaleDateString("es-ES")} · estado: ${status}`
                : `Estado: ${status}`
              : "Estás en el plan Free. Mejora tu plan para desbloquear la optimización avanzada."}
          </p>
          {isPastDue && (
            <p className="mt-2 text-sm text-destructive">
              Hay un pago pendiente. Actualiza tu método de pago para no perder el acceso.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {isActive ? (
              <>
                <Button size="sm" variant="outline" onClick={() => void openPortal()} disabled={busy === "portal"}>
                  {busy === "portal" && <Loader2 className="mr-2 size-4 animate-spin" />}Facturación y método de pago
                </Button>
                {subscription?.cancel_at_period_end ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      void run("resume", () => resumeFn({ data: { environment } }), "Suscripción reactivada")
                    }
                    disabled={busy === "resume"}
                  >
                    {busy === "resume" && <Loader2 className="mr-2 size-4 animate-spin" />}Reactivar suscripción
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void run(
                        "cancel",
                        () => cancelFn({ data: { environment } }),
                        "Se cancelará al final del periodo",
                      )
                    }
                    disabled={busy === "cancel"}
                  >
                    {busy === "cancel" && <Loader2 className="mr-2 size-4 animate-spin" />}Cancelar suscripción
                  </Button>
                )}
              </>
            ) : null}
            <Button size="sm" variant={isActive ? "ghost" : "default"} asChild>
              <Link to="/suscripcion">{isActive ? "Cambiar de plan" : "Ver planes"}</Link>
            </Button>
          </div>
        </section>

        <section className="surface-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <Receipt className="size-4 text-brand" />
            <h2 className="font-medium">Facturación</h2>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay pagos registrados.</p>
          ) : (
            <div className="divide-y divide-border/60 text-sm">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <span className="text-muted-foreground">
                    {new Date(p.occurred_at).toLocaleDateString("es-ES")}
                  </span>
                  <span className="font-medium">
                    {Number(p.amount).toLocaleString("es-ES", { style: "currency", currency: p.currency ?? "EUR" })}
                  </span>
                  <Badge variant={p.status === "completed" ? "secondary" : "destructive"}>
                    {p.status === "completed" ? "Pagado" : "Fallido"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="surface-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand" />
            <h2 className="font-medium">Seguridad</h2>
          </div>
          <div className="grid gap-2 sm:max-w-sm">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <Button className="mt-4" size="sm" variant="outline" onClick={() => void changePassword()} disabled={savingPassword}>
            {savingPassword && <Loader2 className="mr-2 size-4 animate-spin" />}Actualizar contraseña
          </Button>

          <Separator className="my-6" />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={busy === "delete"}>
                <Trash2 className="mr-2 size-4" /> Eliminar mi cuenta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se borrarán de forma permanente tus carteras, prestamos, objetivos y datos patrimoniales. Cancela
                  antes tu suscripción si sigue activa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => void deleteAccount()}>Eliminar definitivamente</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </main>
    </div>
  );
}
