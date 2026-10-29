import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Load all env vars (including non-VITE_ server secrets) into process.env for
// server routes / server functions. Vite only auto-injects VITE_-prefixed
// vars into import.meta.env; server code needs the rest via process.env.
const serverEnv = loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

export default defineConfig({
  resolve: {
    alias: {
      "entities/lib/decode.js": path.resolve(process.cwd(), "node_modules/entities/lib/decode.js"),
      "entities/lib/encode.js": path.resolve(process.cwd(), "node_modules/entities/lib/encode.js"),
      entities: path.resolve(process.cwd(), "node_modules/entities"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      // Works around a known Rolldown bug (rolldown/rolldown#8184, #8809):
      // when chunk optimization is on, its facade-elimination pass can put
      // the shared runtime helper (__exportAll) in a chunk that ends up
      // circularly importing the chunk that needs it, so the helper is
      // still `undefined` when it's called ("__exportAll is not a
      // function"). TanStack Start's server entry does a `export * from`
      // re-export that triggers this. Disabling it is the workaround
      // recommended upstream until Rolldown fixes the edge case.
      experimental: {
        chunkOptimization: false,
      },
    },
  },
  plugins: [
    // Resolves the "@/*" -> "./src/*" alias declared in tsconfig.json.
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts
      // (our SSR error wrapper).
      server: { entry: "server" },
    }),
    viteReact(),
    // Builds the SSR server output for Vercel's Node runtime. Change the
    // preset (e.g. "node-server", "cloudflare-module", "netlify") to target
    // a different host — see https://nitro.build/deploy for the full list.
    nitro({ preset: "vercel" }),
  ],
});
