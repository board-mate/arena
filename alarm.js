const KEY='boardmate:alarm_settings';
const SEEN_KEY='boardmate:alarm_seen_turns_v2';
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
export function setBrowserTurnIndicator(count=0){
  const n=Math.max(0,Number(count)||0),base=safeTitleBase();
  document.title=n?`🔔 내 차례${n>1?` (${n})`:''} · ${base}`:base;
  try{document.documentElement.dataset.boardmateMyTurn=n?'1':'0';}catch{}
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
function unseenTurn(room){
  if(!room?.id)return false;
  const seen=loadSeenTurns(),id=String(room.id),sig=turnSignature(room);
  if(seen[id]===sig)return false;
  seen[id]=sig;saveSeenTurns(seen);return true;
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
  if(!document.hidden)playTone();vibrate();
  if(!('Notification' in window)||Notification.permission!=='granted')return false;
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
export async function processRoomAlarms(rooms,me,{gameName=x=>x?.game||'게임',gameHref=hrefForRoom}={}){
  if(!Array.isArray(rooms)||!me?.user_id){setBrowserTurnIndicator(0);return;}
  const myTurnRooms=rooms.filter(r=>Boolean(r.mine)&&turnIsMine(r,me));
  setBrowserTurnIndicator(myTurnRooms.length);
  const current=new Map(rooms.map(r=>[String(r.id),r]));
  if(!roomSnapshot){
    roomSnapshot=current;
    for(const room of myTurnRooms){
      if(!unseenTurn(room))continue;
      const name=gameName(room);
      await sendBoardMateAlarm('myTurn',{title:`🎯 내 차례 · ${name}`,body:`${room.title||'게임'}에서 내 차례입니다.`,url:gameHref(room),tag:`turn-${String(room.id)}-${encodeURIComponent(turnSignature(room))}`});
    }
    return;
  }
  for(const room of rooms){
    const id=String(room.id),prev=roomSnapshot.get(id),name=gameName(room);
    if(!prev){
      if(room.status==='open'&&!room.mine)await sendBoardMateAlarm('newRoom',{title:`🎲 새 방 · ${name}`,body:`${room.title||'새 게임 방'} · ${room.member_count||1}명 참가 중`,url:'./index.html#/multi',tag:`room-${id}`});
      if(Boolean(room.mine)&&turnIsMine(room,me)&&unseenTurn(room))await sendBoardMateAlarm('myTurn',{title:`🎯 내 차례 · ${name}`,body:`${room.title||'게임'}에서 내 차례입니다.`,url:gameHref(room),tag:`turn-${id}-${encodeURIComponent(turnSignature(room))}`});
      continue;
    }
    if(room.mine&&prev.status!=='playing'&&room.status==='playing'){
      await sendBoardMateAlarm('gameStart',{title:`▶ ${name} 게임 시작`,body:`${room.title||'참가 중인 방'}이 시작되었습니다.`,url:gameHref(room),tag:`start-${id}`});
    }
    if(Boolean(room.mine)&&turnIsMine(room,me)&&prev.turn_user_id!==me.user_id){
      markTurnSeen(room);
      await sendBoardMateAlarm('myTurn',{title:`🎯 내 차례 · ${name}`,body:`${room.title||'게임'}에서 내 차례가 되었습니다.`,url:gameHref(room),tag:`turn-${id}-${encodeURIComponent(turnSignature(room))}`});
    }
  }
  roomSnapshot=current;
}

const singleRoomState=new Map();
export async function processSingleRoomAlarm(room,me,{gameName='게임',gameHref}={}){
  if(!room?.id||!me?.user_id){setBrowserTurnIndicator(0);return;}
  const id=String(room.id),prev=singleRoomState.get(id),myTurn=turnIsMine(room,me);
  setBrowserTurnIndicator(myTurn?1:0);
  singleRoomState.set(id,{...room});
  const href=gameHref||hrefForRoom(room);
  if(!prev){
    if(myTurn&&unseenTurn(room))await sendBoardMateAlarm('myTurn',{title:`🎯 내 차례 · ${gameName}`,body:`${room.title||'게임'}에서 내 차례입니다.`,url:href,tag:`turn-${id}-${encodeURIComponent(turnSignature(room))}`});
    return;
  }
  if(prev.status!=='playing'&&room.status==='playing')await sendBoardMateAlarm('gameStart',{title:`▶ ${gameName} 게임 시작`,body:`${room.title||'참가 중인 방'}이 시작되었습니다.`,url:href,tag:`start-${id}`});
  if(myTurn&&prev.turn_user_id!==me.user_id){
    markTurnSeen(room);
    await sendBoardMateAlarm('myTurn',{title:`🎯 내 차례 · ${gameName}`,body:`${room.title||'게임'}에서 내 차례가 되었습니다.`,url:href,tag:`turn-${id}-${encodeURIComponent(turnSignature(room))}`});
  }
}
