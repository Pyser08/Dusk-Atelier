import { Cancelled, newId, stableJson } from '../engine/util.js';
import { readIncoming } from '../engine/formats/index.js';
import { findCandidates, normalizeName } from '../engine/match.js';
import { collectKnownKeys, planAssets } from '../engine/module.js';
import { buildNewCharacter, characterAssetKeys, characterView, newCharacterBase, planCharacter, uniqueDisplayName } from '../engine/character.js';
import { uploadAssets } from '../engine/upload.js';
import { MOD_SPEC, applyView, charIncomingView, charSpec, modIncomingView, pickView } from '../engine/merge3.js';
import { KIND_KO, applyPlan, changeOf, charFields, fieldsToMod, fingerprintCard, groupOf, itemLabel, keepSet, makePlan, modFields, modFingerprint, remapGreetings, summarizeCharacterUpdate, textOf, wordDiff, writeCharFields } from '../engine/tideplan.js';
import { createStore } from '../engine/store.js';
import { iconMarkup } from './icons.js';
import { persistentWrites, queueTrash, readUi, trashCopy, watchDefaults } from './watch.js';
import { AI_MODES, MergeSelfCheckError, adaptCharacterPrompt, applyPartialUpdatePlan, applyPreparedDetach, applyScopedSelection, conflictTidyPrompt, detectCharacters, encodeCardProvenance, mergeInput, moduleToMergeInput, partField, planSourceUpdate, prepareDetach, prepareScopedSelection, preserveTargetLicense, protectSourceImages, protectedImageIds, runAI, selfCheck, suggestWorld } from '../engine/merge.js';
import { loadProvenance } from '../engine/tidestore.js';
import { Busy, backupSnapshot, isGenerating, restoreFromBackup } from '../engine/safety.js';
import { commit, entriesOf, readDb } from '../data/modules.js';

export async function createLegacy(api, { onExit, zIndex = 100, host, links, hooks = {} } = {}) {
  let queue = [];
  const TITLE2 = "업데이트 가져오기";
  const css = `
    #rbu-overlay, #rbu-overlay *{box-sizing:border-box}
    #rbu-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--rb-backdrop,rgba(8,9,16,.55));
      font:14px/1.55 'IBM Plex Sans KR',system-ui,-apple-system,"Segoe UI","Noto Sans KR",sans-serif;color:var(--rb-text,#e9eaf6)}
    #rbu-overlay.hidden{display:none}
    #rbu-overlay .win{width:100%;max-width:620px;max-height:100%;overflow-y:auto;background:var(--rb-win,#151726);border:1px solid var(--rb-line,#2a2d47);border-radius:18px;
      box-shadow:var(--rb-shadow,0 24px 64px rgba(0,0,0,.45));padding:22px 24px;animation:rbu-in .16s ease-out;scrollbar-width:thin}
    @keyframes rbu-in{from{opacity:0;transform:translateY(8px) scale(.99)}to{opacity:1;transform:none}}
    #rbu-overlay .head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
    #rbu-overlay h1{font-size:17px;font-weight:700;margin:0;display:flex;gap:12px;align-items:center}
    #rbu-overlay h1 svg{width:34px;height:34px;padding:8px;border-radius:10px;background:var(--rb-acc-grad,linear-gradient(135deg,#4f63e0,#7c4fe0));color:var(--rb-on-acc,#fff)}
    #rbu-overlay .x{width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;color:var(--rb-sub,#a4a7c9);cursor:pointer;padding:0;border-radius:12px}
    #rbu-overlay .x:hover{background:var(--rb-hover,#20233a);color:var(--rb-text,#e9eaf6)}
    #rbu-overlay .sub{color:var(--rb-sub,#a4a7c9);margin:0 0 14px;font-size:13px;line-height:1.6}
    #rbu-overlay .card{background:var(--rb-surf,#1c1f33);border:1px solid var(--rb-line2,#22253b);border-radius:14px;padding:16px;margin:12px 0}
    #rbu-overlay .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:16px}
    #rbu-overlay .row>button{flex:1}
    #rbu-overlay button{font:inherit;min-height:42px;border-radius:12px;border:1px solid var(--rb-line3,#343857);background:var(--rb-surf,#1c1f33);color:var(--rb-text,#e9eaf6);padding:9px 16px;cursor:pointer;font-weight:500;transition:background .15s,filter .15s}
    #rbu-overlay button:hover{background:var(--rb-hover,#20233a)}
    #rbu-overlay button:focus-visible,#rbu-overlay .opt:focus-within{outline:2px solid var(--rb-focus,rgba(142,162,255,.55));outline-offset:2px}
    #rbu-overlay button.primary{background:var(--rb-acc-grad,linear-gradient(135deg,#4f63e0,#7c4fe0));border:0;color:var(--rb-on-acc,#fff);font-weight:600}
    #rbu-overlay button.primary:hover{filter:brightness(1.08)}
    #rbu-overlay button.danger{border:0;background:var(--rb-danger-soft,rgba(242,122,147,.13));color:var(--rb-danger,#f27a93);font-weight:600}
    #rbu-overlay button[disabled]{opacity:.5;cursor:not-allowed}
    #rbu-overlay .drop{border:1.5px dashed var(--rb-sel-ring,rgba(142,162,255,.45));border-radius:16px;padding:30px 16px;text-align:center;color:var(--rb-sub,#a4a7c9);font-size:13px;line-height:1.8;background:var(--rb-sel-bg,rgba(79,99,224,.06));transition:background .15s}
    #rbu-overlay .drop.over{border-color:var(--rb-acc-text,#8ea2ff);background:var(--rb-acc-soft,rgba(79,99,224,.16));color:var(--rb-text,#e9eaf6)}
    #rbu-overlay input[type=file]{font:inherit;color:var(--rb-sub,#a4a7c9);max-width:100%;margin-top:12px}
    #rbu-overlay input[type=file]::file-selector-button{font:inherit;font-weight:600;border-radius:12px;border:0;background:var(--rb-acc-grad,linear-gradient(135deg,#4f63e0,#7c4fe0));color:var(--rb-on-acc,#fff);padding:10px 16px;margin-right:12px;cursor:pointer}
    #rbu-overlay input[type=password],#rbu-overlay input[type=text]{width:100%;margin-top:10px;font:inherit;height:44px;padding:0 14px;border-radius:12px;border:1px solid var(--rb-line,#2a2d47);background:var(--rb-surf,#1c1f33);color:var(--rb-text,#e9eaf6);outline:none}
    #rbu-overlay .opt{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border:1px solid var(--rb-line,#2a2d47);border-radius:12px;margin:6px 0;cursor:pointer;background:var(--rb-win,#151726);transition:border-color .15s,background .15s}
    #rbu-overlay .opt:hover{border-color:var(--rb-line3,#343857);background:var(--rb-hover,#20233a)}
    #rbu-overlay .opt:has(input:checked){border-color:var(--rb-sel-ring,rgba(142,162,255,.45));background:var(--rb-sel-bg,rgba(79,99,224,.12))}
    #rbu-overlay .opt input{margin-top:3px;width:18px;height:18px;accent-color:var(--rb-acc-a,#4f63e0)}
    #rbu-overlay .kind{display:inline-block;font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;margin-right:8px;background:var(--rb-acc-soft,rgba(79,99,224,.16));color:var(--rb-acc-text,#8ea2ff);vertical-align:1px}
    #rbu-overlay .kind.mod{background:var(--rb-acc2-soft,rgba(124,79,224,.16));color:var(--rb-acc2-text,#c4b1ff)}
    #rbu-overlay .badge{display:inline-block;font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;margin-left:8px;vertical-align:1px}
    #rbu-overlay .high{background:var(--rb-teal-soft,rgba(111,220,192,.12));color:var(--rb-teal,#6fdcc0)}
    #rbu-overlay .medium{background:var(--rb-warn-soft,rgba(245,194,107,.13));color:var(--rb-warn,#f5c26b)}
    #rbu-overlay .low{background:var(--rb-rose-soft,rgba(245,142,163,.13));color:var(--rb-rose,#f58ea3)}
    #rbu-overlay .muted{color:var(--rb-mute,#8487ab);font-size:12.5px}
    #rbu-overlay .grid{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:13.5px}
    #rbu-overlay .grid>b{font-weight:500;color:var(--rb-sub,#a4a7c9)}
    #rbu-overlay .grid b b,#rbu-overlay .grid span b{color:var(--rb-text,#e9eaf6);font-weight:600}
    #rbu-overlay .bar{height:8px;background:var(--rb-track-off,#2e3150);border-radius:999px;overflow:hidden;margin:12px 0 8px}
    #rbu-overlay .bar>i{display:block;height:100%;width:0;border-radius:999px;background:var(--rb-deco-grad,linear-gradient(90deg,#6f8bff,#a78bfa));transition:width .2s}
    #rbu-overlay .warn{background:var(--rb-warn-soft,rgba(245,194,107,.13));box-shadow:inset 0 0 0 1px var(--rb-warn,#f5c26b);color:var(--rb-text,#e9eaf6);border-radius:12px;padding:12px 14px;margin:10px 0;font-size:13px}
    #rbu-overlay .err{background:var(--rb-danger-soft,rgba(242,122,147,.13));box-shadow:inset 0 0 0 1px var(--rb-danger,#f27a93);color:var(--rb-text,#e9eaf6);border-radius:12px;padding:12px 14px;margin:10px 0;white-space:pre-wrap}
    #rbu-overlay .ok{background:var(--rb-ok-soft,rgba(95,211,181,.13));box-shadow:inset 0 0 0 1px var(--rb-ok,#5fd3b5);color:var(--rb-text,#e9eaf6);border-radius:12px;padding:14px;margin:10px 0}
    #rbu-overlay .hl{color:var(--rb-warn,#f5c26b)}
    #rbu-overlay label.chk{display:flex;gap:10px;align-items:flex-start;margin-top:12px;font-size:13.5px;cursor:pointer}
    #rbu-overlay label.chk input{width:18px;height:18px;margin-top:2px;accent-color:var(--rb-acc-a,#4f63e0)}
    #rbu-overlay select{font:inherit;background:var(--rb-surf,#1c1f33);color:var(--rb-text,#e9eaf6);border:1px solid var(--rb-line,#2a2d47);border-radius:12px;height:42px;padding:0 10px;width:100%;margin-top:8px}
    #rbu-overlay details summary{cursor:pointer;color:var(--rb-sub,#a4a7c9)}
    #rbu-overlay details[open] summary{margin-bottom:6px}
    #rbu-overlay .win{transition:max-width .28s cubic-bezier(.2,.8,.2,1)}
    #rbu-overlay .win.wide{max-width:min(1180px,96vw);animation:rbu-wide .28s cubic-bezier(.2,.8,.2,1)}
    @keyframes rbu-wide{from{max-width:620px}to{max-width:min(1180px,96vw)}}
    #rbu-overlay .rv-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px;margin:12px 0 4px}
    #rbu-overlay .st{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:12px;background:var(--rb-win,#151726);border:1px solid var(--rb-line2,#22253b);--c:var(--rb-acc-text,#8ea2ff)}
    #rbu-overlay .st .si{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:var(--c);background:color-mix(in srgb,var(--c) 16%,transparent);margin-bottom:4px}
    #rbu-overlay .st b{font-size:20px;font-weight:700;line-height:1.1}
    #rbu-overlay .st>span:last-child{font-size:12px;color:var(--rb-sub,#a4a7c9)}
    #rbu-overlay .st.zero{opacity:.45}
    #rbu-overlay .st.add{--c:var(--rb-ok,#5fd3b5)}#rbu-overlay .st.del{--c:var(--rb-danger,#f27a93)}#rbu-overlay .st.mine{--c:var(--rb-acc2-text,#c4b1ff)}#rbu-overlay .st.cf{--c:var(--rb-warn,#f5c26b)}
    #rbu-overlay .st.cf:not(.zero){border-color:color-mix(in srgb,var(--rb-warn,#f5c26b) 55%,transparent);background:color-mix(in srgb,var(--rb-warn,#f5c26b) 8%,var(--rb-win,#151726))}
    #rbu-overlay .rv-rows{display:flex;flex-direction:column;gap:2px;margin-top:8px}
    #rbu-overlay .rr{display:flex;align-items:center;gap:10px;padding:6px 4px;border-bottom:1px dashed var(--rb-line2,#22253b);font-size:13px}
    #rbu-overlay .rr:last-child{border-bottom:0}
    #rbu-overlay .ri{width:26px;height:26px;flex-shrink:0;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--rb-win,#151726);color:var(--rb-sub,#a4a7c9)}
    #rbu-overlay .ri.big{width:36px;height:36px;border-radius:11px;color:var(--rb-acc-text,#8ea2ff);background:var(--rb-acc-soft,rgba(79,99,224,.16))}
    #rbu-overlay .rl{width:64px;flex-shrink:0;color:var(--rb-sub,#a4a7c9)}
    #rbu-overlay .rv{display:flex;flex-wrap:wrap;gap:5px;align-items:center;min-width:0}
    #rbu-overlay i.pl,#rbu-overlay i.nm{font-style:normal;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;display:inline-flex;align-items:center;gap:4px}
    #rbu-overlay i.nm{font-weight:500;background:var(--rb-win,#151726);border:1px solid var(--rb-line2,#22253b)}
    #rbu-overlay i.pl.add{background:var(--rb-ok-soft,rgba(95,211,181,.13));color:var(--rb-ok,#5fd3b5)}
    #rbu-overlay i.pl.del{background:var(--rb-danger-soft,rgba(242,122,147,.13));color:var(--rb-danger,#f27a93)}
    #rbu-overlay i.pl.chg{background:var(--rb-acc-soft,rgba(79,99,224,.16));color:var(--rb-acc-text,#8ea2ff)}
    #rbu-overlay i.pl.ok{background:var(--rb-ok-soft,rgba(95,211,181,.13));color:var(--rb-ok,#5fd3b5)}
    #rbu-overlay .rv-open{width:100%;display:flex;align-items:center;gap:14px;text-align:left;margin-top:12px;padding:12px 14px;min-height:60px;border-radius:14px;border:1px solid var(--rb-sel-ring,rgba(142,162,255,.45));background:linear-gradient(135deg,color-mix(in srgb,var(--rb-acc-a,#4f63e0) 18%,transparent),color-mix(in srgb,var(--rb-acc-b,#7c4fe0) 12%,transparent));transition:transform .15s,filter .15s}
    #rbu-overlay .rv-open:hover{filter:brightness(1.12);background:linear-gradient(135deg,color-mix(in srgb,var(--rb-acc-a,#4f63e0) 26%,transparent),color-mix(in srgb,var(--rb-acc-b,#7c4fe0) 18%,transparent))}
    #rbu-overlay .rv-open:active{transform:scale(.99)}
    #rbu-overlay .rv-open .oi{width:38px;height:38px;flex-shrink:0;border-radius:11px;display:flex;align-items:center;justify-content:center;background:var(--rb-acc-grad,linear-gradient(135deg,#4f63e0,#7c4fe0));color:var(--rb-on-acc,#fff)}
    #rbu-overlay .rv-open .ot{flex:1;display:flex;flex-direction:column;gap:2px}
    #rbu-overlay .rv-open .ot span{font-size:12.5px;color:var(--rb-sub,#a4a7c9)}
    #rbu-overlay .rv-open .oc{color:var(--rb-acc-text,#8ea2ff);display:flex}
    #rbu-overlay .rv-split{display:grid;grid-template-columns:minmax(300px,380px) 1fr;gap:12px;margin-top:12px;height:min(62vh,640px);animation:rbu-in .2s ease-out}
    #rbu-overlay .rv-left{display:flex;flex-direction:column;min-height:0;border:1px solid var(--rb-line2,#22253b);border-radius:14px;background:var(--rb-win,#151726);overflow:hidden}
    #rbu-overlay .rv-tools{padding:10px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid var(--rb-line2,#22253b)}
    #rbu-overlay .rv-search{display:flex;align-items:center;gap:8px;height:38px;padding:0 12px;border-radius:10px;border:1px solid var(--rb-line,#2a2d47);background:var(--rb-surf,#1c1f33);color:var(--rb-sub,#a4a7c9)}
    #rbu-overlay .rv-search input{all:unset;flex:1;min-width:0;color:var(--rb-text,#e9eaf6);font-size:13px}
    #rbu-overlay .rv-chips,#rbu-overlay .rv-bulk{display:flex;gap:5px;flex-wrap:wrap}
    #rbu-overlay .rv-chip{min-height:28px;padding:2px 10px;border-radius:999px;font-size:12px}
    #rbu-overlay .rv-chip b{font-weight:700;margin-left:2px}
    #rbu-overlay .rv-chip.on{background:var(--rb-acc-soft,rgba(79,99,224,.16));border-color:var(--rb-sel-ring,rgba(142,162,255,.45));color:var(--rb-acc-text,#8ea2ff)}
    #rbu-overlay .rv-chip.conflict.on{background:var(--rb-warn-soft,rgba(245,194,107,.13));border-color:var(--rb-warn,#f5c26b);color:var(--rb-warn,#f5c26b)}
    #rbu-overlay .rv-bulk button{min-height:28px;padding:2px 10px;font-size:12px;display:inline-flex;gap:5px;align-items:center}
    #rbu-overlay #rv-list{flex:1;overflow-y:auto;padding:6px;scrollbar-width:thin}
    #rbu-overlay .rv-row{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;cursor:pointer;border:1px solid transparent;transition:background .12s}
    #rbu-overlay .rv-row:hover{background:var(--rb-hover,#20233a)}
    #rbu-overlay .rv-row.sel{background:var(--rb-sel-bg,rgba(79,99,224,.12));border-color:var(--rb-sel-ring,rgba(142,162,255,.45))}
    #rbu-overlay .rv-row.conflict .ri{color:var(--rb-warn,#f5c26b);background:var(--rb-warn-soft,rgba(245,194,107,.13))}
    #rbu-overlay .rv-row .rt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
    #rbu-overlay .rv-row .rt b{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #rbu-overlay .rv-row .rt>span{font-size:11.5px;color:var(--rb-mute,#8487ab);display:flex;gap:6px;align-items:center}
    #rbu-overlay .tg{display:inline-block;font-size:11px;font-weight:600;padding:1px 8px;border-radius:999px;background:var(--rb-surf2,#262a44);color:var(--rb-sub,#a4a7c9)}
    #rbu-overlay .tg.update{background:var(--rb-acc-soft,rgba(79,99,224,.16));color:var(--rb-acc-text,#8ea2ff)}
    #rbu-overlay .tg.mine{background:var(--rb-acc2-soft,rgba(124,79,224,.16));color:var(--rb-acc2-text,#c4b1ff)}
    #rbu-overlay .tg.conflict{background:var(--rb-warn-soft,rgba(245,194,107,.13));color:var(--rb-warn,#f5c26b)}
    #rbu-overlay .tg.extra{background:var(--rb-danger-soft,rgba(242,122,147,.13));color:var(--rb-danger,#f27a93)}
    #rbu-overlay .rv-mini{display:flex;border-radius:9px;overflow:hidden;border:1px solid var(--rb-line,#2a2d47);flex-shrink:0}
    #rbu-overlay .rv-mini button{min-height:28px;width:32px;padding:0;border:0;border-radius:0;display:flex;align-items:center;justify-content:center;background:transparent;color:var(--rb-mute,#8487ab)}
    #rbu-overlay .rv-mini button.on[data-v=inc]{background:var(--rb-acc-soft,rgba(79,99,224,.2));color:var(--rb-acc-text,#8ea2ff)}
    #rbu-overlay .rv-mini button.on[data-v=cur]{background:var(--rb-acc2-soft,rgba(124,79,224,.2));color:var(--rb-acc2-text,#c4b1ff)}
    #rbu-overlay .rv-right{min-height:0;overflow-y:auto;border:1px solid var(--rb-line2,#22253b);border-radius:14px;background:var(--rb-win,#151726);padding:16px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin}
    #rbu-overlay .rv-empty{margin:auto;display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--rb-mute,#8487ab);text-align:center;font-size:13px}
    #rbu-overlay .rv-dh{display:flex;gap:12px;align-items:center}
    #rbu-overlay .rv-dh b{font-size:15px}
    #rbu-overlay .rv-tags{display:flex;gap:6px;margin-top:4px}
    #rbu-overlay .rv-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;border-radius:12px;background:var(--rb-surf,#1c1f33)}
    #rbu-overlay .rv-seg button{min-height:38px;border:0;background:transparent;display:flex;align-items:center;justify-content:center;gap:6px;color:var(--rb-sub,#a4a7c9);border-radius:9px}
    #rbu-overlay .rv-seg button.on[data-pick=inc]{background:var(--rb-acc-grad,linear-gradient(135deg,#4f63e0,#7c4fe0));color:var(--rb-on-acc,#fff);font-weight:600}
    #rbu-overlay .rv-seg button.on[data-pick=cur]{background:var(--rb-acc2-soft,rgba(124,79,224,.3));color:var(--rb-text,#e9eaf6);font-weight:600;box-shadow:inset 0 0 0 1px var(--rb-acc2-text,#c4b1ff)}
    #rbu-overlay .rv-cap{font-size:12px;font-weight:600;color:var(--rb-sub,#a4a7c9);display:flex;gap:8px;align-items:center}
    #rbu-overlay .rv-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    #rbu-overlay .rv-col{display:flex;flex-direction:column;gap:6px;min-width:0;padding:10px;border-radius:12px;border:1px solid var(--rb-line2,#22253b);opacity:.7}
    #rbu-overlay .rv-col{cursor:pointer;transition:opacity .15s,border-color .15s,background .15s}
    #rbu-overlay .rv-col:hover{opacity:.95;border-color:var(--rb-line3,#343857)}
    #rbu-overlay .rv-col.pick:hover{border-color:var(--rb-sel-ring,rgba(142,162,255,.45))}
    #rbu-overlay .rv-col.pick{opacity:1;border-color:var(--rb-sel-ring,rgba(142,162,255,.45));background:var(--rb-sel-bg,rgba(79,99,224,.06))}
    #rbu-overlay .rv-text,#rbu-overlay .rv-diffbox{font-size:12.5px;line-height:1.7;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow:auto;scrollbar-width:thin}
    #rbu-overlay .rv-diffbox{padding:10px 12px;border-radius:12px;background:var(--rb-surf,#1c1f33)}
    #rbu-overlay .rv-diffbox ins{text-decoration:none;background:var(--rb-ok-soft,rgba(95,211,181,.18));color:var(--rb-ok,#5fd3b5);border-radius:3px}
    #rbu-overlay .rv-diffbox del,#rbu-overlay .rv-cap del{background:var(--rb-danger-soft,rgba(242,122,147,.15));color:var(--rb-danger,#f27a93);border-radius:3px}
    #rbu-overlay .rv-cap ins{text-decoration:none;background:var(--rb-ok-soft,rgba(95,211,181,.18));color:var(--rb-ok,#5fd3b5);border-radius:3px}
    #rbu-overlay .rv-inline{margin:4px 2px 10px;padding:12px;border-radius:12px;background:var(--rb-surf,#1c1f33);display:flex;flex-direction:column;gap:10px}
    #rbu-overlay .mg-scope,#rbu-overlay .mg-chars,#rbu-overlay .mg-world{display:flex;flex-direction:column;gap:6px}
    #rbu-overlay .mg-scope .opt,#rbu-overlay .mg-chars .opt{align-items:center}
    #rbu-overlay .mg-world{max-height:260px;overflow:auto;margin-top:6px}
    #rbu-overlay .mg-list{display:flex;flex-direction:column;gap:6px;max-height:min(56vh,560px);overflow:auto;padding-right:4px;scrollbar-width:thin}
    #rbu-overlay .mg-part{border:1px solid var(--rb-line2,#22253b);border-radius:12px;padding:8px 10px;background:var(--rb-win,#151726);transition:opacity .15s}
    #rbu-overlay .mg-part.off{opacity:.5}
    #rbu-overlay .mg-ph{display:flex;align-items:center;gap:10px;cursor:pointer}
    #rbu-overlay .mg-ph input,#rbu-overlay .mg-part>input{width:18px;height:18px;accent-color:var(--rb-acc-a,#4f63e0)}
    #rbu-overlay .mg-part .rt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
    #rbu-overlay .mg-part .rt b{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #rbu-overlay .mg-part .rt>span{font-size:11.5px;color:var(--rb-mute,#8487ab)}
    #rbu-overlay .mg-act{display:flex;gap:6px;margin:6px 0 0 54px}
    #rbu-overlay .mg-act button{min-height:28px;padding:2px 10px;font-size:12px;display:inline-flex;gap:5px;align-items:center}
    #rbu-overlay .mg-body{margin:8px 0 2px}
    #rbu-overlay .mg-ta{width:100%;min-height:140px;font:inherit;font-size:13px;line-height:1.6;padding:10px 12px;border-radius:10px;border:1px solid var(--rb-line,#2a2d47);background:var(--rb-surf,#1c1f33);color:var(--rb-text,#e9eaf6);resize:vertical}
    #rbu-overlay .rb-spin-s{width:16px;height:16px;border-radius:50%;border:2px solid var(--rb-line3,#343857);border-top-color:var(--rb-acc-text,#8ea2ff);animation:rb-rot .8s linear infinite;flex-shrink:0}
    @keyframes rb-rot{to{transform:rotate(360deg)}}
    @media (max-width:760px){
      #rbu-overlay .rv-split{grid-template-columns:1fr;height:auto}
      #rbu-overlay .rv-left{overflow:visible}
      #rbu-overlay #rv-list{overflow:visible}
      #rbu-overlay .rv-cols{grid-template-columns:1fr}
      #rbu-overlay .win.wide{max-width:none}
    }
    @media (max-width:760px){#rbu-overlay{padding:0;align-items:stretch}#rbu-overlay .win{max-width:none;border-radius:0;border:0;padding:18px 16px}}
    `;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);
  const overlay = document.createElement("div");
  overlay.id = "rbu-overlay";
  overlay.className = "hidden";
  overlay.style.zIndex = String(zIndex);
  document.body.appendChild(overlay);
  const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>`;
  const X = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
  let busy = false, stopRequested = false, root = null;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmtBytes2 = (n) => n >= 1e9 ? (n / 1e9).toFixed(2) + " GB" : n >= 1e6 ? (n / 1e6).toFixed(1) + " MB" : n >= 1e3 ? (n / 1e3).toFixed(0) + " KB" : n + " B";
  const fmtTime = (ms) => {
    const s = Math.round(ms / 1e3);
    return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`;
  };
  const kindTag = (k) => k === "character" ? '<span class="kind">캐릭터</span>' : '<span class="kind mod">모듈</span>';
  let heading = TITLE2;
  function frame(body) {
    overlay.innerHTML = `<div class="win" role="dialog" aria-modal="true">
            <div class="head"><h1>${heading === TITLE2 ? ICON : iconMarkup("link", 20)}${heading}</h1><button class="x" id="x" title="${busy ? "취소" : "닫기"}">${X}</button></div>
            ${heading === TITLE2 ? `<p class="sub">캐릭터·모듈을 가져옵니다. 이미 있는 항목의 새 버전이면 바뀐 것만 올려 덮어쓰고, 채팅과 모듈 연결은 그대로 둡니다.</p>` : ""}
            ${body}</div>`;
    root = overlay.querySelector(".win");
    overlay.querySelector("#x").addEventListener("click", onClose);
    root.querySelector("#close")?.addEventListener("click", onClose);
  }
  async function onClose() {
    if (busy) {
      stopRequested = true;
      const d = root?.querySelector("#detail");
      if (d) d.textContent = "취소하는 중… (진행 중인 저장이 끝나면 멈춥니다)";
      return;
    }
    overlay.className = "hidden";
    if (onExit) onExit();
    else await api.hideContainer();
  }
  const closeBtn = (label = "닫기") => `<button id="close">${label}</button>`;
  function renderStart(errorText) {
    heading = TITLE2;
    busy = false;
    stopRequested = false;
    frame(`<div class="card"><div class="drop" id="drop"><b>파일을 여기로 끌어 놓거나 아래에서 고르세요</b> (여러 개도 돼요)<br>
              <span class="muted">캐릭터: .charx · .png · .jpg · 카드 .json &nbsp;|&nbsp; 모듈: .risum · .module.charx · 모듈 .json</span>
              <br><button class="primary" id="pick" style="margin-top:14px;min-width:160px">파일 고르기</button><input type="file" id="file" multiple accept=".charx,.png,.jpg,.jpeg,.risum,.json" style="display:none"></div>
            ${errorText ? `<div class="err">${esc(errorText)}</div>` : ""}
            ${queue.length ? `<div class="muted" style="margin-top:8px">대기 중인 파일 ${queue.length}개</div>` : ""}</div>
          <div class="row"><button id="backups">백업·되돌리기</button>${queue.length ? '<button class="primary" id="nextq">다음 파일</button>' : ""}${closeBtn()}</div>`);
    root.querySelector("#backups").addEventListener("click", () => renderBackups());
    root.querySelector("#nextq")?.addEventListener("click", () => runQueue());
    const go = (files) => {
      const list = [...files ?? []];
      if (!list.length) return;
      queue = [...list, ...queue];
      runQueue();
    };
    root.querySelector("#file").addEventListener("change", (e) => go(e.target.files));
    root.querySelector("#pick").addEventListener("click", () => root.querySelector("#file").click());
    const drop = root.querySelector("#drop");
    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("over");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("over");
      go(e.dataTransfer?.files);
    });
  }
  function renderProgress(title, pct, detail3) {
    frame(`<div class="card"><div>${esc(title)}</div>
            <div class="bar"><i style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%"></i></div>
            <div class="muted" id="detail">${esc(detail3 ?? "")}</div></div>
          <div class="row"><button id="close" class="danger">취소</button></div>`);
  }
  function updateProgress(pct, detail3) {
    const bar = root?.querySelector(".bar>i");
    if (!bar) return;
    bar.style.width = `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`;
    if (!stopRequested) root.querySelector("#detail").textContent = detail3 ?? "";
  }
  function askPassword() {
    return new Promise((resolve) => {
      const wasBusy = busy;
      busy = false;
      frame(`<div class="card"><div>비밀번호가 걸린 카드입니다.</div>
                <input type="password" id="pw" ></div>
              <div class="row"><button class="primary" id="ok">확인</button>${closeBtn("취소")}</div>`);
      const done = (v) => {
        busy = wasBusy;
        resolve(v);
      };
      root.querySelector("#ok").addEventListener("click", () => done(root.querySelector("#pw").value));
      root.querySelector("#pw").addEventListener("keydown", (e) => {
        if (e.key === "Enter") done(root.querySelector("#pw").value);
      });
      root.querySelector("#close").addEventListener("click", () => done(""), { capture: true });
      root.querySelector("#pw").focus();
    });
  }
  async function loadDb(withCharacters) {
    const db = await readDb(api, withCharacters ? ["modules", "pluginCustomStorage", "characters"] : ["modules", "pluginCustomStorage"]);
    return { modules: entriesOf(db).map((e) => e.module), characters: Array.isArray(db.characters) ? db.characters : [] };
  }
  async function startScan(file) {
    busy = true;
    stopRequested = false;
    renderProgress(`파일 확인 중: ${file.name}`, 0, fmtBytes2(file.size));
    let lastUi = 0;
    const incoming = await readIncoming(file.name, file, (pos, total, count) => {
      const now = Date.now();
      if (now - lastUi < 120) return;
      lastUi = now;
      updateProgress(pos / total * 100, `${fmtBytes2(pos)} / ${fmtBytes2(total)} · 에셋 ${count}개 확인`);
    }, () => stopRequested, { askPassword: async () => {
      const pw = await askPassword();
      renderProgress(`파일 확인 중: ${file.name}`, 100, "카드 푸는 중…");
      return pw;
    } });
    const db = await loadDb(!!incoming.character);
    busy = false;
    renderChoose(file, incoming, db);
  }
  function candidatesFor(incoming, db) {
    const hashes = new Set(incoming.assets.map((a) => a.hash).filter(Boolean));
    const list = incoming.module ? findCandidates(db.modules, incoming.module, hashes).map((c) => ({ ...c, kind: "module", label: c.module.name })) : [];
    if (incoming.character) {
      const ch = incoming.character;
      const chHashes = new Set([...ch.refs.emotions, ...ch.refs.additional, ...ch.refs.cc, ...ch.refs.icon ? [ch.refs.icon] : []].map((r) => r.hash));
      const views = db.characters.map((c) => c && c.type !== "group" && !c.trashTime ? characterView(c) : null);
      const inView = { name: ch.fields.name, namespace: ch.risuFields.moduleNamespace || void 0 };
      for (const c of findCandidates(views, inView, chHashes)) list.push({ ...c, kind: "character", label: db.characters[c.index].name, module: void 0 });
    }
    const prefer = !incoming.character || /\.module\.charx$/i.test(incoming.fileName ?? "") ? "module" : "character";
    const remembered = links?.get(linkKey(incoming));
    if (remembered) {
      let c = list.find((x) => (x.kind === "module" ? x.module?.id : db.characters[x.index]?.chaId) === remembered);
      if (!c) {
        const mi = incoming.module ? db.modules.findIndex((m) => m?.id === remembered) : -1;
        const ci = incoming.character ? db.characters.findIndex((ch) => ch?.chaId === remembered) : -1;
        if (mi >= 0) {
          c = { index: mi, module: db.modules[mi], score: 0, reasons: [], kind: "module", label: db.modules[mi].name };
          list.push(c);
        } else if (ci >= 0) {
          c = { index: ci, score: 0, reasons: [], kind: "character", label: db.characters[ci].name };
          list.push(c);
        }
      }
      if (c) {
        c.score += 1e3;
        c.confidence = "high";
        c.reasons = ["지난번에 이 파일로 업데이트함", ...c.reasons];
      }
    }
    return list.sort((a, b) => b.score - a.score || (b.kind === prefer) - (a.kind === prefer));
  }
  function linkKey(incoming) {
    return incoming.character && !(incoming.module && /\.module\.charx$/i.test(incoming.fileName ?? "")) ? `c:${normalizeName(incoming.character.fields.name)}` : `m:${normalizeName(incoming.module?.name)}`;
  }
  function renderChoose(file, incoming, db) {
    incoming.fileName = file.name;
    const cands = candidatesFor(incoming, db);
    const top = cands.slice(0, 6);
    const sizeOf = (c) => c.kind === "character" ? `에셋 ${characterAssetKeys(db.characters[c.index]).length}개 · 로어북 ${(db.characters[c.index].globalLore ?? []).length}개` : `에셋 ${(c.module.assets ?? []).length}개 · 로어북 ${(c.module.lorebook ?? []).length}개`;
    const opts = top.map((c, i) => `
          <label class="opt"><input type="radio" name="t" value="${i}" ${i === 0 ? "checked" : ""}>
            <div><div>${kindTag(c.kind)}<b>${esc(c.label)}</b> 업데이트<span class="badge ${c.confidence}">${{ high: "높음", medium: "보통", low: "낮음" }[c.confidence]}</span></div>
            <div class="muted">${esc(c.reasons.join(" · "))} · ${sizeOf(c)}</div></div></label>`).join("");
    const ch = incoming.character, hasMod = !!incoming.module;
    const manual = [
      ...ch ? db.characters.map((c, i) => c && c.type !== "group" && !c.trashTime ? `<option value="character:${i}">[캐릭터] ${esc(c.name)}</option>` : "") : [],
      ...hasMod ? db.modules.map((m, i) => `<option value="module:${i}">[모듈] ${esc(m.name)}</option>`) : []
    ].join("");
    const newOpts = [
      ch ? { v: "newchar", html: `${kindTag("character")}새 캐릭터로 추가`, sub: "기존 캐릭터는 건드리지 않습니다" } : null,
      hasMod ? { v: "newmod", html: `${kindTag("module")}새 모듈로 추가`, sub: "기존 모듈은 건드리지 않습니다" } : null
    ].filter(Boolean);
    if (!ch || /\.module\.charx$/i.test(file.name)) newOpts.reverse();
    frame(`<div class="card"><div class="grid"><b>파일</b><span>${esc(file.name)} (${fmtBytes2(file.size)})</span>
              <b>이름</b><span>${esc(ch ? ch.fields.name : incoming.module.name)}</span>
              <b>에셋</b><span>${ch ? ch.refs.emotions.length + ch.refs.additional.length + ch.refs.cc.length : incoming.assets.length}개</span></div></div>
          <div class="card"><div style="margin-bottom:6px">${top.length ? "어느 항목을 업데이트할까요?" : "비슷한 기존 항목이 없습니다. 새로 추가합니다."}</div>
            ${opts}
            ${newOpts.map((o, i) => `<label class="opt"><input type="radio" name="t" value="${o.v}" ${!top.length && i === 0 ? "checked" : ""}>
              <div><div>${o.html}</div><div class="muted">${o.sub}</div></div></label>`).join("")}
            <details style="margin-top:8px"><summary class="muted" style="cursor:pointer">목록에서 직접 고르기</summary>
              <select id="manual"><option value="">— 고르지 않음 —</option>${manual}</select></details></div>
          <div class="row"><button class="primary" id="next">다음</button>${closeBtn("취소")}</div>`);
    root.querySelector("#next").addEventListener("click", () => {
      const m = root.querySelector("#manual")?.value;
      let pick = null;
      if (m) {
        const [kind, i] = m.split(":");
        pick = { kind, index: Number(i) };
      } else {
        const v = root.querySelector("input[name=t]:checked")?.value;
        if (v === "newchar") return renderNewCharPlan(file, incoming, db);
        if (v === "newmod") pick = null;
        else if (v !== void 0) pick = { kind: top[Number(v)].kind, index: top[Number(v)].index };
      }
      if (pick?.kind === "character") renderCharPlan(file, incoming, db, pick.index, true);
      else renderModPlan(file, incoming, db, pick ? pick.index : null, true);
    });
  }
  function knownKeysOf(db) {
    const keys = collectKnownKeys(db.modules);
    for (const c of db.characters) for (const k of characterAssetKeys(c)) keys.add(k);
    return keys;
  }
  function planFooter(goLabel) {
    return `<div class="row"><button class="primary" id="go">${goLabel}</button><button id="back">뒤로</button>${closeBtn("취소")}</div>`;
  }
  function bindPlan(file, incoming, db, rerender, run) {
    root.querySelector("#keep")?.addEventListener("change", (e) => rerender(e.target.checked));
    root.querySelector("#back").addEventListener("click", () => renderChoose(file, incoming, db));
    root.querySelector("#go").addEventListener("click", () => run().catch((err) => {
      busy = false;
      if (err instanceof Cancelled) return renderResult(null, "취소했습니다. 기존 항목은 바뀌지 않았습니다.");
      if (err instanceof Busy) return renderResult(null, null, err.message);
      renderResult(null, null, err?.message ?? String(err));
    }));
  }
  const store = createStore(api);
  const fmtDate = (t) => {
    const d = new Date(t);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  // ---- 검토 화면: 위에 아이콘 요약, "자세히 보기"를 누르면 창이 넓어지며 왼쪽 목록 · 오른쪽 비교 (판단 로직은 RisuTide) ----
  const GROUP_KO = { conflict: "충돌", mine: "내 수정", update: "새 버전", extra: "새 버전에 없음" };
  const CHANGE_KO = { added: "추가", removed: "삭제", changed: "변경" };
  const MOD_FIELD = { desc: "description", globalLore: "lorebook", customscript: "regex", triggerscript: "trigger", backgroundHTML: "backgroundEmbedding", additionalAssets: "assets" };
  const UNIT_ICON = { field: "text", lore: "book", regex: "code", trigger: "zap", asset: "image", emotion: "image" };
  const ic = (n, s = 16) => iconMarkup(n, s);
  function reviewState(choices) {
    choices.ui ??= { q: "", f: "all", open: false, sel: null };
    return choices.ui;
  }
  // 고른 상태에서의 개수
  function countPlan(plan, keep) {
    const s = { update: 0, added: 0, removed: 0, mine: 0, conflict: 0, extra: 0, keptMine: 0 };
    for (const it of plan.items) {
      const g = groupOf(it), takeNew = !keep.has(it.id);
      if (g === "conflict") s.conflict++;
      if (g === "mine") s.mine++;
      if (g === "extra") s.extra++;
      if (!takeNew) {
        s.keptMine++;
        continue;
      }
      const c = changeOf(it);
      if (g === "extra" || c === "removed") s.removed++;
      else if (c === "added") s.added++;
      else s.update++;
    }
    return s;
  }
  const pills = (d) => {
    const out = [d.added && `<i class="pl add">+${d.added}</i>`, d.removed && `<i class="pl del">−${d.removed}</i>`, d.changed && `<i class="pl chg">~${d.changed}</i>`].filter(Boolean).join("");
    return out || `<span class="muted">그대로</span>`;
  };
  const names = (list, label, max = 6) => `${list.slice(0, max).map((k) => `<i class="nm">${esc(label(k))}</i>`).join("")}${list.length > max ? `<span class="muted">외 ${list.length - max}개</span>` : ""}`;
  function summaryHtml(plan, keep, sum0, fieldLabel, compact) {
    const s = countPlan(plan, keep);
    // "바뀌는 글/설정"은 실제로 적용되는 항목만 (빈 값 ↔ 없음 같은 차이는 빼고)
    const applied = new Set(plan.items.filter((it) => it.unit === "field" && !keep.has(it.id)).map((it) => it.label));
    const sum = sum0 && { ...sum0, texts: sum0.texts.filter((k) => applied.has(k)), others: sum0.others.filter((k) => applied.has(k)) };
    const tile = (cls, icn, n, label, on = n > 0) => `<div class="st ${cls}${on ? "" : " zero"}"><span class="si">${ic(icn, 18)}</span><b>${n}</b><span>${label}</span></div>`;
    const tiles = `<div class="rv-tiles">
        ${tile("upd", "refresh", s.update, "새 버전 적용")}${tile("add", "plus", s.added, "추가")}${tile("del", "trash", s.removed, "삭제")}
        ${tile("mine", "shield", s.keptMine, "내 것 유지")}${plan.hasBase ? tile("cf", "alert", s.conflict, "충돌") : ""}
      </div>`;
    if (compact || !sum) return tiles;
    const a = sum.assets, lf = (k) => fieldLabel(k.replace(/^moduleField:(.*):value$/, "$1"));
    const row = (icn, label, val) => `<div class="rr"><span class="ri">${ic(icn, 15)}</span><span class="rl">${label}</span><span class="rv">${val}</span></div>`;
    const rows = [
      sum.texts.length ? row("text", "글", names(sum.texts, lf)) : "",
      row("book", "로어북", pills(sum.lore)),
      sum.regex.added.length + sum.regex.removed.length + sum.regex.changed.length ? row("code", "정규식", pills({ added: sum.regex.added.length, removed: sum.regex.removed.length, changed: sum.regex.changed.length })) : "",
      sum.triggersChanged ? row("zap", "트리거", `<i class="pl chg">바뀜</i>`) : "",
      a && a.added + a.removed + a.changed ? row("image", "에셋", `${pills(a)}<span class="muted">${a.from} → ${a.to}개</span>`) : "",
      sum.others.length ? row("sliders", "설정", names(sum.others, lf, 5)) : "",
      sum.chats ? row("message", "채팅", `<i class="pl ok">${ic("check", 12)} ${sum.chats}개 그대로</i>`) : ""
    ].join("");
    return `${tiles}<div class="rv-rows">${rows}</div>`;
  }
  // .pl 항목 수 표시를 위해 lore/regex 차이를 개수로
  const asCounts = (d) => ({ added: d.added.length, removed: d.removed.length, changed: d.changed.length });
  const sumFix = (sum) => sum && { ...sum, lore: asCounts(sum.lore) };
  function reviewBox(plan, choices, keepExistingOnly, keep, sum, fieldLabel) {
    const ui = reviewState(choices);
    const sum2 = sum && { ...sum, lore: asCounts(sum.lore) };
    const head = `<div id="rv-sum">${summaryHtml(plan, keep, sum2, fieldLabel, ui.open)}</div>
            ${plan.hasBase ? "" : `<div class="warn">처음 받았을 때의 기록이 없어 <b>지금 내용과 새 버전만</b> 비교합니다. 직접 고친 내용도 새 버전으로 바뀔 수 있어요. 이번 업데이트부터 기록이 남아, 다음 업데이트부터는 내 수정을 구분해 지킵니다.</div>
              <label class="chk"><input type="checkbox" id="keep" ${keepExistingOnly ? "checked" : ""}><span>새 버전에 없는 기존 로어북·에셋 유지<br><span class="muted">직접 추가한 항목을 지킵니다. 제작자가 지운 항목도 남을 수 있습니다.</span></span></label>`}`;
    if (!plan.items.length) return `${head}<div class="muted" style="margin-top:8px">바뀌는 항목이 없어요.</div>`;
    const conflicts = plan.items.filter((it) => groupOf(it) === "conflict").length;
    const openBtn = `<button class="rv-open${ui.open ? " on" : ""}" id="rv-toggle">
        <span class="oi">${ic(ui.open ? "list" : "split", 20)}</span>
        <span class="ot"><b>${ui.open ? "간단히 보기" : "자세히 보기"}</b><span>${ui.open ? "요약만 보기로 돌아가요" : `항목 ${plan.items.length}개를 나란히 비교하며 고르기${conflicts ? ` · 충돌 ${conflicts}개` : ""}`}</span></span>
        <span class="oc">${ic(ui.open ? "back" : "chevron", 18)}</span></button>`;
    if (!ui.open) return head + openBtn;
    const n = (g) => plan.items.filter((it) => g === "all" || groupOf(it) === g).length;
    const chips = ["all", "conflict", "mine", "update", "extra"].filter((g) => g === "all" || n(g)).map((g) => `<button class="rv-chip ${g}${ui.f === g ? " on" : ""}" data-f="${g}">${g === "all" ? "전체" : GROUP_KO[g]} <b>${n(g)}</b></button>`).join("");
    return `${head}${openBtn}
      <div class="rv-split">
        <div class="rv-left">
          <div class="rv-tools">
            <label class="rv-search">${ic("search", 15)}<input type="text" id="rvq" placeholder="이름·내용 검색" value="${esc(ui.q)}"></label>
            <div class="rv-chips">${chips}</div>
            <div class="rv-bulk"><button id="rv-new">${ic("refresh", 13)} 보이는 것 모두 새 버전</button><button id="rv-mine">${ic("shield", 13)} 모두 내 것</button>${conflicts ? `<button id="rv-next">${ic("alert", 13)} 다음 충돌</button>` : ""}</div>
          </div>
          <div id="rv-list"></div>
        </div>
        <div class="rv-right" id="rv-pane"></div>
      </div>`;
  }
  function bindReview(plan, choices, keepExistingOnly, current, fieldLabel, onChange, rerender) {
    const ui = reviewState(choices);
    root.classList.toggle("wide", !!ui.open);
    root.querySelector("#rv-toggle")?.addEventListener("click", () => {
      ui.open = !ui.open;
      rerender();
      root.querySelector("#rv-toggle")?.scrollIntoView({ block: "start" });
    });
    const list = root.querySelector("#rv-list"), pane = root.querySelector("#rv-pane");
    if (!list) return;
    // 창이 넓어지는 애니메이션 도중에도 맞게, 창 크기가 아니라 화면 너비로 판단
    const narrow = () => (root.ownerDocument.defaultView?.innerWidth ?? 1e4) <= 760;
    const full = (it, v) => esc(textOf(it, v)) || `<span class="muted">(없음)</span>`;
    const shown = () => {
      const q = ui.q.trim().toLowerCase();
      return plan.items.filter((it) => (ui.f === "all" || groupOf(it) === ui.f) && (!q || itemLabel(it, fieldLabel).toLowerCase().includes(q) || textOf(it, it.current).toLowerCase().includes(q) || textOf(it, it.incoming).toLowerCase().includes(q)));
    };
    const keepNow = () => keepSet(plan, choices, keepExistingOnly);
    const detail = (it) => {
      if (!it) return `<div class="rv-empty">${ic("split", 28)}<span>왼쪽에서 항목을 고르면 지금과 새 버전을 나란히 보여 드려요.</span></div>`;
      const keep = keepNow(), mine = keep.has(it.id), g = groupOf(it);
      const canDiff = it.current !== void 0 && it.incoming !== void 0 && (typeof it.current === "string" || typeof it.incoming === "string" || it.unit === "lore" || it.unit === "regex");
      const diff = canDiff ? wordDiff(textOf(it, it.current), textOf(it, it.incoming)).map((p) => p.op === "same" ? esc(p.text) : p.op === "add" ? `<ins>${esc(p.text)}</ins>` : `<del>${esc(p.text)}</del>`).join("") : "";
      return `<div class="rv-dh"><span class="ri big">${ic(it.id.startsWith("order:") ? "list" : UNIT_ICON[it.unit] ?? "text", 18)}</span>
          <div><b>${esc(itemLabel(it, fieldLabel))}</b><div class="rv-tags"><span class="tg ${g}">${KIND_KO[it.kind] ?? it.kind}</span>${it.id.startsWith("order:") ? "" : `<span class="tg">${CHANGE_KO[changeOf(it)]}</span>`}</div></div></div>
        <div class="rv-seg"><button data-pick="inc" class="${mine ? "" : "on"}">${ic("refresh", 15)} 새 버전 적용</button><button data-pick="cur" class="${mine ? "on" : ""}">${ic("shield", 15)} 내 것 유지</button></div>
        ${diff ? `<div class="rv-cap">바뀐 곳 <span class="muted">— <del>지운 글</del> <ins>새 글</ins></span></div><div class="rv-diffbox">${diff}</div>` : ""}
        <div class="rv-cols">
          <div class="rv-col${mine ? " pick" : ""}" data-pick="cur" role="button" tabindex="0" title="눌러서 지금 것 유지"><div class="rv-cap">지금 ${mine ? `<span class="tg mine">남김</span>` : ""}</div><div class="rv-text">${full(it, it.current)}</div></div>
          <div class="rv-col${mine ? "" : " pick"}" data-pick="inc" role="button" tabindex="0" title="눌러서 새 버전 적용"><div class="rv-cap">새 버전 ${mine ? "" : `<span class="tg update">적용</span>`}</div><div class="rv-text">${full(it, it.incoming)}</div></div>
        </div>`;
    };
    const paintPane = () => {
      const it = plan.items.find((x) => x.id === ui.sel);
      if (narrow()) {
        list.querySelectorAll(".rv-inline").forEach((x) => x.remove());
        const row = it && list.querySelector(`.rv-row[data-i="${plan.items.indexOf(it)}"]`);
        if (row) row.insertAdjacentHTML("afterend", `<div class="rv-inline">${detail(it)}</div>`);
        pane.hidden = true;
      } else {
        pane.hidden = false;
        pane.innerHTML = detail(it);
      }
    };
    const paint = () => {
      const keep = keepNow();
      const items = shown();
      if (!ui.sel || !plan.items.some((x) => x.id === ui.sel)) ui.sel = (plan.items.find((x) => groupOf(x) === "conflict") ?? plan.items[0])?.id ?? null;
      list.innerHTML = items.length ? items.slice(0, 300).map((it) => {
        const i = plan.items.indexOf(it), g = groupOf(it), mine = keep.has(it.id);
        return `<div class="rv-row ${g}${ui.sel === it.id ? " sel" : ""}" data-i="${i}" tabindex="0">
              <span class="ri">${ic(it.id.startsWith("order:") ? "list" : UNIT_ICON[it.unit] ?? "text", 15)}</span>
              <div class="rt"><b>${esc(itemLabel(it, fieldLabel))}</b><span><span class="tg ${g}">${KIND_KO[it.kind] ?? it.kind}</span>${it.id.startsWith("order:") ? "" : CHANGE_KO[changeOf(it)]}</span></div>
              <span class="rv-mini" title="${mine ? "내 것 유지" : "새 버전 적용"}"><button data-v="inc" data-i="${i}" class="${mine ? "" : "on"}" aria-label="새 버전">${ic("refresh", 13)}</button><button data-v="cur" data-i="${i}" class="${mine ? "on" : ""}" aria-label="내 것 유지">${ic("shield", 13)}</button></span>
            </div>`;
      }).join("") + (items.length > 300 ? `<div class="muted" style="padding:8px">앞쪽 300개만 보여요. 검색으로 좁혀 보세요.</div>` : "") : `<div class="muted" style="padding:12px">해당하는 항목이 없어요.</div>`;
      paintPane();
    };
    const refreshSum = () => {
      const box = root.querySelector("#rv-sum");
      if (box) box.innerHTML = onChange(keepNow(), ui.open);
    };
    const pick = (id, v) => {
      choices.set(id, v);
      paint();
      refreshSum();
    };
    list.addEventListener("click", (e) => {
      const b = e.target.closest("[data-v]");
      if (b) {
        e.stopPropagation();
        return pick(plan.items[+b.dataset.i].id, b.dataset.v);
      }
      const seg = e.target.closest(".rv-inline [data-pick]");
      if (seg) return pick(ui.sel, seg.dataset.pick);
      const row = e.target.closest(".rv-row");
      if (!row) return;
      const id = plan.items[+row.dataset.i].id;
      ui.sel = narrow() && ui.sel === id ? null : id;
      list.querySelectorAll(".rv-row").forEach((r) => r.classList.toggle("sel", r === row && !!ui.sel));
      paintPane();
    });
    pane.addEventListener("click", (e) => {
      const seg = e.target.closest("[data-pick]");
      if (seg) pick(ui.sel, seg.dataset.pick);
    });
    const q = root.querySelector("#rvq");
    q.addEventListener("input", () => {
      ui.q = q.value;
      paint();
    });
    root.querySelectorAll(".rv-chip").forEach((b) => b.addEventListener("click", () => {
      ui.f = b.dataset.f;
      root.querySelectorAll(".rv-chip").forEach((x) => x.classList.toggle("on", x === b));
      paint();
    }));
    const bulk = (v) => {
      for (const it of shown()) choices.set(it.id, v);
      paint();
      refreshSum();
    };
    root.querySelector("#rv-new").addEventListener("click", () => bulk("inc"));
    root.querySelector("#rv-mine").addEventListener("click", () => bulk("cur"));
    root.querySelector("#rv-next")?.addEventListener("click", () => {
      const cf = plan.items.filter((x) => groupOf(x) === "conflict");
      if (!cf.length) return;
      if (ui.f !== "all" && ui.f !== "conflict") {
        ui.f = "all";
        root.querySelectorAll(".rv-chip").forEach((x) => x.classList.toggle("on", x.dataset.f === "all"));
      }
      const at = cf.findIndex((x) => x.id === ui.sel);
      ui.sel = cf[(at + 1) % cf.length].id;
      paint();
      list.querySelector(".rv-row.sel")?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    paint();
  }
  function withPreparing(fn) {
    renderProgress("비교 준비 중…", 100, "원본 기록을 읽는 중");
    return fn().catch((err) => renderResult(null, null, err?.message ?? String(err)));
  }
  const MOD_KEYS = [...MOD_SPEC.scalars, ...Object.keys(MOD_SPEC.lists)];
  const modLabel = (k) => MOD_SPEC.label(MOD_FIELD[k] ?? k);
  function modWarnings(target, inc) {
    const same = (a, b) => stableJson(a ?? null) === stableJson(b ?? null);
    return [
      target && inc.mcp !== void 0 && !same(target.mcp, inc.mcp) ? "이 모듈의 MCP 연결 설정이 바뀌어요." : "",
      target && inc.namespace !== void 0 && !same(target.namespace, inc.namespace) ? "이 모듈의 네임스페이스가 바뀌어요. 연결된 봇의 동작을 확인해 주세요." : ""
    ].filter(Boolean).map((w) => `<div class="warn">${esc(w)}</div>`).join("");
  }
  function renderModPlan(file, incoming, db, targetIndex, keepExistingOnly, choices = /* @__PURE__ */ new Map(), base) {
    const target = targetIndex === null ? null : db.modules[targetIndex];
    if (target && base === void 0) return withPreparing(async () => renderModPlan(file, incoming, db, targetIndex, keepExistingOnly, choices, await store.getFingerprint("m", target.id)));
    const knownKeys = knownKeysOf(db);
    const plan = planAssets(target, incoming.assets, knownKeys, false, incoming.icon);
    const incView = modIncomingView(incoming, plan, /* @__PURE__ */ new Map(), knownKeys);
    const curF = target ? modFields(pickView(target, MOD_KEYS)) : null, incF = modFields(incView);
    const p = target ? makePlan("m", curF, incF, base) : null;
    const sumOf = (keep) => summarizeCharacterUpdate(curF, applyPlan(curF, incF, p, keep), curF.additionalAssets ?? []);
    const keep0 = p ? keepSet(p, choices, keepExistingOnly) : null;
    const s = plan.stat;
    frame(`<div class="card">
            <div style="margin-bottom:8px">${kindTag("module")}${target ? `<b>${esc(target.name)}</b> 업데이트${target.name !== incoming.module.name ? ` → 이름이 <b>${esc(incoming.module.name)}</b>(으)로 바뀝니다` : ""}` : `새 모듈 <b>${esc(incoming.module.name)}</b> 추가`}</div>
            <div class="grid"><b>올릴 에셋</b><span><b>${s.upload}개</b> (${fmtBytes2(s.uploadBytes)})${s.reused ? ` · 서버에 이미 있음 ${s.reused}` : ""}</span>
              ${target ? "" : `<b>에셋</b><span>${incoming.assets.length}개</span><b>로어북</b><span>${(incoming.module.lorebook ?? []).length}개</span>`}</div>
            ${p ? reviewBox(p, choices, keepExistingOnly, keep0, sumOf(keep0), modLabel) : ""}
            ${notes(incoming, incoming.module.lowLevelAccess && !target?.lowLevelAccess, s.upload)}${modWarnings(target, incoming.module)}
            <p class="muted" style="margin:10px 0 0">모듈 연결(활성 상태)은 바뀌지 않습니다.${target ? " 바꾸기 전 상태를 백업하므로 [백업·되돌리기]에서 되돌릴 수 있어요." : ""}</p>
          </div>${planFooter(target ? "업데이트" : "추가")}`);
    if (p) bindReview(p, choices, keepExistingOnly, curF, modLabel, (keep, compact) => summaryHtml(p, keep, sumFix(sumOf(keep)), modLabel, compact), () => renderModPlan(file, incoming, db, targetIndex, keepExistingOnly, choices, base));
    bindPlan(file, incoming, db, (keep) => renderModPlan(file, incoming, db, targetIndex, keep, choices, base), async () => {
      const early = target ? store.addBackup({ kind: "module", target: target.id, name: target.name, snapshot: backupSnapshot("module", target), note: "업데이트 전" }).catch(() => null) : null;
      const uploaded = await uploadWithProgress(file, plan.toUpload);
      updateProgress(100, "모듈 저장 중…");
      const known2 = /* @__PURE__ */ new Set([...knownKeys, ...uploaded.values()]);
      const inc = modIncomingView(incoming, plan, uploaded, known2);
      const inc2 = modFields(inc);
      let merged, note2 = "", backupRec = null, summary = "";
      await commit(api, async (d) => {
        if (target) {
          const e = d.entries.find((x) => x.module?.id === target.id);
          if (!e) throw new Error("업데이트할 모듈이 그 사이 삭제되었습니다. 저장하지 않았습니다.");
          const cur = e.module;
          const cur2 = modFields(pickView(cur, MOD_KEYS));
          const p2 = makePlan("m", cur2, inc2, base);
          const keep = keepSet(p2, choices, keepExistingOnly);
          const fields = applyPlan(cur2, inc2, p2, keep);
          const sm = countPlan(p2, keep);
          summary = [sm.update && `제작자 수정 ${sm.update}`, sm.keptMine && `내 것 유지 ${sm.keptMine}`, sm.conflict && `충돌 ${sm.conflict}`, sm.added && `추가 ${sm.added}`, sm.removed && `삭제 ${sm.removed}`, uploaded.size && `에셋 ${uploaded.size}개 올림`].filter(Boolean).join(" · ");
          const sumText = `${file.name} → ${summary || "변화 없음"}`;
          const pre = await early;
          if (pre && stableJson(cur) === stableJson(target)) {
            backupRec = pre;
            await store.annotate(pre.id, { summary: sumText }).catch(() => {
            });
          } else {
            if (pre) await store.removeBackup(pre.id).catch(() => {
            });
            try {
              backupRec = await store.addBackup({ kind: "module", target: cur.id, name: cur.name, snapshot: backupSnapshot("module", cur), note: "업데이트 전", summary: sumText });
            } catch (err) {
              throw new Error(`백업을 만들지 못해 아무것도 바꾸지 않았습니다: ${err?.message ?? err}`);
            }
          }
          merged = { ...cur };
          for (const k of MOD_KEYS) delete merged[k];
          for (const [k, v] of Object.entries(fieldsToMod(fields))) if (v !== void 0) merged[k] = v;
          merged.id = cur.id;
          e.module = merged;
        } else {
          merged = applyView({}, inc);
          merged.id = newId();
          d.entries.push({ module: merged, enabled: true });
        }
      });
      await hooks.modulesChanged?.();
      links?.set(linkKey(incoming), merged.id);
      try {
        await store.setFingerprint("m", merged.id, modFingerprint(inc2));
        await store.setBaseline(`m:${merged.id}`, inc).catch(() => {
        });
      } catch {
        note2 = "다음 업데이트용 원본 기록을 저장하지 못했어요. 다음엔 2방향으로 비교합니다.";
      }
      busy = false;
      renderResult({ kind: "module", name: merged.name, updated: !!target, uploadedCount: uploaded.size, assets: (merged.assets ?? []).length, lore: (merged.lorebook ?? []).length, backup: !!target, backupRec, summary, note: note2 });
    });
  }
  // 업데이트 전 채팅 백업 (설정에서 켠 경우). 열지 않아 내용을 알 수 없는 채팅은 건너뛴다.
  async function captureChats(idx, fresh) {
    if (!watchDefaults(await readUi(api)).chatBackup) return null;
    const out = [];
    let skipped = 0;
    const slots = fresh.chats ?? [];
    for (let i = 0; i < slots.length; i++) {
      let chat = null;
      try {
        chat = await api.getChatFromIndex(idx, i);
      } catch {
      }
      if (!chat || chat._placeholder || chat._stub || !Array.isArray(chat.message)) {
        skipped++;
        continue;
      }
      const { message, ...header } = chat;
      const chunks = [];
      for (let s = 0; s < message.length; s += 32) chunks.push(message.slice(s, s + 32));
      out.push({ header: JSON.parse(JSON.stringify(header)), chunks: JSON.parse(JSON.stringify(chunks)) });
    }
    return { chats: out, skipped };
  }
  // 백업에만 있는 채팅을 새 채팅으로 덧붙인다 (지금 채팅은 지우거나 바꾸지 않음, 같은 id는 건너뜀)
  function appendBackupChats(target, saved) {
    const have = new Set((target.chats ?? []).map((c) => c?.id).filter(Boolean));
    const add = [];
    for (const s of saved ?? []) {
      if (s.header?.id && have.has(s.header.id)) continue;
      const chat = { ...structuredClone(s.header), message: s.chunks.flat() };
      if (!chat.id) chat.id = newId();
      add.push(chat);
    }
    if (add.length) target.chats = [...target.chats ?? [], ...add];
    return add.length;
  }
  /**
   * 캐릭터 업데이트를 실제로 쓴다 (파일·받은 사본 공통).
   * incFields: 새 버전의 카드 필드(에셋 경로까지 확정된 것)
   */
  async function commitChar({ index, chaId, incFields, incView, base, choices, keepExistingOnly, source, uploaded = 0 }) {
    let idx = index;
    let fresh = await api.getCharacterFromIndex(idx);
    if (!fresh || fresh.chaId !== chaId) {
      const all = (await loadDb(true)).characters;
      idx = all.findIndex((c) => c?.chaId === chaId);
      if (idx < 0) throw new Error("업데이트할 캐릭터가 그 사이 삭제되었습니다. 저장하지 않았습니다.");
      fresh = await api.getCharacterFromIndex(idx);
      if (!fresh || fresh.chaId !== chaId) throw new Error("캐릭터를 다시 찾지 못했습니다. 저장하지 않았습니다.");
    }
    if (isGenerating(fresh)) throw new Busy();
    const cur2 = charFields(fresh);
    const p2 = makePlan("c", cur2, incFields, base);
    const keep = keepSet(p2, choices, keepExistingOnly);
    const fields = applyPlan(cur2, incFields, p2, keep);
    const sm = countPlan(p2, keep);
    const merged = writeCharFields(fresh, cur2, fields);
    if (merged.vits && !merged.vits.id) merged.vits.id = fresh.vits?.id ?? newId().replace(/-/g, "");
    const greet = remapGreetings(merged, cur2, fields);
    const summary = [sm.update && `제작자 수정 ${sm.update}`, sm.keptMine && `내 것 유지 ${sm.keptMine}`, sm.conflict && `충돌 ${sm.conflict}`, sm.added && `추가 ${sm.added}`, sm.removed && `삭제 ${sm.removed}`, greet && `인사말 번호 맞춤 ${greet}`, uploaded && `에셋 ${uploaded}개 올림`].filter(Boolean).join(" · ");
    updateProgress(100, "바꾸기 전 상태를 백업하는 중…");
    const chatPack = await captureChats(idx, fresh);
    let backupRec;
    try {
      const snapshot = backupSnapshot("character", fresh);
      if (chatPack?.chats.length) snapshot.__chats = chatPack.chats;
      backupRec = await store.addBackup({ kind: "character", target: fresh.chaId, name: fresh.name, snapshot, note: "업데이트 전", summary: `${source} → ${summary || "변화 없음"}` });
    } catch (e) {
      throw new Error(`백업을 만들지 못해 아무것도 바꾸지 않았습니다: ${e?.message ?? e}`);
    }
    updateProgress(100, "캐릭터 저장 중…");
    const last2 = await api.getCharacterFromIndex(idx);
    if (isGenerating(last2) || (last2?.chats ?? []).length !== (fresh.chats ?? []).length) throw new Busy();
    if (stableJson(charFields(last2)) !== stableJson(cur2)) throw new Error("검토하는 사이 이 캐릭터가 바뀌었어요. 다시 업데이트해 주세요. (바뀐 것은 없어요)");
    await api.setCharacterToIndex(idx, merged);
    const check = await api.getCharacterFromIndex(idx);
    if (check?.chaId !== chaId || (check.chats ?? []).length !== (fresh.chats ?? []).length) throw new Error("저장 후 확인에서 캐릭터가 예상과 다릅니다. [백업·되돌리기]에서 되돌릴 수 있어요.");
    let note2 = chatPack?.skipped ? `열어 보지 않아 내용을 확인할 수 없는 채팅 ${chatPack.skipped}개는 백업하지 못했어요.` : "";
    try {
      await store.setFingerprint("c", chaId, fingerprintCard(incFields));
      if (incView) await store.setBaseline(`c:${chaId}`, incView).catch(() => {
      });
    } catch {
      note2 = [note2, "다음 업데이트용 원본 기록을 저장하지 못했어요. 다음엔 2방향으로 비교합니다."].filter(Boolean).join(" ");
    }
    return { merged, summary, backupRec, note: note2, chatsBacked: chatPack?.chats.length ?? 0 };
  }
  function renderCharPlan(file, incoming, db, index, keepExistingOnly, choices = /* @__PURE__ */ new Map(), base) {
    const target = db.characters[index];
    if (base === void 0) return withPreparing(async () => renderCharPlan(file, incoming, db, index, keepExistingOnly, choices, await store.getFingerprint("c", target.chaId)));
    const ch = incoming.character;
    const knownKeys = knownKeysOf(db);
    const plan = planCharacter(target, ch, knownKeys, false);
    const spec = charSpec(ch);
    const curF = charFields(target), incF = charFields(charIncomingView(ch, plan, /* @__PURE__ */ new Map()));
    const p = makePlan("c", curF, incF, base);
    const sumOf = (keep) => summarizeCharacterUpdate(target, applyPlan(curF, incF, p, keep), target.additionalAssets ?? []);
    const keep0 = keepSet(p, choices, keepExistingOnly);
    const s = plan.stat;
    const generating = isGenerating(target);
    frame(`<div class="card">
            <div style="margin-bottom:8px">${kindTag("character")}<b>${esc(target.name)}</b> 업데이트${target.name !== ch.fields.name ? ` → 이름이 <b>${esc(ch.fields.name)}</b>(으)로 바뀝니다` : ""}</div>
            <div class="grid"><b>올릴 에셋</b><span><b>${s.upload}개</b> (${fmtBytes2(s.uploadBytes)})${s.reused ? ` · 서버에 이미 있음 ${s.reused}` : ""}</span></div>
            ${reviewBox(p, choices, keepExistingOnly, keep0, sumOf(keep0), spec.label)}
            ${notes(incoming, ch.risuFields.lowLevelAccess && !target.lowLevelAccess, s.upload)}
            ${generating ? `<div class="err">이 캐릭터가 지금 응답을 생성하는 중이에요. 생성이 끝난 뒤 업데이트해 주세요.</div>` : ""}
            <div id="open-warn"></div>
            <p class="muted" style="margin:10px 0 0">채팅·메모·TTS·메모리 같은 내 설정은 그대로 둡니다. 추가 인사말 순서가 바뀌어도 채팅마다 고른 인사말을 그대로 가리켜요. 바꾸기 전 상태를 백업하므로 [백업·되돌리기]에서 되돌릴 수 있어요.</p>
          </div>${planFooter("업데이트")}`);
    bindReview(p, choices, keepExistingOnly, curF, spec.label, (keep, compact) => summaryHtml(p, keep, sumFix(sumOf(keep)), spec.label, compact), () => renderCharPlan(file, incoming, db, index, keepExistingOnly, choices, base));
    guardOpenTarget(index, target.name);
    bindPlan(file, incoming, db, (keep) => renderCharPlan(file, incoming, db, index, keep, choices, base), async () => {
      const uploaded = await uploadWithProgress(file, plan.toUpload);
      updateProgress(100, "캐릭터 저장 중…");
      const incView = charIncomingView(ch, plan, uploaded);
      const r = await commitChar({ index, chaId: target.chaId, incFields: charFields(incView), incView, base, choices, keepExistingOnly, source: file.name, uploaded: uploaded.size });
      busy = false;
      links?.set(linkKey(incoming), target.chaId);
      renderResult({ kind: "character", name: r.merged.name, updated: true, uploadedCount: uploaded.size, assets: characterAssetKeys(r.merged).length, lore: (r.merged.globalLore ?? []).length, chats: (r.merged.chats ?? []).length, backup: true, backupRec: r.backupRec, summary: r.summary, note: r.note });
    });
  }
  // 원본 RisuAI(웹·데스크톱)는 열린 봇만 저장한다 → 업데이트할 봇이 열려 있는지 확인하고 안내
  async function guardOpenTarget(index, name) {
    if (await persistentWrites(api)) return;
    const box = root.querySelector("#open-warn");
    const go = root.querySelector("#go");
    if (!box || !go) return;
    let cur = -1;
    try {
      cur = await api.getCurrentCharacterIndex();
    } catch {
    }
    if (cur === index) return;
    box.innerHTML = `<div class="warn"><b>${esc(name)}</b>을(를) 먼저 열어 주세요. 이 앱(원본 RisuAI)은 열려 있는 봇의 변경만 저장해요. 봇을 연 뒤 [다시 확인]을 눌러 주세요.<div class="row" style="margin-top:8px"><button id="recheck">다시 확인</button></div></div>`;
    go.disabled = true;
    box.querySelector("#recheck").addEventListener("click", async () => {
      let c2 = -1;
      try {
        c2 = await api.getCurrentCharacterIndex();
      } catch {
      }
      if (c2 === index) {
        box.innerHTML = "";
        go.disabled = false;
      } else box.querySelector(".warn").animate?.([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], { duration: 220 });
    });
  }
  // ---- 받은 사본(리스에서 가져온 새 버전 봇)으로 기존 봇 업데이트 ----
  let copyQueue = [];
  function renderCopyOffer() {
    heading = TITLE2;
    const it = copyQueue[0];
    if (!it) return renderStart();
    frame(`<div class="card">
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px"><span class="ri big">${ic("refresh", 18)}</span>
            <div><b>새로 가져온 봇이 기존 봇의 새 버전 같아요</b><div class="muted">'${esc(it.copyName)}'을(를) 기존 봇에 이어 붙이면 채팅·내 수정은 그대로 두고 내용만 새 버전으로 바꿔요.</div></div></div>
          <div style="margin:4px 0 6px">어느 봇에 이어 붙일까요?</div>
          ${it.targets.map((t, i) => `<label class="opt"><input type="radio" name="tg" value="${i}" ${i === 0 ? "checked" : ""}><div><b>${esc(t.name || "(이름 없음)")}</b><div class="muted">${{ realm: "같은 RisuRealm 봇", name: "이름이 같음", content: "제작자·내용이 비슷함", similar: "이름이 비슷함" }[t.reason] ?? ""}</div></div></label>`).join("")}
          ${copyQueue.length > 1 ? `<div class="muted" style="margin-top:6px">대기 중 ${copyQueue.length - 1}개 더</div>` : ""}
        </div>
        <div class="row"><button class="primary" id="attach">이어 붙이기</button><button id="skip">새 봇으로 둘게요</button>${closeBtn("나중에")}</div>`);
    root.querySelector("#skip").addEventListener("click", () => {
      copyQueue.shift();
      copyQueue.length ? renderCopyOffer() : onClose();
    });
    root.querySelector("#attach").addEventListener("click", () => {
      const t = it.targets[Number(root.querySelector("input[name=tg]:checked")?.value ?? 0)];
      renderCopyPlan(it, t.chaId, true).catch((err) => renderResult(null, null, err?.message ?? String(err)));
    });
  }
  async function renderCopyPlan(it, targetId, keepExistingOnly, choices = /* @__PURE__ */ new Map(), base) {
    renderProgress("비교 준비 중…", 100, "봇을 읽는 중");
    const db = await loadDb(true);
    const ti = db.characters.findIndex((c) => c?.chaId === targetId), ci = db.characters.findIndex((c) => c?.chaId === it.copyId);
    if (ti < 0 || ci < 0) throw new Error("봇을 찾지 못했어요. 그 사이 지워졌을 수 있어요.");
    const target = await api.getCharacterFromIndex(ti), copy = await api.getCharacterFromIndex(ci);
    if (base === void 0) base = await store.getFingerprint("c", targetId);
    const spec = charSpec({ fields: {}, risuFields: {}, refs: {} });
    const curF = charFields(target), incF = charFields(copy);
    const p = makePlan("c", curF, incF, base);
    const sumOf = (keep) => summarizeCharacterUpdate(target, applyPlan(curF, incF, p, keep), target.additionalAssets ?? []);
    const keep0 = keepSet(p, choices, keepExistingOnly);
    const rerender = (keep = keepExistingOnly) => renderCopyPlan(it, targetId, keep, choices, base).catch((err) => renderResult(null, null, err?.message ?? String(err)));
    frame(`<div class="card">
          <div style="margin-bottom:8px">${kindTag("character")}<b>${esc(target.name)}</b> 업데이트 <span class="muted">← 새로 가져온 '${esc(copy.name)}'</span></div>
          ${reviewBox(p, choices, keepExistingOnly, keep0, sumOf(keep0), spec.label)}
          ${copy.lowLevelAccess && !target.lowLevelAccess ? `<div class="warn">이 버전은 <b>저수준 접근(lowLevelAccess)</b>을 사용합니다. 믿을 수 있는 봇인지 확인하세요.</div>` : ""}
          <div id="open-warn"></div>
          <p class="muted" style="margin:10px 0 0">채팅·메모·TTS·메모리 같은 내 설정은 그대로 둡니다. 바꾸기 전 상태를 백업해요. 업데이트가 끝나면 새로 가져온 사본은 ${(await persistentWrites(api)) && watchDefaults(await readUi(api)).trashCopies ? "휴지통으로 옮겨요(휴지통에서 되살릴 수 있어요)" : "그대로 남으니 필요 없으면 직접 지워 주세요"}.</p>
        </div>
        <div class="row"><button class="primary" id="go">업데이트</button><button id="back">뒤로</button>${closeBtn("취소")}</div>`);
    bindReview(p, choices, keepExistingOnly, curF, spec.label, (keep, compact) => summaryHtml(p, keep, sumFix(sumOf(keep)), spec.label, compact), () => rerender());
    guardOpenTarget(ti, target.name);
    root.querySelector("#keep")?.addEventListener("change", (e) => rerender(e.target.checked));
    root.querySelector("#back").addEventListener("click", () => renderCopyOffer());
    root.querySelector("#go").addEventListener("click", async () => {
      try {
        busy = true;
        renderProgress(`업데이트 중: ${target.name}`, 100, "준비 중…");
        const fresh = await api.getCharacterFromIndex(ci);
        if (fresh?.chaId !== it.copyId) throw new Error("새로 가져온 봇이 그 사이 바뀌었어요.");
        const r = await commitChar({ index: ti, chaId: targetId, incFields: charFields(fresh), incView: null, base, choices, keepExistingOnly, source: `가져온 봇 '${fresh.name}'` });
        let trashNote = "";
        const ui = watchDefaults(await readUi(api));
        if (!await persistentWrites(api)) trashNote = `새로 가져온 '${fresh.name}'은(는) 그대로 남아 있어요. 필요 없으면 직접 지워 주세요.`;
        else if (ui.trashCopies) {
          const t = await trashCopy(api, it.copyId).catch(() => ({ ok: false, reason: "error" }));
          if (t.ok) trashNote = `새로 가져온 '${fresh.name}'은(는) 휴지통으로 옮겼어요.`;
          else if (t.reason === "open") {
            await queueTrash(api, it.copyId);
            trashNote = `새로 가져온 '${fresh.name}'이(가) 열려 있어서, 다른 봇으로 옮기면 휴지통으로 옮길게요.`;
          } else if (t.reason === "conversation") trashNote = `새로 가져온 '${fresh.name}'에 대화가 있어 지우지 않았어요.`;
          else trashNote = `새로 가져온 '${fresh.name}'을(를) 정리하지 못했어요. 필요 없으면 직접 지워 주세요.`;
        }
        copyQueue.shift();
        busy = false;
        renderResult({ kind: "character", name: r.merged.name, updated: true, uploadedCount: 0, assets: characterAssetKeys(r.merged).length, lore: (r.merged.globalLore ?? []).length, chats: (r.merged.chats ?? []).length, backup: true, backupRec: r.backupRec, summary: r.summary, note: [r.note, trashNote].filter(Boolean).join(" ") });
        if (copyQueue.length) {
          const nx = root.querySelector("#again");
          if (nx) {
            nx.textContent = `다음 봇 (${copyQueue.length}개 남음)`;
            nx.replaceWith(nx.cloneNode(true));
            root.querySelector("#again").addEventListener("click", () => renderCopyOffer());
          }
        }
      } catch (err) {
        busy = false;
        if (err instanceof Busy) return renderResult(null, null, err.message);
        renderResult(null, null, err?.message ?? String(err));
      }
    });
  }
  // 새로 넣은 봇이 사이드바(캐릭터 순서)에 꼭 들어가게: 리스의 checkCharOrder를 부른 뒤에도 빠져 있으면 직접 넣는다
  // (PocketRisu·RisuBard에서는 플러그인이 캐릭터를 추가한 직후 순서 갱신이 늦거나 빠지는 경우가 있음)
  async function ensureInOrder(chaId) {
    try {
      await api.checkCharOrder();
    } catch {
    }
    try {
      for (let i = 0; i < 3; i++) {
        const order = (await api.getDatabase(["characterOrder"]))?.characterOrder ?? [];
        const has = order.some((x) => x === chaId || Array.isArray(x?.data) && x.data.includes(chaId));
        if (has) return;
        if (i === 0) await new Promise((r) => setTimeout(r, 300));
        else await api.setDatabaseLite({ characterOrder: [...order, chaId] });
      }
    } catch {
    }
  }
  // ---- 받은 모듈(리스에 새로 가져온 .risum)로 기존 모듈 업데이트 ----
  let modQueue = [];
  function renderModCopyOffer() {
    heading = TITLE2;
    const it = modQueue[0];
    if (!it) return renderStart();
    frame(`<div class="card">
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px"><span class="ri big">${ic("module", 18)}</span>
            <div><b>새로 가져온 모듈이 기존 모듈의 새 버전 같아요</b><div class="muted">'${esc(it.copyName)}'(으)로 기존 모듈을 업데이트하면 내가 고친 부분과 모듈 연결(켜짐·봇 연결)은 그대로 두고 내용만 새 버전으로 바꿔요.</div></div></div>
          <div style="margin:4px 0 6px">어느 모듈을 업데이트할까요?</div>
          ${it.targets.map((t, i) => `<label class="opt"><input type="radio" name="tg" value="${i}" ${i === 0 ? "checked" : ""}><div><b>${esc(t.name || "(이름 없음)")}</b><div class="muted">${t.reason === "name" ? "이름이 같음" : "네임스페이스가 같음"}</div></div></label>`).join("")}
          ${modQueue.length > 1 ? `<div class="muted" style="margin-top:6px">대기 중 ${modQueue.length - 1}개 더</div>` : ""}
        </div>
        <div class="row"><button class="primary" id="attach">업데이트</button><button id="skip">새 모듈로 둘게요</button>${closeBtn("나중에")}</div>`);
    root.querySelector("#skip").addEventListener("click", () => {
      modQueue.shift();
      modQueue.length ? renderModCopyOffer() : onClose();
    });
    root.querySelector("#attach").addEventListener("click", () => {
      const t = it.targets[Number(root.querySelector("input[name=tg]:checked")?.value ?? 0)];
      renderModCopyPlan(it, t.id, true).catch((err) => renderResult(null, null, err?.message ?? String(err)));
    });
  }
  async function renderModCopyPlan(it, targetId, keepExistingOnly, choices = /* @__PURE__ */ new Map(), base) {
    renderProgress("비교 준비 중…", 100, "모듈을 읽는 중");
    const mods = (await api.getDatabase(["modules"]))?.modules ?? [];
    const target = mods.find((m) => m?.id === targetId), copy = mods.find((m) => m?.id === it.copyId);
    if (!target || !copy) throw new Error("모듈을 찾지 못했어요. 그 사이 지워졌을 수 있어요.");
    if (base === void 0) base = await store.getFingerprint("m", targetId);
    const curF = modFields(pickView(target, MOD_KEYS)), incF = modFields(pickView(copy, MOD_KEYS));
    const p = makePlan("m", curF, incF, base);
    const sumOf = (keep) => summarizeCharacterUpdate(curF, applyPlan(curF, incF, p, keep), curF.additionalAssets ?? []);
    const keep0 = keepSet(p, choices, keepExistingOnly);
    const rerender = (keep = keepExistingOnly) => renderModCopyPlan(it, targetId, keep, choices, base).catch((err) => renderResult(null, null, err?.message ?? String(err)));
    frame(`<div class="card">
          <div style="margin-bottom:8px">${kindTag("module")}<b>${esc(target.name)}</b> 업데이트 <span class="muted">← 새로 가져온 '${esc(copy.name)}'</span></div>
          ${reviewBox(p, choices, keepExistingOnly, keep0, sumOf(keep0), modLabel)}
          ${copy.lowLevelAccess && !target.lowLevelAccess ? `<div class="warn">이 버전은 <b>저수준 접근(lowLevelAccess)</b>을 사용합니다. 믿을 수 있는 모듈인지 확인하세요.</div>` : ""}${modWarnings(target, copy)}
          <p class="muted" style="margin:10px 0 0">모듈 연결(켜짐·봇 연결)은 그대로예요. 바꾸기 전 상태를 백업해요. 업데이트가 끝나면 새로 가져온 사본 모듈은 목록에서 정리해요.</p>
        </div>
        <div class="row"><button class="primary" id="go">업데이트</button><button id="back">뒤로</button>${closeBtn("취소")}</div>`);
    bindReview(p, choices, keepExistingOnly, curF, modLabel, (keep, compact) => summaryHtml(p, keep, sumFix(sumOf(keep)), modLabel, compact), () => rerender());
    root.querySelector("#keep")?.addEventListener("change", (e) => rerender(e.target.checked));
    root.querySelector("#back").addEventListener("click", () => renderModCopyOffer());
    root.querySelector("#go").addEventListener("click", async () => {
      try {
        busy = true;
        renderProgress(`업데이트 중: ${target.name}`, 100, "바꾸기 전 상태를 백업하는 중…");
        let merged, summary = "", backupRec = null;
        await commit(api, async (d) => {
          const e = d.entries.find((x) => x.module?.id === targetId);
          const ce = d.entries.find((x) => x.module?.id === it.copyId);
          if (!e) throw new Error("업데이트할 모듈이 그 사이 삭제되었어요. 저장하지 않았어요.");
          if (!ce) throw new Error("새로 가져온 모듈이 그 사이 지워졌어요. 저장하지 않았어요.");
          const cur = e.module;
          const cur2 = modFields(pickView(cur, MOD_KEYS)), inc2 = modFields(pickView(ce.module, MOD_KEYS));
          const p2 = makePlan("m", cur2, inc2, base);
          const keep = keepSet(p2, choices, keepExistingOnly);
          const fields = applyPlan(cur2, inc2, p2, keep);
          const sm = countPlan(p2, keep);
          summary = [sm.update && `제작자 수정 ${sm.update}`, sm.keptMine && `내 것 유지 ${sm.keptMine}`, sm.conflict && `충돌 ${sm.conflict}`, sm.added && `추가 ${sm.added}`, sm.removed && `삭제 ${sm.removed}`].filter(Boolean).join(" · ");
          backupRec = await store.addBackup({ kind: "module", target: cur.id, name: cur.name, snapshot: backupSnapshot("module", cur), note: "업데이트 전", summary: `가져온 모듈 '${ce.module.name}' → ${summary || "변화 없음"}` }).catch((err) => {
            throw new Error(`백업을 만들지 못해 아무것도 바꾸지 않았어요: ${err?.message ?? err}`);
          });
          merged = { ...cur };
          for (const k of MOD_KEYS) delete merged[k];
          for (const [k, v] of Object.entries(fieldsToMod(fields))) if (v !== void 0) merged[k] = v;
          merged.id = cur.id;
          e.module = merged;
          // 받은 사본 모듈은 목록에서 뺀다 (에셋 파일은 업데이트된 모듈이 계속 씀)
          d.entries = d.entries.filter((x) => x !== ce);
          d.removedIds.add(it.copyId);
          await store.setFingerprint("m", cur.id, modFingerprint(inc2)).catch(() => {
          });
        });
        await hooks.modulesChanged?.();
        modQueue.shift();
        busy = false;
        renderResult({ kind: "module", name: merged.name, updated: true, uploadedCount: 0, assets: (merged.assets ?? []).length, lore: (merged.lorebook ?? []).length, backup: true, backupRec, summary, note: `새로 가져온 '${copy.name}'은(는) 목록에서 정리했어요.` });
      } catch (err) {
        busy = false;
        renderResult(null, null, err?.message ?? String(err));
      }
    });
  }
  // ==== 합치기 (RisuTide): 다른 봇·모듈에서 인물·세계관 가져오기, 전체 합치기, 출처별 업데이트, 떼어내기 ====
  const KIND_PART = { lore: "로어북", loreFolder: "로어 폴더", regex: "정규식", trigger: "트리거", luaTrigger: "Lua 트리거", css: "CSS", variable: "기본 변수", asset: "에셋", emotion: "감정 이미지", greeting: "인사말", textField: "글", imageGenSetting: "이미지 생성 설정", loreSettings: "로어북 설정", extension: "확장" };
  const PART_ICON = { lore: "book", loreFolder: "folder", regex: "code", trigger: "zap", luaTrigger: "zap", css: "palette", variable: "sliders", asset: "image", emotion: "image", greeting: "message", textField: "text", imageGenSetting: "image", loreSettings: "sliders", extension: "sliders" };
  const ROLE_KO = { status: "상태창", imageDisplay: "이미지 표시", imageGen: "이미지 생성", events: "이벤트", firstMessage: "첫 메시지", other: "기타" };
  let mg = null;
  const nameOf = (c) => c?.name || "(이름 없음)";
  async function mergeData() {
    const db = await loadDb(true);
    const chars = db.characters.map((c, i) => c && c.type !== "group" && !c.trashTime ? { i, c } : null).filter(Boolean).sort((a, b) => nameOf(a.c).localeCompare(nameOf(b.c), "ko"));
    return { db, chars, modules: db.modules };
  }
  function partText(p) {
    const v = p.value;
    if (typeof v === "string") return v;
    if (p.kind === "lore") return String(v?.content ?? "");
    if (p.kind === "regex") return `${v?.in ?? ""} → ${v?.out ?? ""}`;
    if (Array.isArray(v)) return String(v[0] ?? "");
    try {
      return JSON.stringify(v);
    } catch {
      return "";
    }
  }
  const partLabel = (p) => {
    const v = p.value;
    if (p.kind === "lore" || p.kind === "loreFolder") return v?.comment || v?.key || "(이름 없음)";
    if (p.kind === "regex" || p.kind === "trigger" || p.kind === "luaTrigger") return v?.comment || "(이름 없음)";
    if (p.kind === "asset" || p.kind === "emotion") return String(v?.[0] ?? "");
    return MOD_FIELD_LABEL(partField(p));
  };
  const MOD_FIELD_LABEL = (f) => charSpec({ fields: {}, risuFields: {}, refs: {} }).label(f);
  const editable = (p) => typeof p.value === "string" || p.kind === "lore";

  async function renderMergeStart(targetId) {
    heading = "다른 봇에서 가져오기 · 합치기";
    busy = false;
    renderProgress("합치기 준비 중…", 100, "봇 목록을 읽는 중");
    const { chars, modules } = await mergeData();
    mg = { targetId: targetId ?? mg?.targetId ?? chars[0]?.c.chaId, src: mg?.src ?? null, scope: mg?.scope ?? "characters" };
    const target = chars.find((x) => x.c.chaId === mg.targetId)?.c;
    const prov = target ? await loadProvenance(api, target) : null;
    const extra = prov?.sources.slice(1) ?? [];
    const opts = (sel) => chars.map(({ c }) => `<option value="c:${esc(c.chaId)}" ${sel === "c:" + c.chaId ? "selected" : ""}>${esc(nameOf(c))}</option>`).join("");
    frame(`<div class="card">
        <div class="rv-dh" style="margin-bottom:10px"><span class="ri big">${ic("link", 18)}</span><div><b>다른 봇에서 가져오기 · 합치기</b><div class="muted">다른 봇이나 모듈의 인물·세계관을 이 봇에 넣어요. 채팅과 내 설정은 그대로이고, 바꾸기 전에 백업해요.</div></div></div>
        <div class="rr"><span class="rl" style="width:76px">넣을 봇</span><select id="mg-target" style="margin-top:0">${chars.map(({ c }) => `<option value="${esc(c.chaId)}" ${c.chaId === mg.targetId ? "selected" : ""}>${esc(nameOf(c))}</option>`).join("")}</select></div>
        <div class="rr"><span class="rl" style="width:76px">가져올 곳</span><select id="mg-src" style="margin-top:0"><option value="">— 고르기 —</option>
          <optgroup label="봇">${opts(mg.src)}</optgroup>
          ${modules.length ? `<optgroup label="모듈">${modules.map((m) => `<option value="m:${esc(m.id)}" ${mg.src === "m:" + m.id ? "selected" : ""}>${esc(m.name || "(이름 없음)")}</option>`).join("")}</optgroup>` : ""}
        </select></div>
        <div style="margin:12px 0 6px">무엇을 가져올까요?</div>
        <div class="mg-scope">
          ${[["characters", "character", "인물만", "고른 인물의 로어·이미지를 가져와요"], ["world", "globe", "인물 + 세계관", "인물과 관련된 장소·설정 로어도 함께"], ["full", "split", "전체 합치기", "두 봇을 하나로 합쳐요 (상태창 등 겹치는 기능은 고르기)"]].map(([v, icn, t, d]) => `<label class="opt"><input type="radio" name="scope" value="${v}" ${mg.scope === v ? "checked" : ""}><span class="ri">${ic(icn, 15)}</span><div><b>${t}</b><div class="muted">${d}</div></div></label>`).join("")}
        </div>
      </div>
      ${extra.length ? `<div class="card"><div class="rv-dh" style="margin-bottom:6px"><span class="ri">${ic("history", 15)}</span><b>이 봇에 합쳐진 출처</b></div>
        ${extra.map((s) => `<div class="rr"><span class="rl" style="flex:1;width:auto;color:var(--rb-text)">${esc(s.name)} <span class="muted">${s.kind === "module" ? "모듈" : s.kind === "import" || s.importMode ? "가져오기" : "합치기"}</span></span><button data-supd="${esc(s.id)}">${ic("refresh", 13)} 새 버전으로</button><button data-sdet="${esc(s.id)}">${ic("trash", 13)} 떼어내기</button></div>`).join("")}
        <p class="muted" style="margin:6px 0 0">출처 하나만 새 버전으로 바꾸거나, 가져온 자료를 다시 떼어낼 수 있어요.</p></div>` : ""}
      <div class="row"><button class="primary" id="mg-next">다음</button>${closeBtn("닫기")}</div>`);
    root.querySelector("#mg-target").addEventListener("change", (e) => renderMergeStart(e.target.value).catch((err) => renderResult(null, null, err?.message ?? String(err))));
    root.querySelector("#mg-src").addEventListener("change", (e) => mg.src = e.target.value || null);
    root.querySelectorAll("input[name=scope]").forEach((el) => el.addEventListener("change", () => mg.scope = el.value));
    root.querySelectorAll("[data-supd]").forEach((b) => b.addEventListener("click", () => renderSourceUpdatePick(b.dataset.supd).catch((err) => renderResult(null, null, err?.message ?? String(err)))));
    root.querySelectorAll("[data-sdet]").forEach((b) => b.addEventListener("click", () => renderDetach(b.dataset.sdet).catch((err) => renderResult(null, null, err?.message ?? String(err)))));
    root.querySelector("#mg-next").addEventListener("click", () => {
      if (!mg.src) return root.querySelector("#mg-src").animate?.([{ boxShadow: "0 0 0 2px var(--rb-warn,#f5c26b)" }, { boxShadow: "none" }], { duration: 900 });
      if (mg.src === "c:" + mg.targetId) return renderResult(null, null, "같은 봇끼리는 합칠 수 없어요.");
      renderMergePick().catch((err) => renderResult(null, null, err?.message ?? String(err)));
    });
  }
  async function mergeInputs() {
    const { db } = await mergeData();
    const ti = db.characters.findIndex((c) => c?.chaId === mg.targetId);
    if (ti < 0) throw new Error("넣을 봇을 찾지 못했어요.");
    const target = await api.getCharacterFromIndex(ti);
    let S, srcName, srcLow = false;
    if (mg.src.startsWith("c:")) {
      const si = db.characters.findIndex((c) => c?.chaId === mg.src.slice(2));
      const sc = await api.getCharacterFromIndex(si);
      if (!sc) throw new Error("가져올 봇을 찾지 못했어요.");
      S = mergeInput(sc, sc.chaId);
      srcName = nameOf(sc);
      srcLow = !!sc.lowLevelAccess;
    } else {
      const m = db.modules.find((x) => x.id === mg.src.slice(2));
      if (!m) throw new Error("가져올 모듈을 찾지 못했어요.");
      S = moduleToMergeInput(m);
      srcName = m.name;
      srcLow = !!m.lowLevelAccess;
    }
    return { ti, target, T: mergeInput(target, target.chaId || "target"), S, srcName, srcLow };
  }
  async function renderMergePick() {
    heading = "다른 봇에서 가져오기 · 합치기";
    renderProgress("인물을 찾는 중…", 100, "");
    const inp = await mergeInputs();
    const { S, T } = inp;
    const chars = detectCharacters(S);
    const targetNames = new Set(detectCharacters(T).flatMap((c) => c.aliases).map((n) => n.toLocaleLowerCase()));
    mg.picked ??= new Set(chars.filter((c) => c.defaultSelected !== false && !c.aliases.some((a) => targetNames.has(a.toLocaleLowerCase()))).map((c) => c.key));
    if (mg.scope === "full") mg.picked = new Set(chars.map((c) => c.key));
    mg.bridge ??= "visitor";
    const pickedChars = chars.filter((c) => mg.picked.has(c.key));
    const world = mg.scope === "world" ? suggestWorld(S, pickedChars) : [];
    mg.world ??= new Set(world);
    const charKeys = new Set(chars.flatMap((c) => c.loreKeys));
    const worldParts = S.parts.filter((p) => p.kind === "lore" && !charKeys.has(p.key));
    frame(`<div class="card">
        <div style="margin-bottom:8px">${kindTag("character")}<b>${esc(nameOf(inp.target))}</b> <span class="muted">← ${esc(inp.srcName)}</span></div>
        ${mg.scope === "full" ? `<div class="rr"><span class="ri">${ic("split", 15)}</span><span>두 봇을 전체 합쳐요. 인물 ${chars.length}명과 모든 로어·스크립트·이미지를 가져오고, 겹치는 기능은 다음 화면에서 골라요.</span></div>` : `
        <div style="margin:4px 0 6px">가져올 인물 <span class="muted">${chars.length ? `${chars.length}명 찾음` : "찾지 못했어요 — 아래 '전체 합치기'를 써 보세요"}</span></div>
        <div class="mg-chars">${chars.map((c) => `<label class="opt"><input type="checkbox" data-ch="${esc(c.key)}" ${mg.picked.has(c.key) ? "checked" : ""}><div><b>${esc(c.displayName ?? c.name)}</b><div class="muted">로어 ${c.loreKeys.length}개${c.assetNames.length + c.emotionNames.length ? ` · 이미지 ${c.assetNames.length + c.emotionNames.length}장` : ""}${c.aliases.some((a) => targetNames.has(a.toLocaleLowerCase())) ? " · <span class='hl'>이 봇에도 같은 이름이 있어요</span>" : ""}</div></div></label>`).join("")}</div>`}
        ${mg.scope === "world" ? `<details open style="margin-top:10px"><summary>함께 가져올 세계관 로어 <span class="muted">(인물과 관련된 것을 미리 골라 뒀어요)</span></summary>
          <div class="mg-world">${worldParts.map((p) => `<label class="opt" style="padding:8px 12px"><input type="checkbox" data-w="${esc(p.key)}" ${mg.world.has(p.key) ? "checked" : ""}><div><b style="font-weight:500">${esc(partLabel(p))}</b><div class="muted">${esc(partText(p).slice(0, 80))}</div></div></label>`).join("") || '<div class="muted">세계관 로어가 없어요.</div>'}</div></details>` : ""}
        ${mg.scope !== "full" ? `<div class="rr" style="margin-top:8px"><span class="ri">${ic("globe", 15)}</span><span class="rl" style="width:auto">이 세계에서</span><div class="rv-seg" style="flex:1;max-width:360px"><button data-bridge="visitor" class="${mg.bridge === "visitor" ? "on" : ""}">다른 세계에서 온 사람</button><button data-bridge="native" class="${mg.bridge === "native" ? "on" : ""}">원래 이 세계 사람</button></div></div>` : ""}
      </div>
      <div class="row"><button class="primary" id="mg-next">다음</button><button id="mg-back">뒤로</button>${closeBtn("취소")}</div>`);
    root.querySelectorAll("[data-ch]").forEach((el) => el.addEventListener("change", () => {
      el.checked ? mg.picked.add(el.dataset.ch) : mg.picked.delete(el.dataset.ch);
      if (mg.scope === "world") {
        mg.world = new Set(suggestWorld(S, chars.filter((c) => mg.picked.has(c.key))));
        renderMergePick();
      }
    }));
    root.querySelectorAll("[data-w]").forEach((el) => el.addEventListener("change", () => el.checked ? mg.world.add(el.dataset.w) : mg.world.delete(el.dataset.w)));
    root.querySelectorAll("[data-bridge]").forEach((b) => b.addEventListener("click", () => {
      mg.bridge = b.dataset.bridge;
      root.querySelectorAll("[data-bridge]").forEach((x) => x.classList.toggle("on", x === b));
    }));
    root.querySelector("#mg-back").addEventListener("click", () => {
      mg.picked = mg.world = null;
      renderMergeStart(mg.targetId);
    });
    root.querySelector("#mg-next").addEventListener("click", () => {
      if (mg.scope !== "full" && !mg.picked.size) return renderResult(null, null, "가져올 인물을 하나 이상 골라 주세요.");
      renderMergeReview(inp).catch((err) => renderResult(null, null, err?.message ?? String(err)));
    });
  }
  async function renderMergeReview(inp, keepState) {
    heading = "다른 봇에서 가져오기 · 합치기";
    const { S, T } = inp;
    const picks = { characters: [...mg.picked], world: mg.scope === "world" ? [...mg.world] : [], bridge: mg.bridge, renames: {} };
    const overrides = mg.scope === "full" ? new Map(S.parts.map((p) => [p.key, true])) : /* @__PURE__ */ new Map();
    const existing = await loadProvenance(api, inp.target);
    const sel = prepareScopedSelection(T, S, picks, overrides, existing ?? void 0);
    const st = keepState ?? { exclude: new Set(sel.importPlan?.exclude ?? []), edits: {}, roles: Object.fromEntries(sel.plan.roles.map((r, i) => [i, r.default])), lowLevel: false, open: null, q: "" };
    mg.review = { inp, sel, st };
    const srcParts = sel.plan.parts.filter((p) => p.sourceId === S.meta.id);
    const chosen = srcParts.filter((p) => !st.exclude.has(p.key));
    const counts = {};
    for (const p of chosen) counts[p.kind] = (counts[p.kind] ?? 0) + 1;
    const renames = sel.plan.renames.filter((r) => r.sourceId === S.meta.id);
    const needLow = (sel.plan.needsLowLevel || chosen.some((p) => p.kind === "luaTrigger" || p.kind === "trigger")) && inp.srcLow && !inp.target.lowLevelAccess;
    const ai = watchAi();
    const tile = (icn, n, label, cls = "upd") => `<div class="st ${cls}${n ? "" : " zero"}"><span class="si">${ic(icn, 18)}</span><b>${n}</b><span>${label}</span></div>`;
    const q = st.q.trim().toLowerCase();
    const shown = srcParts.filter((p) => !q || partLabel(p).toLowerCase().includes(q) || partText(p).toLowerCase().includes(q)).sort((a, b) => Number(st.exclude.has(a.key)) - Number(st.exclude.has(b.key)));
    frame(`<div class="card">
        <div style="margin-bottom:8px">${kindTag("character")}<b>${esc(nameOf(inp.target))}</b> <span class="muted">← ${esc(inp.srcName)} · ${{ characters: "인물만", world: "인물 + 세계관", full: "전체 합치기" }[mg.scope]}</span></div>
        <div class="rv-tiles">${tile("book", (counts.lore ?? 0) + (counts.loreFolder ?? 0), "로어북")}${tile("image", (counts.asset ?? 0) + (counts.emotion ?? 0), "이미지", "add")}${tile("code", (counts.regex ?? 0) + (counts.trigger ?? 0) + (counts.luaTrigger ?? 0) + (counts.css ?? 0), "스크립트", "mine")}${tile("edit", renames.length, "이름 바꿈", "cf")}</div>
        ${renames.length ? `<details style="margin-top:8px"><summary>겹치는 이름 ${renames.length}개는 자동으로 바꿔요</summary><div class="rv-rows">${renames.slice(0, 40).map((r) => `<div class="rr"><span class="rl" style="width:auto">${esc(r.from)}</span><span class="muted">→</span><span>${esc(r.to)}</span></div>`).join("")}</div></details>` : ""}
        ${sel.plan.roles.length ? `<div style="margin:12px 0 6px">겹치는 기능 고르기</div>${sel.plan.roles.map((r, i) => `<div class="rr"><span class="ri">${ic("sliders", 15)}</span><span class="rl" style="width:96px">${esc(r.label || ROLE_KO[r.kind] || r.kind)}</span><select data-role="${i}" style="margin-top:0;flex:1">${[[T.meta.id, `${nameOf(inp.target)} 것`], [S.meta.id, `${inp.srcName} 것`], ["both", "둘 다"]].map(([v, l]) => `<option value="${esc(v)}" ${String(st.roles[i]) === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`).join("")}` : ""}
        ${(sel.plan.warnings ?? []).length ? `<div class="warn">${sel.plan.warnings.slice(0, 4).map((w) => esc(w.detail)).join("<br>")}</div>` : ""}
        ${needLow ? `<label class="chk"><input type="checkbox" id="mg-low" ${st.lowLevel ? "checked" : ""}><span>가져오는 스크립트가 <b>저수준 접근(lowLevelAccess)</b>을 써요. 이 봇에도 허용하기<br><span class="muted">믿을 수 있는 봇일 때만 켜 주세요. 끄면 해당 스크립트가 동작하지 않을 수 있어요.</span></span></label>` : ""}
        <details id="mg-parts" style="margin-top:12px" ${st.open ? "open" : ""}><summary>가져올 항목 ${chosen.length}/${srcParts.length}개 — 하나씩 고르기·고치기${ai.on ? "·AI로 다듬기" : ""}</summary>
          <div class="rv-tools" style="border:0;padding:8px 0">
            <label class="rv-search">${ic("search", 15)}<input type="text" id="mg-q" placeholder="이름·내용 검색" value="${esc(st.q)}"></label>
            <div class="rv-bulk"><button id="mg-all">${ic("check", 13)} 보이는 것 모두 넣기</button><button id="mg-none">${ic("x", 13)} 모두 빼기</button></div>
            <div class="rr" style="border:0"><span class="ri">${ic("zap", 15)}</span><span class="rl" style="width:auto">AI 다듬기 모델</span><select id="mg-ai" style="margin-top:0;flex:1">${AI_MODES.map(([v, l]) => `<option value="${v}" ${ai.mode === v ? "selected" : ""}>${l}</option>`).join("")}</select>${ai.mode === "static" ? `<input type="text" id="mg-ai-id" placeholder="모델 ID (예: gpt-4o)" value="${esc(ai.staticModel ?? "")}" style="margin-top:0;flex:1">` : ""}</div>
          </div>
          <div class="mg-list">${shown.slice(0, 250).map((p) => {
            const on = !st.exclude.has(p.key), ed = st.edits[p.key];
            return `<div class="mg-part${on ? "" : " off"}" data-k="${esc(p.key)}">
              <label class="mg-ph"><input type="checkbox" data-pk="${esc(p.key)}" ${on ? "checked" : ""}><span class="ri">${ic(PART_ICON[p.kind] ?? "text", 14)}</span><span class="rt"><b>${esc(partLabel(p))}</b><span>${KIND_PART[p.kind] ?? p.kind}${ed !== void 0 ? " · <span class='hl'>고침</span>" : ""}</span></span></label>
              ${editable(p) && on ? `<div class="mg-act"><button data-edit="${esc(p.key)}">${ic("edit", 13)} 고치기</button><button data-ai="${esc(p.key)}">${ic("zap", 13)} AI로 다듬기</button></div>` : ""}
              <div class="mg-body" hidden></div></div>`;
          }).join("")}${shown.length > 250 ? '<div class="muted">앞쪽 250개만 보여요. 검색으로 좁혀 보세요.</div>' : ""}</div>
        </details>
        <p class="muted" style="margin:10px 0 0">채팅과 내 설정은 그대로예요. 바꾸기 전 상태를 백업해요. 나중에 '이 봇에 합쳐진 출처'에서 이 출처만 새 버전으로 바꾸거나 떼어낼 수 있어요.</p>
      </div>
      <div class="row"><button class="primary" id="mg-go">${mg.scope === "full" ? "합치기" : "가져오기"} · ${chosen.length}개</button><button id="mg-back">뒤로</button>${closeBtn("취소")}</div>`);
    // 다시 그려도 목록·창 스크롤 위치는 그대로
    const rer = () => {
      const ls = root.querySelector(".mg-list")?.scrollTop ?? 0, ws = root.scrollTop;
      return renderMergeReview(inp, st).then(() => {
        const l2 = root.querySelector(".mg-list");
        if (l2) l2.scrollTop = ls;
        root.scrollTop = ws;
      }).catch((err) => renderResult(null, null, err?.message ?? String(err)));
    };
    root.querySelector("#mg-parts").addEventListener("toggle", (e) => st.open = e.target.open);
    root.querySelectorAll("[data-role]").forEach((s) => s.addEventListener("change", () => st.roles[s.dataset.role] = s.value));
    root.querySelector("#mg-low")?.addEventListener("change", (e) => st.lowLevel = e.target.checked);
    root.querySelectorAll("[data-pk]").forEach((c) => c.addEventListener("change", () => {
      c.checked ? st.exclude.delete(c.dataset.pk) : st.exclude.add(c.dataset.pk);
      rer();
    }));
    const qEl = root.querySelector("#mg-q");
    let qt = null;
    qEl.addEventListener("input", () => {
      st.q = qEl.value;
      clearTimeout(qt);
      qt = setTimeout(() => rer().then(() => {
        const e2 = root.querySelector("#mg-q");
        e2?.focus();
        e2?.setSelectionRange(e2.value.length, e2.value.length);
      }), 250);
    });
    root.querySelector("#mg-all").addEventListener("click", () => {
      for (const p of shown) st.exclude.delete(p.key);
      rer();
    });
    root.querySelector("#mg-none").addEventListener("click", () => {
      for (const p of shown) st.exclude.add(p.key);
      rer();
    });
    root.querySelector("#mg-ai").addEventListener("change", (e) => {
      saveAi({ ...ai, mode: e.target.value });
      rer();
    });
    root.querySelector("#mg-ai-id")?.addEventListener("change", (e) => saveAi({ ...ai, staticModel: e.target.value.trim() }));
    const partOf = (k) => srcParts.find((p) => p.key === k);
    const bodyOf = (k) => root.querySelector(`.mg-part[data-k="${CSS.escape(k)}"] .mg-body`);
    root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.edit, box = bodyOf(k), p = partOf(k);
      if (!box.hidden && box.dataset.mode === "edit") return box.hidden = true;
      box.dataset.mode = "edit";
      box.hidden = false;
      box.innerHTML = `<textarea class="mg-ta">${esc(st.edits[k] ?? partText(p))}</textarea><div class="row" style="margin-top:6px"><button class="primary" data-save>저장</button><button data-reset>원래대로</button></div>`;
      box.querySelector("[data-save]").addEventListener("click", () => {
        st.edits[k] = box.querySelector("textarea").value;
        rer();
      });
      box.querySelector("[data-reset]").addEventListener("click", () => {
        delete st.edits[k];
        rer();
      });
    }));
    root.querySelectorAll("[data-ai]").forEach((b) => b.addEventListener("click", async () => {
      const k = b.dataset.ai, box = bodyOf(k), p = partOf(k);
      const pick = watchAi();
      if (pick.mode === "static" && !pick.staticModel) return renderAiNote(box, "모델 ID를 먼저 적어 주세요.");
      const ctrl = new AbortController();
      box.dataset.mode = "ai";
      box.hidden = false;
      box.innerHTML = `<div class="rr" style="border:0"><span class="rb-spin-s"></span><span>AI가 다듬는 중… (${esc(AI_MODES.find(([v]) => v === pick.mode)?.[1] ?? "")})</span><button data-stop>${ic("x", 13)} 그만</button></div>`;
      box.querySelector("[data-stop]").addEventListener("click", () => {
        ctrl.abort();
        box.hidden = true;
      });
      const original = st.edits[k] ?? partText(p);
      const world = [String(T.card.desc ?? ""), ...T.parts.filter((x) => x.kind === "lore").slice(0, 12).map((x) => `${partLabel(x)}: ${partText(x).slice(0, 300)}`)].join("\n").slice(0, 4e3);
      const isChar = detectCharacters(S).some((c) => c.loreKeys.includes(k));
      try {
        const out = await runAI(api, isChar ? adaptCharacterPrompt({ targetWorld: world, character: original }) : conflictTidyPrompt({ a: world, b: original }), pick, ctrl.signal);
        if (ctrl.signal.aborted) return;
        const parts = wordDiff(original, out).map((d) => d.op === "same" ? esc(d.text) : d.op === "add" ? `<ins>${esc(d.text)}</ins>` : `<del>${esc(d.text)}</del>`).join("");
        box.innerHTML = `<div class="rv-cap">AI 제안 <span class="muted">— <del>원래 글</del> <ins>AI가 바꾼 글</ins></span></div><div class="rv-diffbox">${parts}</div>
          <div class="row" style="margin-top:6px"><button class="primary" data-use>AI 버전 쓰기</button><button data-tweak>고쳐서 쓰기</button><button data-keep>원래대로</button></div>`;
        box.querySelector("[data-use]").addEventListener("click", () => {
          st.edits[k] = out;
          rer();
        });
        box.querySelector("[data-keep]").addEventListener("click", () => box.hidden = true);
        box.querySelector("[data-tweak]").addEventListener("click", () => {
          box.dataset.mode = "edit";
          box.innerHTML = `<textarea class="mg-ta">${esc(out)}</textarea><div class="row" style="margin-top:6px"><button class="primary" data-save>저장</button></div>`;
          box.querySelector("[data-save]").addEventListener("click", () => {
            st.edits[k] = box.querySelector("textarea").value;
            rer();
          });
        });
      } catch (err) {
        if (!ctrl.signal.aborted) renderAiNote(box, `AI 다듬기 실패: ${err?.message ?? err}`);
      }
    }));
    root.querySelector("#mg-back").addEventListener("click", () => renderMergePick());
    root.querySelector("#mg-go").addEventListener("click", () => commitMerge().catch((err) => {
      busy = false;
      if (err instanceof MergeSelfCheckError || err?.name === "MergeSelfCheckError") return renderResult(null, null, `합친 결과를 검사하다 문제를 찾아서 저장하지 않았어요:\n${(err.problems ?? []).slice(0, 6).map((x) => `· ${x.reason}`).join("\n") || err.message}\n문제가 되는 항목을 빼고 다시 해 보세요.`);
      if (err instanceof Busy) return renderResult(null, null, err.message);
      renderResult(null, null, err?.message ?? String(err));
    }));
  }
  function renderAiNote(box, msg) {
    box.hidden = false;
    box.innerHTML = `<div class="err" style="margin:0">${esc(msg)}</div>`;
  }
  let aiPick = null;
  function watchAi() {
    return aiPick ?? { mode: "submodel" };
  }
  function saveAi(p) {
    aiPick = p;
    api.pluginStorage.setItem("rbm:aiModel:v1", JSON.stringify(p)).catch(() => {
    });
  }
  api.pluginStorage.getItem("rbm:aiModel:v1").then((raw) => {
    try {
      const j = raw ? JSON.parse(raw) : null;
      if (j?.mode) aiPick = j;
    } catch {
    }
  }).catch(() => {
  });
  // 합친 결과를 실제로 쓴다: 백업 → 다시 확인 → 저장 → 확인. 출처 기록은 카드 안에 넣어 RisuTide와 같은 형식으로
  async function writeMerged(ti, chaId, before, card, provenance, source) {
    busy = true;
    renderProgress("저장하는 중…", 100, "바꾸기 전 상태를 백업하는 중…");
    let fresh = await api.getCharacterFromIndex(ti);
    if (fresh?.chaId !== chaId) {
      const all = (await loadDb(true)).characters;
      ti = all.findIndex((c) => c?.chaId === chaId);
      fresh = ti < 0 ? null : await api.getCharacterFromIndex(ti);
    }
    if (!fresh) throw new Error("봇을 찾지 못했어요. 저장하지 않았어요.");
    if (isGenerating(fresh)) throw new Busy();
    if (stableJson(charFields(fresh)) !== stableJson(charFields(before))) throw new Error("검토하는 사이 봇이 바뀌었어요. 다시 해 주세요. (바뀐 것은 없어요)");
    preserveTargetLicense(card, fresh);
    card.extentions = { ...card.extentions ?? {}, risutide: { ...card.extentions?.risutide ?? {}, merge: encodeCardProvenance(provenance) } };
    const merged = writeCharFields(fresh, charFields(fresh), card);
    const chatPack = await captureChats(ti, fresh);
    const snapshot = backupSnapshot("character", fresh);
    if (chatPack?.chats.length) snapshot.__chats = chatPack.chats;
    const backupRec = await store.addBackup({ kind: "character", target: chaId, name: fresh.name, snapshot, note: "합치기 전", summary: source }).catch((e) => {
      throw new Error(`백업을 만들지 못해 아무것도 바꾸지 않았어요: ${e?.message ?? e}`);
    });
    updateProgress(100, "봇 저장 중…");
    const last = await api.getCharacterFromIndex(ti);
    if (isGenerating(last) || (last?.chats ?? []).length !== (fresh.chats ?? []).length) throw new Busy();
    await api.setCharacterToIndex(ti, merged);
    const check = await api.getCharacterFromIndex(ti);
    if (check?.chaId !== chaId) throw new Error("저장 후 확인에서 봇이 예상과 달라요. [백업·되돌리기]에서 되돌릴 수 있어요.");
    busy = false;
    return { merged, backupRec };
  }
  async function commitMerge() {
    const { inp, sel, st } = mg.review;
    const choices = { roles: st.roles, composites: {}, edits: st.edits, lowLevel: !!st.lowLevel, name: sel.plan.name, exclude: [...st.exclude] };
    const res = applyScopedSelection(sel, choices);
    const problems = selfCheck(res.card, []).problems;
    if (problems.length) {
      const e = new Error("self check");
      e.name = "MergeSelfCheckError";
      e.problems = problems;
      throw e;
    }
    if (st.lowLevel) res.card.lowLevelAccess = true;
    const chosen = sel.plan.parts.filter((p) => p.sourceId === inp.S.meta.id && !st.exclude.has(p.key)).length;
    const { merged, backupRec } = await writeMerged(inp.ti, inp.target.chaId, inp.target, res.card, res.provenance, `${inp.srcName}에서 ${mg.scope === "full" ? "합치기" : "가져오기"} · ${chosen}개`);
    mg.picked = mg.world = null;
    renderResult({ kind: "character", name: merged.name, updated: true, uploadedCount: 0, assets: characterAssetKeys(merged).length, lore: (merged.globalLore ?? []).length, chats: (merged.chats ?? []).length, backup: true, backupRec, summary: `${inp.srcName}에서 ${chosen}개를 ${mg.scope === "full" ? "합쳤어요" : "가져왔어요"}`, note: sel.plan.detachModuleAfter ? "가져온 모듈은 이제 이 봇 안에 들어 있어요. 같은 모듈이 따로 켜져 있으면 겹칠 수 있으니 확인해 주세요." : "" });
  }
  // ---- 출처 하나만 새 버전으로 ----
  async function renderSourceUpdatePick(sourceId) {
    heading = "다른 봇에서 가져오기 · 합치기";
    const { db, chars, modules } = await mergeData();
    const ti = db.characters.findIndex((c) => c?.chaId === mg.targetId);
    const target = await api.getCharacterFromIndex(ti);
    const prov = await loadProvenance(api, target);
    const src = prov?.sources.find((s) => s.id === sourceId);
    if (!src) throw new Error("출처 기록을 찾지 못했어요.");
    const same = (n) => String(n ?? "").replace(/\s+/g, "").toLowerCase() === String(src.name).replace(/\s+/g, "").toLowerCase();
    const list = src.kind === "module" ? modules.map((m) => ({ v: "m:" + m.id, n: m.name, hit: m.id === src.moduleId || same(m.name) })) : chars.filter(({ c }) => c.chaId !== mg.targetId).map(({ c }) => ({ v: "c:" + c.chaId, n: nameOf(c), hit: c.chaId === sourceId || same(c.name) }));
    list.sort((a, b) => b.hit - a.hit);
    frame(`<div class="card"><div class="rv-dh" style="margin-bottom:10px"><span class="ri big">${ic("refresh", 18)}</span><div><b>'${esc(src.name)}' 새 버전으로 업데이트</b><div class="muted">${esc(nameOf(target))}에 합쳐진 이 출처의 자료만 새 버전으로 바꿔요. 다른 출처와 내 수정은 그대로예요.</div></div></div>
        <div class="muted" style="margin-bottom:6px">새 버전을 먼저 리스에 가져온 뒤 여기서 골라 주세요.</div>
        <select id="su-src" style="margin-top:0">${list.map((x) => `<option value="${esc(x.v)}">${esc(x.n || "(이름 없음)")}${x.hit ? " ✓" : ""}</option>`).join("")}</select></div>
      <div class="row"><button class="primary" id="su-next">비교하기</button><button id="mg-back">뒤로</button>${closeBtn("취소")}</div>`);
    root.querySelector("#mg-back").addEventListener("click", () => renderMergeStart(mg.targetId));
    root.querySelector("#su-next").addEventListener("click", async () => {
      try {
        const v = root.querySelector("#su-src").value;
        let incoming;
        if (v.startsWith("m:")) incoming = moduleToMergeInput(modules.find((m) => m.id === v.slice(2))).card;
        else incoming = await api.getCharacterFromIndex(db.characters.findIndex((c) => c?.chaId === v.slice(2)));
        await renderSourceUpdate(ti, target, prov, sourceId, incoming, v);
      } catch (err) {
        renderResult(null, null, err?.message ?? String(err));
      }
    });
  }
  async function renderSourceUpdate(ti, target, prov, sourceId, incoming, pickedValue, choices = /* @__PURE__ */ new Map()) {
    heading = "다른 봇에서 가져오기 · 합치기";
    const cur = charFields(target);
    const { plan, nextProvenance } = planSourceUpdate(target, prov, sourceId, incoming);
    protectSourceImages(plan, cur, charFields(incoming), prov, sourceId, [], true);
    const prot = protectedImageIds(plan.imageProtection);
    const spec = charSpec({ fields: {}, risuFields: {}, refs: {} });
    const keepOf = (keep) => new Set([...keep, ...prot]);
    const sumOf = (keep) => summarizeCharacterUpdate(target, applyPartialUpdatePlan({ current: cur, plan, keep: keepOf(keep) }), target.additionalAssets ?? []);
    const keep0 = keepSet(plan, choices, true);
    const src = prov.sources.find((s) => s.id === sourceId);
    frame(`<div class="card">
        <div style="margin-bottom:8px">${kindTag("character")}<b>${esc(nameOf(target))}</b> <span class="muted">· '${esc(src.name)}' 출처만 새 버전으로</span></div>
        ${plan.items.length ? reviewBox(plan, choices, true, keep0, sumOf(keep0), spec.label) : '<div class="ok">이 출처는 바뀐 게 없어요.</div>'}
        ${prot.size ? `<div class="muted" style="margin-top:6px">다른 출처의 이미지 ${prot.size}개는 그대로 둬요.</div>` : ""}
      </div>
      <div class="row">${plan.items.length ? '<button class="primary" id="go">업데이트</button>' : ""}<button id="back">뒤로</button>${closeBtn("취소")}</div>`);
    if (plan.items.length) bindReview(plan, choices, true, cur, spec.label, (keep, compact) => summaryHtml(plan, keep, sumFix(sumOf(keep)), spec.label, compact), () => renderSourceUpdate(ti, target, prov, sourceId, incoming, pickedValue, choices));
    root.querySelector("#back").addEventListener("click", () => renderSourceUpdatePick(sourceId));
    root.querySelector("#go")?.addEventListener("click", async () => {
      try {
        const keep = keepOf(keepSet(plan, choices, true));
        const card = applyPartialUpdatePlan({ current: cur, plan, keep });
        const { merged, backupRec } = await writeMerged(ti, target.chaId, target, card, nextProvenance, `'${src.name}' 출처 업데이트`);
        renderResult({ kind: "character", name: merged.name, updated: true, uploadedCount: 0, assets: characterAssetKeys(merged).length, lore: (merged.globalLore ?? []).length, chats: (merged.chats ?? []).length, backup: true, backupRec, summary: `'${src.name}' 출처를 새 버전으로 바꿨어요`, note: "" });
      } catch (err) {
        busy = false;
        renderResult(null, null, err instanceof Busy ? err.message : err?.message ?? String(err));
      }
    });
  }
  // ---- 가져온 자료 떼어내기 ----
  async function renderDetach(sourceId) {
    heading = "다른 봇에서 가져오기 · 합치기";
    const { db } = await mergeData();
    const ti = db.characters.findIndex((c) => c?.chaId === mg.targetId);
    const target = await api.getCharacterFromIndex(ti);
    const prov = await loadProvenance(api, target);
    const src = prov?.sources.find((s) => s.id === sourceId);
    if (!src) throw new Error("출처 기록을 찾지 못했어요.");
    const det = prepareDetach(target, prov, sourceId);
    const items = det.prepared.plan.items;
    const reasons = det.prepared.plan.detachReasons ?? {};
    const keep = new Set(items.filter((it) => it.keepByDefault).map((it) => it.id));
    const spec = charSpec({ fields: {}, risuFields: {}, refs: {} });
    frame(`<div class="card">
        <div class="rv-dh" style="margin-bottom:10px"><span class="ri big">${ic("trash", 18)}</span><div><b>'${esc(src.name)}'에서 가져온 자료 떼어내기</b><div class="muted">기록과 같아 안전하게 뗄 수 있는 것만 미리 골라 뒀어요. 고쳤거나 다른 출처와 함께 쓰는 자료는 남겨 둬요.</div></div></div>
        ${items.length ? `<div class="mg-list">${items.map((it) => `<label class="mg-part${keep.has(it.id) ? " off" : ""}" style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" data-d="${esc(it.id)}" ${keep.has(it.id) ? "" : "checked"}><span class="ri">${ic(it.id.startsWith("order:") ? "list" : { field: "text", lore: "book", regex: "code", trigger: "zap", asset: "image", emotion: "image" }[it.unit] ?? "text", 14)}</span><span class="rt"><b>${esc(itemLabel(it, spec.label))}</b><span>${esc(reasons[it.id] ?? (keep.has(it.id) ? "남겨 둠" : "떼어냄"))}</span></span></label>`).join("")}</div>` : '<div class="ok">떼어낼 자료가 없어요.</div>'}
      </div>
      <div class="row">${items.length ? '<button class="primary danger" id="dt-go">떼어내기</button>' : ""}<button id="mg-back">뒤로</button>${closeBtn("취소")}</div>`);
    root.querySelectorAll("[data-d]").forEach((c) => c.addEventListener("change", () => {
      c.checked ? keep.delete(c.dataset.d) : keep.add(c.dataset.d);
      c.closest(".mg-part").classList.toggle("off", !c.checked);
    }));
    root.querySelector("#mg-back").addEventListener("click", () => renderMergeStart(mg.targetId));
    root.querySelector("#dt-go")?.addEventListener("click", async () => {
      try {
        const res = applyPreparedDetach(det, keep);
        const { merged, backupRec } = await writeMerged(ti, target.chaId, target, res.card, res.provenance, `'${src.name}' 떼어내기`);
        renderResult({ kind: "character", name: merged.name, updated: true, uploadedCount: 0, assets: characterAssetKeys(merged).length, lore: (merged.globalLore ?? []).length, chats: (merged.chats ?? []).length, backup: true, backupRec, summary: `'${src.name}'에서 가져온 자료 ${items.length - keep.size}개를 떼어냈어요`, note: "" });
      } catch (err) {
        busy = false;
        renderResult(null, null, err instanceof Busy ? err.message : err?.message ?? String(err));
      }
    });
  }
  function renderNewCharPlan(file, incoming, db) {
    const ch = incoming.character;
    const knownKeys = knownKeysOf(db);
    const plan = planCharacter({}, ch, knownKeys, false);
    const name = uniqueDisplayName(ch.fields.name, db.characters);
    const s = plan.stat;
    const generating = db.characters.some(isGenerating);
    frame(`<div class="card">
            <div style="margin-bottom:8px">${kindTag("character")}새 캐릭터 <b>${esc(name)}</b> 추가</div>
            <div class="grid">
              <b>올릴 에셋</b><span><b>${s.upload}개</b> (${fmtBytes2(s.uploadBytes)})${s.reused ? ` · 서버에 이미 있음 ${s.reused}` : ""}</span>
              <b>추가 에셋</b><span>${plan.additional.length}개</span><b>감정 이미지</b><span>${plan.emotions.length}개</span>
              <b>로어북</b><span>${(ch.fields.globalLore ?? []).length}개</span>
            </div>
            ${notes(incoming, ch.risuFields.lowLevelAccess, s.upload)}
            ${ch.offSpec ? `<div class="warn">옛 형식(스펙 밖) 카드입니다. 기본 정보만 가져옵니다.</div>` : ""}
            ${generating ? `<div class="err">다른 캐릭터가 지금 응답을 생성하는 중이에요. 생성이 끝난 뒤 추가해 주세요.</div>` : ""}
            <p class="muted" style="margin:10px 0 0">플러그인은 캐릭터를 추가할 때 캐릭터 목록 전체를 다시 저장합니다(RisuBard 플러그인 API의 한계). 저장 직전에 응답 생성 중인지 다시 확인합니다.</p>
          </div>${planFooter("추가")}`);
    bindPlan(file, incoming, db, () => {
    }, async () => {
      const uploaded = await uploadWithProgress(file, plan.toUpload);
      updateProgress(100, "캐릭터 추가 중…");
      const fresh = (await loadDb(true)).characters;
      if (fresh.some(isGenerating)) throw new Busy();
      const created = buildNewCharacter(ch, plan, uploaded, fresh);
      await hooks.created?.(created.chaId);
      fresh.push(created);
      await api.setDatabaseLite({ characters: fresh });
      await ensureInOrder(created.chaId);
      const idx = fresh.length - 1;
      const check = await api.getCharacterFromIndex(idx);
      if (check?.chaId !== created.chaId) throw new Error("추가 후 확인에서 캐릭터를 찾지 못했습니다. 캐릭터 목록을 확인해 주세요.");
      try {
        await api.setChatToIndex(idx, 0, created.chats[0]);
      } catch {
      }
      let note2 = "";
      try {
        const v0 = charIncomingView(ch, plan, uploaded);
        await store.setFingerprint("c", created.chaId, fingerprintCard(charFields(v0)));
        await store.setBaseline(`c:${created.chaId}`, v0).catch(() => {
        });
      } catch {
        note2 = "다음 업데이트용 원본 기록을 저장하지 못했어요.";
      }
      links?.set(linkKey(incoming), created.chaId);
      busy = false;
      renderResult({ kind: "character", name: created.name, updated: false, uploadedCount: uploaded.size, assets: characterAssetKeys(created).length, lore: created.globalLore.length, note: note2 });
    });
  }
  async function renderBackups(msg) {
    busy = false;
    renderProgress("백업 목록 읽는 중…", 100, "");
    let list = [];
    try {
      list = await store.listBackups();
    } catch (e) {
      return renderResult(null, null, e?.message ?? String(e));
    }
    frame(`${msg ? `<div class="ok">${esc(msg)}</div>` : ""}
          <div class="card"><div style="margin-bottom:6px">업데이트 전 백업 (항목마다 최근 ${5}개)</div>
            ${list.length ? list.map((b) => `<div class="opt" style="cursor:default;align-items:center">
                <div style="flex:1">${kindTag(b.kind)}<b>${esc(b.name)}</b><div class="muted">${fmtDate(b.t)} · ${esc(b.note || "")} · ${fmtBytes2(b.size ?? 0)}${b.chatCount ? ` · 채팅 ${b.chatCount}개` : ""}</div></div>
                <button data-restore="${esc(b.id)}">되돌리기</button>${b.src === "tide" ? "" : `<button class="danger" data-del="${esc(b.id)}">삭제</button>`}</div>`).join("") : '<div class="muted">아직 백업이 없어요. 업데이트할 때마다 바꾸기 전 상태가 자동으로 저장됩니다.</div>'}
          </div>
          <p class="muted">백업은 플러그인 저장소에 조각으로 압축해 저장하고, 같은 내용은 한 번만 저장해요. 이미지 파일은 백업에 복사하지 않으니 앱 저장소에 남아 있어야 되돌릴 때 보여요. RisuTide에서 만든 백업도 이 기기에 있으면 함께 보여요(여기서는 지우지 않아요).</p>
          <div class="row"><button id="back">뒤로</button>${closeBtn()}</div>`);
    root.querySelector("#back").addEventListener("click", () => renderStart());
    root.querySelectorAll("[data-del]").forEach((el) => el.addEventListener("click", async () => {
      if (!confirm("이 백업을 지울까요? 지우면 이 시점으로 되돌릴 수 없어요.")) return;
      await store.removeBackup(el.dataset.del);
      renderBackups("백업을 지웠어요.");
    }));
    root.querySelectorAll("[data-restore]").forEach((el) => el.addEventListener("click", () => {
      const rec = list.find((b) => b.id === el.dataset.restore);
      restoreBackup(rec).catch((err) => renderResult(null, null, err instanceof Busy ? err.message : `되돌리지 못했어요: ${err?.message ?? err}`));
    }));
  }
  async function restoreBackup(rec) {
    busy = true;
    renderProgress(`되돌리는 중: ${rec.name}`, 100, "백업 읽는 중…");
    const { __chats: savedChats, ...snap } = await store.loadBackup(rec);
    let extra = "";
    if (rec.kind === "character") {
      const all = (await loadDb(true)).characters;
      const idx = all.findIndex((c) => c?.chaId === rec.target && !c.trashTime);
      if (idx < 0) {
        // 지운 봇: 백업으로 새로 되살린다 (에셋 파일이 앱 저장소에 남아 있어야 이미지가 보여요)
        const fresh = all.filter(Boolean);
        if (fresh.some(isGenerating)) throw new Busy();
        const base0 = newCharacterBase({ fields: {}, risuFields: {}, refs: {} });
        const body = Array.isArray(snap.__tide) ? Object.fromEntries(snap.__tide.map((k) => [k, snap[k]])) : snap;
        const { __tide, ...card } = body;
        const created = { ...base0, ...card, chaId: newId(), chats: [], trashTime: void 0 };
        delete created.trashTime;
        const n = appendBackupChats(created, savedChats);
        if (!created.chats.length) created.chats = base0.chats ?? [{ message: [], note: "", name: "Chat 1", localLore: [], fmIndex: -1, id: newId() }];
        created.name = uniqueDisplayName(created.name || rec.name, fresh.filter((c) => !c.trashTime));
        await hooks.created?.(created.chaId);
        fresh.push(created);
        await api.setDatabaseLite({ characters: fresh });
        await ensureInOrder(created.chaId);
        await store.setFingerprint("c", created.chaId, await store.backupFingerprint(rec)).catch(() => {
        });
        busy = false;
        return renderBackups(`지운 봇 '${created.name}'을(를) 백업에서 되살렸어요${n ? ` (채팅 ${n}개 포함)` : ""}. 이미지 파일이 앱 저장소에 없으면 일부 이미지가 안 보일 수 있어요.`);
      }
      const cur = await api.getCharacterFromIndex(idx);
      if (!cur || cur.chaId !== rec.target) throw new Error("캐릭터를 다시 찾지 못했어요.");
      if (isGenerating(cur)) throw new Busy();
      await store.addBackup({ kind: "character", target: cur.chaId, name: cur.name, snapshot: backupSnapshot("character", cur), note: "되돌리기 전" });
      const restored = restoreFromBackup("character", cur, snap);
      remapGreetings(restored, charFields(cur), charFields(restored));
      const n = appendBackupChats(restored, savedChats);
      if (n) extra = ` 백업에만 있던 채팅 ${n}개를 새 채팅으로 되살렸어요.`;
      await api.setCharacterToIndex(idx, restored);
      const check = await api.getCharacterFromIndex(idx);
      if (check?.chaId !== rec.target || (check.chats ?? []).length !== (restored.chats ?? []).length) throw new Error("되돌린 뒤 확인에서 캐릭터가 예상과 다릅니다.");
      await store.setFingerprint("c", rec.target, await store.backupFingerprint(rec)).catch(() => {
      });
    } else {
      await commit(api, async (d) => {
        const e = d.entries.find((x) => x.module?.id === rec.target);
        if (!e) {
          d.entries.push({ module: { ...snap, id: rec.target }, enabled: true });
          return;
        }
        await store.addBackup({ kind: "module", target: e.module.id, name: e.module.name, snapshot: backupSnapshot("module", e.module), note: "되돌리기 전" });
        e.module = restoreFromBackup("module", e.module, snap);
      });
      await store.setFingerprint("m", rec.target, await store.backupFingerprint(rec)).catch(() => {
      });
    }
    busy = false;
    renderBackups(`${rec.name}을(를) ${fmtDate(rec.t)} 상태로 되돌렸어요. 지금 채팅은 그대로예요.${extra}`);
  }
  function keepBox(on) {
    return `<label class="chk"><input type="checkbox" id="keep" ${on ? "checked" : ""}>
          <span>새 버전에 없는 기존 로어북·에셋 유지<br><span class="muted">직접 추가한 항목을 지킵니다. 작성자가 지운 항목도 남을 수 있습니다.</span></span></label>`;
  }
  function notes(incoming, lowLevelNew, uploads) {
    return [
      ...(incoming.notes ?? []).map((n) => `<div class="warn">${esc(n)}</div>`),
      lowLevelNew ? `<div class="warn">이 버전은 <b>저수준 접근(lowLevelAccess)</b>을 사용합니다. 믿을 수 있는 파일인지 확인하세요.</div>` : "",
      uploads > 300 ? `<div class="warn">올릴 에셋이 ${uploads}개입니다. 서버 상태에 따라 오래 걸릴 수 있습니다. 진행 중에 예상 시간이 표시됩니다.</div>` : ""
    ].join("");
  }
  async function uploadWithProgress(file, list) {
    busy = true;
    stopRequested = false;
    renderProgress(`에셋 올리는 중 (${list.length}개)`, 0, list.length ? "시작하는 중…" : "올릴 에셋 없음");
    const uploaded = await uploadAssets(file, list, (data) => api.saveAsset(data), {
      shouldStop: () => stopRequested,
      onProgress: (done, all, bytes, ms, limit) => {
        const per = ms / done;
        updateProgress(done / all * 100, `${done} / ${all} · ${fmtBytes2(bytes)} · 개당 ${(per / 1e3).toFixed(2)}초 · 동시 ${limit} · 남은 시간 약 ${fmtTime(per * (all - done))}`);
      }
    });
    if (stopRequested) throw new Cancelled();
    return uploaded;
  }
  function renderResult(res, info, error) {
    busy = false;
    const what = res ? res.kind === "character" ? "캐릭터" : "모듈" : "";
    frame(`${res ? `<div class="ok"><b>${esc(res.name)}</b> ${what} ${res.updated ? "업데이트" : "추가"} 완료<br>
              <span class="muted">새로 올린 에셋 ${res.uploadedCount}개 · 전체 에셋 ${res.assets}개 · 로어북 ${res.lore}개${res.chats !== void 0 ? ` · 채팅 ${res.chats}개 유지` : ""}${res.backup ? " · 바꾸기 전 상태를 백업함" : ""}</span></div>
              ${res.note ? `<div class="warn">${esc(res.note)}</div>` : ""}` : ""}
          ${info ? `<div class="card">${esc(info)}</div>` : ""}
          ${error ? `<div class="err">${esc(error)}</div><p class="muted">기존 항목은 바뀌지 않았습니다. 이미 올라간 에셋은 쓰이지 않으면 서버 정리 때 지워집니다.</p>` : ""}
          ${res?.summary ? `<div class="card"><div class="grid"><b>바뀐 내용</b><span>${esc(res.summary)}</span></div></div>` : ""}
          ${queue.length ? `<div class="card">대기 중인 파일 ${queue.length}개 — 다음: <b>${esc(queue[0].name)}</b></div>` : ""}
          <div class="row">${queue.length ? '<button class="primary" id="nextq">다음 파일</button>' : '<button class="primary" id="again">다른 파일</button>'}${res?.backupRec ? '<button id="undo">바로 되돌리기</button>' : ""}${res?.backup ? '<button id="tobk">백업·되돌리기</button>' : ""}${closeBtn()}</div>`);
    root.querySelector("#again")?.addEventListener("click", () => renderStart());
    root.querySelector("#nextq")?.addEventListener("click", () => runQueue());
    root.querySelector("#tobk")?.addEventListener("click", () => renderBackups());
    root.querySelector("#undo")?.addEventListener("click", () => restoreBackup(res.backupRec).catch((err) => renderResult(null, null, err instanceof Busy ? err.message : `되돌리지 못했어요: ${err?.message ?? err}`)));
  }
  async function syncColorScheme() {
    let type = "dark";
    try {
      const cs = await api.getColorScheme();
      if (cs?.scheme?.type === "light") type = "light";
    } catch {
    }
    document.documentElement.style.colorScheme = type;
  }
  function runQueue() {
    const f = queue.shift();
    if (!f) return renderStart();
    startScan(f).catch((err) => renderStart(err instanceof Cancelled ? void 0 : err?.message ?? String(err)));
  }
  const show = async () => {
    const hostEl = host?.();
    if (hostEl && overlay.parentNode !== hostEl) hostEl.appendChild(overlay);
    else await syncColorScheme();
    overlay.className = "";
    await api.showContainer("fullscreen");
  };
  return {
    async open() {
      if (!busy && overlay.className === "hidden") renderStart();
      await show();
    },
    async openBackups() {
      if (!busy) renderBackups();
      await show();
    },
    async restore(rec) {
      if (busy) return show();
      await show();
      return restoreBackup(rec).catch((err) => renderResult(null, null, err instanceof Busy ? err.message : `되돌리지 못했어요: ${err?.message ?? err}`));
    },
    async startWithFile(file) {
      return this.startWithFiles([file]);
    },
    async startWithFiles(files) {
      if (busy) {
        queue.push(...files);
        return show();
      }
      queue = [...files];
      renderStart();
      await show();
      runQueue();
    },
    /** 합치기 화면 (넣을 봇을 미리 고를 수 있음) */
    async openMerge(chaId) {
      if (busy) return show();
      if (chaId) mg = { targetId: chaId, src: null, scope: "characters" };
      await show();
      return renderMergeStart(chaId).catch((err) => renderResult(null, null, err?.message ?? String(err)));
    },
    /** 감지된 받은 모듈들을 "업데이트할까요?"로 물어본다 */
    async offerModules(items) {
      for (const it of items) if (!modQueue.some((x) => x.copyId === it.copyId)) modQueue.push(it);
      if (busy) return;
      renderModCopyOffer();
      await show();
    },
    /** 감지된 받은 사본들을 "이어 붙일까요?"로 물어본다 */
    async offerCopies(items) {
      for (const it of items) if (!copyQueue.some((x) => x.copyId === it.copyId)) copyQueue.push(it);
      if (busy) return;
      renderCopyOffer();
      await show();
    },
    get busy() {
      return busy;
    }
  };
}
