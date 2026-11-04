const assert=require('node:assert/strict'),R=require('../src/widgethome/lib/realm.cjs');
const img={getAttribute:k=>({src:'/hub-proxy/resource/mobile123',alt:'모바일 캐릭터'})[k]||null};
const card={querySelector:s=>s==='img'?img:null,getAttribute:()=>null};
global.DOMParser=class{parseFromString(html){return {querySelectorAll:()=>html==='cards'?Array(12).fill(card):[]}}};
(async()=>{
const rows=R.parseCards('cards');assert.equal(rows.length,10);assert.equal(rows[0].name,'모바일 캐릭터');assert.equal(rows[0].description,'');assert.equal(rows[0].image,'https://sv.risuai.xyz/resource/mobile123');
assert.equal(R.emptyState('Failed to load Realm').state,'error');assert.equal(R.emptyState('이용 약관 동의').state,'consent');assert.equal(R.emptyState('').state,'loading');
const hidden={matches:async()=>true,getInnerHTML:async()=>{throw Error('hidden must be skipped')}};
const visible={matches:async()=>false,getInnerHTML:async()=>'cards'};
const result=await R.readCards({querySelector:async()=>hidden,querySelectorAll:async()=>[hidden,visible]});assert.equal(result.state,'ready');assert.equal(result.rows.length,10);
const waiting={matches:async()=>false,getInnerHTML:async()=>'',querySelectorAll:async()=>[],textContent:async()=>''};
assert.equal((await R.readCards({querySelector:async()=>waiting})).state,'loading');
waiting.textContent=async()=> '약관에 동의해 주세요';assert.equal((await R.readCards({querySelector:async()=>waiting})).state,'consent');
waiting.textContent=async()=> 'Failed to load Realm';assert.equal((await R.readCards({querySelector:async()=>waiting})).state,'error');
console.log('PASS: mobile image-alt titles, optional descriptions, ten-card cap, visible remount selection, distinct loading/consent/error states');
})().catch(e=>{console.error(e);process.exitCode=1});
