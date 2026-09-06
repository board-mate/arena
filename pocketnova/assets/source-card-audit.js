// v11.7 source-card audit metadata.
// This is advisory metadata for the image workbench only; it never changes game state.
// "verified" means the visible source rule and current v3 rule are aligned.
// "verified-after-core-fix" means they align after applying tools/apply_v11_7_core_fixes.py.
// "mismatch" means the source image is intentionally NOT auto-mapped.
window.PORKNOVA_SOURCE_CARD_AUDIT = {
  version: '11.7',
  finals: {
    '지도': {
      status: 'verified', assetId: 'final_06_02', src: 'assets/finals/final_p06_02.webp',
      sourceName: '자연주의파 동물원', sourceThresholds: [6,12,18,24], v3Thresholds: [6,12,18,24],
      note: '빈 칸 수 6/12/18/24가 현재 v3 데이터와 일치'
    },
    '다우징 머신': {
      status: 'verified-after-core-fix', assetId: 'final_06_03', src: 'assets/finals/final_p06_03.webp',
      sourceName: '인기 있는 동물원', sourceThresholds: [6,9,12,15], v3Thresholds: [6,9,12,15],
      note: '원본은 명성 트랙. v11.7 core fix가 v3의 지식 트랙/0점 placeholder를 명성 트랙으로 수정'
    },
    '포케 도감': {
      status: 'verified', assetId: 'final_06_05', src: 'assets/finals/final_p06_05.webp',
      sourceName: '다양성 중시 동물원',
      note: '오른쪽 플레이어보다 많이 보유한 타입 수, 최대 4점 규칙 일치'
    },
    '낚싯대': {
      status: 'mismatch', assetId: 'final_06_07', src: 'assets/finals/final_p06_07.webp',
      sourceName: '호수 공원', sourceThresholds: [2,4,6,7], v3Thresholds: [2,4,6,8],
      note: 'threshold가 다르고 현재 엔진의 물 인접 건물 집계와 원본 카드의 물 아이콘 표현도 재검증 필요 — 자동 연결 보류'
    },
    '자전거': {
      status: 'mismatch', assetId: 'final_06_06', src: 'assets/finals/final_p06_06.webp',
      sourceName: '암벽 등반 공원', sourceThresholds: [1,3,5,6], v3Thresholds: [1,3,5,7],
      note: 'threshold가 다르고 현재 엔진의 바위 인접 건물 집계와 원본 카드의 바위 아이콘 표현도 재검증 필요 — 자동 연결 보류'
    },
    '연락처': {
      status: 'mismatch', assetId: 'final_06_04', src: 'assets/finals/final_p06_04.webp',
      sourceName: '후원 받는 동물원', sourceThresholds: [3,5,7,9], v3Thresholds: [3,6,8,10],
      note: '도움/@ 아이콘 계열로 보이지만 threshold가 달라 자동 연결 보류'
    }
  }
};
