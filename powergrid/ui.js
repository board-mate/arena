/*!
 * BoardMate Power Grid - Multiplayer UI Layer v11
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


  // 발전소 이미지는 파일 수를 줄이기 위해 7x7 단일 스프라이트 시트를 사용한다.
  // 100x100 타일, 발전소 번호 오름차순 42장 + 마지막 칸 STEP3.
  var PLANT_SPRITE_ORDER = Object.keys(PG.PLANT_DEFS).map(Number).sort(function (a,b) { return a-b; });
  var PLANT_SPRITE_INDEX = {};
  PLANT_SPRITE_ORDER.forEach(function (n, i) { PLANT_SPRITE_INDEX[n] = i; });
  function plantSprite(num) {
    var idx = PLANT_SPRITE_INDEX[num];
    if (idx == null) return '<div class="pg-plant-img pg-plant-missing">'+esc(num)+'</div>';
    var x = (idx % 7) * 100, y = Math.floor(idx / 7) * 100;
    return '<svg class="pg-plant-img" viewBox="'+x+' '+y+' 100 100" role="img" aria-label="'+esc(num)+'번 발전소">'+
      '<image href="./powergrid/assets/plants/plant_sheet.webp?v=11" x="0" y="0" width="700" height="700" preserveAspectRatio="none"></image></svg>';
  }

  function renderMapFeatures(boardId, compact) {
    var def = PG.BOARD_DEFS[boardId] || PG.BOARD_DEFS.germany;
    var features = def && def.features || [];
    if (!features.length) return '';
    var items = features.map(function (x) { return '<li>'+esc(x)+'</li>'; }).join('');
    if (compact) return '<details class="pg-map-features compact" open><summary>🗺️ '+esc(def.featureTitle || (def.name+'맵 특징'))+'</summary><ul>'+items+'</ul></details>';
    return '<div class="pg-map-features"><b>🗺️ '+esc(def.featureTitle || (def.name+'맵 특징'))+'</b><ul>'+items+'</ul></div>';
  }


  function renderBoardTracks(state) {
    var trigger = PG.STEP2_TRIGGER[state.numPlayers] || 7;
    var end = PG.END_GAME_CITIES[state.numPlayers] || 17;
    var maxTrack = Math.max(end, trigger, 1);
    var cityRows = state.order.map(function (seat) {
      var p = state.players[seat];
      var count = (p.cities || []).length;
      var pct = Math.max(0, Math.min(100, count / maxTrack * 100));
      var stepPct = Math.max(0, Math.min(100, trigger / maxTrack * 100));
      return '<div class="pg-city-track-row">' +
        '<div class="pg-city-track-name"><i style="background:'+SEAT_COLORS[seat%6]+'"></i><span>'+esc(p.name)+'</span><b>'+count+'</b></div>' +
        '<div class="pg-city-track-bar">' +
          '<span class="pg-city-track-fill" style="width:'+pct.toFixed(2)+'%;background:'+SEAT_COLORS[seat%6]+'"></span>' +
          '<span class="pg-city-track-step2" style="left:'+stepPct.toFixed(2)+'%" title="Step 2: '+trigger+'도시"></span>' +
          '<span class="pg-city-track-marker" style="left:'+pct.toFixed(2)+'%;background:'+SEAT_COLORS[seat%6]+'"></span>' +
        '</div>' +
      '</div>';
    }).join('');

    var resourceRows = ['coal','oil','garbage','uranium'].map(function (r) {
      var cap = PG.RESOURCE_CAPACITY[r];
      var filled = state.resourceMarket[r];
      var emptyCount = cap - filled;
      var price = filled > 0 ? PG.LADDERS[r][emptyCount] : null;
      var refillTable = PG.RESOURCE_REPLENISH && PG.RESOURCE_REPLENISH[state.numPlayers];
      var refill = refillTable && refillTable[r] ? refillTable[r][Math.max(0, Math.min(2, state.step-1))] : null;
      if (r === 'uranium' && state.flags && state.flags.uraniumResupplyStopped) refill = 0;
      var cells = '';
      for (var i=0;i<cap;i++) {
        cells += '<i class="'+(i>=emptyCount?'filled':'')+'"></i>';
      }
      return '<div class="pg-resource-track-row">' +
        '<div class="pg-resource-track-head"><b>'+esc(resLabel(r))+'</b><span>'+filled+'/'+cap+' · '+(price!=null?('최저 '+price+'€'):'품절')+(refill!=null?(' · 보충 +'+refill):'')+'</span></div>' +
        '<div class="pg-resource-track-cells '+esc(r)+'">'+cells+'</div>' +
      '</div>';
    }).join('');

    return '<section class="pg-board-tracks" aria-label="보드 상태 시각화">' +
      '<div class="pg-board-tracks-title"><b>📊 보드 상태</b><span>Step '+state.step+' · 도시 트랙 / 자원 트랙</span></div>' +
      '<div class="pg-board-tracks-grid">' +
        '<div class="pg-city-track"><div class="pg-track-caption"><b>🏙️ 도시 수</b><span>Step 2 '+trigger+' · 종료 '+end+'</span></div>'+cityRows+'</div>' +
        '<div class="pg-resource-track"><div class="pg-track-caption"><b>⛏️ 자원 시장</b><span>남은 토큰과 현재 최저가</span></div>'+resourceRows+'</div>' +
      '</div>' +
    '</section>';
  }

  // ------------------------------------------------------------
  // 지도 SVG
  // ------------------------------------------------------------
  function renderExcludedRegionShade(G, selectedRegions) {
    var selected = {};
    (selectedRegions || []).forEach(function (rid) { selected[rid] = true; });
    var polys = G.REGION_SHADE_POLYGONS || {};
    var parts = [];
    (G.REGION_ORDER || Object.keys(G.REGIONS || {})).forEach(function (rid) {
      if (selected[rid] || !polys[rid]) return;
      var labelPoints = polys[rid];
      var cx = labelPoints.reduce(function (sum,p) { return sum+p[0]; },0)/labelPoints.length;
      var cy = labelPoints.reduce(function (sum,p) { return sum+p[1]; },0)/labelPoints.length;
      // v9: 제외 음영이 인접 사용 도시까지 덮지 않도록 폴리곤을 중심 기준 50%로 축소한다.
      var shadeScale = 0.50;
      var points = labelPoints.map(function (p) {
        return (cx + (p[0]-cx)*shadeScale).toFixed(1) + ',' + (cy + (p[1]-cy)*shadeScale).toFixed(1);
      }).join(' ');
      parts.push('<polygon points="'+points+'" class="pg-excluded-region-shape"></polygon>');
      parts.push('<text x="'+cx.toFixed(1)+'" y="'+cy.toFixed(1)+'" class="pg-excluded-region-label">제외</text>');
    });
    if (!parts.length) return '';
    return '<svg class="pg-excluded-region-overlay" viewBox="0 0 '+G.BOARD_WIDTH+' '+G.BOARD_HEIGHT+'" preserveAspectRatio="none" aria-hidden="true">'+parts.join('')+'</svg>';
  }

  function renderMap(state, mySeat, allowAct, actingSeats) {
    var boardId=(state.map && state.map.boardId) || 'germany';
    var G=PG.mapData ? PG.mapData(boardId) : PG.GERMANY;
    var def=PG.BOARD_DEFS[boardId] || PG.BOARD_DEFS.germany;
    var selected={};
    (state.map.cityNames||[]).forEach(function(id){selected[id]=true;});
    var selectedRegions=(state.map.regionIds||[]);
    var canBuild=state.phase===4 && actingSeats[0]===mySeat && allowAct;
    var myMoney=(canBuild && state.players[mySeat]) ? state.players[mySeat].money : -1;

    var regionChips=selectedRegions.map(function(rid){
      var r=G.REGIONS[rid];
      return r ? '<span class="pg-region-chip" style="--region:'+esc(r.color)+'">'+esc(r.shortName)+'</span>' : '';
    }).join('');
    var excludedShade=renderExcludedRegionShade(G, selectedRegions);

    var edgeSvg='';
    var edgeRows=[];
    (state.map.edges||G.EDGES||[]).forEach(function(e){
      var a=G.CITY_BY_ID[e.a], b=G.CITY_BY_ID[e.b];
      if(!a||!b||!selected[e.a]||!selected[e.b])return;
      edgeSvg+='<line class="pg-map-edge" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"></line>'+
        '<text class="pg-map-edge-cost" x="'+((a.x+b.x)/2).toFixed(1)+'" y="'+((a.y+b.y)/2).toFixed(1)+'">'+e.cost+'</text>';
      edgeRows.push({a:a.name,b:b.name,cost:e.cost});
    });

    var markers='';
    G.CITIES.forEach(function(city){
      if(!selected[city.id])return;
      var owners=state.cityOwners[city.id]||[];
      var cost=canBuild ? PG.computeBuildCost(state,mySeat,city.id) : null;
      var affordable=cost!=null && cost<=myMoney;
      var buildClickable=canBuild && affordable;
      var poweredSeats=owners.filter(function(seat){return (state.players[seat]._lastPoweredCities||[]).indexOf(city.id)!==-1;});
      var ownerDots=owners.map(function(seat){return '<i style="background:'+SEAT_COLORS[seat%6]+'"></i>';}).join('');
      var title=city.name+(cost!=null?' · '+cost+'€':'')+(poweredSeats.length?' · ⚡ 공급됨':'');
      var attrs=buildClickable ? 'data-action="buildCity" data-city="'+esc(city.id)+'"' : 'disabled';
      markers+='<button class="pg-germany-city-marker'+(buildClickable?' can-build':'')+(owners.length?' occupied':'')+(poweredSeats.length?' powered':'')+'" '+
        'style="left:'+(city.x/G.BOARD_WIDTH*100).toFixed(3)+'%;top:'+(city.y/G.BOARD_HEIGHT*100).toFixed(3)+'%" '+
        'title="'+esc(title)+'" aria-label="'+esc(title)+'" '+attrs+'>'+ownerDots+(cost!=null?'<b>'+cost+'</b>':'')+'</button>';
    });

    var cityGroups='';
    selectedRegions.forEach(function(rid){
      var region=G.REGIONS[rid]; if(!region)return;
      var buttons=G.CITIES.filter(function(c){return c.region===rid;}).map(function(city){
        var owners=state.cityOwners[city.id]||[];
        var cost=canBuild ? PG.computeBuildCost(state,mySeat,city.id) : null;
        var affordable=cost!=null && cost<=myMoney;
        var clickable=canBuild && affordable;
        var powered=(state.players[mySeat] && (state.players[mySeat]._lastPoweredCities||[]).indexOf(city.id)!==-1);
        var dots=owners.map(function(seat){return '<i class="pg-city-owner-dot" style="background:'+SEAT_COLORS[seat%6]+'"></i>';}).join('');
        var suffix=cost!=null ? '<span class="pg-city-cost">'+cost+'€</span>' :
          (owners.indexOf(mySeat)!==-1?'<span class="pg-city-status">'+(powered?'⚡ 공급':'내 도시')+'</span>':'');
        return '<button class="pg-city-choice'+(clickable?' can-build':'')+'" '+(clickable?'data-action="buildCity" data-city="'+esc(city.id)+'"':'disabled')+'>'+dots+'<span>'+esc(city.name)+'</span>'+suffix+'</button>';
      }).join('');
      cityGroups+='<section class="pg-city-group"><h4><i style="background:'+esc(region.color)+'"></i>'+esc(region.name)+'</h4><div class="pg-city-choice-grid">'+buttons+'</div></section>';
    });

    var edgeTable=edgeRows.sort(function(a,b){return a.cost-b.cost;}).slice(0,120).map(function(e){return '<tr><td>'+esc(e.a)+'</td><td>'+esc(e.b)+'</td><td>'+e.cost+'€</td></tr>';}).join('');
    var boardInner='';
    if(def.image){
      boardInner='<div class="pg-germany-board"><img src="'+esc(def.image)+'" alt="Power Grid '+esc(def.name)+' board" loading="eager"><svg class="pg-abstract-map pg-edge-overlay" viewBox="0 0 '+G.BOARD_WIDTH+' '+G.BOARD_HEIGHT+'" preserveAspectRatio="none">'+edgeSvg+'</svg>'+excludedShade+markers+'</div>';
    }else{
      boardInner='<div class="pg-germany-board pg-abstract-board"><svg class="pg-abstract-map" viewBox="0 0 '+G.BOARD_WIDTH+' '+G.BOARD_HEIGHT+'" preserveAspectRatio="xMidYMid meet">'+edgeSvg+'</svg>'+markers+'</div>';
    }
    var note='건설 단계에서는 원형 마커 또는 도시 목록을 눌러 건설합니다. 연결비는 지도 선 위 숫자와 아래 연결비 표에서 확인할 수 있습니다.';
    return '<div class="pg-real-map pg-germany-map"><div class="pg-real-map-head"><div><b>'+esc(def.name)+' 보드</b><div class="pg-region-chips">'+regionChips+'</div></div><span class="pg-tag">'+G.CITIES.length+'도시 · '+(state.map.edges||G.EDGES).length+'연결 자동 계산</span></div>'+renderBoardTracks(state)+boardInner+
      '<div class="pg-map-note">'+note+'</div>'+renderIncomeTable()+
      '<details class="pg-city-picker"'+(canBuild?' open':'')+'><summary>도시 목록'+(canBuild?' · 건설 가능 비용 보기':'')+'</summary>'+cityGroups+'</details>'+ 
      '<details class="pg-connection-costs"><summary>지역/도시 연결비 표 보기</summary><table><thead><tr><th>도시 A</th><th>도시 B</th><th>비용</th></tr></thead><tbody>'+edgeTable+'</tbody></table></details></div>';
  }

  function renderIncomeTable(){
    var rows=[];
    for(var i=0;i<PG.PAYOUT_TABLE.length;i++){rows.push('<tr><td>'+i+'개</td><td>'+PG.PAYOUT_TABLE[i]+'€</td></tr>');}
    return '<details class="pg-income-table"><summary>💰 전력 생산량별 수입표</summary><div class="pg-income-grid">'+rows.join('')+'</div></details>';
  }


  // ------------------------------------------------------------
  // 플레이어 패널
  // ------------------------------------------------------------
  function renderPlayers(state, actingSeats, mySeat) {
    var html = '<div class="pg-players">';
    state.order.forEach(function (seat) {
      var p = state.players[seat];
      var active = actingSeats.indexOf(seat) !== -1;
      var mine = Number(seat) === Number(mySeat);
      html += '<div class="pg-player-row' + (active ? ' active' : '') + (mine ? ' mine' : '') + '">';
      html += '<span class="pg-swatch" style="background:' + SEAT_COLORS[seat % 6] + '"></span>';
      html += '<div class="pg-player-main"><div class="pg-player-name">' + esc(p.name) + (mine ? ' <span class="pg-me-badge">나</span>' : '') + '</div>';
      html += '<div class="pg-player-meta">💰' + p.money + '€ · 🏙️' + p.cities.length + ' · 🔌' + p.plants.length + '장' + ((p._lastPoweredCities||[]).length ? ' · ⚡' + p._lastPoweredCities.length : '') + '</div>';
      if (p.plants.length) {
        html += '<div class="pg-player-plants' + (mine ? ' mine' : '') + '">';
        p.plants.forEach(function(n){
          html += '<div class="pg-player-plant-card" title="'+esc(n+'번 · '+plantLabel(n))+'">'+plantSprite(n)+'</div>';
        });
        html += '</div>';
      } else {
        html += '<div class="pg-player-no-plants">보유 발전소 없음</div>';
      }
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
      var minBid = (n === mkt.discounted) ? 1 : n;
      html += '<div class="pg-plant-card' + (n === mkt.discounted ? ' discounted' : '') + '">';
      html += plantSprite(n);
      html += '<div class="info">' + (n === mkt.discounted ? '💲 ' : '') + plantLabel(n) + '</div>';
      if (clickable) html += '<div class="pg-offer-row"><input class="pg-input pg-offer-bid" id="pg-offer-bid-' + n + '" type="number" min="' + minBid + '" value="' + minBid + '"><button class="pg-btn primary small" data-action="offerPlant" data-plant="' + n + '">경매 시작</button></div>';
      html += '</div>';
    });
    mkt.future.forEach(function (n) {
      html += '<div class="pg-plant-card future">' + plantSprite(n) + '<div class="info">' + plantLabel(n) + '</div></div>';
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
        var room = 0;
        while (room < 12 && PG.canStoreResource(p.plants, p.stock, r, room + 1)) room += 1;
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
    if (state.gameOver && state.winner != null) return '';
    var acting = PG.actingSeats(state);
    var iAmActing = allowAct && acting.indexOf(mySeat) !== -1;

    if (state.plantDiscard) {
      var pd=state.plantDiscard, owner=state.players[pd.seat];
      var htmlD='<div class="pg-card pg-attention"><h3>발전소 보유 한도 · 폐기 선택</h3>';
      htmlD+='<p><b>'+esc(owner.name)+'</b>님은 발전소를 최대 <b>'+pd.max+'장</b> 보유할 수 있습니다. 방금 낙찰받은 발전소를 포함해 보유 카드 중 <b>1장</b>을 직접 버려야 경매가 계속됩니다.</p>';
      if(iAmActing){
        htmlD+='<div class="pg-discard-grid">';
        owner.plants.forEach(function(n){
          htmlD+='<button class="pg-discard-plant" data-action="discardPlant" data-plant="'+n+'">'+plantSprite(n)+'<b>'+n+'번 폐기</b><span>'+plantLabel(n)+'</span></button>';
        });
        htmlD+='</div><div class="pg-map-note">발전소를 버려 저장 한도가 줄어든 경우 넘치는 자원은 자동으로 반납됩니다.</div>';
      } else htmlD+='<p>폐기할 발전소를 고르는 중입니다.</p>';
      return htmlD+'</div>';
    }

    if (state.phase === 2) {
      var a = state.auction;
      var html = '<div class="pg-card"><h3>2단계 · 발전소 경매</h3>';
      if (a.sub === 'offer') {
        html += '<p>' + (iAmActing ? '경매에 올릴 발전소를 시장에서 선택하고, 시작가를 직접 입력하세요.' :
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

    if (state.phase === 5) {
      var html5='<div class="pg-card pg-power-card"><h3>5단계 · 발전 / 수입</h3>';
      if(!iAmActing){
        html5+='<p><b>'+esc(state.players[acting[0]].name)+'</b>님이 사용할 발전소와 공급 도시 수를 선택하는 중입니다.</p></div>';
        return html5;
      }
      var p=state.players[mySeat];
      html5+='<p><b>가동할 발전소</b>를 고르고, 실제로 전력을 공급할 <b>도시 개수</b>만 정하면 됩니다. 어느 도시를 활성화할지는 더 이상 고르지 않습니다.</p>';
      html5+='<div class="pg-power-summary" id="pg-power-summary">발전소와 도시 개수를 선택하세요.</div>';
      html5+='<h4>① 가동할 발전소</h4><div class="pg-power-plant-grid">';
      p.plants.forEach(function(n){
        html5+='<label class="pg-power-plant-choice"><input type="checkbox" class="pg-power-plant-check" value="'+n+'">'+plantSprite(n)+'<span><b>'+n+'번</b><small>'+plantLabel(n)+'</small></span></label>';
      });
      if(!p.plants.length) html5+='<span class="pg-map-note">보유 발전소가 없습니다.</span>';
      html5+='</div><h4>② 공급할 도시 개수</h4>';
      html5+='<div class="pg-form-row"><input class="pg-input" id="pg-power-city-count" type="number" min="0" max="'+p.cities.length+'" value="0" style="width:110px"><span class="pg-map-note">내 도시 '+p.cities.length+'개 중 몇 개에 공급할지 입력</span></div>';
      html5+='<div class="pg-form-row"><button class="pg-btn primary" id="pg-power-confirm" data-action="powerCities">⚡ 발전/수입 확정</button></div>';
      html5+='<div class="pg-map-note">0개 공급은 발전소를 선택하지 않고 확정하세요. 수입은 위의 전력 생산량별 수입표와 동일하게 지급됩니다.</div>';
      return html5+'</div>';
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
    if (!state.gameOver || state.winner == null) return '';
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
      '<div class="pg-title">🔌 파워그리드 '+esc((PG.BOARD_DEFS[(state.map&&state.map.boardId)||'germany']||PG.BOARD_DEFS.germany).name)+'<br><small>' + esc(ctx.subtitle || '') + '</small></div>' +
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
      '<div class="pg-card"><h3>발전소 시장</h3>' + renderPlantMarket(state, mySeat, allowAct && !state.plantDiscard && state.phase === 2 && state.auction && state.auction.sub === 'offer' && acting.indexOf(mySeat) !== -1) + '</div>' +
      '<div class="pg-card"><h3>자원 시장</h3>' + renderResourceMarket(state, mySeat, canBuy) + '</div>' +
      '</div>';

    var right = '<div>' +
      renderGameOverBanner(state) +
      '<div class="pg-card"><h3>플레이어</h3>' + renderPlayers(state, acting, mySeat) + '</div>' +
      renderContextPanel(state, mySeat, allowAct) +
      renderLog(state) +
      '</div>';

    container.innerHTML = top + '<div class="pg-layout">' + left + right + '</div>' + renderMapFeatures(state.map.boardId || 'germany', true) + (ctx.footerHtml || '');

    container.querySelectorAll('[data-action]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (el.disabled) return;
        var actType = el.getAttribute('data-action');
        var seat = mySeat != null ? mySeat : acting[0];
        var args = {};
        if (actType === 'offerPlant' || actType === 'discardPlant') { args.plant = Number(el.getAttribute('data-plant')); var bi=container.querySelector('#pg-offer-bid-'+args.plant); if (actType==='offerPlant' && bi) args.bid=Number(bi.value); }
        if (actType === 'buildCity') args.city = el.getAttribute('data-city');
        if (actType === 'buyResource') { args.resource = el.getAttribute('data-resource'); args.qty = Number(el.getAttribute('data-qty')); }
        if (actType === 'powerCities') {
          args.plants = Array.from(container.querySelectorAll('.pg-power-plant-check:checked')).map(function(x){return Number(x.value);});
          var ci=container.querySelector('#pg-power-city-count'); args.cityCount = ci ? Number(ci.value) : 0;
        }
        if (actType === 'bid') {
          var input = container.querySelector('#pg-bid-amount');
          args.amount = Number(input.value);
        }
        ctx.onAction({ type: actType, seat: seat, args: args });
      });
    });


    function updatePowerSelectionUI() {
      var summary=container.querySelector('#pg-power-summary');
      if(!summary || mySeat==null) return;
      var selectedPlants=Array.from(container.querySelectorAll('.pg-power-plant-check:checked')).map(function(x){return Number(x.value);});
      var cityInput=container.querySelector('#pg-power-city-count');
      var cityCount=cityInput ? Math.max(0, Math.floor(Number(cityInput.value)||0)) : 0;
      var capacity=selectedPlants.reduce(function(sum,n){return sum+(PG.PLANT_DEFS[n]?PG.PLANT_DEFS[n].cities:0);},0);
      var fuel=PG.fuelUseForPlants(selectedPlants,state.players[mySeat].stock);
      var maxCities=(state.players[mySeat].cities||[]).length;
      var ok=fuel!==null && cityCount<=capacity && cityCount<=maxCities && !(cityCount===0 && selectedPlants.length>0);
      var fuelText=fuel ? ('석탄 '+fuel.coal+' · 석유 '+fuel.oil+' · 쓰레기 '+fuel.garbage+' · 우라늄 '+fuel.uranium) : '자원 부족';
      summary.innerHTML='선택 발전소 <b>'+selectedPlants.length+'장</b> · 공급능력 <b>'+capacity+'도시</b> · 공급 예정 <b>'+cityCount+'개</b> · 수입 <b>'+PG.payoutFor(cityCount)+'€</b><br><small>소모 자원: '+fuelText+'</small>';
      summary.classList.toggle('invalid',!ok);
      var confirm=container.querySelector('#pg-power-confirm');
      if(confirm) confirm.disabled=!ok;
    }


    container.querySelectorAll('.pg-power-plant-check,#pg-power-city-count').forEach(function(el){el.addEventListener('change',updatePowerSelectionUI);el.addEventListener('input',updatePowerSelectionUI);});
    container.querySelectorAll('[data-power-city-toggle]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-power-city-toggle');
        var check=Array.from(container.querySelectorAll('.pg-power-city-check')).find(function(x){return x.value===id;});
        if(check){check.checked=!check.checked;updatePowerSelectionUI();}
      });
    });
    updatePowerSelectionUI();
  }

  global.PowerGridUI = { render: render, SEAT_COLORS: SEAT_COLORS, plantLabel: plantLabel };
})(typeof window !== 'undefined' ? window : this);
