# Prestafin

Simulador avanzado de patrimonio: compara amortizar préstamo frente a
invertir y calcula el día en que tu patrimonio superará tu deuda. Incluye
Portfolio Lab (optimización de carteras), Wealth Score, Monte Carlo y
suscripciones de pago.

## Stack

- [TanStack Start](https://tanstack.com/start) + React 19 + TypeScript
- Tailwind CSS 4
- [Supabase](https://supabase.com) — autenticación, base de datos Postgres y RLS
- [Stripe](https://stripe.com) — pagos y suscripciones
- [Resend](https://resend.com) — email transaccional
- Despliegue en [Vercel](https://vercel.com)

## Desarrollo local

Requiere Node.js 20+.

```sh
git clone <url-de-este-repositorio>
cd prestafin
npm install
cp .env.example .env   # rellena las variables (ver más abajo)
npm run dev
```

## Variables de entorno

Copia `.env.example` a `.env` y rellena los valores. El archivo documenta
qué variables son públicas (`VITE_*`, seguras para el navegador) y cuáles son
secretos exclusivos de servidor. Nunca subas un `.env` real a git.

## Scripts

```sh
npm run dev        # servidor de desarrollo
npm run build      # build de producción (Nitro, preset "vercel")
npm run preview    # sirve el build de producción localmente
npm run lint        # ESLint
npm run format      # Prettier
```

## Estructura

```
src/
  routes/            rutas de TanStack Router (file-based)
  components/         componentes de UI (shadcn/ui en components/ui)
  hooks/               hooks de React (auth, portfolios, checkout, ...)
  lib/                  lógica de dominio y server functions (*.functions.ts)
  integrations/supabase/ cliente y middleware de Supabase Auth
supabase/migrations/   migraciones SQL (esquema + RLS)
services/py-finance/    microservicio Python opcional (yfinance), se despliega aparte
```

## Base de datos y seguridad

Toda la persistencia va a Supabase Postgres con Row Level Security activada:
cada usuario solo puede leer y escribir sus propias filas (`auth.uid() =
user_id`). Las funciones de servidor (`*.functions.ts`) además filtran
explícitamente por el `userId` verificado en el JWT, como segunda capa de
defensa. Ver `supabase/migrations/`.

## Despliegue

El proyecto se despliega en Vercel a partir de este repositorio en GitHub.
Configura las variables de entorno del `.env.example` en el dashboard de
Vercel (Project Settings → Environment Variables) antes del primer deploy.
