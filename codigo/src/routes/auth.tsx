import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrandLockup } from "@/components/app/brand-mark";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { sendWelcomeEmail } from "@/lib/welcome-email.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceder a Prestafin | Tu patrimonio personalizado" },
      {
        name: "description",
        content:
          "Inicia sesión o crea tu cuenta en Prestafin para guardar tus carteras, tu perfil patrimonial y tus simulaciones de préstamo vs inversión.",
      },
      { property: "og:title", content: "Acceder a Prestafin" },
      {
        property: "og:description",
        content: "Guarda tus carteras y simulaciones en tu cuenta Prestafin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) navigate({ to: "/mi-patrimonio", replace: true });
  }, [isAuthenticated, loading, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sesión iniciada");
    navigate({ to: "/mi-patrimonio", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name, newsletter_opt_in: newsletterOptIn },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSent(true);
      void sendWelcomeEmail({ data: { email, nombre: name || undefined } }).catch(() => {});
      toast.success("Revisa tu correo para confirmar la cuenta");
      return;
    }
    void sendWelcomeEmail({ data: { email, nombre: name || undefined } }).catch(() => {});
    toast.success("Cuenta creada");
    navigate({ to: "/mi-patrimonio", replace: true });
  }

  async function google() {
    // Full-page redirect to Google, then back to /auth. On return, the
    // Supabase client (detectSessionInUrl: true by default) picks the
    // session up automatically and useAuth's onAuthStateChange listener
    // (above and in use-auth.ts) fires the welcome email + redirect to
    // /mi-patrimonio, exactly like the email/password flow.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center">
          <BrandLockup height={26} className="opacity-90 transition-opacity hover:opacity-100" />
        </Link>

        <Card className="border-border/60">
          <CardHeader className="text-center">
            <CardTitle className="text-xl tracking-tight">Tu patrimonio, guardado</CardTitle>
            <CardDescription>
              Accede para conservar tus carteras, tu perfil y tus simulaciones en cada dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Te hemos enviado un correo de confirmación a <strong>{email}</strong>. Confírmalo y
                vuelve para iniciar sesión.
              </p>
            ) : (
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                  <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={signIn} className="mt-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Contraseña</Label>
                      <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={signUp} className="mt-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Nombre</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email2">Email</Label>
                      <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password2">Contraseña</Label>
                      <Input id="password2" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : "Crear cuenta"}
                    </Button>
                    <div className="flex items-start gap-2 pt-1">
                      <Checkbox
                        id="newsletter"
                        checked={newsletterOptIn}
                        onCheckedChange={(v) => setNewsletterOptIn(v === true)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="newsletter" className="text-xs font-normal leading-relaxed text-muted-foreground">
                        Quiero recibir la newsletter semanal de Prestafin. Puedo cambiar mis preferencias o darme de
                        baja cuando quiera.
                      </Label>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            )}

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google}>
              Continuar con Google
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Prestafin ofrece simulaciones educativas, no asesoramiento financiero personalizado.
        </p>
      </div>
    </div>
  );
}
