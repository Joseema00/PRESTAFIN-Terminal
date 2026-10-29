import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redeemAccessCode } from "@/lib/access-codes.functions";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { PLANS } from "@/lib/plans";

export function RedeemCodeCard() {
  const { isAuthenticated } = useAuth();
  const { environment, refresh } = useSubscription();
  const redeem = useServerFn(redeemAccessCode);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) return null;

  const submit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await redeem({ data: { code: code.trim(), environment } });
      toast.success(`Plan ${PLANS[res.plan].name} activado`);
      setCode("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo canjear el código");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-card mt-6 flex flex-wrap items-end justify-between gap-4 p-5">
      <div className="min-w-[220px] flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="size-4 text-brand" /> ¿Tienes un código de acceso?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Canjéalo para activar tu plan sin pasar por el pago.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder="PRESTAFIN-PRO"
          className="w-52 font-mono uppercase tracking-wide"
          aria-label="Código de acceso"
        />
        <Button onClick={() => void submit()} disabled={loading || !code.trim()}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Canjear
        </Button>
      </div>
    </div>
  );
}
