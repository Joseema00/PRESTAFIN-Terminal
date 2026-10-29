insert into public.access_codes (code, plan, max_uses, note)
values ('PRESTAFIN-PRO-7Q4X', 'pro', 5, 'Código inicial de cortesía Premium Pro')
on conflict (code) do nothing;