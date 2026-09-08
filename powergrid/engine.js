/*!
 * BoardMate Power Grid Recharged - Multiplayer Core Engine v26
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

  var STATE_KIND = 'powergrid-v11-maps-boardmate';
  var RULES_REV = 'powergrid-recharged-v26';

  // ============================================================
  // 상수 데이터
  // ============================================================

  var PAYOUT_TABLE = [10, 22, 33, 44, 54, 64, 73, 82, 90, 98, 105, 112, 118, 124, 129, 134, 138, 142, 145, 148, 150];
  function payoutFor(cities) {
    if (cities >= 20) return 150;
    return PAYOUT_TABLE[Math.max(0, Math.min(20, cities))];
  }

  var STEP2_TRIGGER = { 2: 7, 3: 7, 4: 7, 5: 7, 6: 6 };
  var END_GAME_CITIES = { 2: 18, 3: 17, 4: 17, 5: 15, 6: 14 };
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

  var MAX_PLANTS = function () { return 3; };

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

  function stringHash32(s) {
    s = String(s == null ? '' : s);
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function reshuffleDeckBelowStep3(state, reason) {
    var seed = stringHash32([
      reason || 'step3', state.round || 0, state.step || 0,
      (state.deck || []).join(','),
      (state.plantMarket.current || []).join(','),
      (state.plantMarket.future || []).join(',')
    ].join('|'));
    state.deck = shuffle(state.deck || [], mulberry32(seed));
  }

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
    germany: {
      id:'germany', name:'독일', mode:'leaflet',
      featureTitle:'독일맵 특징',
      rules:{ uraniumStopOnPlant39:true, usaCoalStorage:false, koreaSplitMarkets:false },
      features:[
        '재충전 규칙: 누군가 시장에 나온 39번 발전소를 구매하면 이후 매 정리 단계 우라늄 보충이 영구 중단됩니다.',
        '39번 발전소가 팔리지 않거나 등장하지 않으면 우라늄 보충 중단은 적용되지 않습니다.',
        '6개 권역 중 플레이 인원에 따라 서로 연결된 3~5개 권역만 사용합니다.',
        '선택하지 않은 권역의 도시는 건설할 수 없고 연결 경로 계산에도 사용하지 않습니다.',
        '실제 지리 지도를 배경으로 42개 도시와 83개 연결 데이터를 표시합니다. 사용하지 않는 지역은 검정 음영 대신 도시·연결선을 흐리게 표시합니다.'
      ]
    },
    usa: {
      id:'usa', name:'미국', mode:'leaflet',
      featureTitle:'미국맵 특징',
      rules:{ uraniumStopOnPlant39:false, usaCoalStorage:true, koreaSplitMarkets:false },
      features:[
        '실물 미국 보드 사진을 기준으로 재작성한 42개 도시 · 87개 연결 데이터를 사용합니다. 각 권역은 7개 도시입니다.',
        '미국 석탄 저장고: 시장과 별도로 저장고의 석탄을 1개당 8 Elektro로 구매할 수 있습니다.',
        '정리 단계의 석탄 보충은 저장고의 석탄을 시장으로 되돌립니다.',
        '연결비는 지도 선 위 숫자 배지와 화면 아래 연결비 표에서 확인할 수 있습니다.'
      ]
    },
    korea: {
      id:'korea', name:'한국', mode:'leaflet',
      featureTitle:'한국맵 특징',
      rules:{ uraniumStopOnPlant39:false, usaCoalStorage:false, koreaSplitMarkets:true },
      features:[
        '실물 한국 보드 사진을 기준으로 42개 도시 · 81개 연결 구조로 재작성했습니다. 각 권역은 7개 도시입니다.',
        '실제 한국 지도를 배경으로 각 도시의 위경도 좌표에 마커를 표시합니다.',
        '제주 권역은 전라 권역의 목포에서 19원으로 연결됩니다.',
        '연결비는 지도 선 위 숫자 배지와 화면 아래 연결비 표에서 확인할 수 있습니다.'
      ]
    }
  };

  function makeGeneratedMap(boardId, boardName, regionNames, cityNames, edgesList) {
    var regionIds=['r0','r1','r2','r3','r4','r5'];
    var colors=['#6f9d8a','#8b7657','#a7615f','#b6a03e','#7088a8','#83718f'];
    var REGIONS={}, CITIES=[], CITY_BY_ID={};
    regionIds.forEach(function(rid,i){REGIONS[rid]={id:rid,name:regionNames[i],shortName:regionNames[i].replace(/^[^·]+·\s*/,''),color:colors[i]};});
    cityNames.forEach(function(name,i){
      var region=Math.floor(i/7), pos=i%7;
      var col=region%3, row=Math.floor(region/3);
      var x=75+col*215+(pos%2)*72+Math.floor(pos/2)*18;
      var y=85+row*360+Math.floor(pos/2)*72+(pos%2)*24;
      var id=(boardId+'_'+name).toUpperCase().replace(/[^A-Z0-9가-힣]+/g,'_');
      var c={id:id,name:name,region:regionIds[region],x:x,y:y}; CITIES.push(c); CITY_BY_ID[id]=c;
    });
    var EDGES=edgesList.map(function(e){return {a:CITIES[e[0]].id,b:CITIES[e[1]].id,cost:e[2]};});
    function citiesForRegions(ids){var set={};(ids||[]).forEach(function(r){set[r]=true;});return CITIES.filter(function(c){return set[c.region];}).map(function(c){return c.id;});}
    function regionAdjacency(){var out={};regionIds.forEach(function(r){out[r]=[];});EDGES.forEach(function(e){var ra=CITY_BY_ID[e.a].region,rb=CITY_BY_ID[e.b].region;if(ra===rb)return;if(out[ra].indexOf(rb)<0)out[ra].push(rb);if(out[rb].indexOf(ra)<0)out[rb].push(ra);});return out;}
    var REGION_ADJ=regionAdjacency();
    function regionsConnected(ids){ids=(ids||[]).filter(function(r,i,a){return REGIONS[r]&&a.indexOf(r)===i;}); if(!ids.length)return false; var allow={},seen={},q=[ids[0]];ids.forEach(function(r){allow[r]=true;});seen[ids[0]]=true;while(q.length){var r=q.shift();(REGION_ADJ[r]||[]).forEach(function(n){if(allow[n]&&!seen[n]){seen[n]=true;q.push(n);}});}return ids.every(function(r){return seen[r];});}
    function normalizeCity(v){var raw=String(v||'').trim().toUpperCase();for(var i=0;i<CITIES.length;i++){if(CITIES[i].id===raw || CITIES[i].name.toUpperCase()===raw)return CITIES[i].id;}return null;}
    return {BOARD_WIDTH:675,BOARD_HEIGHT:900,REGIONS:REGIONS,REGION_ORDER:regionIds,REGION_ADJ:REGION_ADJ,REGION_SHADE_POLYGONS:null,CITIES:CITIES,CITY_BY_ID:CITY_BY_ID,EDGES:EDGES,citiesForRegions:citiesForRegions,regionsConnected:regionsConnected,normalizeCity:normalizeCity,abstract:true,boardName:boardName};
  }

  function generatedEdges(target){
    var e=[], seen={};
    function add(a,b,c){ var k=Math.min(a,b)+'-'+Math.max(a,b); if(a===b||seen[k]) return false; seen[k]=true; e.push([a,b,c]); return true; }
    for(var r=0;r<6;r++){var o=r*7; for(var i=0;i<6;i++) add(o+i,o+i+1,3+((i+r)%5)*2);}
    [[0,7,7],[3,10,12],[7,14,8],[11,18,14],[14,21,9],[18,25,13],[21,28,10],[25,32,11],[28,35,12],[32,39,15],[5,12,18],[12,19,16],[19,26,13],[26,33,17],[9,16,12],[16,23,15],[23,30,14],[30,37,16],[34,40,8],[36,41,10]].forEach(function(x){add(x[0],x[1],x[2]);});
    // 추상 지도용 보강 연결: 공식 보드 이미지가 추가되기 전까지 지역간 연결비 표와 최단경로가 풍부하게 작동하도록 한다.
    var offsets=[7,8,6,14,13,15,2,5,9,11,16];
    for(var oi=0; e.length<(target||56) && oi<offsets.length; oi++){
      var d=offsets[oi];
      for(var a=0; e.length<(target||56) && a+d<42; a++){
        var b=a+d;
        var cost=4 + ((a*7 + b*3 + d) % 18);
        add(a,b,cost);
      }
    }
    return e.slice(0,target||e.length);
  }

  // ============================================================
  // V26 real-board map rebuild: USA + Korea
  // ============================================================
  var USA_MAP; (function buildUSAMap() {
    var regionIds = ['r0','r1','r2','r3','r4','r5'];
    var REGIONS = {
      r0:{ id:'r0', name:'북서부 · 보라', shortName:'북서부', color:'#8e7cc3' },
      r1:{ id:'r1', name:'서남부 · 청록', shortName:'서남부', color:'#4aa3a2' },
      r2:{ id:'r2', name:'북중부 · 노랑', shortName:'북중부', color:'#d7b441' },
      r3:{ id:'r3', name:'남중부 · 빨강', shortName:'남중부', color:'#c95f5f' },
      r4:{ id:'r4', name:'북동부 · 갈색', shortName:'북동부', color:'#9b7558' },
      r5:{ id:'r5', name:'남동부 · 초록', shortName:'남동부', color:'#6d9f59' },
    };
    var cityDefs = [
      {id:"USA_SEATTLE",name:"Seattle",lat:47.60800,lng:-122.33500,region:'r0'},
      {id:"USA_PORTLAND",name:"Portland",lat:45.52300,lng:-122.67600,region:'r0'},
      {id:"USA_BOISE",name:"Boise",lat:43.61500,lng:-116.20200,region:'r0'},
      {id:"USA_BILLINGS",name:"Billings",lat:45.78300,lng:-108.50000,region:'r0'},
      {id:"USA_CHEYENNE",name:"Cheyenne",lat:41.14000,lng:-104.82000,region:'r0'},
      {id:"USA_DENVER",name:"Denver",lat:39.73900,lng:-104.98400,region:'r0'},
      {id:"USA_OMAHA",name:"Omaha",lat:41.25700,lng:-95.99400,region:'r0'},
      {id:"USA_SANFRANCISCO",name:"San Francisco",lat:37.77400,lng:-122.41900,region:'r1'},
      {id:"USA_LOSANGELES",name:"Los Angeles",lat:34.05200,lng:-118.24400,region:'r1'},
      {id:"USA_SANDIEGO",name:"San Diego",lat:32.71600,lng:-117.16500,region:'r1'},
      {id:"USA_LASVEGAS",name:"Las Vegas",lat:36.17000,lng:-115.14000,region:'r1'},
      {id:"USA_SALTLAKE",name:"Salt Lake",lat:40.76100,lng:-111.89100,region:'r1'},
      {id:"USA_SANTAFE",name:"Santa Fe",lat:35.68700,lng:-105.94400,region:'r1'},
      {id:"USA_PHOENIX",name:"Phoenix",lat:33.44800,lng:-112.07400,region:'r1'},
      {id:"USA_FARGO",name:"Fargo",lat:46.87700,lng:-96.78900,region:'r2'},
      {id:"USA_DULUTH",name:"Duluth",lat:46.78600,lng:-92.10000,region:'r2'},
      {id:"USA_MINNEAPOLIS",name:"Minneapolis",lat:44.97900,lng:-93.26500,region:'r2'},
      {id:"USA_CHICAGO",name:"Chicago",lat:41.87800,lng:-87.63000,region:'r2'},
      {id:"USA_STLOUIS",name:"St. Louis",lat:38.62700,lng:-90.19800,region:'r2'},
      {id:"USA_CINCINNATI",name:"Cincinnati",lat:39.10300,lng:-84.51200,region:'r2'},
      {id:"USA_KNOXVILLE",name:"Knoxville",lat:35.96100,lng:-83.92100,region:'r2'},
      {id:"USA_KANSASCITY",name:"Kansas City",lat:39.09900,lng:-94.57800,region:'r3'},
      {id:"USA_OKLAHOMACITY",name:"Oklahoma City",lat:35.46700,lng:-97.51600,region:'r3'},
      {id:"USA_DALLAS",name:"Dallas",lat:32.77600,lng:-96.79700,region:'r3'},
      {id:"USA_HOUSTON",name:"Houston",lat:29.76000,lng:-95.36900,region:'r3'},
      {id:"USA_MEMPHIS",name:"Memphis",lat:35.14900,lng:-90.04800,region:'r3'},
      {id:"USA_NEWORLEANS",name:"New Orleans",lat:29.95100,lng:-90.07100,region:'r3'},
      {id:"USA_BIRMINGHAM",name:"Birmingham",lat:33.52000,lng:-86.80200,region:'r3'},
      {id:"USA_DETROIT",name:"Detroit",lat:42.33100,lng:-83.04600,region:'r4'},
      {id:"USA_BUFFALO",name:"Buffalo",lat:42.88700,lng:-78.87900,region:'r4'},
      {id:"USA_PITTSBURGH",name:"Pittsburgh",lat:40.44100,lng:-79.99600,region:'r4'},
      {id:"USA_BOSTON",name:"Boston",lat:42.36000,lng:-71.05900,region:'r4'},
      {id:"USA_NEWYORK",name:"New York",lat:40.71300,lng:-74.00600,region:'r4'},
      {id:"USA_PHILADELPHIA",name:"Philadelphia",lat:39.95200,lng:-75.16400,region:'r4'},
      {id:"USA_WASHINGTON",name:"Washington",lat:38.90700,lng:-77.03700,region:'r4'},
      {id:"USA_NORFOLK",name:"Norfolk",lat:36.85100,lng:-76.28600,region:'r5'},
      {id:"USA_RALEIGH",name:"Raleigh",lat:35.77900,lng:-78.63800,region:'r5'},
      {id:"USA_ATLANTA",name:"Atlanta",lat:33.74900,lng:-84.38800,region:'r5'},
      {id:"USA_SAVANNAH",name:"Savannah",lat:32.08000,lng:-81.10000,region:'r5'},
      {id:"USA_JACKSONVILLE",name:"Jacksonville",lat:30.33200,lng:-81.65600,region:'r5'},
      {id:"USA_TAMPA",name:"Tampa",lat:27.95000,lng:-82.45700,region:'r5'},
      {id:"USA_MIAMI",name:"Miami",lat:25.77500,lng:-80.20900,region:'r5'},
    ];
    var edgeDefs = [
      {a:"USA_SEATTLE",b:"USA_PORTLAND",cost:3},
      {a:"USA_SEATTLE",b:"USA_BOISE",cost:12},
      {a:"USA_SEATTLE",b:"USA_BILLINGS",cost:9},
      {a:"USA_PORTLAND",b:"USA_BOISE",cost:13},
      {a:"USA_PORTLAND",b:"USA_SANFRANCISCO",cost:24},
      {a:"USA_BOISE",b:"USA_SANFRANCISCO",cost:23},
      {a:"USA_BOISE",b:"USA_SALTLAKE",cost:8},
      {a:"USA_BOISE",b:"USA_BILLINGS",cost:12},
      {a:"USA_BOISE",b:"USA_CHEYENNE",cost:24},
      {a:"USA_BILLINGS",b:"USA_FARGO",cost:17},
      {a:"USA_BILLINGS",b:"USA_MINNEAPOLIS",cost:18},
      {a:"USA_BILLINGS",b:"USA_CHEYENNE",cost:9},
      {a:"USA_CHEYENNE",b:"USA_MINNEAPOLIS",cost:18},
      {a:"USA_CHEYENNE",b:"USA_OMAHA",cost:14},
      {a:"USA_CHEYENNE",b:"USA_DENVER",cost:0},
      {a:"USA_DENVER",b:"USA_SALTLAKE",cost:21},
      {a:"USA_DENVER",b:"USA_SANTAFE",cost:13},
      {a:"USA_DENVER",b:"USA_KANSASCITY",cost:16},
      {a:"USA_SANFRANCISCO",b:"USA_SALTLAKE",cost:27},
      {a:"USA_SANFRANCISCO",b:"USA_LASVEGAS",cost:14},
      {a:"USA_SANFRANCISCO",b:"USA_LOSANGELES",cost:9},
      {a:"USA_SALTLAKE",b:"USA_LASVEGAS",cost:18},
      {a:"USA_SALTLAKE",b:"USA_SANTAFE",cost:28},
      {a:"USA_LASVEGAS",b:"USA_LOSANGELES",cost:9},
      {a:"USA_LASVEGAS",b:"USA_SANDIEGO",cost:9},
      {a:"USA_LASVEGAS",b:"USA_PHOENIX",cost:15},
      {a:"USA_LASVEGAS",b:"USA_SANTAFE",cost:27},
      {a:"USA_LOSANGELES",b:"USA_SANDIEGO",cost:3},
      {a:"USA_SANDIEGO",b:"USA_PHOENIX",cost:14},
      {a:"USA_PHOENIX",b:"USA_SANTAFE",cost:18},
      {a:"USA_SANTAFE",b:"USA_KANSASCITY",cost:16},
      {a:"USA_SANTAFE",b:"USA_OKLAHOMACITY",cost:15},
      {a:"USA_SANTAFE",b:"USA_DALLAS",cost:16},
      {a:"USA_SANTAFE",b:"USA_HOUSTON",cost:21},
      {a:"USA_FARGO",b:"USA_DULUTH",cost:6},
      {a:"USA_FARGO",b:"USA_MINNEAPOLIS",cost:6},
      {a:"USA_DULUTH",b:"USA_MINNEAPOLIS",cost:5},
      {a:"USA_DULUTH",b:"USA_DETROIT",cost:15},
      {a:"USA_MINNEAPOLIS",b:"USA_CHICAGO",cost:8},
      {a:"USA_MINNEAPOLIS",b:"USA_OMAHA",cost:8},
      {a:"USA_OMAHA",b:"USA_CHICAGO",cost:13},
      {a:"USA_OMAHA",b:"USA_KANSASCITY",cost:5},
      {a:"USA_CHICAGO",b:"USA_KANSASCITY",cost:8},
      {a:"USA_CHICAGO",b:"USA_STLOUIS",cost:10},
      {a:"USA_CHICAGO",b:"USA_CINCINNATI",cost:7},
      {a:"USA_CHICAGO",b:"USA_DETROIT",cost:7},
      {a:"USA_KANSASCITY",b:"USA_STLOUIS",cost:6},
      {a:"USA_KANSASCITY",b:"USA_OKLAHOMACITY",cost:8},
      {a:"USA_KANSASCITY",b:"USA_MEMPHIS",cost:12},
      {a:"USA_STLOUIS",b:"USA_CINCINNATI",cost:12},
      {a:"USA_STLOUIS",b:"USA_MEMPHIS",cost:7},
      {a:"USA_STLOUIS",b:"USA_ATLANTA",cost:12},
      {a:"USA_OKLAHOMACITY",b:"USA_MEMPHIS",cost:14},
      {a:"USA_OKLAHOMACITY",b:"USA_DALLAS",cost:3},
      {a:"USA_DALLAS",b:"USA_MEMPHIS",cost:12},
      {a:"USA_DALLAS",b:"USA_HOUSTON",cost:5},
      {a:"USA_DALLAS",b:"USA_NEWORLEANS",cost:12},
      {a:"USA_MEMPHIS",b:"USA_NEWORLEANS",cost:7},
      {a:"USA_MEMPHIS",b:"USA_BIRMINGHAM",cost:6},
      {a:"USA_HOUSTON",b:"USA_NEWORLEANS",cost:8},
      {a:"USA_NEWORLEANS",b:"USA_BIRMINGHAM",cost:11},
      {a:"USA_NEWORLEANS",b:"USA_JACKSONVILLE",cost:16},
      {a:"USA_BIRMINGHAM",b:"USA_ATLANTA",cost:3},
      {a:"USA_BIRMINGHAM",b:"USA_JACKSONVILLE",cost:9},
      {a:"USA_DETROIT",b:"USA_BUFFALO",cost:7},
      {a:"USA_DETROIT",b:"USA_PITTSBURGH",cost:6},
      {a:"USA_DETROIT",b:"USA_CINCINNATI",cost:4},
      {a:"USA_BUFFALO",b:"USA_PITTSBURGH",cost:7},
      {a:"USA_BUFFALO",b:"USA_NEWYORK",cost:8},
      {a:"USA_PITTSBURGH",b:"USA_CINCINNATI",cost:7},
      {a:"USA_PITTSBURGH",b:"USA_WASHINGTON",cost:6},
      {a:"USA_PITTSBURGH",b:"USA_NEWYORK",cost:7},
      {a:"USA_NEWYORK",b:"USA_BOSTON",cost:3},
      {a:"USA_NEWYORK",b:"USA_PHILADELPHIA",cost:0},
      {a:"USA_PHILADELPHIA",b:"USA_WASHINGTON",cost:3},
      {a:"USA_CINCINNATI",b:"USA_KNOXVILLE",cost:6},
      {a:"USA_CINCINNATI",b:"USA_RALEIGH",cost:15},
      {a:"USA_KNOXVILLE",b:"USA_ATLANTA",cost:5},
      {a:"USA_WASHINGTON",b:"USA_NORFOLK",cost:5},
      {a:"USA_WASHINGTON",b:"USA_RALEIGH",cost:7},
      {a:"USA_NORFOLK",b:"USA_RALEIGH",cost:3},
      {a:"USA_ATLANTA",b:"USA_RALEIGH",cost:7},
      {a:"USA_ATLANTA",b:"USA_SAVANNAH",cost:7},
      {a:"USA_RALEIGH",b:"USA_SAVANNAH",cost:7},
      {a:"USA_SAVANNAH",b:"USA_JACKSONVILLE",cost:0},
      {a:"USA_JACKSONVILLE",b:"USA_TAMPA",cost:4},
      {a:"USA_TAMPA",b:"USA_MIAMI",cost:4},
    ];
    var CITY_BY_ID={}; cityDefs.forEach(function(c){CITY_BY_ID[c.id]=c;});
    function regionAdjacency(){var out={};regionIds.forEach(function(r){out[r]=[];});edgeDefs.forEach(function(e){var ra=CITY_BY_ID[e.a].region,rb=CITY_BY_ID[e.b].region;if(ra===rb)return;if(out[ra].indexOf(rb)<0)out[ra].push(rb);if(out[rb].indexOf(ra)<0)out[rb].push(ra);});return out;}
    var REGION_ADJ=regionAdjacency();
    function regionsConnected(ids){ids=(ids||[]).filter(function(r,i,a){return REGIONS[r]&&a.indexOf(r)===i;});if(!ids.length)return false;var allow={},seen={},q=[ids[0]];ids.forEach(function(r){allow[r]=true;});seen[ids[0]]=true;while(q.length){var r=q.shift();(REGION_ADJ[r]||[]).forEach(function(n){if(allow[n]&&!seen[n]){seen[n]=true;q.push(n);}});}return ids.every(function(r){return seen[r];});}
    function citiesForRegions(ids){var set={};(ids||[]).forEach(function(r){set[r]=true;});return cityDefs.filter(function(c){return set[c.region];}).map(function(c){return c.id;});}
    function normalizeCity(v){var raw=String(v||'').trim().toUpperCase();for(var i=0;i<cityDefs.length;i++){if(cityDefs[i].id===raw||cityDefs[i].name.toUpperCase()===raw)return cityDefs[i].id;}return null;}
    USA_MAP={BOARD_WIDTH:900,BOARD_HEIGHT:900,REGIONS:REGIONS,REGION_ORDER:regionIds,REGION_ADJ:REGION_ADJ,REGION_SHADE_POLYGONS:null,CITIES:cityDefs,CITY_BY_ID:CITY_BY_ID,EDGES:edgeDefs,citiesForRegions:citiesForRegions,regionsConnected:regionsConnected,normalizeCity:normalizeCity,abstract:false,boardName:'미국',GEO_CENTER:[38.5,-96.5],GEO_ZOOM:4,GEO_BOUNDS:[[24.0,-125.5],[50.5,-66.0]]};
  })();

  var KOREA_MAP; (function buildKOREAMap() {
    var regionIds = ['r0','r1','r2','r3','r4','r5'];
    var REGIONS = {
      r0:{ id:'r0', name:'북서 · 연보라', shortName:'북서', color:'#caa6d8' },
      r1:{ id:'r1', name:'북동 · 적갈', shortName:'북동', color:'#b86b6b' },
      r2:{ id:'r2', name:'수도권 · 보라', shortName:'수도권', color:'#9b78b3' },
      r3:{ id:'r3', name:'중동부 · 갈색', shortName:'중동부', color:'#9c8169' },
      r4:{ id:'r4', name:'호남 · 초록', shortName:'호남', color:'#6e9f62' },
      r5:{ id:'r5', name:'영남 · 노랑', shortName:'영남', color:'#d5bd62' },
    };
    var cityDefs = [
      {id:"KR_01",name:"신의주",lat:40.10000,lng:124.40000,region:'r0'},
      {id:"KR_02",name:"강계",lat:40.97000,lng:126.60000,region:'r0'},
      {id:"KR_03",name:"안주",lat:39.62000,lng:125.66000,region:'r0'},
      {id:"KR_04",name:"평양",lat:39.04000,lng:125.76000,region:'r0'},
      {id:"KR_05",name:"남포",lat:38.74000,lng:125.40000,region:'r0'},
      {id:"KR_06",name:"해주",lat:38.04000,lng:125.71000,region:'r0'},
      {id:"KR_07",name:"개성",lat:37.97000,lng:126.55000,region:'r0'},
      {id:"KR_08",name:"혜산",lat:41.40000,lng:128.18000,region:'r1'},
      {id:"KR_09",name:"청진",lat:41.78000,lng:129.78000,region:'r1'},
      {id:"KR_10",name:"나진",lat:42.25000,lng:130.30000,region:'r1'},
      {id:"KR_11",name:"김책",lat:40.67000,lng:129.20000,region:'r1'},
      {id:"KR_12",name:"함흥",lat:39.91000,lng:127.54000,region:'r1'},
      {id:"KR_13",name:"원산",lat:39.15000,lng:127.44000,region:'r1'},
      {id:"KR_14",name:"신포",lat:40.03000,lng:128.19000,region:'r1'},
      {id:"KR_15",name:"인천",lat:37.46000,lng:126.71000,region:'r2'},
      {id:"KR_16",name:"고양",lat:37.66000,lng:126.83000,region:'r2'},
      {id:"KR_17",name:"서울",lat:37.57000,lng:126.98000,region:'r2'},
      {id:"KR_18",name:"안양",lat:37.39000,lng:126.96000,region:'r2'},
      {id:"KR_19",name:"수원",lat:37.26000,lng:127.03000,region:'r2'},
      {id:"KR_20",name:"춘천",lat:37.88000,lng:127.73000,region:'r2'},
      {id:"KR_21",name:"용인",lat:37.24000,lng:127.18000,region:'r2'},
      {id:"KR_22",name:"원주",lat:37.34000,lng:127.92000,region:'r3'},
      {id:"KR_23",name:"강릉",lat:37.75000,lng:128.88000,region:'r3'},
      {id:"KR_24",name:"동해",lat:37.52000,lng:129.11000,region:'r3'},
      {id:"KR_25",name:"삼척",lat:37.45000,lng:129.17000,region:'r3'},
      {id:"KR_26",name:"제천",lat:37.13000,lng:128.19000,region:'r3'},
      {id:"KR_27",name:"충주",lat:36.99000,lng:127.93000,region:'r3'},
      {id:"KR_28",name:"안동",lat:36.57000,lng:128.73000,region:'r5'},
      {id:"KR_29",name:"청주",lat:36.64000,lng:127.49000,region:'r4'},
      {id:"KR_30",name:"대전",lat:36.35000,lng:127.38000,region:'r4'},
      {id:"KR_31",name:"전주",lat:35.82000,lng:127.15000,region:'r4'},
      {id:"KR_32",name:"광주",lat:35.16000,lng:126.85000,region:'r4'},
      {id:"KR_33",name:"나주",lat:35.02000,lng:126.72000,region:'r4'},
      {id:"KR_34",name:"제주",lat:33.50000,lng:126.53000,region:'r4'},
      {id:"KR_35",name:"속초",lat:38.20700,lng:128.59100,region:'r3'},
      {id:"KR_36",name:"상주",lat:36.41000,lng:128.16000,region:'r5'},
      {id:"KR_37",name:"대구",lat:35.87000,lng:128.60000,region:'r5'},
      {id:"KR_38",name:"진주",lat:35.18000,lng:128.11000,region:'r4'},
      {id:"KR_39",name:"부산",lat:35.18000,lng:129.08000,region:'r5'},
      {id:"KR_40",name:"포항",lat:36.03000,lng:129.37000,region:'r5'},
      {id:"KR_41",name:"경주",lat:35.86000,lng:129.22000,region:'r5'},
      {id:"KR_42",name:"울산",lat:35.54000,lng:129.31000,region:'r5'},
    ];
    var edgeDefs = [
      {a:"KR_01",b:"KR_02",cost:25},
      {a:"KR_01",b:"KR_03",cost:13},
      {a:"KR_02",b:"KR_03",cost:22},
      {a:"KR_02",b:"KR_04",cost:19},
      {a:"KR_02",b:"KR_08",cost:20},
      {a:"KR_03",b:"KR_04",cost:20},
      {a:"KR_03",b:"KR_05",cost:10},
      {a:"KR_04",b:"KR_05",cost:7},
      {a:"KR_04",b:"KR_06",cost:23},
      {a:"KR_04",b:"KR_13",cost:11},
      {a:"KR_04",b:"KR_08",cost:23},
      {a:"KR_05",b:"KR_06",cost:5},
      {a:"KR_05",b:"KR_07",cost:4},
      {a:"KR_06",b:"KR_07",cost:8},
      {a:"KR_06",b:"KR_17",cost:14},
      {a:"KR_07",b:"KR_15",cost:8},
      {a:"KR_07",b:"KR_16",cost:7},
      {a:"KR_08",b:"KR_09",cost:18},
      {a:"KR_08",b:"KR_12",cost:14},
      {a:"KR_09",b:"KR_10",cost:8},
      {a:"KR_09",b:"KR_11",cost:4},
      {a:"KR_11",b:"KR_12",cost:16},
      {a:"KR_12",b:"KR_13",cost:17},
      {a:"KR_13",b:"KR_14",cost:11},
      {a:"KR_14",b:"KR_11",cost:18},
      {a:"KR_14",b:"KR_12",cost:19},
      {a:"KR_13",b:"KR_20",cost:18},
      {a:"KR_13",b:"KR_17",cost:18},
      {a:"KR_15",b:"KR_16",cost:0},
      {a:"KR_15",b:"KR_18",cost:4},
      {a:"KR_16",b:"KR_17",cost:0},
      {a:"KR_16",b:"KR_19",cost:2},
      {a:"KR_17",b:"KR_18",cost:0},
      {a:"KR_17",b:"KR_20",cost:8},
      {a:"KR_17",b:"KR_22",cost:9},
      {a:"KR_18",b:"KR_19",cost:3},
      {a:"KR_18",b:"KR_21",cost:10},
      {a:"KR_19",b:"KR_21",cost:2},
      {a:"KR_19",b:"KR_29",cost:10},
      {a:"KR_21",b:"KR_22",cost:7},
      {a:"KR_21",b:"KR_27",cost:10},
      {a:"KR_20",b:"KR_22",cost:7},
      {a:"KR_20",b:"KR_23",cost:12},
      {a:"KR_22",b:"KR_23",cost:14},
      {a:"KR_22",b:"KR_26",cost:13},
      {a:"KR_22",b:"KR_27",cost:5},
      {a:"KR_23",b:"KR_24",cost:4},
      {a:"KR_24",b:"KR_25",cost:5},
      {a:"KR_24",b:"KR_28",cost:13},
      {a:"KR_25",b:"KR_28",cost:8},
      {a:"KR_26",b:"KR_27",cost:7},
      {a:"KR_26",b:"KR_28",cost:13},
      {a:"KR_27",b:"KR_29",cost:7},
      {a:"KR_27",b:"KR_36",cost:9},
      {a:"KR_28",b:"KR_36",cost:6},
      {a:"KR_28",b:"KR_40",cost:11},
      {a:"KR_29",b:"KR_30",cost:4},
      {a:"KR_29",b:"KR_36",cost:8},
      {a:"KR_30",b:"KR_31",cost:9},
      {a:"KR_30",b:"KR_36",cost:15},
      {a:"KR_31",b:"KR_32",cost:11},
      {a:"KR_31",b:"KR_37",cost:16},
      {a:"KR_32",b:"KR_33",cost:2},
      {a:"KR_32",b:"KR_38",cost:14},
      {a:"KR_33",b:"KR_38",cost:15},
      {a:"KR_33",b:"KR_34",cost:19},
      {a:"KR_35",b:"KR_23",cost:6},
      {a:"KR_35",b:"KR_13",cost:18},
      {a:"KR_36",b:"KR_37",cost:9},
      {a:"KR_37",b:"KR_38",cost:11},
      {a:"KR_37",b:"KR_39",cost:12},
      {a:"KR_37",b:"KR_40",cost:10},
      {a:"KR_37",b:"KR_41",cost:7},
      {a:"KR_38",b:"KR_39",cost:11},
      {a:"KR_40",b:"KR_41",cost:3},
      {a:"KR_41",b:"KR_42",cost:7},
      {a:"KR_42",b:"KR_39",cost:7},
      {a:"KR_40",b:"KR_42",cost:10},
      {a:"KR_15",b:"KR_17",cost:2},
      {a:"KR_16",b:"KR_18",cost:3},
      {a:"KR_17",b:"KR_19",cost:3},
    ];
    var CITY_BY_ID={}; cityDefs.forEach(function(c){CITY_BY_ID[c.id]=c;});
    function regionAdjacency(){var out={};regionIds.forEach(function(r){out[r]=[];});edgeDefs.forEach(function(e){var ra=CITY_BY_ID[e.a].region,rb=CITY_BY_ID[e.b].region;if(ra===rb)return;if(out[ra].indexOf(rb)<0)out[ra].push(rb);if(out[rb].indexOf(ra)<0)out[rb].push(ra);});return out;}
    var REGION_ADJ=regionAdjacency();
    function regionsConnected(ids){ids=(ids||[]).filter(function(r,i,a){return REGIONS[r]&&a.indexOf(r)===i;});if(!ids.length)return false;var allow={},seen={},q=[ids[0]];ids.forEach(function(r){allow[r]=true;});seen[ids[0]]=true;while(q.length){var r=q.shift();(REGION_ADJ[r]||[]).forEach(function(n){if(allow[n]&&!seen[n]){seen[n]=true;q.push(n);}});}return ids.every(function(r){return seen[r];});}
    function citiesForRegions(ids){var set={};(ids||[]).forEach(function(r){set[r]=true;});return cityDefs.filter(function(c){return set[c.region];}).map(function(c){return c.id;});}
    function normalizeCity(v){var raw=String(v||'').trim().toUpperCase();for(var i=0;i<cityDefs.length;i++){if(cityDefs[i].id===raw||cityDefs[i].name.toUpperCase()===raw)return cityDefs[i].id;}return null;}
    KOREA_MAP={BOARD_WIDTH:900,BOARD_HEIGHT:900,REGIONS:REGIONS,REGION_ORDER:regionIds,REGION_ADJ:REGION_ADJ,REGION_SHADE_POLYGONS:null,CITIES:cityDefs,CITY_BY_ID:CITY_BY_ID,EDGES:edgeDefs,citiesForRegions:citiesForRegions,regionsConnected:regionsConnected,normalizeCity:normalizeCity,abstract:false,boardName:'한국',GEO_CENTER:[37.6,127.5],GEO_ZOOM:6,GEO_BOUNDS:[[33.0,124.0],[42.8,131.0]]};
  })();

  // v19 geographic rendering metadata. Germany still uses attachGeo.
  function attachGeo(map, coordByName, opts) {
    map.CITIES.forEach(function(c){
      var p=coordByName[c.name];
      if (p) { c.lat=p[0]; c.lng=p[1]; }
    });
    map.GEO_CENTER=opts.center;
    map.GEO_ZOOM=opts.zoom;
    map.GEO_BOUNDS=opts.bounds;
    return map;
  }

  attachGeo(GERMANY, {
    'Flensburg':[54.7937,9.4469],'Kiel':[54.3233,10.1228],'Cuxhaven':[53.8593,8.6879],
    'Hamburg':[53.5511,9.9937],'Wilhelmshaven':[53.5299,8.1122],'Bremen':[53.0793,8.8017],
    'Hannover':[52.3759,9.7320],'Lübeck':[53.8655,10.6866],'Rostock':[54.0924,12.0991],
    'Schwerin':[53.6355,11.4012],'Torgelow':[53.6347,14.0090],'Magdeburg':[52.1205,11.6276],
    'Berlin':[52.5200,13.4050],'Frankfurt (Oder)':[52.3471,14.5506],'Osnabrück':[52.2799,8.0472],
    'Münster':[51.9607,7.6261],'Duisburg':[51.4344,6.7623],'Essen':[51.4556,7.0116],
    'Dortmund':[51.5136,7.4653],'Kassel':[51.3127,9.4797],'Düsseldorf':[51.2277,6.7735],
    'Halle':[51.4969,11.9688],'Leipzig':[51.3397,12.3731],'Erfurt':[50.9848,11.0299],
    'Dresden':[51.0504,13.7373],'Fulda':[50.5558,9.6808],'Würzburg':[49.7913,9.9534],
    'Nürnberg':[49.4521,11.0767],'Aachen':[50.7753,6.0839],'Köln':[50.9375,6.9603],
    'Trier':[49.7499,6.6371],'Wiesbaden':[50.0782,8.2398],'Frankfurt am Main':[50.1109,8.6821],
    'Saarbrücken':[49.2402,6.9969],'Mannheim':[49.4875,8.4660],'Stuttgart':[48.7758,9.1829],
    'Augsburg':[48.3705,10.8978],'Regensburg':[49.0134,12.1016],'Freiburg':[47.9990,7.8421],
    'Konstanz':[47.6779,9.1732],'München':[48.1351,11.5820],'Passau':[48.5667,13.4319]
  }, {center:[51.2,10.4],zoom:6,bounds:[[47.2,5.5],[55.3,15.6]]});
  var BOARD_MAPS = { germany: GERMANY, usa: USA_MAP, korea: KOREA_MAP };
  function mapData(boardId){ return BOARD_MAPS[boardId || 'germany'] || GERMANY; }

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
  function cheapestConnectionCost(sources, target, allowedCities, edges) {
    edges = edges || GERMANY.EDGES;
    var allowed={};
    (allowedCities && allowedCities.length ? allowedCities : GERMANY.CITIES.map(function(c){return c.id;})).forEach(function(c){allowed[c]=true;});
    if (!allowed[target]) return -1;
    if (!sources.length) return 0;
    if (sources.indexOf(target)!==-1) return -1;
    var adj={}; Object.keys(allowed).forEach(function(c){adj[c]=[];});
    edges.forEach(function(e){ if(allowed[e.a]&&allowed[e.b]){ adj[e.a].push({to:e.b,cost:e.cost}); adj[e.b].push({to:e.a,cost:e.cost}); } });
    var dist={},visited={},pq=[];
    Object.keys(allowed).forEach(function(c){dist[c]=Infinity;});
    sources.forEach(function(src){if(allowed[src]){dist[src]=0;pq.push({c:src,d:0});}});
    while(pq.length){
      pq.sort(function(a,b){return a.d-b.d;});
      var cur=pq.shift(); if(visited[cur.c])continue; visited[cur.c]=true; if(cur.c===target)return cur.d;
      (adj[cur.c]||[]).forEach(function(edge){var nd=cur.d+edge.cost;if(nd<dist[edge.to]){dist[edge.to]=nd;pq.push({c:edge.to,d:nd});}});
    }
    return Number.isFinite(dist[target]) ? dist[target] : -1;
  }


  function defaultRegions(numPlayers, boardId) {
    boardId = boardId || 'germany';
    if (boardId === 'germany') {
      if (numPlayers <= 3) return ['green','brown','yellow'];
      if (numPlayers === 4) return ['green','brown','yellow','red'];
      return ['green','brown','yellow','red','blue'];
    }
    if (numPlayers <= 3) return ['r0','r1','r2'];
    if (numPlayers === 4) return ['r0','r1','r2','r3'];
    return ['r0','r1','r2','r3','r4'];
  }

  function validateRegionSelection(numPlayers, regionIds, boardId) {
    var B = mapData(boardId || 'germany');
    var wanted=REGIONS_TO_USE[numPlayers];
    var ids=(regionIds||[]).filter(function(r,i,a){return B.REGIONS[r]&&a.indexOf(r)===i;});
    if(ids.length!==wanted) throw new Error(numPlayers+'인 게임은 '+BOARD_DEFS[boardId||'germany'].name+' 지역 '+wanted+'개를 선택해야 합니다.');
    if(!B.regionsConnected(ids)) throw new Error('선택한 지역들은 서로 연결되어 있어야 합니다.');
    return ids;
  }

  function selectedCities(numPlayers, regionIds, boardId) {
    var B = mapData(boardId || 'germany');
    var ids=validateRegionSelection(numPlayers, regionIds || defaultRegions(numPlayers, boardId), boardId);
    return { boardId:boardId || 'germany', regionIds:ids, cityNames:B.citiesForRegions(ids), edges:B.EDGES.slice() };
  }


  // ============================================================
  // 게임 상태 생성 / 진행
  // ============================================================

  function newGame(opts) {
    var numPlayers = opts.numPlayers;
    var seatNames = opts.seatNames; // string[]
    if (!Number.isInteger(numPlayers) || numPlayers < 3 || numPlayers > 6) throw new Error('파워그리드는 3~6인 다인플만 지원합니다.');
    if (!seatNames || seatNames.length < numPlayers) throw new Error('플레이어 이름이 부족합니다.');
    var rng = mulberry32(opts.seed != null ? opts.seed : Date.now() % 2147483647);

    var boardId=BOARD_DEFS[opts.boardId] ? opts.boardId : 'germany';
    var boardDef=BOARD_DEFS[boardId];
    var zone=selectedCities(numPlayers, opts.regionIds, boardId);

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
      v: 4,
      kind: STATE_KIND,
      rulesRev: RULES_REV,
      numPlayers: numPlayers,
      map: { mode:boardDef.mode||'auto', boardId:boardId, regionIds:zone.regionIds, cityNames:zone.cityNames, edges:zone.edges },
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
      powerTurn: null,   // {orderIdx} - 관료 단계에서 각 플레이어가 직접 공급 확정
      plantDiscard: null, // {seat,max,purchased,stage,discarded} - 새 발전소는 폐기 불가, 초과 자원은 직접 선택해 반납
      log: [],
      winner: null,
      gameOver: false
    };
    var _startMap = mapData(boardId);
    pushLog(state, '게임을 시작합니다. ('+numPlayers+'인, '+boardDef.name+'맵 / 지역 '+zone.regionIds.map(function(r){return (_startMap.REGIONS[r]&&_startMap.REGIONS[r].shortName)||r;}).join('·')+' / 도시 '+zone.cityNames.length+'개)');
    pushLog(state, boardDef.name+' '+_startMap.CITIES.length+'도시 연결 그래프로 건설 연결비를 자동 계산합니다.');
    beginPhase2(state);
    syncDerivedTurn(state);
    return state;
  }

  function pushLog(state, msg) {
    state.log.push(msg);
    if (state.log.length > 300) state.log.shift();
  }

  function activePlant(numOrStep3) { return numOrStep3 === 'STEP3' ? null : PLANT_DEFS[numOrStep3]; }

  function setPlantMarketFromPool(state, pool) {
    var mkt = state.plantMarket;
    pool = pool.filter(function (x) { return x !== 'STEP3'; }).sort(function (a, b) { return a - b; });
    if (state.step === 3) {
      mkt.current = pool.slice(0, 6);
      mkt.future = [];
    } else {
      mkt.current = pool.slice(0, 4);
      mkt.future = pool.slice(4);
    }
  }

  function handleStep3Drawn(state, when) {
    if (when === 'phase2') {
      state._step3Phase2 = true;
      state._step3CardInMarket = true;
      reshuffleDeckBelowStep3(state, 'phase2');
      pushLog(state, 'Step 3 카드가 경매 단계에 공개되었습니다. 이번 경매 단계가 끝날 때 최저 발전소와 Step 3 카드를 제거하고 Step 3를 시작합니다.');
      return;
    }
    state._step3Phase5 = true;
    reshuffleDeckBelowStep3(state, 'phase5');
    pushLog(state, 'Step 3 카드가 관료 단계에 공개되었습니다. Step 2 보충을 마지막으로 적용하고 다음 라운드부터 Step 3를 시작합니다.');
  }

  function refillMarketAfterPurchase(state) {
    var mkt = state.plantMarket;
    var pool = mkt.current.concat(mkt.future).filter(function (x) { return x !== 'STEP3'; });
    var target = state.step === 3 ? 6 : (state._step3Phase2 ? 7 : 8);
    while (pool.length < target && state.deck.length) {
      var drawn = state.deck.shift();
      if (drawn === 'STEP3') {
        if (state.step === 3) continue;
        handleStep3Drawn(state, 'phase2');
        target = 7;
        break;
      }
      if (mkt.discounted != null && drawn < mkt.discounted) {
        pushLog(state, drawn + '번 발전소가 할인 발전소 ' + mkt.discounted + '번보다 낮아 게임에서 제거되었습니다. 할인 토큰도 제거합니다.');
        mkt.discounted = null;
        continue;
      }
      pool.push(drawn);
    }
    setPlantMarketFromPool(state, pool);
  }

  function startStep3AfterPhase2(state) {
    var mkt = state.plantMarket;
    var pool = mkt.current.concat(mkt.future).filter(function (x) { return x !== 'STEP3'; }).sort(function (a, b) { return a - b; });
    var removed = pool.shift();
    state.step = 3;
    state._step3Phase2 = false;
    state._step3CardInMarket = false;
    mkt.discounted = null;
    mkt.current = pool.slice(0, 6);
    mkt.future = [];
    pushLog(state, 'Step 3 시작! ' + (removed != null ? removed + '번 최저 발전소와 ' : '') + 'Step 3 카드를 제거했습니다. 이제 발전소 시장 6장을 모두 경매할 수 있습니다.');
  }

  function removeUnsoldDiscountAtPhaseEnd(state) {
    var mkt = state.plantMarket;
    var discounted = mkt.discounted;
    if (discounted == null) return;
    if (mkt.current.indexOf(discounted) === -1) { mkt.discounted = null; return; }
    mkt.current.splice(mkt.current.indexOf(discounted), 1);
    mkt.discounted = null;
    pushLog(state, '이번 경매 단계에 할인 발전소 ' + discounted + '번이 팔리지 않아 게임에서 제거하고 새 발전소로 교체합니다.');
    refillMarketAfterPurchase(state);
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
    state.flags = state.flags || { purchasedPlants:[] };
    state.flags.purchasedPlants = state.flags.purchasedPlants || [];
    if (state.flags.purchasedPlants.indexOf(plantNum) === -1) state.flags.purchasedPlants.push(plantNum);
    var bdefForSale = BOARD_DEFS[(state.map && state.map.boardId) || 'germany'] || BOARD_DEFS.germany;
    if (bdefForSale.rules && bdefForSale.rules.uraniumStopOnPlant39 && plantNum === 39 && !state.flags.uraniumResupplyStopped) {
      state.flags.uraniumResupplyStopped = true;
      pushLog(state, '독일 재충전 규칙 발동: 39번 발전소가 판매되어 앞으로 우라늄 보충이 중단됩니다.');
    }
    if (plantNum === state.plantMarket.discounted) state.plantMarket.discounted = null;

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

    // 최대 보유량을 넘으면 자동 폐기하지 않는다. 낙찰자가 보유 중인 카드 가운데
    // 어떤 발전소를 버릴지 직접 고른 뒤에야 경매가 계속된다.
    var maxP = MAX_PLANTS(state.numPlayers);
    if (state.players[winner].plants.length > maxP) {
      state.plantDiscard = { seat:winner, max:maxP, purchased:plantNum, stage:'plant', discarded:null };
      pushLog(state, state.players[winner].name + '님은 발전소를 최대 ' + maxP + '장만 보유할 수 있습니다. 폐기할 발전소 1장을 선택하세요.');
      return;
    }

    checkAuctionEnd(state);
  }

  function finishPlantDiscard(state) {
    var pending = state.plantDiscard;
    if (!pending) return;
    var p = state.players[pending.seat];
    if (!stockFitsPlants(p.plants, p.stock)) throw new Error('남은 발전소에 저장할 수 없는 자원이 아직 있습니다.');
    pushLog(state, p.name + '님의 발전소 폐기 및 자원 재배치가 완료되었습니다.');
    state.plantDiscard = null;
    checkAuctionEnd(state);
  }

  function actionDiscardPlant(state, seat, plantNum) {
    var pending = state.plantDiscard;
    if (!pending || pending.seat !== seat) throw new Error('지금은 발전소를 폐기할 차례가 아닙니다.');
    if (pending.stage && pending.stage !== 'plant') throw new Error('먼저 초과 자원을 정리하세요.');
    if (Number(plantNum) === Number(pending.purchased)) throw new Error('방금 구입한 발전소는 폐기할 수 없습니다.');
    var p = state.players[seat];
    var idx = p.plants.indexOf(plantNum);
    if (idx === -1) throw new Error('보유하지 않은 발전소입니다.');
    p.plants.splice(idx, 1);
    pending.discarded = plantNum;
    pending.stage = 'resources';
    pushLog(state, p.name + '님이 ' + plantNum + '번 발전소를 폐기했습니다. 남은 발전소에 자원을 자유롭게 재배치합니다.');
    if (stockFitsPlants(p.plants, p.stock)) { finishPlantDiscard(state); return; }
    pushLog(state, '남은 발전소의 저장 한도를 넘는 자원이 있습니다. 어떤 자원을 반납할지 직접 선택하세요.');
  }

  function actionDiscardExcessResource(state, seat, resource) {
    var pending = state.plantDiscard;
    if (!pending || pending.seat !== seat || pending.stage !== 'resources') throw new Error('지금은 초과 자원을 정리할 차례가 아닙니다.');
    if (['coal','oil','garbage','uranium'].indexOf(resource) === -1) throw new Error('알 수 없는 자원입니다.');
    var p = state.players[seat];
    if (Number(p.stock[resource] || 0) <= 0) throw new Error('반납할 자원이 없습니다.');
    p.stock[resource] -= 1;
    pushLog(state, p.name + '님이 발전소 폐기에 따라 ' + resource + ' 1개를 공급처로 반납했습니다.');
    if (stockFitsPlants(p.plants, p.stock)) finishPlantDiscard(state);
  }

  function checkAuctionEnd(state) {
    var a = state.auction;
    if (a.stillIn.length === 0) {
      endPhase2(state);
    }
  }

  function endPhase2(state) {
    if (state.firstRoundAuction) { state.firstRoundAuction = false; recomputeOrder(state); }
    if (state._step3Phase2) {
      startStep3AfterPhase2(state);
      state.auction = null;
      beginPhase3(state);
      return;
    }
    removeUnsoldDiscountAtPhaseEnd(state);
    if (state._step3Phase2) {
      startStep3AfterPhase2(state);
      state.auction = null;
      beginPhase3(state);
      return;
    }
    state.plantMarket.discounted = null;
    state.auction = null;
    beginPhase3(state);
  }

  // ---------------- Phase 3: 자원 구매 ----------------
  function storageProfile(playerPlants) {
    var out = { coalOnly:0, oilOnly:0, hybrid:0, garbage:0, uranium:0 };
    (playerPlants || []).forEach(function (n) {
      var d = PLANT_DEFS[n];
      if (!d || d.need <= 0) return;
      var cap = d.need * 2;
      if (d.type === 'coal') out.coalOnly += cap;
      else if (d.type === 'oil') out.oilOnly += cap;
      else if (d.type === 'hybrid') out.hybrid += cap;
      else if (d.type === 'garbage') out.garbage += cap;
      else if (d.type === 'uranium') out.uranium += cap;
    });
    return out;
  }

  function plantStorageCap(playerPlants, resource) {
    var p = storageProfile(playerPlants);
    if (resource === 'coal') return p.coalOnly + p.hybrid;
    if (resource === 'oil') return p.oilOnly + p.hybrid;
    return p[resource] || 0;
  }

  function stockFitsPlants(playerPlants, stock) {
    var p = storageProfile(playerPlants);
    if ((stock.garbage || 0) > p.garbage || (stock.uranium || 0) > p.uranium) return false;
    var coal = stock.coal || 0, oil = stock.oil || 0;
    if (coal > p.coalOnly + p.hybrid) return false;
    if (oil > p.oilOnly + p.hybrid) return false;
    return coal + oil <= p.coalOnly + p.oilOnly + p.hybrid;
  }

  function canStoreResource(playerPlants, stock, resource, qty) {
    var next = clone(stock);
    next[resource] = (next[resource] || 0) + (qty || 0);
    return stockFitsPlants(playerPlants, next);
  }

  function trimStockToPlants(playerPlants, stock) {
    var before = clone(stock);
    var p = storageProfile(playerPlants);
    stock.garbage = Math.min(stock.garbage || 0, p.garbage);
    stock.uranium = Math.min(stock.uranium || 0, p.uranium);
    stock.coal = Math.min(stock.coal || 0, p.coalOnly + p.hybrid);
    stock.oil = Math.min(stock.oil || 0, p.oilOnly + p.hybrid);
    var maxCombined = p.coalOnly + p.oilOnly + p.hybrid;
    while (stock.coal + stock.oil > maxCombined) {
      var coalFlex = Math.max(0, stock.coal - p.coalOnly);
      var oilFlex = Math.max(0, stock.oil - p.oilOnly);
      if (oilFlex >= coalFlex && stock.oil > 0) stock.oil -= 1;
      else if (stock.coal > 0) stock.coal -= 1;
      else break;
    }
    return {
      coal: before.coal - stock.coal,
      oil: before.oil - stock.oil,
      garbage: before.garbage - stock.garbage,
      uranium: before.uranium - stock.uranium
    };
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

  function usaCoalStorageCount(state) {
    var boardId=(state.map && state.map.boardId) || 'germany';
    var rules=(BOARD_DEFS[boardId] || BOARD_DEFS.germany).rules || {};
    if (!rules.usaCoalStorage) return 0;
    // 미국에서는 24개 석탄이 시장·플레이어 발전소·저장고 사이를 순환합니다.
    // 시작 시 24개 모두 시장에 있으므로 저장고는 0개입니다.
    return Math.max(0, RESOURCE_CAPACITY.coal - (state.resourceMarket.coal || 0) - totalHeldByPlayers(state, 'coal'));
  }

  function actionBuyResource(state, seat, resource, qty) {
    if (resourceTurnSeat(state) !== seat) throw new Error('지금은 당신의 자원 구매 차례가 아닙니다.');
    var p = state.players[seat];
    var boardId=(state.map && state.map.boardId) || 'germany';
    var rules=(BOARD_DEFS[boardId] || BOARD_DEFS.germany).rules || {};
    for (var i = 0; i < qty; i++) {
      if (!canStoreResource(p.plants, p.stock, resource, 1)) throw new Error('더 이상 저장할 공간이 없습니다.');
      var filled = state.resourceMarket[resource];
      var fromUsaCoalStorage = resource === 'coal' && rules.usaCoalStorage && filled <= 0;
      if (fromUsaCoalStorage) {
        var stored = usaCoalStorageCount(state);
        if (stored <= 0) throw new Error('석탄 시장과 8€ 석탄 저장고가 모두 비었습니다.');
        if (p.money < 8) throw new Error('8€ 석탄 저장고에서 구매할 돈이 부족합니다.');
        p.money -= 8;
        p.stock.coal += 1;
        continue;
      }
      if (filled <= 0) throw new Error('시장에 남은 ' + resource + '가 없습니다.');
      var emptyCount = RESOURCE_CAPACITY[resource] - filled;
      var price = LADDERS[resource][emptyCount];
      if (p.money < price) throw new Error('돈이 부족합니다.');
      p.money -= price;
      state.resourceMarket[resource] -= 1;
      p.stock[resource] += 1;
    }
    var extra=(resource==='coal' && rules.usaCoalStorage && state.resourceMarket.coal<=0) ? ' (시장 소진 시 저장고 8€ 규칙 적용)' : '';
    pushLog(state, state.players[seat].name + '님이 ' + resource + ' ' + qty + '개를 구매했습니다.' + extra);
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
    var connCost = cheapestConnectionCost(mySources, cityName, state.map.cityNames, state.map.edges);
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
    var B=mapData((state.map&&state.map.boardId)||'germany');
    var cityLabel=B.CITY_BY_ID[cityName] ? B.CITY_BY_ID[cityName].name : cityName;
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
    var maxCities = 0;
    Object.keys(state.players).forEach(function (s) { maxCities = Math.max(maxCities, state.players[s].cities.length); });
    if (state.step === 1 && maxCities >= STEP2_TRIGGER[state.numPlayers]) {
      state.step = 2;
      var mkt = state.plantMarket;
      var pool = mkt.current.concat(mkt.future).filter(function (x) { return x !== 'STEP3'; }).sort(function (a, b) { return a - b; });
      var firstRemoved = pool.shift();
      while (pool.length < 8 && state.deck.length) {
        var d = state.deck.shift();
        if (d === 'STEP3') {
          handleStep3Drawn(state, 'phase5');
          pool.sort(function (a, b) { return a - b; });
          var secondRemoved = pool.shift();
          state._step3EarlyDuringStep2 = true;
          pushLog(state, 'Step 2 시작 중 Step 3 카드가 공개되어 ' + secondRemoved + '번 발전소도 제거합니다. 다음 라운드부터 Step 3가 시작됩니다.');
          break;
        }
        pool.push(d);
      }
      pool.sort(function (a, b) { return a - b; });
      mkt.current = pool.slice(0, 4);
      mkt.future = pool.slice(4);
      pushLog(state, 'Step 2 시작! ' + firstRemoved + '번 최저 발전소를 제거하고 시장을 갱신했습니다.');
    }
    if (maxCities >= END_GAME_CITIES[state.numPlayers]) {
      state.gameOver = true;
      pushLog(state, '누군가 ' + maxCities + '개 도시를 연결하여 게임 종료 조건을 달성했습니다! 마지막 관료 단계에서는 수입을 받지 않고 최종 공급 도시 수만 비교합니다.');
    }
    beginPhase5(state);
  }

  // ---------------- Phase 5: 관료 단계 (직접 전력 공급) ----------------
  function fuelNeedsForPlants(plants) {
    var need = { coal:0, oil:0, garbage:0, uranium:0, hybrid:0 };
    (plants || []).forEach(function (n) {
      var d = PLANT_DEFS[n];
      if (!d) throw new Error('알 수 없는 발전소입니다: ' + n);
      if (d.type === 'coal') need.coal += d.need;
      else if (d.type === 'oil') need.oil += d.need;
      else if (d.type === 'garbage') need.garbage += d.need;
      else if (d.type === 'uranium') need.uranium += d.need;
      else if (d.type === 'hybrid') need.hybrid += d.need;
    });
    return need;
  }

  function hybridFuelRange(plants, stock) {
    var need = fuelNeedsForPlants(plants);
    if (need.coal > (stock.coal || 0) || need.oil > (stock.oil || 0) || need.garbage > (stock.garbage || 0) || need.uranium > (stock.uranium || 0)) return null;
    var coalLeft = (stock.coal || 0) - need.coal;
    var oilLeft = (stock.oil || 0) - need.oil;
    if (need.hybrid > coalLeft + oilLeft) return null;
    return { hybridNeed:need.hybrid, minCoal:Math.max(0, need.hybrid-oilLeft), maxCoal:Math.min(need.hybrid, coalLeft), base:need };
  }

  function fuelUseForPlants(plants, stock, hybridCoalChoice) {
    var range = hybridFuelRange(plants, stock);
    if (!range) return null;
    var hybridCoal;
    if (range.hybridNeed <= 0) hybridCoal = 0;
    else if (hybridCoalChoice == null || hybridCoalChoice === '') hybridCoal = range.minCoal;
    else {
      hybridCoal = Math.floor(Number(hybridCoalChoice));
      if (!Number.isFinite(hybridCoal) || hybridCoal < range.minCoal || hybridCoal > range.maxCoal) return null;
    }
    var hybridOil = range.hybridNeed - hybridCoal;
    return { coal:range.base.coal+hybridCoal, oil:range.base.oil+hybridOil, garbage:range.base.garbage, uranium:range.base.uranium, hybridCoal:hybridCoal, hybridOil:hybridOil, hybridNeed:range.hybridNeed };
  }

  function powerTurnSeat(state) {
    if (!state.powerTurn) return null;
    var idx = state.powerTurn.orderIdx;
    if (idx < 0 || idx >= state.order.length) return null;
    return state.order[idx];
  }

  function beginPhase5(state) {
    state.phase = 5;
    state.powerTurn = { orderIdx:0 };
    Object.keys(state.players).forEach(function (s) { state.players[s]._lastPoweredCities = []; });
    pushLog(state, '=== 5단계: 관료 · 전력 공급 ===');
    pushLog(state, '각 플레이어가 사용할 발전소와 전력을 공급할 도시 개수를 선택하면 다음 단계로 넘어갑니다.');
  }

  function actionPowerCities(state, seat, args) {
    if (powerTurnSeat(state) !== seat) throw new Error('지금은 당신의 전력 공급 차례가 아닙니다.');
    var p = state.players[seat];
    var plants = (args.plants || []).map(Number).filter(function (n, i, a) { return a.indexOf(n) === i; });
    plants.forEach(function (n) { if (p.plants.indexOf(n) === -1) throw new Error('보유하지 않은 발전소가 선택되었습니다.'); });
    var capacity = 0;
    plants.forEach(function (n) { capacity += PLANT_DEFS[n].cities; });
    var requested = args.cityCount != null ? Number(args.cityCount) : (args.cities || []).length;
    if (!Number.isFinite(requested) || requested < 0) requested = 0;
    requested = Math.floor(requested);
    if (requested > p.cities.length) throw new Error('보유 도시보다 많이 공급할 수 없습니다.');
    if (requested > capacity) throw new Error('선택한 발전소는 최대 도시 ' + capacity + '개까지만 공급할 수 있습니다.');
    if (requested === 0 && plants.length > 0) throw new Error('공급할 도시가 0개라면 발전소를 선택하지 않고 확정하세요.');
    var fuel = fuelUseForPlants(plants, p.stock, args.hybridCoal);
    if (!fuel) throw new Error('선택한 발전소를 가동할 자원이 부족합니다.');
    p.stock.coal -= fuel.coal; p.stock.oil -= fuel.oil; p.stock.garbage -= fuel.garbage; p.stock.uranium -= fuel.uranium;
    p._lastPoweredCities = p.cities.slice(0, requested);
    var pay = state.gameOver ? 0 : payoutFor(requested);
    if (!state.gameOver) p.money += pay;
    if (state.gameOver) p._finalPowered = requested;
    var hybridNote = fuel.hybridNeed > 0 ? ' (하이브리드: 석탄 ' + fuel.hybridCoal + ' / 석유 ' + fuel.hybridOil + ')' : '';
    pushLog(state, p.name + '님이 발전소 ' + (plants.length ? plants.join(',')+'번' : '없음') + '으로 도시 ' + requested + '개에 전력을 공급했습니다.' + hybridNote + (state.gameOver ? ' 최종 라운드이므로 수입은 받지 않습니다.' : ' ' + pay + '€를 받았습니다.'));
    state.powerTurn.orderIdx += 1;
    if (state.powerTurn.orderIdx >= state.order.length) {
      state.powerTurn = null;
      if (state.gameOver) { finalizeWinner(state); return; }
      finishPhase5Round(state);
    }
  }


  function finishPhase5Round(state) {
    var table = RESOURCE_REPLENISH[state.numPlayers];
    var step3WillAppear = !!state._step3EarlyDuringStep2 || (state.step !== 3 && state.deck && state.deck[0] === 'STEP3');
    var replenishStep = step3WillAppear ? 2 : state.step;
    var stepIdx = replenishStep - 1;
    ['coal', 'oil', 'garbage', 'uranium'].forEach(function (res) {
      var amt = table[res][stepIdx];
      if (res === 'uranium' && state.flags && state.flags.uraniumResupplyStopped) amt = 0;
      var bank = RESOURCE_CAPACITY[res] - state.resourceMarket[res] - totalHeldByPlayers(state, res);
      var add = Math.max(0, Math.min(amt, RESOURCE_CAPACITY[res] - state.resourceMarket[res], bank));
      state.resourceMarket[res] += add;
    });

    var mkt = state.plantMarket;
    if (state._step3EarlyDuringStep2) {
      state._step3EarlyDuringStep2 = false;
      state._step3Phase5 = false;
      state.step = 3;
      var earlyPool = mkt.current.concat(mkt.future).filter(function (x) { return x !== 'STEP3'; }).sort(function (a, b) { return a - b; });
      mkt.current = earlyPool.slice(0, 6);
      mkt.future = [];
      pushLog(state, 'Step 2 자원 보충을 마지막으로 적용했습니다. 다음 라운드부터 Step 3입니다.');
    } else if (state.step === 3) {
      var pool = mkt.current.slice().filter(function (x) { return x !== 'STEP3'; }).sort(function (a, b) { return a - b; });
      var removed3 = pool.shift();
      while (pool.length < 6 && state.deck.length) {
        var dd = state.deck.shift();
        if (dd === 'STEP3') continue;
        pool.push(dd);
      }
      mkt.current = pool.sort(function (a, b) { return a - b; }).slice(0, 6);
      mkt.future = [];
      if (removed3 != null) pushLog(state, 'Step 3 관료 단계: ' + removed3 + '번 최저 발전소를 제거하고 새 발전소로 교체했습니다.');
    } else {
      var pool2 = mkt.current.concat(mkt.future).filter(function (x) { return x !== 'STEP3'; }).sort(function (a, b) { return a - b; });
      var highest = pool2.pop();
      if (highest != null) state.deck.push(highest);
      if (state.deck.length) {
        var d3 = state.deck.shift();
        if (d3 === 'STEP3') {
          handleStep3Drawn(state, 'phase5');
          pool2.sort(function (a, b) { return a - b; });
          var removedLow = pool2.shift();
          state.step = 3;
          state._step3Phase5 = false;
          mkt.current = pool2.sort(function (a, b) { return a - b; }).slice(0, 6);
          mkt.future = [];
          pushLog(state, 'Phase 5에서 Step 3 카드와 ' + removedLow + '번 최저 발전소를 제거했습니다. 다음 라운드부터 Step 3입니다.');
        } else {
          pool2.push(d3);
          pool2.sort(function (a, b) { return a - b; });
          mkt.current = pool2.slice(0, 4);
          mkt.future = pool2.slice(4, 8);
        }
      } else {
        mkt.current = pool2.slice(0, 4);
        mkt.future = pool2.slice(4, 8);
      }
    }
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
    discardPlant: function (s, seat, args) { actionDiscardPlant(s, seat, args.plant); },
    discardExcessResource: function (s, seat, args) { actionDiscardExcessResource(s, seat, args.resource); },
    buyResource: function (s, seat, args) { actionBuyResource(s, seat, args.resource, args.qty); },
    endResourceTurn: function (s, seat) { actionEndResourceTurn(s, seat); },
    buildCity: function (s, seat, args) { actionBuildCity(s, seat, args.city); },
    endBuildTurn: function (s, seat) { actionEndBuildTurn(s, seat); },
    powerCities: function (s, seat, args) { actionPowerCities(s, seat, args); }
  };

  function syncDerivedTurn(state) {
    var seats = actingSeats(state);
    state.currentSeat = seats.length && seats[0] != null ? seats[0] : null;
    return state;
  }

  function applyAction(state, action) {
    var next = clone(state);
    next.rulesRev = RULES_REV;
    if (next.kind !== STATE_KIND) throw new Error('이 방은 이전 형식의 파워그리드 상태입니다. 방장이 새 파워그리드 방으로 다시 시작해야 합니다.');
    var fn = ACTIONS[action.type];
    if (!fn) throw new Error('알 수 없는 액션: ' + action.type);
    fn(next, action.seat, action.args || {});
    syncDerivedTurn(next);
    return next;
  }

  function actingSeats(state) {
    if (state.gameOver && state.winner != null) return [];
    if (state.plantDiscard) return [state.plantDiscard.seat];
    if (state.phase === 2) {
      var a = state.auction;
      if (!a) return [];
      if (a.sub === 'offer') return [currentOfferer(state)];
      return [bidTurnSeat(state)];
    }
    if (state.phase === 3) return [resourceTurnSeat(state)];
    if (state.phase === 4) return [buildTurnSeat(state)];
    if (state.phase === 5) return [powerTurnSeat(state)];
    return [];
  }

  // ============================================================
  // Export
  // ============================================================
  return {
    STATE_KIND: STATE_KIND,
    RULES_REV: RULES_REV,
    MAP: MAP,
    GERMANY: GERMANY,
    BOARD_MAPS: BOARD_MAPS,
    mapData: mapData,
    BOARD_DEFS: BOARD_DEFS,
    PLANT_DEFS: PLANT_DEFS,
    RESOURCE_CAPACITY: RESOURCE_CAPACITY,
    RESOURCE_REPLENISH: RESOURCE_REPLENISH,
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
    canStoreResource: canStoreResource,
    stockFitsPlants: stockFitsPlants,
    fuelNeedsForPlants: fuelNeedsForPlants,
    hybridFuelRange: hybridFuelRange,
    storageProfile: storageProfile,
    fuelUseForPlants: fuelUseForPlants,
    resourceTurnSeat: resourceTurnSeat,
    usaCoalStorageCount: usaCoalStorageCount,
    buildTurnSeat: buildTurnSeat,
    powerTurnSeat: powerTurnSeat,
    currentOfferer: currentOfferer,
    bidTurnSeat: bidTurnSeat,
    payoutFor: payoutFor,
    clone: clone
  };
});
