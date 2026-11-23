// 폴더 관리/쉬운 로어북 — 데이터 길. 책장 화면은 이 객체만 쓴다.
// 빠르게 열기: 봇 요약 캐시(애드온 저장소 'shelf')로 바로 그리고, 뒤에서 순서 목록과 맞춘 뒤 바뀐 봇만 다시 훑는다.
//   새 봇이 생기면 전체 목록을 한 번 읽고(봇 위치 ci를 몰라서), 아니면 아는 위치만 띄엄띄엄 확인한다(10분에 한 번).
// 봇을 고칠 때는 늘 그 봇을 새로 읽고, chaId가 캐시와 다르면(봇 지움·순서 바뀜) 전체를 다시 읽어 위치를 찾는다.
import { applyAll, revertAll, entryKey as entryKeyOf, busyEntries, calmEntry } from "../../src/engine/easylore.js";
import { suggest, applyPlan } from "../../src/engine/easyfolder.js";
import { absorb, drop, freshCache, reconcile } from "../../src/engine/easyshelf.js";
import { moveChar, createFolder2, renameFolder2, deleteFolder2 } from "../../src/data/charorder.js";
import { loadCharacters } from "../../src/data/modules.js";
import { newId } from "../../src/engine/util.js";

const VERIFY_MS = 10 * 60 * 1000;

export function createShelfStore(api, dusk, { log = () => {}, ext = null } = {}) {
  let cache = null, order = [], busy = null, verifiedAt = 0;
  // 인물 판별: kinds[chaId] = { o: {항목키: 'p'|'n'} 사용자가 고친 값, a: {…} AI 판별 }, mem = 장기기억 인물 이름(지금 채팅 봇)
  let kinds = null, mem = { id: null, names: [] };
  const optsFor = (id) => ({ memNames: mem.id === id ? mem.names : [], overrides: kinds?.[id]?.o ?? {}, ai: kinds?.[id]?.a ?? {} });
  async function loadMem() {
    try {
      const M = ext?.get?.("svc", "memoryApi");
      if (!M || M.version < 1) return;
      const cur = await M.currentChat();
      if (!cur?.chaId) return;
      const ppl = (await M.people()) ?? [];
      mem = { id: String(cur.chaId), names: [...new Set(ppl.flatMap((p) => [p.name, ...(p.aliases ?? [])]).filter(Boolean))].slice(0, 200) };
    } catch (e) { log("장기기억 인물 읽기 실패", e?.message ?? e); }
  }
  const subs = new Set();
  const emit = (changed = []) => { for (const f of subs) { try { f(changed); } catch (e) { log("화면 갱신 실패", e); } } };
  const save = () => dusk.storage.set("shelf", cache).catch((e) => log("캐시 저장 실패", e?.message ?? e));
  const readOrder = async () => (await api.getDatabase(["characterOrder"]))?.characterOrder ?? [];
  const live = async () => { try { return { ci: await api.getCurrentCharacterIndex(), ti: await api.getCurrentChatIndex() }; } catch { return { ci: -1, ti: -1 }; } };

  async function load() {
    if (!cache) cache = freshCache(await dusk.storage.get("shelf", null));
    if (!kinds) kinds = (await dusk.storage.get("kinds", null)) ?? {};
    if (!order.length) order = await readOrder().catch(() => []);
    return { cache, order };
  }
  // 전체 읽기 (새 봇·위치가 틀렸을 때만)
  async function full() {
    const { list } = await loadCharacters(api);
    const r = absorb(cache, list.map((c, ci) => ({ c, ci })), Date.now(), optsFor);
    const ids = new Set(list.filter((c) => c && !c.trashTime && c.chaId).map((c) => String(c.chaId)));
    cache = drop(r.cache, Object.keys(r.cache.bots).filter((id) => !ids.has(id)));
    verifiedAt = Date.now();
    return r.changed;
  }
  // 아는 위치만 확인
  async function verify() {
    const changed = [];
    const items = Object.values(cache.bots);
    for (let i = 0; i < items.length; i += 6) {
      const got = await Promise.all(items.slice(i, i + 6).map((b) => api.getCharacterFromIndex(b.ci).catch(() => null)));
      for (let k = 0; k < got.length; k++) if (String(got[k]?.chaId ?? "") !== items[i + k].id) return [...changed, ...(await full())];
      const r = absorb(cache, got.map((c, k) => ({ c, ci: items[i + k].ci })), Date.now(), optsFor);
      cache = r.cache;
      changed.push(...r.changed);
      if (r.changed.length) emit(r.changed);
    }
    verifiedAt = Date.now();
    return changed;
  }
  // 열 때: 순서 맞추기 → 필요하면 읽기. 화면은 캐시로 먼저 그려 둔 상태
  function refresh({ force = false } = {}) {
    if (busy) return busy;
    busy = (async () => {
      await load();
      await loadMem();
      order = await readOrder();
      const { missing, gone } = reconcile(cache, order);
      if (gone.length) cache = drop(cache, gone);
      let changed = [];
      if (missing.length || !Object.keys(cache.bots).length) changed = await full();
      else if (force || Date.now() - verifiedAt > VERIFY_MS) changed = await verify();
      await save();
      emit(changed);
      return changed;
    })().catch((e) => { log("새로 읽기 실패", e); throw e; }).finally(() => { busy = null; });
    return busy;
  }
  // 그 봇 새로 읽기 (위치가 틀렸으면 전체에서 찾는다)
  async function readBot(id) {
    await load();
    let b = cache.bots[id];
    let c = b ? await api.getCharacterFromIndex(b.ci).catch(() => null) : null;
    if (!c || String(c.chaId) !== id) { await full(); b = cache.bots[id]; c = b ? await api.getCharacterFromIndex(b.ci) : null; }
    if (!c || String(c.chaId) !== id) throw new Error("이 봇을 찾지 못했어요");
    return { c, ci: b.ci };
  }
  async function touch(c, ci) {
    const id0 = String(c.chaId), prevBusy = cache.bots[id0]?.busy;
    cache = absorb(cache, [{ c, ci }], Date.now(), optsFor).cache;
    if (prevBusy && cache.bots[id0] && !cache.bots[id0].busy) cache = { ...cache, bots: { ...cache.bots, [id0]: { ...cache.bots[id0], busy: prevBusy } } };
    await save();
    emit([String(c.chaId)]);
  }

  // 책을 펼칠 때: 그 봇만 새로 읽어 바뀌었으면 요약을 고친다 → 바뀌었는지
  async function refreshBot(id) {
    const { c, ci } = await readBot(id);
    await loadMem();
    const r = absorb(cache, [{ c, ci }], Date.now(), optsFor);
    cache = r.cache;
    // 자주 켜지는 항목: 가장 최근 채팅의 최근 메시지로 센다 (채팅 글은 서명에 없으니 펼칠 때마다 다시 센다)
    const chat = [...(c.chats ?? [])].sort((a, b) => (Number(b?.lastDate) || 0) - (Number(a?.lastDate) || 0))[0];
    const busy = busyEntries(c.globalLore ?? [], chat?.message ?? []);
    const b = cache.bots[id];
    const changedBusy = b && JSON.stringify(b.busy ?? []) !== JSON.stringify(busy);
    if (changedBusy) cache = { ...cache, bots: { ...cache.bots, [id]: { ...b, busy } } };
    if (r.changed.length || changedBusy) { await save(); emit([id]); }
    return r.changed.length > 0 || changedBusy;
  }
  // 칩으로 고치기: 'p' 인물 · 'n' 아님 · null 자동으로
  async function setKind(id, ek, v) {
    await load();
    const k = { o: { ...(kinds[id]?.o ?? {}) }, a: { ...(kinds[id]?.a ?? {}) } };
    if (v) k.o[ek] = v; else delete k.o[ek];
    kinds = { ...kinds, [id]: k };
    await dusk.storage.set("kinds", kinds);
    return refreshBot(id);
  }
  // 애매한 항목만 보조 모델에게 한 번에 묻는다 → 결과는 kinds[id].a에 남겨 다시 묻지 않음
  async function aiJudge(id) {
    const { c } = await readBot(id);
    const b = cache.bots[id];
    const ask = (b?.maybe ?? []).slice(0, 30);
    if (!ask.length) return 0;
    const lore = c.globalLore ?? [];
    const lines = ask.map((m, i) => { const e = lore.find((x) => entryKeyOf(x) === m.ek); return `${i + 1}. [${m.name}] 키: ${e?.key ?? ""} / 내용: ${String(e?.content ?? "").replace(/\s+/g, " ").slice(0, 240)}`; });
    const reply = await dusk.ai.run(`다음은 로어북 항목들이에요. 각 항목이 '한 명의 인물(캐릭터)'을 설명하면 p, 장소·물건·설정·집단 등 인물이 아니면 n으로 답하세요.\n답은 JSON 한 줄로만: {"1":"p","2":"n",...}\n\n${lines.join("\n")}`, { system: "You classify lorebook entries. Reply with JSON only." });
    const m = /\{[\s\S]*\}/.exec(String(reply ?? ""));
    if (!m) throw new Error("보조 모델 답을 읽지 못했어요");
    const got = JSON.parse(m[0]);
    const k = { o: { ...(kinds[id]?.o ?? {}) }, a: { ...(kinds[id]?.a ?? {}) } };
    let n = 0;
    ask.forEach((x, i) => { const v = String(got[i + 1] ?? got[String(i + 1)] ?? "").trim().toLowerCase(); if (v === "p" || v === "n") { k.a[x.ek] = v; n++; } });
    kinds = { ...kinds, [id]: k };
    await dusk.storage.set("kinds", kinds);
    await refreshBot(id);
    return n;
  }
  // 덜 켜지게: 고른 항목(항목키)만 이름 경계 + 방금 메시지에서만 찾기
  async function calmBot(id, eks) {
    const { c, ci } = await readBot(id);
    const want = new Set(eks);
    let n = 0;
    const lore = (c.globalLore ?? []).map((e) => (want.has(entryKeyOf(e)) && !e.extentions?.da_rule ? (n++, calmEntry(e, newId())) : e));
    if (!n) return 0;
    const next = { ...c, globalLore: lore };
    await api.setCharacterToIndex(ci, next);
    const b = cache.bots[id];
    if (b?.busy) cache = { ...cache, bots: { ...cache.bots, [id]: { ...b, busy: b.busy.filter((x) => !want.has(x.ek)) } } };
    await touch(next, ci);
    return n;
  }
  async function applyBot(id) {
    const { c, ci } = await readBot(id);
    const lv = await live();
    const ti = lv.ci === ci ? lv.ti : -1;
    const a = applyAll(c.globalLore ?? [], { mkId: newId, ...optsFor(id) });
    const b = ti >= 0 && c.chats?.[ti] ? applyAll(c.chats[ti].localLore ?? [], { mkId: newId, ...optsFor(id) }) : { plans: [] };
    const n = a.plans.length + b.plans.length;
    if (!n) { await touch(c, ci); return 0; }
    const next = { ...c, globalLore: a.entries };
    if (b.plans.length) next.chats = c.chats.map((t, i) => (i === ti ? { ...t, localLore: b.entries } : t));
    await api.setCharacterToIndex(ci, next);
    log("적용", c.name, n);
    await touch(next, ci);
    return n;
  }
  async function revertBot(id) {
    const { c, ci } = await readBot(id);
    const a = revertAll(c.globalLore ?? []);
    let n = a.count;
    const chats = (c.chats ?? []).map((t) => { const r = revertAll(t.localLore ?? []); n += r.count; return r.count ? { ...t, localLore: r.entries } : t; });
    const next = { ...c, globalLore: a.entries, chats };
    if (n) await api.setCharacterToIndex(ci, next);
    await touch(next, ci);
    return n;
  }
  async function revertEverything() {
    await refresh({ force: true });
    let total = 0, bots = 0;
    for (const b of Object.values(cache.bots)) if (b.on.length) { const n = await revertBot(b.id); if (n) { total += n; bots++; } }
    return { total, bots };
  }

  // 폴더(책장)
  async function saveOrder(fn) {
    const next = fn(await readOrder());
    await api.setDatabaseLite({ characterOrder: next });
    order = next;
    emit([]);
    return next;
  }
  const moveTo = (id, folderId) => saveOrder((o) => moveChar(o, id, { folderId: folderId || null }));
  const newShelf = (name, ids = []) => saveOrder((o) => createFolder2(o, { id: newId(), name, ids }));
  const renameShelf = (fid, name) => saveOrder((o) => renameFolder2(o, fid, name));
  const unshelve = (fid) => saveOrder((o) => deleteFolder2(o, fid));
  // 자동 정리: 요약만으로 분류 (요약에 genre·kind가 들어 있다)
  function plan(mode, keepFiled) {
    const chars = Object.values(cache?.bots ?? {}).map((b) => ({ chaId: b.id, name: b.name, __cls: { genre: b.genre, kind: b.kind } }));
    return suggest(chars, order, { mode, keepFiled, classifyFn: (c) => c.__cls });
  }
  async function applyAutoPlan(p) {
    await dusk.storage.set("orderBackup", { at: Date.now(), order: await readOrder() });
    return saveOrder((o) => applyPlan(o, p, { mkId: newId }));
  }
  async function undoPlan() {
    const b = await dusk.storage.get("orderBackup", null);
    if (!b?.order) throw new Error("되돌릴 정리 기록이 없어요");
    await api.setDatabaseLite({ characterOrder: b.order });
    order = b.order;
    await dusk.storage.set("orderBackup", null);
    emit([]);
    return b.at;
  }

  return {
    load, refresh, refreshBot, applyBot, setKind, aiJudge, calmBot, revertBot, revertEverything, moveTo, newShelf, renameShelf, unshelve, plan, applyAutoPlan, undoPlan,
    get cache() { return cache; }, get order() { return order; }, get busy() { return !!busy; }, get verifiedAt() { return verifiedAt; },
    subscribe(f) { subs.add(f); return () => subs.delete(f); }
  };
}
