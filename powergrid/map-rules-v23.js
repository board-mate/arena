/*
 * BoardMate Power Grid - Map Rules Patch v23
 * USA: coal storage is always available at 8 Elektro per coal.
 * Korea: separate North/South resource markets, one market per player/round,
 *        North has no uranium, and each market is replenished separately.
 *
 * Loaded AFTER engine.js and ui.js. It intentionally patches the current
 * engine instead of replacing it, so the v22 physical map/topology data stays intact.
 */
(function (global) {
  'use strict';

  var PG = global.PowerGrid;
  if (!PG) throw new Error('PowerGrid engine.js must be loaded before map-rules-v23.js');

  var V23_REV = 'powergrid-map-v23-maprules';
  var RESOURCES = ['coal', 'oil', 'garbage', 'uranium'];
  var RES_LABEL = {
    coal: '⚫ 석탄',
    oil: '🛢️ 석유',
    garbage: '🗑️ 쓰레기',
    uranium: '☢️ 우라늄'
  };

  // ---------------------------------------------------------------------------
  // Korea physical resource-market tracks.
  // Arrays are ordered from the cheapest slot to the most expensive slot.
  // A market count N means the N most-expensive slots are occupied, matching
  // the core engine's count/ladder representation.
  // ---------------------------------------------------------------------------
  var KOREA_LADDERS = {
    north: {
      coal:    [1,1,2,2,3,3,4,4,5,6,7,8],
      oil:     [1,2,3,4,5,6,7,8],
      garbage: [1,2,3,4,5,6,7,8],
      uranium: []
    },
    south: {
      coal:    [1,2,3,4,5,5,6,6,7,7,8,8],
      oil:     [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8],
      garbage: [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8],
      uranium: [1,2,4,6,8,9,10,11,12,13,14,16]
    }
  };

  var KOREA_INITIAL = {
    north: { coal:12, oil:6,  garbage:2, uranium:0 },
    south: { coal:12, oil:12, garbage:4, uranium:2 }
  };

  // Korea-specific replenishment table: [Step 1, Step 2, Step 3].
  // North is replenished first when the common supply is short.
  var KOREA_REPLENISH = {
    2: {
      north:{coal:[1,2,1],oil:[1,1,1],garbage:[0,1,1],uranium:[0,0,0]},
      south:{coal:[2,2,2],oil:[1,1,3],garbage:[1,1,2],uranium:[1,1,1]}
    },
    3: {
      north:{coal:[2,2,1],oil:[1,1,1],garbage:[0,1,1],uranium:[0,0,0]},
      south:{coal:[2,3,2],oil:[1,2,3],garbage:[1,1,2],uranium:[1,1,1]}
    },
    4: {
      north:{coal:[2,3,2],oil:[1,1,2],garbage:[1,1,2],uranium:[0,0,0]},
      south:{coal:[3,3,2],oil:[2,3,3],garbage:[1,2,2],uranium:[1,2,2]}
    },
    5: {
      north:{coal:[2,3,2],oil:[1,2,2],garbage:[1,1,2],uranium:[0,0,0]},
      south:{coal:[3,4,3],oil:[3,3,4],garbage:[2,2,3],uranium:[2,3,2]}
    },
    6: {
      north:{coal:[3,4,3],oil:[2,2,3],garbage:[1,2,3],uranium:[0,0,0]},
      south:{coal:[4,5,3],oil:[3,4,4],garbage:[2,3,3],uranium:[2,3,3]}
    }
  };

  function clone(x) { return PG.clone ? PG.clone(x) : JSON.parse(JSON.stringify(x)); }
  function boardId(state) { return state && state.map && state.map.boardId || 'germany'; }
  function isKorea(state) { return boardId(state) === 'korea'; }
  function isUsa(state) { return boardId(state) === 'usa'; }
  function pushLog(state, msg) {
    if (!Array.isArray(state.log)) state.log = [];
    state.log.push(String(msg));
    if (state.log.length > 300) state.log.splice(0, state.log.length - 300);
  }
  function totalHeld(state, resource) {
    var total = 0;
    Object.keys(state.players || {}).forEach(function (s) {
      total += Number(state.players[s].stock && state.players[s].stock[resource] || 0);
    });
    return total;
  }
  function syncKoreaShadow(state) {
    if (!state.koreaResourceMarkets) return;
    state.resourceMarket = state.resourceMarket || {};
    RESOURCES.forEach(function (r) {
      state.resourceMarket[r] = Number(state.koreaResourceMarkets.north[r] || 0) + Number(state.koreaResourceMarkets.south[r] || 0);
    });
  }
  function ensureKoreaMarkets(state) {
    if (!isKorea(state)) return;
    if (!state.koreaResourceMarkets || !state.koreaResourceMarkets.north || !state.koreaResourceMarkets.south) {
      state.koreaResourceMarkets = clone(KOREA_INITIAL);
    }
    // North Korea never has uranium.
    state.koreaResourceMarkets.north.uranium = 0;
    syncKoreaShadow(state);
  }
  function marketChoice(state, seat) {
    var bySeat = state.resourceTurn && state.resourceTurn.koreaMarketBySeat;
    var v = bySeat && bySeat[String(seat)];
    return v === 'north' || v === 'south' ? v : null;
  }
  function priceForCount(ladder, filled) {
    if (!ladder || filled <= 0) return null;
    var idx = ladder.length - filled;
    return idx >= 0 && idx < ladder.length ? ladder[idx] : null;
  }
  function costForQty(ladder, filled, qty) {
    qty = Number(qty) || 0;
    if (qty < 1 || filled < qty) return null;
    var total = 0;
    var empty = ladder.length - filled;
    for (var i=0; i<qty; i++) {
      var price = ladder[empty + i];
      if (price == null) return null;
      total += price;
    }
    return total;
  }
  function storageRoom(player, resource, maxTry) {
    if (!player || !PG.canStoreResource) return 0;
    var room = 0;
    var limit = Math.max(0, Number(maxTry) || 0);
    while (room < limit && PG.canStoreResource(player.plants, player.stock, resource, room + 1)) room += 1;
    return room;
  }

  // ---------------------------------------------------------------------------
  // Public map metadata/revision
  // ---------------------------------------------------------------------------
  PG.MAP_DATA_REV = V23_REV;
  if (PG.BOARD_DEFS && PG.BOARD_DEFS.usa) {
    PG.BOARD_DEFS.usa.features = [
      '석탄 저장고: 플레이어 보유분과 연료 시장에 없는 모든 석탄은 저장고에 있습니다.',
      '석탄 저장고의 석탄은 시장 재고와 관계없이 언제나 1개당 8 Elektro에 구매할 수 있습니다.',
      '건설·발전·발전소 시장은 기본 규칙과 동일하게 진행합니다.'
    ];
    PG.BOARD_DEFS.usa.featureTitle = '미국 지도 특징';
  }
  if (PG.BOARD_DEFS && PG.BOARD_DEFS.korea) {
    PG.BOARD_DEFS.korea.features = [
      '남한과 북한의 연료 시장을 별도로 운영합니다. 북한 시장에는 우라늄이 없습니다.',
      '각 플레이어는 한 라운드에 남/북 중 한 시장만 선택하여 그 시장에서만 모든 연료를 구매합니다.',
      '두 시장은 서로 다른 보급량으로 별도 보충하며, 공동 공급이 부족하면 북한 시장을 먼저 보충합니다.',
      '전력망 건설은 남북으로 나뉘지 않습니다. 어느 지역의 도시든 기본 연결 규칙대로 건설합니다.'
    ];
    PG.BOARD_DEFS.korea.featureTitle = '한국 지도 특징';
  }

  // ---------------------------------------------------------------------------
  // New-game state patch
  // ---------------------------------------------------------------------------
  var originalNewGame = PG.newGame;
  PG.newGame = function (opts) {
    var s = originalNewGame(opts);
    s.map = s.map || {};
    s.map.dataRev = V23_REV;
    if (s.map.boardId === 'korea') {
      s.koreaResourceMarkets = clone(KOREA_INITIAL);
      syncKoreaShadow(s);
      pushLog(s, '한국 지도: 남한/북한 연료 시장을 분리했습니다. 북한 시장에는 우라늄이 없습니다.');
    }
    if (s.map.boardId === 'usa') {
      pushLog(s, '미국 지도: 시장 밖의 석탄은 저장고에 있으며, 저장고 석탄은 언제나 8 Elektro에 구매할 수 있습니다.');
    }
    return s;
  };

  // ---------------------------------------------------------------------------
  // Custom actions
  // ---------------------------------------------------------------------------
  function assertResourceTurn(state, seat) {
    if (state.phase !== 3 || PG.resourceTurnSeat(state) !== seat) {
      throw new Error('지금은 당신의 자원 구매 차례가 아닙니다.');
    }
  }

  function chooseKoreaMarket(state, seat, side) {
    assertResourceTurn(state, seat);
    ensureKoreaMarkets(state);
    if (side !== 'north' && side !== 'south') throw new Error('남한 또는 북한 시장을 선택하세요.');
    state.resourceTurn.koreaMarketBySeat = state.resourceTurn.koreaMarketBySeat || {};
    var key = String(seat);
    var old = state.resourceTurn.koreaMarketBySeat[key];
    if (old && old !== side) throw new Error('이번 라운드에는 이미 다른 연료 시장을 선택했습니다. 시장을 바꿀 수 없습니다.');
    state.resourceTurn.koreaMarketBySeat[key] = side;
    pushLog(state, state.players[seat].name + '님이 이번 라운드 연료 시장으로 ' + (side === 'north' ? '북한' : '남한') + '을 선택했습니다.');
  }

  function buyKoreaResource(state, seat, args) {
    assertResourceTurn(state, seat);
    ensureKoreaMarkets(state);
    var side = marketChoice(state, seat);
    if (!side) throw new Error('먼저 이번 라운드에 이용할 남한/북한 연료 시장을 선택하세요.');
    if (args.market && args.market !== side) throw new Error('이번 라운드에 선택한 연료 시장에서만 구매할 수 있습니다.');
    var resource = args.resource;
    var qty = Math.floor(Number(args.qty) || 0);
    if (RESOURCES.indexOf(resource) < 0 || qty < 1) throw new Error('구매할 자원과 수량을 확인하세요.');
    if (side === 'north' && resource === 'uranium') throw new Error('북한 연료 시장에는 우라늄이 없습니다.');

    var ladder = KOREA_LADDERS[side][resource];
    var market = state.koreaResourceMarkets[side];
    var filled = Number(market[resource] || 0);
    if (filled < qty) throw new Error((side === 'north' ? '북한' : '남한') + ' 시장에 자원이 부족합니다.');
    var p = state.players[seat];
    if (!PG.canStoreResource(p.plants, p.stock, resource, qty)) throw new Error('더 이상 저장할 공간이 없습니다.');
    var cost = costForQty(ladder, filled, qty);
    if (cost == null) throw new Error('해당 시장에서 구매할 수 없는 자원입니다.');
    if (p.money < cost) throw new Error('돈이 부족합니다. 필요: ' + cost + ' Elektro');

    p.money -= cost;
    market[resource] -= qty;
    p.stock[resource] += qty;
    syncKoreaShadow(state);
    pushLog(state, p.name + '님이 ' + (side === 'north' ? '북한' : '남한') + ' 시장에서 ' + resource + ' ' + qty + '개를 ' + cost + ' Elektro에 구매했습니다.');
  }

  function buyUsaResource(state, seat, args) {
    assertResourceTurn(state, seat);
    var resource = args.resource;
    var qty = Math.floor(Number(args.qty) || 0);
    if (RESOURCES.indexOf(resource) < 0 || qty < 1) throw new Error('구매할 자원과 수량을 확인하세요.');
    var p = state.players[seat];

    // Only coal has a second source in the USA map.
    if (resource === 'coal' && args.source === 'storage') {
      var available = PG.usaCoalStorageCount ? PG.usaCoalStorageCount(state) : Math.max(0, PG.RESOURCE_CAPACITY.coal - Number(state.resourceMarket.coal||0) - totalHeld(state,'coal'));
      if (available < qty) throw new Error('석탄 저장고에 석탄이 부족합니다.');
      if (!PG.canStoreResource(p.plants, p.stock, 'coal', qty)) throw new Error('더 이상 석탄을 저장할 공간이 없습니다.');
      var storageCost = 8 * qty;
      if (p.money < storageCost) throw new Error('돈이 부족합니다. 필요: ' + storageCost + ' Elektro');
      // No explicit storage counter is necessary: player stock goes up, so the
      // derived storage count (24 - market - players) goes down automatically.
      p.money -= storageCost;
      p.stock.coal += qty;
      pushLog(state, p.name + '님이 석탄 저장고에서 석탄 ' + qty + '개를 ' + storageCost + ' Elektro에 구매했습니다.');
      return;
    }

    // Market purchases are kept distinct from the storage, including coal.
    var filled = Number(state.resourceMarket[resource] || 0);
    if (filled < qty) throw new Error('연료 시장에 자원이 부족합니다.');
    if (!PG.canStoreResource(p.plants, p.stock, resource, qty)) throw new Error('더 이상 저장할 공간이 없습니다.');
    var ladder = PG.LADDERS[resource];
    var cost = costForQty(ladder, filled, qty);
    if (cost == null) throw new Error('시장 가격을 계산할 수 없습니다.');
    if (p.money < cost) throw new Error('돈이 부족합니다. 필요: ' + cost + ' Elektro');
    p.money -= cost;
    state.resourceMarket[resource] -= qty;
    p.stock[resource] += qty;
    pushLog(state, p.name + '님이 연료 시장에서 ' + resource + ' ' + qty + '개를 ' + cost + ' Elektro에 구매했습니다.');
  }

  function addToKoreaMarket(state, side, resource, requested, bank) {
    if (requested <= 0 || bank <= 0) return 0;
    var ladder = KOREA_LADDERS[side][resource];
    var cap = ladder.length;
    if (cap <= 0) return 0;
    var current = Number(state.koreaResourceMarkets[side][resource] || 0);
    var add = Math.max(0, Math.min(requested, cap - current, bank));
    state.koreaResourceMarkets[side][resource] = current + add;
    return add;
  }

  function refillKorea(state, stepNumber) {
    ensureKoreaMarkets(state);
    var table = KOREA_REPLENISH[state.numPlayers];
    if (!table) throw new Error('한국 지도 보급표를 찾을 수 없습니다.');
    var stepIdx = Math.max(0, Math.min(2, Number(stepNumber || state.step || 1) - 1));

    RESOURCES.forEach(function (resource) {
      var currentTotal = Number(state.koreaResourceMarkets.north[resource]||0) + Number(state.koreaResourceMarkets.south[resource]||0);
      var bank = Math.max(0, Number(PG.RESOURCE_CAPACITY[resource]||0) - currentTotal - totalHeld(state, resource));
      var wantNorth = Number(table.north[resource][stepIdx] || 0);
      var wantSouth = Number(table.south[resource][stepIdx] || 0);
      if (resource === 'uranium' && state.flags && state.flags.uraniumResupplyStopped) {
        wantNorth = 0; wantSouth = 0;
      }
      var addedNorth = addToKoreaMarket(state, 'north', resource, wantNorth, bank);
      bank -= addedNorth;
      var addedSouth = addToKoreaMarket(state, 'south', resource, wantSouth, bank);
      bank -= addedSouth;
      // Explicit invariant: North Korea never contains uranium.
      if (resource === 'uranium') state.koreaResourceMarkets.north.uranium = 0;
    });
    syncKoreaShadow(state);
    pushLog(state, '한국 지도: 남/북 연료 시장을 각각 보충했습니다. 자원 부족 시 북한 시장을 먼저 보충했습니다.');
    return state;
  }

  var originalApplyAction = PG.applyAction;
  PG.applyAction = function (state, action) {
    action = action || {};
    var b = boardId(state);

    if (b === 'korea' && action.type === 'chooseKoreaMarket') {
      var k1 = clone(state);
      chooseKoreaMarket(k1, action.seat, action.args && action.args.market);
      k1.rulesRev = PG.RULES_REV || k1.rulesRev;
      PG.syncDerivedTurn(k1);
      return k1;
    }
    if (b === 'korea' && action.type === 'buyResource') {
      var k2 = clone(state);
      buyKoreaResource(k2, action.seat, action.args || {});
      k2.rulesRev = PG.RULES_REV || k2.rulesRev;
      PG.syncDerivedTurn(k2);
      return k2;
    }
    if (b === 'usa' && action.type === 'buyResource') {
      var u = clone(state);
      buyUsaResource(u, action.seat, action.args || {});
      u.rulesRev = PG.RULES_REV || u.rulesRev;
      PG.syncDerivedTurn(u);
      return u;
    }

    var beforeRound = state.round;
    var beforePhase = state.phase;
    var beforeStep = state.step;
    var next = originalApplyAction(state, action);

    // The core engine has just run its generic refill into resourceMarket.
    // For Korea, throw that shadow result away and refill both actual markets
    // with the Korea table, using the step that applied during Bureaucracy.
    if (b === 'korea') {
      ensureKoreaMarkets(next);
      if (beforePhase === 5 && action.type === 'powerCities' && !next.gameOver && next.round === beforeRound + 1) {
        refillKorea(next, (beforeStep < 3 && next.step === 3) ? 2 : beforeStep);
      } else {
        syncKoreaShadow(next);
      }
    }
    return next;
  };

  // ---------------------------------------------------------------------------
  // UI patch (replace only the resource-market card; retain current v22 UI/map)
  // ---------------------------------------------------------------------------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function btn(action, label, attrs, disabled) {
    var s = '<button class="pg-btn small" data-maprules-action="' + esc(action) + '"';
    Object.keys(attrs || {}).forEach(function (k) { s += ' data-' + k + '="' + esc(attrs[k]) + '"'; });
    if (disabled) s += ' disabled';
    return s + '>' + label + '</button>';
  }
  function marketBoxHtml(resource, filled, ladder, canBuy, p, attrs) {
    var price = priceForCount(ladder, filled);
    var html = '<div class="pg-res-box">';
    html += '<div class="name">' + RES_LABEL[resource] + '</div>';
    html += '<div class="amt">' + filled + '</div>';
    html += '<div class="price">' + (price == null ? '품절' : price + ' Elektro') + '</div>';
    if (canBuy && p && filled > 0) {
      var room = storageRoom(p, resource, filled);
      if (room > 0) {
        var c1 = costForQty(ladder, filled, 1);
        var c3 = room >= 3 ? costForQty(ladder, filled, 3) : null;
        html += '<div style="margin-top:6px;display:flex;gap:4px;justify-content:center">';
        html += btn('buyResource', '+1', Object.assign({resource:resource,qty:1}, attrs||{}), c1 == null || p.money < c1);
        if (c3 != null) html += btn('buyResource', '+3', Object.assign({resource:resource,qty:3}, attrs||{}), p.money < c3);
        html += '</div>';
      } else {
        html += '<div style="margin-top:6px;font-size:11px;color:var(--muted)">저장 공간 가득참</div>';
      }
    }
    html += '</div>';
    return html;
  }

  function renderUsaMarket(state, mySeat, canBuy) {
    var p = mySeat != null ? state.players[mySeat] : null;
    var html = '<div class="pg-resource-grid">';
    RESOURCES.forEach(function (r) {
      html += marketBoxHtml(r, Number(state.resourceMarket[r]||0), PG.LADDERS[r], canBuy, p, r === 'coal' ? {source:'market'} : {});
    });
    html += '</div>';

    var stored = PG.usaCoalStorageCount ? PG.usaCoalStorageCount(state) : Math.max(0, PG.RESOURCE_CAPACITY.coal - Number(state.resourceMarket.coal||0) - totalHeld(state,'coal'));
    html += '<div class="pg-card" style="margin-top:10px;padding:12px;border:1px solid #b98b43;background:rgba(255,248,225,.75)">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b>🇺🇸 석탄 저장고</b><div style="font-size:12px;color:var(--muted);margin-top:3px">시장 밖·플레이어 보유 밖의 석탄</div></div><div><b>' + stored + '개</b> · <b>8 Elektro/개</b></div></div>';
    if (canBuy && p && stored > 0) {
      var room = storageRoom(p, 'coal', stored);
      html += '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">';
      html += btn('buyResource', '저장고 +1 (8)', {resource:'coal',qty:1,source:'storage'}, room < 1 || p.money < 8);
      if (room >= 3 && stored >= 3) html += btn('buyResource', '저장고 +3 (24)', {resource:'coal',qty:3,source:'storage'}, p.money < 24);
      html += '</div>';
    }
    html += '</div>';
    html += '<div class="pg-setup-warning" style="margin-top:8px">🇺🇸 <b>석탄 저장고는 시장의 석탄이 남아 있어도 이용할 수 있습니다.</b> 저장고 석탄은 언제나 1개당 8 Elektro입니다.</div>';
    return html;
  }

  function renderKoreaSide(state, side, selected, canBuy, p) {
    var name = side === 'north' ? '🇰🇵 북한 연료 시장' : '🇰🇷 남한 연료 시장';
    var market = state.koreaResourceMarkets[side];
    var enabled = canBuy && selected === side;
    var html = '<div class="pg-card" style="padding:12px;margin:0">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>' + name + '</b>' + (selected === side ? '<span class="pg-pill">이번 라운드 선택</span>' : '') + '</div>';
    html += '<div class="pg-resource-grid" style="margin-top:8px">';
    RESOURCES.forEach(function (r) {
      if (side === 'north' && r === 'uranium') {
        html += '<div class="pg-res-box"><div class="name">' + RES_LABEL[r] + '</div><div class="amt">—</div><div class="price">없음</div><div style="margin-top:6px;font-size:11px;color:var(--muted)">북한 시장 취급 안 함</div></div>';
      } else {
        html += marketBoxHtml(r, Number(market[r]||0), KOREA_LADDERS[side][r], enabled, p, {market:side});
      }
    });
    html += '</div></div>';
    return html;
  }

  function renderKoreaMarket(state, mySeat, canBuy) {
    ensureKoreaMarkets(state);
    var p = mySeat != null ? state.players[mySeat] : null;
    var selected = mySeat != null ? marketChoice(state, mySeat) : null;
    var html = '';
    if (canBuy) {
      if (!selected) {
        html += '<div class="pg-setup-warning" style="margin-bottom:10px"><b>이번 라운드에 사용할 연료 시장을 먼저 선택하세요.</b> 선택한 뒤에는 이번 라운드 동안 다른 시장으로 바꿀 수 없습니다.<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">';
        html += btn('chooseKoreaMarket', '🇰🇵 북한 시장 선택', {market:'north'}, false);
        html += btn('chooseKoreaMarket', '🇰🇷 남한 시장 선택', {market:'south'}, false);
        html += '</div></div>';
      } else {
        html += '<div class="pg-setup-warning" style="margin-bottom:10px">이번 라운드 선택: <b>' + (selected === 'north' ? '🇰🇵 북한 시장' : '🇰🇷 남한 시장') + '</b> · 다른 시장에서는 구매할 수 없습니다.</div>';
      }
    }
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px">';
    html += renderKoreaSide(state, 'north', selected, canBuy, p);
    html += renderKoreaSide(state, 'south', selected, canBuy, p);
    html += '</div>';
    html += '<div class="pg-setup-warning" style="margin-top:8px">🇰🇷 남/북 시장은 <b>별도로 보충</b>됩니다. 공동 공급이 부족하면 <b>북한 시장을 먼저</b> 보충합니다. 전력망 건설에는 남북 제한이 없습니다.</div>';
    return html;
  }

  function bindCustomResourceActions(container, ctx) {
    container.querySelectorAll('[data-maprules-action]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (el.disabled) return;
        var type = el.getAttribute('data-maprules-action');
        var acting = PG.actingSeats(ctx.state);
        var seat = ctx.mySeat != null ? ctx.mySeat : acting[0];
        var args = {};
        if (type === 'chooseKoreaMarket') {
          args.market = el.getAttribute('data-market');
        } else if (type === 'buyResource') {
          args.resource = el.getAttribute('data-resource');
          args.qty = Number(el.getAttribute('data-qty'));
          var market = el.getAttribute('data-market');
          var source = el.getAttribute('data-source');
          if (market) args.market = market;
          if (source) args.source = source;
        }
        ctx.onAction({ type:type, seat:seat, args:args });
      });
    });
  }

  if (global.PowerGridUI && typeof global.PowerGridUI.render === 'function') {
    var oldRender = global.PowerGridUI.render;
    global.PowerGridUI.render = function (container, ctx) {
      oldRender(container, ctx);
      var state = ctx.state;
      var b = boardId(state);
      if (b !== 'usa' && b !== 'korea') return;

      var acting = PG.actingSeats(state);
      var canBuy = (ctx.allowAnySeat || ctx.mySeat != null) && state.phase === 3 && acting.indexOf(ctx.mySeat) !== -1;
      var cards = Array.prototype.slice.call(container.querySelectorAll('.pg-card'));
      var resourceCard = cards.find(function (card) {
        var h = card.querySelector(':scope > h3');
        return h && h.textContent.trim() === '자원 시장';
      });
      if (resourceCard) {
        resourceCard.innerHTML = '<h3>자원 시장</h3>' + (b === 'usa' ? renderUsaMarket(state, ctx.mySeat, canBuy) : renderKoreaMarket(state, ctx.mySeat, canBuy));
      }

      // Clarify the Korea phase-3 context without touching turn/end controls.
      if (b === 'korea' && state.phase === 3) {
        var contextCard = cards.find(function (card) {
          var h = card.querySelector(':scope > h3');
          return h && h.textContent.indexOf('3단계 · 자원 구매') === 0;
        });
        if (contextCard && canBuy) {
          var firstP = contextCard.querySelector('p');
          var side = marketChoice(state, ctx.mySeat);
          if (firstP) firstP.innerHTML = side
            ? '이번 라운드는 <b>' + (side === 'north' ? '북한' : '남한') + ' 연료 시장</b>에서만 구매할 수 있습니다.'
            : '<b>먼저 남한 또는 북한 연료 시장을 선택하세요.</b> 연료를 사지 않을 경우 바로 구매 완료를 눌러도 됩니다.';
        }
      }
      bindCustomResourceActions(container, ctx);
    };
  }

  // Expose rule data/helpers for diagnostics and automated checks.
  PG.MAP_RULES_V23 = {
    revision: V23_REV,
    koreaLadders: KOREA_LADDERS,
    koreaInitial: KOREA_INITIAL,
    koreaReplenish: KOREA_REPLENISH,
    ensureKoreaMarkets: ensureKoreaMarkets,
    syncKoreaShadow: syncKoreaShadow,
    refillKorea: refillKorea,
    marketChoice: marketChoice,
    costForQty: costForQty
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
