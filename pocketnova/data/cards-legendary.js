// ============================================================================
// cards-legendary.js — "전설카드" = Ark Nova's Conservation Project cards,
// transcribed from 전설카드.pdf. Two sub-types, matching the rulebook's
// "Conservation Projects Layout" (rules p.15):
//
//  - 'icon': needs a running COUNT of a specific icon across your Animal/
//    Sponsor cards + partner zoos/universities (e.g. "requires Water icons").
//  - 'release': needs you to DISCARD one animal card of a matching
//    type/region from your zoo whose standard-enclosure size is within the
//    shown tier (this is Ark Nova's "release into the wild" project type).
//
// ⚠ VERIFY — the three reward TIERS (icon-count-or-size → conservation
// points) were too small/dense to read with full confidence on every card,
// so all 32 cards currently share the same placeholder tier curve
// (`DEFAULT_TIERS`). The *requirement type* (which icon / which release
// condition) for each card was legible and should be correct. Please check
// the exact tier numbers against your physical cards and edit here — it's
// one array per card.
// ============================================================================

const DEFAULT_ICON_TIERS = { counts: [5, 4, 2], points: [4, 3, 2] };
const DEFAULT_RELEASE_TIERS = { sizes: ['4+', 3, '2-'], points: [5, 4, 3] };

function iconProject(name, iconLabel, tiers = DEFAULT_ICON_TIERS) {
  return { id: `leg_${name}`, kind: 'legendary', type: 'icon', name,
    requirement: `사파리존에 ${iconLabel} 필요`, iconLabel, tiers,
    verified: tiers !== DEFAULT_ICON_TIERS ? true : false };
}
function releaseProject(name, what, tiers = DEFAULT_RELEASE_TIERS) {
  return { id: `leg_${name}`, kind: 'legendary', type: 'release', name,
    requirement: `${what} 1마리를 야생에 돌려보냄`, what, tiers,
    verified: tiers !== DEFAULT_RELEASE_TIERS ? true : false };
}
function sisterZooProject(name, typeLabel) {
  return { id: `leg_${name}`, kind: 'legendary', type: 'sisterZoo', name,
    requirement: `${typeLabel} 포켓몬과 맞는 지방의 자매 사파리존 필요`,
    typeLabel, tiers: { counts: [2, 2, 2], points: [2, 2, 2] }, verified: false };
}

export const LEGENDARY_CARDS = [
  iconProject('가이오가', '물 타입 아이콘'),
  releaseProject('게노세크트', '풀 타입 포켓몬'),
  iconProject('그란돈', '바위 칸 아이콘'),
  iconProject('기라티나', '알 아이콘'),
  sisterZooProject('다크라이', '초 타입'),
  iconProject('디아루가', '큰 포켓몬(4+ 크기)'),
  iconProject('랜드로스', '격투 타입 아이콘'),
  iconProject('레시라무', '불 타입 아이콘'),
  releaseProject('레지아이스', '물 타입 포켓몬'),
  iconProject('레쿠자', '호연 지방 아이콘'),
  iconProject('루기아', '초 타입 아이콘'),
  releaseProject('마나피', '신오 지방 포켓몬'),
  sisterZooProject('메로엣타', '격투 타입'),
  releaseProject('뮤', '관동 지방 포켓몬'),
  iconProject('뮤츠', '관동 지방 아이콘'),
  iconProject('비리디온', '풀 타입 아이콘'),
  releaseProject('비크티니', '하나 지방 포켓몬'),
  releaseProject('세레비', '성도 지방 포켓몬'),
  sisterZooProject('쉐이미', '풀 타입'),
  iconProject('스이쿤', '물 칸 아이콘'),
  iconProject('아르세우스', '신오 지방 아이콘'),
  releaseProject('엔테이', '불 타입 포켓몬'),
  iconProject('제크로무', '하나 지방 아이콘'),
  releaseProject('지라치', '호연 지방 포켓몬'),
  iconProject('칠색조', '성도 지방 아이콘'),
  releaseProject('케르디오', '격투 타입 포켓몬'),
  iconProject('큐레무', '서로 다른 타입 아이콘'),
  releaseProject('크리세리아', '초 타입 포켓몬'),
  iconProject('테오키스', '서로 다른 지방 아이콘'),
  sisterZooProject('파이어', '불 타입'),
  iconProject('펄기아', '작은 포켓몬(2- 크기)'),
  sisterZooProject('프리져', '물 타입'),
];
