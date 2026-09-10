# BoardMate Arena v11.4.48

최신 통합 릴리스는 **v11.4.48**입니다.

이번 버전은 진행 중인 Calico 방을 초기화하지 않고 복구할 수 있도록 우측 상단 타일/루미 판정과 토큰 재검색을 보강하고, Calico 상단에 게임 취소 버튼을 추가했습니다. 또한 1인플 목록에 **에친스톤의 용들**을 복구했으며, **포켓몬 미니마**는 Arena UI/배포 런타임에서 제거된 상태를 유지합니다. `프라코로 포켓몬`은 별도 게임으로 유지됩니다.

주요 내용은 `README_V11_4_48_CALICO_ETCH_E2E.md`를 참고하세요.

## 배포

현재 배포본 위에 `index.html`, `app.js`, `styles.css`, `online-calico.html`, `multi-common.js`, `sw.js`, `HANDOFF_VERSION.txt`를 덮어쓰면 됩니다. `solo-etchinstone.html`은 패치 ZIP에도 포함되어 있습니다.

**추가 Supabase SQL은 없습니다.** Calico 공유 상태 버전은 12를 유지하므로 현재 진행 중인 방을 그대로 이어갈 수 있습니다.

## 검증

```bash
python tests/v48_calico_etch_e2e.py
python tests/v48_release_static_test.py
```

Headless Chromium에서 데스크톱/모바일 Calico 우측 상단 루미 배치, 현재 게임 재검색, 구버전 방 상태 무초기화, 에친스톤 자동 저장/이어하기, 게임 취소 패널까지 통과했습니다.
