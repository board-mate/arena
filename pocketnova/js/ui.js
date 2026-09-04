// ============================================================================
// ui.js — 전체 UI (대폭 개선)
// ============================================================================
import { createGame, currentPlayer, actionCardDef } from './state.js';
import * as Board from './board.js';
import * as Engine from './engine.js';
import { createNetworkAdapter } from './network.js';
import {
  TYPE_COLORS, TYPE_LABELS_KO, ACTION_LABELS_KO, MAX_X_TOKENS,
  appealIncome, conservationTarget,
} from './config.js';

const root = document.getElementById('app');
const network = createNetworkAdapter();
const QUERY = new URLSearchParams(location.search);
const IS_SOLO = QUERY.get('solo') === '1';
const IS_ONLINE = QUERY.get('online') === '1' && window.parent !== window;
const ONLINE_SEAT = Number.isFinite(Number(QUERY.get('seat'))) ? Number(QUERY.get('seat')) : -1;
const ONLINE_HOST = QUERY.get('host') === '1';
let ONLINE_NAMES = [];
try { ONLINE_NAMES = JSON.parse(QUERY.get('names') || '[]'); } catch {}
const SOLO_SAVE_KEY = 'boardmate:pocketnova:solo:v3';
let resultPublished = false;

let game = null;
let ui = {
  selectedHand: null,    // 선택된 손패 카드
  selectedHexes: [],     // 선택된 맵 칸들
  activeAction: null,    // 현재 수행 중인 액션
  viewPlayerId: null,    // 현재 보는 플레이어
  pendingXTokens: 0,
  buildMode: null,       // 'kiosk'|'pavilion'|'enclosure'|...
  buildSize: 1,
  modal: null,           // 현재 모달
};

// ─────────────────────────────── helpers ───────────────────────
function el(tag, attrs={}, children=[]) {
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k==='class') e.className = v;
    else if (k==='html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  (Array.isArray(children)?children:[children]).forEach(c => {
    if (c==null) return;
    e.appendChild(typeof c==='string' ? document.createTextNode(c) : c);
  });
  return e;
}

function btn(label, onClick, cls='btn') {
  return el('button', { class:cls, onclick:onClick }, label);
}

function serializeGame(value) {
  return JSON.stringify(value, (k,v) => v instanceof Map ? {__pocketnovaMap:[...v.entries()]} : v);
}
function deserializeGame(text) {
  return JSON.parse(text, (k,v) => v && Array.isArray(v.__pocketnovaMap) ? new Map(v.__pocketnovaMap) : v);
}
function saveSoloGame() {
  if (!IS_SOLO || !game || game.phase === 'setup') return;
  try { localStorage.setItem(SOLO_SAVE_KEY, serializeGame(game)); } catch(e) { console.warn('solo save failed', e); }
}
function loadSoloGame() {
  if (!IS_SOLO) return null;
  try { const raw=localStorage.getItem(SOLO_SAVE_KEY); return raw ? deserializeGame(raw) : null; } catch(e) { return null; }
}
function clearSoloGame() { if (IS_SOLO) localStorage.removeItem(SOLO_SAVE_KEY); }

function render(node) { root.innerHTML=''; root.appendChild(node); }
function rerender() {
  if (game) {
    if (IS_ONLINE) ui.viewPlayerId = currentPlayer(game)?.id || ui.viewPlayerId;
    saveSoloGame();
    render(game.phase==='scoring' ? scoreView() : mainView());
    network.publish?.(game);
  }
}

// ───────────────────────── SETUP SCREEN ──────────────────────
export function startSetupScreen() {
  if (IS_ONLINE) {
    network.onRemoteUpdate?.(incoming => {
      if (!incoming?.players?.length) return;
      game = incoming;
      ui.viewPlayerId = currentPlayer(game)?.id || game.players[Math.max(0,ONLINE_SEAT)]?.id || game.players[0]?.id;
      closeModal();
      render(game.phase==='scoring' ? scoreView() : mainView());
    });
    if (!ONLINE_HOST) { render(onlineWaitingView()); return; }
  }
  const saved = loadSoloGame();
  if (saved?.solo?.enabled) { render(soloResumeView(saved)); return; }
  render(setupView());
}

function onlineWaitingView() {
  const wrap=el('div',{class:'setup-screen'});
  wrap.appendChild(el('h1',{},'⚡ 포크노바 · 온라인'));
  wrap.appendChild(el('p',{},'방장이 게임을 준비하고 있습니다. 준비가 끝나면 자동으로 같은 게임 상태가 표시됩니다.'));
  return wrap;
}

function soloResumeView(saved) {
  const wrap=el('div',{class:'setup-screen'});
  wrap.appendChild(el('h1',{},'⚡ 포크노바 · 1인플'));
  wrap.appendChild(el('p',{},`저장된 게임이 있습니다 · ${Math.min(Number(saved.turnNumber||1),27)}/27턴 · ${saved.phase==='scoring'?'종료됨':`라운드 ${saved.solo?.round||1}/6`}`));
  wrap.appendChild(btn('▶ 이어하기',()=>{game=saved;ui.viewPlayerId=currentPlayer(game).id;render(game.phase==='scoring'?scoreView():mainView());},'btn'));
  wrap.appendChild(el('span',{style:'display:inline-block;width:8px'}));
  wrap.appendChild(btn('새 게임',()=>{if(confirm('저장된 1인플 게임을 지우고 새로 시작할까요?')){clearSoloGame();render(setupView());}},'btn'));
  return wrap;
}

function setupView() {
  const wrap = el('div', { class:'setup-screen' });
  wrap.appendChild(el('h1', {}, IS_SOLO ? '⚡ 포크노바 · 1인플' : IS_ONLINE ? '⚡ 포크노바 · 온라인 설정' : '⚡ 포크노바'));
  wrap.appendChild(el('p', {}, IS_SOLO ? 'BoardMate 27턴 솔로 모드 · 매력도와 보존 점수 트랙을 교차시키세요.' : IS_ONLINE ? '방장이 초기 설정과 시작 손패 드래프트를 진행합니다.' : '아크노바 × 포켓몬 리스킨 — 로컬 hotseat'));

  let count = IS_SOLO ? 1 : IS_ONLINE ? Math.max(2, ONLINE_NAMES.length || 2) : 3;
  const nameInputs = el('div', { class:'player-inputs' });

  function renderNameInputs() {
    nameInputs.innerHTML = '';
    for (let i=0; i<count; i++) {
      nameInputs.appendChild(el('input', {
        placeholder:`트레이너 ${i+1}`, 'data-idx':i,
        ...(IS_ONLINE?{value:ONLINE_NAMES[i] || `트레이너 ${i+1}`,disabled:''}:{})
      }));
    }
  }

  const countOptions = IS_SOLO ? [1] : IS_ONLINE ? [count] : [2,3,4];
  const countSel = el('select', {
    onchange: e => { count=Number(e.target.value); renderNameInputs(); },
    ...((IS_SOLO||IS_ONLINE)?{disabled:''}:{})
  }, countOptions.map(n =>
    el('option', { value:n, ...((IS_SOLO||IS_ONLINE||n===3)?{selected:''}:{}) }, IS_SOLO?'1명 · 27턴 솔로':`${n}명`)
  ));

  const mapSel = el('select', {},
    Board.getAvailableMaps().map((m,i) =>
      el('option', { value:m.id, ...(i===0?{selected:''}:{}) }, `${m.name} (${m.id})`)
    )
  );

  wrap.appendChild(el('label', {}, [IS_SOLO?'모드':'인원 수', countSel]));
  if (IS_SOLO) {
    const diffSel=el('select',{id:'solo-difficulty'},[
      el('option',{value:'20',selected:''},'입문 · 매력도 20에서 시작'),
      el('option',{value:'10'},'보통 · 매력도 10에서 시작'),
      el('option',{value:'0'},'도전 · 매력도 0에서 시작')
    ]);
    wrap.appendChild(el('label',{},['솔로 난이도',diffSel]));
  }
  wrap.appendChild(el('label', {}, ['사파리존 지도', mapSel]));
  wrap.appendChild(nameInputs);
  renderNameInputs();

  wrap.appendChild(el('br'));
  wrap.appendChild(btn('게임 시작 🚀', () => {
    const names = Array.from(nameInputs.querySelectorAll('input'))
      .map((inp,i) => inp.value.trim() || `트레이너 ${i+1}`);
    const mapId = mapSel.value;
    const soloAppeal = IS_SOLO ? Number(document.querySelector('#solo-difficulty')?.value || 20) : 20;
    game = createGame({ playerNames:names, mapId, solo:IS_SOLO, soloAppeal });
    ui.viewPlayerId = currentPlayer(game).id;
    setupStarterKiosk();
    startDraftPhase();
  }));
  return wrap;
}

function setupStarterKiosk() {
  if (!game.map.starterKiosk) return;
  const { q, r } = game.map.starterKiosk;
  game.players.forEach(p => {
    p.zooBuildings.set(Board.key(q,r), {
      kind:'kiosk', size:1, occupied:false, cells:[{q,r}],
    });
  });
}

// ─────────────────────── DRAFT PHASE ────────────────────────
function startDraftPhase() {
  // 8장 중 4장 선택
  const player = currentPlayer(game);
  showDraftModal(player, () => {
    const nextIdx = game.players.findIndex(p=>p.id===player.id) + 1;
    if (nextIdx < game.players.length) {
      game.currentPlayerIndex = nextIdx;
      startDraftPhase();
    } else {
      game.currentPlayerIndex = 0;
      game.phase = 'playing';
      rerender();
    }
  });
}

function showDraftModal(player, onDone) {
  const selected = new Set();
  const cards = player.hand; // 8장

  function rebuild() {
    modalBody.innerHTML = '';
    modalBody.appendChild(el('p', { style:'margin-bottom:8px;color:#aaa;font-size:12px;' },
      `${player.name}의 시작 손패 선택 (4장)`));
    const grid = el('div', { style:'display:flex;flex-wrap:wrap;gap:6px;' });
    cards.forEach((c,i) => {
      const sel = selected.has(i);
      const card = renderCard(c, { compact:true, selected:sel });
      card.onclick = () => {
        if (sel) { selected.delete(i); }
        else if (selected.size < 4) { selected.add(i); }
        rebuild();
      };
      grid.appendChild(card);
    });
    modalBody.appendChild(grid);

    confirmBtn.disabled = selected.size !== 4;
    confirmBtn.textContent = `확인 (${selected.size}/4장 선택됨)`;
  }

  const modalBody = el('div');
  const confirmBtn = btn('확인', () => {
    const keep = [...selected].sort((a,b)=>a-b);
    const newHand = keep.map(i=>cards[i]);
    const discard = cards.filter((_,i)=>!selected.has(i));
    player.hand = newHand;
    game.discard.push(...discard);
    closeModal();
    onDone();
  });
  confirmBtn.disabled = true;

  showModal('시작 손패 선택', modalBody, [confirmBtn]);
  rebuild();
}

// ───────────────────────── MAIN VIEW ────────────────────────
function mainView() {
  const readOnly = IS_ONLINE && ONLINE_SEAT >= 0 && ONLINE_SEAT !== Number(game.currentPlayerIndex);
  const shell = el('div', { class:`app-shell${readOnly?' online-readonly':''}` });
  shell.appendChild(topbar());
  const left = el('div');
  left.appendChild(playerSection());
  left.appendChild(mapPanel());
  left.appendChild(actionStripPanel());
  left.appendChild(displayPanel());
  left.appendChild(logPanel());
  shell.appendChild(left);
  shell.appendChild(rightColumn());
  return shell;
}

function topbar() {
  const p = currentPlayer(game);
  const target = conservationTarget(p.conservation);
  const pct = Math.min(100, Math.abs(p.appeal-target) > 0
    ? (p.appeal/target*100).toFixed(0) : 100);
  const indicator = game.solo?.enabled
    ? [`솔로 ${game.solo.round}/6 · `, el('b',{},`${Math.min(game.turnNumber,27)}/27턴`), ` · 이번 라운드 ${game.solo.turnsRemaining}턴 남음`]
    : [`턴 ${game.turnNumber} · `, el('b',{},p.name), ` 차례`, ` | 휴식트랙: ${game.breakTrack.position}/${game.breakTrack.length}`, ...(IS_ONLINE&&ONLINE_SEAT!==game.currentPlayerIndex?[' · 보기 전용']:[])];
  return el('div', { class:'topbar' }, [
    el('div', { class:'brand' }, ['⚡ 포크노바', el('small',{},'× 아크노바 리테마')]),
    el('div', { class:'turn-indicator' }, indicator),
  ]);
}

// ──────── PLAYER SECTION ────────
function playerSection() {
  const wrap = el('div', { class:'panel' });
  wrap.appendChild(el('h3',{},'트레이너 현황'));

  // 탭
  const tabs = el('div', { class:'player-tabs', style:'margin-bottom:10px;' });
  game.players.forEach(p => {
    tabs.appendChild(el('div', {
      class:`player-tab${p.id===ui.viewPlayerId?' active':''}`,
      style:`background:${p.color}22;border-color:${p.id===ui.viewPlayerId?p.color:'transparent'}`,
      onclick: () => { if (IS_ONLINE) return; ui.viewPlayerId=p.id; rerender(); },
    }, [
      p.name,
      p.id===currentPlayer(game).id ? ' 🔷' : '',
    ]));
  });
  wrap.appendChild(tabs);

  // 현재 보는 플레이어 스탯
  const vp = viewedPlayer();
  const target = conservationTarget(vp.conservation);
  const income = appealIncome(vp.appeal);

  wrap.appendChild(el('div', { class:'stats-row' }, [
    statBox('💰', vp.money, '돈', 'stat-money'),
    statBox('❤️', vp.appeal, '매력도', 'stat-appeal'),
    statBox('🌿', vp.conservation, '보존점수', 'stat-conservation'),
    statBox('⭐', vp.reputation, '명성', 'stat-reputation'),
    statBox('✖️', vp.xTokens, 'X-토큰', 'stat-xtoken'),
  ]));

  // 트랙 시각화
  wrap.appendChild(el('div', { style:'font-size:11px;color:#aaa;margin-top:4px;' }, [
    `🎯 목표 매력도: ${target} | 현재 수입: ${income}원/휴식`,
    ` | 파트너동물원: ${vp.partnerZoos.join(', ')||'없음'}`,
  ]));

  const appealPct = Math.min(100, vp.appeal/113*100);
  wrap.appendChild(progressBar(appealPct, 'var(--appeal)', '매력도'));
  const consPct = Math.min(100, vp.conservation/41*100);
  wrap.appendChild(progressBar(consPct, 'var(--conservation)', '보존'));

  return wrap;
}

function statBox(icon, val, lbl, cls='') {
  return el('div', { class:`stat-box ${cls}` }, [
    el('div', { class:'val' }, `${icon} ${val}`),
    el('div', { class:'lbl' }, lbl),
  ]);
}

function progressBar(pct, color, label) {
  const wrap = el('div', { style:'margin:2px 0;' });
  wrap.appendChild(el('div', { style:'font-size:10px;color:#666;' }, label));
  const bar = el('div', { class:'track-bar' });
  bar.appendChild(el('div', { class:'track-fill', style:`width:${pct}%;background:${color};` }));
  wrap.appendChild(bar);
  return wrap;
}

// ──────── MAP PANEL ────────
function mapPanel() {
  const player = viewedPlayer();
  const wrap = el('div', { class:'panel map-wrap' });
  wrap.appendChild(el('h3',{},`🗺️ 사파리존 — ${game.map.name}`));
  if (game.map.specialRule) {
    wrap.appendChild(el('p', { style:'font-size:11px;color:#f39c12;margin-bottom:6px;' },
      game.map.specialRule));
  }

  const HEX_SIZE = 24;
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class', `hex-grid map-theme-${game.map.theme||''}`);

  // 전체 타일 범위 계산
  const qs = game.map.tiles.map(t=>t.q);
  const rs = game.map.tiles.map(t=>t.r);
  const minQ=Math.min(...qs), maxQ=Math.max(...qs);
  const minR=Math.min(...rs), maxR=Math.max(...rs);
  const W = (maxQ-minQ+2)*HEX_SIZE*1.75;
  const H = (maxR-minR+2)*HEX_SIZE*1.6;
  svg.setAttribute('width', Math.min(640, W+20));
  svg.setAttribute('height', Math.min(440, H+20));
  svg.setAttribute('viewBox', `0 0 ${W+20} ${H+20}`);

  const toPx = (q,r) => [
    HEX_SIZE*1.73*(q + r/2 - minQ) + HEX_SIZE*1.2,
    HEX_SIZE*1.5*(r - minR) + HEX_SIZE,
  ];

  game.map.tiles.forEach(t => {
    const [x,y] = toPx(t.q, t.r);
    const build = player.zooBuildings.get(Board.key(t.q, t.r));
    let cls = 'hex ';

    if (build) {
      if (build.kind==='enclosure')
        cls += `building-enclosure-${build.occupied?'occupied':'empty'}`;
      else
        cls += `building-${build.kind}`;
    } else if (t.type==='bonus' && t.bonus?.kind==='upgrade_required') {
      cls += 'upgrade-req';
    } else {
      cls += t.type;
    }

    if (ui.selectedHexes.some(h=>h.q===t.q&&h.r===t.r)) cls += ' selected';

    const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('points', hexPoints(x, y, HEX_SIZE));
    poly.setAttribute('class', cls);
    poly.addEventListener('click', () => onHexClick(t));
    svg.appendChild(poly);

    // 보너스 텍스트
    if (t.type==='bonus' && t.bonus && t.bonus.kind!=='upgrade_required') {
      const label = bonusLabel(t.bonus);
      const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x', x); txt.setAttribute('y', y+4);
      txt.setAttribute('text-anchor','middle');
      txt.setAttribute('font-size','10');
      txt.setAttribute('fill','#333');
      txt.setAttribute('pointer-events','none');
      txt.textContent = label;
      svg.appendChild(txt);
    }

    // 건물 타입 표시
    if (build) {
      const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x', x); txt.setAttribute('y', y+4);
      txt.setAttribute('text-anchor','middle');
      txt.setAttribute('font-size','11');
      txt.setAttribute('fill','#fff');
      txt.setAttribute('pointer-events','none');
      txt.textContent = buildIcon(build.kind);
      svg.appendChild(txt);
    }
  });

  wrap.appendChild(svg);

  // 건설 모드 컨트롤
  if (ui.activeAction==='build') {
    wrap.appendChild(buildControls());
  }

  return wrap;
}

function bonusLabel(b) {
  const icons = { money:'💰', reputation:'⭐', conservation:'🌿', xtoken:'✖️', appeal:'❤️' };
  return `${icons[b.kind]||'?'}${b.amount||''}`;
}
function buildIcon(kind) {
  return { kiosk:'🏪', pavilion:'🎪', enclosure:'🔲',
           pettingZoo:'🐰', reptileHouse:'🦎', largeBirdAviary:'🦅' }[kind] || '';
}

function hexPoints(cx, cy, s) {
  return Array.from({length:6}, (_,i) => {
    const a = Math.PI/180 * (60*i - 30);
    return `${cx+s*Math.cos(a)},${cy+s*Math.sin(a)}`;
  }).join(' ');
}

function onHexClick(tile) {
  if (!ui.activeAction || ui.activeAction!=='build') return;
  const k = Board.key(tile.q, tile.r);
  const existing = ui.selectedHexes.findIndex(h=>h.q===tile.q&&h.r===tile.r);
  if (existing>=0) {
    ui.selectedHexes.splice(existing, 1);
  } else {
    ui.selectedHexes.push({ q:tile.q, r:tile.r });
  }
  rerender();
}

// ──────── BUILD CONTROLS ────────
function buildControls() {
  const div = el('div', { class:'panel', style:'margin-top:8px;' });
  div.appendChild(el('h3',{},'건설 모드'));

  // 건물 종류 선택
  const kinds = [
    ['kiosk','🏪 매점 (1칸)'],
    ['pavilion','🎪 파빌리온 (1칸)'],
    ['enclosure','🔲 우리 (N칸)'],
    ['pettingZoo','🐰 어린이동물원 (3칸)'],
  ];
  const side = viewedPlayer().actionSlots.find(s=>s.actionType==='build')?.side;
  if (side==='II') {
    kinds.push(['reptileHouse','🦎 파충류관 (5칸)']);
    kinds.push(['largeBirdAviary','🦅 조류관 (5칸)']);
  }

  const kindSel = el('select', { style:'margin-bottom:6px;width:100%;' },
    kinds.map(([v,l]) => el('option',{value:v},l))
  );
  kindSel.value = ui.buildMode || 'enclosure';
  kindSel.onchange = e => { ui.buildMode=e.target.value; ui.selectedHexes=[]; rerender(); };
  div.appendChild(kindSel);

  if (['enclosure'].includes(ui.buildMode||'enclosure')) {
    const sizeSel = el('select', { style:'margin-bottom:6px;width:100%;' },
      [1,2,3,4,5].map(n=>el('option',{value:n},`${n}칸 우리`))
    );
    sizeSel.value = ui.buildSize;
    sizeSel.onchange = e => { ui.buildSize=Number(e.target.value); ui.selectedHexes=[]; rerender(); };
    div.appendChild(sizeSel);
  }

  div.appendChild(el('p', { style:'font-size:11px;color:#aaa;margin-bottom:6px;' },
    `${ui.selectedHexes.length}칸 선택됨. 맵을 클릭해 칸 선택`));

  const needSize = getBuildSize(ui.buildMode||'enclosure', ui.buildSize);
  const canBuild = ui.selectedHexes.length === needSize;

  div.appendChild(btn('건설 확인 ✅', () => {
    try {
      const player = currentPlayer(game);
      const kind = ui.buildMode || 'enclosure';
      const cells = [...ui.selectedHexes];
      Engine.resolveBuild(game, player, {
        side: player.actionSlots.find(s=>s.actionType==='build')?.side || 'I',
        buildings: [{ kind, size:ui.buildSize, cells }],
        xTokens: ui.pendingXTokens,
      });
      Engine.checkAndRunBreak(game);
      ui.selectedHexes = [];
      ui.activeAction = null;
      ui.pendingXTokens = 0;
      rerender();
    } catch(e) { alert(e.message); }
  }, `btn${canBuild?'':' btn-secondary'}`));

  div.appendChild(btn('취소', () => {
    ui.activeAction=null; ui.selectedHexes=[]; rerender();
  }, 'btn btn-secondary'));

  return div;
}

function getBuildSize(kind, size) {
  if (kind==='kiosk'||kind==='pavilion') return 1;
  if (kind==='pettingZoo') return 3;
  if (kind==='reptileHouse'||kind==='largeBirdAviary') return 5;
  return size;
}

// ──────── ACTION STRIP ────────
function actionStripPanel() {
  const wrap = el('div', { class:'panel' });
  wrap.appendChild(el('h3',{},'⚡ 액션 카드'));
  const strip = el('div', { class:'action-strip' });

  currentPlayer(game).actionSlots.forEach((slot,i) => {
    const strength = i+1;
    const card = el('div', {
      class:`action-card${ui.activeAction===slot.actionType?' active':''}`,
      onclick: () => pickAction(slot.actionType, slot.side, strength),
    }, [
      el('div', { class:'action-side' }, slot.side),
      el('div', { class:'slot-strength' }, strength),
      el('div', { class:'action-name' }, ACTION_LABELS_KO[slot.actionType]),
    ]);
    strip.appendChild(card);
  });

  wrap.appendChild(strip);

  // X-토큰 사용
  const cp = currentPlayer(game);
  if (cp.xTokens > 0) {
    const xRow = el('div', { style:'margin-top:6px;display:flex;align-items:center;gap:8px;' });
    xRow.appendChild(el('span',{style:'font-size:12px;'},'X-토큰 사용:'));
    [0,1,2].forEach(n => {
      if (n<=cp.xTokens) {
        xRow.appendChild(btn(`+${n}`, ()=>{ui.pendingXTokens=n;rerender();},
          `btn-sm btn-purple${ui.pendingXTokens===n?' active':''}`));
      }
    });
    xRow.appendChild(el('span',{style:'font-size:11px;color:#aaa;'},`(보유: ${cp.xTokens})`));
    wrap.appendChild(xRow);
  }

  // X-토큰 액션
  wrap.appendChild(btn('X-토큰 획득 (액션 소모)', () => {
    try {
      const type = currentPlayer(game).actionSlots[0].actionType;
      Engine.resolveXToken(game, currentPlayer(game), type);
      rerender();
    } catch(e) { alert(e.message); }
  }, 'btn btn-sm btn-secondary'));

  return wrap;
}

function pickAction(actionType, side, strength) {
  ui.activeAction = actionType;
  ui.selectedHexes = [];
  if (actionType !== 'build') {
    showActionModal(actionType, side, strength);
  } else {
    ui.buildMode = ui.buildMode || 'enclosure';
    rerender();
  }
}

// ──────── ACTION MODALS ────────
function showActionModal(actionType, side, strength) {
  const eff = Math.min(5, strength + ui.pendingXTokens);
  const player = currentPlayer(game);

  switch(actionType) {
    case 'cards':      showCardsModal(side, eff); break;
    case 'animals':    showAnimalsModal(side, eff); break;
    case 'association':showAssocModal(side, eff); break;
    case 'sponsors':   showSponsorsModal(side, eff); break;
  }
}

// ── CARDS ──
function showCardsModal(side, eff) {
  const player = currentPlayer(game);
  const def = actionCardDef('cards', side);
  const drawCount = def.draw?.[eff] ?? 0;
  const discardCount = def.discard?.[eff] ?? 0;

  const body = el('div');
  body.appendChild(el('p',{style:'margin-bottom:8px;'},
    `강도 ${eff} → ${drawCount}장 뽑기, ${discardCount}장 버리기 | 낚아채기: 강도≥${side==='II'?3:5}`));

  const discardSet = new Set();
  const handList = el('div', { class:'hand-grid' });
  player.hand.forEach((c,i) => {
    const card = renderCard(c, { compact:true, selected:discardSet.has(i) });
    card.onclick = () => {
      if (discardSet.has(i)) discardSet.delete(i);
      else if (discardSet.size < discardCount) discardSet.add(i);
      refreshHandList();
    };
    handList.appendChild(card);
  });
  body.appendChild(el('p',{style:'font-size:11px;color:#aaa;margin:4px 0;'},'버릴 카드 선택:'));
  body.appendChild(handList);

  function refreshHandList() {
    handList.innerHTML='';
    player.hand.forEach((c,i) => {
      const card = renderCard(c, { compact:true, selected:discardSet.has(i) });
      card.onclick = () => {
        if (discardSet.has(i)) discardSet.delete(i);
        else if (discardSet.size < discardCount) discardSet.add(i);
        refreshHandList();
      };
      handList.appendChild(card);
    });
  }

  const actions = [
    btn('덱에서 뽑기', () => {
      try {
        Engine.resolveCards(game, player, {
          side, mode:'draw',
          discardIndices: [...discardSet].sort((a,b)=>b-a),
          xTokens: ui.pendingXTokens,
        });
        Engine.checkAndRunBreak(game);
        closeModal(); ui.activeAction=null; ui.pendingXTokens=0;
        rerender();
      } catch(e) { alert(e.message); }
    }),
  ];

  // 낚아채기 — 필드 카드 선택 모달
  if (eff >= (side==='II'?3:5)) {
    actions.push(btn('낚아채기…', () => {
      showSnapModal(side);
    }, 'btn btn-blue'));
  }

  showModal('모험 (카드 뽑기)', body, actions);
}

function showSnapModal(side) {
  const player = currentPlayer(game);
  const body = el('div');
  body.appendChild(el('p',{style:'margin-bottom:8px;color:#aaa;font-size:12px;'},
    '낚아챌 카드를 필드에서 선택하세요.'));

  let snapTarget = null;
  const dispRow = el('div', { class:'display-row' });
  game.display.forEach((c,i) => {
    const card = renderCard(c, { compact:true });
    card.onclick = () => {
      snapTarget = c;
      dispRow.querySelectorAll('.zoo-card').forEach(el=>el.classList.remove('selected-card'));
      card.classList.add('selected-card');
    };
    dispRow.appendChild(card);
  });
  body.appendChild(dispRow);

  showModal('낚아채기', body, [
    btn('확인', () => {
      if (!snapTarget) { alert('카드를 선택하세요.'); return; }
      try {
        Engine.resolveCards(game, player, { side, mode:'snap', snapCard:snapTarget });
        Engine.checkAndRunBreak(game);
        closeModal(); ui.activeAction=null; ui.pendingXTokens=0;
        rerender();
      } catch(e) { alert(e.message); }
    }),
    btn('취소', closeModal, 'btn btn-secondary'),
  ]);
}

// ── ANIMALS ──
function showAnimalsModal(side, eff) {
  const player = currentPlayer(game);
  const def = actionCardDef('animals', side);
  const maxPlays = def.table?.[eff] ?? 0;

  const body = el('div');
  body.appendChild(el('p',{style:'margin-bottom:8px;'},
    `강도 ${eff} → 동물 최대 ${maxPlays}장 낼 수 있음`));

  const selected = new Set();
  const handList = el('div', { class:'hand-grid' });

  function refreshList() {
    handList.innerHTML='';
    const animalCards = player.hand.filter(c=>c.kind==='animal');
    if (!animalCards.length) {
      handList.appendChild(el('p',{style:'color:#aaa;'},
        '손패에 동물 카드가 없습니다.'));
      return;
    }
    animalCards.forEach((c,i) => {
      const sel = selected.has(c);
      const card = renderCard(c, { compact:false, selected:sel });
      card.onclick = () => {
        if (sel) selected.delete(c);
        else if (selected.size < maxPlays) selected.add(c);
        refreshList();
      };
      handList.appendChild(card);
    });
  }
  body.appendChild(handList);
  refreshList();

  showModal('포획 (동물 배치)', body, [
    btn('배치 실행', () => {
      if (!selected.size) { alert('카드를 선택하세요.'); return; }
      // 각 카드마다 우리 선택 모달 (간략: 빈 우리 자동 배정)
      const plays = [...selected].map(card => {
        const freeEnc = findFreeEnclosure(player, card);
        if (!freeEnc) throw new Error(`${card.name}을 위한 빈 우리가 없습니다.`);
        return { card, fromHand:true, enclosureCells:freeEnc };
      });
      try {
        Engine.resolveAnimals(game, player, { side, plays, xTokens:ui.pendingXTokens });
        Engine.checkAndRunBreak(game);
        closeModal(); ui.activeAction=null; ui.pendingXTokens=0;
        checkAndHandlePendingEffects(player, rerender);
      } catch(e) { alert(e.message); }
    }),
    btn('취소', closeModal, 'btn btn-secondary'),
  ]);
}

function findFreeEnclosure(player, card) {
  for (const [k,b] of player.zooBuildings) {
    if (b.kind==='enclosure' && !b.occupied && b.size>=card.enclosureSize) {
      return b.cells || [{ q:parseInt(k.split(',')[0]), r:parseInt(k.split(',')[1]) }];
    }
  }
  return null;
}

// ── ASSOCIATION ──
function showAssocModal(side, eff) {
  const player = currentPlayer(game);
  const def = actionCardDef('association', side);

  const body = el('div');
  body.appendChild(el('p',{style:'margin-bottom:8px;'},
    `강도 ${eff} | 일꾼: ${player.associationWorkers.active}명 활동 중`));
  body.appendChild(el('p',{style:'font-size:11px;color:#aaa;margin-bottom:6px;'},
    '수행할 업무를 선택하세요:'));

  const actions = [];

  // 명성 +2 (비용 2)
  if (eff >= 2) {
    actions.push(btn(`📈 명성 +2 (비용2)`, () => {
      doAssoc(side, [{ type:'reputation', cost:2, workersNeeded:1 }]);
    }, 'btn btn-blue'));
  }

  // 파트너 동물원 (비용 3)
  if (eff >= 3) {
    game.associationBoard.partnerZoosAvailable.forEach(region => {
      if (!player.partnerZoos.includes(region)) {
        actions.push(btn(`🌍 파트너 동물원: ${region} (비용3)`, () => {
          doAssoc(side, [{ type:'partnerZoo', region, cost:3, workersNeeded:1 }]);
        }, 'btn btn-green'));
      }
    });
  }

  // 대학 (비용 4)
  if (eff >= 4) {
    game.associationBoard.universitiesAvailable.forEach(uniId => {
      if (!player.universities.includes(uniId)) {
        actions.push(btn(`🎓 대학: ${uniId} (비용4)`, () => {
          doAssoc(side, [{ type:'university', uniId, cost:4, workersNeeded:1 }]);
        }, 'btn btn-purple'));
      }
    });
  }

  // 보존 프로젝트 지원 (비용 5)
  if (eff >= 5) {
    [...game.baseConservationProjects,
     ...game.conservationProjectsInPlay].forEach(proj => {
      actions.push(btn(`🌱 보존프로젝트: ${proj.name} (비용5)`, () => {
        doAssoc(side, [{
          type:'conservationProject',
          project:proj, tierIndex:0, cost:5, workersNeeded:1,
        }]);
      }, 'btn btn-green'));
    });
  }

  // 기부 (II면)
  if (side==='II' && def.donation) {
    actions.push(btn('💝 기부 (보존+1)', () => {
      doAssoc(side, [], true);
    }, 'btn'));
  }

  if (!actions.length) {
    body.appendChild(el('p',{style:'color:#aaa;'},'가능한 업무 없음 (강도 부족)'));
  } else {
    actions.forEach(a => {
      a.style.display='block'; a.style.width='100%'; a.style.marginBottom='6px';
      body.appendChild(a);
    });
  }

  showModal('협회 액션', body, [btn('취소', closeModal, 'btn btn-secondary')]);

  function doAssoc(side, tasks, donate=false) {
    try {
      Engine.resolveAssociation(game, player, { side, tasks, donate, xTokens:ui.pendingXTokens });
      Engine.checkAndRunBreak(game);
      closeModal(); ui.activeAction=null; ui.pendingXTokens=0;
      rerender();
    } catch(e) { alert(e.message); }
  }
}

// ── SPONSORS ──
function showSponsorsModal(side, eff) {
  const player = currentPlayer(game);
  const def = actionCardDef('sponsors', side);

  const body = el('div');
  body.appendChild(el('p',{style:'margin-bottom:8px;'},
    `강도 ${eff} | 도움카드 레벨 합 ≤ ${side==='II'?eff+1:eff}`));

  const selected = new Set();
  const handList = el('div', { class:'hand-grid' });
  const sponsorCards = player.hand.filter(c=>c.kind==='sponsor');

  sponsorCards.forEach(c => {
    const sel = selected.has(c);
    const card = renderCard(c, { compact:true, selected:sel });
    card.onclick = () => {
      if (sel) selected.delete(c);
      else selected.add(c);
      refreshList();
    };
    handList.appendChild(card);
  });

  function refreshList() {
    handList.innerHTML='';
    sponsorCards.forEach(c => {
      const sel = selected.has(c);
      const card = renderCard(c, { compact:true, selected:sel });
      card.onclick = () => {
        if (sel) selected.delete(c);
        else selected.add(c);
        refreshList();
      };
      handList.appendChild(card);
    });
  }

  body.appendChild(el('p',{style:'font-size:11px;color:#aaa;'},'손패의 도움 카드 선택:'));
  body.appendChild(handList);

  showModal('도움 액션', body, [
    btn('카드 사용', () => {
      if (!selected.size) { alert('카드를 선택하세요.'); return; }
      try {
        Engine.resolveSponsors(game, player, {
          side,
          plays: [...selected].map(c=>({card:c,fromHand:true})),
          xTokens: ui.pendingXTokens,
        });
        Engine.checkAndRunBreak(game);
        closeModal(); ui.activeAction=null; ui.pendingXTokens=0;
        checkAndHandlePendingEffects(player, rerender);
      } catch(e) { alert(e.message); }
    }),
    btn('💰 휴식 전진+돈', () => {
      try {
        Engine.resolveSponsors(game, player, {
          side, breakAdvance:true, xTokens:ui.pendingXTokens,
        });
        Engine.checkAndRunBreak(game);
        closeModal(); ui.activeAction=null; ui.pendingXTokens=0;
        rerender();
      } catch(e) { alert(e.message); }
    }, 'btn btn-money'),
    btn('취소', closeModal, 'btn btn-secondary'),
  ]);
}

// ──────── DISPLAY PANEL ────────
function displayPanel() {
  const wrap = el('div', { class:'panel' });
  wrap.appendChild(el('h3',{},'📋 필드 카드 (디스플레이)'));
  const row = el('div', { class:'display-row' });
  game.display.forEach((c,i) => {
    const folder = el('div', { class:'display-folder' });
    folder.appendChild(el('div', { class:'folder-num' }, `${i+1}`));
    folder.appendChild(renderCard(c, { compact:true }));
    row.appendChild(folder);
  });
  if (!game.display.length) {
    row.appendChild(el('p',{style:'color:#666;font-size:12px;'},'덱이 비었습니다.'));
  }
  row.appendChild(el('div', { style:'margin-left:8px;font-size:11px;color:#666;' },
    `덱: ${game.deck.length}장`));
  wrap.appendChild(row);
  return wrap;
}

// ──────── RIGHT COLUMN ────────
function rightColumn() {
  const col = el('div', { class:'right-col' });
  col.appendChild(handPanel());
  col.appendChild(conservationProjectsPanel());
  col.appendChild(endTurnPanel());
  return col;
}

function handPanel() {
  const player = viewedPlayer();
  const wrap = el('div', { class:'panel' });
  wrap.appendChild(el('h3',{},`🃏 손패 (${player.hand.length}/${player.handLimit}장)`));
  const grid = el('div', { class:'hand-grid' });
  if (!player.hand.length) {
    grid.appendChild(el('p',{style:'color:#666;font-size:12px;'},'손패 없음'));
  }
  player.hand.forEach(c => {
    grid.appendChild(renderCard(c, { compact:false }));
  });
  wrap.appendChild(grid);
  return wrap;
}

function conservationProjectsPanel() {
  const wrap = el('div', { class:'panel' });
  wrap.appendChild(el('h3',{},'🌱 보존 프로젝트'));
  const all = [...game.baseConservationProjects, ...game.conservationProjectsInPlay];
  if (!all.length) {
    wrap.appendChild(el('p',{style:'color:#666;font-size:12px;'},'없음'));
    return wrap;
  }
  all.forEach(proj => {
    const row = el('div', { style:'margin-bottom:6px;padding:6px;background:rgba(0,0,0,0.2);border-radius:4px;' });
    row.appendChild(el('div',{style:'font-weight:600;font-size:12px;'},proj.name));
    row.appendChild(el('div',{style:'font-size:10px;color:#aaa;'},proj.description||''));
    wrap.appendChild(row);
  });
  return wrap;
}

function endTurnPanel() {
  const wrap = el('div', { class:'panel' });
  wrap.appendChild(el('h3',{},'턴 종료'));

  const cp = currentPlayer(game);

  wrap.appendChild(el('div', { style:'margin-bottom:10px;' }, [
    el('p',{style:'font-size:12px;color:#aaa;'},`현재 차례: ${cp.name}`),
    el('p',{style:'font-size:11px;color:#666;'}, game.solo?.enabled
      ? `27턴 솔로: 라운드 ${game.solo.round}/6 · 이번 라운드 ${game.solo.turnsRemaining}턴 남음 · 전체 ${Math.min(game.turnNumber,27)}/27턴`
      : `휴식 트랙: ${game.breakTrack.position} / ${game.breakTrack.length}`),
  ]));

  const btVis = el('div', { class:'break-track-vis' });
  const visLen = game.solo?.enabled ? game.solo.tokensRemaining : game.breakTrack.length;
  const filled = game.solo?.enabled ? (game.solo.tokensRemaining-game.solo.turnsRemaining) : game.breakTrack.position;
  for (let i=0; i<visLen; i++) {
    btVis.appendChild(el('div', { class:`bt-cell${i<filled?' filled':''}` }));
  }
  wrap.appendChild(btVis);

  wrap.appendChild(el('br'));
  wrap.appendChild(btn('턴 종료 →', () => {
    Engine.endTurn(game);
    saveSoloGame();
    ui.viewPlayerId = currentPlayer(game).id;
    ui.activeAction = null;
    ui.pendingXTokens = 0;
    ui.selectedHexes = [];
    if (game.phase==='scoring') {
      if (IS_ONLINE) network.publish?.(game);
      render(scoreView());
    } else {
      rerender();
    }
  }, 'btn'));

  return wrap;
}

// ──────── LOG PANEL ────────
function logPanel() {
  const wrap = el('div', { class:'panel' });
  wrap.appendChild(el('h3',{},'📜 게임 로그'));
  const logDiv = el('div', { class:'log-panel' });
  const entries = [...game.log].reverse().slice(0,30);
  entries.forEach(e => {
    const isBreak = e.text.includes('휴식');
    const isEnd   = e.text.includes('종료');
    logDiv.appendChild(el('div', {
      class:`log-entry${isBreak?' log-break':''}${isEnd?' log-end':''}`,
    }, [
      el('span',{class:'log-turn'},`T${e.turn}`),
      e.text,
    ]));
  });
  wrap.appendChild(logDiv);
  return wrap;
}

// ──────── CARD RENDERER ────────
function renderCard(card, { compact=false, selected=false }={}) {
  const types = card.types ? card.types : (card.type ? [card.type] : []);
  const mainType = types[0] || 'normal';
  const cls = [
    'zoo-card',
    `kind-${card.kind||'animal'}`,
    `type-${mainType}`,
    selected ? 'selected-card' : '',
  ].join(' ');

  const c = el('div', { class:cls });

  if (card.cost !== undefined) {
    c.appendChild(el('div',{class:'card-cost'},`${card.cost}`));
  }
  if (card.level !== undefined) {
    c.appendChild(el('div',{class:'card-cost',style:'color:#3498db;'},`Lv${card.level}`));
  }

  c.appendChild(el('div',{class:'card-name'},card.name));

  // 타입 뱃지
  if (types.length) {
    const typesDiv = el('div',{class:'card-types'});
    types.slice(0,2).forEach(t => {
      typesDiv.appendChild(el('span',{
        class:'type-badge',
        style:`background:${TYPE_COLORS[t]||'#555'};`,
      }, TYPE_LABELS_KO[t]||t));
    });
    c.appendChild(typesDiv);
  }

  // 매력도
  if (card.appeal) {
    c.appendChild(el('div',{class:'card-appeal'},`❤️${card.appeal ?? '?'}`));
  }

  // 능력 텍스트 (compact 아닐 때)
  if (!compact && (card.abilityText || card.ability)) {
    c.appendChild(el('div',{class:'card-ability'},card.abilityText || card.ability));
  }

  // 우리 크기 / 지역
  if (!compact) {
    const info = [];
    if (card.enclosureSize) info.push(`🔲${card.enclosureSize}`);
    if (card.regions?.length) info.push(card.regions.join('/'));
    if (info.length) {
      c.appendChild(el('div',{style:'font-size:10px;color:#888;margin-top:2px;'},info.join(' | ')));
    }
  }

  return c;
}

// ──────── MODAL HELPERS ────────
function showModal(title, body, actions=[]) {
  const overlay = el('div', { class:'modal-overlay', onclick:(e)=>{ if(e.target===overlay) closeModal(); } });
  const modal = el('div', { class:'modal' });
  modal.appendChild(el('h3',{},title));
  modal.appendChild(body);
  const actRow = el('div',{class:'modal-actions'});
  actions.forEach(a=>actRow.appendChild(a));
  modal.appendChild(actRow);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  ui.modal = overlay;
}

function closeModal() {
  if (ui.modal) { ui.modal.remove(); ui.modal=null; }
}

// ══════════════════════════════════════════════════════════════
// ★ _pendingAfterFinishing 효과 처리 — 동물카드 12장 모달
// ══════════════════════════════════════════════════════════════

function checkAndHandlePendingEffects(player, onDone) {
  if (!player._pendingAfterFinishing || !player._pendingAfterFinishing.length) {
    onDone();
    return;
  }
  const effect = player._pendingAfterFinishing.shift();
  switch (effect.type) {
    case 'mischief':
      showMischiefModal(player, effect, () => checkAndHandlePendingEffects(player, onDone));
      break;
    case 'free_kiosk_pavilion':
    case 'free_special_build':
      showFreeBuildModal(player, effect, () => checkAndHandlePendingEffects(player, onDone));
      break;
    case 'mood':
      showMoodModal(player, effect, () => checkAndHandlePendingEffects(player, onDone));
      break;
    case 'effort':
      showEffortModal(player, effect, () => checkAndHandlePendingEffects(player, onDone));
      break;
    case 'copycat':
      showCopycatModal(player, effect, () => checkAndHandlePendingEffects(player, onDone));
      break;
    case 'trade_hand_for_card':
      showTradeModal(player, effect, () => checkAndHandlePendingEffects(player, onDone));
      break;
    case 'pick_final_scoring':
      showPickFinalScoringModal(player, effect, () => checkAndHandlePendingEffects(player, onDone));
      break;
    default:
      // 알 수 없는 타입 → 스킵
      checkAndHandlePendingEffects(player, onDone);
  }
}

// ── 개구쟁이: 필드에서 카드 1장 가져오기 ─────────────────────
function showMischiefModal(player, effect, onDone) {
  let chosen = null;
  const body = el('div');
  body.appendChild(el('p', { style: 'color:#f39c12;margin-bottom:8px;' },
    `${effect.card.name} [개구쟁이]: 필드에서 카드 1장을 손으로 가져옵니다.`));

  const row = el('div', { class: 'display-row' });
  game.display.forEach(c => {
    const card = renderCard(c, { compact: true });
    card.onclick = () => {
      chosen = c;
      row.querySelectorAll('.zoo-card').forEach(e => e.classList.remove('selected-card'));
      card.classList.add('selected-card');
    };
    row.appendChild(card);
  });
  if (!game.display.length) {
    body.appendChild(el('p', { style: 'color:#aaa;' }, '필드가 비어 있습니다.'));
  }
  body.appendChild(row);

  showModal('개구쟁이 — 필드 카드 선택', body, [
    btn('가져오기', () => {
      if (!chosen) { alert('카드를 선택하세요.'); return; }
      const i = game.display.indexOf(chosen);
      if (i >= 0) game.display.splice(i, 1);
      player.hand.push(chosen);
      // 필드 보충
      while (game.display.length < 6 && game.deck.length) game.display.push(game.deck.shift());
      closeModal(); rerender(); onDone();
    }),
    btn('건너뛰기', () => { closeModal(); rerender(); onDone(); }, 'btn btn-secondary'),
  ]);
}

// ── 내구/신중: 무료 건물 건설 모달 ──────────────────────────
function showFreeBuildModal(player, effect, onDone) {
  const isFreeSpecial = effect.type === 'free_special_build';
  const title = isFreeSpecial
    ? `${effect.card.name} [신중] — 대습지초원 무료 건설`
    : `${effect.card.name} [내구] — 매점/파빌리온 무료 건설`;

  const body = el('div');
  body.appendChild(el('p', { style: 'color:#f39c12;margin-bottom:8px;' },
    isFreeSpecial
      ? '지도에서 5칸을 선택해 대습지초원을 무료로 건설합니다.'
      : '지도에서 위치를 선택해 매점 또는 파빌리온을 무료로 건설합니다.'));

  if (!isFreeSpecial) {
    // 매점 vs 파빌리온 선택
    let buildKind = 'kiosk';
    const kindRow = el('div', { style: 'margin-bottom:8px;display:flex;gap:6px;' });
    ['kiosk', 'pavilion'].forEach(k => {
      const b = btn(k === 'kiosk' ? '매점' : '파빌리온', () => {
        buildKind = k;
        kindRow.querySelectorAll('button').forEach(b2 => b2.classList.remove('active'));
        b.classList.add('active');
      }, 'btn btn-sm');
      if (k === 'kiosk') b.classList.add('active');
      kindRow.appendChild(b);
    });
    body.appendChild(kindRow);
    body.appendChild(el('p', { style: 'font-size:11px;color:#aaa;' },
      '위치 선택 후 지도에서 클릭하세요. (현재 버전: 아무 빈 칸에 즉시 건설)'));

    showModal(title, body, [
      btn('빈 칸에 즉시 건설', () => {
        // 빈 칸 자동 선택 (첫 번째 빈 EMPTY 타일)
        const emptyTile = game.map.tiles.find(t =>
          t.type === 'empty' && !player.zooBuildings.has(`${t.q},${t.r}`));
        if (!emptyTile) { alert('건설 가능한 빈 칸이 없습니다.'); return; }
        try {
          // 무료 건설: 비용 선지급 후 건설
          player.money += 2; // 매점/파빌리온 size=1, costPerSpace=2
          Engine.resolveBuild(game, player, {
            side: player.actionSlots.find(s => s.actionType === 'build')?.side || 'I',
            buildings: [{ kind: buildKind, cells: [{ q: emptyTile.q, r: emptyTile.r }] }],
            xTokens: 0,
          });
        } catch {
          player.money -= 2; // 실패 시 환불
        }
        closeModal(); rerender(); onDone();
      }),
      btn('건너뛰기', () => { closeModal(); rerender(); onDone(); }, 'btn btn-secondary'),
    ]);
  } else {
    // largeBirdAviary: 5칸 자동 (연속된 빈 칸 5개)
    body.appendChild(el('p', { style: 'font-size:11px;color:#aaa;' },
      '빈 칸이 5개 이상 있으면 자동 배치됩니다.'));
    showModal(title, body, [
      btn('자동 배치', () => {
        const emptyTiles = game.map.tiles.filter(t =>
          t.type === 'empty' && !player.zooBuildings.has(`${t.q},${t.r}`));
        if (emptyTiles.length < 5) { alert('빈 칸이 5개 이상 필요합니다.'); closeModal(); onDone(); return; }
        const cells = emptyTiles.slice(0, 5);
        try {
          player.money += 10; // size=5, costPerSpace=2
          Engine.resolveBuild(game, player, {
            side: player.actionSlots.find(s => s.actionType === 'build')?.side || 'I',
            buildings: [{ kind: 'largeBirdAviary', cells }],
            xTokens: 0,
          });
        } catch { player.money -= 10; }
        closeModal(); rerender(); onDone();
      }),
      btn('건너뛰기', () => { closeModal(); rerender(); onDone(); }, 'btn btn-secondary'),
    ]);
  }
}

// ── 변덕: 도움 카드를 슬롯 1 또는 5에 배치 ──────────────────
function showMoodModal(player, effect, onDone) {
  const body = el('div');
  body.appendChild(el('p', { style: 'color:#f39c12;margin-bottom:8px;' },
    `${effect.card.name} [변덕]: 행동 카드를 슬롯 1 또는 5에 배치합니다.`));

  const actionNames = player.actionSlots.map((s, i) =>
    `${i + 1}번 슬롯 — ${s.actionType} (${s.side}면)`);

  const btnRow = el('div', { style: 'display:flex;flex-direction:column;gap:4px;' });
  [0, 4].forEach(slotIdx => {
    if (slotIdx < player.actionSlots.length) {
      btnRow.appendChild(btn(`슬롯 ${slotIdx + 1}에 배치: ${actionNames[slotIdx]}`, () => {
        // 현재 sponsors 카드를 해당 슬롯으로 이동
        const sponsorsIdx = player.actionSlots.findIndex(s => s.actionType === 'sponsors');
        if (sponsorsIdx >= 0) {
          const [moved] = player.actionSlots.splice(sponsorsIdx, 1);
          player.actionSlots.splice(slotIdx, 0, moved);
        }
        closeModal(); rerender(); onDone();
      }, 'btn btn-blue'));
    }
  });
  body.appendChild(btnRow);

  showModal('변덕 — 행동 카드 슬롯 배치', body, [
    btn('건너뛰기', () => { closeModal(); rerender(); onDone(); }, 'btn btn-secondary'),
  ]);
}

// ── 노력: 아무 행동 카드를 슬롯 1에 배치 ────────────────────
function showEffortModal(player, effect, onDone) {
  const body = el('div');
  body.appendChild(el('p', { style: 'color:#f39c12;margin-bottom:8px;' },
    `${effect.card.name} [노력]: 아무 행동 카드를 슬롯 1에 배치합니다.`));

  const btnRow = el('div', { style: 'display:flex;flex-direction:column;gap:4px;' });
  player.actionSlots.forEach((s, i) => {
    btnRow.appendChild(btn(`${s.actionType} (현재 슬롯 ${i + 1}) → 슬롯 1로`, () => {
      const [moved] = player.actionSlots.splice(i, 1);
      player.actionSlots.unshift(moved);
      closeModal(); rerender(); onDone();
    }, 'btn btn-blue'));
  });
  body.appendChild(btnRow);

  showModal('노력 — 행동 카드 슬롯 1 배치', body, [
    btn('건너뛰기', () => { closeModal(); rerender(); onDone(); }, 'btn btn-secondary'),
  ]);
}

// ── 깔짝: 매력도 1위 플레이어의 슬롯1~N 행동 중 1개 사용 ────
function showCopycatModal(player, effect, onDone) {
  const leader = effect.leader;
  const maxSlot = effect.maxSlot || 3;
  const body = el('div');
  body.appendChild(el('p', { style: 'color:#f39c12;margin-bottom:8px;' },
    `${effect.card.name} [깔짝]: ${leader.name}의 슬롯1~${maxSlot} 행동 중 1개 사용`));

  const availableSlots = leader.actionSlots.slice(0, maxSlot);
  const btnRow = el('div', { style: 'display:flex;flex-direction:column;gap:4px;' });
  availableSlots.forEach((s, i) => {
    btnRow.appendChild(btn(`${leader.name}의 슬롯 ${i + 1}: ${s.actionType} (${s.side}면)`, () => {
      closeModal();
      // 해당 액션을 현재 플레이어가 수행
      showActionModal(s.actionType, s.side, i + 1);
      onDone();
    }, 'btn btn-blue'));
  });
  body.appendChild(btnRow);

  showModal('깔짝 — 리더 행동 카드 사용', body, [
    btn('건너뛰기', () => { closeModal(); rerender(); onDone(); }, 'btn btn-secondary'),
  ]);
}

// ── 출랑: 손패 버리고 필드/덱에서 1장 획득 ──────────────────
function showTradeModal(player, effect, onDone) {
  const remaining = effect.remaining || 1;
  if (remaining <= 0 || player.hand.length === 0) { rerender(); onDone(); return; }

  let chosen = null;
  const body = el('div');
  body.appendChild(el('p', { style: 'color:#f39c12;margin-bottom:8px;' },
    `${effect.card.name} [출랑]: 손패 1장을 버리고 필드 또는 덱에서 1장을 가져옵니다. (남은 횟수: ${remaining})`));

  // 버릴 카드 선택
  body.appendChild(el('p', { style: 'font-size:11px;color:#aaa;' }, '버릴 카드:'));
  let discardTarget = null;
  const handRow = el('div', { class: 'hand-grid' });
  player.hand.forEach(c => {
    const card = renderCard(c, { compact: true });
    card.onclick = () => {
      discardTarget = c;
      handRow.querySelectorAll('.zoo-card').forEach(e => e.classList.remove('selected-card'));
      card.classList.add('selected-card');
    };
    handRow.appendChild(card);
  });
  body.appendChild(handRow);

  // 필드에서 가져올 카드 선택
  body.appendChild(el('p', { style: 'font-size:11px;color:#aaa;margin-top:8px;' }, '가져올 카드 (필드):'));
  let pickTarget = null;
  const dispRow = el('div', { class: 'display-row' });
  game.display.forEach(c => {
    const card = renderCard(c, { compact: true });
    card.onclick = () => {
      pickTarget = c;
      dispRow.querySelectorAll('.zoo-card').forEach(e => e.classList.remove('selected-card'));
      card.classList.add('selected-card');
    };
    dispRow.appendChild(card);
  });
  body.appendChild(dispRow);

  showModal('출랑 — 카드 교환', body, [
    btn('덱에서 뽑기', () => {
      if (!discardTarget) { alert('버릴 카드를 선택하세요.'); return; }
      const i = player.hand.indexOf(discardTarget);
      if (i >= 0) { game.discard.push(player.hand.splice(i, 1)[0]); }
      if (game.deck.length) player.hand.push(game.deck.shift());
      closeModal(); rerender();
      if (remaining - 1 > 0) {
        checkAndHandlePendingEffects(player, onDone);
      } else { onDone(); }
    }),
    btn('필드에서 가져오기', () => {
      if (!discardTarget || !pickTarget) { alert('버릴 카드와 가져올 카드를 모두 선택하세요.'); return; }
      const di = player.hand.indexOf(discardTarget);
      if (di >= 0) { game.discard.push(player.hand.splice(di, 1)[0]); }
      const pi = game.display.indexOf(pickTarget);
      if (pi >= 0) {
        player.hand.push(game.display.splice(pi, 1)[0]);
        while (game.display.length < 6 && game.deck.length) game.display.push(game.deck.shift());
      }
      closeModal(); rerender();
      if (remaining - 1 > 0) {
        checkAndHandlePendingEffects(player, onDone);
      } else { onDone(); }
    }, 'btn btn-blue'),
    btn('건너뛰기', () => { closeModal(); rerender(); onDone(); }, 'btn btn-secondary'),
  ]);
}

// ── 의젓: 최종점수카드 2장 중 1장 선택 ──────────────────────
function showPickFinalScoringModal(player, effect, onDone) {
  const options = effect.options || [];
  if (!options.length) { rerender(); onDone(); return; }

  let chosen = null;
  const body = el('div');
  body.appendChild(el('p', { style: 'color:#f39c12;margin-bottom:8px;' },
    `${effect.card.name} [의젓]: 최종점수 카드 ${options.length}장 중 1장을 선택합니다.`));

  const row = el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;' });
  options.forEach(fc => {
    const card = el('div', {
      class: 'zoo-card kind-finalscoring',
      style: 'cursor:pointer;padding:8px;min-width:120px;',
      onclick: () => {
        chosen = fc;
        row.querySelectorAll('.zoo-card').forEach(e => e.classList.remove('selected-card'));
        card.classList.add('selected-card');
      },
    }, [
      el('div', { class: 'card-name' }, fc.name),
      el('div', { style: 'font-size:10px;color:#aaa;margin-top:4px;' }, fc.metric || ''),
    ]);
    row.appendChild(card);
  });
  body.appendChild(row);

  showModal('의젓 — 최종점수 카드 선택', body, [
    btn('선택 확인', () => {
      if (!chosen) { alert('카드를 선택하세요.'); return; }
      player.finalScoringCards = player.finalScoringCards || [];
      player.finalScoringCards.push(chosen);
      // 선택 안 된 카드는 버림
      options.filter(o => o !== chosen).forEach(o => {
        if (game.finalScoringDeckRemaining) game.finalScoringDeckRemaining.push(o);
      });
      closeModal(); rerender(); onDone();
    }),
    btn('건너뛰기', () => { closeModal(); rerender(); onDone(); }, 'btn btn-secondary'),
  ]);
}

// ──────── SCORE VIEW ────────
function scoreView() {
  const scores = Engine.computeFinalScores(game);
  if (IS_ONLINE && !resultPublished && scores.length) {
    resultPublished = true;
    setTimeout(() => network.publishResult?.(scores.map(s=>s.playerId)), 0);
  }
  const wrap = el('div', { class:'scoreboard' });
  const soloScore = game.solo?.enabled ? scores[0] : null;
  wrap.appendChild(el('h2',{style:'text-align:center;margin-bottom:8px;'},
    game.solo?.enabled ? (soloScore?.victoryPoints>=0?'🎉 솔로 성공!':'🌙 솔로 도전 종료') : '🏆 최종 결과'));
  if (game.solo?.enabled) wrap.appendChild(el('p',{style:'text-align:center;color:#aaa;margin:0 0 20px;'},soloScore?.victoryPoints>=0?'최종 VP가 0 이상입니다. 솔로 목표를 달성했습니다.':'최종 VP가 0 미만입니다. 다음 판에는 시작 매력도나 전략을 조정해 보세요.'));

  scores.forEach((s,i) => {
    const row = el('div', { class:`score-row${i===0?' rank-1':''}` });
    const player = game.players.find(p => p.id === s.playerId);
    const cardDetails = player && player.finalScoringCards.length
      ? player.finalScoringCards.map(fc => `${fc.name}`).join(', ')
      : '없음';
    row.appendChild(el('div',{}, [
      el('div',{style:'font-size:16px;font-weight:700;'},game.solo?.enabled?s.name:`${i+1}위 ${s.name}`),
      el('div',{style:'font-size:12px;color:#aaa;'},
        `매력도 ${s.appeal} | 보존 ${s.conservation} (목표 ${s.target}) | 카드 보너스 ${s.cardBonus}점`),
      el('div',{style:'font-size:11px;color:#666;'},`최종점수 카드: ${cardDetails}`),
    ]));
    row.appendChild(el('div',{class:'score-vp'},`${s.victoryPoints > 0 ? '+' : ''}${s.victoryPoints}VP`));
    wrap.appendChild(row);
  });

  if (!IS_ONLINE) wrap.appendChild(el('div',{style:'text-align:center;margin-top:20px;'}, [
    btn('새 게임', () => { clearSoloGame(); game=null; render(setupView()); }),
  ]));
  return wrap;
}

function viewedPlayer() {
  return game.players.find(p=>p.id===ui.viewPlayerId) || currentPlayer(game);
}
