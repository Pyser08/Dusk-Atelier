// 출처: risupot 2.3.0 src/render-guard.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

const EDITABLE_SELECTOR='textarea,select,input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]):not([type=range]):not([type=color]),[contenteditable=""],[contenteditable="true"]';
function isEditingIn(doc,scope=null){const active=doc?.activeElement;return Boolean(active&&active!==doc?.body&&(!scope||scope.contains?.(active))&&active.matches?.(EDITABLE_SELECTOR));}
/** request() renders now, or once when focus leaves the edited field. Explicit user-action renders stay immediate elsewhere. */
function createDeferredRender(doc,render,{scope=null}={}){
  let pending=false,disposed=false;
  const later=callback=>(doc?.defaultView?.setTimeout||globalThis.setTimeout)(callback,0);
  const flush=()=>{if(disposed||!pending||isEditingIn(doc,scope))return;pending=false;render();};
  const onFocusOut=()=>{if(pending)later(flush);};
  doc?.addEventListener?.('focusout',onFocusOut);
  return{request(){if(disposed)return;if(isEditingIn(doc,scope)){pending=true;return;}pending=false;render();},pending:()=>pending,dispose(){disposed=true;pending=false;doc?.removeEventListener?.('focusout',onFocusOut);}};
}
