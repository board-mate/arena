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
const sb = onlineConfigured() ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}) : null;
const MEMBER_SESSION_KEY=STORAGE_PREFIX+'member_session';
let routeCleanups=[];
function addCleanup(fn){ routeCleanups.push(fn); }
function clearRouteCleanups(){ routeCleanups.splice(0).forEach(fn=>{try{fn();}catch{}}); }
function memberToken(){return localStorage.getItem(MEMBER_SESSION_KEY)||'';}
function saveMemberToken(t){if(t)localStorage.setItem(MEMBER_SESSION_KEY,t);else localStorage.removeItem(MEMBER_SESSION_KEY);}
async function callRpc(name,args={}){if(!sb)throw new Error('Supabase 설정이 필요합니다.');const {data,error}=await sb.rpc(name,args);if(error)throw error;return data;}
async function authSession(){return memberToken()||null;}
async function authProfile(){const token=memberToken();if(!token)return null;try{return await callRpc('boardmate_me',{p_token:token});}catch(e){return null;}}
function tierInfo(row){
  const wins=Number(row?.wins||0),losses=Number(row?.losses||0),rank=Number(row?.elo_rank||0);
  if(rank>=1&&rank<=5)return {text:`#${rank}`,cls:'rank',title:`전체 ${rank}위`};
  if(wins>=2 && wins/(wins+losses||1)>=.5)return {text:'🥇',cls:'gold',title:'골드'};
  if(wins>=1)return {text:'🥈',cls:'silver',title:'실버'};
  return {text:'🥉',cls:'bronze',title:'브론즈'};
}
function gameInfo(game){
  const map={
    maskmen:{name:'마스크맨',icon:'🥊',min:3,max:6},
    acquire:{name:'어콰이어',icon:'🏙️',min:3,max:6},
    calico:{name:'캘리코',icon:'🧵',min:2,max:4},
    thegame:{name:'더 게임',icon:'🃏',min:2,max:5},
    kraken:{name:'노터치 크라켄',icon:'🐙',min:3,max:8},
    cascadia:{name:'캐스캐디아',icon:'🌲',min:2,max:4},
    pocketnova:{name:'포크노바',icon:'⚡',min:2,max:4}
  };
  return map[game]||{name:game,icon:'🎲',min:2,max:6};
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
  app.innerHTML=`<div class="app-shell"><header class="topbar"><button class="brand-btn" id="homeBtn"><span class="brand-mark">●</span> BOARDMATE</button><nav class="topnav"><button data-nav="">미니게임</button><button data-nav="solo">1인플</button><button data-nav="multi">다인플</button><button data-nav="mypage">마이페이지</button></nav><div class="top-date">${formatDate(kstDate())}</div></header><main class="container">${content}${footer()}</main></div>`;
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
    if(game==='yahtzee' && metric>old.metric) rows[idx]={...old,nickname:n,metric,completed_at:now};
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
  shell(`<section class="hero"><div><h1><span>BoardMate</span> Arcade</h1><p>보드메이트에서 같이 즐기는 웹 보드게임 공간.<br>미니게임, AI 연습, 로그인 기반 온라인 방을 한 곳에 모았습니다.</p><div class="social-links"><a class="social-link" href="${LINKS.instagram}" target="_blank" rel="noreferrer">📷 Instagram</a><a class="social-link" href="${LINKS.somoim}" target="_blank" rel="noreferrer">👥 소모임</a><a class="social-link" href="${LINKS.shop}" target="_blank" rel="noreferrer">🛍 마플샵</a></div></div><div class="hero-badge">🎲</div></section>
  <section class="mode-grid"><button class="mode-card" data-go="solo"><span>🧠</span><b>1인플 · AI/솔로</b><small>마스크맨 / 어콰이어 / 캘리코 / 캐스캐디아 / 더 게임</small></button><button class="mode-card" data-go="multi"><span>🌐</span><b>다인플 · 온라인 방</b><small>자동 저장 · 재접속 · 게임별 티어</small></button></section>
  <div class="section-title"><h2>미니게임</h2><small>${formatDate(kstDate())} · KST</small></div><section class="game-grid daily-two">${homeCard('pensterdam','🧩','펜토리니','도움칸 적게 사용 → 동률이면 먼저 클리어')} ${homeCard('yahtzee','🎲','Yahtzee','언제든 플레이 · 올타임 최고 점수')}</section><div id="connection"></div>`);
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>location.hash=`#/${b.dataset.go}`);
  for(const g of ['pensterdam','yahtzee']){const data=await loadLeaderboard(g,5);const el=document.querySelector(`#lb-${g}`);if(el)el.innerHTML=leaderboardHtml(g,data,false);}
  bindHome();
  if(!configured()) document.querySelector('#connection').innerHTML='<div class="connection-note">현재는 로컬 순위 모드입니다. <b>config.js</b>에 Supabase 주소/키를 넣으면 공유 순위표와 온라인 기능을 사용할 수 있습니다.</div>';
}
function homeCard(game,icon,title,desc){return `<article class="game-card"><div class="icon">${icon}</div><h3>${title}</h3><p>${desc}</p><button class="primary" data-play="${game}">게임하기</button><div id="lb-${game}"><div class="empty">순위표 불러오는 중…</div></div></article>`;}
function bindHome(){document.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>location.hash=`#/${b.dataset.play}`);document.querySelectorAll('[data-more]').forEach(b=>b.onclick=async()=>{const g=b.dataset.more,card=b.closest('.game-card'),expanded=b.textContent==='접기',data=await loadLeaderboard(g,expanded?5:100);card.querySelector(`#lb-${g}`).innerHTML=leaderboardHtml(g,data,!expanded);bindHome();});}

function renderSolo(){
  shell(`<div class="page-head"><div><h1>🧠 1인플 · AI/솔로</h1><p>BoardMate 안의 게임은 브라우저 로컬 자동 저장을 사용합니다. 외부 공개 게임은 해당 사이트의 저장 기능을 따릅니다.</p></div><div class="actions"><button class="ghost" id="backHome">← 홈</button></div></div>
  <section class="library-grid">
    <article class="library-card maskmen"><div class="library-icon">🥊</div><h2>마스크맨</h2><p>3~6인 규칙을 AI들과 연습합니다.</p><span class="save-badge">💾 로컬 자동 저장</span><a class="primary link-btn" href="./solo-maskmen.html">AI와 대전</a></article>
    <article class="library-card acquire"><div class="library-icon">🏙️</div><h2>어콰이어</h2><p>타일 배치, 호텔 체인, 주식과 합병을 AI들과 연습합니다.</p><span class="save-badge">💾 로컬 자동 저장</span><a class="primary link-btn" href="./solo-acquire.html">AI와 대전</a></article>
    <article class="library-card calico"><div class="library-icon">🧵</div><h2>캘리코</h2><p>공개된 MyAutoma 구현을 BoardMate 상단바 안에서 엽니다.</p><span class="save-badge external">외부 게임 · BoardMate 저장 제외</span><a class="primary link-btn" href="./solo-calico.html">솔로 게임 열기</a></article>
    <article class="library-card cascadia"><div class="library-icon">🌲</div><h2>캐스캐디아</h2><p>공개 Cascadia 웹 구현을 BoardMate 상단바 안에서 엽니다.</p><span class="save-badge external">외부 게임 · BoardMate 저장 제외</span><a class="primary link-btn" href="./solo-cascadia.html">솔로 게임 열기</a></article>
    <article class="library-card thegame"><div class="library-icon">🃏</div><h2>더 게임</h2><p>업로드한 HTML로 1인 솔로 플레이. ±10 되돌리기 규칙을 지원합니다.</p><span class="save-badge">💾 로컬 자동 저장</span><a class="primary link-btn" href="./solo-thegame.html">솔로 플레이</a></article>
  </section>`);
  document.querySelector('#backHome').onclick=()=>location.hash='#/';
}

async function loadRatingMap(game,userIds){
  if(!userIds.length)return{};const rows=await callRpc('boardmate_get_ratings',{p_token:memberToken(),p_game:game,p_user_ids:userIds});return Object.fromEntries((rows||[]).map(r=>[r.user_id,r]));
}

async function renderLoginPage(){
  if(!onlineConfigured()){shell(`<div class="page-head"><div><h1>🔐 로그인</h1><p>Supabase 연결 후 사용할 수 있습니다.</p></div></div><div class="connection-note">config.js 설정과 v11 supabase.sql 실행이 필요합니다.</div>`);return;}
  const me=await authProfile();if(me){location.hash='#/mypage';return;}
  shell(`<div class="page-head"><div><h1>🔐 BoardMate 로그인</h1><p>닉네임과 비밀번호/PIN만 사용합니다.</p></div><div class="actions"><button class="ghost" id="backHome">← 홈</button></div></div><section class="auth-card standalone-auth"><div class="auth-tabs"><button class="active" data-auth-tab="login">로그인</button><button data-auth-tab="signup">회원가입</button></div><form id="authForm"><input id="authNick" maxlength="20" placeholder="닉네임" required><input id="authPass" type="password" minlength="4" maxlength="72" placeholder="비밀번호/PIN (4자 이상)" required><button class="primary" id="authSubmit">로그인</button><div id="authStatus" class="bonus-note"></div></form><p class="auth-note">이메일 인증은 사용하지 않습니다. 비밀번호 원문은 저장하지 않고 해시만 저장합니다.</p></section>`);
  document.querySelector('#backHome').onclick=()=>location.hash='#/';let mode='login';
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>{mode=b.dataset.authTab;document.querySelectorAll('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelector('#authSubmit').textContent=mode==='login'?'로그인':'회원가입';});
  document.querySelector('#authForm').onsubmit=async e=>{e.preventDefault();const n=document.querySelector('#authNick').value.trim(),pw=document.querySelector('#authPass').value,st=document.querySelector('#authStatus'),btn=document.querySelector('#authSubmit');if(!n||pw.length<4){st.textContent='닉네임과 4자 이상 비밀번호를 입력하세요.';return;}btn.disabled=true;st.textContent='처리 중…';try{const data=await callRpc(mode==='signup'?'boardmate_register':'boardmate_login',{p_nickname:n,p_password:pw});if(!data?.token)throw new Error('로그인 토큰을 받지 못했습니다.');saveMemberToken(data.token);location.hash=mode==='signup'?'#/mypage':'#/multi';}catch(err){st.textContent=String(err.message||err).replace(/^.*?exception:\s*/i,'');}finally{btn.disabled=false;}};
}

async function renderMyPage(){
  if(!onlineConfigured()){shell(`<div class="page-head"><div><h1>👤 마이페이지</h1></div></div><div class="connection-note">Supabase 연결이 필요합니다.</div>`);return;}
  const me=await authProfile();
  if(!me){shell(`<div class="page-head"><div><h1>👤 마이페이지</h1><p>로그인 후 계정 관리와 비밀번호 변경을 사용할 수 있습니다.</p></div></div><section class="auth-card"><a class="primary link-btn" href="#/login">로그인 / 회원가입</a></section>`);return;}
  shell(`<div class="page-head"><div><h1>👤 마이페이지</h1><p>계정 정보와 비밀번호를 관리합니다.</p></div><div class="actions"><button class="ghost" id="backHome">← 홈</button></div></div>
  <section class="profile-card"><div class="profile-row"><span>닉네임</span><b>${esc(me.nickname)}</b></div><div class="profile-row"><span>가입일</span><b>${esc(String(me.created_at||'').slice(0,10))}</b></div>${me.is_admin?'<div class="admin-badge">🛡️ 관리자 계정</div>':''}</section>
  <section class="account-tools open"><h2>비밀번호 변경</h2><form id="pwForm"><input id="pwCurrent" type="password" minlength="4" placeholder="현재 비밀번호" required><input id="pwNew" type="password" minlength="4" maxlength="72" placeholder="새 비밀번호 (4자 이상)" required><button class="secondary">비밀번호 변경</button><span id="pwStatus" class="bonus-note"></span></form><p>비밀번호를 잊어버렸다면 관리자에게 초기화를 요청하세요.</p></section>
  ${me.is_admin?`<section class="admin-panel"><div class="section-title"><h2>회원 관리</h2><button class="ghost mini" id="refreshMembers">새로고침</button></div><p class="pento-tip">정지 시 모든 세션이 끊기고 정지 기간 동안 로그인할 수 없습니다. 퇴출은 계정을 삭제하고 같은 닉네임 재가입도 막습니다.</p><div id="adminMemberList"><div class="empty">회원 목록 불러오는 중…</div></div></section>`:''}
  <div class="mypage-actions"><button class="danger" id="logoutBtn">로그아웃</button></div>`);
  document.querySelector('#backHome').onclick=()=>location.hash='#/';
  document.querySelector('#logoutBtn').onclick=async()=>{try{await callRpc('boardmate_logout',{p_token:memberToken()});}catch{}saveMemberToken('');location.hash='#/login';};
  document.querySelector('#pwForm').onsubmit=async e=>{e.preventDefault();const st=document.querySelector('#pwStatus');try{await callRpc('boardmate_change_password',{p_token:memberToken(),p_current_password:document.querySelector('#pwCurrent').value,p_new_password:document.querySelector('#pwNew').value});st.textContent='변경 완료';e.target.reset();}catch(err){st.textContent=err.message;}};
  if(me.is_admin){
    const loadMembers=async()=>{const box=document.querySelector('#adminMemberList');if(!box)return;try{const rows=await callRpc('boardmate_admin_list_members',{p_token:memberToken()})||[];box.innerHTML=rows.map(r=>{const suspended=r.suspended_until&&new Date(r.suspended_until)>new Date();return `<div class="admin-member-row"><div><b>${esc(r.nickname)}</b>${r.is_admin?' <span class="admin-mini">관리자</span>':''}<small>가입 ${esc(String(r.created_at).slice(0,10))}${suspended?` · ⛔ ${esc(String(r.suspended_until).slice(0,16).replace('T',' '))}까지 정지`:''}</small></div><div class="admin-member-actions">${r.user_id===me.user_id?'':suspended?`<button class="secondary mini" data-unsuspend="${r.user_id}">정지 해제</button>`:`<button class="ghost mini" data-suspend="${r.user_id}">정지</button>`}${r.user_id===me.user_id?'':`<button class="danger mini" data-expel="${r.user_id}" data-name="${esc(r.nickname)}">퇴출</button>`}</div></div>`;}).join('')||'<div class="empty">회원이 없습니다.</div>';
      box.querySelectorAll('[data-suspend]').forEach(b=>b.onclick=async()=>{const days=Number(prompt('정지할 일수 (예: 1, 7, 30)','7'));if(!days||days<1)return;const reason=prompt('정지 사유 (선택)','')||'';try{await callRpc('boardmate_admin_suspend_member',{p_token:memberToken(),p_user_id:b.dataset.suspend,p_days:days,p_reason:reason});await loadMembers();}catch(e){toast(e.message);}});
      box.querySelectorAll('[data-unsuspend]').forEach(b=>b.onclick=async()=>{try{await callRpc('boardmate_admin_unsuspend_member',{p_token:memberToken(),p_user_id:b.dataset.unsuspend});await loadMembers();}catch(e){toast(e.message);}});
      box.querySelectorAll('[data-expel]').forEach(b=>b.onclick=async()=>{if(!confirm(`${b.dataset.name} 회원을 영구 퇴출할까요? 같은 닉네임 재가입도 차단됩니다.`))return;const reason=prompt('퇴출 사유 (선택)','')||'';try{await callRpc('boardmate_admin_expel_member',{p_token:memberToken(),p_user_id:b.dataset.expel,p_reason:reason});await loadMembers();}catch(e){toast(e.message);}});
      }catch(e){box.innerHTML=`<div class="empty">${esc(e.message||e)}</div>`;}
    };document.querySelector('#refreshMembers').onclick=loadMembers;await loadMembers();
  }
}

async function renderCreateRoom(){
  if(!onlineConfigured())return renderMulti();const me=await authProfile();if(!me){location.hash='#/login';return;}
  const games=['maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken'];let selected='maskmen';
  shell(`<div class="page-head"><div><h1>➕ 새 방 만들기</h1><p>게임을 고르고 바로 방을 만드세요. 제목을 비우면 닉네임과 게임 이름으로 자동 생성됩니다.</p></div><div class="actions"><button class="ghost" id="backMulti">← 방 목록</button></div></div><section class="room-maker"><label>방 제목 <small>선택 사항</small></label><input id="roomTitle" maxlength="40" placeholder="비워두면 예: ${esc(me.nickname)}의 마스크맨 한 판"><div class="turn-system-note"><b>⏳ 모든 온라인 게임은 턴 기반 + 자동 저장</b><span>별도 ‘실시간’ 모드는 없앴습니다. 모두 접속해 빠르게 해도 되고, 자기 차례에 다시 들어와 이어해도 됩니다.</span></div><h2>게임 선택</h2><div id="roomGameGrid" class="library-grid compact-games">${games.map(g=>{const x=gameInfo(g);return `<button class="library-card game-choice ${g==='maskmen'?'selected':''}" data-room-game="${g}"><div class="library-icon">${x.icon}</div><h2>${x.name}</h2><p>${x.min}명부터 · 최대 ${x.max}명</p></button>`;}).join('')}</div><button class="primary create-room-submit" id="createRoomBtn">선택한 게임으로 방 만들기</button><div id="roomStatus" class="bonus-note"></div></section>`);
  document.querySelector('#backMulti').onclick=()=>location.hash='#/multi';
  document.querySelectorAll('[data-room-game]').forEach(b=>b.onclick=()=>{selected=b.dataset.roomGame;document.querySelectorAll('[data-room-game]').forEach(x=>x.classList.toggle('selected',x===b));const title=document.querySelector('#roomTitle');if(!title.value)title.placeholder=`비워두면 예: ${me.nickname}의 ${gameInfo(selected).name} 한 판`;});
  document.querySelector('#createRoomBtn').onclick=async()=>{const title=document.querySelector('#roomTitle').value.trim(),st=document.querySelector('#roomStatus');st.textContent='';try{let id;try{id=await callRpc('create_boardmate_room_v8',{p_token:memberToken(),p_title:title,p_game:selected});}catch(e){const missing=/create_boardmate_room_v8|PGRST202|schema cache/i.test(String(e?.message||e));if(!missing)throw e;try{id=await callRpc('create_boardmate_room_v7',{p_token:memberToken(),p_title:title,p_game:selected,p_play_mode:'turn'});}catch(fallbackErr){const fallbackMissing=/create_boardmate_room_v7|PGRST202|schema cache|지원하지 않는 게임/i.test(String(fallbackErr?.message||fallbackErr));if(fallbackMissing)throw new Error('Supabase 방 생성 RPC가 아직 적용되지 않았습니다. SUPABASE_RPC_FIX_v11_1.sql을 SQL Editor에서 실행한 뒤 다시 시도하세요.');throw fallbackErr;}}location.hash=`#/room/${id}`;}catch(e){st.textContent=e.message;}};
}

async function renderMulti(){
  if(!onlineConfigured()){shell(`<div class="page-head"><div><h1>🌐 다인플 · 온라인</h1><p>Supabase 연결 후 사용할 수 있습니다.</p></div></div><div class="connection-note">config.js 설정과 v11 supabase.sql 실행이 필요합니다.</div>`);return;}
  const me=await authProfile();if(!me){saveMemberToken('');shell(`<div class="page-head"><div><h1>🌐 다인플 · 온라인</h1><p>방 만들기와 참여는 로그인이 필요합니다.</p></div></div><section class="auth-card"><a class="primary link-btn" href="#/login">로그인 / 회원가입</a></section>`);return;}
  shell(`<div class="page-head"><div><h1>🌐 다인플 · 온라인</h1><p>게임 상태는 행동마다 자동 저장됩니다. 브라우저를 닫아도 같은 방에서 이어할 수 있습니다.</p></div><div class="actions"><span class="login-chip">👤 ${esc(me.nickname)}</span><a class="ghost link-btn" href="#/mypage">마이페이지</a><a class="primary link-btn" href="#/new-room">＋ 방 만들기</a></div></div>
  <section id="activeGamesWrap" class="active-games-wrap hidden"><div class="section-title"><h2>▶ 진행 중인 게임</h2><small>자동 저장 · 재접속</small></div><div id="activeGameList"></div></section>
  <div class="section-title"><h2>열린 방</h2><button class="ghost mini" id="refreshRooms">새로고침</button></div><div id="roomList"><div class="empty">방을 불러오는 중…</div></div>`);
  const roomCard=r=>{const gi=gameInfo(r.game),mine=Boolean(r.mine),full=Number(r.member_count)>=Number(r.max_players),playing=r.status==='playing',myTurn=playing&&mine&&r.turn_user_id===me.user_id;return `<article class="room-row ${playing&&mine?'resume-room':''} ${myTurn?'my-turn-room':''}"><div><div class="room-title"><span class="game-pill ${r.game}">${gi.icon} ${gi.name}</span><b>${esc(r.title)}</b>${myTurn?'<span class="turn-alert">내 차례</span>':''}</div><small>⏳ 턴 기반 · ${esc(r.host_nickname||'방장')} · ${r.member_count}명${r.online_count!=null?` · 접속 ${r.online_count}명`:''} · ${r.status==='open'?'대기 중':r.turn_nickname?`현재 ${esc(r.turn_nickname)} 차례`:'게임 중'}</small></div><button class="${mine?'primary':'ghost'}" data-room-action="${r.id}" data-mine="${mine?'1':'0'}" data-status="${r.status}" ${!mine&&r.status==='open'&&full?'disabled':''}>${mine?(playing?(myTurn?'내 차례 플레이':'이어하기'):'방으로'):r.status==='open'?(full?'가득 참':'참가'):'관전 불가'}</button></article>`;};
  const bindRoomButtons=root=>root.querySelectorAll('[data-room-action]').forEach(b=>b.onclick=async()=>{if(b.dataset.mine==='1'){location.hash=`#/room/${b.dataset.roomAction}`;return;}if(b.dataset.status!=='open'||b.disabled)return;try{await callRpc('join_boardmate_room',{p_token:memberToken(),p_room_id:b.dataset.roomAction});location.hash=`#/room/${b.dataset.roomAction}`;}catch(err){toast(err.message);}});
  const loadRooms=async()=>{const box=document.querySelector('#roomList'),activeBox=document.querySelector('#activeGameList'),wrap=document.querySelector('#activeGamesWrap');if(!box)return;try{const rooms=await callRpc('boardmate_list_rooms',{p_token:memberToken()})||[];const active=rooms.filter(r=>r.mine&&r.status==='playing'),open=rooms.filter(r=>r.status==='open');if(active.length){wrap.classList.remove('hidden');activeBox.innerHTML=active.map(roomCard).join('');bindRoomButtons(activeBox);}else wrap.classList.add('hidden');box.innerHTML=open.length?open.map(roomCard).join(''):'<div class="empty">현재 열린 방이 없습니다.</div>';bindRoomButtons(box);}catch(err){box.innerHTML=`<div class="empty">${esc(err.message)}</div>`;}};
  document.querySelector('#refreshRooms').onclick=loadRooms;await loadRooms();const timer=setInterval(loadRooms,3000);addCleanup(()=>clearInterval(timer));
}

async function renderRoom(roomId){
  if(!onlineConfigured())return renderMulti();const me=await authProfile();if(!me)return renderMulti();
  const load=async()=>await callRpc('boardmate_get_room',{p_token:memberToken(),p_room_id:roomId});
  let data;try{data=await load();}catch(e){toast('방을 불러오지 못했습니다.');location.hash='#/multi';return;}
  if(!data.members.some(m=>m.user_id===me.user_id)){try{await callRpc('join_boardmate_room',{p_token:memberToken(),p_room_id:roomId});data=await load();}catch(e){toast(e.message);location.hash='#/multi';return;}}
  let touchBusy=false;
  const touch=async()=>{if(touchBusy)return;touchBusy=true;try{await callRpc('touch_boardmate_room',{p_token:memberToken(),p_room_id:roomId});}catch{}finally{touchBusy=false;}};
  await touch();
  const draw=async()=>{data=await load();const {room,members}=data,isHost=room.host_id===me.user_id,gi=gameInfo(room.game),min=Number(room.min_players||gi.min);
    if(room.status==='cancelled'){shell(`<div class="page-head"><div><h1>🛑 ${esc(room.title)}</h1><p>${gi.name} · 참가자 전원 동의로 취소된 게임입니다.</p></div></div><section class="lobby-card" style="text-align:center"><h2>게임이 취소되었습니다</h2><p>이번 게임은 승패와 ELO에 반영되지 않습니다.</p><div class="actions" style="justify-content:center"><a class="primary link-btn" href="#/multi">다인플 목록</a><a class="ghost link-btn" href="#/">홈으로</a></div></section>`);return;}
    shell(`<div class="page-head"><div><h1>${gi.icon} ${esc(room.title)}</h1><p>${gi.name} · ⏳ 턴 기반 · 현재 ${members.length}명 · ${room.status==='open'?'대기 중':room.status==='playing'?'게임 중':'종료'}</p></div><div class="actions"><button class="ghost" id="backMulti">← 방 목록</button></div></div>
    <section class="lobby-card"><h2>참여 인원</h2><div class="member-list">${members.map(m=>{const t=tierInfo(m),online=Boolean(m.connected);return `<div class="member-row"><span class="seat-no">${Number(m.seat)+1}</span><span class="presence ${online?'online':'offline'}">${online?'● 접속':'○ 끊김'}</span><span class="tier ${t.cls}" title="${esc(t.title||'')}">${t.text}</span><b>${esc(m.nickname)}</b>${m.user_id===room.host_id?'<small>방장</small>':''}${room.status==='open'&&isHost&&m.user_id!==room.host_id?`<button class="kick-btn" data-kick="${m.user_id}">강퇴</button>`:''}</div>`;}).join('')}</div>
    <div class="lobby-actions">${room.status==='open'&&isHost?`<button class="primary" id="startRoom" ${members.length<min?'disabled':''}>${members.length<min?`${min}명부터 시작 가능`:'게임 시작'}</button>`:''}${room.status==='open'?'<button class="danger" id="leaveRoom">방 나가기</button>':''}${room.status==='playing'?`<a class="primary link-btn" href="./online-${room.game}.html?room=${encodeURIComponent(room.id)}">이어하기 / 게임 입장</a><button class="ghost" id="disconnectRoom">나가기 (게임 저장 유지)</button>`:''}</div>
    <p class="pento-tip">게임 상태는 행동할 때마다 Supabase에 자동 저장됩니다. 브라우저를 닫거나 다른 페이지로 나가도 참가 자리는 남으며, 다인플의 ‘진행 중인 게임’에서 다시 들어올 수 있습니다.</p><p class="pento-tip">모두가 동시에 접속할 필요는 없습니다. 방 목록에서 ‘내 차례’를 확인하고 자기 차례에 들어오면 됩니다. 모두 접속해 빠르게 진행해도 같은 방식으로 동작합니다. 방장은 대기실에서 참가자를 강퇴할 수 있습니다.</p></section>`);
    document.querySelector('#backMulti').onclick=()=>location.hash='#/multi';
    document.querySelector('#startRoom')?.addEventListener('click',async()=>{try{await callRpc('start_boardmate_room',{p_token:memberToken(),p_room_id:roomId});location.href=`./online-${room.game}.html?room=${encodeURIComponent(room.id)}`;}catch(e){toast(e.message);}});
    document.querySelector('#leaveRoom')?.addEventListener('click',async()=>{try{await callRpc('leave_boardmate_room',{p_token:memberToken(),p_room_id:roomId});location.hash='#/multi';}catch(e){toast(e.message);}});
    document.querySelector('#disconnectRoom')?.addEventListener('click',async()=>{try{await callRpc('disconnect_boardmate_room',{p_token:memberToken(),p_room_id:roomId});}catch{}location.hash='#/multi';});
    document.querySelectorAll('[data-kick]').forEach(b=>b.onclick=async()=>{if(!confirm('이 참가자를 방에서 내보낼까요?'))return;try{await callRpc('kick_boardmate_room_member',{p_token:memberToken(),p_room_id:roomId,p_user_id:b.dataset.kick});await draw();}catch(e){toast(e.message);}});
  };
  await draw();const timer=setInterval(async()=>{if((location.hash||'').includes(`/room/${roomId}`))try{await touch();await draw();}catch{}},5000);addCleanup(()=>clearInterval(timer));
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
  const renderScores=()=>{const scoring=rollCount?getScoringOptions(scorecard,dice):{options:{},forced:false,yahtzeeBonus:0};const row=c=>{const val=scorecard[c],has=Object.prototype.hasOwnProperty.call(scoring.options,c);return `<tr><td><b>${LABELS[c]}</b>${c==='yahtzee'?'<div class="bonus-note">50점 · 이후 조건 충족 Yahtzee마다 +100</div>':''}</td><td>${val!=null?`<span class="filled-score">${val}</span>`:has?`<button class="score-option ${scoring.forced?'forced':''}" data-score="${c}">${scoring.options[c]}점 기록</button>`:'—'}</td></tr>`;};const t=totals(scorecard,bonusCount);document.querySelector('#scoreBody').innerHTML=UPPER.map(row).join('')+`<tr class="score-total"><td>Upper Bonus (${t.upper} / 63+)</td><td>${t.upperBonus}</td></tr>`+LOWER.map(row).join('')+`<tr><td><b>YAHTZEE BONUS</b></td><td>${bonusCount}회 · ${t.bonusPoints}점</td></tr><tr class="score-total"><td>총점</td><td>${t.total}</td></tr>`;document.querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>chooseScore(b.dataset.score));};
  const finish=async()=>{const t=totals(scorecard,bonusCount),data=await loadLeaderboard('yahtzee',100),others=(data.items||[]).filter(x=>x.player_id!==playerId()),estimated=1+others.filter(x=>x.metric>=t.total).length;openNameModal({title:'게임 종료!',big:`${t.total}점`,rankText:`현재 예상 전체 ${estimated}위`,onSubmit:n=>submitResult('yahtzee',n,t.total),onCloseLabel:'새 게임',onClose:()=>{reset();refreshLb();}});};
  const chooseScore=category=>{if(!rollCount)return;const scoring=getScoringOptions(scorecard,dice);if(!Object.prototype.hasOwnProperty.call(scoring.options,category))return;scorecard[category]=scoring.options[category];if(scoring.yahtzeeBonus)bonusCount++;if(ALL.every(c=>scorecard[c]!=null)){renderScores();finish();return;}round++;dice=[0,0,0,0,0];held=[false,false,false,false,false];rollCount=0;renderDice();renderScores();};
  const reset=()=>{scorecard=Object.fromEntries(ALL.map(c=>[c,null]));dice=[0,0,0,0,0];held=[false,false,false,false,false];rollCount=0;round=1;bonusCount=0;renderDice();renderScores();};
  document.querySelector('#rollDice').onclick=()=>{if(rollCount>=3)return;dice=dice.map((v,i)=>held[i]&&rollCount>0?v:rollOne());rollCount++;renderDice();renderScores();};document.querySelector('#newYahtzee').onclick=()=>{reset();toast('새 게임을 시작했습니다.');};renderDice();renderScores();
}

async function router(){
  clearRouteCleanups();window.onkeydown=null;const route=(location.hash||'#/').slice(2);
  if(route==='pensterdam')return renderPensterdam();
  if(route==='yahtzee')return renderYahtzee();
  if(route==='solo')return renderSolo();
  if(route==='login')return renderLoginPage();
  if(route==='mypage')return renderMyPage();
  if(route==='multi')return renderMulti();
  if(route==='new-room')return renderCreateRoom();
  if(route.startsWith('room/'))return renderRoom(route.split('/')[1]);
  return renderHome();
}
window.addEventListener('hashchange',router);router();
