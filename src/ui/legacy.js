import { Cancelled, newId, stableJson } from '../engine/util.js';
import { readIncoming } from '../engine/formats/index.js';
import { findCandidates, normalizeName } from '../engine/match.js';
import { collectKnownKeys, planAssets } from '../engine/module.js';
import { buildNewCharacter, characterAssetKeys, characterView, planCharacter, uniqueDisplayName } from '../engine/character.js';
import { uploadAssets } from '../engine/upload.js';
import { MOD_SPEC, USER_KEYS, applyView, charIncomingView, charSpec, merge3, modIncomingView, pickView, summarize } from '../engine/merge3.js';
import { createStore } from '../engine/store.js';
import { Busy, backupSnapshot, isGenerating, restoreFromBackup } from '../engine/safety.js';
import { commit, entriesOf, readDb } from '../data/modules.js';

export async function createLegacy(api, { onExit, zIndex = 100, host, links } = {}) {
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
  function frame(body) {
    overlay.innerHTML = `<div class="win" role="dialog" aria-modal="true">
            <div class="head"><h1>${ICON}${TITLE2}</h1><button class="x" id="x" title="${busy ? "취소" : "닫기"}">${X}</button></div>
            <p class="sub">캐릭터·모듈을 가져옵니다. 이미 있는 항목의 새 버전이면 바뀐 것만 올려 덮어쓰고, 채팅과 모듈 연결은 그대로 둡니다.</p>
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
  const KIND_KO2 = { update: "새 버전 적용", mine: "내 수정 유지", conflict: "충돌", added: "추가", removed: "삭제", kept: "기존 유지" };
  function mergeBox(m, choices, keepExistingOnly) {
    const s = summarize(m.items);
    const conflicts = m.items.filter((i) => i.kind === "conflict");
    const mine = m.items.filter((i) => i.kind === "mine");
    const short = (v) => {
      const t = typeof v === "string" ? v : v === void 0 ? "(없음)" : JSON.stringify(v);
      return esc(t.length > 140 ? t.slice(0, 140) + "…" : t);
    };
    const preview = (v) => Array.isArray(v) ? short(v[1] ?? v) : v && typeof v === "object" && "content" in v ? short(v.content) : short(v);
    return `<div class="grid" style="margin-top:6px">
              <b>바뀌는 것</b><span>새 버전 적용 ${s.update} · 추가 ${s.added} · 삭제 ${s.removed}${s.kept ? ` · 기존 유지 ${s.kept}` : ""}</span>
              ${m.hasBase ? `<b>내 수정</b><span>유지 ${s.mine}</span><b>충돌</b><span>${s.conflict ? `<b class="hl">${s.conflict}개</b> (아래에서 고르기)` : "없음"}</span>` : ""}
            </div>
            ${m.hasBase ? "" : `<div class="warn">이 항목은 처음 받았을 때의 기록이 없어 <b>지금 내용과 새 버전만</b> 비교합니다. 직접 고친 내용도 새 버전으로 바뀔 수 있어요. 이번 업데이트부터 기록이 남아, 다음 업데이트부터는 내 수정을 구분해 지킵니다.</div>
              <label class="chk"><input type="checkbox" id="keep" ${keepExistingOnly ? "checked" : ""}><span>새 버전에 없는 기존 로어북·에셋 유지<br><span class="muted">직접 추가한 항목을 지킵니다. 제작자가 지운 항목도 남을 수 있습니다.</span></span></label>`}
            ${conflicts.length ? `<details open style="margin-top:10px"><summary style="cursor:pointer">충돌 ${conflicts.length}개 — 나도 고치고 제작자도 바꾼 항목</summary>
              ${conflicts.map((c) => `<div class="opt" style="display:block;cursor:default">
                <div style="margin-bottom:4px">${esc(c.label)}</div>
                <div class="muted">지금: ${preview(c.cur)}</div><div class="muted">새 버전: ${preview(c.inc)}</div>
                <div class="row" style="margin-top:6px">
                  <label><input type="radio" name="c:${esc(c.id)}" data-cid="${esc(c.id)}" value="inc" ${(choices.get(c.id) ?? "inc") === "inc" ? "checked" : ""}> 새 버전</label>
                  <label><input type="radio" name="c:${esc(c.id)}" data-cid="${esc(c.id)}" value="cur" ${choices.get(c.id) === "cur" ? "checked" : ""}> 내 것 유지</label>
                </div></div>`).join("")}</details>` : ""}
            ${mine.length ? `<details style="margin-top:8px"><summary class="muted" style="cursor:pointer">그대로 두는 내 수정 ${mine.length}개</summary>
              <div class="muted" style="margin-top:6px">${mine.slice(0, 60).map((i) => esc(i.label)).join("<br>")}${mine.length > 60 ? "<br>…" : ""}</div></details>` : ""}`;
  }
  function bindMergeBox(rerender, choices) {
    root.querySelectorAll("input[data-cid]").forEach((el) => el.addEventListener("change", () => {
      choices.set(el.dataset.cid, el.value);
      rerender();
    }));
  }
  async function withPreparing(fn) {
    renderProgress("비교 준비 중…", 100, "원본 기록을 읽는 중");
    try {
      await fn();
    } catch (err) {
      renderResult(null, null, err?.message ?? String(err));
    }
  }
  function renderModPlan(file, incoming, db, targetIndex, keepExistingOnly, choices = /* @__PURE__ */ new Map(), base) {
    const target = targetIndex === null ? null : db.modules[targetIndex];
    if (target && base === void 0) return withPreparing(async () => renderModPlan(file, incoming, db, targetIndex, keepExistingOnly, choices, await store.getBaseline(`m:${target.id}`)));
    const knownKeys = knownKeysOf(db);
    const plan = planAssets(target, incoming.assets, knownKeys, false, incoming.icon);
    const incView = modIncomingView(incoming, plan, /* @__PURE__ */ new Map(), knownKeys);
    const spec = MOD_SPEC;
    const m = target ? merge3(base, pickView(target, [...spec.scalars, ...Object.keys(spec.lists)]), incView, spec, { choices, keepExistingOnly }) : null;
    const s = plan.stat;
    frame(`<div class="card">
            <div style="margin-bottom:8px">${kindTag("module")}${target ? `<b>${esc(target.name)}</b> 업데이트${target.name !== incoming.module.name ? ` → 이름이 <b>${esc(incoming.module.name)}</b>(으)로 바뀝니다` : ""}` : `새 모듈 <b>${esc(incoming.module.name)}</b> 추가`}</div>
            <div class="grid"><b>올릴 에셋</b><span><b>${s.upload}개</b> (${fmtBytes2(s.uploadBytes)})${s.reused ? ` · 서버에 이미 있음 ${s.reused}` : ""}</span>
              ${target ? "" : `<b>에셋</b><span>${incoming.assets.length}개</span><b>로어북</b><span>${(incoming.module.lorebook ?? []).length}개</span>`}</div>
            ${m ? mergeBox(m, choices, keepExistingOnly) : ""}
            ${notes(incoming, incoming.module.lowLevelAccess && !target?.lowLevelAccess, s.upload)}
            <p class="muted" style="margin:10px 0 0">모듈 연결(활성 상태)은 바뀌지 않습니다.${target ? " 바꾸기 전 상태를 백업하므로 [백업·되돌리기]에서 되돌릴 수 있어요." : ""}</p>
          </div>${planFooter(target ? "업데이트" : "추가")}`);
    bindMergeBox(() => renderModPlan(file, incoming, db, targetIndex, keepExistingOnly, choices, base), choices);
    bindPlan(file, incoming, db, (keep) => renderModPlan(file, incoming, db, targetIndex, keep, choices, base), async () => {
      const early = target ? store.addBackup({ kind: "module", target: target.id, name: target.name, snapshot: backupSnapshot("module", target), note: "업데이트 전" }).catch(() => null) : null;
      const uploaded = await uploadWithProgress(file, plan.toUpload);
      updateProgress(100, "모듈 저장 중…");
      const known2 = /* @__PURE__ */ new Set([...knownKeys, ...uploaded.values()]);
      const inc = modIncomingView(incoming, plan, uploaded, known2);
      let merged, note2 = "", backupRec = null, summary = "";
      await commit(api, async (d) => {
        if (target) {
          const e = d.entries.find((x) => x.module?.id === target.id);
          if (!e) throw new Error("업데이트할 모듈이 그 사이 삭제되었습니다. 저장하지 않았습니다.");
          const cur = e.module;
          const r = merge3(base, pickView(cur, [...spec.scalars, ...Object.keys(spec.lists)]), inc, spec, { choices, keepExistingOnly });
          const sm = summarize(r.items);
          summary = [sm.update && `제작자 수정 ${sm.update}`, sm.mine && `내 수정 유지 ${sm.mine}`, sm.conflict && `충돌 ${sm.conflict}`, sm.added && `추가 ${sm.added}`, sm.removed && `삭제 ${sm.removed}`, uploaded.size && `에셋 ${uploaded.size}개 올림`].filter(Boolean).join(" · ");
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
          merged = applyView(cur, r.view);
          merged.id = cur.id;
          e.module = merged;
        } else {
          merged = applyView({}, inc);
          merged.id = newId();
          d.entries.push({ module: merged, enabled: true });
        }
      });
      links?.set(linkKey(incoming), merged.id);
      try {
        await store.setBaseline(`m:${merged.id}`, inc);
      } catch {
        note2 = "다음 업데이트용 원본 기록을 저장하지 못했어요. 다음엔 2방향으로 비교합니다.";
      }
      busy = false;
      renderResult({ kind: "module", name: merged.name, updated: !!target, uploadedCount: uploaded.size, assets: (merged.assets ?? []).length, lore: (merged.lorebook ?? []).length, backup: !!target, backupRec, summary, note: note2 });
    });
  }
  function renderCharPlan(file, incoming, db, index, keepExistingOnly, choices = /* @__PURE__ */ new Map(), base) {
    const target = db.characters[index];
    if (base === void 0) return withPreparing(async () => renderCharPlan(file, incoming, db, index, keepExistingOnly, choices, await store.getBaseline(`c:${target.chaId}`)));
    const ch = incoming.character;
    const knownKeys = knownKeysOf(db);
    const plan = planCharacter(target, ch, knownKeys, false);
    const spec = charSpec(ch);
    const keys = [...spec.scalars, ...Object.keys(spec.lists)];
    const m = merge3(base, pickView(target, keys), charIncomingView(ch, plan, /* @__PURE__ */ new Map()), spec, { choices, keepExistingOnly });
    const s = plan.stat;
    const generating = isGenerating(target);
    frame(`<div class="card">
            <div style="margin-bottom:8px">${kindTag("character")}<b>${esc(target.name)}</b> 업데이트${target.name !== ch.fields.name ? ` → 이름이 <b>${esc(ch.fields.name)}</b>(으)로 바뀝니다` : ""}</div>
            <div class="grid"><b>올릴 에셋</b><span><b>${s.upload}개</b> (${fmtBytes2(s.uploadBytes)})${s.reused ? ` · 서버에 이미 있음 ${s.reused}` : ""}</span></div>
            ${mergeBox(m, choices, keepExistingOnly)}
            ${notes(incoming, ch.risuFields.lowLevelAccess && !target.lowLevelAccess, s.upload)}
            ${generating ? `<div class="err">이 캐릭터가 지금 응답을 생성하는 중이에요. 생성이 끝난 뒤 업데이트해 주세요.</div>` : ""}
            <p class="muted" style="margin:10px 0 0">채팅·채팅 폴더·메모는 그대로 둡니다. 바꾸기 전 상태를 백업하므로 [백업·되돌리기]에서 되돌릴 수 있어요. 저장 직전에 응답 생성 중인지 다시 확인합니다.</p>
          </div>${planFooter("업데이트")}`);
    bindMergeBox(() => renderCharPlan(file, incoming, db, index, keepExistingOnly, choices, base), choices);
    bindPlan(file, incoming, db, (keep) => renderCharPlan(file, incoming, db, index, keep, choices, base), async () => {
      const uploaded = await uploadWithProgress(file, plan.toUpload);
      updateProgress(100, "캐릭터 저장 중…");
      let idx = index;
      let fresh = await api.getCharacterFromIndex(idx);
      if (!fresh || fresh.chaId !== target.chaId) {
        const all = (await loadDb(true)).characters;
        idx = all.findIndex((c) => c?.chaId === target.chaId);
        if (idx < 0) throw new Error("업데이트할 캐릭터가 그 사이 삭제되었습니다. 저장하지 않았습니다.");
        fresh = await api.getCharacterFromIndex(idx);
        if (!fresh || fresh.chaId !== target.chaId) throw new Error("캐릭터를 다시 찾지 못했습니다. 저장하지 않았습니다.");
      }
      if (isGenerating(fresh)) throw new Busy();
      const inc = charIncomingView(ch, plan, uploaded);
      const r = merge3(base, pickView(fresh, keys), inc, spec, { choices, keepExistingOnly });
      const sm = summarize(r.items);
      const summary = [sm.update && `제작자 수정 ${sm.update}`, sm.mine && `내 수정 유지 ${sm.mine}`, sm.conflict && `충돌 ${sm.conflict}`, sm.added && `추가 ${sm.added}`, sm.removed && `삭제 ${sm.removed}`, uploaded.size && `에셋 ${uploaded.size}개 올림`].filter(Boolean).join(" · ");
      let backupRec;
      try {
        backupRec = await store.addBackup({ kind: "character", target: fresh.chaId, name: fresh.name, snapshot: backupSnapshot("character", fresh), note: "업데이트 전", summary: `${file.name} → ${summary || "변화 없음"}` });
      } catch (e) {
        throw new Error(`백업을 만들지 못해 아무것도 바꾸지 않았습니다: ${e?.message ?? e}`);
      }
      const merged = applyView(fresh, r.view, { userKeys: USER_KEYS });
      if (merged.vits && !merged.vits.id) merged.vits.id = fresh.vits?.id ?? newId().replace(/-/g, "");
      const last2 = await api.getCharacterFromIndex(idx);
      if (isGenerating(last2) || (last2?.chats ?? []).length !== (fresh.chats ?? []).length) throw new Busy();
      await api.setCharacterToIndex(idx, merged);
      const check = await api.getCharacterFromIndex(idx);
      if (check?.chaId !== target.chaId || (check.chats ?? []).length !== (fresh.chats ?? []).length) throw new Error("저장 후 확인에서 캐릭터가 예상과 다릅니다. [백업·되돌리기]에서 되돌릴 수 있어요.");
      let note2 = "";
      try {
        await store.setBaseline(`c:${fresh.chaId}`, inc);
      } catch {
        note2 = "다음 업데이트용 원본 기록을 저장하지 못했어요. 다음엔 2방향으로 비교합니다.";
      }
      busy = false;
      links?.set(linkKey(incoming), fresh.chaId);
      renderResult({
        kind: "character",
        name: merged.name,
        updated: true,
        uploadedCount: uploaded.size,
        assets: characterAssetKeys(merged).length,
        lore: (merged.globalLore ?? []).length,
        chats: (merged.chats ?? []).length,
        backup: true,
        backupRec,
        summary,
        note: note2
      });
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
      fresh.push(created);
      await api.setDatabaseLite({ characters: fresh });
      try {
        await api.checkCharOrder();
      } catch {
      }
      const idx = fresh.length - 1;
      const check = await api.getCharacterFromIndex(idx);
      if (check?.chaId !== created.chaId) throw new Error("추가 후 확인에서 캐릭터를 찾지 못했습니다. 캐릭터 목록을 확인해 주세요.");
      try {
        await api.setChatToIndex(idx, 0, created.chats[0]);
      } catch {
      }
      let note2 = "";
      try {
        await store.setBaseline(`c:${created.chaId}`, charIncomingView(ch, plan, uploaded));
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
                <div style="flex:1">${kindTag(b.kind)}<b>${esc(b.name)}</b><div class="muted">${fmtDate(b.t)} · ${esc(b.note || "")} · ${fmtBytes2(b.size ?? 0)}</div></div>
                <button data-restore="${esc(b.id)}">되돌리기</button><button class="danger" data-del="${esc(b.id)}">삭제</button></div>`).join("") : '<div class="muted">아직 백업이 없어요. 업데이트할 때마다 바꾸기 전 상태가 자동으로 저장됩니다.</div>'}
          </div>
          <p class="muted">백업은 서버에 파일로 저장돼 다른 기기에서도 보입니다. RisuAI의 "사용하지 않는 에셋 정리"를 하면 백업 기록이나 옛 이미지가 지워질 수 있어요.</p>
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
    const snap = await store.loadBackup(rec);
    if (rec.kind === "character") {
      const all = (await loadDb(true)).characters;
      const idx = all.findIndex((c) => c?.chaId === rec.target);
      if (idx < 0) throw new Error("이 백업의 캐릭터를 지금 목록에서 찾지 못했어요.");
      const cur = await api.getCharacterFromIndex(idx);
      if (!cur || cur.chaId !== rec.target) throw new Error("캐릭터를 다시 찾지 못했어요.");
      if (isGenerating(cur)) throw new Busy();
      await store.addBackup({ kind: "character", target: cur.chaId, name: cur.name, snapshot: backupSnapshot("character", cur), note: "되돌리기 전" });
      const restored = restoreFromBackup("character", cur, snap);
      await api.setCharacterToIndex(idx, restored);
      const check = await api.getCharacterFromIndex(idx);
      if (check?.chaId !== rec.target || (check.chats ?? []).length !== (cur.chats ?? []).length) throw new Error("되돌린 뒤 확인에서 캐릭터가 예상과 다릅니다.");
      await store.restoreBaseline(`c:${rec.target}`, rec.basePath);
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
      await store.restoreBaseline(`m:${rec.target}`, rec.basePath);
    }
    busy = false;
    renderBackups(`${rec.name}을(를) ${fmtDate(rec.t)} 상태로 되돌렸어요. 채팅은 그대로예요.`);
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
    get busy() {
      return busy;
    }
  };
}
