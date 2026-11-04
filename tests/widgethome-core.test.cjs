const assert=require('assert');
const L=p=>require('../src/widgethome/lib/'+p+'.cjs');
(async()=>{
const C=L('core');assert(!C.COLOR_PRESETS);assert.equal(C.colorPresets(null).length,0);
assert.equal(C.colorPresets([{id:'a',name:' sample ',colors:{music:'#abc'}}])[0].colors.music,'#aabbcc');
const M=L('widget-layout');
for(const profile of ['mobile','desktop'])for(const width of [320,390,768,1024,1440])for(const clock of ['analog','digital','calendar'])for(const shape of ['square','landscape']){
 const layout=M.defaults(profile,{...M.metrics(width,profile),clock},shape,clock,[]);
 assert.equal(Object.keys(layout.items).length,6);
 const items=Object.values(layout.items);for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)assert(!M.overlap(items[i],items[j]));
}
let visible=false,calls=0,id=0;const live=new Set();
const f=new (L('theme').Follower)({getColorScheme:async()=>{calls++;return null}},{isVisible:()=>visible,setInterval:()=>{live.add(++id);return id},clearInterval:i=>live.delete(i)});
await f.start();assert.equal(calls,0);assert.equal(live.size,0);visible=true;f.syncPolling();f.syncPolling();assert.equal(live.size,1);visible=false;f.syncPolling();assert.equal(live.size,0);visible=true;f.syncPolling();assert.equal(live.size,1);f.dispose();assert.equal(live.size,0);
console.log('PASS:  color presets, 60 layouts, theme timer lifecycle');
})().catch(e=>{console.error(e);process.exitCode=1});
