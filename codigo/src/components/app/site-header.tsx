import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, User2, CreditCard, Settings } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BrandLockup } from "@/components/app/brand-mark";
import { useAuth } from "@/hooks/use-auth";
import { PlanBadge } from "@/components/app/paywall";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/mi-patrimonio", label: "Motor Patrimonial" },
  { to: "/portfolio-lab", label: "Portfolio Lab" },
  { to: "/informes", label: "Informes" },
] as const;

export function SiteHeader() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-[84rem] items-center justify-between gap-6 px-6 lg:px-10">
        <Link to="/" className="flex items-center">
          <BrandLockup height={18} className="opacity-90 transition-opacity hover:opacity-100" />
        </Link>
        <nav className="hidden items-center gap-9 text-[0.9rem] text-muted-foreground md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{ className: "text-foreground" }}
              className="relative py-1 transition-colors hover:text-foreground after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-gold after:transition-all hover:after:w-full"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          {isAuthenticated && <PlanBadge className="hidden sm:inline-flex" />}
          <ThemeToggle />
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2 rounded-full">
                  <User2 className="size-4" />
                  <span className="hidden max-w-[10rem] truncate sm:inline">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/mi-patrimonio">Motor Patrimonial</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/portfolio-lab">Portfolio Lab</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/informes">Informes</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/cuenta">
                    <Settings className="mr-2 size-4" /> Mi cuenta
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/suscripcion">
                    <CreditCard className="mr-2 size-4" /> Plan y facturación
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut className="mr-2 size-4" /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" asChild className="rounded-full px-5">
              <Link to="/auth">Comenzar</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
