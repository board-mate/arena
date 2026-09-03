export const CFG = window.BOARDMATE_CONFIG || {};
export const configured = () => Boolean(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase?.createClient);
export const sb = configured() ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
}) : null;

export const esc = s => String(s ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export const sleep = ms => new Promise(r=>setTimeout(r,ms));
export const roomId = new URLSearchParams(location.search).get('room');

export async function getSession(){
  if(!sb) return null;
  const {data}=await sb.auth.getSession();
  return data.session || null;
}

export async function getMe(){
  const sess=await getSession();
  if(!sess) return null;
  const {data,error}=await sb.from('boardmate_profiles').select('user_id,nickname').eq('user_id',sess.user.id).single();
  if(error) throw error;
  return data;
}

export async function loadRoom(id=roomId){
  const [{data:room,error:rerr},{data:members,error:merr}]=await Promise.all([
    sb.from('boardmate_rooms').select('*').eq('id',id).single(),
    sb.from('boardmate_room_members').select('room_id,user_id,seat,joined_at,boardmate_profiles(nickname)').eq('room_id',id).order('seat')
  ]);
  if(rerr) throw rerr;if(merr) throw merr;
  return {room,members:(members||[]).map(m=>({...m,nickname:m.boardmate_profiles?.nickname||'플레이어'}))};
}

export async function loadState(id=roomId){
  const {data,error}=await sb.from('boardmate_room_state').select('revision,state,updated_at').eq('room_id',id).maybeSingle();
  if(error) throw error;
  return data || {revision:0,state:null,updated_at:null};
}

export async function saveState(expectedRevision,state,id=roomId){
  const {data,error}=await sb.rpc('put_boardmate_room_state',{p_room_id:id,p_expected_revision:expectedRevision,p_state:state});
  if(error) throw error;
  return Number(data);
}

export function startStatePoll(onState,{interval=850,id=roomId,onError=console.warn}={}){
  let stopped=false,last=-1,busy=false;
  const tick=async()=>{
    if(stopped||busy)return;busy=true;
    try{
      const row=await loadState(id);
      if(row.revision!==last){last=row.revision;await onState(row);}
    }catch(e){onError?.(e)}finally{busy=false;}
  };
  tick();
  const timer=setInterval(tick,interval);
  return ()=>{stopped=true;clearInterval(timer);};
}

export async function submitMatch(order,id=roomId){
  const {error}=await sb.rpc('submit_boardmate_match',{p_room_id:id,p_order:order});
  if(error) throw error;
}

export async function ratingBadges(game,userIds){
  if(!userIds.length)return {};
  const {data,error}=await sb.from('boardmate_rating_public').select('user_id,game,wins,losses,games,elo_rank').eq('game',game).in('user_id',userIds);
  if(error) throw error;
  const rows=Object.fromEntries((data||[]).map(r=>[r.user_id,r]));
  const out={};
  for(const id of userIds){
    const r=rows[id]||{wins:0,losses:0,games:0,elo_rank:null};
    const wins=Number(r.wins||0),losses=Number(r.losses||0),rank=Number(r.elo_rank||0);
    let text='🥉 브론즈',cls='bronze';
    if(rank>=1&&rank<=5){text=`🏆 #${rank}`;cls='rank';}
    else if(wins>=2 && wins/(wins+losses||1)>=0.5){text='🥇 골드';cls='gold';}
    else if(wins>=1){text='🥈 실버';cls='silver';}
    out[id]={text,cls,wins,losses,games:Number(r.games||0),rank:rank||null};
  }
  return out;
}

export function showFatal(message){
  document.body.innerHTML=`<div style="font-family:system-ui;padding:40px;max-width:720px;margin:auto"><h1>BoardMate Online</h1><p>${esc(message)}</p><p><a href="./index.html#/multi">← 다인플 페이지로</a></p></div>`;
}
