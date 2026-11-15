import {createHandler} from './handler.mjs';
const names=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_PRICE_MONTH','STRIPE_PRICE_YEAR','STRIPE_PORTAL_CONFIGURATION'];
const env=Object.fromEntries(names.map(k=>[k,Deno.env.get(k)]));
env.STRIPE_PRICE_MONTH??='price_1UWI1UA8vZ76Jnv6SBla8q9E';env.STRIPE_PRICE_YEAR??='price_1UWI1zA8vZ76Jnv6Dc4P6zJt';env.STRIPE_PORTAL_CONFIGURATION??='bpc_1UWI2yA8vZ76Jnv6IV6vjCZn';
Deno.serve(createHandler({env}));
