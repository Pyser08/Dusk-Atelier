/* Session-only image cache. Never writes photos or chat data to app storage. */
(function(root){
  'use strict';
  class ResourceCache{
    constructor(load,{limit=40,bytes=12*1024*1024,concurrency=2,retryAfter=15000,now=()=>Date.now()}={}){
      this.load=load;this.limit=limit;this.maxBytes=bytes;this.concurrency=concurrency;this.retryAfter=retryAfter;this.now=now;
      this.entries=new Map();this.pending=new Map();this.queue=[];this.bytes=0;this.active=0;this.closed=false;
    }
    get(key){
      if(this.closed)return Promise.resolve('');
      const entry=this.entries.get(key);
      if(entry){
        if(!entry.expires||entry.expires>this.now()){
          this.entries.delete(key);this.entries.set(key,entry);return Promise.resolve(entry.value);
        }
        this.remove(key);
      }
      if(this.pending.has(key))return this.pending.get(key);
      let resolve;const promise=new Promise(done=>{resolve=done;});
      this.pending.set(key,promise);this.queue.push({key,resolve});this.pump();return promise;
    }
    remove(key){const entry=this.entries.get(key);if(entry)this.bytes-=entry.bytes;this.entries.delete(key);}
    remember(key,value){
      // UTF-16 is a conservative bound for retained data-URL text, not decoded pixels.
      const bytes=value.length*2;if(bytes>this.maxBytes)return;
      while(this.entries.size&&(this.entries.size>=this.limit||this.bytes+bytes>this.maxBytes))this.remove(this.entries.keys().next().value);
      this.entries.set(key,{value,bytes,expires:value?0:this.now()+this.retryAfter});this.bytes+=bytes;
    }
    pump(){
      while(!this.closed&&this.active<this.concurrency&&this.queue.length){
        const job=this.queue.shift();this.active++;
        Promise.resolve().then(()=>this.closed?'':this.load(job.key)).then(value=>this.finish(job,typeof value==='string'?value:''),()=>this.finish(job,''));
      }
    }
    finish(job,value){
      this.active--;this.pending.delete(job.key);
      if(!this.closed)this.remember(job.key,value);
      job.resolve(this.closed?'':value);this.pump();
    }
    dispose(){
      this.closed=true;this.entries.clear();this.bytes=0;
      for(const job of this.queue.splice(0))job.resolve('');
      this.pending.clear(); // An in-flight API call may finish, but cannot repopulate the cache.
    }
  }
  const exports={ResourceCache};
  if(typeof module!=='undefined'&&module.exports)module.exports=exports;else root.PocketRisuHomeResources=exports;
})(globalThis);
