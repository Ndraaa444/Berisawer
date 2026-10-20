alter table public.creator_settings
  add column if not exists live_tools_config jsonb not null default '{
    "donation": {"enabled": true, "min_amount": 1000},
    "voice": {"enabled": false, "min_amount": 10000, "pricing_mode": "session", "price_per_minute": 5000, "max_minutes": 5},
    "media": {"enabled": false, "min_amount": 10000, "price_per_second": 1000, "max_duration_seconds": 120},
    "ticker": {"enabled": false, "min_amount": 5000, "display_seconds": 10, "max_chars": 120},
    "subathon": {"enabled": false, "min_amount": 10000, "minutes_per_1000": 1, "max_added_minutes": 120, "max_timer_minutes": 1440},
    "alerts": {"enabled": true, "min_amount": 1000},
    "goals": {"enabled": true},
    "polls": {"enabled": false},
    "requests": {"enabled": false, "min_amount": 5000}
  }'::jsonb;

alter table public.creator_settings
  add constraint creator_settings_live_tools_config_object
  check (jsonb_typeof(live_tools_config) = 'object');

comment on column public.creator_settings.live_tools_config is
  'Per-creator live tool switches and pricing rules. Payments remain disabled until merchant verification.';
