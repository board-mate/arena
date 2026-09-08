# BoardMate Arena v11.4.29 GAME FIXES

기준: 사용자가 제공한 `arena-main (1).zip` (v11.4.27 merged lineage).

이번 수정:
1. 맨덤의 던전: 용사의 검이 골렘/고블린/스켈레톤/오크/뱀파이어처럼 번호가 붙은 동일 몬스터 가족 전체를 무력화. 게임 종료 시 `submit_boardmate_match`로 방 결과 반영.
2. 취소: social 3종 + Plakoro 및 현재 다인플 카탈로그 전반에서 만장일치 취소 RPC 지원.
3. 프라코로: `seat` ambiguous 수정, 에너지 선택 이모지 유지, 기술 카드 캐릭터코로 방향 칩 표시, 호스트 직접 롤 처리 + 비호스트 액션 재시도.
4. 캐시 버전 11.4.29.

Supabase: `SUPABASE_TARGETED_FIX_V29.sql` 1회 실행.
