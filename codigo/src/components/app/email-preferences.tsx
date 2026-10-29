import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { getMyEmailPreferences, updateMyEmailPreferences } from "@/lib/private-data.functions";

const FREQUENCIES = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Cada dos semanas" },
  { value: "monthly", label: "Mensual" },
];

export function EmailPreferencesCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const getPreferencesFn = useServerFn(getMyEmailPreferences);
  const updatePreferencesFn = useServerFn(updateMyEmailPreferences);
  const [transactional, setTransactional] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  const [frequency, setFrequency] = useState("weekly");
  const [saving, setSaving] = useState(false);

  const { data: prefs } = useQuery({
    queryKey: ["email-preferences", user?.id],
    enabled: !!user,
    queryFn: getPreferencesFn,
  });

  useEffect(() => {
    setTransactional(prefs?.transactional ?? true);
    setNewsletter(prefs?.newsletter ?? false);
    setFrequency(prefs?.newsletter_frequency ?? "weekly");
  }, [prefs, user?.id]);

  async function save() {
    if (!user) return;
    setSaving(true);
    let error: Error | null = null;
    try {
      await updatePreferencesFn({
        data: {
          transactional,
          newsletter,
          newsletterFrequency: frequency as "weekly" | "biweekly" | "monthly",
        },
      });
    } catch (cause) {
      error = cause instanceof Error ? cause : new Error("No se pudieron guardar las preferencias");
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["email-preferences"] });
    toast.success("Preferencias de email guardadas");
  }

  return (
    <section className="surface-card p-6">
      <div className="mb-5 flex items-center gap-2">
        <Mail className="size-4 text-brand" />
        <h2 className="font-medium">Preferencias de email</h2>
      </div>

      <div className="space-y-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <Label htmlFor="pref-transactional">Avisos de tu cuenta</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Bienvenida, cambios de plan, recibos y avisos importantes de seguridad.
            </p>
          </div>
          <Switch id="pref-transactional" checked={transactional} onCheckedChange={setTransactional} />
        </div>

        <div className="flex items-start justify-between gap-6">
          <div>
            <Label htmlFor="pref-newsletter">Newsletter de Prestafin</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Ideas sobre amortizar vs invertir, mercados y gestión patrimonial. Puedes darte de baja cuando quieras.
            </p>
          </div>
          <Switch id="pref-newsletter" checked={newsletter} onCheckedChange={setNewsletter} />
        </div>

        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="pref-frequency">Frecuencia</Label>
          <select
            id="pref-frequency"
            value={frequency}
            disabled={!newsletter}
            onChange={(e) => setFrequency(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button className="mt-5" size="sm" onClick={() => void save()} disabled={saving}>
        {saving && <Loader2 className="mr-2 size-4 animate-spin" />}Guardar preferencias
      </Button>
    </section>
  );
}