/*
 * BoardMate Power Grid - Map Rules Patch v30
 * Supported maps: Germany + USA only.
 * USA: coal storage can be purchased at 8 Elektro per coal even while
 *      coal remains in the normal market.
 *
 * Loaded AFTER engine.js and ui.js. It patches only the USA-specific
 * resource behavior and intentionally contains no removed-map rules.
 */
(function (global) {
  'use strict';

  var PG = global.PowerGrid;
  if (!PG) throw new Error('PowerGrid engine.js must be loaded before map-rules-v30.js');

  var V30_REV = 'powergrid-map-v30-maprules';
  var RESOURCES = ['coal', 'oil', 'garbage', 'uranium'];
  var RES_LABEL = { coal:'⚫ 석탄', oil:'🛢️ 석유', garbage:'🗑️ 쓰레기', uranium:'☢️ 우라늄' };

  function clone(x) { return PG.clone ? PG.clone(x) : JSON.parse(JSON.stringify(x)); }
  function boardId(state) { return state && state.map && state.map.boardId || 'germany'; }
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
    for (var i = 0; i < qty; i++) {
      var price = ladder[empty + i];
      if (price == null) return null;
      total += price;
    }
    return total;
  }
  function storageRoom(player, resource, maxTry) {
    if (!player || !PG.canStoreResource) return 0;
    var room = 0, limit = Math.max(0, Number(maxTry) || 0);
    while (room < limit && PG.canStoreResource(player.plants, player.stock, resource, room + 1)) room += 1;
    return room;
  }

  PG.MAP_DATA_REV = V30_REV;

  if (PG.BOARD_DEFS && PG.BOARD_DEFS.germany) {
    PG.BOARD_DEFS.germany.features = [
      '독일 지도는 42개 도시 · 83개 연결 데이터를 사용합니다.',
      '6개 권역 중 플레이 인원에 따라 서로 연결된 3~5개 권역만 사용합니다.',
      '39번 발전소가 구매되면 이후 정리 단계의 우라늄 보충이 중단됩니다.',
      '경매 · 자원 구매 · 도시 건설 · 전력 공급은 공통 Power Grid 엔진으로 진행합니다.'
    ];
  }
  if (PG.BOARD_DEFS && PG.BOARD_DEFS.usa) {
    PG.BOARD_DEFS.usa.features = [
      '미국 지도는 42개 도시 · 87개 연결 데이터를 사용합니다.',
      '석탄 저장고는 일반 시장의 석탄이 남아 있어도 이용할 수 있으며, 1개당 8 Elektro입니다.',
      '발전에 사용된 석탄은 저장고로 이동하고, 정리 단계에서 저장고의 석탄이 시장으로 보충됩니다.',
      '경매 · 자원 구매 · 도시 건설 · 전력 공급은 공통 Power Grid 엔진으로 진행합니다.'
    ];
    PG.BOARD_DEFS.usa.featureTitle = '미국 지도 특징';
  }

  // Keep the latest map revision in new game state.
  var originalNewGame = PG.newGame;
  PG.newGame = function (opts) {
    var s = originalNewGame(opts);
    s.map = s.map || {};
    s.map.dataRev = V30_REV;
    if (s.map.boardId === 'usa') {
      pushLog(s, '미국 지도: 시장 밖의 석탄 저장고를 1개당 8 Elektro에 이용할 수 있습니다.');
    }
    return s;
  };

  function assertResourceTurn(state, seat) {
    if (state.phase !== 3 || PG.resourceTurnSeat(state) !== seat) {
      throw new Error('지금은 당신의 자원 구매 차례가 아닙니다.');
    }
  }

  function buyUsaResource(state, seat, args) {
    assertResourceTurn(state, seat);
    var resource = args.resource;
    var qty = Math.floor(Number(args.qty) || 0);
    if (RESOURCES.indexOf(resource) < 0 || qty < 1) throw new Error('구매할 자원과 수량을 확인하세요.');
    var p = state.players[seat];

    if (resource === 'coal' && args.source === 'storage') {
      var available = PG.usaCoalStorageCount ? PG.usaCoalStorageCount(state) : Math.max(0,
        PG.RESOURCE_CAPACITY.coal - Number(state.resourceMarket.coal || 0) - totalHeld(state, 'coal'));
      if (available < qty) throw new Error('석탄 저장고에 석탄이 부족합니다.');
      if (!PG.canStoreResource(p.plants, p.stock, 'coal', qty)) throw new Error('더 이상 석탄을 저장할 공간이 없습니다.');
      var storageCost = 8 * qty;
      if (p.money < storageCost) throw new Error('돈이 부족합니다. 필요: ' + storageCost + ' Elektro');
      p.money -= storageCost;
      p.stock.coal += qty;
      pushLog(state, p.name + '님이 석탄 저장고에서 석탄 ' + qty + '개를 ' + storageCost + ' Elektro에 구매했습니다.');
      return;
    }

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
    pushLog(state, p.name + '님이 ' + resource + ' ' + qty + '개를 구매했습니다.');
  }

  var originalApplyAction = PG.applyAction;
  PG.applyAction = function (state, action) {
    var b = boardId(state);
    if (b === 'usa' && action.type === 'buyResource' && action.args && action.args.source === 'storage') {
      var nextUsa = clone(state);
      buyUsaResource(nextUsa, action.seat, action.args || {});
      nextUsa.rulesRev = PG.RULES_REV || nextUsa.rulesRev;
      PG.syncDerivedTurn(nextUsa);
      return nextUsa;
    }
    return originalApplyAction(state, action);
  };

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
  function marketBoxHtml(resource, filled, ladder, canBuy, p) {
    var price = priceForCount(ladder, filled);
    var html = '<div class="pg-res-box">';
    html += '<div class="name">' + RES_LABEL[resource] + '</div>';
    html += '<div class="amt">' + filled + '</div>';
    html += '<div class="price">' + (price == null ? '품절' : price + ' Elektro') + '</div>';
    if (canBuy && p && filled > 0) {
      var room = storageRoom(p, resource, filled);
      if (room > 0) {
        var c1 = costForQty(ladder, filled, 1);
        html += '<div style="margin-top:6px;display:flex;gap:4px;justify-content:center">';
        html += btn('buyResource', '+1', {resource:resource,qty:1,source:'market'}, c1 == null || p.money < c1);
        if (room >= 3) {
          var c3 = costForQty(ladder, filled, 3);
          if (c3 != null) html += btn('buyResource', '+3', {resource:resource,qty:3,source:'market'}, p.money < c3);
        }
        html += '</div>';
      }
    }
    html += '</div>';
    return html;
  }

  function renderUsaMarket(state, mySeat, canBuy) {
    var p = mySeat != null ? state.players[mySeat] : null;
    var html = '<div class="pg-resource-grid">';
    RESOURCES.forEach(function (r) {
      html += marketBoxHtml(r, Number(state.resourceMarket[r] || 0), PG.LADDERS[r], canBuy, p);
    });
    html += '</div>';

    var stored = PG.usaCoalStorageCount ? PG.usaCoalStorageCount(state) : Math.max(0,
      PG.RESOURCE_CAPACITY.coal - Number(state.resourceMarket.coal || 0) - totalHeld(state, 'coal'));
    html += '<div class="pg-card" style="margin-top:10px;padding:12px;border:1px solid #b98b43;background:rgba(255,248,225,.75)">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b>🇺🇸 석탄 저장고</b><div style="font-size:12px;color:var(--muted);margin-top:3px">시장 밖의 석탄</div></div><div><b>' + stored + '개</b> · <b>8 Elektro/개</b></div></div>';
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

  function bindCustomResourceActions(container, ctx) {
    container.querySelectorAll('[data-maprules-action]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (el.disabled) return;
        var type = el.getAttribute('data-maprules-action');
        var acting = PG.actingSeats(ctx.state);
        var seat = ctx.mySeat != null ? ctx.mySeat : acting[0];
        var args = {
          resource: el.getAttribute('data-resource'),
          qty: Number(el.getAttribute('data-qty')) || 0,
          source: el.getAttribute('data-source') || 'market'
        };
        ctx.onAction({type:type, seat:seat, args:args});
      });
    });
  }

  if (global.PowerGridUI && typeof global.PowerGridUI.render === 'function') {
    var oldRender = global.PowerGridUI.render;
    global.PowerGridUI.render = function (container, ctx) {
      oldRender(container, ctx);
      var state = ctx.state;
      if (boardId(state) !== 'usa') return;
      var acting = PG.actingSeats(state);
      var canBuy = (ctx.allowAnySeat || ctx.mySeat != null) && state.phase === 3 && acting.indexOf(ctx.mySeat) !== -1;
      var cards = Array.prototype.slice.call(container.querySelectorAll('.pg-card'));
      var resourceCard = cards.find(function (card) {
        var h = card.querySelector(':scope > h3');
        return h && h.textContent.trim() === '자원 시장';
      });
      if (resourceCard) {
        resourceCard.innerHTML = '<h3>자원 시장</h3>' + renderUsaMarket(state, ctx.mySeat, canBuy);
      }
      bindCustomResourceActions(container, ctx);
    };
  }

  PG.MAP_RULES_V30 = { revision:V30_REV, usaCoalStorageRule:true, costForQty:costForQty };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
