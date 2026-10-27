// 새로 가져온 봇 감지 (RisuTide 기능을 Dusk 방식으로)
// - 메인 화면 접근 권한이 있으면: + 메뉴에 "Dusk Atelier로 업데이트" 버튼을 넣고,
//   "캐릭터 임포트 / RisuRealm / 패키지 임포트"를 누른 뒤 몇 분 동안만 자주 확인한다.
//   파일을 끌어다 놓아 가져오는 경우를 위해 8초마다 가볍게(봇 ID 목록만) 확인한다.
// - 권한이 없으면 4초마다 봇 ID 목록만 비교한다.
// - 모듈 목록은 무거워서 평소 20초마다, 가져오기 직후 몇 분만 3초마다 본다.
// - 화면이 안 보일 때는 멈추고, 다시 보이면 바로 확인한다.
// - 확인한 봇 ID를 저장해 두어, 플러그인이 꺼져 있던 동안 생긴 봇도 다음에 켤 때 확인한다.
import { listUpdateCandidates } from '../tide/characterUpdateTargets.ts';
import { charFields } from '../engine/tideplan.js';
import { stableJson } from '../engine/util.js';

// 모듈 목록은 통째로 복사돼 와서 무겁다: 평소엔 가끔, 가져오기 직후(burst)에만 자주
var KNOWN_MOD_KEY = "rbm:watchMod:v1", MOD_EVERY = 2e4, MOD_BURST = 3e3;
var KNOWN_KEY = "rbm:watch:v1", UI_KEY = "rbm:ui:v1", TRASH_KEY = "rbm:pendingTrash:v1";
var SLOW = 8e3, FAST = 4e3, BURST = 1500, BURST_FOR = 3 * 6e4, TRASH_EVERY = 3e4;
var MENU_BTN_ID = "dusk-atelier-addchar";

export async function readUi(api) {
  try {
    const raw = await api.pluginStorage.getItem(UI_KEY);
    return (typeof raw === "string" ? JSON.parse(raw) : raw) ?? {};
  } catch {
    return {};
  }
}
export var watchDefaults = (ui) => ({ autoDetect: ui?.autoDetect !== false, trashCopies: ui?.trashCopies !== false, chatBackup: ui?.chatBackup === true });

/** 이 앱이 열지 않은 봇에도 저장이 남는지 (PocketRisu·RisuBard = node) */
export async function persistentWrites(api) {
  try {
    const r = await api.getRuntimeInfo?.();
    return r?.platform === "node" && r.supportsPersistentCharacterWrites !== false;
  } catch {
    return false;
  }
}

function flatten(order) {
  const out = [];
  for (const x of order ?? []) {
    if (typeof x === "string") out.push(x);
    else if (Array.isArray(x?.data)) for (const y of x.data) if (typeof y === "string") out.push(y);
  }
  return out;
}

/** 대화가 있었던 봇인지 (받은 사본이 맞는지 볼 때) */
export function hasConversation(ch) {
  const chats = Array.isArray(ch?.chats) ? ch.chats : [];
  return chats.length > 1 || chats.some((c) => Array.isArray(c?.message) && c.message.length > 0);
}

/**
 * 받은 사본을 휴지통으로 옮긴다 (되돌릴 수 있는 trashTime 표시 + 순서에서 빼기).
 * 지금 열려 있거나, 대화가 생겼거나, 확인할 수 없으면 옮기지 않는다.
 */
export async function trashCopy(api, chaId) {
  if (!await persistentWrites(api)) return { ok: false, reason: "unsupported" };
  const db = await api.getDatabase(["characters", "characterOrder"]);
  const idx = (db?.characters ?? []).findIndex((c) => c?.chaId === chaId);
  if (idx < 0) return { ok: true, reason: "missing" };
  let cur = -1;
  try {
    cur = await api.getCurrentCharacterIndex();
  } catch {
  }
  if (cur === idx) return { ok: false, reason: "open" };
  const ch = await api.getCharacterFromIndex(idx);
  if (!ch || ch.chaId !== chaId) return { ok: false, reason: "missing" };
  if (ch.trashTime) return { ok: true, reason: "already" };
  if (hasConversation(ch)) return { ok: false, reason: "conversation" };
  if ((ch.chats ?? []).some((c) => c?._placeholder || c?._stub)) return { ok: false, reason: "unverified" };
  await api.setCharacterToIndex(idx, { ...ch, trashTime: Date.now() });
  const order = (db.characterOrder ?? []).filter((x) => x !== chaId).map((x) => typeof x === "string" || !Array.isArray(x?.data) ? x : { ...x, data: x.data.filter((y) => y !== chaId) });
  await api.setDatabaseLite({ characterOrder: order });
  return { ok: true };
}
async function readJson(api, key, fb) {
  try {
    const raw = await api.pluginStorage.getItem(key);
    return raw ? typeof raw === "string" ? JSON.parse(raw) : raw : fb;
  } catch {
    return fb;
  }
}
// 휴지통 대기 목록: 비어 있으면 매번 저장소를 읽지 않는다 (null = 아직 모름)
var trashPending = null;
export async function queueTrash(api, chaId) {
  trashPending = true;
  const list = await readJson(api, TRASH_KEY, []);
  if (!list.some((x) => x.chaId === chaId)) list.push({ chaId, t: Date.now() });
  await api.pluginStorage.setItem(TRASH_KEY, JSON.stringify(list));
}

// 모듈 이름 비교용 (버전 표시·기호 빼고)
function modKey(name) {
  return String(name ?? "").normalize("NFKC").toLowerCase().replace(/(?:\s*[-–—:]?\s*(?:v(?:er(?:sion)?)?\.?\s*)?\d+(?:\.\d+)+|\s*[([]\s*v?\d+(?:\.\d+)*\s*[)\]])\s*$/u, "").replace(/[^\p{L}\p{N}]/gu, "");
}
export function createWatcher(api, { onDetected, onModules, onOpenUpdater, onNew, isBusy, onModChanged }) {
  let knownMods = null, lastMod = 0, charCount = null, lastOrder = null;
  let known = null, timer = null, burstUntil = 0, mode = "fast", running = false, checking = false, enabled = true;
  let doc = null, menuTimer = null;
  const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";
  const ids = async () => flatten((await api.getDatabase(["characterOrder"]))?.characterOrder);
  const saveKnown = () => api.pluginStorage.setItem(KNOWN_KEY, JSON.stringify({ v: 1, ids: [...known] })).catch(() => {
  });

  let lastTrash = 0;
  async function processTrash() {
    if (trashPending === false) return;
    if (trashPending && Date.now() - lastTrash < TRASH_EVERY) return;
    lastTrash = Date.now();
    const list = await readJson(api, TRASH_KEY, []);
    if (!list.length) {
      trashPending = false;
      return;
    }
    const keep = [];
    for (const it of list) {
      if (Date.now() - it.t > 7 * 864e5) continue;
      const r = await trashCopy(api, it.chaId).catch(() => ({ ok: false, reason: "error" }));
      if (!r.ok && (r.reason === "open" || r.reason === "error" || r.reason === "unverified")) keep.push(it);
    }
    await api.pluginStorage.setItem(TRASH_KEY, JSON.stringify(keep)).catch(() => {
    });
    trashPending = keep.length > 0;
  }

  // 상태 (업데이트 설정 화면에서 보여 줌)
  const stat = { lastAt: 0, lastError: "", chars: 0, mods: 0, found: 0 };
  async function check(force = false) {
    if (checking || !enabled || !visible()) return;
    checking = true;
    try {
      const orderDb = await api.getDatabase(["characterOrder"]);
      // 권한 거부·읽기 실패: 기준(본 봇 목록)을 건드리지 않고 다음에 다시
      if (!orderDb || !Array.isArray(orderDb.characterOrder)) throw new Error("캐릭터 순서를 읽지 못했어요 (데이터베이스 접근 권한을 확인해 주세요)");
      let cur = flatten(orderDb.characterOrder);
      // 끝자리 확인: 리스가 순서 목록에 늦게 넣어도, 봇 목록 끝에 새 봇이 생겼는지 직접 본다 (없으면 null 하나만 오가서 가볍다)
      let tailHit = false;
      if (charCount !== null) {
        try {
          tailHit = !!await api.getCharacterFromIndex(charCount);
        } catch {
        }
      }
      const orderSig = cur.join("|");
      const orderMoved = orderSig !== lastOrder;
      if (tailHit || orderMoved || !known || charCount === null || force) {
        const db = await api.getDatabase(["characters"]);
        if (!db || !Array.isArray(db.characters)) throw new Error("봇 목록을 읽지 못했어요");
        charCount = db.characters.length;
        const live = db.characters.filter((c) => c?.chaId && !c.trashTime && c.type !== "group").map((c) => c.chaId);
        cur = [.../* @__PURE__ */ new Set([...cur, ...live])];
        lastOrder = orderSig;
      } else cur = [...known];
      stat.chars = cur.length;
      if (!known) {
        const saved = await readJson(api, KNOWN_KEY, null);
        if (!saved?.ids) {
          // 처음 켰을 때: 지금 있는 봇은 모두 "본 것"으로
          known = new Set(cur);
          await saveKnown();
          stat.lastAt = Date.now();
          stat.lastError = "";
          return;
        }
        known = new Set(saved.ids);
      }
      const added = cur.filter((id) => !known.has(id));
      const curSet = new Set(cur);
      const removed = curSet.size !== known.size || [...known].some((id) => !curSet.has(id));
      if (added.length || removed) {
        known = new Set(cur);
        await saveKnown();
      }
      if (added.length) {
        burstUntil = 0;
        await inspect(added);
      }
      if (force || Date.now() - lastMod >= (Date.now() < burstUntil ? MOD_BURST : MOD_EVERY)) await checkModules();
      await processTrash();
      stat.lastAt = Date.now();
      stat.lastError = "";
    } catch (e) {
      stat.lastError = e?.message ?? String(e);
    } finally {
      checking = false;
    }
  }

  // 모듈: 리스에 .risum을 끌어다 놓거나 가져오면 새 id의 모듈이 생긴다 → 이름이 같은 기존 모듈이 있으면 묻는다
  async function checkModules() {
    lastMod = Date.now();
    const mdb = await api.getDatabase(["modules"]);
    if (!mdb || !Array.isArray(mdb.modules)) return;
    const mods = mdb.modules;
    const ids = mods.map((m) => m?.id).filter(Boolean);
    stat.mods = ids.length;
    if (!knownMods) {
      const saved = await readJson(api, KNOWN_MOD_KEY, null);
      if (!saved?.ids) {
        knownMods = new Set(ids);
        await api.pluginStorage.setItem(KNOWN_MOD_KEY, JSON.stringify({ v: 1, ids })).catch(() => {
        });
        return;
      }
      knownMods = new Set(saved.ids);
    }
    const added = mods.filter((m) => m?.id && !knownMods.has(m.id));
    const idSet = new Set(ids);
    const changed = added.length || [...knownMods].some((id) => !idSet.has(id));
    if (!changed) return;
    onModChanged?.();
    knownMods = new Set(ids);
    await api.pluginStorage.setItem(KNOWN_MOD_KEY, JSON.stringify({ v: 1, ids })).catch(() => {
    });
    const items = [];
    for (const m of added) {
      const k = modKey(m.name);
      if (!k) continue;
      const targets = mods.filter((x) => x?.id && x.id !== m.id && !added.includes(x) && (modKey(x.name) === k || m.namespace && x.namespace === m.namespace));
      if (!targets.length) continue;
      // 똑같은 모듈을 또 넣은 경우는 묻지 않는다
      const strip = ({ id, ...rest }) => stableJson(rest);
      if (targets.some((t) => strip(t) === strip(m))) continue;
      items.push({ copyId: m.id, copyName: m.name ?? "", targets: targets.slice(0, 6).map((t) => ({ id: t.id, name: t.name, reason: modKey(t.name) === k ? "name" : "namespace" })) });
    }
    if (items.length) {
      stat.found += items.length;
      onModules?.(items);
    }
  }
  // 새 봇 중 "기존 봇의 새 버전"으로 보이는 것만 골라 알린다
  async function inspect(added) {
    const chars = (await api.getDatabase(["characters"]))?.characters ?? [];
    const items = [], fresh = [];
    for (const id of added) {
      const copy = chars.find((c) => c?.chaId === id);
      if (!copy || copy.type === "group" || copy.trashTime) continue;
      const cands = listUpdateCandidates(chars.filter(Boolean), copy).filter((t) => t.reason !== "other");
      if (!cands.length) {
        // 기존 봇의 새 버전으로는 안 보이지만, 다른 봇과 합칠 만한 새 봇일 수 있다
        if (chars.some((c) => c?.chaId && c.chaId !== id && c.type !== "group" && !c.trashTime)) fresh.push({ copyId: id, copyName: copy.name ?? "" });
        continue;
      }
      // 리스의 "복사"로 생긴 똑같은 봇은 묻지 않는다
      const twin = chars.find((c) => c?.chaId === cands[0].chaId);
      if (twin && stableJson(charFields(twin)) === stableJson(charFields(copy))) continue;
      items.push({ copyId: id, copyName: copy.name ?? "", targets: cands.slice(0, 6).map((t) => ({ chaId: t.chaId, name: t.name, reason: t.reason })) });
    }
    if (items.length) {
      stat.found += items.length;
      onDetected(items);
    }
    if (fresh.length) onNew?.(fresh);
  }

  function schedule() {
    clearTimeout(timer);
    if (!running || !enabled) return;
    const delay = Date.now() < burstUntil ? BURST : mode === "dom" ? SLOW : FAST;
    timer = setTimeout(async () => {
      await check();
      schedule();
    }, delay);
  }
  function burst() {
    burstUntil = Date.now() + BURST_FOR;
    schedule();
  }

  // ---- + 메뉴(새 캐릭터 추가 창)에 버튼 넣기 ----
  async function decorateMenu() {
    if (!doc) return;
    try {
      const boxes = await doc.querySelectorAll("div.w-2xl.flex.flex-col.max-w-full");
      const n = await boxes.length();
      for (let i = 0; i < n; i++) {
        const box = await boxes.at(i);
        const kids = await box.getChildren();
        const count = await kids.length();
        if (count < 4 || count > 8) continue;
        if (await box.querySelector(`[x-dusk="${MENU_BTN_ID}"]`)) return;
        // 가져오기 버튼들(RisuRealm·캐릭터 임포트·패키지 임포트)을 누르면 잠깐 자주 확인
        for (const j of [0, 1, count - 2]) {
          const b = await kids.at(j);
          await b?.addEventListener("click", () => burst());
        }
        const cancel = await kids.at(count - 1);
        const ref = await kids.at(1);
        const cls = await ref.getClassName();
        const btn = await doc.createElement("button");
        // 리스 샌드박스는 x- 로 시작하는 속성만 허락한다 (id 는 막힘)
        await btn.setAttribute("x-dusk", MENU_BTN_ID);
        await btn.setClassName(cls);
        await btn.setInnerHTML(`<div class="flex flex-col justify-start items-start"><span>Dusk Atelier로 업데이트</span><span class="text-textcolor2 text-sm">새 버전 파일로 기존 봇·모듈을 업데이트해요 (채팅·내 수정 유지)</span></div>`);
        await btn.addEventListener("click", () => onOpenUpdater());
        await cancel.remove();
        await box.appendChild(btn);
        await box.appendChild(cancel);
        return;
      }
    } catch {
    }
  }

  async function startDom() {
    try {
      doc = await api.getRootDocument();
      if (!doc) throw new Error("no doc");
      await doc.addEventListener("click", () => {
        clearTimeout(menuTimer);
        menuTimer = setTimeout(decorateMenu, 160);
      }, { capture: true });
      return true;
    } catch {
      doc = null;
      return false;
    }
  }

  return {
    async start() {
      const ui = watchDefaults(await readUi(api));
      enabled = ui.autoDetect;
      if (!enabled) return;
      running = true;
      // 메인 화면 접근 허락 창을 기다리느라 감지가 멈추지 않게, 감지부터 시작하고 버튼은 뒤에서
      mode = "fast";
      startDom().then((ok) => {
        if (ok) mode = "dom";
      });
      if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
        if (visible()) check(true);
      });
      // 리스는 DB를 다 읽은 뒤 플러그인을 켜므로 곧바로 첫 확인을 한다 (예전 2.5초 대기 제거)
      setTimeout(() => check(true), 300);
      schedule();
    },
    async setEnabled(on) {
      enabled = on;
      if (on && !running) return this.start();
      schedule();
    },
    check,
    burst,
    get status() {
      return { ...stat, enabled, running, mode };
    },
    /** Dusk가 모듈 목록을 바꾼 뒤: 지금 목록을 "본 것"으로 */
    async snapshotModules() {
      try {
        const ids = ((await api.getDatabase(["modules"]))?.modules ?? []).map((m) => m?.id).filter(Boolean);
        knownMods = new Set(ids);
        await api.pluginStorage.setItem(KNOWN_MOD_KEY, JSON.stringify({ v: 1, ids }));
      } catch {
      }
    },
    /** Dusk가 직접 만든 봇은 "새로 가져온 봇"으로 보지 않는다 */
    async markKnown(id) {
      try {
        if (!known) {
          const saved = await readJson(api, KNOWN_KEY, null);
          known = new Set(saved?.ids ?? await ids());
        }
        known.add(id);
        await saveKnown();
      } catch {
      }
    },
    get mode() {
      return mode;
    },
    /** 메인 화면 문서 (권한이 있을 때만) */
    get doc() {
      return doc;
    }
  };
}
