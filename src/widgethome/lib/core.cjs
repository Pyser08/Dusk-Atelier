/* Basic Home: pure helpers. No app settings or database mutations. */
(function(root){
  'use strict';
  const Layout=typeof module!=='undefined'&&module.exports?require('./widget-layout.cjs'):root.PocketRisuWidgetLayoutModel;
  const PREFIX='pocketrisu.basic-home.v1.';
  const NAVY=Object.freeze({background:'#282a36',surface:'#21222c',border:'#4b5563',selected:'#44475a',text:'#f8f8f2',muted:'#a5adbf',button:'#374151',accent:'#3b82f6'});
  const BLOCK_DEFAULTS=Object.freeze({music:'#21222c',photo:'#6a748d',clock:'#21222c',recent:'#21222c',added:'#21222c',memo:'#21222c',shortcutPhoto:'#21222c',shortcutBackground:'#21222c',shortcutRefresh:'#21222c',shortcutNative:'#21222c',linkGithub:'#21222c',linkFeedback:'#21222c',linkEmail:'#21222c',linkArca:'#21222c'});
  const BLOCK_LABELS=Object.freeze({music:'음악',photo:'사진 테두리·빈칸',clock:'시계',recent:'최근 대화',added:'최근 봇',memo:'메모',shortcutPhoto:'사진 편집 버튼',shortcutBackground:'배경 변경 버튼',shortcutRefresh:'목록 새로고침 버튼',linkGithub:'GitHub',linkFeedback:'의견 보내기',linkEmail:'개발자 이메일',linkArca:'아카라이브'});
  function color(value,fallback='#21222c'){
    if(typeof value!=='string')return fallback;const s=value.trim().toLowerCase();
    if(/^#[0-9a-f]{6}$/.test(s))return s;
    if(/^#[0-9a-f]{3}$/.test(s))return'#'+Array.from(s.slice(1),v=>v+v).join('');return fallback;
  }
  function blockColors(value){const v=value&&typeof value==='object'?value:{};return Object.fromEntries(Object.entries(BLOCK_DEFAULTS).map(([key,fallback])=>[key,color(v[key],fallback)]));}
  function colorPresets(value){
    if(!Array.isArray(value))return[];
    const seen=new Set();return value.slice(0,100).filter(v=>v&&typeof v.id==='string'&&v.id.length<=100&&typeof v.name==='string').map(v=>({id:v.id,name:v.name.replace(/\s+/g,' ').trim().slice(0,40),colors:blockColors(v.colors)})).filter(v=>v.name&&!seen.has(v.id)&&seen.add(v.id));
  }
  function rgb(hex){return[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
  function blend(first,second,weight){const a=rgb(first),b=rgb(second);return'#'+a.map((n,i)=>Math.round(n*(1-weight)+b[i]*weight).toString(16).padStart(2,'0')).join('');}
  function luminance(hex){return rgb(hex).map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);}
  function contrast(first,second){const a=luminance(first),b=luminance(second);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
  function blockPalette(value){const surface=color(value),dark='#172033',light='#f8f8f2';let ink=contrast(surface,dark)>contrast(surface,light)?dark:light;if(contrast(surface,ink)<4.5)ink=contrast(surface,'#000000')>contrast(surface,'#ffffff')?'#000000':'#ffffff';
    let muted=blend(surface,ink,.72);for(let n=.77;contrast(surface,muted)<4.5&&n<=1.001;n+=.05)muted=blend(surface,ink,Math.min(1,n));
    if(contrast(surface,muted)<4.5)muted=ink;
    const proposed=luminance(ink)<.1?'#254e9c':'#abc6ff',accent=contrast(surface,proposed)>=4.5?proposed:ink;
    return{surface,ink,muted,accent,line:blend(surface,ink,.25),soft:blend(surface,ink,.085),button:blend(surface,ink,.14),bg:blend(surface,ink,.035)};
  }
  const DEFAULTS=Object.freeze({followTheme:true,title:'오늘은 어떤 이야기를 해볼까요?',includeLegacy:true,catalogFilterVersion:1,autoHome:true,subtitle:'나만의 속도로, 좋아하는 이야기와 함께',clock:'analog',photoShape:'landscape',colors:BLOCK_DEFAULTS,layouts:Object.freeze({desktop:null,mobile:null}),musicWidthRevision:1,hiddenWidgets:Object.freeze([]),surface:'navy'});
  const normalize=v=>String(v??'').replace(/\s+/g,' ').trim();
  function settings(value){const v=value&&typeof value==='object'?value:{};const layouts=Layout.profiles(v.layouts);if(v.musicWidthRevision!==1&&layouts.desktop?.items.music.w>6)layouts.desktop.items.music.w=6;return{
    followTheme:v.followTheme!==false,title:typeof v.title==='string'?normalize(v.title).slice(0,80)||DEFAULTS.title:DEFAULTS.title,
    subtitle:typeof v.subtitle==='string'?normalize(v.subtitle).slice(0,120):DEFAULTS.subtitle,
    clock:['analog','calendar','digital'].includes(v.clock)?v.clock:DEFAULTS.clock,
    photoShape:['landscape','square'].includes(v.photoShape)?v.photoShape:DEFAULTS.photoShape,
    includeLegacy:v.catalogFilterVersion===1?v.includeLegacy!==false:true,catalogFilterVersion:1,autoHome:v.autoHome!==false,colors:blockColors(v.colors),layouts,musicWidthRevision:1,hiddenWidgets:Layout.hidden(v.hiddenWidgets),surface:['glass','dusk'].includes(v.surface)?v.surface:'navy'};}
  function imageError(file){
    if(!file||!Number.isFinite(file.size)||file.size<=0||file.size>20*1024*1024)return '20MB 이하의 사진을 선택해 주세요.';
    const type=String(file.type||'').toLowerCase().split(';')[0].trim();
    if(/hei[cf]/.test(type)||/\.hei[cf]$/i.test(file.name||''))return 'HEIC·HEIF는 JPG 또는 PNG로 변환해 주세요.';
    const known=/^image\/(png|x-png|apng|jpeg|jpg|pjpeg|webp|gif|avif|bmp|x-ms-bmp)$/;
    if(!known.test(type)&&!((!type||/^(application|binary)\/octet-stream$/.test(type))&&/\.(jpe?g|jpe|jfif|png|webp|gif|avif|bmp|dib)$/i.test(file.name||'')))return 'JPG·PNG·WebP·GIF·AVIF·BMP 사진을 선택해 주세요.';
    return '';
  }
  function imageType(bytes){
    const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),ascii=(a,z)=>String.fromCharCode(...b.slice(a,z));
    if(b.length>=8&&b[0]===137&&ascii(1,4)==='PNG'&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10)return'png';
    if(b[0]===255&&b[1]===216&&b[2]===255)return'jpeg';
    if(/^GIF8[79]a$/.test(ascii(0,6)))return'gif';
    if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return'webp';
    if(b.length>=14&&ascii(0,2)==='BM')return'bmp';
    if(ascii(4,8)==='ftyp')for(let i=8;i+4<=b.length;i+=4)if(['avif','avis'].includes(ascii(i,i+4)))return'avif';
    return'';
  }
  function safeImage(value){return typeof value==='string'&&value.length<=4*1024*1024&&/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)?value:'';}
  function audioError(file){
    if(!file||!Number.isFinite(file.size)||file.size<=0||file.size>20*1024*1024)return '20MB 이하의 음악 파일을 선택해 주세요.';
    return /\.(mp3|m4a|aac|wav|ogg|opus|flac|webm)$/i.test(file.name||'')?'':'MP3·M4A·AAC·WAV·OGG·OPUS·FLAC·WebM 파일을 선택해 주세요.';
  }
  const api={PREFIX,NAVY,DEFAULTS,BLOCK_DEFAULTS,BLOCK_LABELS,colorPresets,color,blockColors,blockPalette,contrast,normalize,settings,imageError,imageType,safeImage,audioError};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PocketRisuHomeCore=api;
})(globalThis);
