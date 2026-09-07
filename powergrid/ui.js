/*!
 * BoardMate Power Grid - Multiplayer UI Layer v22
 * 순수 DOM/SVG 렌더링. React 등 프레임워크 없이 동작.
 * window.PowerGrid (engine.js) 를 사용한다.
 */
(function (global) {
  'use strict';
  var PG = global.PowerGrid;

  var SEAT_COLORS = ['#f5a623', '#4f8cff', '#3ddc84', '#ff5c5c', '#c084fc', '#38bdf8'];
  var LIVE_MAP = null;

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
      '<image href="./powergrid/assets/plants/plant_sheet.webp?v=19" x="0" y="0" width="700" height="700" preserveAspectRatio="none"></image></svg>';
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
      var boardId=(state.map && state.map.boardId) || 'germany';
      var boardRules=(PG.BOARD_DEFS[boardId] || PG.BOARD_DEFS.germany).rules || {};
      var usaStorage=(r==='coal' && boardRules.usaCoalStorage && PG.usaCoalStorageCount) ? PG.usaCoalStorageCount(state) : 0;
      var price = filled > 0 ? PG.LADDERS[r][emptyCount] : (usaStorage>0 ? 8 : null);
      var refillTable = PG.RESOURCE_REPLENISH && PG.RESOURCE_REPLENISH[state.numPlayers];
      var refill = refillTable && refillTable[r] ? refillTable[r][Math.max(0, Math.min(2, state.step-1))] : null;
      if (r === 'uranium' && state.flags && state.flags.uraniumResupplyStopped) refill = 0;
      var cells = '';
      for (var i=0;i<cap;i++) {
        cells += '<i class="'+(i>=emptyCount?'filled':'')+'"></i>';
      }
      return '<div class="pg-resource-track-row">' +
        '<div class="pg-resource-track-head"><b>'+esc(resLabel(r))+'</b><span>'+filled+'/'+cap+' · '+(price!=null?((filled>0?'최저 ':'저장고 ')+price+'€'):'품절')+(usaStorage>0?(' · 저장고 '+usaStorage):'')+(refill!=null?(' · 보충 +'+refill):'')+'</span></div>' +
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

  function renderSchematicBackground(G, selectedRegions) {
    var selected={}; (selectedRegions||[]).forEach(function(r){selected[r]=true;});
    var parts=[];
    if (G.REGION_SHADE_POLYGONS) {
      (G.REGION_ORDER||Object.keys(G.REGIONS||{})).forEach(function(rid){
        var poly=G.REGION_SHADE_POLYGONS[rid], r=G.REGIONS[rid];
        if(!poly||!r)return;
        var pts=poly.map(function(p){return p[0]+','+p[1];}).join(' ');
        var cx=poly.reduce(function(a,p){return a+p[0];},0)/poly.length;
        var cy=poly.reduce(function(a,p){return a+p[1];},0)/poly.length;
        parts.push('<polygon points="'+pts+'" class="pg-region-land'+(selected[rid]?' selected':' excluded')+'" style="--region:'+esc(r.color)+'"></polygon>');
        parts.push('<text x="'+cx.toFixed(1)+'" y="'+cy.toFixed(1)+'" class="pg-region-land-label'+(selected[rid]?'':' excluded')+'">'+esc(r.shortName||r.name)+'</text>');
      });
    } else {
      (G.REGION_ORDER||Object.keys(G.REGIONS||{})).forEach(function(rid){
        var r=G.REGIONS[rid]; if(!r)return;
        var cities=G.CITIES.filter(function(c){return c.region===rid;}); if(!cities.length)return;
        var xs=cities.map(function(c){return c.x;}), ys=cities.map(function(c){return c.y;});
        var minx=Math.max(18,Math.min.apply(null,xs)-58), maxx=Math.min(G.BOARD_WIDTH-18,Math.max.apply(null,xs)+58);
        var miny=Math.max(18,Math.min.apply(null,ys)-52), maxy=Math.min(G.BOARD_HEIGHT-18,Math.max.apply(null,ys)+52);
        parts.push('<rect x="'+minx+'" y="'+miny+'" width="'+(maxx-minx)+'" height="'+(maxy-miny)+'" rx="28" class="pg-region-land'+(selected[rid]?' selected':' excluded')+'" style="--region:'+esc(r.color)+'"></rect>');
        parts.push('<text x="'+((minx+maxx)/2).toFixed(1)+'" y="'+(miny+22).toFixed(1)+'" class="pg-region-land-label'+(selected[rid]?'':' excluded')+'">'+esc(r.shortName||r.name)+'</text>');
      });
    }
    return parts.join('');
  }

  function renderMap(state, mySeat, allowAct, actingSeats) {
    var boardId=(state.map && state.map.boardId) || 'germany';
    var G=PG.mapData ? PG.mapData(boardId) : PG.GERMANY;
    var def=PG.BOARD_DEFS[boardId] || PG.BOARD_DEFS.germany;
    var selectedRegions=(state.map.regionIds||[]);
    var regionChips=selectedRegions.map(function(rid){
      var r=G.REGIONS[rid];
      return r ? '<span class="pg-region-chip" style="--region:'+esc(r.color)+'">'+esc(r.shortName||r.name)+'</span>' : '';
    }).join('');
    var tag=G.CITIES.length+'도시 · '+(state.map.edges||G.EDGES||[]).length+'연결';
    return '<div class="pg-real-map pg-leaflet-map-card"><div class="pg-real-map-head"><div><b>'+esc(def.name)+' 지도</b><div class="pg-region-chips">'+regionChips+'</div></div><span class="pg-tag">'+esc(tag)+'</span></div>'+
      '<div class="pg-leaflet-live" id="pg-live-leaflet-map"><div class="pg-map-loading">지도 불러오는 중…</div></div>'+
      '<div class="pg-map-note">선택 지역은 지역색 도시와 밝은 연결선으로 표시하고, 사용하지 않는 지역은 검정 음영 없이 도시·연결선만 흐리게 표시합니다. 연결비는 선 위 숫자로 확인할 수 있습니다. 지도 이동·축소는 해당 국가 범위 안으로 제한됩니다.</div></div>';
  }

  function destroyLiveMap(){
    if(LIVE_MAP){try{LIVE_MAP.remove();}catch(_){ } LIVE_MAP=null;}
  }

  function mountLiveMap(container, state, mySeat, allowAct, actingSeats, ctx){
    var el=container.querySelector('#pg-live-leaflet-map');
    if(!el)return;
    destroyLiveMap();
    if(!global.L){el.innerHTML='<div class="pg-map-loading">지도 모듈을 불러오지 못했습니다. 아래 도시 목록으로 계속 플레이할 수 있습니다.</div>';return;}
    var boardId=(state.map && state.map.boardId) || 'germany';
    var G=PG.mapData ? PG.mapData(boardId) : PG.GERMANY;
    var selected={};(state.map.cityNames||[]).forEach(function(id){selected[id]=true;});
    var canBuild=state.phase===4 && actingSeats[0]===mySeat && allowAct;
    var myMoney=(canBuild && state.players[mySeat]) ? state.players[mySeat].money : -1;
    el.innerHTML='';
    var hardBounds=G.GEO_BOUNDS ? global.L.latLngBounds(G.GEO_BOUNDS) : null;
    var map=global.L.map(el,{zoomControl:true,attributionControl:true,minZoom:3,maxZoom:12,maxBounds:hardBounds||undefined,maxBoundsViscosity:1.0});
    LIVE_MAP=map;
    global.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,noWrap:true,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    var byId=G.CITY_BY_ID||{};

    (state.map.edges||G.EDGES||[]).forEach(function(e){
      var a=byId[e.a],b=byId[e.b];
      if(!a||!b||!Number.isFinite(a.lat)||!Number.isFinite(a.lng)||!Number.isFinite(b.lat)||!Number.isFinite(b.lng))return;
      var on=!!selected[e.a] && !!selected[e.b];
      global.L.polyline([[a.lat,a.lng],[b.lat,b.lng]],{
        color:on?'#e4bd55':'#64748b',weight:on?2.7:1.35,opacity:on?.82:.18,dashArray:on?null:'5,6',interactive:false
      }).addTo(map);
      if(on){
        var mid=[(a.lat+b.lat)/2,(a.lng+b.lng)/2];
        var costIcon=global.L.divIcon({className:'pg-leaflet-cost-icon',html:'<span>'+esc(e.cost)+'</span>',iconSize:[28,18],iconAnchor:[14,9]});
        global.L.marker(mid,{icon:costIcon,interactive:false}).addTo(map);
      }
    });

    G.CITIES.forEach(function(city){
      if(!Number.isFinite(city.lat)||!Number.isFinite(city.lng))return;
      var on=!!selected[city.id], region=G.REGIONS[city.region], owners=state.cityOwners[city.id]||[];
      var cost=canBuild && on ? PG.computeBuildCost(state,mySeat,city.id) : null;
      var affordable=cost!=null && cost<=myMoney;
      var poweredSeats=owners.filter(function(seat){return (state.players[seat]._lastPoweredCities||[]).indexOf(city.id)!==-1;});
      var ownerDots=owners.map(function(seat){var pow=poweredSeats.indexOf(seat)!==-1;return '<i'+(pow?' class="powered"':'')+' style="background:'+SEAT_COLORS[seat%6]+'"></i>';}).join('');
      var iconHtml='<div class="pg-leaflet-city '+(on?'active':'inactive')+(owners.length?' occupied':'')+(affordable?' can-build':'')+'" style="--region:'+(region?esc(region.color):'#64748b')+'">'+
        '<span class="pg-leaflet-city-core"></span><span class="pg-leaflet-city-name">'+esc(city.name)+'</span>'+
        (cost!=null?'<b class="pg-leaflet-build-cost">'+cost+'€</b>':'')+'<span class="pg-leaflet-owner-dots">'+ownerDots+'</span></div>';
      var icon=global.L.divIcon({className:'pg-leaflet-city-icon',html:iconHtml,iconSize:[28,28],iconAnchor:[14,14]});
      var marker=global.L.marker([city.lat,city.lng],{icon:icon,interactive:on}).addTo(map);
      if(!on)return;
      marker.on('click',function(){
        var ownerText=owners.length?owners.map(function(seat){return esc(state.players[seat].name);}).join(', '):'없음';
        var popup='<div class="pg-leaflet-popup"><b>'+esc(city.name)+'</b><div>지역: '+esc(region?(region.shortName||region.name):'')+'</div><div>건설: '+ownerText+'</div>';
        if(cost!=null)popup+='<div>현재 총 건설비: <strong>'+cost+'€</strong></div>';
        if(canBuild && affordable)popup+='<button type="button" class="pg-btn primary small" data-pg-map-build="'+esc(city.id)+'">이 도시에 건설</button>';
        else if(canBuild && cost!=null && !affordable)popup+='<small>보유 현금이 부족합니다.</small>';
        popup+='</div>';
        marker.bindPopup(popup,{closeButton:true,maxWidth:230}).openPopup();
      });
      marker.on('popupopen',function(ev){
        var node=ev.popup && ev.popup.getElement ? ev.popup.getElement() : null;
        var btn=node && node.querySelector('[data-pg-map-build]');
        if(btn)btn.addEventListener('click',function(){
          map.closePopup();
          ctx.onAction({type:'buildCity',seat:mySeat,args:{city:city.id}});
        },{once:true});
      });
    });

    var pts=G.CITIES.filter(function(c){return Number.isFinite(c.lat)&&Number.isFinite(c.lng);}).map(function(c){return [c.lat,c.lng];});
    if(hardBounds){
      map.fitBounds(hardBounds,{padding:[18,18],animate:false});
      // 초기 국가 전체가 보이는 배율보다 더 멀리 축소할 수 없게 해 주변 국가/해역으로 빠지는 것을 막는다.
      map.setMinZoom(map.getZoom());
      map.panInsideBounds(hardBounds,{animate:false});
    }else if(pts.length){
      var cityBounds=global.L.latLngBounds(pts).pad(0.08);
      map.setMaxBounds(cityBounds);
      map.fitBounds(cityBounds,{padding:[28,28],animate:false});
      map.setMinZoom(map.getZoom());
    }else map.setView(G.GEO_CENTER||[0,0],G.GEO_ZOOM||4);
    setTimeout(function(){if(LIVE_MAP===map){map.invalidateSize(false);if(hardBounds)map.panInsideBounds(hardBounds,{animate:false});}},0);
  }

  function renderMapDetails(state, mySeat, allowAct, actingSeats) {
    var boardId=(state.map && state.map.boardId) || 'germany';
    var G=PG.mapData ? PG.mapData(boardId) : PG.GERMANY;
    var selected={};
    (state.map.cityNames||[]).forEach(function(id){selected[id]=true;});
    var selectedRegions=(state.map.regionIds||[]);
    var canBuild=state.phase===4 && actingSeats[0]===mySeat && allowAct;
    var myMoney=(canBuild && state.players[mySeat]) ? state.players[mySeat].money : -1;

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

    var edgeRows=[];
    (state.map.edges||G.EDGES||[]).forEach(function(e){
      var a=G.CITY_BY_ID[e.a], b=G.CITY_BY_ID[e.b];
      if(!a||!b||!selected[e.a]||!selected[e.b])return;
      edgeRows.push({a:a.name,b:b.name,cost:e.cost});
    });
    var edgeTable=edgeRows.sort(function(a,b){return a.cost-b.cost;}).slice(0,120).map(function(e){return '<tr><td>'+esc(e.a)+'</td><td>'+esc(e.b)+'</td><td>'+e.cost+'€</td></tr>';}).join('');

    return '<div class="pg-map-reference-panels">'+
      renderIncomeTable()+
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
    var boardId=(state.map && state.map.boardId) || 'germany';
    var rules=(PG.BOARD_DEFS[boardId] || PG.BOARD_DEFS.germany).rules || {};
    var usaStorage = rules.usaCoalStorage && PG.usaCoalStorageCount ? PG.usaCoalStorageCount(state) : 0;
    var html = '<div class="pg-resource-grid">';
    ['coal', 'oil', 'garbage', 'uranium'].forEach(function (r) {
      var filled = state.resourceMarket[r];
      var cap = PG.RESOURCE_CAPACITY[r];
      var emptyCount = cap - filled;
      var usaCoalFallback = r === 'coal' && rules.usaCoalStorage && filled <= 0 && usaStorage > 0;
      var price = filled > 0 ? PG.LADDERS[r][emptyCount] : (usaCoalFallback ? 8 : null);
      html += '<div class="pg-res-box">';
      html += '<div class="name">' + resLabel(r) + '</div>';
      html += '<div class="amt">' + filled + '</div>';
      html += '<div class="price">' + (price != null ? price + '€' + (usaCoalFallback ? ' 저장고' : '') : '품절') + '</div>';
      if (r === 'coal' && rules.usaCoalStorage) html += '<div style="margin-top:4px;font-size:10px;color:var(--muted)">저장고 '+usaStorage+'개 · 시장 품절 시 8€/개</div>';
      if (canBuy && price != null && p) {
        var room = 0;
        while (room < 12 && PG.canStoreResource(p.plants, p.stock, r, room + 1)) room += 1;
        var available = filled > 0 ? filled : (usaCoalFallback ? usaStorage : 0);
        room=Math.min(room,available);
        if (room > 0) {
          var canAfford1 = p.money >= price;
          html += '<div style="margin-top:6px;display:flex;gap:4px;justify-content:center">';
          html += '<button class="pg-btn small" data-action="buyResource" data-resource="' + r + '" data-qty="1"' + (canAfford1 ? '' : ' disabled') + '>+1</button>';
          if (room >= 3 && p.money >= price*3) html += '<button class="pg-btn small" data-action="buyResource" data-resource="' + r + '" data-qty="3">+3</button>';
          html += '</div>';
        } else {
          html += '<div style="margin-top:6px;font-size:11px;color:var(--muted)">' + (available<=0?'구매 가능한 자원 없음':'저장 공간 가득참') + '</div>';
        }
      }
      html += '</div>';
    });
    html += '</div>';
    if (rules.usaCoalStorage) html += '<div class="pg-setup-warning" style="margin-top:8px">🇺🇸 석탄 저장고: 시장의 석탄이 0개일 때만 저장고에서 1개당 8€로 구매할 수 있습니다. 발전에 사용한 석탄은 저장고로 가고, 정리 단계의 석탄 보충은 그 저장고에서 시장으로 돌아옵니다.</div>';
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
      var myCityCount = p.cities.length;
      html5+='<h4>① 가동할 발전소</h4><div class="pg-power-plant-grid">';
      p.plants.forEach(function(n){
        html5+='<label class="pg-power-plant-choice"><input type="checkbox" class="pg-power-plant-check" value="'+n+'">'+plantSprite(n)+'<span><b>'+n+'번</b><small>'+plantLabel(n)+'</small></span></label>';
      });
      if(!p.plants.length) html5+='<span class="pg-map-note">보유 발전소가 없습니다.</span>';
      html5+='</div><h4>② 공급할 도시 개수</h4>';
      html5+='<div class="pg-form-row pg-power-city-row">' +
        '<button class="pg-btn pg-city-count-btn" id="pg-power-city-minus" type="button" aria-label="감소">▼</button>' +
        '<input class="pg-input" id="pg-power-city-count" type="number" min="0" max="'+myCityCount+'" step="1" inputmode="numeric" value="'+myCityCount+'" style="width:80px;text-align:center" aria-label="공급할 도시 수">' +
        '<button class="pg-btn pg-city-count-btn" id="pg-power-city-plus" type="button" aria-label="증가">▲</button>' +
        '<span class="pg-map-note">내 도시 '+myCityCount+'개</span>' +
      '</div>';
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
    destroyLiveMap();
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
      renderBoardTracks(state) +
      '<div class="pg-card"><h3>자원 시장</h3>' + renderResourceMarket(state, mySeat, canBuy) + '</div>' +
      renderMap(state, mySeat, allowAct, acting) +
      '<div class="pg-card"><h3>발전소 시장</h3>' + renderPlantMarket(state, mySeat, allowAct && !state.plantDiscard && state.phase === 2 && state.auction && state.auction.sub === 'offer' && acting.indexOf(mySeat) !== -1) + '</div>' +
      renderMapDetails(state, mySeat, allowAct, acting) +
      '</div>';

    var right = '<div>' +
      renderGameOverBanner(state) +
      '<div class="pg-card"><h3>플레이어</h3>' + renderPlayers(state, acting, mySeat) + '</div>' +
      renderContextPanel(state, mySeat, allowAct) +
      renderLog(state) +
      '</div>';

    container.innerHTML = top + '<div class="pg-layout">' + left + right + '</div>' + renderMapFeatures(state.map.boardId || 'germany', true) + (ctx.footerHtml || '');
    mountLiveMap(container, state, mySeat, allowAct, acting, ctx);

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
      var minus=container.querySelector('#pg-power-city-minus');
      var plus=container.querySelector('#pg-power-city-plus');
      if(minus) minus.disabled=cityCount<=0;
      if(plus) plus.disabled=cityCount>=maxCities;
    }


    container.querySelectorAll('.pg-power-plant-check,#pg-power-city-count').forEach(function(el){el.addEventListener('change',updatePowerSelectionUI);el.addEventListener('input',updatePowerSelectionUI);});
    container.querySelectorAll('[data-power-city-toggle]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-power-city-toggle');
        var check=Array.from(container.querySelectorAll('.pg-power-city-check')).find(function(x){return x.value===id;});
        if(check){check.checked=!check.checked;updatePowerSelectionUI();}
      });
    });
    // 모바일용 ▲▼ 버튼
    var cityPlusBtn = container.querySelector('#pg-power-city-plus');
    var cityMinusBtn = container.querySelector('#pg-power-city-minus');
    var cityCountInput = container.querySelector('#pg-power-city-count');
    if(cityPlusBtn && cityCountInput){
      cityPlusBtn.addEventListener('click',function(){
        var max = parseInt(cityCountInput.max,10)||0;
        var cur = parseInt(cityCountInput.value,10)||0;
        if(cur < max){ cityCountInput.value = cur+1; updatePowerSelectionUI(); }
      });
    }
    if(cityMinusBtn && cityCountInput){
      cityMinusBtn.addEventListener('click',function(){
        var cur = parseInt(cityCountInput.value,10)||0;
        if(cur > 0){ cityCountInput.value = cur-1; updatePowerSelectionUI(); }
      });
    }
    updatePowerSelectionUI();
  }

  global.PowerGridUI = { render: render, SEAT_COLORS: SEAT_COLORS, plantLabel: plantLabel };
})(typeof window !== 'undefined' ? window : this);
