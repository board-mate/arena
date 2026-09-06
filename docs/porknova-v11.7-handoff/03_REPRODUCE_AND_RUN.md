# 03. v11.7 재현 / 실행 / 개발 시작

## 권장: 깨끗한 새 작업 폴더

필수:

- Git
- Python 3
- Node.js (matcher test용)
- 최신 Chromium/Chrome/Edge/Firefox 중 하나

### 자동 bootstrap

이 인수인계 bundle의 루트에서:

```bash
python scripts/bootstrap_v11_7.py ./arena-v11_7
```

스크립트는 다음을 수행한다.

1. `https://github.com/board-mate/arena` clone
2. `73b0537eed516dc845e781cac7f41715dae2fb09` checkout
3. v11.7 overlay unzip
4. core patch `--check`
5. core patch 적용
6. v11.7 정적 검증

### 수동 재현

```bash
git clone https://github.com/board-mate/arena.git arena-v11_7
cd arena-v11_7
git checkout 73b0537eed516dc845e781cac7f41715dae2fb09
unzip -o ../porknova_v11_7_source_audit_corefix_patch.zip -d .
python pocketnova/tools/apply_v11_7_core_fixes.py . --check
python pocketnova/tools/apply_v11_7_core_fixes.py .
node pocketnova/tools/test_asset_matcher.mjs
python pocketnova/tools/test_v11_7_core_patch.py
python pocketnova/tools/validate_image_assets.py
```

## 로컬 실행

저장소 루트에서:

```bash
python3 -m http.server 8000
```

브라우저:

- Pocket Nova 직접: `http://localhost:8000/pocketnova/`
- 이미지 smoke: `http://localhost:8000/pocketnova/tools/image_layer_smoke.html`
- BoardMate 홈: `http://localhost:8000/`

`file://`로 직접 열지 말고 HTTP server를 사용한다. ES module/import 및 iframe 동작이 브라우저 보안 정책에 영향을 받을 수 있다.

## 온라인 개발

`online-pocketnova.html`은 root의 `config.js` 및 Supabase 설정에 의존한다.

- 개인 key/secret을 인수인계 ZIP에 추가하지 않는다.
- 기존 운영 `config.js`를 v11.x patch로 덮어쓰지 않는다.
- 온라인 테스트용 방은 가능하면 새 방으로 만든다.
- v3 전환 이전 상태 kind를 가진 기존 방을 억지 migration하지 않는다.

## 기존 repo에 적용할 때

**base commit이 다르면 바로 덮어쓰지 않는다.**

먼저:

```bash
git rev-parse HEAD
```

기준 SHA와 다르면 `git diff`, 이후 public commit의 pocketnova 관련 변경을 확인한 다음 수동 merge한다. 특히 `state.js`, `engine.js`, `cards-finalscoring.js`는 v11.7 patcher가 exact snippet을 요구하므로 upstream drift가 있으면 fail되는 것이 정상이다.
