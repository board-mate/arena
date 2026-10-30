const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
// Run the actual game logic, stopping before network bootstrap. No production room is created.
function game(name){
 const html=fs.readFileSync(path.join(root,'online-'+name+'.html'),'utf8');
 let source=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>/type="module"/.test(m[1]))[2];
 source=source.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm,'');
 source=source.replace(/\(\(\)\s*=>\s*\{\s*['"]use strict['"];?/,'');
 const boots=[...source.matchAll(/\(async\s*\(\)\s*=>/g)];
 if(source.includes('\nawait loadContext();'))source=source.slice(0,source.indexOf('\nawait loadContext();'));
 else if(boots.length)source=source.slice(0,boots.at(-1).index);
 else if(source.includes('boot().catch'))source=source.slice(0,source.indexOf('boot().catch'));
 const el=()=>({style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},querySelector(){return el();},querySelectorAll(){return[];},addEventListener(){},appendChild(){},insertAdjacentHTML(){},children:[]});
 const context={console,Math,Date,structuredClone,URLSearchParams,Map,Set,configured:()=>false,roomId:'fixture',showFatal(){},setInterval(){},setTimeout(){},clearInterval(){},clearTimeout(){},alert(){},confirm:()=>true,localStorage:{getItem(){return null;},setItem(){}},sessionStorage:{getItem(){return null;}},location:{search:'',hash:''},window:{addEventListener(){},BOARDMATE_CONFIG:{}},document:{querySelector:el,getElementById:el,querySelectorAll:()=>[],createElement:el,addEventListener(){},body:el()}};
 vm.createContext(context);vm.runInContext(source,context,{filename:'online-'+name+'.html'});
 const run=code=>vm.runInContext(code,context);const members=Array.from({length:6},(_,i)=>({user_id:'u'+i,nickname:'P'+i,seat:i}));context.fixtureMembers=members;run('members=fixtureMembers;');
 return{context,run,set:(name,value)=>{context.fixtureValue=value;run(name+'=fixtureValue;');}};
}
module.exports={game,root};
