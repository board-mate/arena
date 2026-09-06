# v11.4.8 → Power Grid Germany β v3 직접 적용 검증

검증 기준 파일:

`BoardMate_Arena_INTEGRATED_V11_4_8_CALICO_MOBILE_PORKNOVA_V11_7.zip`

위 v11.4.8 전체본을 새 폴더에 복원한 뒤 이 패키지의 `repo-overlay`만 직접 덮어써서 검증했습니다. **v11.4.9 파일은 중간에 적용하지 않았습니다.**

결과:

```text
PASS node tests/powergrid_germany_v3_test.cjs
PASS python tests/verify_integrated_release.py
PASS node --check app.js
PASS node --check powergrid/engine.js
PASS node --check powergrid/ui.js
PASS Power Grid app entry = 2~6 / online-powergrid.html
PASS solo menu has no Power Grid entry
PASS Germany cities = 42
PASS Germany edges = 83
PASS direct build cost smoke
PASS Realtime common room integration retained
PASS v11.4.8 config.js is not part of overlay and is preserved
```

Supabase는 정적 파일과 별도로 v11.4.8 DB에서 `SUPABASE_POWERGRID_UNIFIED.sql`을 1회 실행해야 합니다.

이 검증은 코드/데이터 통합 검증이며 실제 Supabase 2~6브라우저 완주 E2E를 대체하지 않습니다.
