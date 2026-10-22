-- Calls announced but not yet open ("Previsto" in the prototype).
alter type public.call_status add value if not exists 'upcoming' before 'open';
