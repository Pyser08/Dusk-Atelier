/* Fixed viewport layer with stable mobile image dimensions across browser-bar resizing. */
(function(root){
 'use strict';
 class Viewport{
  constructor(options){
   this.host=options.host;this.layer=options.layer;this.isVisible=options.isVisible||(()=>true);this.win=options.window||root;this.disposed=false;this.frame=null;
   this.raf=this.win.requestAnimationFrame.bind(this.win);this.caf=this.win.cancelAnimationFrame.bind(this.win);
   this.viewport=this.host===this.win;this.onChange=()=>this.request();
   if(this.viewport){this.layer.classList.add('viewport-backdrop');this.win.addEventListener('resize',this.onChange);this.sync();return;}
   this.host.addEventListener('scroll',this.onChange,{passive:true});this.win.addEventListener('resize',this.onChange);
   const Observer=options.ResizeObserver||this.win.ResizeObserver;if(Observer&&this.host!==this.win){this.observer=new Observer(this.onChange);this.observer.observe(this.host);}
   this.sync();
  }
  request(){if(this.disposed||!this.isVisible()||this.frame!==null)return;this.frame=this.raf(()=>{this.frame=null;this.sync();});}
  sync(){
   if(this.disposed||!this.isVisible())return;
   if(this.viewport){
    const width=Number(this.win.innerWidth),height=Number(this.win.innerHeight);
    if(!(width>0&&height>0))return;
    const mobile=Boolean(this.win.matchMedia?.('(pointer: coarse)').matches);
    // Toolbar/keyboard height changes must not resize the object-fit image box.
    // Reserve the full screen height so a collapsed toolbar cannot expose a gap.
    if(this.imageWidth!==width||this.mobile!==mobile||!this.imageHeight||(!mobile&&this.imageHeight!==height)){
     this.imageWidth=width;this.mobile=mobile;this.imageHeight=mobile?Math.max(height,Number(this.win.screen?.height)||height):height;
     this.layer.style.setProperty('--wallpaper-image-height',this.imageHeight+'px');
    }
    return;
   }
   const viewport=this.host===this.win,height=Number(viewport?this.win.innerHeight:this.host.clientHeight),scroll=Math.max(0,Number(viewport?this.win.scrollY:this.host.scrollTop)||0);
   if(height>0){const value=height+'px';if(this.layer.style.height!==value)this.layer.style.height=value;}
   const transform=`translate3d(0, ${scroll}px, 0)`;if(this.layer.style.transform!==transform)this.layer.style.transform=transform;
  }
  dispose(){if(this.disposed)return;this.disposed=true;if(this.viewport){if(this.frame!==null)this.caf(this.frame);this.win.removeEventListener('resize',this.onChange);this.layer.classList.remove('viewport-backdrop');this.layer.style.removeProperty('--wallpaper-image-height');return;}if(this.frame!==null)this.caf(this.frame);this.observer?.disconnect();this.host.removeEventListener('scroll',this.onChange);this.win.removeEventListener('resize',this.onChange);}
 }
 const api={Viewport};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PocketRisuButterWallpaper=api;
})(globalThis);
