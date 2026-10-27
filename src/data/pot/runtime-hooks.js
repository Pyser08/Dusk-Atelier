// 출처: risupot 2.3.0 src/runtime-hooks.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

class RuntimeHookManager{
 constructor(api,auto,main,{scheduler=globalThis}={}){this.api=api;this.auto=auto;this.main=main;this.scheduler=scheduler;this.state='pending';this.permissionGranted=false;this.chat=false;this.replacer=false;this.worker=null;this.timer=null;this.retried=false;this.chatListener=arg=>{main.clearDirectorCache?.();auto.onOutput(arg)};this.beforeListener=(messages,type)=>main.listener(messages,type)}
 status(){return{state:this.state,chat:this.chat,replacer:this.replacer}}
 publish(){this.auto.setHook(this.state);this.main.setHook(this.state)}
 async cleanup(){if(this.replacer)try{await this.api.removeRisuReplacer('beforeRequest',this.beforeListener)}catch{}if(this.chat)try{await this.api.removeRisuChatListener('output',this.chatListener)}catch{}this.chat=false;this.replacer=false}
 async ensure(){if(this.worker)return await this.worker;if(this.state==='ready'||this.state==='disposed')return this.state;this.worker=this.once();try{return await this.worker}finally{this.worker=null}}
 async once(){if(typeof this.api.addRisuChatListener!=='function'||typeof this.api.addRisuReplacer!=='function'){this.state='unsupported';this.publish();return this.state}try{if(!this.permissionGranted&&typeof this.api.requestPluginPermission==='function'){if(!await this.api.requestPluginPermission('replacer')){this.state='denied';this.publish();return this.state}this.permissionGranted=true}await this.cleanup();await this.api.addRisuChatListener('output',this.chatListener);this.chat=true;await this.api.addRisuReplacer('beforeRequest',this.beforeListener);this.replacer=true;this.state='ready'}catch{await this.cleanup();this.state='failed';if(!this.retried&&this.timer===null)this.timer=this.scheduler.setTimeout(()=>{this.timer=null;this.retried=true;void this.ensure()},750)}this.publish();return this.state}
 async dispose(){this.state='disposed';if(this.timer!==null)this.scheduler.clearTimeout(this.timer);this.timer=null;this.auto.dispose?.();this.main.destroy?.();await this.cleanup();this.publish()}
}
