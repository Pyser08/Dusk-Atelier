require('../src/widgethome/lib/home-layout.cjs').homePane=undefined;   // 원본 테스트는 홈 영역 찾기 없이 렐름 부분만 본다
const assert=require('assert'),fs=require('fs'),R=require('../src/widgethome/lib/realm.cjs'),M=require('../src/widgethome/lib/widget-layout.cjs');
(async()=>{
assert.equal(R.safeImage('javascript:alert(1)'),'');assert.equal(R.safeImage('https://evil.test/a'),'');assert.equal(R.safeImage('https://realm.risuai.net/resource/a'),'https://realm.risuai.net/resource/a');
global.DOMParser=class{parseFromString(html){assert.equal(html,'<img src="https://realm.risuai.net/resource/a" alt="Name">');return{querySelector:()=>({getAttribute:key=>key==='src'?'https://realm.risuai.net/resource/a':'Name'})}}};
const title={textContent:async()=>'<b>Name</b>'},desc={textContent:async()=> 'Intro'},img={getAttribute:async()=>{throw Error('SafeElement forbids ordinary attributes')},getOuterHTML:async()=>'<img src="https://realm.risuai.net/resource/a" alt="Name">'};
const button={querySelector:async s=>s==='img'?img:s==='span.text-lg'?title:desc};
const section={getAttribute:async()=>{throw Error('SafeElement forbids ordinary attributes')},matches:async()=>false,querySelectorAll:async()=>[button],textContent:async()=>''},doc={querySelector:async()=>section};const result=await R.readCards(doc);assert.equal(result.rows.length,1);assert.equal(result.rows[0].name,'<b>Name</b>');assert.equal(result.rows[0].description,'Intro');assert.equal(result.rows[0].node,button);
section.querySelectorAll=async()=>Array(12).fill(button);assert.equal((await R.readCards(doc)).rows.length,10);section.querySelectorAll=async()=>[button];
section.matches=async()=>true;assert.match((await R.readCards(doc)).message,/펼쳐/);assert.equal((await R.readCards({querySelector:async()=>null})).rows.length,0);
global.PocketRisuHomeLayout={homePane:async()=>section};assert.match((await R.readCards({querySelector:async()=>null})).message,/펼쳐/);delete global.PocketRisuHomeLayout;
R.Widget.prototype.createDialog=function(){this.dialog={remove(){}}};
const nodes=new Map();const q=s=>{if(!nodes.has(s))nodes.set(s,{replaceChildren(){}});return nodes.get(s)};let calls=0;const widget=new R.Widget({host:{querySelector:q},api:{getRootDocument:async()=>{calls++;return doc}},onNative:async()=>{}});widget.setVisible(true);await widget.pending;assert.equal(calls,1);assert(widget.timer);widget.setVisible(false);assert.equal(widget.timer,null);await widget.refresh();assert.equal(calls,1);widget.setVisible(true);await widget.pending;widget.dispose();assert(widget.closed);
for(const profile of ['mobile','desktop']){const m=M.metrics(profile==='mobile'?390:1280,profile),previous=M.defaults(profile,m);delete previous.items.realm;const upgraded=M.normalize(profile,previous);for(const id of Object.keys(previous.items))assert.deepEqual(upgraded.items[id],previous.items[id]);}
const view=fs.readFileSync(require('path').join(__dirname,'../src/widgethome/home.js'),'utf8');assert(!view.includes('realm-connect'));assert(!view.includes('dock-new'));assert(view.includes("$('.dock-settings').onclick=()=>openSheet('theme')"));assert(view.includes("$('.dock-music').onclick=()=>$('.music-playlist').click()"));console.log('PASS: automatic host Realm cards, disabled/missing state, image URL validation, visibility timers, old layout migration, original dock actions');
})().catch(e=>{console.error(e);process.exitCode=1});

assert.equal(R.safeImage('/hub-proxy/resource/abc123'),'https://sv.risuai.xyz/resource/abc123');
assert.equal(R.safeImage('/hub-proxy/resource/../../admin'),'');
assert.equal(R.safeImage('https://sv.risuai.xyz/resource/abc123'),'https://sv.risuai.xyz/resource/abc123');
assert.equal(R.safeImage('https://sv.risuai.xyz@evil.test/resource/abc'),'');
