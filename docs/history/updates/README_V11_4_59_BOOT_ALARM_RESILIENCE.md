# v11.4.59 — Boot & Alarm Resilience

- app boot no longer has a static dependency on alarm.js.
- index retries app.js module loading up to three times.
- service worker cache matching preserves version query strings.
- my-turn browser indicator adds title, top banner, and favicon alert.
- my-turn notifications are marked seen only after successful delivery.
- No Supabase SQL/RPC change.
