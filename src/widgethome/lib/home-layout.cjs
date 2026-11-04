/* Place only this plugin's existing iframe over the native home pane.
   The iframe stays in body: moving it would reload its sandbox context. */
(function(root){
  'use strict';
  const MARK='iframe[x-dusk-wh-basic-home="1"]';
  async function nodes(value,limit=80){
    if(Array.isArray(value))return value.slice(0,limit);
    if(!value)return[];const out=[],count=Math.min(limit,Number(await value.length())||0);
    for(let i=0;i<count;i++)out.push(await value.at(i));return out;
  }
  function rect(value){
    if(!value)return null;
    const left=Number(value.left??value.x),top=Number(value.top??value.y),width=Number(value.width),height=Number(value.height);
    return[left,top,width,height].every(Number.isFinite)&&width>=160&&height>=120?{left,top,width,height}:null;
  }
  async function findHome(doc){
    const old=await doc.querySelector('#app #pocketrisu-butter-home');
    if(old&&rect(await old.getBoundingClientRect()))return{pane:old,marker:null};
    const headings=await nodes(await doc.querySelectorAll('#app h2,#app [data-home-title]'));
    for(const heading of headings){
      const title=String(await heading.textContent()||'').trim();
      const headingBox=await heading.getBoundingClientRect();
      if(!/PocketRisu/i.test(title)||title.length>50||!headingBox||headingBox.width<=0||headingBox.height<=0)continue;
      let node=await heading.getParent();
      for(let depth=0;node&&depth<5;depth++,node=await node.getParent()){
        const box=rect(await node.getBoundingClientRect());if(!box)continue;
        // Never choose a wrapper that includes the real character sidebar or settings.
        if(await node.querySelector('.rs-sidebar,.risu-sidebar,.rs-setting-cont,.setting-area'))break;
        const links=await nodes(await node.querySelectorAll('h1,h2,h3'),24);
        for(const link of links)if(/^(Related Links|관련 링크)$/i.test(String(await link.textContent()||'').trim()))return{pane:node,marker:heading};
      }
    }
    return await mainPane(doc);
  }
  async function mainPane(doc){
    const app=await doc.querySelector('#app');if(!app)return null;
    const side=await doc.querySelector('#app .risu-sidebar,#app .rs-sidebar');
    const sbox=side?rect(await side.getBoundingClientRect()):null;
    const edge=sbox?sbox.left+sbox.width:0;
    let best=null,bestArea=0;
    const pool=await nodes(await doc.querySelectorAll('#app > div, #app > div > div, #app > div > div > div, #app main'),60);
    for(const node of pool){
      const box=rect(await node.getBoundingClientRect());if(!box||box.width<280||box.height<240)continue;
      if(sbox&&box.left<edge-2)continue;               // 사이드바를 덮는 감싸개는 고르지 않는다
      if(await node.querySelector('.risu-sidebar,.rs-sidebar,.rs-setting-cont,.setting-area'))continue;
      const area=box.width*box.height;if(area>bestArea){best=node;bestArea=area;}
    }
    if(!best&&!sbox)best=app;
    return best?{pane:best,marker:null,generic:true}:null;
  }
  async function homePane(doc){return(await findHome(doc))?.pane||null;}
  class HomeLayout{
    constructor(api,options={}){this.api=api;this.options=options;this.doc=null;this.sheet=null;this.nativeSheet=null;this.nativePane=null;this.pane=null;this.frame=null;this.marker=null;this.markerPoll=0;this.resizeTimer=null;this.active=false;this.busy=false;this.timer=null;this.signature='';this.mode='sheet';this.generation=0;this.boxKey='';this.inlineStyle='';this.dirty=false;this.candidateKey='';this.candidatePasses=0;this.missingPasses=0;this.coverOwner='';this.coverSerial=0;this.nativeControls=false;this.interval=options.setInterval?options.setInterval.bind(options):root.setInterval.bind(root);this.clear=options.clearInterval?options.clearInterval.bind(options):root.clearInterval.bind(root);this.delay=options.setTimeout?options.setTimeout.bind(options):root.setTimeout.bind(root);this.cancel=options.clearTimeout?options.clearTimeout.bind(options):root.clearTimeout.bind(root);}
    async prepare(doc){
      await this.stop();await this.clearNativeScroll();if(!doc)return false;this.doc=doc;
      const found=await findHome(doc);if(!found)return false;const{pane,marker}=found;this.generic=!!found.generic;
      let frames=await nodes(await doc.querySelectorAll(MARK),2);
      if(!frames.length)frames=await nodes(await doc.querySelectorAll('iframe[srcdoc*="dusk-widgethome-open"]'),2);
      if(frames.length!==1)return false;
      const frame=frames[0],box=rect(await pane.getBoundingClientRect());if(!box)return false;
      await frame.setAttribute('x-dusk-wh-basic-home','1');
      this.frame=frame;this.pane=pane;this.marker=marker;this.markerPoll=0;this.mode='sheet';
      if(!this.sheet){
        let sheet=null;
        try{
          sheet=await doc.createElement('style');await sheet.setAttribute('x-dusk-wh-home-layout','1');
          const body=await doc.querySelector('body');if(!body)throw Error('앱 body 요소를 찾지 못했어요.');
          await body.appendChild(sheet);this.sheet=sheet;
        }catch(error){
          if(sheet)try{await sheet.remove();}catch{}
          this.mode='inline';this.options.onWarning?.('스타일 요소 연결',error);
        }
      }
      if(this.mode==='sheet')try{this.coverOwner=await this.cover(pane);}catch{}
      try{this.nativeControls=Boolean(await this.options.onPane?.(pane,doc,this.generic));await this.write(box,true);return true;}
      catch(error){await this.stop();throw error;}
    }
    async write(box,hidden=false){
      // Leave a hit-test hole for the native sidebar arrow inside the chat layer.
      // Raising that isolated layer would also raise the entire old home over us.
      let insetX=0,insetY=0;
      const arrow=this.nativeControls?null:await this.doc.querySelector('#app button.absolute.top-3.left-0.h-12.w-12.rounded-r-md');
      if(arrow){
        const a=await arrow.getBoundingClientRect();
        if(a&&a.width>0&&a.height>0&&a.left<box.left+96&&a.left+a.width>box.left&&a.top<box.top+96&&a.top+a.height>box.top){
          insetX=Math.min(box.width,Math.ceil(a.left+a.width-box.left+4));insetY=Math.min(box.height,Math.ceil(a.top+a.height-box.top+4));
        }
      }
      const clip=insetX?`polygon(${insetX}px 0,100% 0,100% 100%,0 100%,0 ${insetY}px,${insetX}px ${insetY}px)`:'none';
      const values=[box.left,box.top,box.width,box.height].map(n=>Math.round(n*100)/100);
      const signature=values.join(',')+hidden+clip;if(signature===this.signature&&this.mode==='sheet'){this.dirty=false;this.boxKey=this.geometryKey(box);return;}
      // CSS !important survives the host resetting inline z-index on native alerts.
      const declarations=`position:fixed!important;left:${values[0]}px!important;top:${values[1]}px!important;width:${values[2]}px!important;height:${values[3]}px!important;right:auto!important;bottom:auto!important;min-width:0!important;max-width:none!important;margin:0!important;border:0!important;z-index:20!important;visibility:${hidden?'hidden':'visible'}!important;clip-path:${clip}!important;`;
      if(this.mode==='sheet'){
        try{await this.sheet.setTextContent(`#app [x-dusk-wh-widget-covered="1"]{visibility:hidden!important;pointer-events:none!important;}${MARK}{${declarations}}`);}
        catch(error){
          this.mode='inline';this.options.onWarning?.('스타일 갱신',error);
          try{await this.sheet.remove();}catch{}
          this.sheet=null;
        }
      }
      if(this.mode==='inline'){await this.frame.setStyleAttribute(`display:${hidden?'none':'block'};${declarations}`);try{this.inlineStyle=await this.frame.getStyleAttribute();}catch{this.inlineStyle='';}}
      this.options.onInset?.(this.nativeControls?48:insetX);this.options.onPlacement?.(box,!hidden);
      this.signature=signature;this.boxKey=this.geometryKey(box);this.dirty=false;
    }
    async start(){
      if(!this.pane)return false;const box=rect(await this.pane.getBoundingClientRect());if(!box){await this.stop();return false;}
      await this.write(box);this.active=true;this.timer=this.interval(()=>{if(!this.options.isPageHidden?.())void this.sync();},1000);return true;
    }
    async cover(pane){const owner=this.generation+'.'+(++this.coverSerial);await pane.setAttribute('x-dusk-wh-home-owner',owner);await pane.setAttribute('x-dusk-wh-widget-covered','1');return owner;}
    async uncover(pane,owner){if(!pane)return;try{if(owner&&await pane.getAttribute('x-dusk-wh-home-owner')!==owner)return;await pane.setAttribute('x-dusk-wh-widget-covered','');await pane.setAttribute('x-dusk-wh-home-owner','');}catch{}}
    geometryKey(box){return[box.left,box.top,box.width,box.height].map(value=>Math.round(value*2)/2).join(',');}
    queueSync(delay){if(!this.active)return;this.cancel(this.resizeTimer);const generation=this.generation;this.resizeTimer=this.delay(()=>{this.resizeTimer=null;if(this.active&&generation===this.generation&&!this.options.isPageHidden?.())void this.sync();},delay);}
    requestSync(delay=160){if(!this.active)return;this.dirty=true;this.candidateKey='';this.candidatePasses=0;this.missingPasses=0;this.queueSync(delay);}
    invalidate(){this.cancel(this.resizeTimer);this.resizeTimer=null;this.dirty=true;return this.sync();}
    async recover(generation,selected=null){
      if(!this.active||generation!==this.generation)return null;
      if(++this.missingPasses<2){this.queueSync(100);return null;}
      try{
        if(selected===null)selected=Number(await this.api.getCurrentCharacterIndex());
        if(!this.active||generation!==this.generation)return null;
        if(selected>=0){await this.options.onLost?.();return null;}
        const found=await findHome(this.doc);
        if(!this.active||generation!==this.generation)return null;
        const box=found&&rect(await found.pane.getBoundingClientRect());
        if(!this.active||generation!==this.generation)return null;
        if(box){
          const previous=this.pane,previousOwner=this.coverOwner;let owner='';
          if(this.mode==='sheet')owner=await this.cover(found.pane);
          if(!this.active||generation!==this.generation){if(owner)await this.uncover(found.pane,owner);return null;}
          this.coverOwner=owner;this.pane=found.pane;this.generic=!!found.generic;this.nativeControls=Boolean(await this.options.onPane?.(found.pane,this.doc,this.generic));this.marker=found.marker;this.markerPoll=0;this.missingPasses=0;this.dirty=true;
          if(previous&&previousOwner)await this.uncover(previous,previousOwner);
          return box;
        }
      }catch{}
      if(this.active&&generation===this.generation)await this.options.onLost?.();return null;
    }
    async sync(){
      if(!this.active||this.busy||this.resizeTimer!==null)return;this.busy=true;const generation=this.generation;
      try{
        const boxRead=this.pane.getBoundingClientRect().catch(()=>null),selected=Number(await this.api.getCurrentCharacterIndex());
        if(!this.active||generation!==this.generation||this.resizeTimer!==null)return;
        if(selected>=0){await this.options.onLost?.();return;}
        let box=rect(await boxRead);if(!this.active||generation!==this.generation||this.resizeTimer!==null)return;
        let missing=!box;
        if(!missing&&this.marker&&(this.dirty||++this.markerPoll%5===0)){
          const landmark=await this.marker.getBoundingClientRect().catch(()=>null);
          if(!this.active||generation!==this.generation||this.resizeTimer!==null)return;
          missing=!landmark||landmark.width<=0||landmark.height<=0;
        }
        if(missing){box=await this.recover(generation,selected);if(!box)return;}else this.missingPasses=0;
        if(!this.active||generation!==this.generation||this.resizeTimer!==null)return;
        const key=this.geometryKey(box);
        // Resize the iframe only once the sidebar geometry settles, with a bounded retry count.
        if(key!==this.boxKey&&this.candidateKey!==key){this.candidateKey=key;if(++this.candidatePasses<=4){this.queueSync(60);return;}}
        this.candidateKey='';this.candidatePasses=0;
        if(key===this.boxKey&&!this.dirty){if(this.mode==='sheet')return;if(this.inlineStyle&&await this.frame.getStyleAttribute()===this.inlineStyle)return;}
        await this.write(box);
      }catch{await this.recover(generation);}
      finally{this.busy=false;}
    }
    async clearNativeScroll(){const pane=this.nativePane;this.nativePane=null;if(pane)try{await pane.setAttribute('x-dusk-wh-native-home-scroll','');}catch{}if(this.nativeSheet)try{await this.nativeSheet.remove();}catch{}this.nativeSheet=null;}
    async nativeScroll(pane){if(!pane||!this.doc)return;const generation=this.generation;await this.clearNativeScroll();if(generation!==this.generation)return;let sheet=null,installed=false,marked=false;try{sheet=await this.doc.createElement('style');await sheet.setAttribute('x-dusk-wh-native-scroll-style','1');await sheet.setTextContent('#app [x-dusk-wh-native-home-scroll="1"]{min-height:0!important;max-height:100%!important;height:100%!important;overflow-y:auto!important;overflow-x:hidden!important;box-sizing:border-box!important;overscroll-behavior-y:contain;}');if(generation!==this.generation)return;const body=await this.doc.querySelector('body');await body.appendChild(sheet);if(generation!==this.generation)return;await pane.setAttribute('x-dusk-wh-native-home-scroll','1');marked=true;if(generation!==this.generation)return;this.nativePane=pane;this.nativeSheet=sheet;installed=true;}catch(error){this.options.onWarning?.('기존 홈 스크롤',error);}finally{if(!installed){if(marked&&this.nativePane!==pane)try{await pane.setAttribute('x-dusk-wh-native-home-scroll','');}catch{}if(sheet)try{await sheet.remove();}catch{}}}}
    async stop(options={}){
      this.generation++;this.active=false;this.nativeControls=false;let release=Promise.resolve();try{release=Promise.resolve(this.options.onRelease?.()).catch(()=>{});}catch{}this.cancel(this.resizeTimer);this.resizeTimer=null;this.marker=null;this.markerPoll=0;this.clear(this.timer);this.timer=null;const pane=this.pane,owner=this.coverOwner;this.pane=null;this.coverOwner='';await this.uncover(pane,owner);this.signature='';this.boxKey='';this.inlineStyle='';this.dirty=false;this.candidateKey='';this.candidatePasses=0;this.missingPasses=0;this.options.onInset?.(0);
      if(this.sheet)try{await this.sheet.setTextContent('');}catch(error){try{await this.sheet.remove();}catch{}this.sheet=null;this.options.onWarning?.('스타일 해제',error);}
      if(this.frame&&this.mode==='inline')try{await this.frame.setStyleAttribute('display:none;');}catch(error){this.options.onWarning?.('프레임 해제',error);}
      if(options.nativeScroll&&pane)await this.nativeScroll(pane);await release;
    }
    async dispose(){await this.stop();await this.clearNativeScroll();if(this.sheet)try{await this.sheet.remove();}catch{}this.sheet=null;this.doc=null;this.frame=null;}
  }
  const api={HomeLayout,homePane,rect};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PocketRisuHomeLayout=api;
})(globalThis);
