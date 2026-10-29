# v11.4.90 에친스톤 역할 버튼

운영 브라우저 검증 중 주문/원소/증폭 버튼에서 `TypeError: role is not a function`을 발견했다. HTML 인라인 핸들러의 요소 스코프에 있는 `HTMLElement.role` 속성이 전역 `role()` 함수를 가렸다. 함수와 호출을 `assignMageRole()`로 변경했다.

버튼의 role 속성이 존재하는 스코프에서 실제 생성된 onclick 코드를 실행하는 회귀 테스트를 추가했다. v89 규칙 수정은 유지한다. 기본판 전체 카드 구성 교체는 아직 미완료이며, 상세 제한은 README_V11_4_89_SOLO_RULES.md에 기록했다.
