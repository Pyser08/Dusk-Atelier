const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),D=require('../src/widgethome/lib/design.cjs');
const source=fs.readFileSync(path.join(__dirname,'../src/widgethome/home.js'),'utf8');let computations=0,renderings=0,stamp=new Date(2026,10,4,12).getTime();const nodes=new Map();const node=()=>({append(){},setAttribute(){},replaceChildren(){renderings++}});const state={prefs:{clock:'calendar'},calendarOffset:0};
const ctx=vm.createContext({state,currentHidden:()=>[],Date:class extends Date{constructor(){super(stamp)}},D:{...D,calendarMonth(...args){computations++;return D.calendarMonth(...args)}},timeFormat:{format:()=>''},dateFormat:{format:()=>''},text(){},cached:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},document:{createElement:node}});
vm.runInContext(source.slice(source.indexOf(' function clock(){'),source.indexOf(' function startClock(){')),ctx);
ctx.clock();for(let i=0;i<60;i++){stamp+=60000;ctx.clock()}assert.equal(computations,1);assert.equal(renderings,1);
state.calendarOffset=1;ctx.clock();assert.equal(computations,2);stamp+=86400000;ctx.clock();assert.equal(computations,3);state.calendarOffset=0;ctx.clock();assert.equal(computations,4);
console.log('PASS: unchanged calendar skips 60 rebuild calculations; month and date changes update');
