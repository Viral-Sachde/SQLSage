-- Sample SaaS schema with a few deliberate gaps for the advisor to find.
create table accounts (id uuid primary key default gen_random_uuid(), name text not null, plan text, created_at timestamptz default now());
create table customers (id uuid primary key default gen_random_uuid(), account_id uuid references accounts(id), email text, name text);
create index on customers (account_id);
create table subscriptions (id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id), status text, trial_started_at timestamptz);
create table invoices (id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id), amount_cents integer, paid_at timestamptz);
create table payments (id uuid primary key default gen_random_uuid(), invoice_id uuid references invoices(id), status text, provider text);
create table events (id bigserial primary key, account_id uuid, type text, created_at timestamptz default now());
create table audit_log (actor text, action text, "createdAt" timestamptz default now());

insert into accounts (name, plan) select 'Account ' || g, (array['free','pro','team'])[1 + g % 3] from generate_series(1, 50) g;
insert into customers (account_id, email, name) select id, 'c' || row_number() over () || '@example.com', 'Customer ' || row_number() over () from accounts, generate_series(1, 4);
insert into invoices (customer_id, amount_cents, paid_at) select id, (random() * 50000)::int, now() - (random() * interval '180 days') from customers, generate_series(1, 6);
insert into subscriptions (customer_id, status, trial_started_at) select id, (array['trialing','active','canceled'])[1 + (random() * 2)::int], now() - (random() * interval '60 days') from customers;

-- Read-only role SQLsage connects as
create role sqlsage_readonly login password 'readonly';
grant connect on database app to sqlsage_readonly;
grant usage on schema public to sqlsage_readonly;
grant select on all tables in schema public to sqlsage_readonly;
alter role sqlsage_readonly set default_transaction_read_only = on;
