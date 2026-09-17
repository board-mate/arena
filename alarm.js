const KEY='boardmate:alarm_settings';
const SEEN_KEY='boardmate:alarm_seen_turns_v3';
const DEFAULTS={enabled:false,newRoom:true,myTurn:true,gameStart:true,sound:true,vibrate:true};
let audioCtx=null;
let roomSnapshot=null;

export function alarmSettings(){
  try{return {...DEFAULTS,...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{return {...DEFAULTS};}
}
export function saveAlarmSettings(next){
  const value={...alarmSettings(),...next};
  localStorage.setItem(KEY,JSON.stringify(value));
  return value;
}
export function alarmSupport(){
  return {notification:'Notification' in window,serviceWorker:'serviceWorker' in navigator,vibrate:'vibrate' in navigator,permission:('Notification' in window?Notification.permission:'unsupported')};
}
export async function requestAlarmPermission(){
  if(!('Notification' in window))return {ok:false,permission:'unsupported'};
  let permission=Notification.permission;
  if(permission==='default')permission=await Notification.requestPermission();
  if(permission==='granted'){
    saveAlarmSettings({enabled:true});
    try{unlockAlarmAudio();}catch{}
    return {ok:true,permission};
  }
  saveAlarmSettings({enabled:false});
  return {ok:false,permission};
}
export function unlockAlarmAudio(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return false;
    if(!audioCtx)audioCtx=new AC();
    if(audioCtx.state==='suspended')void audioCtx.resume();
    return true;
  }catch{return false;}
}
function playTone(){
  const s=alarmSettings();
  if(!s.sound)return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    if(!audioCtx)audioCtx=new AC();
    if(audioCtx.state==='suspended')void audioCtx.resume();
    const now=audioCtx.currentTime;
    const gain=audioCtx.createGain();
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(.12,now+.02);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.55);
    gain.connect(audioCtx.destination);
    [0,.18].forEach((offset,i)=>{
      const osc=audioCtx.createOscillator();
      osc.type='sine';osc.frequency.value=i?880:660;
      osc.connect(gain);osc.start(now+offset);osc.stop(now+offset+.22);
    });
  }catch{}
}
function vibrate(){
  const s=alarmSettings();
  if(s.vibrate&&navigator.vibrate)try{navigator.vibrate([120,70,160]);}catch{}
}
function safeTitleBase(){
  return String(document.title||'BoardMate').replace(/^🔔 내 차례(?: \(\d+\))? · /,'');
}
function ensureTurnBannerStyle(){
  if(document.getElementById('boardmate-turn-banner-style'))return;
  const style=document.createElement('style');
  style.id='boardmate-turn-banner-style';
  style.textContent=`
#boardmate-turn-banner{position:fixed;top:12px;right:14px;left:auto;transform:none;z-index:2147483001;background:#ffb000;color:#1b1b1b;font:900 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:10px 16px;border-radius:999px;box-shadow:0 8px 24px #0003;border:2px solid #fff;pointer-events:auto;cursor:pointer;white-space:nowrap;transition:transform .12s ease,filter .12s ease;max-width:calc(100vw - 28px)}
#boardmate-turn-banner:hover{filter:brightness(1.04);transform:translateY(-1px)}
#boardmate-turn-banner:active{transform:translateY(0) scale(.98)}
#boardmate-turn-banner:focus-visible{outline:3px solid #fff;outline-offset:2px}
html[data-boardmate-my-turn="1"] .top-date{visibility:hidden}
@media(max-width:760px){#boardmate-turn-banner{top:10px;right:10px;padding:8px 12px;font-size:12px;max-width:calc(100vw - 20px)}}`;
  document.head.appendChild(style);
}
function sameTargetUrl(target){
  try{
    const a=new URL(target,location.href),b=new URL(location.href);
    return a.pathname===b.pathname&&a.search===b.search&&a.hash===b.hash;
  }catch{return false;}
}
export function setBrowserTurnIndicator(count=0,options={}){
  const n=Math.max(0,Number(count)||0),base=safeTitleBase();
  const opts=typeof options==='string'?{href:options}:(options||{});
  const href=String(opts.href||'');
  document.title=n?`🔔 내 차례${n>1?` (${n})`:''} · ${base}`:base;
  try{document.documentElement.dataset.boardmateMyTurn=n?'1':'0';}catch{}
  try{
    ensureTurnBannerStyle();
    let banner=document.getElementById('boardmate-turn-banner');
    if(n){
      if(!banner){
        banner=document.createElement('button');
        banner.type='button';
        banner.id='boardmate-turn-banner';
        document.body.appendChild(banner);
      }
      banner.textContent=n>1?`🎯 내 차례 ${n}건`:'🎯 내 차례입니다';
      banner.title=n>1?'내 차례인 게임 목록 열기':'내 차례인 게임으로 이동';
      banner.dataset.href=href;
      banner.style.display='block';
      banner.onclick=()=>{
        const target=banner.dataset.href||'./index.html#/multi';
        if(sameTargetUrl(target))window.scrollTo({top:0,behavior:'smooth'});
        else window.location.href=target;
      };
    }else if(banner){
      banner.style.display='none';
      banner.dataset.href='';
      banner.onclick=null;
    }
  }catch{}
  try{
    let icon=document.querySelector('link[data-boardmate-turn-favicon]');
    if(!icon){icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.dataset.boardmateTurnFavicon='1';document.head.appendChild(icon);}
    if(n){
      const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%23ffb000"/><text x="32" y="44" font-size="40" text-anchor="middle">!</text></svg>';
      icon.href='data:image/svg+xml,'+svg;
    }else{icon.href='./icons/favicon-32.png';}
  }catch{}
}
function turnIsMine(room,me){
  return Boolean(room&&me?.user_id&&room.status==='playing'&&room.play_mode!=='realtime'&&room.turn_user_id===me.user_id);
}
function loadSeenTurns(){
  try{const v=JSON.parse(localStorage.getItem(SEEN_KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return{}}
}
function saveSeenTurns(v){
  try{
    const items=Object.entries(v).slice(-80);
    localStorage.setItem(SEEN_KEY,JSON.stringify(Object.fromEntries(items)));
  }catch{}
}
function turnSignature(room){
  const stamp=room?.turn_updated_at||room?.updated_at||room?.revision||room?.state_revision||room?.turn_no||room?.turn_index||'';
  return `${String(room?.turn_user_id||'')}|${String(stamp)}`;
}
function turnWasSeen(room){
  if(!room?.id)return false;
  const seen=loadSeenTurns(),id=String(room.id),sig=turnSignature(room);
  return seen[id]===sig;
}
function markTurnSeen(room){
  if(!room?.id)return;
  const seen=loadSeenTurns();seen[String(room.id)]=turnSignature(room);saveSeenTurns(seen);
}
async function swRegistrationWithTimeout(ms=1800){
  if(!('serviceWorker' in navigator))return null;
  try{
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise(resolve=>setTimeout(()=>resolve(null),ms))
    ]);
  }catch{return null;}
}
export async function sendBoardMateAlarm(kind,{title='BoardMate',body='',url='./index.html#/multi',tag}={}){
  const s=alarmSettings();
  if(!s.enabled||!s[kind])return false;
  if(!('Notification' in window)||Notification.permission!=='granted')return false;
  if(!document.hidden)playTone();vibrate();
  const opts={body,icon:'./icons/icon-192.png',badge:'./icons/favicon-32.png',tag:tag||`boardmate-${kind}`,renotify:true,data:{url},silent:!s.sound};
  try{
    const reg=await swRegistrationWithTimeout();
    if(reg?.showNotification){await reg.showNotification(title,opts);return true;}
  }catch{}
  try{new Notification(title,opts);return true;}catch{return false;}
}
export async function sendTestAlarm(){
  return sendBoardMateAlarm('myTurn',{title:'🔔 BoardMate 알림 테스트',body:'알림이 정상적으로 작동합니다.',url:'./index.html#/alarms',tag:'boardmate-test'});
}
function hrefForRoom(room){
  const page=room?.game?`online-${room.game}.html`:'index.html#/multi';
  return room?.status==='playing'&&room?.id?`./${page}?room=${encodeURIComponent(room.id)}`:'./index.html#/multi';
}
export function resetRoomAlarmBaseline(){roomSnapshot=null;}
async function processRoomAlarmsNow(rooms,me,{gameName=x=>x?.game||'게임',gameHref=hrefForRoom}={}){
  if(!Array.isArray(rooms)||!me?.user_id){setBrowserTurnIndicator(0);return;}
  const myTurnRooms=rooms.filter(r=>Boolean(r.mine)&&turnIsMine(r,me));
  setBrowserTurnIndicator(myTurnRooms.length,{href:myTurnRooms.length===1?gameHref(myTurnRooms[0]):'./index.html#/multi'});
  const current=new Map(rooms.map(r=>[String(r.id),r]));
  if(!roomSnapshot){
    roomSnapshot=current;
    for(const room of myTurnRooms){
      if(turnWasSeen(room))continue;
      const name=gameName(room);
      const sent=await sendBoardMateAlarm('myTurn',{title:`🎯 내 차례 · ${name}`,body:`${room.title||'게임'}에서 내 차례입니다.`,url:gameHref(room),tag:`turn-${String(room.id)}-${encodeURIComponent(turnSignature(room))}`});
      if(sent)markTurnSeen(room);
    }
    return;
  }
  for(const room of rooms){
    const id=String(room.id),prev=roomSnapshot.get(id),name=gameName(room);
    if(!prev){
      if(room.status==='open'&&!room.mine)await sendBoardMateAlarm('newRoom',{title:`🎲 새 방 · ${name}`,body:`${room.title||'새 게임 방'} · ${room.member_count||1}명 참가 중`,url:'./index.html#/multi',tag:`room-${id}`});
      if(Boolean(room.mine)&&turnIsMine(room,me)&&!turnWasSeen(room)){const sent=await sendBoardMateAlarm('myTurn',{title:`🎯 내 차례 · ${name}`,body:`${room.title||'게임'}에서 내 차례입니다.`,url:gameHref(room),tag:`turn-${id}-${encodeURIComponent(turnSignature(room))}`});if(sent)markTurnSeen(room);}
      continue;
    }
    if(room.mine&&prev.status!=='playing'&&room.status==='playing'){
      await sendBoardMateAlarm('gameStart',{title:`▶ ${name} 게임 시작`,body:`${room.title||'참가 중인 방'}이 시작되었습니다.`,url:gameHref(room),tag:`start-${id}`});
    }
    if(Boolean(room.mine)&&turnIsMine(room,me)&&prev.turn_user_id!==me.user_id){
      const sent=await sendBoardMateAlarm('myTurn',{title:`🎯 내 차례 · ${name}`,body:`${room.title||'게임'}에서 내 차례가 되었습니다.`,url:gameHref(room),tag:`turn-${id}-${encodeURIComponent(turnSignature(room))}`});
      if(sent)markTurnSeen(room);
    }
  }
  roomSnapshot=current;
}

// Room lists can refresh from the interval and from several lifecycle events at
// the same time. Serialize alarm evaluation so two overlapping refreshes cannot
// both see the same room as "new" and emit duplicate notifications.
let roomAlarmQueue=Promise.resolve();
export function processRoomAlarms(rooms,me,options={}){
  const run=roomAlarmQueue.then(()=>processRoomAlarmsNow(rooms,me,options));
  roomAlarmQueue=run.catch(()=>{});
  return run;
}

const singleRoomState=new Map();
async function processSingleRoomAlarmNow(room,me,{gameName='게임',gameHref}={}){
  if(!room?.id||!me?.user_id){setBrowserTurnIndicator(0);return;}
  const id=String(room.id),prev=singleRoomState.get(id),myTurn=turnIsMine(room,me);
  setBrowserTurnIndicator(myTurn?1:0,{href:myTurn?(gameHref||hrefForRoom(room)):'./index.html#/multi'});
  singleRoomState.set(id,{...room});
  const href=gameHref||hrefForRoom(room);
  if(!prev){
    if(myTurn&&!turnWasSeen(room)){const sent=await sendBoardMateAlarm('myTurn',{title:`🎯 내 차례 · ${gameName}`,body:`${room.title||'게임'}에서 내 차례입니다.`,url:href,tag:`turn-${id}-${encodeURIComponent(turnSignature(room))}`});if(sent)markTurnSeen(room);}
    return;
  }
  if(prev.status!=='playing'&&room.status==='playing')await sendBoardMateAlarm('gameStart',{title:`▶ ${gameName} 게임 시작`,body:`${room.title||'참가 중인 방'}이 시작되었습니다.`,url:href,tag:`start-${id}`});
  if(myTurn&&prev.turn_user_id!==me.user_id){
    const sent=await sendBoardMateAlarm('myTurn',{title:`🎯 내 차례 · ${gameName}`,body:`${room.title||'게임'}에서 내 차례가 되었습니다.`,url:href,tag:`turn-${id}-${encodeURIComponent(turnSignature(room))}`});
    if(sent)markTurnSeen(room);
  }
}

// Apply the same serialization to the single-room watcher. This also protects
// the first-page-load baseline when a resume event races the initial poll.
let singleRoomAlarmQueue=Promise.resolve();
export function processSingleRoomAlarm(room,me,options={}){
  const run=singleRoomAlarmQueue.then(()=>processSingleRoomAlarmNow(room,me,options));
  singleRoomAlarmQueue=run.catch(()=>{});
  return run;
}
