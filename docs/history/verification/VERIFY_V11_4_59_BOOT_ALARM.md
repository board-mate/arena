# VERIFY v11.4.59

- PASS: app.js parses as ES module (Node module parser).
- PASS: alarm.js syntax.
- PASS: sw.js syntax.
- PASS: app boot has no static dependency on alarm.js.
- PASS: index retries app.js module up to 3 times.
- PASS: service worker cache version v11.4.59 and query-aware matching.
- PASS: my-turn tab/banner/favicon indicator present.
- PASS: turn is marked seen only after successful notification delivery.
- PASS: no online-*.html or solo-*.html gameplay page changed from v11.4.58.
- DB/RPC change: none.
