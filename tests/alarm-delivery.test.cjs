const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fixture(options={}){
 const elements=new Map(),storage=new Map(),sent=[],workerSent=[];
 const control={failDirect:0,failWorker:false,attempts:0,workerAttempts:0,...options};
 storage.set('boardmate:alarm_settings',JSON.stringify({enabled:true,sound:false,vibrate:false}));
 const append=el=>{if(el.id)elements.set(el.id,el)};
 const document={title:'BoardMate',hidden:true,documentElement:{dataset:{}},head:{appendChild:append},body:{appendChild:append},createElement:()=>({style:{},dataset:{}}),getElementById:id=>elements.get(id),querySelector:()=>null};
 class Notification{static permission='granted';constructor(title,opts){control.attempts++;if(control.failDirect>0){control.failDirect--;throw Error('temporarily unavailable')}sent.push({title,opts});}}
 const navigator={};
 if(options.worker)navigator.serviceWorker={ready:options.readyNever?new Promise(()=>{}):Promise.resolve({showNotification:async(title,opts)=>{control.workerAttempts++;if(control.failWorker)throw Error('worker unavailable');workerSent.push({title,opts});}})};
 const context={document,window:{Notification},Notification,navigator,URL,console,setTimeout:fn=>options.readyNever?queueMicrotask(fn):0,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../alarm.js'),'utf8').replace(/^export /gm,''),context);
 const me={user_id:'me'},room={id:'room',game:'acquire',status:'playing',mine:true,turn_user_id:'me',turn_updated_at:'turn-1'};
 return{context,control,sent,workerSent,storage,document,me,room};
}
test('system delivery uses the service worker and preserves destination/tag',async()=>{
 const f=fixture({worker:true});assert.equal(await f.context.sendBoardMateAlarm('myTurn',{title:'test',url:'./game.html?room=room',tag:'turn-room'}),true);
 assert.equal(f.workerSent.length,1);assert.equal(f.sent.length,0);assert.equal(f.workerSent[0].opts.data.url,'./game.html?room=room');assert.equal(f.workerSent[0].opts.tag,'turn-room');
});
test('worker failure or readiness timeout falls back to browser Notification',async()=>{
 for(const options of [{worker:true,failWorker:true},{worker:true,readyNever:true}]){const f=fixture(options);assert.equal(await f.context.sendTestAlarm(),true);assert.equal(f.sent.length,1);}
});
test('denied permissions never report delivery or mark the turn seen',async()=>{
 const f=fixture();f.context.Notification.permission='denied';await f.context.processSingleRoomAlarm(f.room,f.me);assert.equal(f.sent.length,0);assert.equal(f.storage.has('boardmate:alarm_seen_turns_v3'),false);assert.match(f.document.title,/내 차례/);
});
test('an initially failed turn alert retries on the next poll without waiting for another player',async()=>{
 const f=fixture({failDirect:1});await f.context.processSingleRoomAlarm(f.room,f.me);assert.equal(f.sent.length,0);
 await f.context.processSingleRoomAlarm(f.room,f.me);assert.equal(f.sent.length,1);
 await f.context.processSingleRoomAlarm(f.room,f.me);assert.equal(f.sent.length,1);
});
test('room-list turn alerts retry failed delivery and stop after success',async()=>{
 const f=fixture({failDirect:1});await f.context.processRoomAlarms([f.room],f.me);assert.equal(f.sent.length,0);
 await f.context.processRoomAlarms([f.room],f.me);assert.equal(f.sent.length,1);
 await f.context.processRoomAlarms([f.room],f.me);assert.equal(f.sent.length,1);
});
test('replayed old room snapshots do not send the same turn twice',async()=>{
 for(const single of [true,false]){const f=fixture(),process=room=>single?f.context.processSingleRoomAlarm(room,f.me):f.context.processRoomAlarms([room],f.me);
 await process(f.room);await process({...f.room,turn_user_id:'other'});await process(f.room);assert.equal(f.sent.length,1);
 await process({...f.room,turn_user_id:'other'});await process({...f.room,turn_updated_at:'turn-2'});assert.equal(f.sent.length,2);}
});
test('new room and game-start events deliver once across overlapping refreshes',async()=>{
 const f=fixture();await f.context.processRoomAlarms([],f.me);const open={...f.room,status:'open',mine:false,turn_user_id:null};
 await Promise.all([f.context.processRoomAlarms([open],f.me),f.context.processRoomAlarms([open],f.me)]);assert.equal(f.sent.length,1);assert.match(f.sent[0].title,/새 방/);
 const started={...f.room,turn_user_id:'other'};await Promise.all([f.context.processRoomAlarms([started],f.me),f.context.processRoomAlarms([started],f.me)]);assert.equal(f.sent.length,2);assert.match(f.sent[1].title,/게임 시작/);
});
test('failed new-room and game-start notifications retry while the event is still relevant',async()=>{
 const f=fixture();await f.context.processRoomAlarms([],f.me);
 const open={...f.room,status:'open',mine:false,turn_user_id:null};f.control.failDirect=1;
 await f.context.processRoomAlarms([open],f.me);assert.equal(f.sent.length,0);
 await f.context.processRoomAlarms([open],f.me);assert.equal(f.sent.length,1);
 const started={...f.room,turn_user_id:'other'};f.control.failDirect=1;
 await f.context.processRoomAlarms([started],f.me);assert.equal(f.sent.length,1);
 await f.context.processRoomAlarms([started],f.me);assert.equal(f.sent.length,2);
 await f.context.processRoomAlarms([started],f.me);assert.equal(f.sent.length,2);
});
