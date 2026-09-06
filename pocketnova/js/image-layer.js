// ============================================================================
// image-layer.js — BoardMate Forknova v11.7 visual asset / mapping layer
//
// Visual-only integration for the public Pocket Nova v3 UI. It does not mutate
// game state, rules, networking or serialization. Imported art is kept local
// to the browser and manual card↔asset mappings are stored in localStorage.
// ============================================================================

import { normalizeName, findBestOcrMatch } from './asset-matcher.js';

const IMAGE_LAYER_VERSION = '11.7';
const ZOOM_OVERLAY_ID = 'porknova-image-zoom-overlay';
const LIBRARY_OVERLAY_ID = 'porknova-asset-library-overlay';
const TOGGLE_KEY = 'boardmate:pocketnova:image-layer:enabled';
const USER_MAPPING_KEY = 'boardmate:pocketnova:image-mapping:v2';
const LEGACY_USER_MAPPING_KEY = 'boardmate:pocketnova:image-mapping:v1';
const MAPPING_CHANNEL_NAME = 'boardmate:pocketnova:image-mapping';
const INSTANCE_ID = `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

let observer = null;
let scheduled = false;
let enabled = readEnabled();
let userMappings = readUserMappings();
let mappingChannel = null;
let syncListenersReady = false;

function readEnabled() {
  try { return localStorage.getItem(TOGGLE_KEY) !== '0'; }
  catch { return true; }
}

function writeEnabled(value) {
  enabled = !!value;
  try { localStorage.setItem(TOGGLE_KEY, enabled ? '1' : '0'); } catch {}
  document.documentElement.classList.toggle('porknova-images-off', !enabled);
  syncToolbar();
  if (enabled) scheduleDecorate();
}

function emptyMappings() {
  return {
    version: 2,
    mappings: { animals:{}, sponsors:{}, projects:{}, finals:{} },
    disabled: { animals:{}, sponsors:{}, projects:{}, finals:{} },
  };
}

function normalizeMappingPayload(parsed) {
  const next = emptyMappings();
  if (!parsed || typeof parsed !== 'object') return next;
  const source = parsed?.mappings ? parsed : { mappings: parsed };
  for (const kind of ['animals','sponsors','projects','finals']) {
    if (source.mappings?.[kind] && typeof source.mappings[kind] === 'object') {
      next.mappings[kind] = source.mappings[kind];
    }
    if (source.disabled?.[kind] && typeof source.disabled[kind] === 'object') {
      next.disabled[kind] = source.disabled[kind];
    }
  }
  return next;
}

function readUserMappings() {
  try {
    const current = JSON.parse(localStorage.getItem(USER_MAPPING_KEY) || 'null');
    if (current) return normalizeMappingPayload(current);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_USER_MAPPING_KEY) || 'null');
    return normalizeMappingPayload(legacy);
  } catch {
    return emptyMappings();
  }
}

function writeMappingsToStorage() {
  try {
    localStorage.setItem(USER_MAPPING_KEY, JSON.stringify(userMappings));
    localStorage.removeItem(LEGACY_USER_MAPPING_KEY);
  } catch {}
}

function saveUserMappings({ broadcast=true } = {}) {
  writeMappingsToStorage();
  if (broadcast && mappingChannel) {
    try { mappingChannel.postMessage({ type:'mapping-updated', sender:INSTANCE_ID }); } catch {}
  }
  syncToolbar();
}

function mappingCount() {
  return ['animals','sponsors','projects','finals']
    .reduce((n, kind) => n + Object.keys(userMappings.mappings?.[kind] || {}).length, 0);
}

function disabledCount() {
  return ['animals','sponsors','projects','finals']
    .reduce((n, kind) => n + Object.keys(userMappings.disabled?.[kind] || {}).filter(key => userMappings.disabled[kind][key]).length, 0);
}

function buildCatalog() {
  const data = window.PORKNOVA_DATA || {};
  const builtin = window.PORKNOVA_BUILTIN_IMAGE_MAPPINGS || { mappings:{}, aliases:{} };
  const byKind = new Map();
  const assetPaths = new Set();
  for (const kind of ['animals', 'sponsors', 'projects', 'finals']) {
    const exact = new Map();
    const normalized = new Map();
    for (const item of data[kind] || []) {
      if (!item?.name || !item?.img) continue;
      exact.set(String(item.name), item.img);
      assetPaths.add(item.img);
      const key = normalizeName(item.name);
      if (key && !normalized.has(key)) normalized.set(key, item.img);
    }
    byKind.set(kind, { exact, normalized, items: data[kind] || [] });
  }
  for (const sides of Object.values(data.actionImages || {})) {
    for (const src of Object.values(sides || {})) if (src) assetPaths.add(src);
  }
  for (const item of data.maps || []) if (item?.img) assetPaths.add(item.img);
  for (const kind of ['animals','sponsors','projects','finals']) {
    for (const entry of Object.values(builtin.mappings?.[kind] || {})) {
      if (entry?.src) assetPaths.add(entry.src);
    }
  }
  return {
    byKind,
    actionImages: data.actionImages || {},
    maps: data.maps || [],
    animalOcr: buildAnimalOcrIndex(data.animals || []),
    v3Names: window.PORKNOVA_V3_CARD_NAMES || {},
    builtin,
    aliases: builtin.aliases || {},
    sourceAudit: window.PORKNOVA_SOURCE_CARD_AUDIT || { finals:{} },
    coreFixStatus: window.PORKNOVA_CORE_FIX_STATUS || { version:null, applied:false },
    assetPaths,
  };
}

let catalog = buildCatalog();

function buildAnimalOcrIndex(animalItems) {
  const byId = new Map(animalItems.map(item => [item.id, item]));
  const rows = [];
  for (const [id, text] of Object.entries(window.PORKNOVA_ANIMAL_OCR || {})) {
    const item = byId.get(id);
    if (!item?.img || !text) continue;
    rows.push({ id, img:item.img, text:normalizeName(text) });
  }
  return rows;
}

function ocrMatchForAnimal(name) {
  const aliases = catalog.aliases?.animals || {};
  return findBestOcrMatch(name, catalog.animalOcr || [], aliases);
}

function catalogPathFor(kind, name) {
  const bucket = catalog.byKind.get(kind);
  if (!bucket) return null;
  return bucket.exact.get(name) || bucket.normalized.get(normalizeName(name)) || null;
}

function userMappingFor(kind, name) {
  return userMappings.mappings?.[kind]?.[normalizeName(name)] || null;
}

function autoMappingDisabled(kind, name) {
  return !!userMappings.disabled?.[kind]?.[normalizeName(name)];
}

function builtinMappingFor(kind, name) {
  const bucket = catalog.builtin?.mappings?.[kind] || {};
  return bucket[name] || bucket[normalizeName(name)] || null;
}

function resolvePathFor(kind, name) {
  const manual = userMappingFor(kind, name);
  if (manual?.src) return { ...manual, src:manual.src, source:'user', confidence:'user' };
  if (autoMappingDisabled(kind, name)) return null;

  const builtin = builtinMappingFor(kind, name);
  if (builtin?.src) {
    if (builtin.requiresCoreFix && !(catalog.coreFixStatus?.applied === true && catalog.coreFixStatus?.version === builtin.requiresCoreFix)) return null;
    return { ...builtin, source:'builtin', confidence:builtin.confidence || 'verified' };
  }

  // v10 animal metadata contains a small exact-name transcription set.
  const exact = catalogPathFor(kind, name);
  if (exact) return { src:exact, source:'catalog', confidence:'exact-name' };

  if (kind === 'animals') {
    const hit = ocrMatchForAnimal(name);
    if (hit?.img) return {
      src: hit.img,
      assetId: hit.id,
      source: 'ocr',
      confidence: hit.exact ? 'ocr-exact' : `ocr-${hit.score}`,
      score: hit.score,
      margin: hit.margin,
    };
  }
  return null;
}

function pathFor(kind, name) {
  return resolvePathFor(kind, name)?.src || null;
}

function resolutionLabel(resolution) {
  if (!resolution) return '미연결';
  if (resolution.source === 'user') return '사용자 연결';
  if (resolution.source === 'builtin') return resolution.confidence === 'verified-after-core-fix' ? 'v11.7 core fix 후 검증 기본 연결' : '검증된 기본 연결';
  if (resolution.source === 'catalog') return '이름 정확 일치';
  if (resolution.source === 'ocr') return resolution.score === 1 ? 'OCR 정확 일치' : `OCR 고신뢰 ${Math.round((resolution.score || 0) * 100)}%`;
  return resolution.source || '연결';
}

function kindForCard(card) {
  if (card.classList.contains('kind-animal')) return 'animals';
  if (card.classList.contains('kind-sponsor')) return 'sponsors';
  if (card.classList.contains('kind-legendary') || card.classList.contains('kind-conservation')) return 'projects';
  if (card.classList.contains('kind-finalscoring')) return 'finals';
  return null;
}

function makeImage(src, alt, className) {
  const img = document.createElement('img');
  img.className = className;
  img.src = src;
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  img.addEventListener('error', () => {
    const host = img.closest('.has-porknova-art, .has-porknova-action-art');
    host?.querySelector('.porknova-image-zoom')?.remove();
    host?.classList.remove('has-porknova-art', 'has-porknova-action-art');
    host?.classList.add('porknova-art-missing');
    img.remove();
  }, { once:true });
  return img;
}

function clearCardDecoration(card) {
  card.querySelectorAll(':scope > .porknova-card-art, :scope > .porknova-image-zoom, :scope > .porknova-image-link')
    .forEach(node => node.remove());
  card.classList.remove('has-porknova-art', 'porknova-art-missing');
  delete card.dataset.porknovaImageSrc;
  delete card.dataset.porknovaImageChecked;
  delete card.dataset.porknovaImageSource;
}

function refreshAllCards() {
  document.querySelectorAll('.zoo-card').forEach(clearCardDecoration);
  document.querySelectorAll('.action-card').forEach(card => {
    card.querySelectorAll(':scope > .porknova-action-art, :scope > .porknova-image-zoom').forEach(node => node.remove());
    card.classList.remove('has-porknova-action-art', 'porknova-art-missing');
    delete card.dataset.porknovaImageSrc;
    delete card.dataset.porknovaImageChecked;
  });
  document.querySelectorAll('.map-wrap').forEach(wrap => {
    wrap.querySelector(':scope > .porknova-map-reference')?.remove();
    delete wrap.dataset.porknovaMapImageChecked;
  });
  document.querySelectorAll('.porknova-project-row').forEach(row => {
    row.querySelectorAll(':scope > .porknova-project-row-art, :scope > .porknova-project-zoom, :scope > .porknova-project-map').forEach(node => node.remove());
    row.classList.remove('porknova-project-row', 'has-porknova-project-art');
    delete row.dataset.porknovaProjectChecked;
    delete row.dataset.porknovaCardName;
  });
  document.querySelectorAll('.score-row').forEach(row => {
    row.querySelectorAll('.porknova-final-links').forEach(node => node.remove());
    delete row.dataset.porknovaFinalChecked;
  });
  scheduleDecorate();
}

function addZoomButton(host, src, name) {
  const zoom = document.createElement('button');
  zoom.type = 'button';
  zoom.className = 'porknova-image-zoom';
  zoom.textContent = '🔍';
  zoom.title = `${name} 크게 보기`;
  zoom.setAttribute('aria-label', `${name} 이미지 크게 보기`);
  zoom.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openZoom(src, name);
  });
  host.appendChild(zoom);
}

function addMappingButton(card, kind, name, resolution) {
  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'porknova-image-link';
  link.textContent = resolution ? '🔁' : '🔗';
  link.title = resolution
    ? `${name} 이미지 다시 연결 · ${resolutionLabel(resolution)}`
    : `${name} 이미지 연결`;
  link.setAttribute('aria-label', link.title);
  link.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openAssetLibrary({ mappingTarget:{ kind, name } });
  });
  card.appendChild(link);
}

function decorateZooCard(card) {
  if (!enabled || card.dataset.porknovaImageChecked === '1') return;
  card.dataset.porknovaImageChecked = '1';

  const name = card.querySelector('.card-name')?.textContent?.trim();
  const kind = kindForCard(card);
  if (!name || !kind) return;

  card.dataset.porknovaKind = kind;
  card.dataset.porknovaCardName = name;

  const resolution = resolvePathFor(kind, name);
  const src = resolution?.src;
  if (src) {
    const img = makeImage(src, `${name} 카드 이미지`, 'porknova-card-art');
    card.prepend(img);
    card.classList.add('has-porknova-art');
    card.dataset.porknovaImageSrc = src;
    card.dataset.porknovaImageSource = resolution.source || '';
    addZoomButton(card, src, name);
  }
  // The mapping button is deliberately available even for exact matches so a
  // user can correct an OCR/name mismatch without touching game code.
  addMappingButton(card, kind, name, resolution);
}

const ACTION_KEY_BY_LABEL = new Map([
  ['건설', 'Build'],
  ['포획', 'Animals'],
  ['도움', 'Sponsors'],
  ['모험', 'Cards'],
  ['협회', 'Association'],
]);

function decorateActionCard(card) {
  if (!enabled || card.dataset.porknovaImageChecked === '1') return;
  card.dataset.porknovaImageChecked = '1';

  const label = card.querySelector('.action-name')?.textContent?.trim();
  const side = card.querySelector('.action-side')?.textContent?.trim();
  const key = ACTION_KEY_BY_LABEL.get(label);
  const src = key && (side === 'II' ? catalog.actionImages?.[key]?.II : catalog.actionImages?.[key]?.I);
  if (!src) return;

  const img = makeImage(src, `${label} 행동 카드 ${side || 'I'}면`, 'porknova-action-art');
  card.prepend(img);
  card.classList.add('has-porknova-action-art');
  card.dataset.porknovaImageSrc = src;
  addZoomButton(card, src, `${label} 행동 카드 ${side || 'I'}면`);
}

function mapSourceFor(wrap) {
  const title = wrap.querySelector('h3')?.textContent || '';
  const svg = wrap.querySelector('.hex-grid');
  if (/F13|바위\s*(암벽|압벽)/i.test(title) || svg?.classList.contains('map-theme-ice')) {
    return { id:'F13', name:'바위 암벽', src:'assets/maps/map_01.webp' };
  }
  if (/F15|테라포밍\s*구역/i.test(title) || svg?.classList.contains('map-theme-cherry')) {
    return { id:'F15', name:'테라포밍 구역', src:'assets/maps/map_02.webp' };
  }
  return null;
}

function addInlineMappingButton(host, kind, name, className = 'porknova-inline-map') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = resolvePathFor(kind, name) ? '🔁' : '🔗';
  button.title = `${name} 이미지 연결`;
  button.setAttribute('aria-label', `${name} 이미지 연결`);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openAssetLibrary({ mappingTarget:{ kind, name } });
  });
  host.appendChild(button);
  return button;
}

function decorateConservationPanels(root = document) {
  const panels = [];
  if (root.nodeType === Node.ELEMENT_NODE && root.matches?.('.panel')) panels.push(root);
  root.querySelectorAll?.('.panel').forEach(panel => panels.push(panel));
  for (const panel of panels) {
    const heading = panel.querySelector(':scope > h3')?.textContent || '';
    if (!heading.includes('보존 프로젝트')) continue;
    for (const row of [...panel.children]) {
      if (row.tagName === 'H3' || row.dataset?.porknovaProjectChecked === '1') continue;
      const first = row.firstElementChild;
      const name = first?.textContent?.trim();
      if (!name || name === '없음') continue;
      row.dataset.porknovaProjectChecked = '1';
      row.dataset.porknovaCardName = name;
      row.classList.add('porknova-project-row');
      const src = pathFor('projects', name);
      if (src) {
        const img = makeImage(src, `${name} 프로젝트 이미지`, 'porknova-project-row-art');
        img.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          openZoom(src, name);
        });
        row.prepend(img);
        row.classList.add('has-porknova-project-art');
        const zoom = document.createElement('button');
        zoom.type = 'button';
        zoom.className = 'porknova-project-zoom';
        zoom.textContent = '🔍';
        zoom.title = `${name} 크게 보기`;
        zoom.addEventListener('click', (event) => {
          event.preventDefault(); event.stopPropagation(); openZoom(src, name);
        });
        row.appendChild(zoom);
      }
      addInlineMappingButton(row, 'projects', name, 'porknova-project-map');
    }
  }
}

function decorateScoreRows(root = document) {
  const rows = [];
  if (root.nodeType === Node.ELEMENT_NODE && root.matches?.('.score-row')) rows.push(root);
  root.querySelectorAll?.('.score-row').forEach(row => rows.push(row));
  for (const row of rows) {
    if (row.dataset.porknovaFinalChecked === '1') continue;
    const detail = [...row.querySelectorAll('div')].find(el => el.textContent?.trim().startsWith('최종점수 카드:'));
    if (!detail) continue;
    row.dataset.porknovaFinalChecked = '1';
    const raw = detail.textContent.trim().replace(/^최종점수 카드:\s*/, '');
    if (!raw || raw === '없음') continue;
    const names = raw.split(',').map(v => v.trim()).filter(Boolean);
    const links = document.createElement('div');
    links.className = 'porknova-final-links';
    for (const name of names) {
      const src = pathFor('finals', name);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `porknova-final-chip${src ? ' mapped' : ''}`;
      chip.title = src ? `${name} 이미지 크게 보기 / 다시 연결은 카드의 🔁 사용` : `${name} 이미지 연결`;
      if (src) {
        const img = document.createElement('img');
        img.src = src; img.alt = ''; img.loading = 'lazy';
        chip.append(img, document.createTextNode(name));
        chip.addEventListener('click', (event) => {
          event.preventDefault(); event.stopPropagation(); openZoom(src, name);
        });
      } else {
        chip.textContent = `🔗 ${name}`;
        chip.addEventListener('click', (event) => {
          event.preventDefault(); event.stopPropagation(); openAssetLibrary({ mappingTarget:{ kind:'finals', name } });
        });
      }
      links.appendChild(chip);
    }
    detail.parentElement?.appendChild(links);
  }
}

function decorateMapPanel(wrap) {
  if (!enabled || wrap.dataset.porknovaMapImageChecked === '1') return;
  wrap.dataset.porknovaMapImageChecked = '1';
  const map = mapSourceFor(wrap);
  const svg = wrap.querySelector(':scope > .hex-grid');
  if (!map || !svg) return;

  const details = document.createElement('details');
  details.className = 'porknova-map-reference';
  details.open = true;
  const summary = document.createElement('summary');
  summary.textContent = `🖼️ 원본 지도 ${map.id} · ${map.name}`;
  const img = document.createElement('img');
  img.src = map.src;
  img.alt = `${map.id} ${map.name} 원본 지도`;
  img.loading = 'eager';
  img.decoding = 'async';
  img.draggable = false;
  img.className = 'porknova-map-reference-image';
  img.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openZoom(map.src, `${map.id} ${map.name}`);
  });
  details.append(summary, img);
  wrap.insertBefore(details, svg);
}

function decorateNode(root = document) {
  ensureToolbar();
  if (!enabled) return;
  if (root.nodeType === Node.ELEMENT_NODE && root.matches?.('.zoo-card')) decorateZooCard(root);
  if (root.nodeType === Node.ELEMENT_NODE && root.matches?.('.action-card')) decorateActionCard(root);
  if (root.nodeType === Node.ELEMENT_NODE && root.matches?.('.map-wrap')) decorateMapPanel(root);
  root.querySelectorAll?.('.zoo-card').forEach(decorateZooCard);
  root.querySelectorAll?.('.action-card').forEach(decorateActionCard);
  root.querySelectorAll?.('.map-wrap').forEach(decorateMapPanel);
  decorateConservationPanels(root);
  decorateScoreRows(root);
}

function scheduleDecorate() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    decorateNode(document);
  });
}

function ensureToolbar() {
  let toolbar = document.getElementById('porknova-image-toolbar');
  if (toolbar) { syncToolbar(); return toolbar; }
  toolbar = document.createElement('div');
  toolbar.id = 'porknova-image-toolbar';

  const library = document.createElement('button');
  library.id = 'porknova-asset-library-button';
  library.type = 'button';
  library.addEventListener('click', () => openAssetLibrary());

  const toggle = document.createElement('button');
  toggle.id = 'porknova-image-toggle';
  toggle.type = 'button';
  toggle.addEventListener('click', () => writeEnabled(!enabled));

  toolbar.append(library, toggle);
  document.body.appendChild(toolbar);
  syncToolbar();
  return toolbar;
}

function syncToolbar() {
  const toggle = document.getElementById('porknova-image-toggle');
  if (toggle) {
    toggle.textContent = enabled ? '🖼️ 이미지 ON' : '🖼️ 이미지 OFF';
    toggle.title = enabled ? '카드/지도 이미지를 숨깁니다' : '카드/지도 이미지를 표시합니다';
    toggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  }
  const library = document.getElementById('porknova-asset-library-button');
  if (library) {
    const count = mappingCount();
    library.textContent = `🗂️ 이미지 자료${count ? ` · ${count}` : ''}`;
    library.title = `원본 이미지 자료실 / 카드 연결 (${count}개 사용자 매핑)`;
  }
}

function openZoom(src, name) {
  document.getElementById(ZOOM_OVERLAY_ID)?.remove();
  const overlay = document.createElement('div');
  overlay.id = ZOOM_OVERLAY_ID;
  overlay.className = 'porknova-image-overlay';
  overlay.tabIndex = -1;

  const panel = document.createElement('div');
  panel.className = 'porknova-image-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', `${name} 이미지`);

  const title = document.createElement('div');
  title.className = 'porknova-image-title';
  title.textContent = name;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'porknova-image-close';
  close.textContent = '✕';
  close.setAttribute('aria-label', '닫기');

  const img = document.createElement('img');
  img.src = src;
  img.alt = `${name} 이미지`;
  img.className = 'porknova-image-full';
  img.draggable = false;

  const dismiss = () => overlay.remove();
  close.addEventListener('click', dismiss);
  overlay.addEventListener('click', event => { if (event.target === overlay) dismiss(); });
  overlay.addEventListener('keydown', event => { if (event.key === 'Escape') dismiss(); });

  panel.append(title, close, img);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  overlay.focus();
}

const KIND_LABELS = {
  animals:'포켓몬', sponsors:'도움', projects:'전설/프로젝트', finals:'최종점수', maps:'지도',
};

function assetItems(kind) {
  if (kind === 'maps') return catalog.maps || [];
  return catalog.byKind.get(kind)?.items || [];
}

function assetHumanLabel(item) {
  if (!item) return '';
  const label = item.sourceName || item.name || item.id || item.img;
  if (item.page && item.pos) return `${label} · p${item.page}-${item.pos}`;
  return label;
}

function sourceAuditFor(kind, name) {
  if (kind !== 'finals') return null;
  return catalog.sourceAudit?.finals?.[name] || null;
}

function sourceAuditLabel(audit) {
  if (!audit) return '';
  if (audit.status === 'verified') return '원본 규칙 일치';
  if (audit.status === 'verified-after-core-fix') return 'v11.7 core fix 적용 후 원본 규칙 일치';
  if (audit.status === 'mismatch') return '원본↔v3 불일치 · 자동 연결 보류';
  return audit.status || '감사 정보 있음';
}

function sourceAuditDetail(audit) {
  if (!audit) return '';
  const thresholds = audit.sourceThresholds && audit.v3Thresholds
    ? ` · 원본 ${audit.sourceThresholds.join('/')} / v3 ${audit.v3Thresholds.join('/')}`
    : '';
  return `${sourceAuditLabel(audit)}${thresholds}${audit.note ? ` · ${audit.note}` : ''}`;
}

function setUserMapping(kind, cardName, item) {
  const key = normalizeName(cardName);
  if (!key || !item?.img || !catalog.assetPaths.has(item.img)) return;
  userMappings.disabled[kind][key] = false;
  delete userMappings.disabled[kind][key];
  userMappings.mappings[kind][key] = {
    cardName,
    assetId: item.id || null,
    assetLabel: assetHumanLabel(item),
    src: item.img,
    updatedAt: new Date().toISOString(),
  };
  saveUserMappings();
  refreshAllCards();
}

function clearUserMapping(kind, cardName) {
  delete userMappings.mappings?.[kind]?.[normalizeName(cardName)];
  saveUserMappings();
  refreshAllCards();
}

function disableAutoMapping(kind, cardName) {
  const key = normalizeName(cardName);
  if (!key) return;
  delete userMappings.mappings?.[kind]?.[key];
  userMappings.disabled[kind][key] = true;
  saveUserMappings();
  refreshAllCards();
}

function enableAutoMapping(kind, cardName) {
  const key = normalizeName(cardName);
  if (!key) return;
  delete userMappings.disabled?.[kind]?.[key];
  saveUserMappings();
  refreshAllCards();
}

function isKnownAssetSrc(src) {
  return typeof src === 'string' && src.startsWith('assets/') && catalog.assetPaths.has(src);
}

function downloadMappings() {
  const payload = {
    format: 'boardmate-porknova-image-mapping',
    imageLayerVersion: IMAGE_LAYER_VERSION,
    exportedAt: new Date().toISOString(),
    ...userMappings,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'porknova-image-mapping.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importMappingsFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const source = parsed?.mappings ? parsed : { mappings: parsed };
      if (!source?.mappings || typeof source.mappings !== 'object') throw new Error('mappings 객체가 없습니다.');
      const next = emptyMappings();
      let rejected = 0;
      for (const kind of ['animals','sponsors','projects','finals']) {
        for (const [key, entry] of Object.entries(source.mappings?.[kind] || {})) {
          if (entry?.src && isKnownAssetSrc(entry.src)) next.mappings[kind][key] = entry;
          else rejected++;
        }
        for (const [key, value] of Object.entries(source.disabled?.[kind] || {})) {
          if (value === true) next.disabled[kind][key] = true;
        }
      }
      userMappings = next;
      saveUserMappings();
      refreshAllCards();
      document.getElementById(LIBRARY_OVERLAY_ID)?.remove();
      openAssetLibrary();
      if (rejected) alert(`알 수 없는/외부 이미지 경로 ${rejected}개는 가져오지 않았습니다.`);
    } catch (err) {
      alert(`이미지 매핑 가져오기 실패: ${err.message}`);
    }
  });
  input.click();
}

function openAssetLibrary({ mappingTarget=null, initialKind=null } = {}) {
  document.getElementById(LIBRARY_OVERLAY_ID)?.remove();
  const overlay = document.createElement('div');
  overlay.id = LIBRARY_OVERLAY_ID;
  overlay.className = 'porknova-library-overlay';
  overlay.tabIndex = -1;

  const panel = document.createElement('div');
  panel.className = 'porknova-library-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', mappingTarget ? `${mappingTarget.name} 이미지 연결` : '포크노바 이미지 자료실');

  const header = document.createElement('div');
  header.className = 'porknova-library-header';
  const heading = document.createElement('div');
  heading.className = 'porknova-library-heading';
  heading.textContent = mappingTarget
    ? `🔗 ${mappingTarget.name} → 이미지 선택`
    : '🗂️ 포크노바 이미지 자료실';

  const headerActions = document.createElement('div');
  headerActions.className = 'porknova-library-actions';
  if (!mappingTarget) {
    const exp = document.createElement('button');
    exp.type = 'button'; exp.textContent = '매핑 내보내기'; exp.addEventListener('click', downloadMappings);
    const imp = document.createElement('button');
    imp.type = 'button'; imp.textContent = '매핑 가져오기'; imp.addEventListener('click', importMappingsFile);
    const reset = document.createElement('button');
    reset.type = 'button'; reset.textContent = '매핑 초기화';
    reset.addEventListener('click', () => {
      if (!confirm('브라우저에 저장된 카드↔이미지 연결을 모두 삭제할까요?')) return;
      userMappings = emptyMappings(); saveUserMappings(); refreshAllCards();
      overlay.remove(); openAssetLibrary();
    });
    headerActions.append(exp, imp, reset);
  } else {
    const manual = userMappingFor(mappingTarget.kind, mappingTarget.name);
    const autoDisabled = autoMappingDisabled(mappingTarget.kind, mappingTarget.name);
    const automatic = !manual && resolvePathFor(mappingTarget.kind, mappingTarget.name);
    if (manual) {
      const unlink = document.createElement('button');
      unlink.type = 'button'; unlink.textContent = '사용자 연결 해제';
      unlink.addEventListener('click', () => {
        clearUserMapping(mappingTarget.kind, mappingTarget.name);
        overlay.remove();
        if (mappingTarget.returnToKind) openAssetLibrary({ initialKind:mappingTarget.returnToKind });
      });
      headerActions.appendChild(unlink);
    } else if (automatic) {
      const disable = document.createElement('button');
      disable.type = 'button'; disable.textContent = '자동 연결 숨기기';
      disable.addEventListener('click', () => {
        disableAutoMapping(mappingTarget.kind, mappingTarget.name);
        overlay.remove();
        if (mappingTarget.returnToKind) openAssetLibrary({ initialKind:mappingTarget.returnToKind });
      });
      headerActions.appendChild(disable);
    } else if (autoDisabled) {
      const enable = document.createElement('button');
      enable.type = 'button'; enable.textContent = '자동 연결 다시 사용';
      enable.addEventListener('click', () => {
        enableAutoMapping(mappingTarget.kind, mappingTarget.name);
        overlay.remove();
        if (mappingTarget.returnToKind) openAssetLibrary({ initialKind:mappingTarget.returnToKind });
      });
      headerActions.appendChild(enable);
    }
  }
  const close = document.createElement('button');
  close.type = 'button'; close.textContent = '✕'; close.className = 'porknova-library-close';
  close.setAttribute('aria-label', '닫기'); close.addEventListener('click', () => overlay.remove());
  headerActions.appendChild(close);
  header.append(heading, headerActions);

  const controls = document.createElement('div');
  controls.className = 'porknova-library-controls';
  const tabs = document.createElement('div');
  tabs.className = 'porknova-library-tabs';
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = '이름 / 파일 ID 검색';
  search.className = 'porknova-library-search';

  const kinds = mappingTarget ? [mappingTarget.kind] : ['animals','sponsors','projects','finals','maps'];
  let activeKind = initialKind && kinds.includes(initialKind) ? initialKind : kinds[0];
  let query = '';

  for (const kind of kinds) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.dataset.kind = kind;
    tab.textContent = `${KIND_LABELS[kind]} ${assetItems(kind).length}`;
    tab.addEventListener('click', () => {
      activeKind = kind;
      tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.kind === activeKind));
      renderWorkbench();
      renderGrid();
    });
    tabs.appendChild(tab);
  }
  controls.append(tabs, search);

  const note = document.createElement('div');
  note.className = 'porknova-library-note';
  const targetAudit = mappingTarget ? sourceAuditFor(mappingTarget.kind, mappingTarget.name) : null;
  note.textContent = mappingTarget
    ? `선택한 연결은 브라우저 로컬 설정이며 온라인 게임 상태/Supabase payload에는 포함되지 않습니다. 같은 브라우저 탭끼리는 즉시 동기화됩니다.${targetAudit ? ` · 감사: ${sourceAuditDetail(targetAudit)}` : ''}`
    : 'v11.7은 검증된 기본 연결 + 정확 이름 + 고신뢰 OCR만 자동 사용합니다. 최종점수의 원본↔v3 규칙 불일치는 작업대 툴팁/감사 데이터에 표시하며, 불일치 카드는 자동 연결하지 않습니다.';

  const workbench = document.createElement('div');
  workbench.className = 'porknova-mapping-workbench';

  const grid = document.createElement('div');
  grid.className = 'porknova-library-grid';

  function renderWorkbench() {
    workbench.innerHTML = '';
    if (mappingTarget) {
      workbench.hidden = true;
      return;
    }
    const names = catalog.v3Names?.[activeKind] || [];
    if (!names.length) {
      workbench.hidden = true;
      return;
    }
    workbench.hidden = false;
    const resolutions = names.map(name => [name, resolvePathFor(activeKind, name)]);
    const mapped = resolutions.filter(([, result]) => !!result).length;
    const manualCount = resolutions.filter(([, result]) => result?.source === 'user').length;
    const autoCount = mapped - manualCount;
    const title = document.createElement('div');
    title.className = 'porknova-workbench-title';
    title.textContent = `매핑 작업대 · ${KIND_LABELS[activeKind]} ${mapped}/${names.length} · 자동 ${autoCount} / 사용자 ${manualCount}`;
    const list = document.createElement('div');
    list.className = 'porknova-workbench-list';
    for (const name of names) {
      const entry = userMappingFor(activeKind, name);
      const resolution = resolvePathFor(activeKind, name);
      const disabled = autoMappingDisabled(activeKind, name);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `porknova-workbench-card${resolution ? ' mapped' : ''}${resolution && !entry ? ' auto' : ''}${disabled ? ' disabled-auto' : ''}`;
      button.textContent = `${resolution ? '✓' : disabled ? '×' : '＋'} ${name}`;
      const audit = sourceAuditFor(activeKind, name);
      const baseTitle = resolution
        ? `${name} · ${resolutionLabel(resolution)} · ${resolution.assetLabel || resolution.assetId || resolution.src}`
        : disabled ? `${name} · 자동 연결 숨김` : `${name} 이미지 연결`;
      button.title = `${baseTitle}${audit ? ` · 감사: ${sourceAuditDetail(audit)}` : ''}`;
      if (audit?.status === 'mismatch') button.classList.add('audit-mismatch');
      else if (audit?.status === 'verified' || audit?.status === 'verified-after-core-fix') button.classList.add('audit-verified');
      button.addEventListener('click', () => {
        openAssetLibrary({ mappingTarget:{ kind:activeKind, name, returnToKind:activeKind } });
      });
      list.appendChild(button);
    }
    workbench.append(title, list);
  }

  function renderGrid() {
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.kind === activeKind));
    grid.innerHTML = '';
    const nq = normalizeName(query);
    const items = assetItems(activeKind).filter(item => {
      if (!nq) return true;
      return normalizeName(`${item.sourceName || ''} ${item.name || ''} ${item.id || ''} ${item.img || ''} ${item.page || ''} ${item.pos || ''}`).includes(nq);
    });
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'porknova-library-item';
      const img = document.createElement('img');
      img.src = item.img;
      img.alt = assetHumanLabel(item);
      img.loading = 'lazy';
      img.decoding = 'async';
      const label = document.createElement('span');
      label.textContent = assetHumanLabel(item);
      button.append(img, label);
      button.addEventListener('click', (event) => {
        event.preventDefault();
        if (mappingTarget) {
          setUserMapping(mappingTarget.kind, mappingTarget.name, item);
          overlay.remove();
          if (mappingTarget.returnToKind) openAssetLibrary({ initialKind:mappingTarget.returnToKind });
        } else {
          openZoom(item.img, assetHumanLabel(item));
        }
      });
      grid.appendChild(button);
    }
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'porknova-library-empty';
      empty.textContent = '검색 결과가 없습니다.';
      grid.appendChild(empty);
    }
  }

  search.addEventListener('input', () => { query = search.value; renderGrid(); });
  overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
  overlay.addEventListener('keydown', event => { if (event.key === 'Escape') overlay.remove(); });

  panel.append(header, controls, note, workbench, grid);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  renderWorkbench();
  renderGrid();
  overlay.focus();
}

function syncMappingsFromStorage() {
  const next = readUserMappings();
  const before = JSON.stringify(userMappings);
  const after = JSON.stringify(next);
  if (before === after) return;
  userMappings = next;
  refreshAllCards();
  syncToolbar();
}

function setupMappingSync() {
  if (syncListenersReady) return;
  syncListenersReady = true;
  window.addEventListener('storage', event => {
    if (event.key === USER_MAPPING_KEY || event.key === LEGACY_USER_MAPPING_KEY) syncMappingsFromStorage();
  });
  if ('BroadcastChannel' in window) {
    try {
      mappingChannel = new BroadcastChannel(MAPPING_CHANNEL_NAME);
      mappingChannel.addEventListener('message', event => {
        if (event.data?.type === 'mapping-updated' && event.data?.sender !== INSTANCE_ID) syncMappingsFromStorage();
      });
    } catch { mappingChannel = null; }
  }
}

function diagnostics() {
  const builtinByKind = {};
  for (const kind of ['animals','sponsors','projects','finals']) {
    builtinByKind[kind] = Object.keys(catalog.builtin?.mappings?.[kind] || {}).length;
  }
  const finalAudit = Object.values(catalog.sourceAudit?.finals || {}).reduce((acc, item) => {
    const key = item?.status || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return {
    version: IMAGE_LAYER_VERSION,
    enabled,
    userMappings: mappingCount(),
    disabledAutomaticMappings: disabledCount(),
    builtinMappings: builtinByKind,
    catalogAssets: catalog.assetPaths.size,
    animalOcrRows: catalog.animalOcr.length,
    sourceAuditFinals: finalAudit,
    coreFixStatus: { ...(catalog.coreFixStatus || {}) },
    decoratedCards: document.querySelectorAll('.zoo-card.has-porknova-art').length,
    decoratedActions: document.querySelectorAll('.action-card.has-porknova-action-art').length,
    mapReferences: document.querySelectorAll('.porknova-map-reference').length,
  };
}

function selfTest() {
  const errors = [];
  for (const kind of ['animals','sponsors','projects','finals']) {
    for (const [name, entry] of Object.entries(catalog.builtin?.mappings?.[kind] || {})) {
      if (!entry?.src) errors.push(`${kind}:${name}: src 없음`);
      else if (!isKnownAssetSrc(entry.src)) errors.push(`${kind}:${name}: 알 수 없는 asset ${entry.src}`);
    }
    for (const [name, entry] of Object.entries(userMappings.mappings?.[kind] || {})) {
      if (!entry?.src || !isKnownAssetSrc(entry.src)) errors.push(`user ${kind}:${name}: 알 수 없는 asset`);
    }
  }
  for (const [name, audit] of Object.entries(catalog.sourceAudit?.finals || {})) {
    if (audit?.src && !isKnownAssetSrc(audit.src)) errors.push(`audit finals:${name}: 알 수 없는 asset ${audit.src}`);
  }
  return { ok: errors.length === 0, errors, diagnostics: diagnostics() };
}

export function initImageLayer() {
  catalog = buildCatalog();
  userMappings = readUserMappings();
  writeMappingsToStorage(); // one-time v1 → v2 migration, if needed
  setupMappingSync();
  document.documentElement.classList.toggle('porknova-images-off', !enabled);
  ensureToolbar();
  scheduleDecorate();

  observer?.disconnect();
  observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        scheduleDecorate();
        break;
      }
    }
  });
  observer.observe(document.body, { childList:true, subtree:true });

  window.__PORKNOVA_IMAGE_LAYER__ = {
    version: IMAGE_LAYER_VERSION,
    refresh: () => { catalog = buildCatalog(); userMappings = readUserMappings(); refreshAllCards(); },
    enabled: () => enabled,
    setEnabled: writeEnabled,
    openLibrary: () => openAssetLibrary(),
    getMappings: () => JSON.parse(JSON.stringify(userMappings)),
    resolve: (kind, name) => resolvePathFor(kind, name),
    clearMapping: clearUserMapping,
    disableAutoMapping,
    enableAutoMapping,
    diagnostics,
    selfTest,
  };
}
