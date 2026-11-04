/* Guide-compliant SafeDocument route detection; app data is read only. */
(function(root){
  'use strict';
  async function array(value,limit=120){
    if(Array.isArray(value))return value.slice(0,limit);
    if(!value)return[];const length=Math.min(limit,Number(await value.length())||0),nodes=[];
    for(let i=0;i<length;i++)nodes.push(await value.at(i));return nodes;
  }
  async function visible(node){
    if(!node)return false;
    if(await node.matches('[hidden],.hidden,[aria-hidden="true"]'))return false;
    const rect=await node.getBoundingClientRect();return Boolean(rect&&rect.width>0&&rect.height>0);
  }
  async function isHome(api,doc){
    const index=Number(await api.getCurrentCharacterIndex());
    if(!Number.isFinite(index)||index>=0)return false;
    const blockers=await array(await doc.querySelectorAll('#app .rs-setting-cont,#app [role="dialog"],#app [role="alertdialog"],#app dialog[open]'));
    for(const node of blockers)if(await visible(node))return false;
    // A previous server-installed widget hides the native MainMenu; detect its visible host.
    if(await visible(await doc.querySelector('#app #pocketrisu-butter-home')))return true;
    const headings=await array(await doc.querySelectorAll('#app h1,#app h2,#app h3,#app [data-home-title]'));
    let title=false,links=false;
    for(const node of headings){
      if(!await visible(node))continue;
      const value=String(await node.textContent()||'').replace(/\s+/g,' ').trim();
      if(/PocketRisu/i.test(value)&&value.length<50)title=true;
      if(/^(Related Links|관련 링크)$/i.test(value))links=true;
      if(title&&links)return true;
    }
    // 리스·리스바드: 캐릭터를 고르지 않은 상태가 홈. 설정창·대화상자는 위에서 이미 걸렀다.
    return Boolean(await doc.querySelector('#app'));
  }
  class AutoHome{
    constructor(api,options={}){
      this.api=api;this.options=options;this.doc=null;this.observer=null;this.enabled=false;this.disposed=false;this.busy=false;this.suppressed=false;this.autoOwned=false;this.generation=0;this.timer=null;this.poll=null;this.lastError='';this.failurePaused=false;this.listeners=[];
      // Browser timers require Window as their receiver, even when stored on a class.
      this.delay=options.setTimeout?options.setTimeout.bind(options):root.setTimeout.bind(root);
      this.cancel=options.clearTimeout?options.clearTimeout.bind(options):root.clearTimeout.bind(root);
      this.interval=options.setInterval?options.setInterval.bind(options):root.setInterval.bind(root);
      this.clearInterval=options.clearInterval?options.clearInterval.bind(options):root.clearInterval.bind(root);
    }
    get connected(){return Boolean(this.doc&&this.enabled);}
    status(message){if(!this.disposed)this.options.onStatus?.(message);}
    async configure(enabled){
      if(this.disposed)return;
      if(!enabled){this.enabled=false;this.generation++;await this.disconnect();this.autoOwned=false;this.status('홈 자동 열기 꺼짐');return;}
      this.enabled=true;this.failurePaused=false;
      if(this.doc){this.schedule();return;}
      const generation=++this.generation;
      try{
        const doc=await this.api.getRootDocument();if(this.disposed||!this.enabled||generation!==this.generation)return;
        if(!doc){this.status('자동 열기에는 화면 접근 권한이 필요해요. 메뉴에서는 직접 열 수 있어요.');return;}
        this.doc=doc;
        try{
          const target=await doc.querySelector('#app')||await doc.querySelector('body');
          const observer=await this.api.createMutationObserver(()=>this.schedule());
          if(this.disposed||!this.enabled||generation!==this.generation){await observer.disconnect();return;}
          this.observer=observer;
          // Never serialize every chat token/style mutation across the iframe bridge.
          await observer.observe(target,{childList:true,subtree:false});
        }catch{/* Older hosts can still use the bounded polling fallback. */}
        if(this.disposed||!this.enabled||generation!==this.generation)return;
        for(const type of ['click','keyup']){
          try{const id=await doc.addEventListener(type,()=>this.schedule(),{capture:true});this.listeners.push({doc,type,id});}catch{}
        }
        this.poll=this.interval(()=>{if(!this.options.isPageHidden?.())void this.check();},4000);
        this.status('홈 자동 열기 연결됨');await this.check();
      }catch{this.doc=null;this.status('자동 열기를 연결하지 못했어요. 설정의 화면 접근 권한을 확인해 주세요.');}
    }
    schedule(){if(this.disposed||!this.enabled||!this.doc||this.failurePaused||this.timer!==null)return;this.timer=this.delay(()=>{this.timer=null;if(!this.options.isPageHidden?.()){this.options.onActivity?.();void this.check();}},150);}
    suppress(){this.suppressed=true;this.autoOwned=false;this.generation++;}
    pause(){this.failurePaused=true;this.autoOwned=false;this.generation++;}
    release(){this.autoOwned=false;}
    manualOpen(){this.autoOwned=false;this.failurePaused=false;}
    async check(){
      if(this.disposed||!this.enabled||!this.doc||this.busy||this.failurePaused)return;
      // The mounted home is tracked by HomeLayout. Native drawers/dialogs do not require closing/reopening it.
      if(this.options.isVisible?.()&&this.options.isInlineActive?.())return;
      this.busy=true;const generation=this.generation;
      try{
        const home=await isHome(this.api,this.doc);
        if(this.disposed||!this.enabled||generation!==this.generation)return;
        if(!home){await this.options.onRouteAway?.();this.suppressed=false;if(this.autoOwned){this.autoOwned=false;await this.options.onLeave?.();}return;}
        if(this.suppressed||this.options.isVisible?.()||this.options.isOpening?.())return;
        const allow=async()=>{if(this.disposed||!this.enabled||generation!==this.generation||this.suppressed)return false;const current=await isHome(this.api,this.doc);return current&&!this.disposed&&this.enabled&&generation===this.generation&&!this.suppressed;};
        const opened=await this.options.onOpen?.(allow);
        if(!this.disposed&&this.enabled&&generation===this.generation)this.autoOwned=opened===true;
      }catch(error){
        const message=String(error?.message||error);if(message!==this.lastError){this.lastError=message;this.options.onError?.('자동 홈 감지',error);}
        this.status('자동 홈 감지 오류 · 메뉴에서 직접 열 수 있어요.');
      }
      finally{this.busy=false;}
    }
    async disconnect(){this.cancel(this.timer);this.timer=null;this.clearInterval(this.poll);this.poll=null;this.doc=null;const listeners=this.listeners.splice(0);for(const item of listeners)try{await item.doc.removeEventListener(item.type,item.id,{capture:true});}catch{}const observer=this.observer;this.observer=null;if(observer)try{await observer.disconnect();}catch{}}
    async dispose(){this.disposed=true;this.enabled=false;this.generation++;await this.disconnect();}
  }
  const api={AutoHome,isHome};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PocketRisuHomeAuto=api;
})(globalThis);
