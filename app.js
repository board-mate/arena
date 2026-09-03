const app = document.querySelector('#app');
const CFG = window.BOARDMATE_CONFIG || {};
const STORAGE_PREFIX = 'boardmate:';
const LINKS = {
  instagram: 'https://www.instagram.com/board__mate/',
  somoim: 'https://www.somoim.co.kr/e4ed5ffc-a013-11ee-8110-0a96f0ba00151',
  shop: 'https://marpple.shop/kr/mate'
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const kstDate = () => new Date(Date.now() + 9*3600*1000).toISOString().slice(0,10);
const formatDate = d => `${d.slice(0,4)}.${d.slice(5,7)}.${d.slice(8,10)}`;
const formatClock = iso => new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(iso));
const configured = () => Boolean(CFG.supabaseUrl && CFG.supabaseAnonKey);

function playerId(){
  let id = localStorage.getItem(STORAGE_PREFIX+'player_id');
  if(!id){ id = crypto.randomUUID(); localStorage.setItem(STORAGE_PREFIX+'player_id', id); }
  return id;
}
function nickname(){ return localStorage.getItem(STORAGE_PREFIX+'nickname') || ''; }
function saveNickname(n){ localStorage.setItem(STORAGE_PREFIX+'nickname', n); }
function toast(message){
  const el=document.createElement('div'); el.className='toast'; el.textContent=message; document.body.appendChild(el);
  setTimeout(()=>el.remove(),2200);
}
function footer(){
  return `<footer class="footer"><span>© BoardMate · 모임원용 게임 아케이드</span><div class="footer-links"><a href="${LINKS.instagram}" target="_blank" rel="noreferrer">Instagram</a><a href="${LINKS.somoim}" target="_blank" rel="noreferrer">소모임</a><a href="${LINKS.shop}" target="_blank" rel="noreferrer">마플샵</a></div></footer>`;
}
function shell(content){
  app.innerHTML=`<div class="app-shell"><header class="topbar"><button class="brand-btn" id="homeBtn"><span class="brand-mark">●</span> BOARDMATE</button><div class="top-date">${formatDate(kstDate())}</div></header><main class="container">${content}${footer()}</main></div>`;
  document.querySelector('#homeBtn')?.addEventListener('click',()=>location.hash='#/');
}

// -------------------- shared leaderboard --------------------
function periodKey(game){ return game==='yahtzee' ? 'alltime' : kstDate(); }
function localKey(game){ return `${STORAGE_PREFIX}scores:${game}:${periodKey(game)}`; }
function getLocalRows(game){ try{return JSON.parse(localStorage.getItem(localKey(game))||'[]');}catch{return [];} }
function sortedRows(game, rows){
  return [...rows].sort((a,b)=>{
    if(game==='yahtzee') return b.metric-a.metric || a.completed_at.localeCompare(b.completed_at);
    if(game==='pensterdam') return a.completed_at.localeCompare(b.completed_at);
    return a.metric-b.metric || a.completed_at.localeCompare(b.completed_at);
  });
}
function rankRows(game, rows){
  const s=sortedRows(game,rows).map((x,i)=>({...x,rank:i+1}));
  return {items:s, me:s.find(x=>x.player_id===playerId())||null};
}
function saveLocal(game,n,metric){
  const rows=getLocalRows(game), id=playerId(), now=new Date().toISOString();
  const idx=rows.findIndex(x=>x.player_id===id);
  if(idx<0) rows.push({player_id:id,nickname:n,metric,completed_at:now});
  else {
    const old=rows[idx];
    if(game==='ricochet' && metric<old.metric) rows[idx]={...old,nickname:n,metric,completed_at:now};
    else if(game==='yahtzee' && metric>old.metric) rows[idx]={...old,nickname:n,metric,completed_at:now};
    else rows[idx]={...old,nickname:n};
  }
  localStorage.setItem(localKey(game),JSON.stringify(rows));
  return rankRows(game,rows);
}
function supaHeaders(extra={}){
  return {'apikey':CFG.supabaseAnonKey,'Authorization':`Bearer ${CFG.supabaseAnonKey}`,'Content-Type':'application/json',...extra};
}
async function loadLeaderboard(game,limit=5){
  if(!configured()){
    const r=rankRows(game,getLocalRows(game)); return {...r,items:r.items.slice(0,limit),local:true};
  }
  try{
    const period=encodeURIComponent(periodKey(game));
    const order=game==='yahtzee'?'metric.desc,completed_at.asc':game==='pensterdam'?'completed_at.asc':'metric.asc,completed_at.asc';
    const url=`${CFG.supabaseUrl}/rest/v1/boardmate_results?game=eq.${game}&period_key=eq.${period}&select=player_id,nickname,metric,completed_at&order=${order}&limit=${Math.max(limit,100)}`;
    const res=await fetch(url,{headers:supaHeaders({'Content-Type':'application/json'})});
    if(!res.ok) throw new Error('순위표 연결 실패');
    const rows=await res.json();
    const ranked=rows.map((x,i)=>({...x,rank:i+1}));
    return {items:ranked.slice(0,limit),me:ranked.find(x=>x.player_id===playerId())||null,local:false};
  }catch(e){
    const r=rankRows(game,getLocalRows(game)); return {...r,items:r.items.slice(0,limit),local:true,error:e.message};
  }
}
async function submitResult(game,n,metric){
  saveNickname(n);
  if(!configured()){
    const r=saveLocal(game,n,metric); return {items:r.items.slice(0,5),me:r.me,local:true};
  }
  try{
    const res=await fetch(`${CFG.supabaseUrl}/rest/v1/rpc/submit_boardmate_result`,{method:'POST',headers:supaHeaders(),body:JSON.stringify({p_game:game,p_period_key:periodKey(game),p_player_id:playerId(),p_nickname:n,p_metric:metric})});
    if(!res.ok) throw new Error((await res.text())||'기록 등록 실패');
    const lb=await loadLeaderboard(game,100); return lb;
  }catch(e){
    const r=saveLocal(game,n,metric); return {items:r.items.slice(0,5),me:r.me,local:true,error:e.message};
  }
}
function scoreText(game,row){
  if(game==='yahtzee') return `${row.metric}점`;
  if(game==='pensterdam') return formatClock(row.completed_at);
  return `${row.metric}회 · ${formatClock(row.completed_at)}`;
}
function leaderboardHtml(game,data,expanded=false,showMore=true){
  const items=data?.items||[];
  const rows=items.length?items.map(r=>`<div class="rank-row"><span class="rank">${r.rank}</span><span class="rank-name">${esc(r.nickname)}</span><span class="rank-score">${scoreText(game,r)}</span></div>`).join(''):`<div class="empty">아직 등록된 기록이 없습니다.</div>`;
  const me=data?.me && !items.some(x=>x.player_id===data.me.player_id)?`<div class="me-row"><span>내 순위 ${data.me.rank}위 · ${esc(data.me.nickname)}</span><span>${scoreText(game,data.me)}</span></div>`:'';
  return `<div class="leaderboard">${rows}</div>${me}${showMore?`<button class="more-btn" data-more="${game}">${expanded?'접기':'더보기'}</button>`:''}`;
}
function openNameModal({title,big,rankText,onSubmit,onCloseLabel='다시 도전',onClose}){
  const wrap=document.createElement('div'); wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal"><h2>${esc(title)}</h2><div class="big-score">${esc(big)}</div><div class="rank-message">${esc(rankText||'')}</div><label>순위표에 남길 이름</label><input id="nickInput" maxlength="20" value="${esc(nickname())}" placeholder="닉네임"><div class="modal-actions"><button class="ghost" id="modalClose">${esc(onCloseLabel)}</button><button class="primary" id="modalSubmit">기록 등록</button></div><div id="modalStatus" class="bonus-note"></div></div>`;
  document.body.appendChild(wrap); const input=wrap.querySelector('#nickInput'); input.focus(); input.select();
  wrap.querySelector('#modalClose').onclick=()=>{wrap.remove();onClose?.();};
  wrap.querySelector('#modalSubmit').onclick=async()=>{
    const n=input.value.trim(); if(!n){input.focus();return;}
    const btn=wrap.querySelector('#modalSubmit'); btn.disabled=true; btn.textContent='등록 중…';
    try{
      const result=await onSubmit(n); const rank=result?.me?.rank;
      wrap.querySelector('#modalStatus').textContent=rank?`등록 완료 · 현재 ${rank}위${result.local?' (이 브라우저)':''}`:'등록했습니다.';
      btn.textContent='완료'; setTimeout(()=>{wrap.remove();onClose?.();},850);
    }catch(e){ wrap.querySelector('#modalStatus').textContent=e.message; btn.disabled=false; btn.textContent='기록 등록'; }
  };
}

// -------------------- Ricochet --------------------
const BOARD_SIZE=16;
const BLOCKED_CELLS=new Set([119,120,135,136]);
const ROBOT_COLORS=['red','yellow','green','blue'];
const DIRS=[{dr:-1,dc:0,bit:1},{dr:0,dc:1,bit:2},{dr:1,dc:0,bit:4},{dr:0,dc:-1,bit:8}];
const BASE_WALL_CORNERS=[
  [23,12],[28,3],[30,3],[33,6],[42,3],[55,6],
  [67,9],[76,9],[81,9],[90,9],
  [126,9],[132,6],[140,9],[154,6],
  [166,6],[173,6],[181,6],[185,6],
  [195,6],[204,9],[209,12],[216,6],
  [228,6],[234,3],[238,9]
];
function buildRicochetWalls(){
  const walls=Array(BOARD_SIZE*BOARD_SIZE).fill(0);
  for(let c=0;c<BOARD_SIZE;c++){walls[c]|=1;walls[(BOARD_SIZE-1)*BOARD_SIZE+c]|=4;}
  for(let r=0;r<BOARD_SIZE;r++){walls[r*BOARD_SIZE]|=8;walls[r*BOARD_SIZE+BOARD_SIZE-1]|=2;}
  const step={1:[-1,0,4],2:[0,1,8],4:[1,0,1],8:[0,-1,2]};
  for(const [cell,mask] of BASE_WALL_CORNERS){
    const r=Math.floor(cell/BOARD_SIZE),c=cell%BOARD_SIZE;
    for(const bit of [1,2,4,8]){
      if(!(mask&bit))continue;
      const [dr,dc,opposite]=step[bit],nr=r+dr,nc=c+dc;
      walls[cell]|=bit;
      if(nr>=0&&nr<BOARD_SIZE&&nc>=0&&nc<BOARD_SIZE) walls[nr*BOARD_SIZE+nc]|=opposite;
    }
  }
  return walls;
}
const BASE_WALLS=buildRicochetWalls();
const BASE_PUZZLES=[
{robots:[97,150,87,8],targetRobot:2,target:169},{robots:[179,130,55,246],targetRobot:3,target:42},{robots:[121,182,124,252],targetRobot:3,target:239},{robots:[103,240,93,156],targetRobot:3,target:22},{robots:[198,33,42,128],targetRobot:0,target:22},{robots:[238,79,29,40],targetRobot:1,target:228},{robots:[246,37,68,216],targetRobot:3,target:14},{robots:[78,13,62,97],targetRobot:2,target:32},{robots:[99,254,248,149],targetRobot:2,target:47},{robots:[46,37,0,142],targetRobot:1,target:30},{robots:[48,36,141,194],targetRobot:2,target:160},{robots:[28,19,93,184],targetRobot:0,target:185},{robots:[209,249,223,8],targetRobot:0,target:13},{robots:[33,157,153,137],targetRobot:1,target:137},{robots:[65,89,213,12],targetRobot:2,target:10},{robots:[56,161,69,18],targetRobot:2,target:211},{robots:[217,155,166,1],targetRobot:1,target:228},{robots:[158,61,155,45],targetRobot:0,target:60},{robots:[80,244,16,245],targetRobot:3,target:210},{robots:[216,239,45,134],targetRobot:3,target:75},{robots:[97,176,146,72],targetRobot:3,target:247},{robots:[195,185,113,142],targetRobot:1,target:254},{robots:[92,185,91,196],targetRobot:3,target:185},{robots:[57,97,184,242],targetRobot:3,target:55},{robots:[165,28,154,65],targetRobot:1,target:132},{robots:[228,233,173,238],targetRobot:2,target:209},{robots:[110,36,76,34],targetRobot:2,target:14},{robots:[115,146,12,205],targetRobot:2,target:244},{robots:[64,243,43,41],targetRobot:0,target:189},{robots:[227,160,99,229],targetRobot:2,target:151}
];
const COLOR_PERMUTATIONS=(()=>{const out=[];const p=(pre,rest)=>{if(!rest.length)return out.push(pre);rest.forEach((v,i)=>p([...pre,v],[...rest.slice(0,i),...rest.slice(i+1)]));};p([], [0,1,2,3]);return out;})();
function dateNumber(dateKey){const [y,m,d]=dateKey.split('-').map(Number);return Math.floor(Date.UTC(y,m-1,d)/86400000);}
function transformCoord(r,c,sym,size=16){const flip=sym>=4,rot=sym%4;if(flip)c=size-1-c;for(let i=0;i<rot;i++)[r,c]=[c,size-1-r];return[r,c];}
function transformVector(dr,dc,sym){const flip=sym>=4,rot=sym%4;if(flip)dc=-dc;for(let i=0;i<rot;i++)[dr,dc]=[dc,-dr];return[dr,dc];}
function vectorBit(dr,dc){if(dr===-1&&dc===0)return 1;if(dr===0&&dc===1)return 2;if(dr===1&&dc===0)return 4;return 8;}
function transformCell(index,sym){const [r,c]=transformCoord(Math.floor(index/16),index%16,sym);return r*16+c;}
function transformWalls(sym){if(sym===0)return BASE_WALLS;const out=Array(256).fill(0),vec=[[-1,0,1],[0,1,2],[1,0,4],[0,-1,8]];for(let i=0;i<256;i++){const ni=transformCell(i,sym);for(const [dr,dc,bit] of vec){if(!(BASE_WALLS[i]&bit))continue;const [a,b]=transformVector(dr,dc,sym);out[ni]|=vectorBit(a,b);}}return out;}
const RICOCHET_PUZZLE_CACHE=new Map();
function buildRicochetPuzzleFromCombo(dateKey,combo){
  const sym=combo%8,baseIndex=Math.floor(combo/8)%BASE_PUZZLES.length,permIndex=Math.floor(combo/(8*BASE_PUZZLES.length))%COLOR_PERMUTATIONS.length,base=BASE_PUZZLES[baseIndex],perm=COLOR_PERMUTATIONS[permIndex];
  return{date:dateKey,walls:transformWalls(sym),blocked:[...BLOCKED_CELLS].map(i=>transformCell(i,sym)),robots:perm.map(old=>transformCell(base.robots[old],sym)),targetRobot:perm.findIndex(old=>old===base.targetRobot),target:transformCell(base.target,sym)};
}
function hasRicochetSolutionWithin(puzzle,maxDepth=5){
  const start=[...puzzle.robots];
  if(start[puzzle.targetRobot]===puzzle.target)return true;
  let frontier=[start];const seen=new Set([start.join('-')]);
  for(let depth=0;depth<maxDepth;depth++){
    const nextFrontier=[];
    for(const state of frontier){
      for(let robot=0;robot<4;robot++)for(let dir=0;dir<4;dir++){
        const next=moveRobot(state,robot,dir,puzzle);if(next===state)continue;
        if(next[puzzle.targetRobot]===puzzle.target)return true;
        const key=next.join('-');if(seen.has(key))continue;seen.add(key);nextFrontier.push(next);
      }
    }
    frontier=nextFrontier;if(!frontier.length)break;
  }
  return false;
}
function getRicochetPuzzle(dateKey){
  if(RICOCHET_PUZZLE_CACHE.has(dateKey))return RICOCHET_PUZZLE_CACHE.get(dateKey);
  const total=BASE_PUZZLES.length*COLOR_PERMUTATIONS.length*8,seed=Math.abs(dateNumber(dateKey))%total;
  let puzzle=buildRicochetPuzzleFromCombo(dateKey,seed);
  for(let offset=0;offset<32;offset++){
    const candidate=buildRicochetPuzzleFromCombo(dateKey,(seed+offset)%total);
    if(!hasRicochetSolutionWithin(candidate,5)){puzzle=candidate;break;}
  }
  RICOCHET_PUZZLE_CACHE.set(dateKey,puzzle);return puzzle;
}
function moveRobot(state,robotIndex,dirIndex,puzzle){const dir=DIRS[dirIndex],current=state[robotIndex];let r=Math.floor(current/16),c=current%16;const occupied=new Set(state);occupied.delete(current);const blocked=new Set(puzzle.blocked);while(true){const pos=r*16+c;if(puzzle.walls[pos]&dir.bit)break;const nr=r+dir.dr,nc=c+dir.dc;if(nr<0||nr>=16||nc<0||nc>=16)break;const np=nr*16+nc;if(blocked.has(np)||occupied.has(np))break;r=nr;c=nc;}const next=r*16+c;if(next===current)return state;const copy=[...state];copy[robotIndex]=next;return copy;}
function directionFromBoardClick(fromCell,toCell){
  if(fromCell===toCell)return null;
  const fr=Math.floor(fromCell/BOARD_SIZE),fc=fromCell%BOARD_SIZE,tr=Math.floor(toCell/BOARD_SIZE),tc=toCell%BOARD_SIZE;
  if(fr===tr)return tc>fc?1:3;
  if(fc===tc)return tr>fr?2:0;
  return null;
}

// -------------------- Pentorini (legacy leaderboard key: pensterdam) --------------------
const PIECES={F:[[0,1],[0,2],[1,0],[1,1],[2,1]],I:[[0,0],[1,0],[2,0],[3,0],[4,0]],L:[[0,0],[1,0],[2,0],[3,0],[3,1]],P:[[0,0],[0,1],[1,0],[1,1],[2,0]],N:[[0,1],[1,1],[2,0],[2,1],[3,0]],T:[[0,0],[0,1],[0,2],[1,1],[2,1]],U:[[0,0],[0,2],[1,0],[1,1],[1,2]],V:[[0,0],[1,0],[2,0],[2,1],[2,2]],W:[[0,0],[1,0],[1,1],[2,1],[2,2]],X:[[0,1],[1,0],[1,1],[1,2],[2,1]],Y:[[0,0],[1,0],[2,0],[3,0],[2,1]],Z:[[0,0],[0,1],[1,1],[2,1],[2,2]]};
function normalize(points){const mr=Math.min(...points.map(p=>p[0])),mc=Math.min(...points.map(p=>p[1]));return points.map(([r,c])=>[r-mr,c-mc]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);}
const PIECE_ANCHORS={F:[1,1],I:[2,0],L:[2,0],P:[1,0],N:[2,1],T:[1,1],U:[1,1],V:[2,0],W:[1,1],X:[1,1],Y:[2,0],Z:[1,1]};
function transformRawPoint([r,c],rotation=0,flipped=false){let x=r,y=flipped?-c:c;for(let i=0;i<((rotation%4)+4)%4;i++)[x,y]=[y,-x];return[x,y];}
function transformPieceState(points,anchor,rotation=0,flipped=false){const raw=points.map(p=>transformRawPoint(p,rotation,flipped)),rawAnchor=transformRawPoint(anchor,rotation,flipped),mr=Math.min(...raw.map(p=>p[0])),mc=Math.min(...raw.map(p=>p[1]));return{points:raw.map(([r,c])=>[r-mr,c-mc]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),anchor:[rawAnchor[0]-mr,rawAnchor[1]-mc]};}
const PENTORINI_LABELS=[
  'Mon','Tue','Wed','Thu','Fri','Sat','Sun',
  'Jan','Feb','Mar','Apr','May','Jun','Jul',
  'Aug','Sep','Oct','Nov','Dec','25','26',
  '27','28','29','30','1','2','3',
  '4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17',
  '18','19','20','21','22','23','24',
  '25','26','27','28','29','30','31',
  '月','火','水','木','金','土','日'
];
const PENTORINI_MONTH_CELL={1:7,2:8,3:9,4:10,5:11,6:12,7:13,8:14,9:15,10:16,11:17,12:18};
const PENTORINI_WEEKDAY_EN_CELL={1:0,2:1,3:2,4:3,5:4,6:5,0:6};
const PENTORINI_WEEKDAY_HANJA_CELL={1:56,2:57,3:58,4:59,5:60,6:61,0:62};
const PENTORINI_DATE_CELL={};
for(let d=1;d<=31;d++)PENTORINI_DATE_CELL[d]=24+d;
function getPentoriniPuzzle(dateKey,weekdayMode='en'){
  const d=new Date(`${dateKey}T12:00:00+09:00`),m=Number(dateKey.slice(5,7)),day=Number(dateKey.slice(8,10)),wd=d.getDay();
  const weekdayCell=(weekdayMode==='hanja'?PENTORINI_WEEKDAY_HANJA_CELL:PENTORINI_WEEKDAY_EN_CELL)[wd];
  return{date:dateKey,rows:9,cols:7,holes:[PENTORINI_MONTH_CELL[m],PENTORINI_DATE_CELL[day],weekdayCell],month:m,day,weekday:wd,weekdayMode};
}
function joinedCellClasses(has,r,c){
  const u=!has(r-1,c),rr=!has(r,c+1),d=!has(r+1,c),l=!has(r,c-1),out=[];
  if(u)out.push('edge-u');if(rr)out.push('edge-r');if(d)out.push('edge-d');if(l)out.push('edge-l');
  if(u&&l)out.push('corner-tl');if(u&&rr)out.push('corner-tr');if(d&&l)out.push('corner-bl');if(d&&rr)out.push('corner-br');
  return out.join(' ');
}
function pentoriniCellMeta(i,weekdayMode){
  const classes=[];
  if(i<=6){classes.push('weekday-cell','weekday-en');if(weekdayMode!=='en')classes.push('weekday-muted');}
  else if(i>=56){classes.push('weekday-cell','weekday-hanja');if(weekdayMode!=='hanja')classes.push('weekday-muted');}
  else if(i>=7&&i<=18)classes.push('month-cell');
  else classes.push('date-cell');
  if(i===19)classes.push('accent-date');
  if(i>=19&&i<=24)classes.push('duplicate-date');
  return classes.join(' ');
}

// -------------------- Yahtzee --------------------
const UPPER=['aces','twos','threes','fours','fives','sixes'],LOWER=['threeKind','fourKind','fullHouse','smallStraight','largeStraight','yahtzee','chance'],ALL=[...UPPER,...LOWER];
const LABELS={aces:'Aces',twos:'Twos',threes:'Threes',fours:'Fours',fives:'Fives',sixes:'Sixes',threeKind:'3 of a Kind',fourKind:'4 of a Kind',fullHouse:'Full House',smallStraight:'Small Straight',largeStraight:'Large Straight',yahtzee:'YAHTZEE',chance:'Chance'};
function counts(dice){const c=[0,0,0,0,0,0,0];dice.forEach(v=>c[v]++);return c;}
function isYahtzee(dice){return dice.length===5&&dice.every(v=>v===dice[0]);}
function normalScore(category,dice){const c=counts(dice),sum=dice.reduce((a,b)=>a+b,0);if(UPPER.includes(category)){const face=UPPER.indexOf(category)+1;return c[face]*face;}switch(category){case'threeKind':return c.some(v=>v>=3)?sum:0;case'fourKind':return c.some(v=>v>=4)?sum:0;case'fullHouse':return c.includes(3)&&c.includes(2)?25:0;case'smallStraight':{const u=new Set(dice);return([1,2,3,4].every(v=>u.has(v))||[2,3,4,5].every(v=>u.has(v))||[3,4,5,6].every(v=>u.has(v)))?30:0;}case'largeStraight':{const s=[...new Set(dice)].sort().join('');return(s==='12345'||s==='23456')?40:0;}case'yahtzee':return isYahtzee(dice)?50:0;case'chance':return sum;default:return 0;}}
function getScoringOptions(scorecard,dice){const empty=ALL.filter(c=>scorecard[c]==null),options={};if(!isYahtzee(dice)||scorecard.yahtzee==null){empty.forEach(c=>options[c]=normalScore(c,dice));return{options,yahtzeeBonus:0,forced:false};}const face=dice[0],matching=UPPER[face-1],bonus=scorecard.yahtzee===50?100:0;if(scorecard[matching]==null){options[matching]=face*5;return{options,yahtzeeBonus:bonus,forced:true};}const lowers=LOWER.filter(c=>c!=='yahtzee'&&scorecard[c]==null);if(lowers.length){for(const c of lowers){if(c==='fullHouse')options[c]=25;else if(c==='smallStraight')options[c]=30;else if(c==='largeStraight')options[c]=40;else options[c]=normalScore(c,dice);}return{options,yahtzeeBonus:bonus,forced:true};}for(const c of UPPER)if(scorecard[c]==null)options[c]=0;return{options,yahtzeeBonus:bonus,forced:true};}
function totals(scorecard,bonusCount=0){const upper=UPPER.reduce((s,c)=>s+(scorecard[c]??0),0),upperBonus=upper>=63?35:0,lower=LOWER.reduce((s,c)=>s+(scorecard[c]??0),0),bonusPoints=bonusCount*100;return{upper,upperBonus,lower,bonusPoints,total:upper+upperBonus+lower+bonusPoints};}
function rollOne(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%6+1;}

// -------------------- pages --------------------
async function renderHome(){
  shell(`<section class="hero"><div><h1><span>BoardMate</span> Arcade</h1><p>보드메이트 모임원끼리 매일 가볍게 겨루는 게임 공간.<br>오늘의 리코셰와 펜토리니, 그리고 올타임 Yahtzee 기록에 도전하세요.</p><div class="social-links"><a class="social-link" href="${LINKS.instagram}" target="_blank" rel="noreferrer">📷 Instagram</a><a class="social-link" href="${LINKS.somoim}" target="_blank" rel="noreferrer">👥 소모임</a><a class="social-link" href="${LINKS.shop}" target="_blank" rel="noreferrer">🛍 마플샵</a></div></div><div class="hero-badge">🎲</div></section><div class="section-title"><h2>게임</h2><small>${formatDate(kstDate())} · KST</small></div><section class="game-grid">${homeCard('ricochet','🤖','리코셰','적은 이동 수 → 동률이면 먼저 클리어')} ${homeCard('pensterdam','🧩','펜토리니','오늘의 월·일·요일을 남기고 완성 · 먼저 클리어')} ${homeCard('yahtzee','🎲','Yahtzee','언제든 플레이 · 올타임 최고 점수')}</section><div id="connection"></div>`);
  for(const g of ['ricochet','pensterdam','yahtzee']){const data=await loadLeaderboard(g,5);const el=document.querySelector(`#lb-${g}`);if(el)el.innerHTML=leaderboardHtml(g,data,false);}
  bindHome();
  if(!configured()) document.querySelector('#connection').innerHTML='<div class="connection-note">현재는 로컬 순위 모드입니다. <b>config.js</b>에 Supabase 주소/키 두 개만 넣으면 모임원 모두가 같은 순위표를 봅니다.</div>';
}
function homeCard(game,icon,title,desc){return `<article class="game-card"><div class="icon">${icon}</div><h3>${title}</h3><p>${desc}</p><button class="primary" data-play="${game}">게임하기</button><div id="lb-${game}"><div class="empty">순위표 불러오는 중…</div></div></article>`;}
function bindHome(){document.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>location.hash=`#/${b.dataset.play}`);document.querySelectorAll('[data-more]').forEach(b=>b.onclick=async()=>{const g=b.dataset.more,card=b.closest('.game-card'),expanded=b.textContent==='접기',data=await loadLeaderboard(g,expanded?5:100);card.querySelector(`#lb-${g}`).innerHTML=leaderboardHtml(g,data,!expanded);bindHome();});}

async function renderRicochet(){
  const puzzle=getRicochetPuzzle(kstDate());let state=[...puzzle.robots],selected=puzzle.targetRobot,moves=[];
  shell(`<div class="page-head"><div><h1>🤖 오늘의 리코셰</h1><p>${formatDate(puzzle.date)} · 같은 색 로봇을 목표 칸으로 보내세요.</p></div><div class="actions"><button class="ghost" id="backHome">← 홈</button><button class="danger" id="resetRicochet">도전 초기화</button></div></div><div class="game-layout"><section class="panel"><div id="rboard" class="ricochet-board"></div><div class="board-control-note">로봇을 누른 뒤, 보드에서 그 로봇의 위·아래·왼쪽·오른쪽 방향 아무 칸이나 누르면 이동합니다.</div></section><aside class="panel"><div class="stat-grid single"><div class="stat"><span>현재 이동</span><b id="moveCount">0</b></div></div><div class="robot-picker-title">로봇 선택 <small>보드의 로봇도 클릭할 수 있어요</small></div><div class="robot-picker" id="robotPicker"></div><div class="direction-pad"><button class="up" data-dir="0" aria-label="위로 이동">↑</button><button class="left" data-dir="3" aria-label="왼쪽으로 이동">←</button><button class="right" data-dir="1" aria-label="오른쪽으로 이동">→</button><button class="down" data-dir="2" aria-label="아래로 이동">↓</button></div><div class="hint">보드 조작과 오른쪽 방향 버튼을 모두 사용할 수 있습니다. 로봇은 벽이나 다른 로봇을 만나기 직전까지 멈추지 않습니다.</div><h3 style="margin-top:18px">오늘의 순위</h3><div id="sideLb"><div class="empty">불러오는 중…</div></div></aside></div>`);
  document.querySelector('#backHome').onclick=()=>location.hash='#/';
  const refreshLb=async()=>document.querySelector('#sideLb').innerHTML=leaderboardHtml('ricochet',await loadLeaderboard('ricochet',5),false,false); await refreshLb();
  const renderPicker=()=>{document.querySelector('#robotPicker').innerHTML=ROBOT_COLORS.map((c,i)=>`<button class="robot-pick ${c} ${i===selected?'active':''}" data-robot="${i}" aria-label="${['빨강','노랑','초록','파랑'][i]} 로봇 선택"><span class="robot-pick-dot"></span></button>`).join('');document.querySelectorAll('[data-robot]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.robot);renderPicker();render();});};
  const render=()=>{
    document.querySelector('#moveCount').textContent=moves.length;
    const blocked=new Set(puzzle.blocked),el=document.querySelector('#rboard'),selectedCell=state[selected],selectedRow=Math.floor(selectedCell/BOARD_SIZE),selectedCol=selectedCell%BOARD_SIZE;
    const hintForCell=i=>{
      const r=Math.floor(i/BOARD_SIZE),c=i%BOARD_SIZE;
      if(r===selectedRow-1&&c===selectedCol)return[0,'↑'];
      if(r===selectedRow&&c===selectedCol+1)return[1,'→'];
      if(r===selectedRow+1&&c===selectedCol)return[2,'↓'];
      if(r===selectedRow&&c===selectedCol-1)return[3,'←'];
      return null;
    };
    el.innerHTML=Array.from({length:BOARD_SIZE*BOARD_SIZE},(_,i)=>{
      const w=puzzle.walls[i],robot=state.findIndex(x=>x===i),isTarget=i===puzzle.target,dir=directionFromBoardClick(selectedCell,i),hint=hintForCell(i);
      return `<div class="r-cell ${w&1?'wall-u':''} ${w&2?'wall-r':''} ${w&4?'wall-d':''} ${w&8?'wall-l':''} ${blocked.has(i)?'blocked':''} ${dir!=null?'board-move-zone':''}" ${dir!=null?`data-board-dir="${dir}"`:''}>${isTarget?`<span class="target ${ROBOT_COLORS[puzzle.targetRobot]}"></span>`:''}${hint&&robot<0&&!blocked.has(i)?`<span class="board-arrow-hint dir-${hint[0]}">${hint[1]}</span>`:''}${robot>=0?`<button type="button" class="robot ${ROBOT_COLORS[robot]} ${robot===selected?'selected':''}" data-board-robot="${robot}" aria-label="${['빨강','노랑','초록','파랑'][robot]} 로봇 선택"></button>`:''}</div>`;
    }).join('');
    el.querySelectorAll('[data-board-robot]').forEach(b=>b.onclick=e=>{e.stopPropagation();selected=Number(b.dataset.boardRobot);renderPicker();render();});
    el.querySelectorAll('[data-board-dir]').forEach(c=>c.onclick=e=>{if(e.target.closest('[data-board-robot]'))return;doMove(Number(c.dataset.boardDir));});
  };
  const reset=()=>{state=[...puzzle.robots];moves=[];selected=puzzle.targetRobot;renderPicker();render();};
  const doMove=dir=>{const next=moveRobot(state,selected,dir,puzzle);if(next===state){toast('그 방향으로는 움직일 수 없습니다.');return;}state=next;moves.push([selected,dir]);render();if(state[puzzle.targetRobot]===puzzle.target){const count=moves.length;setTimeout(()=>openNameModal({title:'클리어!',big:`${count}회`,rankText:'더 적은 횟수로 다시 성공하면 개인 기록이 갱신됩니다.',onSubmit:n=>submitResult('ricochet',n,count),onClose:()=>{reset();refreshLb();}}),120);}};
  document.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>doMove(Number(b.dataset.dir)));document.querySelector('#resetRicochet').onclick=()=>{reset();toast('도전을 초기화했습니다.');};
  window.onkeydown=e=>{const map={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3};if(map[e.key]!=null){e.preventDefault();doMove(map[e.key]);}};render();renderPicker();
}

async function renderPensterdam(){
  const pieceNames=Object.keys(PIECES);let weekdayMode=localStorage.getItem(STORAGE_PREFIX+'pentorini_weekday_mode')||'en',puzzle=getPentoriniPuzzle(kstDate(),weekdayMode),board=Array(63).fill(null),selected='F',rotation=0,flipped=false;const placed={};
  const applyHoles=()=>{puzzle.holes.forEach(i=>board[i]='#');};
  applyHoles();
  shell(`<div class="page-head"><div><h1>🧩 오늘의 펜토리니</h1><p>${formatDate(puzzle.date)} · 오늘의 월 / 일 / 요일 3칸을 남기고 나머지를 12개 타일로 모두 채우세요.</p></div><div class="actions"><button class="ghost" id="backHome">← 홈</button><button class="danger" id="resetPento">도전 초기화</button></div></div><div class="pento-wrap"><section class="panel pentorini-panel"><div id="pboard" class="pento-board"></div></section><aside class="panel"><div class="weekday-choice"><div class="weekday-choice-head"><b>요일 칸 선택</b><small>English / 한자 중 하나</small></div><div class="weekday-segment" id="weekdayMode"><button type="button" data-weekday-mode="en">English</button><button type="button" data-weekday-mode="hanja">한자</button></div><p>펜토리니 보드에는 두 요일 표기가 모두 있습니다. 선택한 쪽의 오늘 요일 1칸만 남겨두면 됩니다.</p></div><h3>타일</h3><div id="piecePreview" class="piece-preview"></div><div class="anchor-help"><span class="anchor-sample"></span><span>흰 점이 기준 칸입니다. 보드에서 클릭한 칸과 이 칸이 맞춰집니다.</span></div><div class="transform-actions"><button class="secondary" id="rotatePiece">↻ 회전</button><button class="secondary" id="flipPiece">⇋ 뒤집기</button></div><div id="pieceBank" class="piece-bank"></div><p class="pento-tip">타일 선택 → 회전/뒤집기 → 보드에서 기준이 될 칸 클릭. 이미 놓은 타일을 누르면 다시 가져옵니다.</p><h3 style="margin-top:18px">오늘의 순위</h3><div id="sideLb"><div class="empty">불러오는 중…</div></div></aside></div>`);
  document.querySelector('#backHome').onclick=()=>location.hash='#/';
  const refreshLb=async()=>document.querySelector('#sideLb').innerHTML=leaderboardHtml('pensterdam',await loadLeaderboard('pensterdam',5),false,false); await refreshLb();
  const currentPiece=()=>transformPieceState(PIECES[selected],PIECE_ANCHORS[selected],rotation,flipped);
  const removePiece=name=>{if(!placed[name])return;placed[name].forEach(i=>board[i]=null);delete placed[name];applyHoles();};
  const miniShapeHtml=(name,points,anchor=null,compact=false)=>{
    const h=Math.max(...points.map(x=>x[0]))+1,w=Math.max(...points.map(x=>x[1]))+1,cells=new Set(points.map(([r,c])=>`${r},${c}`)),size=compact?12:21,has=(r,c)=>cells.has(`${r},${c}`);
    return `<span class="mini-grid ${compact?'compact':''}" style="grid-template-columns:repeat(${w},${size}px);--mini-size:${size}px">${Array.from({length:h*w},(_,i)=>{const r=Math.floor(i/w),c=i%w,key=`${r},${c}`;if(!cells.has(key))return '<span class="mini-cell mini-empty"></span>';const isAnchor=anchor&&anchor[0]===r&&anchor[1]===c;return `<span class="mini-cell joined-piece piece-${name} ${joinedCellClasses(has,r,c)} ${isAnchor?'anchor-cell':''}"></span>`;}).join('')}</span>`;
  };
  const renderPreview=()=>{const cur=currentPiece();document.querySelector('#piecePreview').innerHTML=miniShapeHtml(selected,cur.points,cur.anchor,false);};
  const renderBank=()=>{document.querySelector('#pieceBank').innerHTML=pieceNames.map((n,idx)=>`<button class="piece-btn ${selected===n?'selected':''} ${placed[n]?'placed':''}" data-piece="${n}" aria-label="펜토리니 타일 ${idx+1}" title="타일 ${idx+1}">${miniShapeHtml(n,normalize(PIECES[n]),null,true)}</button>`).join('');document.querySelectorAll('[data-piece]').forEach(b=>b.onclick=()=>{const n=b.dataset.piece;if(placed[n])removePiece(n);selected=n;rotation=0;flipped=false;renderAll();});};
  const tryPlace=boardAnchor=>{removePiece(selected);const ar=Math.floor(boardAnchor/7),ac=boardAnchor%7,cur=currentPiece(),shape=cur.points,anchor=cur.anchor,coords=shape.map(([r,c])=>[ar+(r-anchor[0]),ac+(c-anchor[1])]),inBounds=coords.every(([r,c])=>r>=0&&r<9&&c>=0&&c<7),cells=coords.map(([r,c])=>r*7+c),valid=inBounds&&cells.every(i=>board[i]==null);if(!valid){toast('그 위치에는 놓을 수 없습니다. 기준 칸을 다른 곳에 맞춰보세요.');renderAll();return;}cells.forEach(i=>board[i]=selected);placed[selected]=cells;renderAll();if(pieceNames.every(n=>placed[n]))setTimeout(()=>openNameModal({title:'완성!',big:formatClock(new Date().toISOString()),rankText:'순위는 걸린 시간이 아니라 실제로 먼저 완성한 현재 시각 순입니다.',onSubmit:n=>submitResult('pensterdam',n,0),onClose:()=>{reset();refreshLb();}}),120);};
  const boardPieceClasses=(i,name)=>{const r=Math.floor(i/7),c=i%7,has=(rr,cc)=>rr>=0&&rr<9&&cc>=0&&cc<7&&board[rr*7+cc]===name;return joinedCellClasses(has,r,c);};
  const renderBoard=()=>{
    const el=document.querySelector('#pboard');
    el.innerHTML=board.map((v,i)=>`<button class="p-cell ${pentoriniCellMeta(i,weekdayMode)} ${v==='#'?'today-hole':''} ${v&&v!=='#'?'occupied':''}" data-cell="${i}" aria-label="${v==='#'?'오늘 남겨둘 칸':v?'놓인 타일':'빈 칸'}"><span class="calendar-label">${PENTORINI_LABELS[i]}</span>${v&&v!=='#'?`<span class="piece-fill joined-piece piece-${v} ${boardPieceClasses(i,v)}"></span>`:''}</button>`).join('');
    el.querySelectorAll('[data-cell]').forEach(c=>c.onclick=()=>{const i=Number(c.dataset.cell),v=board[i];if(v==='#')return;if(v){removePiece(v);selected=v;rotation=0;flipped=false;renderAll();}else tryPlace(i);});
  };
  const renderWeekdayMode=()=>{document.querySelectorAll('[data-weekday-mode]').forEach(b=>{const active=b.dataset.weekdayMode===weekdayMode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active?'true':'false');});};
  const renderAll=()=>{renderBoard();renderBank();renderPreview();renderWeekdayMode();};
  const reset=()=>{board=Array(63).fill(null);Object.keys(placed).forEach(k=>delete placed[k]);selected='F';rotation=0;flipped=false;puzzle=getPentoriniPuzzle(kstDate(),weekdayMode);applyHoles();renderAll();};
  document.querySelectorAll('[data-weekday-mode]').forEach(b=>b.onclick=()=>{const next=b.dataset.weekdayMode;if(next===weekdayMode)return;weekdayMode=next;localStorage.setItem(STORAGE_PREFIX+'pentorini_weekday_mode',weekdayMode);reset();toast(`${weekdayMode==='en'?'English':'한자'} 요일 칸으로 바꿨습니다.`);});
  document.querySelector('#rotatePiece').onclick=()=>{rotation=(rotation+1)%4;renderPreview();};document.querySelector('#flipPiece').onclick=()=>{flipped=!flipped;renderPreview();};document.querySelector('#resetPento').onclick=()=>{reset();toast('도전을 초기화했습니다.');};renderAll();
}

async function renderYahtzee(){
  let scorecard=Object.fromEntries(ALL.map(c=>[c,null])),dice=[0,0,0,0,0],held=[false,false,false,false,false],rollCount=0,round=1,bonusCount=0;
  shell(`<div class="page-head"><div><h1>🎲 Yahtzee</h1><p>13라운드 · 라운드당 최대 3번 굴림 · Forced Joker Rule 적용</p></div><div class="actions"><button class="ghost" id="backHome">← 홈</button><button class="danger" id="newYahtzee">새 게임</button></div></div><div class="yahtzee-layout"><section class="panel dice-area"><div class="round-info" id="roundInfo"></div><div class="dice-row" id="diceRow"></div><button class="primary roll-btn" id="rollDice">주사위 굴리기</button><div class="hint" style="margin-top:12px">굴린 뒤 남길 주사위를 눌러 HOLD. 다시 눌러 해제할 수 있습니다. 빈 점수칸 하나를 반드시 기록하면 다음 라운드로 갑니다.</div><h3 style="margin-top:18px">올타임 TOP 5</h3><div id="sideLb"><div class="empty">불러오는 중…</div></div></section><section class="panel"><table class="score-table"><thead><tr><th>족보</th><th>기록</th></tr></thead><tbody id="scoreBody"></tbody></table></section></div>`);
  document.querySelector('#backHome').onclick=()=>location.hash='#/';const refreshLb=async()=>document.querySelector('#sideLb').innerHTML=leaderboardHtml('yahtzee',await loadLeaderboard('yahtzee',5),false,false);await refreshLb();
  const renderDice=()=>{document.querySelector('#diceRow').innerHTML=dice.map((v,i)=>`<button class="die ${held[i]?'held':''}" data-die="${i}" ${rollCount===0?'disabled':''}>${v||'–'}</button>`).join('');document.querySelectorAll('[data-die]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.die);held[i]=!held[i];renderDice();});document.querySelector('#roundInfo').textContent=`라운드 ${round}/13 · ${rollCount}/3회 굴림`;const rb=document.querySelector('#rollDice');rb.disabled=rollCount>=3;rb.textContent=rollCount===0?'주사위 굴리기':rollCount<3?'다시 굴리기':'점수칸을 선택하세요';};
  const renderScores=()=>{const scoring=rollCount?getScoringOptions(scorecard,dice):{options:{},forced:false,yahtzeeBonus:0};const row=c=>{const val=scorecard[c],has=Object.prototype.hasOwnProperty.call(scoring.options,c);return `<tr><td><b>${LABELS[c]}</b>${c==='yahtzee'?'<div class="bonus-note">50점 · 이후 조건 충족 Yahtzee마다 +100</div>':''}</td><td>${val!=null?`<span class="filled-score">${val}</span>`:has?`<button class="score-option ${scoring.forced?'forced':''}" data-score="${c}">${scoring.options[c]}점 기록</button>`:'—'}</td></tr>`;};const t=totals(scorecard,bonusCount);document.querySelector('#scoreBody').innerHTML=UPPER.map(row).join('')+`<tr class="score-total"><td>Upper Bonus (63+)</td><td>${t.upperBonus}</td></tr>`+LOWER.map(row).join('')+`<tr><td><b>YAHTZEE BONUS</b></td><td>${bonusCount}회 · ${t.bonusPoints}점</td></tr><tr class="score-total"><td>총점</td><td>${t.total}</td></tr>`;document.querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>chooseScore(b.dataset.score));};
  const finish=async()=>{const t=totals(scorecard,bonusCount),data=await loadLeaderboard('yahtzee',100),others=(data.items||[]).filter(x=>x.player_id!==playerId()),estimated=1+others.filter(x=>x.metric>=t.total).length;openNameModal({title:'게임 종료!',big:`${t.total}점`,rankText:`현재 예상 전체 ${estimated}위`,onSubmit:n=>submitResult('yahtzee',n,t.total),onCloseLabel:'새 게임',onClose:()=>{reset();refreshLb();}});};
  const chooseScore=category=>{if(!rollCount)return;const scoring=getScoringOptions(scorecard,dice);if(!Object.prototype.hasOwnProperty.call(scoring.options,category))return;scorecard[category]=scoring.options[category];if(scoring.yahtzeeBonus)bonusCount++;if(ALL.every(c=>scorecard[c]!=null)){renderScores();finish();return;}round++;dice=[0,0,0,0,0];held=[false,false,false,false,false];rollCount=0;renderDice();renderScores();};
  const reset=()=>{scorecard=Object.fromEntries(ALL.map(c=>[c,null]));dice=[0,0,0,0,0];held=[false,false,false,false,false];rollCount=0;round=1;bonusCount=0;renderDice();renderScores();};
  document.querySelector('#rollDice').onclick=()=>{if(rollCount>=3)return;dice=dice.map((v,i)=>held[i]&&rollCount>0?v:rollOne());rollCount++;renderDice();renderScores();};document.querySelector('#newYahtzee').onclick=()=>{reset();toast('새 게임을 시작했습니다.');};renderDice();renderScores();
}

async function router(){window.onkeydown=null;const route=(location.hash||'#/').slice(2);if(route==='ricochet')return renderRicochet();if(route==='pensterdam')return renderPensterdam();if(route==='yahtzee')return renderYahtzee();return renderHome();}
window.addEventListener('hashchange',router);router();
