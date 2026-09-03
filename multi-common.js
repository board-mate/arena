const CFG=window.BOARDMATE_CONFIG||{};
export const configured=()=>Boolean(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase?.createClient);
export const sb=configured()?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
export const roomId=new URLSearchParams(location.search).get('room')||'';
const SESSION_KEY='boardmate:member_session';
const token=()=>localStorage.getItem(SESSION_KEY)||'';
async function rpc(name,args={}){if(!sb)throw new Error('Supabase 설정이 필요합니다.');const {data,error}=await sb.rpc(name,args);if(error)throw error;return data;}
export const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function showFatal(message){const el=document.querySelector('#app')||document.body;el.innerHTML=`<div style="padding:24px;font-family:system-ui"><h2>게임을 열 수 없습니다.</h2><p>${esc(message)}</p><p><a href="./index.html#/multi">다인플 방 목록으로 돌아가기</a></p></div>`;throw new Error(message);}
export async function getMe(){const t=token();if(!t)return null;return await rpc('boardmate_me',{p_token:t});}
export async function loadRoom(){const t=token();if(!t)throw new Error('로그인이 필요합니다.');const data=await rpc('boardmate_get_room',{p_token:t,p_room_id:roomId});if(!data?.room)throw new Error('방을 찾을 수 없습니다.');return data;}
export async function loadState(){const t=token();if(!t)throw new Error('로그인이 필요합니다.');return await rpc('get_boardmate_room_state',{p_token:t,p_room_id:roomId});}
export async function saveState(expectedRevision,state){const t=token();if(!t)throw new Error('로그인이 필요합니다.');return await rpc('put_boardmate_room_state',{p_token:t,p_room_id:roomId,p_expected_revision:expectedRevision,p_state:state});}
function tier(row){const wins=Number(row?.wins||0),losses=Number(row?.losses||0),rank=Number(row?.elo_rank||0);if(rank>=1&&rank<=5)return{text:`🏆 #${rank}`,cls:'rank'};if(wins>=2&&wins/(wins+losses||1)>=.5)return{text:'🥇 골드',cls:'gold'};if(wins>=1)return{text:'🥈 실버',cls:'silver'};return{text:'🥉 브론즈',cls:'bronze'};}
export async function ratingBadges(game,userIds){const rows=await rpc('boardmate_get_ratings',{p_token:token(),p_game:game,p_user_ids:userIds});return Object.fromEntries((rows||[]).map(r=>[r.user_id,tier(r)]));}
export async function submitMatch(order){return await rpc('submit_boardmate_match',{p_token:token(),p_room_id:roomId,p_order:order});}
export function startStatePoll(onRow,options={}){let stopped=false,busy=false,last=-1;const interval=Number(options.interval||1200);const run=async()=>{if(stopped||busy)return;busy=true;try{const row=await loadState();if(row&&Number(row.revision)!==last){last=Number(row.revision);await onRow(row);}}catch(e){console.warn(e);}finally{busy=false;}};run();const id=setInterval(run,interval);return()=>{stopped=true;clearInterval(id);};}
