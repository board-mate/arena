const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');

// Exercise the real engine without booting the Arena bridge or publishing state.
function calico(){
 const html=fs.readFileSync(path.join(__dirname,'../online-calico.html'),'utf8');
 const code=html.slice(html.indexOf('  const ASSET_BASE'),html.indexOf('  // Events'));
 const elements=new Map();
 const element=()=>({classList:{add(){},remove(){},toggle(){}},dataset:{},style:{},querySelector:select,querySelectorAll(){return[]},appendChild(){},remove(){},addEventListener(){}});
 function select(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector)}
 let seed=12345;
 const randomMath=Object.create(Math);
 randomMath.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const ctx={console,URLSearchParams,Date,Math:randomMath,Set,Map,
  localStorage:{getItem(){return null},setItem(){}},window:{addEventListener(){}},location:{search:'',hash:''},
  document:{querySelector:select,querySelectorAll(){return[]},createElement:element,body:element()},setTimeout(){},clearTimeout(){}};
 ctx.window.parent=ctx.window;
 vm.createContext(ctx);vm.runInContext(code,ctx,{filename:'online-calico.html'});
 const run=code=>vm.runInContext(code,ctx);
 run('enterGame=()=>{};autoSave=()=>{};renderGame=()=>{};toast=()=>{};showScoreModal=()=>{};');
 return{ctx,run};
}
module.exports={calico};
