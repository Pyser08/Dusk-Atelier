/* Native arrow and transparent trusted link hit targets; link artwork stays in
   the iframe layout. No native nodes are moved or sidebar state changed. */
(function(root){
 'use strict';
 let serial=0;
 const KEYS=['github','feedback','email','arca'];
 const labels={github:/github/i,feedback:/의견 보내기|feedback|이슈 제보/i,email:/개발자 이메일|developer.*(?:mail)|contact.*email/i,arca:/아카라이브|arca.?live/i};
 async function array(value,limit=80){if(Array.isArray(value))return value.slice(0,limit);if(!value)return[];const result=[],count=Math.min(limit,Number(await value.length())||0);for(let i=0;i<count;i++)result.push(await value.at(i));return result;}
 class Controls{
  constructor(options={}){this.options=options;this.win=options.window||root;this.raf=this.win.requestAnimationFrame.bind(this.win);this.caf=this.win.cancelAnimationFrame.bind(this.win);this.frame=null;this.sheet=null;this.marked=[];this.box=null;this.visible=false;this.connected=false;this.owner='';this.generation=0;this.disposed=false;this.signature='';this.writing=null;this.covered=new Map();this.buttons=new Map();this.probes=new Map();this.origins=new Map();this.originDirty=true;this.revision=0;this.dirty=false;this.refresh=()=>this.request();this.win.addEventListener('scroll',this.refresh,{passive:true});this.win.addEventListener('resize',this.refresh);if(this.win.ResizeObserver&&options.layoutRoot){this.resizeObserver=new this.win.ResizeObserver(this.refresh);this.resizeObserver.observe(options.layoutRoot);}if(this.win.MutationObserver&&options.modalRoot){this.modalObserver=new this.win.MutationObserver(this.refresh);this.modalObserver.observe(options.modalRoot,{attributes:true,attributeFilter:['open'],subtree:true});}}
  async bind(doc,pane){
   const generation=++this.generation;await this.release();if(this.disposed||generation!==this.generation)return false;
   let sheet=null;const marked=[],probes=new Map();const owner='widget-controls-'+(++serial);
   const mark=async(node,key,value)=>{await node.setAttribute(key,value);marked.push({node,key,value});};
   try{
    let layer=await pane.getParent();for(let depth=0;layer&&depth<6;depth++){if(await layer.matches('.isolate'))break;layer=await layer.getParent();}
    if(!layer||!await layer.matches('.isolate'))return false;
    const body=await doc.querySelector('body');if(!body)return false;
    const buttons=await array(await pane.querySelectorAll('button:has(h2)')),found=new Set(),bindings=new Map();
    await mark(layer,'x-widget-controls',owner);
    for(const button of buttons){const title=await button.querySelector('h2');if(!title)continue;const label=String(await title.textContent()||'').trim();for(const key of KEYS)if(!found.has(key)&&labels[key].test(label)){found.add(key);bindings.set(key,button);await mark(button,'x-widget-related',owner+'-'+key);break;}}
    // Probe each button's own fixed containing block, never its animated position.
    for(const [key,button] of bindings){const hostParent=await button.getParent(),probe=await doc.createElement('span');probes.set(key,probe);await probe.setAttribute('x-widget-origin',owner);await probe.setStyleAttribute('position:fixed!important;left:0!important;top:0!important;right:auto!important;bottom:auto!important;width:0!important;height:0!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;translate:none!important;scale:none!important;rotate:none!important;transition:none!important;animation:none!important;visibility:hidden!important;pointer-events:none!important;');await hostParent.appendChild(probe);}
    sheet=await doc.createElement('style');await sheet.setAttribute('x-widget-controls-style',owner);
    if(this.disposed||generation!==this.generation)throw Error('stale');
    await body.appendChild(sheet);
    if(this.disposed||generation!==this.generation)throw Error('stale');
    this.sheet=sheet;this.marked=marked;this.owner=owner;this.found=found;this.buttons=bindings;this.probes=probes;this.origins=new Map();this.originDirty=true;this.connected=true;this.visible=false;this.signature='';this.request();return true;
   }catch{
    for(const probe of probes.values())try{await probe.remove();}catch{}
    for(const item of marked)try{if(await item.node.getAttribute(item.key)===item.value)await item.node.setAttribute(item.key,'');}catch{}
    if(sheet)try{await sheet.remove();}catch{}return false;
   }
  }
  placement(box,visible=true){this.box=box;this.visible=visible;this.originDirty=true;this.request();}
  invalidate(){this.originDirty=true;this.request();}
  request(){if(!this.connected||this.disposed)return;this.revision++;this.dirty=true;if(this.frame!==null)return;this.frame=this.raf(()=>{this.frame=null;void this.paint();});}
  css(){
   const visible=this.visible&&!this.options.isBlocked?.(),owner=this.owner,layer=`#app [x-widget-controls="${owner}"]`,arrow=`${layer}>button.absolute.top-3.left-0.h-12.w-12.rounded-r-md`,related=`${layer} [x-widget-related^="${owner}-"]`;
   // A pointer-transparent native layer only exposes its actual arrow and link buttons.
   const proposed=this.options.palette?.()||{},safe=(key,fallback)=>/^#[0-9a-f]{6}$/i.test(proposed[key]||'')?proposed[key]:fallback;
   const line=safe('line','#46516a'),surface=safe('surface','#21222c'),ink=safe('ink','#f4f6ff'),selected=safe('selected','#44475a');
   let css=`${layer}{z-index:21!important;pointer-events:none!important;background:transparent!important;box-shadow:none!important;border-color:transparent!important;}${layer}>*{visibility:hidden!important;pointer-events:none!important;}${arrow}{visibility:${visible?'visible':'hidden'}!important;pointer-events:${visible?'auto':'none'}!important;box-sizing:border-box!important;background:var(--risu-theme-darkbg,${surface})!important;color:var(--risu-theme-textcolor,${ink})!important;border:1px solid var(--risu-theme-darkborderc,${line})!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;}${arrow}::before,${arrow}::after{display:none!important;}${arrow}:hover{background:var(--risu-theme-selected,${selected})!important;}${arrow} svg{color:inherit!important;}${related}{visibility:hidden!important;pointer-events:none!important;position:fixed!important;right:auto!important;bottom:auto!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:8px!important;box-sizing:border-box!important;margin:0!important;padding:8px!important;min-height:0!important;min-width:0!important;max-width:none!important;max-height:none!important;border-radius:14px!important;border:1px solid ${line}!important;background:transparent!important;color:transparent!important;border-color:transparent!important;box-shadow:none!important;text-shadow:none!important;transform:none!important;translate:none!important;scale:none!important;rotate:none!important;transition:none!important;animation:none!important;overflow:hidden!important;}${related}>div{position:static!important;width:auto!important;min-width:0!important;transform:none!important;}${related} h2{font-size:11px!important;font-weight:500!important;line-height:1.4!important;margin:0!important;color:inherit!important;}${related} span{display:none!important;}${related}>div[aria-hidden="true"]{order:-1!important;}${related} svg{width:18px!important;height:18px!important;transform:none!important;opacity:1!important;color:inherit!important;}`;
   // Only the iframe paints the tiles; originals are transparent trusted click targets.
   css+=`${related}::before,${related}::after{display:none!important;}${related}>*{opacity:0!important;}${related}:focus-visible{outline:2px solid ${safe('accent','#8aaaf3')}!important;outline-offset:-3px!important;}`;
   const slots=this.options.slots?.()||{},box=this.box;
   for(const key of KEYS){
    const slot=slots[key],b=slot?.getBoundingClientRect();if(!(visible||this.visible&&this.options.allowBlockedLink?.(key))||!this.origins.has(key)||!box||!b||b.width<=0||b.height<=0||b.bottom<=0||b.top>=box.height||b.right<=0||b.left>=box.width)continue;
    const desired={left:Math.round((box.left+b.left)*100)/100,top:Math.round((box.top+b.top)*100)/100,width:b.width,height:b.height};const origin=this.origins.get(key),x=desired.left-origin.x,y=desired.top-origin.y;
    css+=`${layer} [x-widget-related="${owner}-${key}"]{visibility:visible!important;pointer-events:auto!important;left:${x}px!important;top:${y}px!important;width:${Math.round(b.width*100)/100}px!important;height:${Math.round(b.height*100)/100}px!important;clip-path:inset(${Math.max(0,-b.top)}px ${Math.max(0,b.right-box.width)}px ${Math.max(0,b.bottom-box.height)}px ${Math.max(0,-b.left)}px)!important;}`;
   }
   return css;
  }
  async paint(){
   if(!this.connected||!this.sheet)return;if(this.writing)return this.writing;
   const generation=this.generation,sheet=this.sheet;
   this.writing=(async()=>{while(this.dirty&&generation===this.generation){
    this.dirty=false;const revision=this.revision;
    if(this.originDirty){
     this.originDirty=false;const origins=new Map();
     await Promise.all([...this.probes].map(async([key,node])=>{try{const r=await node.getBoundingClientRect();if(Number.isFinite(r?.left)&&Number.isFinite(r?.top))origins.set(key,{x:r.left,y:r.top});}catch{}}));
     if(generation!==this.generation)return;
     if(revision!==this.revision){this.originDirty=true;this.dirty=true;continue;}
     this.origins=origins;
    }
    const css=this.css();if(css===this.signature){this.coverSlots();continue;}
    await sheet.setTextContent(css);
    if(generation===this.generation){this.signature=css;this.coverSlots();}
   }})().catch(()=>{}).finally(()=>{this.writing=null;});return this.writing;
  }
  coverSlots(){
   const slots=this.options.slots?.()||{},current=new Set([...this.origins.keys()].map(key=>slots[key]).filter(Boolean));
   for(const [slot,previous]of this.covered)if(!current.has(slot)){slot.dataset.nativeBound='false';slot.disabled=previous.disabled;slot.tabIndex=previous.tabIndex;slot.setAttribute('aria-hidden','false');this.covered.delete(slot);}
   for(const slot of current){if(this.covered.has(slot))continue;this.covered.set(slot,{disabled:slot.disabled,tabIndex:slot.tabIndex});slot.dataset.nativeBound='true';slot.disabled=true;slot.tabIndex=-1;slot.setAttribute('aria-hidden','true');}
  }
  async release(){this.connected=false;this.visible=false;this.box=null;if(this.frame!==null)this.caf(this.frame);this.frame=null;this.dirty=false;this.revision++;const probes=this.probes;this.probes=new Map();this.origins=new Map();const writing=this.writing,marked=this.marked.splice(0),sheet=this.sheet,covered=this.covered;this.covered=new Map();this.buttons=new Map();this.sheet=null;this.signature='';this.owner='';await writing;for(const probe of probes.values())try{await probe.remove();}catch{}for(const item of marked)try{if(await item.node.getAttribute(item.key)===item.value)await item.node.setAttribute(item.key,'');}catch{}if(sheet)try{await sheet.remove();}catch{}for(const [slot,previous]of covered){if(this.covered.has(slot))continue;slot.dataset.nativeBound='false';slot.disabled=previous.disabled;slot.tabIndex=previous.tabIndex;slot.setAttribute('aria-hidden','false');}}
  async clear(){this.generation++;await this.release();}
  async dispose(){this.disposed=true;await this.clear();this.resizeObserver?.disconnect();this.modalObserver?.disconnect();this.win.removeEventListener('scroll',this.refresh);this.win.removeEventListener('resize',this.refresh);}
 }
 const api={Controls,KEYS};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PocketRisuNativeControls=api;
})(globalThis);
