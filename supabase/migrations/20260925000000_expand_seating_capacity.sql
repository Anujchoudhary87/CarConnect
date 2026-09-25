begin;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.vehicles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%seating_capacity%'
  loop
    execute format('alter table public.vehicles drop constraint %I', constraint_record.conname);
  end loop;

  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.customer_demands'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%seating_capacity%'
  loop
    execute format('alter table public.customer_demands drop constraint %I', constraint_record.conname);
  end loop;
end
$$;

alter table public.vehicles
  add constraint vehicles_seating_capacity_positive_integer
  check (seating_capacity is null or seating_capacity > 0);

alter table public.customer_demands
  add constraint customer_demands_seating_capacity_positive_integer
  check (seating_capacity is null or seating_capacity > 0);

commit;
