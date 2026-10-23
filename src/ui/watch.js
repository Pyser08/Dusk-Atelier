// 새로 가져온 봇 감지 (RisuTide 기능을 Dusk 방식으로)
// - 메인 화면 접근 권한이 있으면: + 메뉴에 "Dusk Atelier로 업데이트" 버튼을 넣고,
//   "캐릭터 임포트 / RisuRealm / 패키지 임포트"를 누른 뒤 몇 분 동안만 자주 확인한다.
//   파일을 끌어다 놓아 가져오는 경우를 위해 10초마다 가볍게(봇 ID 목록만) 확인한다.
// - 권한이 없으면 3초마다 봇 ID 목록만 비교한다.
// - 화면이 안 보일 때는 멈추고, 다시 보이면 바로 확인한다.
// - 확인한 봇 ID를 저장해 두어, 플러그인이 꺼져 있던 동안 생긴 봇도 다음에 켤 때 확인한다.
import { listUpdateCandidates } from '../tide/characterUpdateTargets.ts';
import { charFields } from '../engine/tideplan.js';
import { stableJson } from '../engine/util.js';

var KNOWN_KEY = "rbm:watch:v1", UI_KEY = "rbm:ui:v1", TRASH_KEY = "rbm:pendingTrash:v1";
var SLOW = 1e4, FAST = 3e3, BURST = 1500, BURST_FOR = 5 * 6e4;
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
export async function queueTrash(api, chaId) {
  const list = await readJson(api, TRASH_KEY, []);
  if (!list.some((x) => x.chaId === chaId)) list.push({ chaId, t: Date.now() });
  await api.pluginStorage.setItem(TRASH_KEY, JSON.stringify(list));
}

export function createWatcher(api, { onDetected, onOpenUpdater, isBusy }) {
  let known = null, timer = null, burstUntil = 0, mode = "fast", running = false, checking = false, enabled = true;
  let doc = null, menuTimer = null;
  const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";
  const ids = async () => flatten((await api.getDatabase(["characterOrder"]))?.characterOrder);
  const saveKnown = () => api.pluginStorage.setItem(KNOWN_KEY, JSON.stringify({ v: 1, ids: [...known] })).catch(() => {
  });

  async function processTrash() {
    const list = await readJson(api, TRASH_KEY, []);
    if (!list.length) return;
    const keep = [];
    for (const it of list) {
      if (Date.now() - it.t > 7 * 864e5) continue;
      const r = await trashCopy(api, it.chaId).catch(() => ({ ok: false, reason: "error" }));
      if (!r.ok && (r.reason === "open" || r.reason === "error" || r.reason === "unverified")) keep.push(it);
    }
    await api.pluginStorage.setItem(TRASH_KEY, JSON.stringify(keep)).catch(() => {
    });
  }

  async function check() {
    if (checking || !enabled || !visible() || isBusy?.()) return;
    checking = true;
    try {
      const cur = await ids();
      if (!known) {
        const saved = await readJson(api, KNOWN_KEY, null);
        if (!saved?.ids) {
          // 처음 켰을 때: 지금 있는 봇은 모두 "본 것"으로
          known = new Set(cur);
          await saveKnown();
          return;
        }
        known = new Set(saved.ids);
      }
      const added = cur.filter((id) => !known.has(id));
      const removed = [...known].some((id) => !cur.includes(id));
      if (added.length || removed) {
        known = new Set(cur);
        await saveKnown();
      }
      if (added.length) {
        burstUntil = 0;
        await inspect(added);
      }
      await processTrash();
    } catch {
    } finally {
      checking = false;
    }
  }

  // 새 봇 중 "기존 봇의 새 버전"으로 보이는 것만 골라 알린다
  async function inspect(added) {
    const chars = (await api.getDatabase(["characters"]))?.characters ?? [];
    const items = [];
    for (const id of added) {
      const copy = chars.find((c) => c?.chaId === id);
      if (!copy || copy.type === "group" || copy.trashTime) continue;
      const cands = listUpdateCandidates(chars.filter(Boolean), copy).filter((t) => t.reason !== "other");
      if (!cands.length) continue;
      // 리스의 "복사"로 생긴 똑같은 봇은 묻지 않는다
      const twin = chars.find((c) => c?.chaId === cands[0].chaId);
      if (twin && stableJson(charFields(twin)) === stableJson(charFields(copy))) continue;
      items.push({ copyId: id, copyName: copy.name ?? "", targets: cands.slice(0, 6).map((t) => ({ chaId: t.chaId, name: t.name, reason: t.reason })) });
    }
    if (items.length) onDetected(items);
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
        if (await box.querySelector(`#${MENU_BTN_ID}`)) return;
        // 가져오기 버튼들(RisuRealm·캐릭터 임포트·패키지 임포트)을 누르면 잠깐 자주 확인
        for (const j of [0, 1, count - 2]) {
          const b = await kids.at(j);
          await b?.addEventListener("click", () => burst());
        }
        const cancel = await kids.at(count - 1);
        const ref = await kids.at(1);
        const cls = await ref.getClassName();
        const btn = await doc.createElement("button");
        await btn.setAttribute("id", MENU_BTN_ID);
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
      mode = await startDom() ? "dom" : "fast";
      if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
        if (visible()) check();
      });
      setTimeout(check, 4e3);
      schedule();
    },
    async setEnabled(on) {
      enabled = on;
      if (on && !running) return this.start();
      schedule();
    },
    check,
    burst,
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
    }
  };
}
