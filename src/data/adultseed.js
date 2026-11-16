// 2.2.6 ‘처음 등장 때 성인 항목 무작위로’ 옵션(pluginStorage) + 장기기억 위키 후보 넣기 + Erosync 성적 수치 넣기.
import { SEED_KEY, normalizeSeedOpt, seedWikiCandidates, rollAdult, SEX_KEYS } from "../engine/adultseed.js";
import { orientFromErosync } from "../engine/romance.js";

const EROS_KEY = "dusk.adultSeed.ero";   // { [scopeKey]: [넣었거나 기준으로 본 Erosync 인물 id] }
const readJ = async (api, k) => { try { const v = await api.pluginStorage.getItem(k); return typeof v === "string" ? JSON.parse(v) : v ?? null; } catch { return null; } };
export const readSeedOpt = async (api) => normalizeSeedOpt(await readJ(api, SEED_KEY));
// patch: true/false(켜기·끄기, 예전 호출) 또는 설정 일부. 처음 켤 때 since를 지금으로.
export async function saveSeedOpt(api, patch) {
  const cur = await readSeedOpt(api);
  const p = typeof patch === "boolean" ? { on: patch } : (patch ?? {});
  const on = p.on ?? cur.on;
  const next = normalizeSeedOpt({ ...cur, ...p, on, since: on ? (cur.on ? cur.since : Date.now()) : 0 });
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
    n = (opt.desires || opt.kinks) ? seedWikiCandidates(f.wiki, f.adultSeeded, { since: opt.since, opt }).length : 0;
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
    const roll = rollAdult(p.name, null, opt), patch = {};
    if (roll.sexual) Object.assign(patch, Object.fromEntries(SEX_KEYS.map((k) => [k, roll.sexual[k]])));
    if (opt.cycle && (p.gender === "f" || p.gender === "female")) patch.cycle = "on";   // 월경: 여성 인물은 Erosync 월경 추적을 켠다(주기·날짜는 무작위로 정해짐)
    if (!Object.keys(patch).length) continue;
    try { await erosync.profile("edit", p.id, patch); n++; } catch (e) { log(`Erosync 성적 수치 넣기 실패 ${e?.message ?? e}`); }
  }
  all[scope] = [...done].slice(-300);
  await api.pluginStorage.setItem(EROS_KEY, JSON.stringify(all));
  if (n) log(`Erosync: 새 인물 ${n}명의 성적 수치를 무작위 출발값으로 넣었어요`);
  return n;
}

// 2.2.6 성적 지향 옮기기: Erosync가 켜져 있으면 인물별 성별·끌리는 성별 비율을 지금 채팅 장기기억 폴더(folder.orient)에 옮겨 둔다(끌림 상한에 씀).
export async function syncOrientNow(memory, erosync) {
  if (!erosync?.isRunning?.()) return 0;
  let snap = null; try { snap = await erosync.read(); } catch { return 0; }
  if (!snap?.ok || !(snap.people ?? []).length) return 0;
  const cur = await memory.switches?.currentChat?.().catch?.(() => null);
  if (!cur) return 0;
  const orient = orientFromErosync(snap);
  await memory.store.updateFolder(cur.chaId, cur.chatId, (f) => { f.orient = orient; });
  return Object.keys(orient).length;
}
