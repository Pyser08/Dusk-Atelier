/* Read only the official API 3.0 palette. Never fetch or mutate app databases. */
(function(root){
 'use strict';
 const BASE=Object.freeze({bg:'#282a36',surface:'#21222c',soft:'#303443',button:'#363c50',line:'#464c61',ink:'#f8f8f2',muted:'#a9b2c8',accent:'#8aaaf3',selected:'#44475a',danger:'#f1a4ad',onAccent:'#ffffff',type:'dark'});
 function color(value,fallback){if(typeof value!=='string')return fallback;let v=value.trim().toLowerCase();if(/^#[0-9a-f]{3}$/.test(v))v='#'+[...v.slice(1)].map(n=>n+n).join('');return /^#[0-9a-f]{6}$/.test(v)?v:fallback;}
 function luminance(hex){return[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
 function palette(value){
  const s=value?.scheme;if(!s||!color(s.bgcolor)||!color(s.darkbg)||!color(s.textcolor))return null;
  const accent=color(s.primary,color(s.borderc,BASE.accent));
  return{bg:color(s.bgcolor),surface:color(s.darkbg),soft:color(s.selected,BASE.soft),button:color(s.darkbutton,BASE.button),line:color(s.darkBorderc,color(s.borderc,BASE.line)),ink:color(s.textcolor),muted:color(s.textcolor2,BASE.muted),accent,selected:color(s.selected,BASE.selected),danger:color(s.draculared,BASE.danger),onAccent:luminance(accent)>.179?'#000000':'#ffffff',type:['light','dark'].includes(s.type)?s.type:luminance(color(s.bgcolor))>.179?'light':'dark'};
 }
 class Follower{
  constructor(api,options={}){this.api=api;this.options=options;this.value=null;this.signature='';this.task=null;this.disposed=false;this.timer=null;this.unsupported=false;this.interval=options.setInterval?options.setInterval.bind(options):root.setInterval.bind(root);this.clear=options.clearInterval?options.clearInterval.bind(options):root.clearInterval.bind(root);}
  async refresh(){
   if(this.disposed||this.unsupported||typeof this.api.getColorScheme!=='function')return this.value;if(this.task)return this.task;
   this.task=(async()=>{try{const value=palette(await this.api.getColorScheme());if(this.disposed||!value)return this.value;const key=JSON.stringify(value);if(key!==this.signature){this.signature=key;this.value=value;this.options.onChange?.(value);}return this.value;}catch(error){if(/not found|missing|not a function/i.test(String(error?.message||error)))this.unsupported=true;return this.value;}})().finally(()=>{this.task=null;if(this.unsupported)this.syncPolling();});return this.task;
  }
  syncPolling(){const active=!this.disposed&&!this.unsupported&&typeof this.api.getColorScheme==='function'&&Boolean(this.options.isVisible?.());if(!active){if(this.timer!==null)this.clear(this.timer);this.timer=null;}else if(this.timer===null)this.timer=this.interval(()=>{if(this.options.isVisible?.())void this.refresh();else this.syncPolling();},2000);}
  async start(){if(this.disposed)return;if(this.options.isVisible?.())await this.refresh();this.syncPolling();}
  dispose(){this.disposed=true;this.clear(this.timer);this.timer=null;}
 }
 const api={BASE,color,palette,Follower};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PocketRisuHomeTheme=api;
})(globalThis);
