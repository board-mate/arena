/*!
 * BoardMate Power Grid Germany - Multiplayer UI Layer
 * 순수 DOM/SVG 렌더링. React 등 프레임워크 없이 동작.
 * window.PowerGrid (engine.js) 를 사용한다.
 */
(function (global) {
  'use strict';
  var PG = global.PowerGrid;

  var SEAT_COLORS = ['#f5a623', '#4f8cff', '#3ddc84', '#ff5c5c', '#c084fc', '#38bdf8'];

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function plantLabel(num) {
    if (num === 'STEP3') return 'STEP3';
    var d = PG.PLANT_DEFS[num];
    if (!d) return String(num);
    var typeLabel = { oil: '석유', coal: '석탄', hybrid: '석탄/석유', garbage: '쓰레기', uranium: '우라늄', eco: '친환경' }[d.type];
    var needTxt = d.need === 0 ? '자원 불필요' : (typeLabel + ' ' + d.need + '개');
    return needTxt + ' → 도시 ' + d.cities + '개';
  }

  function phaseLabel(phase) {
    return { 1: '순서 결정', 2: '발전소 경매', 3: '자원 구매', 4: '도시 건설', 5: '관료 (정산)' }[phase] || phase;
  }

  function resLabel(r) { return { coal: '석탄', oil: '석유', garbage: '쓰레기', uranium: '우라늄' }[r]; }

  // ------------------------------------------------------------
  // 지도 SVG
  // ------------------------------------------------------------
  function renderMap(state, mySeat, allowAct, actingSeats) {
    var G=PG.GERMANY;
    var selected={};
    (state.map.cityNames||[]).forEach(function(id){selected[id]=true;});
    var selectedRegions=(state.map.regionIds||[]);
    var canBuild=state.phase===4 && actingSeats[0]===mySeat && allowAct;
    var myMoney=(canBuild && state.players[mySeat]) ? state.players[mySeat].money : -1;

    var regionChips=selectedRegions.map(function(rid){
      var r=G.REGIONS[rid];
      return '<span class="pg-region-chip" style="--region:'+esc(r.color)+'">'+esc(r.shortName)+'</span>';
    }).join('');

    var markers='';
    G.CITIES.forEach(function(city){
      if(!selected[city.id])return;
      var owners=state.cityOwners[city.id]||[];
      var cost=canBuild ? PG.computeBuildCost(state,mySeat,city.id) : null;
      var affordable=cost!=null && cost<=myMoney;
      var clickable=canBuild && affordable;
      var ownerDots=owners.map(function(seat){return '<i style="background:'+SEAT_COLORS[seat%6]+'"></i>';}).join('');
      var title=city.name+(cost!=null?' · '+cost+'€':'');
      markers+='<button class="pg-germany-city-marker'+(clickable?' can-build':'')+(owners.length?' occupied':'')+'" '+
        'style="left:'+(city.x/G.BOARD_WIDTH*100).toFixed(3)+'%;top:'+(city.y/G.BOARD_HEIGHT*100).toFixed(3)+'%" '+
        'title="'+esc(title)+'" aria-label="'+esc(title)+'" '+
        (clickable?'data-action="buildCity" data-city="'+esc(city.id)+'"':'disabled')+'>'+
        '<span class="pg-city-marker-core"></span><span class="pg-city-marker-owners">'+ownerDots+'</span>'+
        (cost!=null?'<b>'+cost+'</b>':'')+'</button>';
    });

    var cityGroups='';
    selectedRegions.forEach(function(rid){
      var region=G.REGIONS[rid];
      var buttons=G.CITIES.filter(function(c){return c.region===rid;}).map(function(city){
        var owners=state.cityOwners[city.id]||[];
        var cost=canBuild ? PG.computeBuildCost(state,mySeat,city.id) : null;
        var affordable=cost!=null && cost<=myMoney;
        var clickable=canBuild && affordable;
        var dots=owners.map(function(seat){return '<i class="pg-city-owner-dot" style="background:'+SEAT_COLORS[seat%6]+'"></i>';}).join('');
        var suffix=cost!=null ? '<span class="pg-city-cost">'+cost+'€</span>' : (owners.indexOf(mySeat)!==-1?'<span class="pg-city-status">내 도시</span>':'');
        return '<button class="pg-city-choice'+(clickable?' can-build':'')+'" '+(clickable?'data-action="buildCity" data-city="'+esc(city.id)+'"':'disabled')+'>'+dots+'<span>'+esc(city.name)+'</span>'+suffix+'</button>';
      }).join('');
      cityGroups+='<section class="pg-city-group"><h4><i style="background:'+esc(region.color)+'"></i>'+esc(region.name)+'</h4><div class="pg-city-choice-grid">'+buttons+'</div></section>';
    });

    return '<div class="pg-real-map pg-germany-map"><div class="pg-real-map-head"><div><b>독일 보드</b><div class="pg-region-chips">'+regionChips+'</div></div><span class="pg-tag">42도시 · 83연결 자동 계산</span></div>'+
      '<div class="pg-germany-board"><img src="'+esc(PG.BOARD_DEFS.germany.image)+'" alt="Power Grid Germany board" loading="eager">'+markers+'</div>'+
      '<div class="pg-map-note">선택 지역 안에서만 최단 연결비를 계산합니다. 다른 플레이어의 도시를 경유하는 경로도 연결선 비용 계산에는 사용할 수 있습니다.</div>'+
      '<details class="pg-city-picker"'+(canBuild?' open':'')+'><summary>도시 목록'+(canBuild?' · 건설 가능 비용 보기':'')+'</summary>'+cityGroups+'</details></div>';
  }

  // ------------------------------------------------------------
  // 플레이어 패널
  // ------------------------------------------------------------
  function renderPlayers(state, actingSeats) {
    var html = '<div class="pg-players">';
    state.order.forEach(function (seat) {
      var p = state.players[seat];
      var active = actingSeats.indexOf(seat) !== -1;
      html += '<div class="pg-player-row' + (active ? ' active' : '') + '">';
      html += '<span class="pg-swatch" style="background:' + SEAT_COLORS[seat % 6] + '"></span>';
      html += '<div><div class="pg-player-name">' + esc(p.name) + '</div>';
      html += '<div class="pg-player-meta">💰' + p.money + '€ · 🏙️' + p.cities.length + ' · 🔌' + (p.plants.length ? p.plants.join(',') : '-') + '</div>';
      html += '<div class="pg-stock"><span>석탄 ' + p.stock.coal + '</span><span>석유 ' + p.stock.oil + '</span><span>쓰레기 ' + p.stock.garbage + '</span><span>우라늄 ' + p.stock.uranium + '</span></div>';
      html += '</div>';
      html += '<div>' + (active ? '▶️' : '') + '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // ------------------------------------------------------------
  // 발전소 시장
  // ------------------------------------------------------------
  function renderPlantMarket(state, mySeat, canOffer) {
    var mkt = state.plantMarket;
    var html = '<div class="pg-market-grid">';
    mkt.current.forEach(function (n) {
      var clickable = canOffer;
      html += '<div class="pg-plant-card' + (n === mkt.discounted ? ' discounted' : '') + '"' +
        (clickable ? ' data-action="offerPlant" data-plant="' + n + '" style="cursor:pointer"' : '') + '>';
      html += '<img class="pg-plant-img" src="./powergrid/assets/plants/plant_' + String(n).padStart(2, '0') + '.webp" alt="' + n + '번 발전소">';
      html += '<div class="info">' + (n === mkt.discounted ? '💲 ' : '') + plantLabel(n) + '</div></div>';
    });
    mkt.future.forEach(function (n) {
      html += '<div class="pg-plant-card future"><img class="pg-plant-img" src="./powergrid/assets/plants/plant_' + String(n).padStart(2, '0') + '.webp" alt="' + n + '번 발전소"><div class="info">' + plantLabel(n) + '</div></div>';
    });
    html += '</div>';
    return html;
  }

  // ------------------------------------------------------------
  // 자원 시장
  // ------------------------------------------------------------
  function renderResourceMarket(state, mySeat, canBuy) {
    var p = mySeat != null ? state.players[mySeat] : null;
    var html = '<div class="pg-resource-grid">';
    ['coal', 'oil', 'garbage', 'uranium'].forEach(function (r) {
      var filled = state.resourceMarket[r];
      var cap = PG.RESOURCE_CAPACITY[r];
      var emptyCount = cap - filled;
      var price = filled > 0 ? PG.LADDERS[r][emptyCount] : null;
      html += '<div class="pg-res-box">';
      html += '<div class="name">' + resLabel(r) + '</div>';
      html += '<div class="amt">' + filled + '</div>';
      html += '<div class="price">' + (price != null ? price + '€' : '품절') + '</div>';
      if (canBuy && filled > 0 && p) {
        var storageCap = PG.plantStorageCap(p.plants, r);
        var held = (r === 'coal' || r === 'oil') ? (p.stock.coal + p.stock.oil) : p.stock[r];
        var room = storageCap - held;
        if (room > 0) {
          var canAfford1 = p.money >= price;
          html += '<div style="margin-top:6px;display:flex;gap:4px;justify-content:center">';
          html += '<button class="pg-btn small" data-action="buyResource" data-resource="' + r + '" data-qty="1"' + (canAfford1 ? '' : ' disabled') + '>+1</button>';
          if (room >= 3) {
            html += '<button class="pg-btn small" data-action="buyResource" data-resource="' + r + '" data-qty="3"' + (canAfford1 ? '' : ' disabled') + '>+3</button>';
          }
          html += '</div>';
        } else {
          html += '<div style="margin-top:6px;font-size:11px;color:var(--muted)">저장 공간 가득참</div>';
        }
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // ------------------------------------------------------------
  // 컨텍스트(현재 단계별) 액션 패널
  // ------------------------------------------------------------
  function renderContextPanel(state, mySeat, allowAct) {
    if (state.gameOver) return '';
    var acting = PG.actingSeats(state);
    var iAmActing = allowAct && acting.indexOf(mySeat) !== -1;

    if (state.phase === 2) {
      var a = state.auction;
      var html = '<div class="pg-card"><h3>2단계 · 발전소 경매</h3>';
      if (a.sub === 'offer') {
        html += '<p>' + (iAmActing ? '경매에 올릴 발전소를 시장에서 선택하세요.' :
          '<b>' + esc(state.players[acting[0]].name) + '</b>님이 발전소를 고르는 중입니다.') + '</p>';
      } else {
        var minNeeded = Math.max(a.minBid, a.highBid + 1);
        html += '<p><b>' + a.plant + '번</b> 발전소 경매 중 · 현재 최고입찰: ' +
          (a.highBidder != null ? (state.players[a.highBidder].name + ' ' + a.highBid + '€') : '없음') +
          ' · 다음 최소입찰: <b>' + minNeeded + '€</b></p>';
        if (iAmActing) {
          html += '<div class="pg-form-row">';
          html += '<input class="pg-input" style="width:90px" type="number" id="pg-bid-amount" min="' + minNeeded + '" value="' + minNeeded + '">';
          html += '<button class="pg-btn primary" data-action="bid">입찰</button>';
          html += '<button class="pg-btn danger" data-action="bidPass">포기</button>';
          html += '</div>';
        } else if (acting[0] != null) {
          html += '<p>' + esc(state.players[acting[0]].name) + '님의 입찰 차례입니다.</p>';
        }
      }
      if (iAmActing && a.sub === 'offer') {
        html += '<div class="pg-form-row"><button class="pg-btn danger" data-action="offerPass"' + (state.firstRoundAuction ? ' disabled' : '') + '>경매 제시 포기(라운드 이탈)</button></div>';
      }
      html += '</div>';
      return html;
    }

    if (state.phase === 3) {
      var html3 = '<div class="pg-card"><h3>3단계 · 자원 구매</h3>';
      if (iAmActing) {
        html3 += '<p>보유 발전소가 저장할 수 있는 만큼 자원을 구매하세요.</p>';
        html3 += '<div class="pg-form-row"><button class="pg-btn primary" data-action="endResourceTurn">구매 완료 (다음 사람)</button></div>';
      } else if (acting[0] != null) {
        html3 += '<p>' + esc(state.players[acting[0]].name) + '님의 구매 차례입니다.</p>';
      }
      html3 += '</div>';
      return html3;
    }

    if (state.phase === 4) {
      var html4 = '<div class="pg-card"><h3>4단계 · 도시 건설</h3>';
      if (iAmActing) {
        html4 += '<p>독일 지도 위의 원형 마커 또는 도시 목록에서 건설할 도시를 선택하세요. 연결비 + 10/15/20 건설비를 자동 계산합니다.</p>';
        html4 += '<div class="pg-form-row"><button class="pg-btn primary" data-action="endBuildTurn">건설 완료 (다음 사람)</button></div>';
      } else if (acting[0] != null) {
        html4 += '<p>' + esc(state.players[acting[0]].name) + '님의 건설 차례입니다.</p>';
      }
      html4 += '</div>';
      return html4;
    }
    return '';
  }

  function renderLog(state) {
    var html = '<div class="pg-card"><h3>진행 기록</h3><div class="pg-log">';
    var lines = state.log.slice(-60);
    for (var i = lines.length - 1; i >= 0; i--) html += '<div>' + esc(lines[i]) + '</div>';
    html += '</div></div>';
    return html;
  }

  function renderGameOverBanner(state) {
    if (!state.gameOver) return '';
    var rows = state.order.slice().sort(function (a, b) {
      var pa = state.players[a], pb = state.players[b];
      var pw = (pb._finalPowered || 0) - (pa._finalPowered || 0);
      if (pw !== 0) return pw;
      return pb.money - pa.money;
    });
    var html = '<div class="pg-banner">🏆 게임 종료! 승자: ' + esc(state.players[state.winner].name) + '<br>';
    html += '<div style="font-weight:400;font-size:13px;margin-top:8px">';
    rows.forEach(function (s, i) {
      html += (i + 1) + '위 ' + esc(state.players[s].name) + ' (도시 ' + (state.players[s]._finalPowered || 0) + '개 공급, ' + state.players[s].money + '€) &nbsp; ';
    });
    html += '</div></div>';
    return html;
  }

  // ------------------------------------------------------------
  // 메인 렌더 함수
  // ------------------------------------------------------------
  function render(container, ctx) {
    var state = ctx.state;
    var mySeat = ctx.mySeat;
    var allowAct = ctx.allowAnySeat || (mySeat != null);
    var acting = PG.actingSeats(state);

    var top = '<div class="pg-topbar">' +
      '<div class="pg-title">🔌 파워그리드 독일 β<br><small>' + esc(ctx.subtitle || '') + '</small></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<span class="pg-pill">Step <b>' + state.step + '</b></span>' +
      '<span class="pg-pill">라운드 <b>' + state.round + '</b></span>' +
      '<span class="pg-pill">' + phaseLabel(state.phase) + '</span>' +
      (ctx.extraTopHtml || '') +
      '</div></div>';

    var canOfferOrBid = allowAct && state.phase === 2;
    var canBuy = allowAct && state.phase === 3 && acting.indexOf(mySeat) !== -1;

    var left = '<div>' +
      renderMap(state, mySeat, allowAct, acting) +
      '<div class="pg-card"><h3>발전소 시장</h3>' + renderPlantMarket(state, mySeat, allowAct && state.phase === 2 && state.auction.sub === 'offer' && acting.indexOf(mySeat) !== -1) + '</div>' +
      '<div class="pg-card"><h3>자원 시장</h3>' + renderResourceMarket(state, mySeat, canBuy) + '</div>' +
      '</div>';

    var right = '<div>' +
      renderGameOverBanner(state) +
      '<div class="pg-card"><h3>플레이어</h3>' + renderPlayers(state, acting) + '</div>' +
      renderContextPanel(state, mySeat, allowAct) +
      renderLog(state) +
      '</div>';

    container.innerHTML = top + '<div class="pg-layout">' + left + right + '</div>' + (ctx.footerHtml || '');

    container.querySelectorAll('[data-action]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (el.disabled) return;
        var actType = el.getAttribute('data-action');
        var seat = mySeat != null ? mySeat : acting[0];
        var args = {};
        if (actType === 'offerPlant') args.plant = Number(el.getAttribute('data-plant'));
        if (actType === 'buildCity') args.city = el.getAttribute('data-city');
        if (actType === 'buyResource') { args.resource = el.getAttribute('data-resource'); args.qty = Number(el.getAttribute('data-qty')); }
        if (actType === 'bid') {
          var input = container.querySelector('#pg-bid-amount');
          args.amount = Number(input.value);
        }
        ctx.onAction({ type: actType, seat: seat, args: args });
      });
    });
  }

  global.PowerGridUI = { render: render, SEAT_COLORS: SEAT_COLORS, plantLabel: plantLabel };
})(typeof window !== 'undefined' ? window : this);
