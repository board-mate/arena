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
const onlineConfigured = () => configured() && Boolean(window.supabase?.createClient);
const sb = onlineConfigured() ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null;
let routeCleanups=[];
function addCleanup(fn){ routeCleanups.push(fn); }
function clearRouteCleanups(){ routeCleanups.splice(0).forEach(fn=>{try{fn();}catch{}}); }
async function nicknameAuthEmail(n){
  const key=n.trim().toLowerCase();
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
  const hex=[...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');
  return `u_${hex}@boardmate.local`;
}
async function authSession(){ if(!sb)return null; const {data}=await sb.auth.getSession(); return data.session||null; }
async function authProfile(){ const sess=await authSession(); if(!sess)return null; const {data,error}=await sb.from('boardmate_profiles').select('user_id,nickname').eq('user_id',sess.user.id).single(); if(error)throw error; return data; }
function tierInfo(row){
  const wins=Number(row?.wins||0),losses=Number(row?.losses||0),rank=Number(row?.elo_rank||0);
  if(rank>=1&&rank<=5)return {text:`🏆 #${rank}`,cls:'rank'};
  if(wins>=2 && wins/(wins+losses||1)>=.5)return {text:'🥇 골드',cls:'gold'};
  if(wins>=1)return {text:'🥈 실버',cls:'silver'};
  return {text:'🥉 브론즈',cls:'bronze'};
}

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
  app.innerHTML=`<div class="app-shell"><header class="topbar"><button class="brand-btn" id="homeBtn"><span class="brand-mark">●</span> BOARDMATE</button><nav class="topnav"><button data-nav="">오늘 게임</button><button data-nav="solo">1인플</button><button data-nav="multi">다인플</button></nav><div class="top-date">${formatDate(kstDate())}</div></header><main class="container">${content}${footer()}</main></div>`;
  document.querySelector('#homeBtn')?.addEventListener('click',()=>location.hash='#/');
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>location.hash=`#/${b.dataset.nav}`);
  const route=(location.hash||'#/').slice(2).split('/')[0];
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',(b.dataset.nav===''&&route==='')||b.dataset.nav===route));
}

// -------------------- shared leaderboard --------------------
function periodKey(game){ return game==='yahtzee' ? 'alltime' : kstDate(); }
function localKey(game){ return `${STORAGE_PREFIX}scores:${game}:${periodKey(game)}`; }
function getLocalRows(game){ try{return JSON.parse(localStorage.getItem(localKey(game))||'[]');}catch{return [];} }
function sortedRows(game, rows){
  return [...rows].sort((a,b)=>{
    if(game==='yahtzee') return b.metric-a.metric || a.completed_at.localeCompare(b.completed_at);
    if(game==='pensterdam') return a.metric-b.metric || a.completed_at.localeCompare(b.completed_at);
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
    else if(game==='pensterdam' && metric<old.metric) rows[idx]={...old,nickname:n,metric,completed_at:now};
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
    const order=game==='yahtzee'?'metric.desc,completed_at.asc':game==='pensterdam'?'metric.asc,completed_at.asc':'metric.asc,completed_at.asc';
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
  if(game==='pensterdam') return `도움 ${row.metric}칸 · ${formatClock(row.completed_at)}`;
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
// 실제 리코셰처럼 8×8 고정 보드 4장을 회전/배치해서 16×16을 구성합니다.
// 각 보드의 L자 벽은 서로 붙지 않도록 안쪽에 떨어져 배치되어 있습니다.
const RICOCHET_TILES=[
  {corners:[[1,2,6],[2,5,12],[4,1,3],[5,5,9]],targets:[[1,2],[2,5],[4,1],[5,5]]},
  {corners:[[1,4,12],[3,1,6],[4,5,3],[6,3,9]],targets:[[1,4],[3,1],[4,5],[6,3]]},
  {corners:[[2,1,6],[2,5,9],[5,2,3],[6,5,12]],targets:[[2,1],[2,5],[5,2],[6,5]]},
  {corners:[[1,1,6],[3,5,12],[5,1,3],[6,4,9]],targets:[[1,1],[3,5],[5,1],[6,4]]}
];
function addWallPair(walls,cell,bit){
  const step={1:[-1,0,4],2:[0,1,8],4:[1,0,1],8:[0,-1,2]},r=Math.floor(cell/16),c=cell%16,[dr,dc,op]=step[bit],nr=r+dr,nc=c+dc;
  walls[cell]|=bit;if(nr>=0&&nr<16&&nc>=0&&nc<16)walls[nr*16+nc]|=op;
}
function rot8(r,c,rot){for(let i=0;i<rot;i++)[r,c]=[c,7-r];return[r,c];}
function rotMask(mask,rot){let out=0;const vec=[[1,-1,0],[2,0,1],[4,1,0],[8,0,-1]];for(const [bit,dr,dc] of vec)if(mask&bit){let a=dr,b=dc;for(let i=0;i<rot;i++)[a,b]=[b,-a];out|=a===-1?1:b===1?2:a===1?4:8;}return out;}
function seededRand(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function dateNumber(dateKey){const [y,m,d]=dateKey.split('-').map(Number);return Math.floor(Date.UTC(y,m-1,d)/86400000);}
function buildDailyRicochetBoard(dateKey){
  const rnd=seededRand(Math.abs(dateNumber(dateKey))*2654435761),order=[0,1,2,3];
  for(let i=3;i>0;i--){const j=Math.floor(rnd()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  const walls=Array(256).fill(0),targets=[];
  for(let c=0;c<16;c++){walls[c]|=1;walls[240+c]|=4;}
  for(let r=0;r<16;r++){walls[r*16]|=8;walls[r*16+15]|=2;}
  const origins=[[0,0],[0,8],[8,0],[8,8]];
  origins.forEach(([or,oc],q)=>{
    const tile=RICOCHET_TILES[order[q]],rot=Math.floor(rnd()*4);
    for(const [lr,lc,mask] of tile.corners){const [rr,cc]=rot8(lr,lc,rot),g=(or+rr)*16+(oc+cc),m=rotMask(mask,rot);for(const bit of [1,2,4,8])if(m&bit)addWallPair(walls,g,bit);}
    for(const [lr,lc] of tile.targets){const [rr,cc]=rot8(lr,lc,rot);targets.push((or+rr)*16+(oc+cc));}
  });
  return{walls,targets,layout:order};
}
function moveRobot(state,robotIndex,dirIndex,puzzle){const dir=DIRS[dirIndex],current=state[robotIndex];let r=Math.floor(current/16),c=current%16;const occupied=new Set(state);occupied.delete(current);const blocked=new Set(puzzle.blocked);while(true){const pos=r*16+c;if(puzzle.walls[pos]&dir.bit)break;const nr=r+dir.dr,nc=c+dir.dc;if(nr<0||nr>=16||nc<0||nc>=16)break;const np=nr*16+nc;if(blocked.has(np)||occupied.has(np))break;r=nr;c=nc;}const next=r*16+c;if(next===current)return state;const copy=[...state];copy[robotIndex]=next;return copy;}
function shortestRicochet(puzzle,maxDepth=9){
  const start=[...puzzle.robots];if(start[puzzle.targetRobot]===puzzle.target)return 0;
  let frontier=[start];const seen=new Set([start.join('-')]);
  for(let depth=1;depth<=maxDepth;depth++){
    const nf=[];
    for(const st of frontier)for(let robot=0;robot<4;robot++)for(let dir=0;dir<4;dir++){
      const nx=moveRobot(st,robot,dir,puzzle);if(nx===st)continue;if(nx[puzzle.targetRobot]===puzzle.target)return depth;const k=nx.join('-');if(!seen.has(k)){seen.add(k);nf.push(nx);}
    }
    frontier=nf;if(!frontier.length)break;
  }
  return null;
}
const RICOCHET_PUZZLE_CACHE=new Map();
function getRicochetPuzzle(dateKey){
  if(RICOCHET_PUZZLE_CACHE.has(dateKey))return RICOCHET_PUZZLE_CACHE.get(dateKey);
  const boardInfo=buildDailyRicochetBoard(dateKey),blocked=[...BLOCKED_CELLS],blockedSet=new Set(blocked),rnd=seededRand(Math.abs(dateNumber(dateKey))*2246822519+97),safe=[];
  for(let i=0;i<256;i++)if(!blockedSet.has(i))safe.push(i);
  let best=null,bestDepth=-1;
  for(let attempt=0;attempt<36;attempt++){
    const target=boardInfo.targets[Math.floor(rnd()*boardInfo.targets.length)],targetRobot=Math.floor(rnd()*4),robots=[];
    while(robots.length<4){const cell=safe[Math.floor(rnd()*safe.length)];if(cell!==target&&!robots.includes(cell))robots.push(cell);}
    const candidate={date:dateKey,walls:boardInfo.walls,blocked,robots,targetRobot,target};
    const depth=shortestRicochet(candidate,9);
    if(depth!=null&&depth>bestDepth){best=candidate;bestDepth=depth;}
    if(depth!=null&&depth>=6&&depth<=9){best=candidate;break;}
  }
  if(!best){best={date:dateKey,walls:boardInfo.walls,blocked,robots:[17,46,209,238],targetRobot:0,target:boardInfo.targets[0]};}
  RICOCHET_PUZZLE_CACHE.set(dateKey,best);return best;
}
function directionFromBoardClick(fromCell,toCell){
  if(fromCell===toCell)return null;const fr=Math.floor(fromCell/16),fc=fromCell%16,tr=Math.floor(toCell/16),tc=toCell%16;
  if(fr===tr)return tc>fc?1:3;if(fc===tc)return tr>fr?2:0;return null;
}

// -------------------- Pentorini (legacy leaderboard key: pensterdam) --------------------
const PIECES={F:[[0,1],[0,2],[1,0],[1,1],[2,1]],I:[[0,0],[1,0],[2,0],[3,0],[4,0]],L:[[0,0],[1,0],[2,0],[3,0],[3,1]],P:[[0,0],[0,1],[1,0],[1,1],[2,0]],N:[[0,1],[1,1],[2,0],[2,1],[3,0]],T:[[0,0],[0,1],[0,2],[1,1],[2,1]],U:[[0,0],[0,2],[1,0],[1,1],[1,2]],V:[[0,0],[1,0],[2,0],[2,1],[2,2]],W:[[0,0],[1,0],[1,1],[2,1],[2,2]],X:[[0,1],[1,0],[1,1],[1,2],[2,1]],Y:[[0,0],[1,0],[2,0],[3,0],[2,1]],Z:[[0,0],[0,1],[1,1],[2,1],[2,2]]};
const PENTO_NAMES=Object.keys(PIECES),HELPER_NAMES=['H1','H2','H3','H4','H5'],HELPER_HOME=[64,65,66,67,68],PENTORINI_VALID=new Set([...Array(63).keys(),...HELPER_HOME]);
function normalize(points){const mr=Math.min(...points.map(p=>p[0])),mc=Math.min(...points.map(p=>p[1]));return points.map(([r,c])=>[r-mr,c-mc]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);}
const PIECE_ANCHORS={F:[1,1],I:[2,0],L:[2,0],P:[1,0],N:[2,1],T:[1,1],U:[1,1],V:[2,0],W:[1,1],X:[1,1],Y:[2,0],Z:[1,1]};
function transformRawPoint([r,c],rotation=0,flipped=false){let x=r,y=flipped?-c:c;for(let i=0;i<((rotation%4)+4)%4;i++)[x,y]=[y,-x];return[x,y];}
function transformPieceState(points,anchor,rotation=0,flipped=false){const raw=points.map(p=>transformRawPoint(p,rotation,flipped)),rawAnchor=transformRawPoint(anchor,rotation,flipped),mr=Math.min(...raw.map(p=>p[0])),mc=Math.min(...raw.map(p=>p[1]));return{points:raw.map(([r,c])=>[r-mr,c-mc]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),anchor:[rawAnchor[0]-mr,rawAnchor[1]-mc]};}
const PENTORINI_LABELS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','25','26','27','28','29','30','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','月','火','水','木','金','土','日'];
const PENTORINI_MONTH_CELL={1:7,2:8,3:9,4:10,5:11,6:12,7:13,8:14,9:15,10:16,11:17,12:18};
const PENTORINI_WEEKDAY_EN_CELL={1:0,2:1,3:2,4:3,5:4,6:5,0:6};
const PENTORINI_WEEKDAY_HANJA_CELL={1:56,2:57,3:58,4:59,5:60,6:61,0:62};
const PENTORINI_DATE_CELL={};for(let d=1;d<=31;d++)PENTORINI_DATE_CELL[d]=24+d;
function getPentoriniPuzzle(dateKey,weekdayMode='en'){const d=new Date(`${dateKey}T12:00:00+09:00`),m=Number(dateKey.slice(5,7)),day=Number(dateKey.slice(8,10)),wd=d.getDay(),weekdayCell=(weekdayMode==='hanja'?PENTORINI_WEEKDAY_HANJA_CELL:PENTORINI_WEEKDAY_EN_CELL)[wd];return{date:dateKey,rows:10,cols:7,holes:[PENTORINI_MONTH_CELL[m],PENTORINI_DATE_CELL[day],weekdayCell],month:m,day,weekday:wd,weekdayMode};}
function joinedCellClasses(has,r,c){const u=!has(r-1,c),rr=!has(r,c+1),d=!has(r+1,c),l=!has(r,c-1),out=[];if(u)out.push('edge-u');if(rr)out.push('edge-r');if(d)out.push('edge-d');if(l)out.push('edge-l');if(u&&l)out.push('corner-tl');if(u&&rr)out.push('corner-tr');if(d&&l)out.push('corner-bl');if(d&&rr)out.push('corner-br');return out.join(' ');}
function pentoriniCellMeta(i,weekdayMode){const classes=[];if(i>=63){classes.push('helper-parking');return classes.join(' ');}if(i<=6){classes.push('weekday-cell','weekday-en');if(weekdayMode!=='en')classes.push('weekday-muted');}else if(i>=56){classes.push('weekday-cell','weekday-hanja');if(weekdayMode!=='hanja')classes.push('weekday-muted');}else if(i>=7&&i<=18)classes.push('month-cell');else classes.push('date-cell');if(i===19)classes.push('accent-date');if(i>=19&&i<=24)classes.push('duplicate-date');return classes.join(' ');}

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
  shell(`<section class="hero"><div><h1><span>BoardMate</span> Arcade</h1><p>보드메이트에서 같이 즐기는 웹 보드게임 공간.<br>데일리 퍼즐, AI 연습, 로그인 기반 온라인 방을 한 곳에 모았습니다.</p><div class="social-links"><a class="social-link" href="${LINKS.instagram}" target="_blank" rel="noreferrer">📷 Instagram</a><a class="social-link" href="${LINKS.somoim}" target="_blank" rel="noreferrer">👥 소모임</a><a class="social-link" href="${LINKS.shop}" target="_blank" rel="noreferrer">🛍 마플샵</a></div></div><div class="hero-badge">🎲</div></section>
  <section class="mode-grid"><button class="mode-card" data-go="solo"><span>🧠</span><b>1인플 · AI 대전</b><small>마스크맨 / 어콰이어 연습</small></button><button class="mode-card" data-go="multi"><span>🌐</span><b>다인플 · 온라인 방</b><small>회원 로그인 · 방 만들기 · 게임별 티어</small></button></section>
  <div class="section-title"><h2>오늘의 게임</h2><small>${formatDate(kstDate())} · KST</small></div><section class="game-grid">${homeCard('ricochet','🤖','리코셰','적은 이동 수 → 동률이면 먼저 클리어')} ${homeCard('pensterdam','🧩','펜토리니','도움칸 적게 사용 → 동률이면 먼저 클리어')} ${homeCard('yahtzee','🎲','Yahtzee','언제든 플레이 · 올타임 최고 점수')}</section><div id="connection"></div>`);
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>location.hash=`#/${b.dataset.go}`);
  for(const g of ['ricochet','pensterdam','yahtzee']){const data=await loadLeaderboard(g,5);const el=document.querySelector(`#lb-${g}`);if(el)el.innerHTML=leaderboardHtml(g,data,false);}
  bindHome();
  if(!configured()) document.querySelector('#connection').innerHTML='<div class="connection-note">현재는 로컬 순위 모드입니다. <b>config.js</b>에 Supabase 주소/키를 넣으면 공유 순위표와 온라인 기능을 사용할 수 있습니다.</div>';
}
function homeCard(game,icon,title,desc){return `<article class="game-card"><div class="icon">${icon}</div><h3>${title}</h3><p>${desc}</p><button class="primary" data-play="${game}">게임하기</button><div id="lb-${game}"><div class="empty">순위표 불러오는 중…</div></div></article>`;}
function bindHome(){document.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>location.hash=`#/${b.dataset.play}`);document.querySelectorAll('[data-more]').forEach(b=>b.onclick=async()=>{const g=b.dataset.more,card=b.closest('.game-card'),expanded=b.textContent==='접기',data=await loadLeaderboard(g,expanded?5:100);card.querySelector(`#lb-${g}`).innerHTML=leaderboardHtml(g,data,!expanded);bindHome();});}

function renderSolo(){
  shell(`<div class="page-head"><div><h1>🧠 1인플 · AI 대전</h1><p>업로드해 주신 AI 대전 HTML을 그대로 보존해 연습용 게임으로 연결했습니다.</p></div><div class="actions"><button class="ghost" id="backHome">← 홈</button></div></div><section class="library-grid"><article class="library-card maskmen"><div class="library-icon">🥊</div><h2>마스크맨</h2><p>3~6인 규칙을 AI들과 연습합니다. 4시즌 점수와 서열 추론 로직을 그대로 사용합니다.</p><a class="primary link-btn" href="./solo-maskmen.html">AI와 대전</a></article><article class="library-card acquire"><div class="library-icon">🏙️</div><h2>어콰이어</h2><p>타일 배치, 호텔 체인, 주식과 합병을 AI들과 연습합니다.</p><a class="primary link-btn" href="./solo-acquire.html">AI와 대전</a></article></section>`);
  document.querySelector('#backHome').onclick=()=>location.hash='#/';
}

async function loadRatingMap(game,userIds){
  if(!sb||!userIds.length)return{};const {data}=await sb.from('boardmate_rating_public').select('user_id,wins,losses,games,elo_rank').eq('game',game).in('user_id',userIds);return Object.fromEntries((data||[]).map(r=>[r.user_id,r]));
}
async function renderAuthPanel(){
  shell(`<div class="page-head"><div><h1>🌐 다인플 · 온라인</h1><p>방 만들기와 참여는 로그인이 필요합니다.</p></div><div class="actions"><button class="ghost" id="backHome">← 홈</button></div></div><section class="auth-card"><div class="auth-tabs"><button class="active" data-auth-tab="login">로그인</button><button data-auth-tab="signup">회원가입</button></div><form id="authForm"><input id="authNick" maxlength="20" placeholder="닉네임" required><input id="authPass" type="password" minlength="6" placeholder="비밀번호 (6자 이상)" required><button class="primary" id="authSubmit">로그인</button><div id="authStatus" class="bonus-note"></div></form><p class="auth-note">이메일은 받지 않습니다. 사이트 내부에서 닉네임을 Supabase Auth용 식별자로 변환해 사용합니다.</p></section>`);
  document.querySelector('#backHome').onclick=()=>location.hash='#/';let mode='login';
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>{mode=b.dataset.authTab;document.querySelectorAll('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelector('#authSubmit').textContent=mode==='login'?'로그인':'회원가입';});
  document.querySelector('#authForm').onsubmit=async e=>{e.preventDefault();const n=document.querySelector('#authNick').value.trim(),pw=document.querySelector('#authPass').value,st=document.querySelector('#authStatus'),btn=document.querySelector('#authSubmit');if(!n||pw.length<6)return;btn.disabled=true;st.textContent='처리 중…';try{const email=await nicknameAuthEmail(n);if(mode==='signup'){const {error}=await sb.auth.signUp({email,password:pw,options:{data:{nickname:n}}});if(error)throw error;st.textContent='가입 완료. 로그인 상태를 확인합니다…';}else{const {error}=await sb.auth.signInWithPassword({email,password:pw});if(error)throw error;}setTimeout(()=>renderMulti(),250);}catch(err){st.textContent=err.message.includes('duplicate')?'이미 사용 중인 닉네임입니다.':err.message;}finally{btn.disabled=false;}};
}

async function renderMulti(){
  if(!onlineConfigured()){shell(`<div class="page-head"><div><h1>🌐 다인플 · 온라인</h1><p>Supabase 연결 후 사용할 수 있습니다.</p></div></div><div class="connection-note">config.js 설정과 최신 supabase.sql 실행이 필요합니다.</div>`);return;}
  const sess=await authSession();if(!sess){await renderAuthPanel();return;}
  let me;try{me=await authProfile();}catch(e){await sb.auth.signOut();return renderAuthPanel();}
  shell(`<div class="page-head"><div><h1>🌐 다인플 · 온라인</h1><p>방을 만들거나 열려 있는 방에 참가하세요.</p></div><div class="actions"><span class="login-chip">👤 ${esc(me.nickname)}</span><button class="ghost" id="logoutBtn">로그아웃</button></div></div><section class="room-create"><h2>방 만들기</h2><form id="roomForm"><input id="roomTitle" maxlength="40" placeholder="방 제목" required><select id="roomGame"><option value="maskmen">마스크맨</option><option value="acquire">어콰이어</option></select><select id="roomMax">${[3,4,5,6].map(n=>`<option value="${n}" ${n===4?'selected':''}>${n}명</option>`).join('')}</select><button class="primary">방 만들기</button></form><div id="roomStatus" class="bonus-note"></div></section><div class="section-title"><h2>열린 방</h2><button class="ghost mini" id="refreshRooms">새로고침</button></div><div id="roomList"><div class="empty">방을 불러오는 중…</div></div>`);
  document.querySelector('#logoutBtn').onclick=async()=>{await sb.auth.signOut();renderMulti();};
  document.querySelector('#roomForm').onsubmit=async e=>{e.preventDefault();const st=document.querySelector('#roomStatus');try{const {data,error}=await sb.rpc('create_boardmate_room',{p_title:document.querySelector('#roomTitle').value.trim(),p_game:document.querySelector('#roomGame').value,p_max_players:Number(document.querySelector('#roomMax').value)});if(error)throw error;location.hash=`#/room/${data}`;}catch(err){st.textContent=err.message;}};
  const loadRooms=async()=>{const box=document.querySelector('#roomList');if(!box)return;const {data:rooms,error}=await sb.from('boardmate_rooms').select('*').in('status',['open','playing']).order('created_at',{ascending:false}).limit(40);if(error){box.innerHTML=`<div class="empty">${esc(error.message)}</div>`;return;}if(!rooms?.length){box.innerHTML='<div class="empty">현재 열려 있는 방이 없습니다.</div>';return;}const ids=rooms.map(r=>r.id),{data:members}=await sb.from('boardmate_room_members').select('room_id,user_id,seat').in('room_id',ids),uids=[...new Set((members||[]).map(m=>m.user_id))],{data:profiles}=uids.length?await sb.from('boardmate_profiles').select('user_id,nickname').in('user_id',uids):{data:[]},pm=Object.fromEntries((profiles||[]).map(x=>[x.user_id,x.nickname]));const mm={};(members||[]).forEach(m=>(mm[m.room_id]??=[]).push(m));box.innerHTML=rooms.map(r=>{const ms=mm[r.id]||[],mine=ms.some(m=>m.user_id===me.user_id),host=pm[r.host_id]||'방장';return `<article class="room-row"><div><div class="room-title"><span class="game-pill ${r.game}">${r.game==='maskmen'?'🥊 마스크맨':'🏙️ 어콰이어'}</span><b>${esc(r.title)}</b></div><small>${esc(host)} · ${ms.length}/${r.max_players}명 · ${r.status==='open'?'대기 중':'게임 중'}</small></div><button class="${mine?'primary':'ghost'}" data-room-action="${r.id}" data-mine="${mine?'1':'0'}" data-status="${r.status}">${mine?'방으로':r.status==='open'?'참가':'관전 불가'}</button></article>`;}).join('');box.querySelectorAll('[data-room-action]').forEach(b=>b.onclick=async()=>{if(b.dataset.mine==='1'){location.hash=`#/room/${b.dataset.roomAction}`;return;}if(b.dataset.status!=='open')return;try{const {error}=await sb.rpc('join_boardmate_room',{p_room_id:b.dataset.roomAction});if(error)throw error;location.hash=`#/room/${b.dataset.roomAction}`;}catch(err){toast(err.message);}});};
  document.querySelector('#refreshRooms').onclick=loadRooms;await loadRooms();const timer=setInterval(loadRooms,2500);addCleanup(()=>clearInterval(timer));
}

async function renderRoom(roomId){
  if(!onlineConfigured())return renderMulti();const me=await authProfile();if(!me)return renderMulti();
  const load=async()=>{const [{data:room,error:rerr},{data:members,error:merr}]=await Promise.all([sb.from('boardmate_rooms').select('*').eq('id',roomId).single(),sb.from('boardmate_room_members').select('room_id,user_id,seat,joined_at').eq('room_id',roomId).order('seat')]);if(rerr||merr)throw(rerr||merr);const uids=members.map(m=>m.user_id),{data:profiles}=await sb.from('boardmate_profiles').select('user_id,nickname').in('user_id',uids),pm=Object.fromEntries((profiles||[]).map(p=>[p.user_id,p.nickname])),ratings=await loadRatingMap(room.game,uids);return{room,members:members.map(m=>({...m,nickname:pm[m.user_id]||'플레이어',rating:ratings[m.user_id]}))};};
  let data;try{data=await load();}catch(e){toast('방을 불러오지 못했습니다.');location.hash='#/multi';return;}
  if(!data.members.some(m=>m.user_id===me.user_id)){try{const {error}=await sb.rpc('join_boardmate_room',{p_room_id:roomId});if(error)throw error;data=await load();}catch(e){toast(e.message);location.hash='#/multi';return;}}
  const draw=async()=>{data=await load();const {room,members}=data,isHost=room.host_id===me.user_id; shell(`<div class="page-head"><div><h1>${room.game==='maskmen'?'🥊':'🏙️'} ${esc(room.title)}</h1><p>${room.game==='maskmen'?'마스크맨':'어콰이어'} · ${members.length}/${room.max_players}명 · ${room.status==='open'?'대기 중':room.status==='playing'?'게임 중':'종료'}</p></div><div class="actions"><button class="ghost" id="backMulti">← 방 목록</button></div></div><section class="lobby-card"><h2>참여 인원</h2><div class="member-list">${members.map(m=>{const t=tierInfo(m.rating);return `<div class="member-row"><span class="seat-no">${m.seat+1}</span><span class="tier ${t.cls}">${t.text}</span><b>${esc(m.nickname)}</b>${m.user_id===room.host_id?'<small>방장</small>':''}</div>`;}).join('')}</div><div class="lobby-actions">${room.status==='open'&&isHost?`<button class="primary" id="startRoom" ${members.length<3?'disabled':''}>${members.length<3?'3명부터 시작 가능':'게임 시작'}</button>`:''}${room.status==='open'?'<button class="danger" id="leaveRoom">방 나가기</button>':''}${room.status==='playing'?`<a class="primary link-btn" href="./online-${room.game}.html?room=${encodeURIComponent(room.id)}">게임 입장</a>`:''}</div><p class="pento-tip">표시 티어: ELO 1~5위는 #순위, 그 외 2승+·승률 50% 이상 골드 / 1승+ 실버 / 나머지 브론즈. 실제 ELO 숫자는 공개하지 않습니다.</p></section>`);document.querySelector('#backMulti').onclick=()=>location.hash='#/multi';document.querySelector('#startRoom')?.addEventListener('click',async()=>{try{const {error}=await sb.rpc('start_boardmate_room',{p_room_id:roomId});if(error)throw error;location.href=`./online-${room.game}.html?room=${encodeURIComponent(room.id)}`;}catch(e){toast(e.message);}});document.querySelector('#leaveRoom')?.addEventListener('click',async()=>{try{const {error}=await sb.rpc('leave_boardmate_room',{p_room_id:roomId});if(error)throw error;location.hash='#/multi';}catch(e){toast(e.message);}});};
  await draw();const timer=setInterval(async()=>{if((location.hash||'').includes(`/room/${roomId}`))try{await draw();}catch{}},2200);addCleanup(()=>clearInterval(timer));
}

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
  let weekdayMode=localStorage.getItem(STORAGE_PREFIX+'pentorini_weekday_mode')||'en',puzzle=getPentoriniPuzzle(kstDate(),weekdayMode),board=Array(70).fill(null),selected='F',rotation=0,flipped=false;const placed={};
  const initializeBoard=()=>{board=Array(70).fill(null);board[63]='@';board[69]='@';Object.keys(placed).forEach(k=>delete placed[k]);HELPER_NAMES.forEach((h,i)=>{board[HELPER_HOME[i]]=h;placed[h]=[HELPER_HOME[i]];});puzzle.holes.forEach(i=>board[i]='#');};initializeBoard();
  shell(`<div class="page-head"><div><h1>🧩 오늘의 펜토리니</h1><p>${formatDate(puzzle.date)} · 월 / 일 / 요일 3칸을 남기고, 아래 5개 도움 타일까지 포함해 보드를 채우세요.</p></div><div class="actions"><button class="ghost" id="backHome">← 홈</button><button class="danger" id="resetPento">도전 초기화</button></div></div><div class="pento-wrap"><section class="panel pentorini-panel"><div class="helper-stat"><span>사용한 도움칸</span><b id="helperUsed">0 / 5</b><small>아래 주차칸의 1×1 타일을 날짜판으로 옮긴 개수</small></div><div id="pboard" class="pento-board"></div></section><aside class="panel"><div class="weekday-choice"><div class="weekday-choice-head"><b>요일 칸 선택</b><small>English / 한자 중 하나</small></div><div class="weekday-segment" id="weekdayMode"><button type="button" data-weekday-mode="en">English</button><button type="button" data-weekday-mode="hanja">한자</button></div><p>요일을 바꿔도 현재 배치는 유지합니다. 새 요일 칸을 덮고 있던 타일만 자동으로 회수합니다.</p></div><h3>타일</h3><div id="piecePreview" class="piece-preview"></div><div class="anchor-help"><span class="anchor-sample"></span><span>흰 점이 기준 칸입니다. 클릭한 보드 칸과 맞춰집니다.</span></div><div class="transform-actions"><button class="secondary" id="rotatePiece">↻ 회전</button><button class="secondary" id="flipPiece">⇋ 뒤집기</button></div><div id="pieceBank" class="piece-bank"></div><div class="helper-bank" id="helperBank"></div><p class="pento-tip">맨 아래 5칸은 도움 타일의 기본 주차칸입니다. 도움 타일을 날짜판으로 올리면 그만큼 펜토미노가 아래 주차칸까지 내려갈 수 있어 퍼즐이 쉬워집니다.</p><h3 style="margin-top:18px">오늘의 순위</h3><div id="sideLb"><div class="empty">불러오는 중…</div></div></aside></div>`);
  document.querySelector('#backHome').onclick=()=>location.hash='#/';
  const refreshLb=async()=>document.querySelector('#sideLb').innerHTML=leaderboardHtml('pensterdam',await loadLeaderboard('pensterdam',5),false,false);await refreshLb();
  const pieceDef=name=>HELPER_NAMES.includes(name)?{points:[[0,0]],anchor:[0,0]}:transformPieceState(PIECES[name],PIECE_ANCHORS[name],rotation,flipped);
  const currentPiece=()=>pieceDef(selected);
  const removePiece=(name,reapply=true)=>{if(!placed[name])return;placed[name].forEach(i=>{if(board[i]===name)board[i]=null;});delete placed[name];if(reapply)puzzle.holes.forEach(i=>board[i]='#');};
  const miniShapeHtml=(name,points,anchor=null,compact=false)=>{const h=Math.max(...points.map(x=>x[0]))+1,w=Math.max(...points.map(x=>x[1]))+1,cells=new Set(points.map(([r,c])=>`${r},${c}`)),size=compact?12:21,has=(r,c)=>cells.has(`${r},${c}`);return `<span class="mini-grid ${compact?'compact':''}" style="grid-template-columns:repeat(${w},${size}px);--mini-size:${size}px">${Array.from({length:h*w},(_,i)=>{const r=Math.floor(i/w),c=i%w,key=`${r},${c}`;if(!cells.has(key))return '<span class="mini-cell mini-empty"></span>';const isAnchor=anchor&&anchor[0]===r&&anchor[1]===c;return `<span class="mini-cell joined-piece ${HELPER_NAMES.includes(name)?'piece-helper':`piece-${name}`} ${joinedCellClasses(has,r,c)} ${isAnchor?'anchor-cell':''}"></span>`;}).join('')}</span>`;};
  const helpUsed=()=>HELPER_NAMES.filter(h=>placed[h]?.[0]<63).length;
  const renderPreview=()=>{const cur=currentPiece();document.querySelector('#piecePreview').innerHTML=miniShapeHtml(selected,cur.points,cur.anchor,false);document.querySelector('#rotatePiece').disabled=HELPER_NAMES.includes(selected);document.querySelector('#flipPiece').disabled=HELPER_NAMES.includes(selected);};
  const renderBank=()=>{document.querySelector('#pieceBank').innerHTML=PENTO_NAMES.map((n,idx)=>`<button class="piece-btn ${selected===n?'selected':''} ${placed[n]?'placed':''}" data-piece="${n}" title="타일 ${idx+1}">${miniShapeHtml(n,normalize(PIECES[n]),null,true)}</button>`).join('');document.querySelectorAll('[data-piece]').forEach(b=>b.onclick=()=>{const n=b.dataset.piece;if(placed[n])removePiece(n);selected=n;rotation=0;flipped=false;renderAll();});document.querySelector('#helperBank').innerHTML=`<b>도움 타일</b>${HELPER_NAMES.map((h,i)=>`<button class="helper-chip ${selected===h?'selected':''} ${placed[h]&&placed[h][0]>=63?'parked':''}" data-helper="${h}">${i+1}</button>`).join('')}`;document.querySelectorAll('[data-helper]').forEach(b=>b.onclick=()=>{const h=b.dataset.helper;if(placed[h])removePiece(h);selected=h;rotation=0;flipped=false;renderAll();});};
  const isComplete=()=>PENTO_NAMES.every(n=>placed[n])&&HELPER_NAMES.every(n=>placed[n])&&[...PENTORINI_VALID].every(i=>puzzle.holes.includes(i)||Boolean(board[i]&&board[i]!=='#'));
  const tryPlace=boardAnchor=>{removePiece(selected);const ar=Math.floor(boardAnchor/7),ac=boardAnchor%7,cur=currentPiece(),coords=cur.points.map(([r,c])=>[ar+(r-cur.anchor[0]),ac+(c-cur.anchor[1])]),cells=coords.map(([r,c])=>r*7+c),valid=coords.every(([r,c])=>r>=0&&r<10&&c>=0&&c<7)&&cells.every(i=>PENTORINI_VALID.has(i)&&board[i]==null);if(!valid){toast('그 위치에는 놓을 수 없습니다.');renderAll();return;}cells.forEach(i=>board[i]=selected);placed[selected]=cells;renderAll();if(isComplete()){const used=helpUsed();setTimeout(()=>openNameModal({title:'완성!',big:`도움 ${used}칸`,rankText:`도움칸을 적게 쓴 기록이 우선입니다. 같은 수면 먼저 완성한 사람이 앞섭니다.`,onSubmit:n=>submitResult('pensterdam',n,used),onClose:()=>{reset();refreshLb();}}),120);}};
  const boardPieceClasses=(i,name)=>{const r=Math.floor(i/7),c=i%7,has=(rr,cc)=>rr>=0&&rr<10&&cc>=0&&cc<7&&board[rr*7+cc]===name;return joinedCellClasses(has,r,c);};
  const renderBoard=()=>{const el=document.querySelector('#pboard');el.innerHTML=Array.from({length:70},(_,i)=>{if(!PENTORINI_VALID.has(i))return `<div class="p-cell invalid-cell"></div>`;const v=board[i],label=i<63?PENTORINI_LABELS[i]:'';return `<button class="p-cell ${pentoriniCellMeta(i,weekdayMode)} ${v==='#'?'today-hole':''} ${v&&v!=='#'?'occupied':''}" data-cell="${i}"><span class="calendar-label">${label}</span>${v&&v!=='#'?`<span class="piece-fill joined-piece ${HELPER_NAMES.includes(v)?'piece-helper':`piece-${v}`} ${boardPieceClasses(i,v)}"></span>`:''}</button>`;}).join('');el.querySelectorAll('[data-cell]').forEach(c=>c.onclick=()=>{const i=Number(c.dataset.cell),v=board[i];if(v==='#')return;if(v){removePiece(v);selected=v;rotation=0;flipped=false;renderAll();}else tryPlace(i);});document.querySelector('#helperUsed').textContent=`${helpUsed()} / 5`;};
  const renderWeekdayMode=()=>document.querySelectorAll('[data-weekday-mode]').forEach(b=>{const active=b.dataset.weekdayMode===weekdayMode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active?'true':'false');});
  const renderAll=()=>{renderBoard();renderBank();renderPreview();renderWeekdayMode();};
  const reset=()=>{selected='F';rotation=0;flipped=false;puzzle=getPentoriniPuzzle(kstDate(),weekdayMode);initializeBoard();renderAll();};
  const changeWeekdayMode=next=>{if(next===weekdayMode)return;const oldHoles=new Set(puzzle.holes);for(const i of oldHoles)if(board[i]==='#')board[i]=null;weekdayMode=next;localStorage.setItem(STORAGE_PREFIX+'pentorini_weekday_mode',weekdayMode);const nextPuzzle=getPentoriniPuzzle(kstDate(),weekdayMode),conflicts=[...new Set(nextPuzzle.holes.map(i=>board[i]).filter(v=>v&&v!=='#'&&v!=='@'))];conflicts.forEach(n=>removePiece(n,false));puzzle=nextPuzzle;puzzle.holes.forEach(i=>board[i]='#');if(conflicts.length){selected=conflicts[0];rotation=0;flipped=false;toast(`요일을 바꿨습니다. 새 요일 칸과 겹친 타일 ${conflicts.length}개만 회수했습니다.`);}else toast(`${weekdayMode==='en'?'English':'한자'} 요일로 바꿨습니다. 현재 배치는 유지됩니다.`);renderAll();};
  document.querySelectorAll('[data-weekday-mode]').forEach(b=>b.onclick=()=>changeWeekdayMode(b.dataset.weekdayMode));document.querySelector('#rotatePiece').onclick=()=>{if(HELPER_NAMES.includes(selected))return;rotation=(rotation+1)%4;renderPreview();};document.querySelector('#flipPiece').onclick=()=>{if(HELPER_NAMES.includes(selected))return;flipped=!flipped;renderPreview();};document.querySelector('#resetPento').onclick=()=>{reset();toast('도전을 초기화했습니다.');};renderAll();
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

async function router(){
  clearRouteCleanups();window.onkeydown=null;const route=(location.hash||'#/').slice(2);
  if(route==='ricochet')return renderRicochet();
  if(route==='pensterdam')return renderPensterdam();
  if(route==='yahtzee')return renderYahtzee();
  if(route==='solo')return renderSolo();
  if(route==='multi')return renderMulti();
  if(route.startsWith('room/'))return renderRoom(route.split('/')[1]);
  return renderHome();
}
window.addEventListener('hashchange',router);router();
