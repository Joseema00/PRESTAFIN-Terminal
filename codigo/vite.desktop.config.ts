import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const adapters = {
  '@/hooks/use-portfolios':'use-portfolios.ts',
  '@/hooks/use-auth':'use-auth.ts',
  '@/hooks/use-subscription':'use-subscription.ts',
  '@/hooks/use-market-data':'use-market-data.ts',
  '@/components/app/paywall':'paywall.tsx',
  '@/lib/analytics/gtag':'analytics.ts',
};
export default defineConfig({
  root:path.join(root,'desktop-ui'),base:'/',publicDir:path.join(root,'public'),envDir:path.join(root,'desktop-ui'),
  resolve:{alias:[...Object.entries(adapters).map(([find,file]) => ({find,replacement:path.join(root,'desktop-ui',file)})),{find:'@',replacement:path.join(root,'src')}],dedupe:['react','react-dom']},
  plugins:[{
    name:'desktop-client-boundary',enforce:'pre',
    resolveId(source) {
      if (/\.server(?:\.|$)|\.functions(?:\.|$)|integrations\/supabase|@tanstack\/react-start|@stripe|^stripe$|^resend$/.test(source)) {
        this.error('El escritorio no debe importar servicios del servidor web: ' + source);
      }
      return null;
    },
  },tailwindcss(),react()],
  build:{outDir:path.join(root,'dist-desktop'),emptyOutDir:true,target:'chrome140',sourcemap:false},
});
