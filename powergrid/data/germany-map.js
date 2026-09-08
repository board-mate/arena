/*
 * Power Grid Germany map data for BoardMate.
 *
 * Network source: Richard Darst, board-game-networks, Germany dataset
 * https://github.com/rkdarst/board-game-networks
 * Original data license: CC-BY 4.0. The upstream repository warns that its
 * networks are community-entered and unverified; BoardMate therefore keeps
 * explicit regression tests and a visual audit checklist in the handoff docs.
 *
 * x/y values preserve the legacy 675 x 900 graph coordinates.
 * lat/lng values are used by the current Leaflet geographic map, matching the USA map presentation.
 * The route graph remains the same 42-city / 83-edge Germany data.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PowerGridGermanyMap = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var REGIONS = {
    green:  { id:'green',  name:'북서 · 초록', shortName:'초록', color:'#6f9d8a' },
    brown:  { id:'brown',  name:'북동 · 갈색', shortName:'갈색', color:'#8b7657' },
    red:    { id:'red',    name:'서부 · 빨강', shortName:'빨강', color:'#a7615f' },
    yellow: { id:'yellow', name:'동부 · 노랑', shortName:'노랑', color:'#b6a03e' },
    blue:   { id:'blue',   name:'남서 · 파랑', shortName:'파랑', color:'#7088a8' },
    purple: { id:'purple', name:'남동 · 보라', shortName:'보라', color:'#83718f' }
  };

  // UI-only approximate region polygons used by BoardMate's schematic board.
  // Cities, connections, costs, region fills, and click targets all share this 675x900 coordinate system.
  var REGION_SHADE_POLYGONS = {
    green:  [[170,15],[350,15],[370,130],[365,240],[325,350],[190,330],[115,250],[110,160]],
    brown:  [[335,45],[660,65],[660,370],[570,400],[445,385],[360,320],[345,220]],
    red:    [[65,250],[315,250],[340,395],[300,500],[220,520],[45,485],[15,365]],
    yellow: [[330,330],[655,320],[660,660],[600,690],[410,690],[325,590],[300,430]],
    blue:   [[15,430],[320,420],[355,565],[330,670],[280,720],[165,710],[35,660],[10,530]],
    purple: [[145,635],[600,625],[635,760],[600,875],[135,875],[110,790]]
  };

  // Index order intentionally follows the source dataset so that EDGE_INDEXES
  // can be compared against the published GEXF/YAML without name translation.
  var CITIES = [
    {id:'FLENSBURG',name:'Flensburg',region:'green',x:275,y:43,lat:54.79370,lng:9.44690},
    {id:'KIEL',name:'Kiel',region:'green',x:296,y:105,lat:54.32330,lng:10.12280},
    {id:'CUXHAVEN',name:'Cuxhaven',region:'green',x:220,y:145,lat:53.86170,lng:8.69400},
    {id:'HAMBURG',name:'Hamburg',region:'green',x:310,y:190,lat:53.55110,lng:9.99370},
    {id:'WILHELMSHAVEN',name:'Wilhelmshaven',region:'green',x:185,y:175,lat:53.53230,lng:8.10690},
    {id:'BREMEN',name:'Bremen',region:'green',x:225,y:238,lat:53.07930,lng:8.80170},
    {id:'HANNOVER',name:'Hannover',region:'green',x:292,y:310,lat:52.37590,lng:9.73200},

    {id:'LUBECK',name:'Lübeck',region:'brown',x:340,y:130,lat:53.86550,lng:10.68660},
    {id:'ROSTOCK',name:'Rostock',region:'brown',x:430,y:120,lat:54.09240,lng:12.09910},
    {id:'SCHWERIN',name:'Schwerin',region:'brown',x:390,y:190,lat:53.63550,lng:11.40120},
    {id:'TORGELOW',name:'Torgelow',region:'brown',x:570,y:180,lat:53.63300,lng:14.01330},
    {id:'MAGDEBURG',name:'Magdeburg',region:'brown',x:430,y:305,lat:52.12050,lng:11.62760},
    {id:'BERLIN',name:'Berlin',region:'brown',x:500,y:275,lat:52.52000,lng:13.40500},
    {id:'FRANKFURT_ODER',name:'Frankfurt (Oder)',region:'brown',x:580,y:315,lat:52.34710,lng:14.55060},

    {id:'OSNABRUCK',name:'Osnabrück',region:'red',x:180,y:305,lat:52.27990,lng:8.04720},
    {id:'MUNSTER',name:'Münster',region:'red',x:158,y:355,lat:51.96070,lng:7.62610},
    {id:'DUISBURG',name:'Duisburg',region:'red',x:55,y:365,lat:51.43440,lng:6.76230},
    {id:'ESSEN',name:'Essen',region:'red',x:98,y:398,lat:51.45560,lng:7.01160},
    {id:'DORTMUND',name:'Dortmund',region:'red',x:170,y:420,lat:51.51360,lng:7.46530},
    {id:'KASSEL',name:'Kassel',region:'red',x:275,y:420,lat:51.31270,lng:9.47970},
    {id:'DUSSELDORF',name:'Düsseldorf',region:'red',x:65,y:435,lat:51.22770,lng:6.77350},

    {id:'HALLE',name:'Halle',region:'yellow',x:435,y:350,lat:51.49690,lng:11.96880},
    {id:'LEIPZIG',name:'Leipzig',region:'yellow',x:470,y:400,lat:51.33970,lng:12.37310},
    {id:'ERFURT',name:'Erfurt',region:'yellow',x:385,y:420,lat:50.98480,lng:11.02990},
    {id:'DRESDEN',name:'Dresden',region:'yellow',x:560,y:445,lat:51.05040,lng:13.73730},
    {id:'FULDA',name:'Fulda',region:'yellow',x:345,y:485,lat:50.55580,lng:9.68080},
    {id:'WURZBURG',name:'Würzburg',region:'yellow',x:385,y:575,lat:49.79130,lng:9.95340},
    {id:'NUREMBERG',name:'Nürnberg',region:'yellow',x:400,y:630,lat:49.45210,lng:11.07670},

    {id:'AACHEN',name:'Aachen',region:'blue',x:55,y:500,lat:50.77530,lng:6.08390},
    {id:'KOLN',name:'Köln',region:'blue',x:105,y:465,lat:50.93750,lng:6.96030},
    {id:'TRIER',name:'Trier',region:'blue',x:80,y:585,lat:49.74999,lng:6.63710},
    {id:'WIESBADEN',name:'Wiesbaden',region:'blue',x:180,y:570,lat:50.07820,lng:8.23980},
    {id:'FRANKFURT_MAIN',name:'Frankfurt am Main',region:'blue',x:240,y:535,lat:50.11090,lng:8.68210},
    {id:'SAARBRUCKEN',name:'Saarbrücken',region:'blue',x:145,y:640,lat:49.24020,lng:6.99690},
    {id:'MANNHEIM',name:'Mannheim',region:'blue',x:240,y:625,lat:49.48750,lng:8.46600},

    {id:'STUTTGART',name:'Stuttgart',region:'purple',x:225,y:695,lat:48.77580,lng:9.18290},
    {id:'AUGSBURG',name:'Augsburg',region:'purple',x:315,y:745,lat:48.37050,lng:10.89780},
    {id:'REGENSBURG',name:'Regensburg',region:'purple',x:430,y:720,lat:49.01340,lng:12.10160},
    {id:'FREIBURG',name:'Freiburg',region:'purple',x:180,y:780,lat:47.99900,lng:7.84210},
    {id:'KONSTANZ',name:'Konstanz',region:'purple',x:250,y:820,lat:47.67790,lng:9.17320},
    {id:'MUNICH',name:'München',region:'purple',x:420,y:785,lat:48.13510,lng:11.58200},
    {id:'PASSAU',name:'Passau',region:'purple',x:555,y:740,lat:48.56670,lng:13.43120}
  ];

  var EDGE_INDEXES = [
    [0,1,4],[1,7,4],[1,3,8],[2,3,11],[2,5,8],[3,7,6],[3,9,8],[3,6,17],[3,5,11],
    [4,5,11],[4,14,14],[5,6,10],[5,14,11],[6,14,16],[6,9,19],[6,11,15],[6,23,19],[6,19,15],
    [7,9,6],[8,9,6],[8,10,19],[9,10,19],[9,12,18],[9,11,16],[10,12,15],[11,12,10],[11,21,11],
    [12,13,6],[12,21,17],[13,24,16],[13,22,21],[14,19,20],[14,15,7],[15,18,2],[15,17,6],
    [16,17,0],[17,18,4],[17,20,2],[18,19,18],[18,32,20],[18,29,10],[19,23,15],[19,25,8],
    [19,32,13],[20,29,4],[20,28,9],[21,22,0],[21,23,6],[22,24,13],[23,24,19],[23,27,21],
    [23,25,13],[25,26,11],[25,32,8],[26,32,13],[26,27,8],[26,36,19],[26,35,12],[26,34,10],
    [27,37,12],[27,36,18],[28,29,7],[28,30,19],[29,31,21],[29,30,20],[30,31,18],[30,33,11],
    [31,32,0],[31,34,11],[31,33,10],[33,34,11],[33,35,17],[34,35,6],[35,36,15],[35,39,16],
    [35,38,16],[36,37,13],[36,40,6],[36,39,17],[37,41,12],[37,40,10],[38,39,14],[40,41,14]
  ];

  var EDGES = EDGE_INDEXES.map(function (e) {
    return { a:CITIES[e[0]].id, b:CITIES[e[1]].id, cost:e[2] };
  });

  var CITY_BY_ID = {};
  CITIES.forEach(function (c) { CITY_BY_ID[c.id] = c; });

  var CITY_ALIASES = {
    HANNOVER:'HANNOVER', HANOVER:'HANNOVER',
    LUBECK:'LUBECK', LUEBECK:'LUBECK', 'LÜBECK':'LUBECK',
    OSNABRUCK:'OSNABRUCK', OSNABRUECK:'OSNABRUCK', 'OSNABRÜCK':'OSNABRUCK',
    MUNSTER:'MUNSTER', MUENSTER:'MUNSTER', 'MÜNSTER':'MUNSTER',
    DUSSELDORF:'DUSSELDORF', DUESSELDORF:'DUSSELDORF', 'DÜSSELDORF':'DUSSELDORF',
    KOLN:'KOLN', KOELN:'KOLN', 'KÖLN':'KOLN',
    WURZBURG:'WURZBURG', WUERZBURG:'WURZBURG', 'WÜRZBURG':'WURZBURG',
    NUREMBERG:'NUREMBERG', NURNBERG:'NUREMBERG', NUERNBERG:'NUREMBERG', 'NÜRNBERG':'NUREMBERG',
    SAARBRUCKEN:'SAARBRUCKEN', SAARBRUECKEN:'SAARBRUCKEN', 'SAARBRÜCKEN':'SAARBRUCKEN',
    MUNCHEN:'MUNICH', MUENCHEN:'MUNICH', MUNICH:'MUNICH', 'MÜNCHEN':'MUNICH',
    'FRANKFURT O':'FRANKFURT_ODER', 'FRANKFURT ODER':'FRANKFURT_ODER', 'FRANKFURT (ODER)':'FRANKFURT_ODER',
    'FRANKFURT M':'FRANKFURT_MAIN', 'FRANKFURT MAIN':'FRANKFURT_MAIN', 'FRANKFURT AM MAIN':'FRANKFURT_MAIN'
  };
  CITIES.forEach(function (c) {
    CITY_ALIASES[c.id] = c.id;
    CITY_ALIASES[c.name.toUpperCase()] = c.id;
  });

  function normalizeCity(value) {
    var raw = String(value || '').trim().replace(/\s+/g,' ').toUpperCase();
    if (!raw) return null;
    if (CITY_ALIASES[raw]) return CITY_ALIASES[raw];
    var ascii = raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return CITY_ALIASES[ascii] || null;
  }

  function citiesForRegions(regionIds) {
    var set = {};
    (regionIds || []).forEach(function (r) { set[r] = true; });
    return CITIES.filter(function (c) { return set[c.region]; }).map(function (c) { return c.id; });
  }

  function regionAdjacency() {
    var out = {};
    Object.keys(REGIONS).forEach(function (r) { out[r] = []; });
    EDGES.forEach(function (e) {
      var ra=CITY_BY_ID[e.a].region, rb=CITY_BY_ID[e.b].region;
      if (ra===rb) return;
      if (out[ra].indexOf(rb)===-1) out[ra].push(rb);
      if (out[rb].indexOf(ra)===-1) out[rb].push(ra);
    });
    Object.keys(out).forEach(function (r) { out[r].sort(); });
    return out;
  }
  var REGION_ADJ = regionAdjacency();

  function regionsConnected(regionIds) {
    var ids=(regionIds||[]).filter(function (r,i,a) { return REGIONS[r] && a.indexOf(r)===i; });
    if (!ids.length) return false;
    var allowed={};ids.forEach(function(r){allowed[r]=true;});
    var seen={},q=[ids[0]];seen[ids[0]]=true;
    while(q.length){
      var r=q.shift();
      (REGION_ADJ[r]||[]).forEach(function(n){if(allowed[n]&&!seen[n]){seen[n]=true;q.push(n);}});
    }
    return ids.every(function(r){return seen[r];});
  }

  return {
    BOARD_WIDTH:675,
    BOARD_HEIGHT:900,
    REGIONS:REGIONS,
    REGION_ORDER:['green','brown','red','yellow','blue','purple'],
    REGION_ADJ:REGION_ADJ,
    REGION_SHADE_POLYGONS:REGION_SHADE_POLYGONS,
    CITIES:CITIES,
    CITY_BY_ID:CITY_BY_ID,
    EDGES:EDGES,
    normalizeCity:normalizeCity,
    citiesForRegions:citiesForRegions,
    regionsConnected:regionsConnected,
    GEO_CENTER:[51.1,10.4],
    GEO_ZOOM:6,
    GEO_BOUNDS:[[47.2,5.4],[55.3,15.6]]
  };
});
