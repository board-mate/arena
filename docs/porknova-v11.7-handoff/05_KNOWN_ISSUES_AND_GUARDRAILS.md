# 05. 알려진 이슈와 개발 금지선

## P0 / 게임 정확성 blocker

### A. 전설/보존 프로젝트 32장 tier placeholder

현재 공개 v3 데이터는 카드별 정확 tier가 아니라 공통 placeholder를 사용한다.

**금지:** 이름/테마가 비슷하다는 이유로 수치를 추측해서 채우기.

**해결:** 원본 프로젝트 이미지의 조건/단계/점수를 카드별로 읽고 `source → v3 id` 대응표를 만든 뒤, 검증된 카드만 하나씩 교체한다.

### B. 온라인 2브라우저 E2E 미완료

코드상 bridge가 존재하는 것과 실전 동기화가 정상이라는 것은 다르다.

**금지:** 단일 브라우저 smoke만으로 online complete 처리.

### C. 도움 카드 manual 처리

일부 카드는 자동화되어 있지만 많은 카드가 여전히 `manual`이다.

**금지:** 자동화되지 않은 효과를 UI에 “자동 처리됨”처럼 표시.

## P1 / 최종점수

### 원본과 v3 mismatch가 확인된 카드

- 낚싯대: 원본 threshold `2/4/6/7`, v3 `2/4/6/8`
- 자전거: 원본 `1/3/5/6`, v3 `1/3/5/7`
- 연락처: 원본 `3/5/7/9`, v3 `3/6/8/10`

**금지:** 이미지와 맞추기 위해 어느 쪽이 정답인지 확인하지 않고 숫자만 수정.

### 아직 1:1 대응 미확정

- 마스터볼
- 몬스터볼
- 이상한 알
- 포켓머신
- 학습 장치

## 이미지 관련 금지선

- 이미지 파일명 페이지/슬롯 위치를 실제 카드 ID로 단정하지 않는다.
- OCR fuzzy match가 애매하면 자동 연결하지 않는다.
- 사용자 mapping을 Supabase game payload에 넣지 않는다.
- 외부 URL을 mapping으로 허용하지 않는다.
- core fix 의존 카드 이미지를 `core-fix-status.applied !== true`에서 자동 노출하지 않는다.

## 상태/네트워크 관련 금지선

- `pocketnova-v3-boardmate`를 이유 없이 변경하지 않는다.
- game payload 내부에 UI-only 데이터를 추가하지 않는다.
- polling/realtime 변경 시 revision conflict 동작을 반드시 재테스트한다.
- `postMessage` 구조를 바꿀 때 iframe source 검증 및 양방향 ready/state 흐름을 함께 본다.

## 원본 자료

규칙/이미지 판정에 필요한 원본 PDF/스캔은 별도 대형 체크포인트에 있다.

- `porknova_checkpoint_full_2026-09-04(1).zip`
- 주요 원본: `Pokemon_kor_A4.pdf`, `Sponsors_kor_A4.pdf`, `scoring_kor_A4.pdf`, `지도8a_rockwall-병합됨.pdf`, Ark Nova rules/FAQ

이 lightweight 인수인계 ZIP에는 대형 PDF를 중복 포함하지 않았다. 이미지 webp 자산은 v11.7 patch 안에 포함되어 있다.
