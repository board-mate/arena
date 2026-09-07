const CFG=window.BOARDMATE_CONFIG||{};
export const roomId=new URLSearchParams(location.search).get('room')||'';
export const token=()=>localStorage.getItem('boardmate:member_session')||sessionStorage.getItem('boardmate:member_session')||'';
export const configured=()=>Boolean(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase?.createClient);
export const sb=configured()?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function rpc(name,args={}){if(!sb)throw new Error('Supabase 설정이 필요합니다.');const {data,error}=await sb.rpc(name,args);if(error)throw error;return data;}
export async function boot(expectedGame){
  if(!configured()||!roomId)throw new Error('BoardMate 다인플 방에서 게임을 열어주세요.');
  const me=await rpc('boardmate_me',{p_token:token()});
  if(!me)throw new Error('로그인이 필요합니다.');
  const data=await rpc('boardmate_get_room',{p_token:token(),p_room_id:roomId});
  if(!data?.room||data.room.game!==expectedGame)throw new Error('올바른 게임 방이 아닙니다.');
  const member=(data.members||[]).find(x=>x.user_id===me.user_id);
  if(!member)throw new Error('이 방의 참가자가 아닙니다.');
  return {me,room:data.room,members:(data.members||[]).slice().sort((a,b)=>Number(a.seat)-Number(b.seat)),mySeat:Number(member.seat),isHost:data.room.host_id===me.user_id};
}
export async function getView(){return await rpc('boardmate_social_view',{p_token:token(),p_room_id:roomId});}
export async function act(action){return await rpc('boardmate_social_action',{p_token:token(),p_room_id:roomId,p_action:action});}
export async function touch(){try{await rpc('touch_boardmate_room',{p_token:token(),p_room_id:roomId});}catch{}}
export function startPolling(onView,{interval=1200}={}){
  let stopped=false,busy=false,lastRevision=-1;
  const tick=async()=>{if(stopped||busy)return;busy=true;try{const v=await getView();const r=Number(v?.revision??0);if(r!==lastRevision){lastRevision=r;await onView(v);}}catch(e){console.warn('social poll',e);}finally{busy=false;}};
  tick();const id=setInterval(tick,interval);const presence=setInterval(()=>void touch(),15000);void touch();
  return ()=>{stopped=true;clearInterval(id);clearInterval(presence);};
}
export function fatal(message){document.body.innerHTML=`<main class="sd-fatal"><h1>게임을 열 수 없습니다</h1><p>${esc(message)}</p><a href="./index.html#/multi">다인플 목록으로</a></main>`;throw new Error(String(message));}
export const ROLE_KO={
  merlin:'멀린',percival:'퍼시벌',loyal:'아서의 충성스러운 신하',assassin:'암살자',morgana:'모르가나',mordred:'모드레드',oberon:'오베론',minion_of_mordred:'모드레드의 하수인',
  liberal:'자유당원',fascist:'파시스트',hitler:'히틀러',
  doppelganger:'도플갱어',werewolf:'늑대인간',minion:'하수인',mason:'프리메이슨',seer:'예언자',robber:'강도',troublemaker:'말썽쟁이',drunk:'주정뱅이',insomniac:'불면증환자',villager:'마을주민',tanner:'무두장이',hunter:'사냥꾼'
};
export const roleKo=r=>ROLE_KO[r]||r||'—';
export const POLICY_KO={L:'자유 정책',F:'파시스트 정책'};
export const policyKo=p=>POLICY_KO[p]||p;
export function roleListHtml(counts){
  const entries=Object.entries(counts||{}).filter(([,n])=>Number(n)>0);
  return entries.map(([r,n])=>`<span class="sd-role-pill">${esc(roleKo(r))} ×${Number(n)}</span>`).join('')||'<span class="sd-muted">역할 구성이 아직 없습니다.</span>';
}
export function openRoles(counts,title='이번 판 역할'){
  document.querySelector('#sdRoleModal')?.remove();
  const wrap=document.createElement('div');wrap.id='sdRoleModal';wrap.className='sd-modal-backdrop';
  wrap.innerHTML=`<section class="sd-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sd-modal-head"><h2>🎭 ${esc(title)}</h2><button type="button" class="sd-btn ghost" data-close>닫기</button></div><div class="sd-role-list">${roleListHtml(counts)}</div><p class="sd-muted">역할 종류와 수량만 공개합니다. 누가 어떤 역할인지는 공개하지 않습니다.</p></section>`;
  document.body.appendChild(wrap);wrap.querySelector('[data-close]').onclick=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)wrap.remove();};
}
export function namesBySeat(members){return Object.fromEntries((members||[]).map(m=>[Number(m.seat),m.nickname]));}
export function seatName(members,seat){return members.find(m=>Number(m.seat)===Number(seat))?.nickname||`#${Number(seat)+1}`;}
