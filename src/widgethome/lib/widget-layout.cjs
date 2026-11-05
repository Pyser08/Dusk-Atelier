/* Pure layout math. Every widget keeps its DOM and data while its grid area changes. */
(function(root){
 'use strict';
 const IDS=Object.freeze(['music','photo','clock','recent','added','memo','realm','photo2','photo3','dusk','dday','timer','dice','stats','protlink']);
 const ORIGINAL=Object.freeze(['music','photo','clock','recent','added','memo']);
 const LABELS=Object.freeze({music:'음악',photo:'사진',clock:'시계',recent:'최근 대화',added:'최근 봇',memo:'메모',realm:'리스 렐름',photo2:'사진 2',photo3:'사진 3',dusk:'Dusk 바로가기',dday:'D-day',timer:'타이머',dice:'주사위·뽑기',stats:'한눈에',protlink:'ProtLink+'});
 const hidden=value=>IDS.filter(id=>Array.isArray(value)&&value.includes(id));
 const MAX_ROWS=240,MAX_H=24;
 const integer=(value,low,high,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.max(low,Math.min(high,Math.round(n))):fallback;};
 const columns=profile=>profile==='mobile'?4:12;
 const minimumWidth=(id,profile)=>profile==='mobile'?(id==='music'?4:2):(id==='music'?6:3);
 function metrics(width,profile){const cols=columns(profile),gap=profile==='mobile'?10:12,w=Math.max(240,Number(width)||960),pitch=(w+gap)/cols,rowPitch=pitch/2;return{width:w,cols,gap,pitch,rowPitch,row:Math.max(1,rowPitch-gap)};}
 const pixels=(item,m)=>({width:item.w*m.pitch-m.gap,height:item.h*m.rowPitch-m.gap});
 function limits(id,profile,m,w){
  const px=(w||minimumWidth(id,profile))*m.pitch-m.gap;
  const minPixels=id==='music'?(px<650?160:96):id.startsWith('photo')?136:id==='clock'?(m.clock==='digital'?130:m.clock==='calendar'?230:180):148;
  return{minW:minimumWidth(id,profile),maxW:m.cols,minH:Math.min(MAX_H,Math.max(2,Math.ceil((minPixels+m.gap)/m.rowPitch))),maxH:MAX_H};
 }
 function constrain(id,input,profile,m){const v=input||{},base=minimumWidth(id,profile),w=integer(v.w,base,m.cols,base),l=limits(id,profile,m,w),h=integer(v.h,l.minH,l.maxH,l.minH);return{x:integer(v.x,0,m.cols-w,0),y:integer(v.y,0,MAX_ROWS-h,0),w,h};}
 function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
 function firstFree(item,placed,cols,start=0,fixedX=null){
  for(let y=start;y<=MAX_ROWS-item.h;y++)for(let x=fixedX??0;x<=(fixedX??cols-item.w);x++){
   const candidate={...item,x,y};if(!placed.some(p=>overlap(candidate,p)))return candidate;
  }
  return null;
 }
 function normalize(profile,value){
  if(!value||typeof value!=='object'||!value.items||ORIGINAL.some(id=>!value.items[id]||typeof value.items[id]!=='object'))return null;
  const cols=columns(profile),items={};let bottom=0;for(const id of IDS){const v=value.items[id];if(v&&typeof v==='object')bottom=Math.max(bottom,(Number(v.y)||0)+(Number(v.h)||0));}
  for(const id of IDS){const v=value.items[id]&&typeof value.items[id]==='object'?value.items[id]:{x:0,y:bottom,w:id==='realm'?cols:profile==='mobile'?2:4,h:6},w=integer(v.w,minimumWidth(id,profile),cols,minimumWidth(id,profile)),h=integer(v.h,2,MAX_H,4);items[id]={x:integer(v.x,0,cols-w,0),y:integer(v.y,0,MAX_ROWS-h,0),w,h};}
  return{version:1,items};
 }
 function profiles(value){const v=value&&typeof value==='object'?value:{};return{desktop:normalize('desktop',v.desktop),mobile:normalize('mobile',v.mobile)};}
 function resolve(input,profile,priority=null,archived=[]){
  const cols=columns(profile),items=Object.fromEntries(IDS.map(id=>[id,{...input.items[id]}])),placed=[];
  const active=IDS.filter(id=>!archived.includes(id));if(!active.includes(priority))priority=null;
  const order=active.filter(id=>id!==priority).sort((a,b)=>items[a].y-items[b].y||items[a].x-items[b].x||IDS.indexOf(a)-IDS.indexOf(b));
  if(priority){placed.push(items[priority]);order.unshift(priority);}
  for(const id of order){if(id===priority)continue;let item=items[id],attempt=0;
   while(placed.some(p=>overlap(item,p))&&attempt++<IDS.length+1){const collisions=placed.filter(p=>overlap(item,p));item={...item,y:Math.max(...collisions.map(p=>p.y+p.h))};if(item.y+item.h>MAX_ROWS)break;}
   if(item.y+item.h>MAX_ROWS||placed.some(p=>overlap(item,p)))item=firstFree(items[id],placed,cols);
   if(!item)throw Error('이 배치에는 위젯을 놓을 공간이 부족해요. 빈칸 정리나 기본 배치를 사용해 주세요.');
   items[id]=item;placed.push(item);
  }
  return{version:1,items};
 }
 function fit(value,profile,m,archived=[]){const clean=normalize(profile,value);if(!clean)return null;const items={};for(const id of IDS)items[id]=constrain(id,clean.items[id],profile,m);
  // Keep the rows below music together when its narrower controls need more height.
  const extra=items.music.h-clean.items.music.h,bottom=clean.items.music.y+clean.items.music.h;
  if(extra>0&&!archived.includes('music'))for(const id of IDS)if(id!=='music'&&clean.items[id].y>=bottom)items[id].y=Math.min(MAX_ROWS-items[id].h,items[id].y+extra);
  return resolve({version:1,items},profile,null,archived);}

 function defaults(profile,m,shape='landscape',clock='analog',archived=[]){
  const items={},placed=[],cols=columns(profile);
  for(const id of IDS.filter(id=>!['photo2','photo3'].includes(id))){
   const w=profile==='mobile'?(['clock','memo'].includes(id)?2:4):({music:6,photo:5,clock:3,recent:4,added:7,memo:5,realm:12,dusk:4,dday:4,timer:4,dice:4,stats:4,protlink:4}[id]);
   const minimum=limits(id,profile,m,w),desired=id==='music'?minimum.minH:id.startsWith('photo')?(shape==='square'?2*w:Math.round(2*w/1.65)):id==='clock'?Math.ceil(((clock==='digital'?190:250)+m.gap)/m.rowPitch):Math.ceil((210+m.gap)/m.rowPitch);
   const h=Math.min(MAX_H,Math.max(minimum.minH,desired)),candidate={x:0,y:0,w,h};
   const next=firstFree(candidate,placed,cols);items[id]=next;placed.push(id==='music'?{...next,w:cols}:next);
  }
  if(profile==='desktop'&&shape==='square'){
   const photoW=m.width<1050?6:5,clockW=3,recentW=cols-photoW-clockW,top=items.music.h,photoH=photoW*2;
   const clockH=Math.max(limits('clock',profile,m,clockW).minH,Math.ceil(((clock==='digital'?180:250)+m.gap)/m.rowPitch));
   const lowerH=Math.max(limits('memo',profile,m,clockW).minH,limits('added',profile,m,recentW).minH,photoH-clockH);
   items.photo={x:0,y:top,w:photoW,h:photoH};items.clock={x:photoW,y:top,w:clockW,h:clockH};items.recent={x:photoW+clockW,y:top,w:recentW,h:clockH};items.memo={x:photoW,y:top+clockH,w:clockW,h:lowerH};items.added={x:photoW+clockW,y:top+clockH,w:recentW,h:lowerH};
  }
  // On phones keep the clock and memo together below the photo, then the recent lists.
  if(profile==='mobile'){
   const photoBottom=items.photo.y+items.photo.h;items.clock={...items.clock,x:0,y:photoBottom};items.memo={...items.memo,x:2,y:photoBottom};
   const bottom=photoBottom+Math.max(items.clock.h,items.memo.h);items.recent={...items.recent,x:0,y:bottom};items.added={...items.added,x:0,y:bottom+items.recent.h};
  }
  items.realm={x:0,y:Math.max(...Object.values(items).map(i=>i.y+i.h)),w:columns(profile),h:Math.max(6,limits('realm',profile,m,columns(profile)).minH)};
  for(const id of ['photo2','photo3'])items[id]={...items.photo,x:0,y:Math.max(...Object.values(items).map(i=>i.y+i.h))};
  const value=resolve({version:1,items},profile,null,archived);return archived.length?compact(value,profile,m,archived):value;
 }
 function change(value,id,patch,profile,m,archived=[]){const clean=fit(value,profile,m,archived);if(!IDS.includes(id)||archived.includes(id)||!clean)return clean;clean.items[id]=constrain(id,{...clean.items[id],...patch},profile,m);return resolve(clean,profile,id,archived);}
 function compact(value,profile,m,archived=[]){const clean=m?fit(value,profile,m,archived):resolve(normalize(profile,value),profile,null,archived),placed=[],items=Object.fromEntries(IDS.map(id=>[id,{...clean.items[id]}]));for(const id of IDS.filter(id=>!archived.includes(id)).sort((a,b)=>clean.items[a].y-clean.items[b].y||clean.items[a].x-clean.items[b].x)){const item=clean.items[id];const next=firstFree(item,placed,columns(profile),0,item.x)||firstFree(item,placed,columns(profile));items[id]=next;placed.push(next);}return{version:1,items};}
 const api={IDS,ORIGINAL,LABELS,hidden,MAX_ROWS,MAX_H,columns,metrics,pixels,limits,normalize,profiles,overlap,fit,defaults,change,compact};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PocketRisuWidgetLayoutModel=api;
})(globalThis);
