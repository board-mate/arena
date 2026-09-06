// v11.7 built-in mappings are intentionally conservative.
// Only source cards whose visible scoring condition AND thresholds match the
// current Pocket Nova v3 data are enabled by default. User mappings override
// these entries and can disable them locally.
window.PORKNOVA_BUILTIN_IMAGE_MAPPINGS = {
  schemaVersion: 1,
  mappings: {
    animals: {},
    sponsors: {},
    projects: {},
    finals: {
      '지도': {
        src: 'assets/finals/final_p06_02.webp',
        assetId: 'final_06_02',
        confidence: 'verified',
        basis: '빈 건설 칸 6/12/18/24 ↔ 1/2/3/4점 일치'
      },
      '다우징 머신': {
        src: 'assets/finals/final_p06_03.webp',
        assetId: 'final_06_03',
        requiresCoreFix: '11.7',
        confidence: 'verified-after-core-fix',
        basis: 'v11.7 core fix 적용 후 명성 트랙 6/9/12/15 ↔ 1/2/3/4점 일치'
      },
      '포케 도감': {
        src: 'assets/finals/final_p06_05.webp',
        assetId: 'final_06_05',
        confidence: 'verified',
        basis: '오른쪽 플레이어와 타입 다양성 비교, 최대 4점 일치'
      }
    }
  },
  aliases: {
    animals: {
      // Only aliases observed directly in the retained OCR text are listed.
      // The fuzzy matcher still requires a unique high-confidence winner.
      '찌리리공': ['피리리공'],
      '두트리오': ['두르리오'],
      '레어코일': ['겐어코일']
    }
  }
};
