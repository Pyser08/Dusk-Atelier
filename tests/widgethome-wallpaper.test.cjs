const assert=require('assert'),fs=require('fs'),path=require('path');const {Viewport}=require('../src/widgethome/lib/wallpaper.cjs');
function surface(){return {listeners:new Map(),addEventListener(t,f){this.listeners.set(t,f)},removeEventListener(t){this.listeners.delete(t)}}}
let coarse=true,visible=true;const win=Object.assign(surface(),{innerWidth:390,innerHeight:700,screen:{height:844},scrollY:0,frames:0,requestAnimationFrame(){this.frames++;return this.frames},cancelAnimationFrame(){},matchMedia(){return {matches:coarse}}});
const classes=new Set(),layer={style:{setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}};
const fixed=new Viewport({host:win,window:win,layer,isVisible:()=>visible});assert(classes.has('viewport-backdrop'));assert(!win.listeners.has('scroll'));assert.equal(layer.style['--wallpaper-image-height'],'844px');
for(const height of [844,740,680,350,800]){win.innerHeight=height;win.scrollY+=300;fixed.sync();assert.equal(layer.style['--wallpaper-image-height'],'844px');assert.equal(layer.style.transform,undefined)}
win.innerWidth=844;win.innerHeight=340;win.screen.height=390;fixed.sync();assert.equal(layer.style['--wallpaper-image-height'],'390px');win.innerHeight=390;fixed.sync();assert.equal(layer.style['--wallpaper-image-height'],'390px');
coarse=false;win.innerWidth=1200;win.innerHeight=700;fixed.sync();assert.equal(layer.style['--wallpaper-image-height'],'700px');win.innerHeight=850;fixed.sync();assert.equal(layer.style['--wallpaper-image-height'],'850px');
visible=false;win.innerHeight=400;fixed.sync();assert.equal(layer.style['--wallpaper-image-height'],'850px');visible=true;fixed.sync();assert.equal(layer.style['--wallpaper-image-height'],'400px');
fixed.dispose();assert.equal(win.listeners.size,0);assert(!classes.has('viewport-backdrop'));assert.equal(layer.style['--wallpaper-image-height'],undefined);
const host=Object.assign(surface(),{clientHeight:600,scrollTop:250}),nested=new Viewport({host,window:win,layer});assert.equal(layer.style.height,'600px');assert.equal(layer.style.transform,'translate3d(0, 250px, 0)');nested.dispose();assert.equal(win.listeners.size,0);assert.equal(host.listeners.size,0);
const css=fs.readFileSync(path.join(__dirname,'../src/widgethome/style.js'),'utf8');assert(css.includes('height:var(--wallpaper-image-height,100%)'));
console.log('PASS: mobile height locked across toolbar/keyboard; rotation; desktop resize; visibility; nested scrolling; cleanup');
