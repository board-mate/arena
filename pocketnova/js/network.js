// BoardMate Arcade bridge + local hotseat adapter.
function serializeState(state){
  return JSON.stringify(state,(k,v)=>v instanceof Map?{__boardmateMap:[...v.entries()]}:v);
}
function deserializeState(raw){
  if(!raw)return null;
  const text=typeof raw==='string'?raw:JSON.stringify(raw);
  return JSON.parse(text,(k,v)=>v&&Array.isArray(v.__boardmateMap)?new Map(v.__boardmateMap):v);
}
class LocalHotseatAdapter{
  publish(){}
  publishResult(){}
  onRemoteUpdate(){}
  isConnected(){return false;}
}
class ArcadeAdapter{
  constructor(){
    this._callbacks=[];
    window.addEventListener('message',e=>{
      if(e.data?.type==='game_state'&&e.data.state){
        try{
          const state=deserializeState(e.data.state);
          this._callbacks.forEach(cb=>cb(state));
        }catch(err){console.warn('remote state parse failed',err);}
      }
    });
    setTimeout(()=>window.parent.postMessage({type:'pocketnova_ready'},'*'),0);
  }
  publish(state){try{window.parent.postMessage({type:'game_state',state:serializeState(state)},'*');}catch(e){console.warn(e)}}
  publishResult(order){try{window.parent.postMessage({type:'game_result',order},'*');}catch(e){console.warn(e)}}
  onRemoteUpdate(cb){this._callbacks.push(cb)}
  isConnected(){return true;}
}
export function createNetworkAdapter(){
  const q=new URLSearchParams(location.search);
  return q.get('online')==='1'&&window.parent!==window?new ArcadeAdapter():new LocalHotseatAdapter();
}
