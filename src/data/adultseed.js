// 2.2.6 ‘처음 등장 때 성인 항목 무작위로’ 옵션(pluginStorage) + 장기기억 위키 후보 넣기 + Erosync 성적 수치 넣기.
import { SEED_KEY, normalizeSeedOpt, seedWikiCandidates, rollAdult, SEX_KEYS } from "../engine/adultseed.js";

const EROS_KEY = "dusk.adultSeed.ero";   // { [scopeKey]: [넣었거나 기준으로 본 Erosync 인물 id] }
const readJ = async (api, k) => { try { const v = await api.pluginStorage.getItem(k); return typeof v === "string" ? JSON.parse(v) : v ?? null; } catch { return null; } };
export const readSeedOpt = async (api) => normalizeSeedOpt(await readJ(api, SEED_KEY));
export async function saveSeedOpt(api, on) {
  const cur = await readSeedOpt(api);
  const next = { on: !!on, since: on ? (cur.on ? cur.since : Date.now()) : 0 };
  await api.pluginStorage.setItem(SEED_KEY, JSON.stringify(next));
  return next;
}

// 장기기억: 턴이 기록될 때마다 지금 채팅 위키에서 아직 안 넣은 새 인물에게 후보를 넣는다.
export async function seedWikiNow(api, memory, log = () => {}) {
  const opt = await readSeedOpt(api);
  if (!opt.on) return 0;
  const cur = await memory.switches?.currentChat?.().catch?.(() => null);
  if (!cur) return 0;
  let n = 0;
  await memory.store.updateFolder(cur.chaId, cur.chatId, (f) => {
    if (!f.wiki?.people?.profiles) return;
    f.adultSeeded ??= [];
    n = seedWikiCandidates(f.wiki, f.adultSeeded, { since: opt.since }).length;
  });
  if (n) log(`처음 등장한 인물 ${n}명에게 성적 욕망·이상성향 후보를 무작위로 넣었어요`);
  return n;
}

// Erosync: 이 채팅을 처음 볼 때 이미 있던 인물은 기준으로만 두고, 그 뒤 새로 생긴 인물(출발값이 막 만들어진 인물)에 성적 수치를 넣는다.
export async function seedErosyncNow(api, erosync, snap, log = () => {}) {
  const opt = await readSeedOpt(api);
  if (!opt.on || !snap?.ok) return 0;
  const scope = snap.scope?.scopeKey || "?";
  const all = (await readJ(api, EROS_KEY)) ?? {};
  const people = (snap.people ?? []).filter((p) => !p.nonPerson && !p.sfw);
  const first = !(scope in all);
  const done = new Set(all[scope] ?? []);
  let n = 0;
  for (const p of people) {
    if (done.has(p.id)) continue;
    done.add(p.id);
    if (first || p.overridden) continue;   // 옵션을 켜기 전부터 있던 인물·사용자가 고친 인물은 그대로
    const roll = rollAdult(p.name);
    try { await erosync.profile("edit", p.id, Object.fromEntries(SEX_KEYS.map((k) => [k, roll.sexual[k]]))); n++; } catch (e) { log(`Erosync 성적 수치 넣기 실패 ${e?.message ?? e}`); }
  }
  all[scope] = [...done].slice(-300);
  await api.pluginStorage.setItem(EROS_KEY, JSON.stringify(all));
  if (n) log(`Erosync: 새 인물 ${n}명의 성적 수치를 무작위 출발값으로 넣었어요`);
  return n;
}
