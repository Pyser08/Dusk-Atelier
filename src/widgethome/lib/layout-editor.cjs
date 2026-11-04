/* Pointer/keyboard layout editor. No parent DOM calls and no widget recreation. */
(function(root){
 'use strict';
 const M=typeof module!=='undefined'&&module.exports?require('./widget-layout.cjs'):root.PocketRisuWidgetLayoutModel;
 class Editor{
  constructor(options){
   this.options=options;this.win=options.window||root;this.doc=options.document||root.document;this.grid=options.grid;this.host=options.host;this.frames=options.frames;this.editing=false;this.saving=false;this.disposed=false;this.selected='photo';this.profile=null;this.draft=null;this.draftHidden=[];this.hidden=[];this.hiddenKey=null;this.current=null;this.gesture=null;this.animation=null;this.resizeFrame=null;this.painted=new Map();
   this.raf=options.requestAnimationFrame?options.requestAnimationFrame.bind(options):this.win.requestAnimationFrame.bind(this.win);this.caf=options.cancelAnimationFrame?options.cancelAnimationFrame.bind(options):this.win.cancelAnimationFrame.bind(this.win);
   this.nodes=new Map();this.q=s=>{if(!this.nodes.has(s))this.nodes.set(s,this.doc.querySelector(s));return this.nodes.get(s);};this.grid.classList.add('layout-grid');
   for(const id of M.IDS){const frame=this.frames[id];frame.classList.add('widget-frame','widget-'+id);frame.dataset.widget=id;
    const controls=this.doc.createElement('div');controls.className='layout-controls';
    const hit=this.doc.createElement('button');hit.type='button';hit.className='layout-hit';hit.setAttribute('aria-label',M.LABELS[id]+' 위젯 선택');hit.onclick=()=>this.select(id);
    const move=this.doc.createElement('button');move.type='button';move.className='layout-move';move.textContent='⠿ '+M.LABELS[id];move.setAttribute('aria-label',M.LABELS[id]+' 이동. 방향키로도 옮길 수 있어요.');move.onpointerdown=e=>this.begin(id,'move',e);move.onkeydown=e=>this.key(id,'move',e);
    const size=this.doc.createElement('button');size.type='button';size.className='layout-resize';size.textContent='↘';size.setAttribute('aria-label',M.LABELS[id]+' 크기 조절. 방향키로 너비와 높이를 조절합니다.');size.onpointerdown=e=>this.begin(id,'resize',e);size.onkeydown=e=>this.key(id,'resize',e);
    const archive=this.doc.createElement('button');archive.type='button';archive.className='layout-archive';archive.textContent='×';archive.setAttribute('aria-label',M.LABELS[id]+' 위젯 보관');archive.onclick=()=>this.archive(id,true);controls.append(hit,move,size,archive);frame.append(controls);
   }
   this.q('.layout-widget').onchange=e=>this.select(e.target.value);
   this.q('.layout-width').oninput=e=>this.change({w:Number(e.target.value)});this.q('.layout-height').oninput=e=>this.change({h:Number(e.target.value)});
   for(const[selector,dx,dy]of [['.layout-left',-1,0],['.layout-right',1,0],['.layout-up',0,-1],['.layout-down',0,1]])this.q(selector).onclick=()=>this.shift(dx,dy);
   this.q('.layout-save').onclick=()=>this.save();this.q('.layout-cancel').onclick=()=>this.cancel();this.q('.layout-reset').onclick=()=>this.reset();this.q('.layout-compact').onclick=()=>{if(this.editing&&!this.saving){this.finish(false);this.draft=M.compact(this.draft,this.profile,this.m,this.draftHidden);this.render(this.draft);}};
   this.onMove=e=>this.move(e);this.onUp=e=>{if(this.gesture&&e.pointerId===this.gesture.pointerId)this.finish(false);};this.onCancel=e=>{if(this.gesture&&e.pointerId===this.gesture.pointerId)this.finish(true);};
   this.onResize=()=>{if(this.resizeFrame!==null)return;this.resizeFrame=this.raf(()=>{this.resizeFrame=null;if(!this.disposed){this.finish(false);this.apply();}});};
   this.win.addEventListener('pointermove',this.onMove);this.win.addEventListener('pointerup',this.onUp);this.win.addEventListener('pointercancel',this.onCancel);this.win.addEventListener('resize',this.onResize);
   this.apply();
   const Observer=options.ResizeObserver||this.win.ResizeObserver;if(Observer){let width=-1;this.observer=new Observer(entries=>{const next=entries[0]?.contentRect?.width;if(Number.isFinite(next)&&Math.abs(next-width)>.5){width=next;this.onResize();}});this.observer.observe(options.scrollElement||this.host);}
  }
  viewportProfile(){return this.options.getProfile?.()||(this.win.innerWidth<=900?'mobile':'desktop');}
  scrollTop(){return Number(this.options.scrollElement?.scrollTop??this.win.scrollY)||0;}
  scrollBy(y){(this.options.scrollElement||this.win).scrollBy(0,y);}
  measure(profile){const box=this.grid.getBoundingClientRect();return{...M.metrics(box.width||this.win.innerWidth,profile),clock:this.options.getClock()};}
  apply(){if(this.disposed)return;const profile=this.editing?this.profile:this.viewportProfile();this.m=this.measure(profile);this.hidden=this.editing?this.draftHidden:M.hidden(this.options.getHidden?.());const saved=M.profiles(this.options.getLayouts());
   const next=this.editing?M.fit(this.draft,profile,this.m,this.hidden):M.fit(saved[profile],profile,this.m,this.hidden)||M.defaults(profile,this.m,this.options.getShape(),this.options.getClock(),this.hidden);
   this.profile=profile;if(this.editing)this.draft=next;this.render(next);
  }
  css(node,key,value){if(node.style.getPropertyValue(key)!==value)node.style.setProperty(key,value);}
  assign(node,key,value){if(node[key]!==value)node[key]=value;}
  render(value){
   this.current=value;const archived=this.editing?this.draftHidden:this.hidden;if(this.editing&&archived.includes(this.selected))this.selected=M.IDS.find(id=>!archived.includes(id))||null;this.css(this.grid,'--layout-cols',String(this.m.cols));this.css(this.grid,'--layout-gap',this.m.gap+'px');this.css(this.grid,'--layout-row',this.m.row+'px');
   for(const id of M.IDS){const item=value.items[id],frame=this.frames[id],key=[item.x,item.y,item.w,item.h].join(',');
    this.assign(frame,'hidden',archived.includes(id));
    if(this.painted.get(id)!==key){this.assign(frame.style,'gridColumn',`${item.x+1} / span ${item.w}`);this.assign(frame.style,'gridRow',`${item.y+1} / span ${item.h}`);this.painted.set(id,key);
    }
    if(id==='clock'){const px=M.pixels(item,this.m);this.css(frame,'--dial-size',Math.max(70,Math.min(220,px.width-24,px.height-65))+'px');this.css(frame,'--calendar-cell-height',Math.max(18,Math.min(25,(px.height-112)/6))+'px');}
    const selected=this.editing&&this.selected===id;if(frame.classList.contains('layout-selected')!==selected)frame.classList.toggle('layout-selected',selected);
   }
   const empty=archived.length===M.IDS.length;this.assign(this.q('.layout-empty'),'hidden',!empty);if(this.grid.classList.contains('empty-layout')!==empty)this.grid.classList.toggle('empty-layout',empty);
   const hiddenKey=archived.join(',');if(this.hiddenKey!==hiddenKey){this.hiddenKey=hiddenKey;this.options.onChange?.(archived.slice());}
   if(this.editing)this.inspector();
  }
  inspector(){const active=M.IDS.filter(id=>!this.draftHidden.includes(id));if(!active.includes(this.selected))this.selected=active[0]||null;for(const s of ['.layout-widget','.layout-width','.layout-height','.layout-left','.layout-right','.layout-up','.layout-down'])this.assign(this.q(s),'disabled',!active.length||this.saving);for(const option of this.q('.layout-widget').options||[])option.disabled=this.draftHidden.includes(option.value);if(!active.length){this.q('.layout-width-value').textContent='—';this.q('.layout-height-value').textContent='—';return;}const item=this.draft.items[this.selected],limits=M.limits(this.selected,this.profile,this.m,item.w),px=M.pixels(item,this.m);
   for(const[selector,key,value]of [['.layout-widget','value',this.selected],['.layout-width','min',String(limits.minW)],['.layout-width','max',String(limits.maxW)],['.layout-width','value',String(item.w)],['.layout-height','min',String(limits.minH)],['.layout-height','max',String(limits.maxH)],['.layout-height','value',String(item.h)],['.layout-width-value','textContent',Math.round(item.w/this.m.cols*100)+'%'],['.layout-height-value','textContent',Math.round(px.height)+'px'],['.layout-profile','textContent',this.profile==='mobile'?'모바일 배치':'PC 배치']])this.assign(this.q(selector),key,value);
  }
  select(id){if(!this.editing||this.saving||!M.IDS.includes(id)||this.draftHidden.includes(id))return;this.selected=id;this.render(this.draft);}
  start(){if(this.disposed||this.saving||this.editing)return;this.options.beforeEdit?.();this.profile=this.viewportProfile();this.m=this.measure(this.profile);this.draftHidden=M.hidden(this.options.getHidden?.());this.hidden=this.draftHidden;const saved=M.profiles(this.options.getLayouts());this.draft=M.fit(saved[this.profile],this.profile,this.m,this.draftHidden)||M.defaults(this.profile,this.m,this.options.getShape(),this.options.getClock(),this.draftHidden);this.editing=true;this.host.classList.add('editing-layout');this.q('.layout-toolbar').hidden=false;this.options.onMode?.(true);this.render(this.draft);this.q('.layout-toolbar').scrollIntoView({block:'nearest',behavior:'smooth'});}
  change(patch){if(!this.editing||this.saving||!this.selected)return;this.finish(false);this.draft=M.change(this.draft,this.selected,patch,this.profile,this.m,this.draftHidden);this.render(this.draft);}
  shift(dx,dy){if(!this.editing||this.saving||!this.selected)return;const item=this.draft.items[this.selected];this.change({x:item.x+dx,y:item.y+dy});}
  key(id,kind,event){if(!this.editing||this.saving||this.draftHidden.includes(id)||this.gesture||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();this.select(id);const dx=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0,dy=event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:0,item=this.draft.items[id];this.change(kind==='resize'?{w:item.w+dx,h:item.h+dy}:{x:item.x+dx,y:item.y+dy});}
  begin(id,kind,event){if(!this.editing||this.saving||this.draftHidden.includes(id)||this.gesture||event.button!==undefined&&event.button!==0)return;event.preventDefault();this.select(id);this.m=this.measure(this.profile);const target=event.currentTarget;this.gesture={id,kind,pointerId:event.pointerId,target,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,scroll:this.scrollTop(),base:M.fit(this.draft,this.profile,this.m,this.draftHidden),edge:0,lastKey:''};try{target.setPointerCapture(event.pointerId);}catch{}}
  move(event){const g=this.gesture;if(!g||g.pointerId!==event.pointerId)return;event.preventDefault?.();g.x=event.clientX;g.y=event.clientY;const box=this.options.scrollElement?.getBoundingClientRect(),top=Math.max(0,box?.top||0),bottom=Math.min(this.win.innerHeight,box?.bottom||this.win.innerHeight);g.edge=g.y<top+64?-14:g.y>bottom-64?14:0;this.queueGesture();}
  queueGesture(){if(this.animation!==null||!this.gesture)return;this.animation=this.raf(()=>{this.animation=null;const g=this.gesture;if(!g||this.disposed)return;const scroll=this.scrollTop();if(g.edge)this.scrollBy(g.edge);const after=this.scrollTop(),dx=Math.round((g.x-g.startX)/this.m.pitch),dy=Math.round((g.y-g.startY+after-g.scroll)/this.m.rowPitch),key=dx+','+dy;
   if(key!==g.lastKey){g.lastKey=key;const item=g.base.items[g.id];this.draft=M.change(g.base,g.id,g.kind==='resize'?{w:item.w+dx,h:item.h+dy}:{x:item.x+dx,y:item.y+dy},this.profile,this.m,this.draftHidden);this.render(this.draft);}
   if(g.edge&&after!==scroll)this.queueGesture();
  });}
  finish(cancel){const g=this.gesture;if(!g)return;if(this.animation!==null){this.caf(this.animation);this.animation=null;}
   if(!cancel){const dx=Math.round((g.x-g.startX)/this.m.pitch),dy=Math.round((g.y-g.startY+(this.scrollTop())-g.scroll)/this.m.rowPitch),item=g.base.items[g.id];this.draft=M.change(g.base,g.id,g.kind==='resize'?{w:item.w+dx,h:item.h+dy}:{x:item.x+dx,y:item.y+dy},this.profile,this.m,this.draftHidden);}else this.draft=g.base;
   this.gesture=null;try{g.target.releasePointerCapture(g.pointerId);}catch{}this.render(this.draft);
  }
  archive(id,value){if(!this.editing||this.saving||!M.IDS.includes(id))return;this.finish(false);this.draftHidden=M.hidden(value?[...this.draftHidden,id]:this.draftHidden.filter(key=>key!==id));this.hidden=this.draftHidden;this.draft=value?M.compact(this.draft,this.profile,this.m,this.draftHidden):M.fit(this.draft,this.profile,this.m,this.draftHidden);if(value&&this.selected===id)this.selected=M.IDS.find(key=>!this.draftHidden.includes(key))||null;this.render(this.draft);}
  reset(){if(!this.editing||this.saving)return;this.finish(false);this.draft=M.defaults(this.profile,this.m,this.options.getShape(),this.options.getClock(),this.draftHidden);this.render(this.draft);}
  controlsBusy(value){for(const s of ['.layout-save','.layout-cancel','.layout-reset','.layout-compact','.layout-widget','.layout-width','.layout-height','.layout-left','.layout-right','.layout-up','.layout-down'])this.q(s).disabled=value;}
  async save(){if(!this.editing||this.saving)return;this.finish(false);const profile=this.profile,value=M.fit(this.draft,profile,this.m,this.hidden);this.saving=true;this.controlsBusy(true);
   try{await this.options.save(profile,value,this.draftHidden.slice());if(this.disposed)return;this.editing=false;this.draft=null;this.host.classList.remove('editing-layout');this.q('.layout-toolbar').hidden=true;this.options.onMode?.(false);this.apply();this.options.notify?.((profile==='mobile'?'모바일':'PC')+' 배치를 저장했어요.');}
   catch(error){if(!this.disposed)this.options.notify?.('배치를 저장하지 못했어요. 편집 내용은 유지해요.');}
   finally{this.saving=false;if(!this.disposed)this.controlsBusy(false);}
  }
  cancel(){if(!this.editing||this.saving)return;this.finish(true);this.editing=false;this.draft=null;this.host.classList.remove('editing-layout');this.q('.layout-toolbar').hidden=true;this.options.onMode?.(false);this.apply();}
  dispose(){if(this.disposed)return;this.finish(true);this.disposed=true;this.observer?.disconnect();if(this.animation!==null)this.caf(this.animation);if(this.resizeFrame!==null)this.caf(this.resizeFrame);this.win.removeEventListener('pointermove',this.onMove);this.win.removeEventListener('pointerup',this.onUp);this.win.removeEventListener('pointercancel',this.onCancel);this.win.removeEventListener('resize',this.onResize);}
 }
 const api={Editor};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PocketRisuWidgetLayoutEditor=api;
})(globalThis);
