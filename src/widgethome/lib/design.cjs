/* Widget design helpers ported from Butter Home v8. */
(function(root){
 'use strict';
 const normalize=value=>String(value||'').replace(/\s+/g,' ').trim();
  function photoSettings(value) {
    const number = (v, low, high, fallback) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(low, Math.min(high, n)) : fallback;
    };
    const v = value && typeof value === 'object' ? value : {};
    return { x: number(v.x ?? 50, 0, 100, 50), y: number(v.y ?? 50, 0, 100, 50), scale: number(v.scale ?? 1, 1, 2, 1) };
  }
  const DESIGN_DEFAULTS=Object.freeze({title:'오늘은 어떤 이야기를 해볼까요?',subtitle:'나만의 속도로, 좋아하는 이야기와 함께',clock:'analog',photoShape:'landscape'});
  function designSettings(value){
    const v=value&&typeof value==='object'?value:{};
    const label=(s,fallback,max)=>typeof s==='string'?normalize(s.replace(/[\u0000-\u001f\u007f]/g,' ')).slice(0,max)||fallback:fallback;
    return {title:label(v.title,DESIGN_DEFAULTS.title,80),subtitle:label(v.subtitle,DESIGN_DEFAULTS.subtitle,120),
      clock:['analog','calendar','digital'].includes(v.clock)?v.clock:DESIGN_DEFAULTS.clock,
      photoShape:['landscape','square'].includes(v.photoShape)?v.photoShape:DESIGN_DEFAULTS.photoShape};
  }
  function clockAngles(date){
    const seconds=date.getSeconds(),minutes=date.getMinutes()+seconds/60;
    return {hour:((date.getHours()%12)+minutes/60)*30,minute:minutes*6,second:seconds*6};
  }
  function calendarMonth(now,offset=0){
    const delta=Math.max(-120,Math.min(120,Number.isFinite(offset)?Math.trunc(offset):0));
    const first=new Date(now.getFullYear(),now.getMonth()+delta,1);
    const year=first.getFullYear(),month=first.getMonth(),start=first.getDay(),count=new Date(year,month+1,0).getDate();
    return {year,month,days:Array.from({length:42},(_,i)=>{const day=i-start+1;return day>0&&day<=count?day:0;}),
      today:year===now.getFullYear()&&month===now.getMonth()?now.getDate():0};
  }

 function tasks(value){return(Array.isArray(value)?value:[]).slice(0,100).filter(t=>t&&typeof t.id==='string'&&typeof t.text==='string').map(t=>({id:t.id.slice(0,100),text:t.text.slice(0,200),done:t.done===true}));}
 const api={photoSettings,DESIGN_DEFAULTS,designSettings,clockAngles,calendarMonth,tasks};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PocketRisuWidgetDesign=api;
})(globalThis);
