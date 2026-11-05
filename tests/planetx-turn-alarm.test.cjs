const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

function fixture(){
  const elements=new Map(),storage=new Map();
  const append=el=>{if(el.id)elements.set(el.id,el);};
  const document={title:'Planet X',hidden:false,documentElement:{dataset:{}},
    head:{appendChild:append},body:{appendChild:append},
    getElementById:id=>elements.get(id),querySelector:()=>null,
    createElement:()=>({style:{},dataset:{}})};
  const context={document,window:{},navigator:{},URL,console,
    localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../alarm.js'),'utf8').replace(/^export /gm,''),context);
  const me={user_id:'u0'},members=[{user_id:'u0',seat:0},{user_id:'u1',seat:1}];
  const room={id:'planetx-test',game:'planetx',status:'playing',mine:true,turn_user_id:'u0',turn_updated_at:'start'};
  const state={phase:'theory-select',current:0,theoryRound:1};
  const status=[{seat:0,ready:false},{seat:1,ready:false}];
  const calls=[];
  const rpc=async(name,args)=>{
    calls.push({name,args});
    if(name==='get_boardmate_room_state')return {state};
    if(name==='boardmate_planetx_theory_status')return status;
    if(name==='boardmate_get_room')return {room,members};
    throw new Error('Unexpected RPC '+name);
  };
  return {context,document,elements,me,members,room,state,status,calls,rpc};
}

test('submitted theories clear the title and banner even while the time-track leader is unchanged',async()=>{
  const f=fixture(),options={rpc:f.rpc,members:f.members};
  await f.context.processSingleRoomAlarm(f.room,f.me,options);
  assert.match(f.document.title,/내 차례/);
  assert.equal(f.elements.get('boardmate-turn-banner').style.display,'block');
  f.status[0].ready=true;
  for(let poll=0;poll<3;poll++)await f.context.processSingleRoomAlarm(f.room,f.me,options);
  assert.equal(f.room.turn_user_id,'u0');
  assert.equal(f.document.title,'Planet X');
  assert.equal(f.elements.get('boardmate-turn-banner').style.display,'none');
  assert.equal(f.document.documentElement.dataset.boardmateMyTurn,'0');
  f.state.phase='theory-place';
  await f.context.processSingleRoomAlarm(f.room,f.me,options);
  assert.equal(f.document.title,'Planet X');
  f.state.phase='turn';
  await f.context.processSingleRoomAlarm(f.room,f.me,options);
  assert.match(f.document.title,/내 차례/);
});

test('simultaneous theory selection prompts every unsubmitted player and respects each new round',async()=>{
  const f=fixture();f.room.turn_user_id='u1';
  await f.context.processSingleRoomAlarm(f.room,f.me,{rpc:f.rpc,members:f.members});
  assert.match(f.document.title,/내 차례/);
  f.status[0].ready=true;
  await f.context.processSingleRoomAlarm(f.room,f.me,{rpc:f.rpc,members:f.members});
  assert.equal(f.document.title,'Planet X');
  f.state.theoryRound=2;f.status[0].ready=false;
  await f.context.processSingleRoomAlarm(f.room,f.me,{rpc:f.rpc,members:f.members});
  assert.match(f.document.title,/내 차례/);
  assert.equal(f.calls.filter(c=>c.name==='boardmate_planetx_theory_status').at(-1).args.p_phase_id,2);
});

test('room-list alarms also clear submitted players when returning to the home or multiplayer page',async()=>{
  const f=fixture();
  await f.context.processRoomAlarms([f.room],f.me,{rpc:f.rpc});
  assert.match(f.document.title,/내 차례/);
  f.status[0].ready=true;
  await f.context.processRoomAlarms([f.room],f.me,{rpc:f.rpc});
  assert.equal(f.document.title,'Planet X');
  assert.ok(f.calls.some(c=>c.name==='boardmate_get_room'));
  const other={...f.room,id:'other',game:'acquire'};
  await f.context.processRoomAlarms([f.room,other],f.me,{rpc:f.rpc});
  assert.match(f.document.title,/내 차례/);
  assert.equal(f.document.title.includes('(2)'),false);
});

test('automatic phases stay silent, and other games need no extra RPC',async()=>{
  const f=fixture();
  for(const phase of ['setup','theory-place','reveal','finished']){
    f.state.phase=phase;
    await f.context.processSingleRoomAlarm(f.room,f.me,{rpc:f.rpc});
    assert.equal(f.document.title,'Planet X');
  }
  f.calls.length=0;
  await f.context.processSingleRoomAlarm({...f.room,game:'acquire'},f.me,{rpc:f.rpc});
  assert.match(f.document.title,/내 차례/);
  assert.equal(f.calls.length,0);
  await f.context.processRoomAlarms([{...f.room,mine:false}],f.me,{rpc:f.rpc});
  assert.equal(f.document.title,'Planet X');
  assert.equal(f.calls.length,0);
});

test('temporary RPC failure preserves existing alarms without failing the room refresh',async()=>{
  const f=fixture();
  await f.context.processSingleRoomAlarm(f.room,f.me,{rpc:async()=>{throw new Error('offline')}});
  assert.match(f.document.title,/내 차례/);
});
