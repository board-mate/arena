/*!
 * BoardMate Power Grid Germany - Multiplayer Core Engine (beta v3)
 * -----------------------------------------------------------------
 * 다인플 전용. 브라우저와 Node(CommonJS)에서 동일 규칙 엔진을 사용한다.
 * 독일 보드의 42개 도시 / 83개 연결비 그래프를 내장해 도시 건설 비용을
 * 자동 계산한다. 솔로/AI/미국/한국 지도 코드는 이 체크포인트에서 제외했다.
 *
 * Germany network data attribution is documented in
 * powergrid/data/germany-map.js and POWERGRID_GERMANY_DATA_AUDIT.md.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./data/germany-map.js'));
  } else {
    root.PowerGrid = factory(root.PowerGridGermanyMap);
  }
})(typeof self !== 'undefined' ? self : this, function (GERMANY) {
  'use strict';
  if (!GERMANY) throw new Error('PowerGridGermanyMap 데이터가 필요합니다.');

  var STATE_KIND = 'powergrid-v3-germany-boardmate';

  // ============================================================
  // 상수 데이터
  // ============================================================

  var PAYOUT_TABLE = [10, 22, 33, 44, 54, 64, 73, 82, 90, 98, 105, 112, 118, 124, 129, 134, 138, 142, 145, 148, 150];
  function payoutFor(cities) {
    if (cities >= 20) return 150;
    return PAYOUT_TABLE[Math.max(0, Math.min(20, cities))];
  }

  var STEP2_TRIGGER = { 2: 10, 3: 7, 4: 7, 5: 7, 6: 6 };
  var END_GAME_CITIES = { 2: 21, 3: 17, 4: 17, 5: 15, 6: 14 };
  var REGIONS_TO_USE = { 2: 3, 3: 3, 4: 4, 5: 5, 6: 5 };

  // Resource Supply Table (coal/oil/garbage/uranium) [step1, step2, step3]
  // 출처: 업로드된 "Power Grid Summary USA/Germany" 자원 보급표 그대로.
  var RESOURCE_REPLENISH = {
    2: { coal: [3, 4, 3], oil: [2, 2, 4], garbage: [1, 2, 3], uranium: [1, 1, 1] },
    3: { coal: [4, 5, 3], oil: [2, 3, 4], garbage: [1, 2, 3], uranium: [1, 1, 1] },
    4: { coal: [5, 6, 4], oil: [3, 4, 5], garbage: [2, 3, 4], uranium: [1, 2, 2] },
    5: { coal: [5, 7, 5], oil: [4, 5, 6], garbage: [3, 3, 5], uranium: [2, 3, 2] },
    6: { coal: [7, 9, 6], oil: [5, 6, 7], garbage: [3, 5, 6], uranium: [2, 3, 3] }
  };

  var RESOURCE_CAPACITY = { coal: 24, oil: 24, garbage: 24, uranium: 12 };
  var RESOURCE_INITIAL_FILLED = { coal: 24, oil: 18, garbage: 9, uranium: 2 };

  function ladderFor(type) {
    if (type === 'uranium') return [1, 2, 4, 6, 8, 9, 10, 11, 12, 13, 14, 16];
    var arr = [];
    for (var i = 0; i < 24; i++) arr.push(Math.floor(i / 3) + 1);
    return arr; // [1,1,1,2,2,2,...,8,8,8]
  }
  var LADDERS = { coal: ladderFor('coal'), oil: ladderFor('oil'), garbage: ladderFor('garbage'), uranium: ladderFor('uranium') };

  var BUILD_TIER_COST = [10, 15, 20]; // 1번째/2번째/3번째 집

  // ------------------------------------------------------------
  // 발전소 덱 (42장 + Step3 카드)
  // 05 / 14 / 29 / 33은 업로드 룰북에 명시된 실제 예시 수치.
  // ------------------------------------------------------------
  var PLANT_DEFS = {
    3: { type: 'oil', need: 2, cities: 1 },
    4: { type: 'coal', need: 2, cities: 1 },
    5: { type: 'hybrid', need: 2, cities: 1 },
    6: { type: 'garbage', need: 1, cities: 1 },
    7: { type: 'oil', need: 3, cities: 2 },
    8: { type: 'coal', need: 3, cities: 2 },
    9: { type: 'oil', need: 1, cities: 1 },
    10: { type: 'coal', need: 2, cities: 2 },
    11: { type: 'uranium', need: 1, cities: 2 },
    12: { type: 'hybrid', need: 2, cities: 2 },
    13: { type: 'eco', need: 0, cities: 1 },
    14: { type: 'garbage', need: 2, cities: 2 },
    15: { type: 'coal', need: 2, cities: 3 },
    16: { type: 'oil', need: 2, cities: 3 },
    17: { type: 'uranium', need: 1, cities: 2 },
    18: { type: 'eco', need: 0, cities: 2 },
    19: { type: 'garbage', need: 2, cities: 3 },
    20: { type: 'coal', need: 3, cities: 5 },
    21: { type: 'hybrid', need: 2, cities: 4 },
    22: { type: 'eco', need: 0, cities: 2 },
    23: { type: 'uranium', need: 1, cities: 3 },
    24: { type: 'garbage', need: 2, cities: 4 },
    25: { type: 'coal', need: 2, cities: 5 },
    26: { type: 'oil', need: 2, cities: 5 },
    27: { type: 'eco', need: 0, cities: 3 },
    28: { type: 'uranium', need: 1, cities: 4 },
    29: { type: 'hybrid', need: 1, cities: 4 },
    30: { type: 'garbage', need: 3, cities: 6 },
    31: { type: 'coal', need: 3, cities: 6 },
    32: { type: 'oil', need: 3, cities: 6 },
    33: { type: 'eco', need: 0, cities: 4 },
    34: { type: 'uranium', need: 1, cities: 5 },
    35: { type: 'oil', need: 1, cities: 5 },
    36: { type: 'coal', need: 3, cities: 7 },
    37: { type: 'eco', need: 0, cities: 4 },
    38: { type: 'garbage', need: 3, cities: 7 },
    39: { type: 'uranium', need: 1, cities: 6 },
    40: { type: 'oil', need: 2, cities: 6 },
    42: { type: 'coal', need: 2, cities: 6 },
    44: { type: 'eco', need: 0, cities: 5 },
    46: { type: 'hybrid', need: 3, cities: 7 },
    50: { type: 'eco', need: 0, cities: 6 }
  };
  var ALL_PLANT_NUMBERS = Object.keys(PLANT_DEFS).map(Number).sort(function (a, b) { return a - b; });
  var PLUG_NUMBERS = ALL_PLANT_NUMBERS.filter(function (n) { return n <= 15; }); // 03-15
  var SOCKET_NUMBERS = ALL_PLANT_NUMBERS.filter(function (n) { return n > 15; });

  var REMOVE_TABLE = { // [plugRemove, socketRemove]
    2: [1, 5], 3: [2, 6], 4: [1, 3], 5: [0, 0], 6: [0, 0]
  };

  var MAX_PLANTS = function (numPlayers) { return numPlayers === 2 ? 4 : 3; };

  // ============================================================
  // 유틸리티
  // ============================================================
  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // 결정론적(시드 기반) 의사난수 생성기 - 모든 클라이언트가 동일한
  // 셔플/지도를 만들 수 있도록 함(state 자체에는 순서 결과만 저장하지만,
  // 최초 세팅 시 room 코드 기반 시드를 함께 써도 되고, 그냥 진짜 Math.random을
  // 써도 결과는 state에 저장되어 모든 클라이언트가 동일 state를 보므로 무방).
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ============================================================
  // 독일 지도 / 연결 그래프
  // ============================================================
  var MAP = { cities:{}, edges:GERMANY.EDGES.slice(), regionNames:[], regionColors:[], regionCityList:[] };
  GERMANY.REGION_ORDER.forEach(function (regionId, idx) {
    var r=GERMANY.REGIONS[regionId];
    MAP.regionNames[idx]=r.name;
    MAP.regionColors[idx]=r.color;
    MAP.regionCityList[idx]=[];
  });
  GERMANY.CITIES.forEach(function (c) {
    var ri=GERMANY.REGION_ORDER.indexOf(c.region);
    MAP.cities[c.id]={x:c.x,y:c.y,region:ri,regionId:c.region,name:c.name};
    MAP.regionCityList[ri].push(c.id);
  });

  var BOARD_DEFS = {
    germany: { id:'germany', name:'독일', mode:'auto', image:'./powergrid/assets/maps/germany.webp' }
  };

  function adjacency() {
    var adj={};
    GERMANY.CITIES.forEach(function(c){adj[c.id]=[];});
    GERMANY.EDGES.forEach(function(e){
      adj[e.a].push({to:e.b,cost:e.cost});
      adj[e.b].push({to:e.a,cost:e.cost});
    });
    return adj;
  }
  var ADJ=adjacency();

  // 다중 출발점 다익스트라. 선택되지 않은 지역의 도시는 경유할 수 없다.
  function cheapestConnectionCost(sources, target, allowedCities) {
    var allowed={};
    (allowedCities && allowedCities.length ? allowedCities : GERMANY.CITIES.map(function(c){return c.id;}))
      .forEach(function(c){allowed[c]=true;});
    if (!allowed[target]) return -1;
    if (!sources.length) return 0;
    if (sources.indexOf(target)!==-1) return -1;
    var dist={},visited={},pq=[];
    Object.keys(allowed).forEach(function(c){dist[c]=Infinity;});
    sources.forEach(function(src){if(allowed[src]){dist[src]=0;pq.push({c:src,d:0});}});
    while(pq.length){
      pq.sort(function(a,b){return a.d-b.d;});
      var cur=pq.shift();
      if(visited[cur.c])continue;
      visited[cur.c]=true;
      if(cur.c===target)return cur.d;
      (ADJ[cur.c]||[]).forEach(function(edge){
        if(!allowed[edge.to])return;
        var nd=cur.d+edge.cost;
        if(nd<dist[edge.to]){dist[edge.to]=nd;pq.push({c:edge.to,d:nd});}
      });
    }
    return Number.isFinite(dist[target]) ? dist[target] : -1;
  }

  function defaultRegions(numPlayers) {
    if (numPlayers <= 3) return ['green','brown','yellow'];
    if (numPlayers === 4) return ['green','brown','yellow','red'];
    return ['green','brown','yellow','red','blue'];
  }

  function validateRegionSelection(numPlayers, regionIds) {
    var wanted=REGIONS_TO_USE[numPlayers];
    var ids=(regionIds||[]).filter(function(r,i,a){return GERMANY.REGIONS[r]&&a.indexOf(r)===i;});
    if(ids.length!==wanted) throw new Error(numPlayers+'인 게임은 독일 지역 '+wanted+'개를 선택해야 합니다.');
    if(!GERMANY.regionsConnected(ids)) throw new Error('선택한 지역들은 서로 연결되어 있어야 합니다.');
    return ids;
  }

  function selectedCities(numPlayers, regionIds) {
    var ids=validateRegionSelection(numPlayers, regionIds || defaultRegions(numPlayers));
    return { regionIds:ids, cityNames:GERMANY.citiesForRegions(ids) };
  }

  // ============================================================
  // 게임 상태 생성 / 진행
  // ============================================================

  function newGame(opts) {
    var numPlayers = opts.numPlayers;
    var seatNames = opts.seatNames; // string[]
    if (!Number.isInteger(numPlayers) || numPlayers < 2 || numPlayers > 6) throw new Error('파워그리드는 2~6인 다인플만 지원합니다.');
    if (!seatNames || seatNames.length < numPlayers) throw new Error('플레이어 이름이 부족합니다.');
    var rng = mulberry32(opts.seed != null ? opts.seed : Date.now() % 2147483647);

    var boardId='germany';
    var boardDef=BOARD_DEFS.germany;
    var zone=selectedCities(numPlayers, opts.regionIds);

    // 발전소 덱 세팅 (룰북 8~9단계 그대로 구현)
    var plugShuffled = shuffle(PLUG_NUMBERS, rng);
    var initial8 = plugShuffled.slice(0, 8).sort(function (a, b) { return a - b; });
    var reserved = plugShuffled[8]; // 플러그 카드 1장 별도 보관 (덱 맨 위로)
    var leftoverPlug = plugShuffled.slice(9); // 남은 플러그카드 (13-9=4장)

    var socketShuffled = shuffle(SOCKET_NUMBERS, rng);
    var removeCounts = REMOVE_TABLE[numPlayers];
    var plugPool = shuffle(leftoverPlug, rng);
    var removedPlug = plugPool.slice(0, removeCounts[0]);
    var keepPlug = plugPool.slice(removeCounts[0]);
    var removedSocket = socketShuffled.slice(0, removeCounts[1]);
    var keepSocket = socketShuffled.slice(removeCounts[1]);

    var deckPool = shuffle(keepPlug.concat(keepSocket), rng);
    var deck = [reserved].concat(deckPool).concat(['STEP3']);

    var current = initial8.slice(0, 4);
    var future = initial8.slice(4, 8);

    var players = {};
    var order = [];
    for (var i = 0; i < numPlayers; i++) {
      players[i] = {
        name: seatNames[i] || ('플레이어 ' + (i + 1)),
        isAI: false,
        money: 50,
        cities: [],
        plants: [],
        stock: { coal: 0, oil: 0, garbage: 0, uranium: 0 },
        connected: true
      };
      order.push(i);
    }
    order = shuffle(order, rng);

    var state = {
      v: 3,
      kind: STATE_KIND,
      numPlayers: numPlayers,
      map: { mode:'auto', boardId:boardId, regionIds:zone.regionIds, cityNames:zone.cityNames },
      step: 1,
      round: 1,
      phase: 1, // 1..5
      order: order, // 이번 라운드 진행 순서 (index=순번, value=seatIdx)
      firstRoundAuction: true,
      players: players,
      cityOwners: {}, // cityName -> [seatIdx,...] (건설순서=house tier)
      plantMarket: { current: current, future: future, discounted: null },
      deck: deck,
      resourceMarket: clone(RESOURCE_INITIAL_FILLED),
      auction: null, // {stillIn:[seat,...], offerIdx, sub:'offer'|'bid', plant, bids:{seat:amount}, highBidder, highBid, biddersLeft:[...]}
      resourceTurn: null, // {orderIdx}
      buildTurn: null,   // {orderIdx}
      log: [],
      winner: null,
      gameOver: false
    };
    pushLog(state, '게임을 시작합니다. ('+numPlayers+'인, 독일맵 / 지역 '+zone.regionIds.map(function(r){return GERMANY.REGIONS[r].shortName;}).join('·')+' / 도시 '+zone.cityNames.length+'개)');
    pushLog(state, '독일 42도시 연결 그래프로 건설 연결비를 자동 계산합니다.');
    beginPhase2(state);
    syncDerivedTurn(state);
    return state;
  }

  function pushLog(state, msg) {
    state.log.push(msg);
    if (state.log.length > 300) state.log.shift();
  }

  function activePlant(numOrStep3) { return numOrStep3 === 'STEP3' ? null : PLANT_DEFS[numOrStep3]; }

  function refillMarketAfterPurchase(state) {
    // 시장에 8장 미만이면 덱에서 채우고, current=가장 싼 4장 순으로 정렬
    var mkt = state.plantMarket;
    var pool = mkt.current.concat(mkt.future);
    while (pool.length < 8 && state.deck.length) {
      var drawn = state.deck.shift();
      if (drawn === 'STEP3') { handleStep3Drawn(state, 'phase2'); continue; }
      pool.push(drawn);
    }
    pool.sort(function (a, b) { return a - b; });
    if (state.step === 3) {
      mkt.current = pool.slice(0, 6);
      mkt.future = [];
    } else {
      mkt.current = pool.slice(0, 4);
      mkt.future = pool.slice(4, 8);
    }
  }

  function handleStep3Drawn(state, when) {
    // Step3 카드가 뽑히면: 최고가로 취급 후 이번 단계가 끝나면 없앰(간략화: 즉시 표시만 하고
    // 실제 Step3 전환은 아래 checkStepTransition에서 처리)
    state._step3Pending = true;
    pushLog(state, 'Step 3 카드가 나왔습니다! 이번 단계가 끝나면 Step 3로 전환됩니다.');
  }

  function applyStep3IfPending(state) {
    if (!state._step3Pending) return;
    state._step3Pending = false;
    // 가장 싼 발전소 제거(교체 없음)
    var mkt = state.plantMarket;
    var pool = mkt.current.concat(mkt.future).sort(function (a, b) { return a - b; });
    pool.shift();
    state.step = 3;
    mkt.current = pool.slice(0, 6);
    mkt.future = [];
    pushLog(state, 'Step 3 시작! 이제부터 시장의 발전소 6장을 모두 경매할 수 있습니다.');
  }

  // ---------------- Phase 1: 순서 결정 ----------------
  function recomputeOrder(state) {
    var seats = Object.keys(state.players).map(Number);
    seats.sort(function (a, b) {
      var pa = state.players[a], pb = state.players[b];
      if (pb.cities.length !== pa.cities.length) return pb.cities.length - pa.cities.length;
      var maxA = pa.plants.length ? Math.max.apply(null, pa.plants) : 0;
      var maxB = pb.plants.length ? Math.max.apply(null, pb.plants) : 0;
      return maxB - maxA;
    });
    state.order = seats;
  }

  // ---------------- Phase 2: 발전소 경매 ----------------
  // 좌석 "번호"를 직접 포인터로 들고 다니는 방식(배열 인덱스 트릭 아님)이라
  // 중간에서 아무나 빠져도(패스/낙찰) 다음 차례 계산이 항상 안전하다.
  function nextActiveSeatAfter(state, seat, activeSeats) {
    var order = state.order;
    var startIdx = order.indexOf(seat);
    if (startIdx === -1) startIdx = 0;
    for (var k = 1; k <= order.length; k++) {
      var candidate = order[(startIdx + k) % order.length];
      if (activeSeats.indexOf(candidate) !== -1) return candidate;
    }
    return null;
  }

  function beginPhase2(state) {
    state.phase = 2;
    var mkt = state.plantMarket;
    var cheapest = mkt.current.slice().sort(function (a, b) { return a - b; })[0];
    mkt.discounted = cheapest;
    state.auction = {
      stillIn: state.order.slice(),
      offerSeat: state.order[0],
      sub: 'offer',
      plant: null,
      highBid: 0,
      highBidder: null,
      minBid: null,
      biddersLeft: [],
      turnSeat: null
    };
    pushLog(state, '=== ' + state.round + '라운드 / Step ' + state.step + ' / 2단계: 발전소 경매 시작 ===');
  }

  function currentOfferer(state) {
    return state.auction ? state.auction.offerSeat : null;
  }

  function actionOfferPlant(state, seat, plantNumber, bidAmount) {
    var a = state.auction;
    if (a.offerSeat !== seat || a.sub !== 'offer') throw new Error('지금은 발전소를 제시할 차례가 아닙니다.');
    if (state.plantMarket.current.indexOf(plantNumber) === -1) throw new Error('현재 시장에 없는 발전소입니다.');
    var minBid = (plantNumber === state.plantMarket.discounted) ? 1 : plantNumber;
    var bid = bidAmount != null ? bidAmount : minBid;
    if (bid < minBid) throw new Error('최소 ' + minBid + ' 이상 입찰해야 합니다.');
    if (state.players[seat].money < bid) throw new Error('보유 금액이 부족합니다.');
    a.plant = plantNumber;
    a.sub = 'bid';
    a.minBid = minBid;
    a.biddersLeft = a.stillIn.slice();
    a.highBid = bid;
    a.highBidder = seat;
    pushLog(state, state.players[seat].name + '님이 ' + plantNumber + '번 발전소를 ' + bid + '€에 경매 시작했습니다.');
    advanceOrResolveBid(state, seat);
  }

  function actionOfferPass(state, seat) {
    var a = state.auction;
    if (a.offerSeat !== seat || a.sub !== 'offer') throw new Error('지금은 발전소를 제시할 차례가 아닙니다.');
    if (state.firstRoundAuction) throw new Error('첫 라운드에는 반드시 발전소를 구매해야 합니다.');
    a.stillIn.splice(a.stillIn.indexOf(seat), 1);
    pushLog(state, state.players[seat].name + '님이 경매 제시를 포기했습니다.');
    a.offerSeat = a.stillIn.length ? nextActiveSeatAfter(state, seat, a.stillIn) : null;
    checkAuctionEnd(state);
  }

  function bidTurnSeat(state) {
    return state.auction ? state.auction.turnSeat : null;
  }

  function advanceOrResolveBid(state, actorSeat) {
    var a = state.auction;
    if (a.biddersLeft.length <= 1) { finishAuction(state, a.highBidder, a.highBid); return; }
    var next = nextActiveSeatAfter(state, actorSeat, a.biddersLeft);
    if (next == null || next === a.highBidder) { finishAuction(state, a.highBidder, a.highBid); return; }
    a.turnSeat = next;
  }

  function actionBid(state, seat, amount) {
    var a = state.auction;
    if (a.sub !== 'bid') throw new Error('지금은 입찰 단계가 아닙니다.');
    if (a.turnSeat !== seat) throw new Error('지금은 당신의 입찰 차례가 아닙니다.');
    var minNeeded = Math.max(a.minBid, a.highBid + 1);
    if (amount < minNeeded) throw new Error('최소 ' + minNeeded + ' 이상 입찰해야 합니다.');
    if (state.players[seat].money < amount) throw new Error('보유 금액이 부족합니다.');
    a.highBid = amount;
    a.highBidder = seat;
    pushLog(state, state.players[seat].name + '님이 ' + amount + '€ 입찰했습니다.');
    advanceOrResolveBid(state, seat);
  }

  function actionBidPass(state, seat) {
    var a = state.auction;
    if (a.sub !== 'bid') throw new Error('지금은 입찰 단계가 아닙니다.');
    if (a.turnSeat !== seat) throw new Error('지금은 당신의 입찰 차례가 아닙니다.');
    var idx = a.biddersLeft.indexOf(seat);
    a.biddersLeft.splice(idx, 1);
    pushLog(state, state.players[seat].name + '님이 입찰을 포기했습니다.');
    if (a.biddersLeft.length <= 1) { finishAuction(state, a.highBidder, a.highBid); return; }
    var next = nextActiveSeatAfter(state, seat, a.biddersLeft);
    if (next == null || next === a.highBidder) { finishAuction(state, a.highBidder, a.highBid); return; }
    a.turnSeat = next;
  }

  function finishAuction(state, winner, price) {
    var a = state.auction;
    var plantNum = a.plant;
    var wasOfferer = a.offerSeat === winner;
    state.players[winner].money -= price;
    state.players[winner].plants.push(plantNum);
    pushLog(state, state.players[winner].name + '님이 ' + plantNum + '번 발전소를 ' + price + '€에 낙찰받았습니다.');
    if (plantNum === state.plantMarket.discounted) state.plantMarket.discounted = null;

    // 최대 보유량 초과시 즉시 폐기
    var maxP = MAX_PLANTS(state.numPlayers);
    if (state.players[winner].plants.length > maxP) {
      var scrap = Math.min.apply(null, state.players[winner].plants.filter(function (n) { return n !== plantNum; }));
      state.players[winner].plants.splice(state.players[winner].plants.indexOf(scrap), 1);
      pushLog(state, state.players[winner].name + '님이 발전소 보유 한도를 넘어 ' + scrap + '번 발전소를 폐기했습니다.');
    }

    // 시장에서 제거하고 보충
    var mkt = state.plantMarket;
    mkt.current.splice(mkt.current.indexOf(plantNum), 1);
    refillMarketAfterPurchase(state);

    a.stillIn.splice(a.stillIn.indexOf(winner), 1);
    a.plant = null; a.sub = 'offer'; a.biddersLeft = []; a.turnSeat = null; a.highBid = 0; a.highBidder = null;

    if (a.stillIn.length === 0) {
      a.offerSeat = null;
    } else if (wasOfferer) {
      a.offerSeat = nextActiveSeatAfter(state, winner, a.stillIn);
    }
    // wasOfferer가 false면 제시자는 아직 못 샀으므로 a.offerSeat 그대로 유지 (다시 제시/포기 선택)
    checkAuctionEnd(state);
  }

  function checkAuctionEnd(state) {
    var a = state.auction;
    if (a.stillIn.length === 0) {
      endPhase2(state);
    }
  }

  function endPhase2(state) {
    if (state.firstRoundAuction) {
      state.firstRoundAuction = false;
      recomputeOrder(state);
    }
    state.plantMarket.discounted = null;
    applyStep3IfPending(state);
    state.auction = null;
    beginPhase3(state);
  }

  // ---------------- Phase 3: 자원 구매 ----------------
  function plantStorageCap(playerPlants, resource) {
    var cap = 0;
    playerPlants.forEach(function (n) {
      var d = PLANT_DEFS[n];
      if (!d) return;
      if (d.type === resource) cap += d.need * 2;
      if (d.type === 'hybrid' && (resource === 'coal' || resource === 'oil')) cap += d.need * 2;
    });
    return cap;
  }

  function beginPhase3(state) {
    state.phase = 3;
    state.resourceTurn = { orderIdx: state.order.length - 1 }; // 역순 시작
    pushLog(state, '=== 3단계: 자원 구매 ===');
  }

  function resourceTurnSeat(state) {
    if (!state.resourceTurn) return null;
    var idx = state.resourceTurn.orderIdx;
    if (idx < 0) return null;
    return state.order[idx];
  }

  function actionBuyResource(state, seat, resource, qty) {
    if (resourceTurnSeat(state) !== seat) throw new Error('지금은 당신의 자원 구매 차례가 아닙니다.');
    var p = state.players[seat];
    for (var i = 0; i < qty; i++) {
      var capNow = plantStorageCap(p.plants, resource);
      var heldNow = (resource === 'coal' || resource === 'oil') ? (p.stock.coal + p.stock.oil) : p.stock[resource];
      if (heldNow >= capNow) throw new Error('더 이상 저장할 공간이 없습니다.');
      var filled = state.resourceMarket[resource];
      if (filled <= 0) throw new Error('시장에 남은 ' + resource + '가 없습니다.');
      var emptyCount = RESOURCE_CAPACITY[resource] - filled;
      var price = LADDERS[resource][emptyCount];
      if (p.money < price) throw new Error('돈이 부족합니다.');
      p.money -= price;
      state.resourceMarket[resource] -= 1;
      p.stock[resource] += 1;
    }
    pushLog(state, state.players[seat].name + '님이 ' + resource + ' ' + qty + '개를 구매했습니다.');
  }

  function actionEndResourceTurn(state, seat) {
    if (resourceTurnSeat(state) !== seat) throw new Error('지금은 당신의 차례가 아닙니다.');
    state.resourceTurn.orderIdx -= 1;
    if (state.resourceTurn.orderIdx < 0) {
      state.resourceTurn = null;
      beginPhase4(state);
    }
  }

  // ---------------- Phase 4: 도시 건설 ----------------
  function beginPhase4(state) {
    state.phase = 4;
    state.buildTurn = { orderIdx: state.order.length - 1 };
    pushLog(state, '=== 4단계: 도시 건설 ===');
  }

  function buildTurnSeat(state) {
    if (!state.buildTurn) return null;
    var idx = state.buildTurn.orderIdx;
    if (idx < 0) return null;
    return state.order[idx];
  }

  function cityHouseCount(state, cityName) {
    return (state.cityOwners[cityName] || []).length;
  }

  function computeBuildCost(state, seat, cityName) {
    var owners = state.cityOwners[cityName] || [];
    if (owners.length >= state.step) return null; // 자리 없음
    if (owners.indexOf(seat) !== -1) return null; // 이미 소유
    var mySources = state.players[seat].cities;
    if (state.map.cityNames.indexOf(cityName) === -1) return null;
    var connCost = cheapestConnectionCost(mySources, cityName, state.map.cityNames);
    if (connCost === -1) return null;
    var tierCost = BUILD_TIER_COST[owners.length];
    return connCost + tierCost;
  }


  function actionBuildCity(state, seat, cityName) {
    if (buildTurnSeat(state) !== seat) throw new Error('지금은 당신의 건설 차례가 아닙니다.');
    if (state.map.cityNames.indexOf(cityName) === -1) throw new Error('플레이 지역 밖의 도시입니다.');
    var cost = computeBuildCost(state, seat, cityName);
    if (cost == null) throw new Error('이 도시에는 건설할 수 없습니다.');
    if (state.players[seat].money < cost) throw new Error('돈이 부족합니다. (' + cost + '€ 필요)');
    state.players[seat].money -= cost;
    state.players[seat].cities.push(cityName);
    if (!state.cityOwners[cityName]) state.cityOwners[cityName] = [];
    state.cityOwners[cityName].push(seat);
    var cityLabel=GERMANY.CITY_BY_ID[cityName] ? GERMANY.CITY_BY_ID[cityName].name : cityName;
    pushLog(state, state.players[seat].name + '님이 ' + cityLabel + '에 ' + cost + '€로 건설했습니다.');
  }

  function actionEndBuildTurn(state, seat) {
    if (buildTurnSeat(state) !== seat) throw new Error('지금은 당신의 차례가 아닙니다.');
    state.buildTurn.orderIdx -= 1;
    if (state.buildTurn.orderIdx < 0) {
      state.buildTurn = null;
      afterBuildPhase(state);
    }
  }

  function afterBuildPhase(state) {
    // Step2 트리거 체크
    var maxCities = 0;
    Object.keys(state.players).forEach(function (s) {
      maxCities = Math.max(maxCities, state.players[s].cities.length);
    });
    if (state.step === 1 && maxCities >= STEP2_TRIGGER[state.numPlayers]) {
      state.step = 2;
      var mkt = state.plantMarket;
      var pool = mkt.current.concat(mkt.future).sort(function (a, b) { return a - b; });
      pool.shift();
      while (pool.length < 8 && state.deck.length) {
        var d = state.deck.shift();
        if (d === 'STEP3') { handleStep3Drawn(state, 'step2trigger'); continue; }
        pool.push(d);
      }
      pool.sort(function (a, b) { return a - b; });
      mkt.current = pool.slice(0, 4);
      mkt.future = pool.slice(4, 8);
      pushLog(state, 'Step 2 시작! (가장 저렴한 발전소 1장을 교체했습니다)');
    }
    // 종료 조건 체크
    if (maxCities >= END_GAME_CITIES[state.numPlayers]) {
      state.gameOver = true;
      pushLog(state, '누군가 ' + maxCities + '개 도시를 연결하여 게임 종료 조건을 달성했습니다! 마지막 관료 단계를 진행합니다.');
    }
    beginPhase5(state);
  }

  // ---------------- Phase 5: 관료 단계 (자동 정산) ----------------
  function bestFireCombo(plants, stock, networkSize) {
    // 2^n 부분집합 완전탐색 (n<=4)
    var n = plants.length;
    var best = { subset: [], cities: 0, use: {} };
    for (var mask = 0; mask < (1 << n); mask++) {
      var need = { coal: 0, oil: 0, garbage: 0, uranium: 0 };
      var cities = 0;
      var subsetPlants = [];
      for (var i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          var d = PLANT_DEFS[plants[i]];
          subsetPlants.push(plants[i]);
          cities += d.cities;
          if (d.type === 'coal') need.coal += d.need;
          else if (d.type === 'oil') need.oil += d.need;
          else if (d.type === 'garbage') need.garbage += d.need;
          else if (d.type === 'uranium') need.uranium += d.need;
          else if (d.type === 'hybrid') need._hybrid = (need._hybrid || 0) + d.need;
        }
      }
      var feasible = need.coal <= stock.coal && need.garbage <= stock.garbage && need.uranium <= stock.uranium;
      if (feasible) {
        var remainCoalOil = (stock.coal - need.coal) + (stock.oil);
        feasible = (need._hybrid || 0) <= remainCoalOil && need.oil <= stock.oil + (stock.coal - need.coal);
        // 좀 더 정확히: coal+oil 총량으로 hybrid+oil 수요 커버 가능한지
        var totalCoalOilStock = stock.coal + stock.oil;
        var totalCoalOilNeed = need.coal + need.oil + (need._hybrid || 0);
        feasible = need.coal <= stock.coal && totalCoalOilNeed <= totalCoalOilStock;
      }
      var effectiveCities = Math.min(cities, networkSize);
      if (feasible && effectiveCities > best.cities) {
        best = { subset: subsetPlants, cities: effectiveCities, use: need, rawCities: cities };
      }
    }
    return best;
  }

  function beginPhase5(state) {
    state.phase = 5;
    pushLog(state, '=== 5단계: 관료 (정산) ===');
    var order = state.order; // 임의 순서로 처리해도 결과 동일 (자동 정산이므로)
    order.forEach(function (seat) {
      var p = state.players[seat];
      var combo = bestFireCombo(p.plants, p.stock, p.cities.length);
      // 자원 소모
      var need = combo.use || {};
      p.stock.coal -= Math.min(p.stock.coal, need.coal || 0);
      p.stock.garbage -= Math.min(p.stock.garbage, need.garbage || 0);
      p.stock.uranium -= Math.min(p.stock.uranium, need.uranium || 0);
      var hybridNeed = need._hybrid || 0;
      var oilNeed = need.oil || 0;
      var totalOilLikeNeed = hybridNeed + oilNeed;
      // 이미 coal 소모는 need.coal 만큼 위에서 처리됨. hybrid/oil 수요는 남은 coal+oil에서 충당
      var remainCoal = p.stock.coal, remainOil = p.stock.oil;
      var takeOilFirst = Math.min(remainOil, totalOilLikeNeed);
      remainOil -= takeOilFirst;
      var stillNeed = totalOilLikeNeed - takeOilFirst;
      var takeCoal = Math.min(remainCoal, stillNeed);
      remainCoal -= takeCoal;
      p.stock.oil = remainOil;
      p.stock.coal = remainCoal;

      var pay = payoutFor(combo.cities);
      p.money += pay;
      if (state.gameOver) p._finalPowered = combo.cities;
      pushLog(state, p.name + '님이 도시 ' + combo.cities + '개에 전력을 공급하고 ' + pay + '€를 받았습니다.');
    });

    if (state.gameOver) {
      finalizeWinner(state);
      return;
    }

    // 자원시장 보충
    var table = RESOURCE_REPLENISH[state.numPlayers];
    var stepIdx = state.step - 1;
    ['coal', 'oil', 'garbage', 'uranium'].forEach(function (res) {
      var amt = table[res][stepIdx];
      var bank = RESOURCE_CAPACITY[res] - state.resourceMarket[res] - totalHeldByPlayers(state, res);
      var add = Math.max(0, Math.min(amt, RESOURCE_CAPACITY[res] - state.resourceMarket[res], bank));
      state.resourceMarket[res] += add;
    });

    // 발전소 시장 갱신
    var mkt = state.plantMarket;
    if (state.step === 3) {
      var pool = mkt.current.slice().sort(function (a, b) { return a - b; });
      pool.shift();
      while (pool.length < 6 && state.deck.length) {
        var dd = state.deck.shift();
        if (dd === 'STEP3') continue; // 이미 Step3라 무시
        pool.push(dd);
      }
      mkt.current = pool.sort(function (a, b) { return a - b; }).slice(0, 6);
      mkt.future = [];
    } else {
      var pool2 = mkt.current.concat(mkt.future).sort(function (a, b) { return a - b; });
      var highest = pool2.pop();
      state.deck.push(highest); // 덱 맨 밑으로
      if (state.deck.length && state.deck[0] === 'STEP3') { /* no-op */ }
      while (pool2.length < 8 && state.deck.length) {
        var d3 = state.deck.shift();
        if (d3 === 'STEP3') { handleStep3Drawn(state, 'phase5'); continue; }
        pool2.push(d3);
      }
      pool2.sort(function (a, b) { return a - b; });
      mkt.current = pool2.slice(0, 4);
      mkt.future = pool2.slice(4, 8);
    }

    applyStep3IfPending(state);
    state.round += 1;
    recomputeOrder(state);
    beginPhase2(state);
  }

  function totalHeldByPlayers(state, res) {
    var total = 0;
    Object.keys(state.players).forEach(function (s) { total += state.players[s].stock[res]; });
    return total;
  }

  function finalizeWinner(state) {
    var best = null;
    Object.keys(state.players).forEach(function (s) {
      var p = state.players[s];
      var powered = p._finalPowered != null ? p._finalPowered : 0;
      if (!best || powered > best.powered ||
        (powered === best.powered && p.money > state.players[best.seat].money)) {
        best = { seat: Number(s), powered: powered };
      }
    });
    state.winner = best ? best.seat : null;
    pushLog(state, '게임 종료! 승자: ' + (state.winner != null ? state.players[state.winner].name : '-'));
  }

  // ============================================================
  // 액션 디스패치 (온라인/솔로 공용)
  // ============================================================
  var ACTIONS = {
    offerPlant: function (s, seat, args) { actionOfferPlant(s, seat, args.plant, args.bid); },
    offerPass: function (s, seat) { actionOfferPass(s, seat); },
    bid: function (s, seat, args) { actionBid(s, seat, args.amount); },
    bidPass: function (s, seat) { actionBidPass(s, seat); },
    buyResource: function (s, seat, args) { actionBuyResource(s, seat, args.resource, args.qty); },
    endResourceTurn: function (s, seat) { actionEndResourceTurn(s, seat); },
    buildCity: function (s, seat, args) { actionBuildCity(s, seat, args.city); },
    endBuildTurn: function (s, seat) { actionEndBuildTurn(s, seat); }
  };

  function syncDerivedTurn(state) {
    var seats = actingSeats(state);
    state.currentSeat = seats.length && seats[0] != null ? seats[0] : null;
    return state;
  }

  function applyAction(state, action) {
    var next = clone(state);
    if (next.kind !== STATE_KIND) throw new Error('이 방은 이전 파워그리드 β 상태입니다. 방장이 독일맵 v3로 다시 시작해야 합니다.');
    var fn = ACTIONS[action.type];
    if (!fn) throw new Error('알 수 없는 액션: ' + action.type);
    fn(next, action.seat, action.args || {});
    syncDerivedTurn(next);
    return next;
  }

  function actingSeats(state) {
    if (state.gameOver) return [];
    if (state.phase === 2) {
      var a = state.auction;
      if (!a) return [];
      if (a.sub === 'offer') return [currentOfferer(state)];
      return [bidTurnSeat(state)];
    }
    if (state.phase === 3) return [resourceTurnSeat(state)];
    if (state.phase === 4) return [buildTurnSeat(state)];
    return [];
  }

  // ============================================================
  // Export
  // ============================================================
  return {
    STATE_KIND: STATE_KIND,
    MAP: MAP,
    GERMANY: GERMANY,
    BOARD_DEFS: BOARD_DEFS,
    PLANT_DEFS: PLANT_DEFS,
    RESOURCE_CAPACITY: RESOURCE_CAPACITY,
    LADDERS: LADDERS,
    BUILD_TIER_COST: BUILD_TIER_COST,
    PAYOUT_TABLE: PAYOUT_TABLE,
    STEP2_TRIGGER: STEP2_TRIGGER,
    END_GAME_CITIES: END_GAME_CITIES,
    MAX_PLANTS: MAX_PLANTS,
    newGame: newGame,
    applyAction: applyAction,
    actingSeats: actingSeats,
    computeBuildCost: computeBuildCost,
    syncDerivedTurn: syncDerivedTurn,
    cheapestConnectionCost: cheapestConnectionCost,
    validateRegionSelection: validateRegionSelection,
    defaultRegions: defaultRegions,
    plantStorageCap: plantStorageCap,
    resourceTurnSeat: resourceTurnSeat,
    buildTurnSeat: buildTurnSeat,
    currentOfferer: currentOfferer,
    bidTurnSeat: bidTurnSeat,
    payoutFor: payoutFor,
    clone: clone
  };
});
