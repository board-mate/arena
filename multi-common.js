import {processSingleRoomAlarm} from './alarm.js?v=11.4.51';
const CFG=window.BOARDMATE_CONFIG||{};
export const configured=()=>Boolean(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase?.createClient);
export const sb=configured()?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
export const roomId=new URLSearchParams(location.search).get('room')||'';
const SESSION_KEY='boardmate:member_session';
const token=()=>localStorage.getItem(SESSION_KEY)||sessionStorage.getItem(SESSION_KEY)||'';
async function rpc(name,args={}){if(!sb)throw new Error('Supabase 설정이 필요합니다.');const {data,error}=await sb.rpc(name,args);if(error)throw error;return data;}
export const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function showFatal(message){const el=document.querySelector('#app')||document.body;el.innerHTML=`<div style="padding:24px;font-family:system-ui"><h2>게임을 열 수 없습니다.</h2><p>${esc(message)}</p><p><a href="./index.html#/multi">다인플 방 목록으로 돌아가기</a></p></div>`;throw new Error(message);}
let lastTouch=0,touchBusy=false;
export async function touchPresence(force=false){const now=Date.now();if(!roomId||!token()||touchBusy||(!force&&now-lastTouch<7000))return;touchBusy=true;try{await rpc('touch_boardmate_room',{p_token:token(),p_room_id:roomId});lastTouch=Date.now();}catch{}finally{touchBusy=false;}}
export async function getMe(){const t=token();if(!t)return null;return await rpc('boardmate_me',{p_token:t});}
export async function loadRoom(){const t=token();if(!t)throw new Error('로그인이 필요합니다.');await touchPresence();const data=await rpc('boardmate_get_room',{p_token:t,p_room_id:roomId});if(!data?.room)throw new Error('방을 찾을 수 없습니다.');return data;}
export async function loadState(){const t=token();if(!t)throw new Error('로그인이 필요합니다.');await touchPresence();return await rpc('get_boardmate_room_state',{p_token:t,p_room_id:roomId});}
// ───────────────────── realtime game-state sync ─────────────────────
// BoardMate uses a public Realtime Broadcast channel only as a lightweight
// "state changed" signal. No game state or secret information is broadcast.
// Every recipient still calls the membership-protected RPC loadState(), so a
// forged broadcast cannot grant access to a room or alter game state.
//
// Channel: boardmate:room:<room UUID>
// Event:   state_changed
// Payload: { revision: number }
//
// Polling remains as a fallback. This makes the update safe to deploy without
// requiring a destructive DB migration or changing every game's game logic.
let stateChannel=null;
let stateChannelRoom='';
let stateChannelPromise=null;

async function getStateChannel(){
  if(!configured()||!roomId)return null;
  if(stateChannel && stateChannelRoom===roomId)return stateChannel;
  stateChannelRoom=roomId;
  stateChannel=sb.channel(`boardmate:room:${roomId}`,{config:{broadcast:{self:false}}});
  stateChannelPromise=new Promise(resolve=>{
    let settled=false;
    const finish=ch=>{if(!settled){settled=true;resolve(ch);}};
    stateChannel.subscribe(status=>{
      if(status==='SUBSCRIBED')finish(stateChannel);
      else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')finish(null);
    });
    setTimeout(()=>finish(null),5000);
  });
  return await stateChannelPromise;
}

async function broadcastStateRevision(revision){
  try{
    const ch=await getStateChannel();
    if(!ch)return false;
    const result=await ch.send({
      type:'broadcast',
      event:'state_changed',
      payload:{revision:Number(revision)}
    });
    return result==='ok';
  }catch(e){
    console.warn('[BoardMate Realtime] broadcast failed; polling fallback remains active.',e);
    return false;
  }
}

// Fantasy Realms uses a private-per-room state row because player hands are secret.
export async function loadFantasyState(){
  const t=token();
  if(!t)throw new Error('로그인이 필요합니다.');
  await touchPresence();
  return await rpc('get_boardmate_fantasy_state',{p_token:t,p_room_id:roomId});
}
export async function saveFantasyState(expectedRevision,publicState,privateStates){
  const t=token();
  if(!t)throw new Error('로그인이 필요합니다.');
  await touchPresence();
  const newRevision=await rpc('put_boardmate_fantasy_state',{
    p_token:t,p_room_id:roomId,p_expected_revision:expectedRevision,
    p_public_state:publicState,p_private_states:privateStates
  });
  void broadcastStateRevision(newRevision);
  return Number(newRevision);
}
export async function claimFantasyController(){const t=token();if(!t)throw new Error('로그인이 필요합니다.');return Boolean(await rpc('claim_boardmate_fantasy_controller',{p_token:t,p_room_id:roomId}));}
export async function sendRoomBroadcast(event,payload={}){
  try{
    const ch=await getStateChannel();
    if(!ch)return false;
    const result=await ch.send({type:'broadcast',event,payload});
    return result==='ok';
  }catch(e){console.warn(`[BoardMate Realtime] ${event} broadcast failed.`,e);return false;}
}
export async function subscribeRoomBroadcast(event,handler){
  const ch=await getStateChannel();
  if(!ch)return null;
  ch.on('broadcast',{event},msg=>{try{handler(msg?.payload??msg);}catch(e){console.warn(`[BoardMate Realtime] ${event} handler failed.`,e);}});
  return ch;
}

export async function saveState(expectedRevision,state){
  const t=token();
  if(!t)throw new Error('로그인이 필요합니다.');
  await touchPresence();
  const newRevision=await rpc('put_boardmate_room_state',{
    p_token:t,p_room_id:roomId,p_expected_revision:expectedRevision,p_state:state
  });
  // Broadcast failure must never turn a successful DB write into a game error.
  // Recipients will still receive the change through the polling fallback.
  void broadcastStateRevision(newRevision);
  return newRevision;
}
function tier(row){const wins=Number(row?.wins||0),losses=Number(row?.losses||0),rank=Number(row?.elo_rank||0);if(rank>=1&&rank<=5)return{text:`#${rank}`,cls:'rank',title:`전체 ${rank}위`};if(wins>=2&&wins/(wins+losses||1)>=.5)return{text:'🥇',cls:'gold',title:'골드'};if(wins>=1)return{text:'🥈',cls:'silver',title:'실버'};return{text:'🥉',cls:'bronze',title:'브론즈'};}
export async function ratingBadges(game,userIds){const rows=await rpc('boardmate_get_ratings',{p_token:token(),p_game:game,p_user_ids:userIds});return Object.fromEntries((rows||[]).map(r=>[r.user_id,tier(r)]));}
export async function submitMatch(order){return await rpc('submit_boardmate_match',{p_token:token(),p_room_id:roomId,p_order:order});}
export async function submitTeamMatch(winners,losers){return await rpc('submit_boardmate_team_match',{p_token:token(),p_room_id:roomId,p_winners:winners,p_losers:losers});}
export async function submitCoopMatch(win){return await rpc('submit_boardmate_coop_match',{p_token:token(),p_room_id:roomId,p_win:Boolean(win)});}
export function startStatePoll(onRow,options={}){
  let stopped=false,busy=false,last=-1,pendingRevision=-1;
  // Realtime is the primary path. Polling is deliberately retained as a
  // recovery path so a temporary WebSocket/network failure cannot freeze a game.
  const interval=Number(options.interval||10000);

  const run=async(minRevision=-1)=>{
    if(stopped)return;
    if(busy){
      pendingRevision=Math.max(pendingRevision,Number(minRevision)||-1);
      return;
    }
    busy=true;
    try{
      const row=await loadState();
      const rev=Number(row?.revision??-1);
      if(row && rev>last && rev>=Number(minRevision||-1)){
        last=rev;
        await onRow(row);
      }
    }catch(e){console.warn(e);}
    finally{
      busy=false;
      if(!stopped && pendingRevision>last){
        const next=pendingRevision;
        pendingRevision=-1;
        void run(next);
      }else if(!stopped){
        pendingRevision=-1;
      }
    }
  };

  let channel=null;
  (async()=>{
    try{
      channel=await getStateChannel();
      if(channel){
        channel.on('broadcast',{event:'state_changed'},msg=>{
          const rev=Number(msg?.payload?.revision??-1);
          if(rev>last)void run(rev);
        });
      }
    }catch(e){console.warn('[BoardMate Realtime] subscription failed; polling fallback active.',e);}
    if(!stopped)void run();
  })();

  const id=setInterval(()=>void run(),interval);
  return ()=>{
    stopped=true;
    clearInterval(id);
    // Do not remove the channel here: another helper on the same page may
    // still need it, and the browser will clean it up on navigation.
  };
}
window.addEventListener('focus',()=>touchPresence(true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)touchPresence(true)});

export function endPanel(title='게임 종료',message=''){return `<section style="margin-top:14px;padding:18px;border-radius:18px;background:#fffdf3;border:2px solid #e7c45a;text-align:center;box-shadow:0 8px 24px #00000012"><h2 style="margin:0 0 6px">${esc(title)}</h2>${message?`<p style="margin:0 0 14px;color:#64748b">${esc(message)}</p>`:''}<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><a href="./index.html#/" style="text-decoration:none;background:#111827;color:#fff;padding:10px 14px;border-radius:11px;font-weight:900">← 홈으로</a><a href="./index.html#/multi" style="text-decoration:none;background:#f36f21;color:#fff;padding:10px 14px;border-radius:11px;font-weight:900">다인플 목록</a><a href="./index.html#/room/${encodeURIComponent(roomId)}" style="text-decoration:none;background:#fff;color:#334155;border:1px solid #cbd5e1;padding:10px 14px;border-radius:11px;font-weight:900">방으로 돌아가기</a></div></section>`;}


// ───────────────────── unanimous game-cancel vote ─────────────────────
let cancelUiMounted=false,cancelPollId=null,cancelOverlayShown=false;
async function cancelStatus(){return await rpc('boardmate_get_cancel_status',{p_token:token(),p_room_id:roomId});}
async function setCancelVote(vote){return await rpc('boardmate_set_cancel_vote',{p_token:token(),p_room_id:roomId,p_vote:Boolean(vote)});}
function showCancelledOverlay(){
  if(cancelOverlayShown)return;cancelOverlayShown=true;
  const ov=document.createElement('div');
  ov.id='boardmate-cancelled-overlay';
  ov.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0f172ae8;display:grid;place-items:center;padding:18px;font-family:Pretendard,"Noto Sans KR",system-ui,sans-serif';
  ov.innerHTML=`<div style="width:min(500px,100%);background:white;border-radius:22px;padding:26px;text-align:center;box-shadow:0 30px 90px #0008"><div style="font-size:42px">🛑</div><h2 style="margin:8px 0">게임이 취소되었습니다</h2><p style="color:#64748b;line-height:1.6">참가자 전원이 취소에 동의했습니다.<br>이번 게임은 승패와 ELO에 반영되지 않습니다.</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:18px"><a href="./index.html#/" style="text-decoration:none;background:#111827;color:white;padding:11px 15px;border-radius:11px;font-weight:900">← 홈으로</a><a href="./index.html#/multi" style="text-decoration:none;background:#f36f21;color:white;padding:11px 15px;border-radius:11px;font-weight:900">다인플 목록</a></div></div>`;
  document.body.appendChild(ov);
}
function mountCancelControl(){
  if(cancelUiMounted||!roomId||!token()||!configured())return;cancelUiMounted=true;
  const wrap=document.createElement('div');wrap.id='boardmate-cancel-control';wrap.style.cssText='position:fixed;right:14px;bottom:14px;z-index:2147483000;font-family:Pretendard,"Noto Sans KR",system-ui,sans-serif';
  wrap.innerHTML=`<button id="bmCancelOpen" type="button" style="border:1px solid #fecaca;background:#fff;color:#b91c1c;border-radius:999px;padding:9px 12px;font-weight:900;box-shadow:0 8px 24px #0002;cursor:pointer">게임 취소</button><div id="bmCancelPanel" hidden style="position:absolute;right:0;bottom:48px;width:min(330px,calc(100vw - 28px));background:white;color:#172033;border:1px solid #e5e7eb;border-radius:16px;padding:14px;box-shadow:0 18px 50px #0004"><b style="display:block;margin-bottom:5px">🛑 게임 취소 투표</b><div id="bmCancelText" style="font-size:12px;color:#64748b;line-height:1.55">투표 상태를 불러오는 중…</div><div id="bmCancelVoters" style="font-size:11px;color:#94a3b8;margin-top:6px"></div><button id="bmCancelVote" type="button" style="width:100%;margin-top:10px;border:0;border-radius:10px;padding:9px;font-weight:900;cursor:pointer;background:#fee2e2;color:#b91c1c">취소에 동의</button><button id="bmCancelClose" type="button" style="width:100%;margin-top:6px;border:1px solid #e5e7eb;border-radius:10px;padding:8px;font-weight:800;cursor:pointer;background:white;color:#475569">닫기</button></div>`;
  document.body.appendChild(wrap);
  const open=wrap.querySelector('#bmCancelOpen'),panel=wrap.querySelector('#bmCancelPanel'),text=wrap.querySelector('#bmCancelText'),voters=wrap.querySelector('#bmCancelVoters'),voteBtn=wrap.querySelector('#bmCancelVote');
  let latest=null,busy=false;
  const draw=st=>{latest=st;if(!st)return;const cancelled=Boolean(st.cancelled)||st.room_status==='cancelled';if(cancelled){wrap.style.display='none';showCancelledOverlay();return;}const roomStatus=st.room_status||'playing';if(st.room_status&&roomStatus!=='playing'){wrap.style.display='none';return;}wrap.style.display='block';const yes=Number(st.yes??st.votes??0),total=Number(st.total??st.members??0);text.textContent=`${yes} / ${total}명 동의 · 전원이 동의하면 즉시 취소됩니다.`;const ns=Array.isArray(st.voters)?st.voters:[];voters.textContent=ns.length?`동의: ${ns.join(', ')}`:(st.mine?'나는 취소에 동의한 상태입니다.':'아직 취소에 동의하지 않았습니다.');voteBtn.textContent=st.mine?'동의 철회':'취소에 동의';voteBtn.style.background=st.mine?'#f1f5f9':'#fee2e2';voteBtn.style.color=st.mine?'#475569':'#b91c1c';};
  const refresh=async()=>{if(busy)return;busy=true;try{draw(await cancelStatus());}catch(e){const msg=String(e.message||'');if(msg.includes('참가자')||msg.includes('지원하지 않는 게임'))wrap.style.display='none';else if(msg.includes('schema cache')||msg.includes('boardmate_get_cancel_status')){wrap.style.display='block';text.textContent='Supabase 게임 취소 RPC가 아직 적용되지 않았습니다. 최신 Repair/Targeted SQL을 실행해 주세요.';voteBtn.disabled=true;}}finally{busy=false;}};
  open.onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)refresh();};
  wrap.querySelector('#bmCancelClose').onclick=()=>panel.hidden=true;
  voteBtn.onclick=async()=>{if(busy)return;if(!latest?.mine&&!confirm('게임 취소에 동의할까요? 참가자 전원이 동의하면 이 게임은 승패/ELO 반영 없이 종료됩니다.'))return;busy=true;voteBtn.disabled=true;try{draw(await setCancelVote(!latest?.mine));}catch(e){const msg=String(e.message||'');alert((msg.includes('schema cache')||msg.includes('boardmate_set_cancel_vote'))?'Supabase에 게임 취소 RPC가 아직 적용되지 않았습니다. 최신 Repair/Targeted SQL을 실행해 주세요.':(e.message||'취소 투표에 실패했습니다.'));}finally{busy=false;if(!String(text.textContent||'').includes('Repair/Targeted SQL'))voteBtn.disabled=false;}};
  refresh();cancelPollId=setInterval(refresh,2200);
  window.addEventListener('beforeunload',()=>{if(cancelPollId)clearInterval(cancelPollId);},{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mountCancelControl,0),{once:true});else setTimeout(mountCancelControl,0);
export function openCancelVotePanel(){
  mountCancelControl();
  const open=document.querySelector('#bmCancelOpen'),panel=document.querySelector('#bmCancelPanel');
  if(!open||!panel)return false;
  panel.hidden=false;
  open.setAttribute('aria-expanded','true');
  return true;
}


// ───────────────────── BoardMate turn/start alarm watcher ─────────────────────
let alarmWatcherStarted=false,alarmWatcherTimer=null;
async function pollRoomAlarm(){
  if(!roomId||!token()||!configured())return;
  try{
    const [me,data]=await Promise.all([getMe(),loadRoom()]);
    const room=data?.room;
    if(!me||!room)return;
    const gameLabel=String(room.title||room.game||'BoardMate 게임');
    const href=`./${location.pathname.split('/').pop()}?room=${encodeURIComponent(roomId)}`;
    await processSingleRoomAlarm(room,me,{gameName:gameLabel,gameHref:href});
  }catch{}
}
function startAlarmWatcher(){
  if(alarmWatcherStarted||!roomId)return;alarmWatcherStarted=true;
  void pollRoomAlarm();
  alarmWatcherTimer=setInterval(()=>void pollRoomAlarm(),7000);
  window.addEventListener('beforeunload',()=>{if(alarmWatcherTimer)clearInterval(alarmWatcherTimer);},{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(startAlarmWatcher,800),{once:true});else setTimeout(startAlarmWatcher,800);
