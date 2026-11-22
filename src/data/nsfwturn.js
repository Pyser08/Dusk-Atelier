// addon-rebuild: 매 턴 기록기가 보고한 성인 프로필 변화(taste·sexval)를 이 채팅 폴더(folder.nsfw)에 반영한다.
import { raceFor, raceZones } from "../engine/races.js";
import { applyNsfwReports } from "../engine/nsfwprofile.js";
import { applyDrive, emptyDrive } from "../engine/scenedrive.js";
import { sameKoreanPerson } from "../engine/namekr.js";
import { logEvent } from "./memlog.js";
import { applyHumanReports } from "../engine/humanitems.js";
import { tickLife, usesToPrefs, ensureHotGoals } from "../engine/nsfwlife.js";
import { readGauge } from "./gaugemult.js";
import { pruneWiki } from "../engine/wikiprune.js";
import { applyExtra, EXTRA_KINDS } from "../engine/memextra.js";
import { randomZones, sexZones } from "../engine/zonegen.js";
import { characterDocs, setUserNsfwNames, USER_NSFW_ID } from "../engine/usernsfw.js";
import { genderOf, setGender, guessGender } from "../engine/gender.js";
import { BODY_PARTS } from "../engine/humanitems.js";
import { personaInfo } from "./profileseed.js";

const key = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const empty = () => ({ sexual: {}, axes: {}, pref: null, positions: [], seduction: null, humor: null, by: "ai", at: new Date().toISOString(), log: [] });

// 순수: 폴더(f) 안에서 반영. 반환 [{name, changed:[…]}]
// 성별이 바뀌었을 때(이야기·직접 고름) 새 성별 부위 성감대가 하나도 없으면 1~2곳 채운다(예전 부위는 지우지 않고 숨김). 반환: 채운 곳 수
export function fillSexZones(f, id, g) {
  const n0 = f?.nsfw?.[id];
  if (!n0 || (g !== "m" && g !== "f") || (n0.zones ?? []).some((z) => BODY_PARTS.find((p) => p.id === z.part)?.sex === g)) return 0;
  const add = sexZones(id, g, n0.zones ?? []);
  if (add.length) f.nsfw[id] = { ...n0, zones: [...(n0.zones ?? []), ...add] };
  return add.length;
}
export function applyNsfwQueue(f, reports) {
  const docs = characterDocs(f);
  const byDoc = new Map();
  for (const r of reports ?? []) {
    const doc = docs.find((d) => [d.title, ...(d.aliases ?? [])].some((n) => key(n) === key(r.name))) ?? docs.find((d) => sameKoreanPerson(d.title, r.name));
    if (!doc) continue;
    if (!byDoc.has(doc.id)) byDoc.set(doc.id, { doc, list: [] });
    byDoc.get(doc.id).list.push(r);
  }
  const out = [];
  for (const { doc, list } of byDoc.values()) {
    f.nsfw ??= {};
    // 성별이 이야기에서 바뀌면 그 턴에 바로 바꾸고, 새 성별 부위 성감대가 하나도 없으면 1~2곳 채운다(예전 부위는 지우지 않고 숨김)
    const sx = list.filter((r) => r.kind === "sex").at(-1);
    if (sx && setGender(f, doc.id, sx.g, { by: "story", quote: sx.quote })) {
      const changed = [`성별 → ${sx.g === "m" ? "남성" : "여성"}`];
      const k = fillSexZones(f, doc.id, sx.g); if (k) changed.push(`성감대 ${k}곳 채움`);
      out.push({ name: doc.title, changed });
    }
    const a = applyNsfwReports(f.nsfw[doc.id] ?? empty(), list.filter((r) => r.kind === "taste" || r.kind === "sexval"));
    const b = applyHumanReports(a.nsfw, list.filter((r) => r.kind === "trait" || r.kind === "zone"));
    const changed = [...a.changed, ...b.changed];
    if (changed.length) { f.nsfw[doc.id] = b.nsfw; out.push({ name: doc.title, changed }); }
  }
  return out;
}

// 이름 → 이 채팅 성인 프로필(없으면 null)
export function nsfwByName(f, name) {
  const docs = characterDocs(f);
  const d = docs.find((x) => [x.title, ...(x.aliases ?? [])].some((n) => key(n) === key(name))) ?? docs.find((x) => sameKoreanPerson(x.title, name));
  return d ? f?.nsfw?.[d.id] ?? null : null;
}
// 장면 판단: 이번 턴 관찰 묶음들을 차례로 반영
export function applyDriveQueue(f, list) {
  const changed = [];
  for (const obs of list ?? []) { const r = applyDrive(f.drive ?? emptyDrive(), obs, { spont: (n) => nsfwByName(f, n)?.sexual?.sexualSpontaneity ?? null }); f.drive = r.drive; changed.push(...r.changed); }
  return changed;
}

// 엔진 계산(성욕·피로·경험·기념일 등): 이번 턴 행위·잠 보고와 장면 인물로 folder.life를 한 턴 진행. 반환: 바뀐 글
export function applyLifeTurn(f, { events = [], present = [], gauge = null, text = "", evKey = "" } = {}) {
  const turn = Number.isInteger(f?.cursor?.at) ? f.cursor.at : null;
  if (turn == null) return [];
  const actors = events.map((e) => e.name), who = [...new Set([...present, ...actors])];
  const when = [...(f?.scenes ?? [])].filter((x) => !x.orphan && x.when).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]?.when ?? "";
  const profOf = (d) => { const n = f?.nsfw?.[d.id], pr = f?.wiki?.people?.profiles?.[d.id];
    return { interest: n?.sexual?.eroticInterest ?? 50, mult: n?.lustMult ?? 1, spont: n?.sexual?.sexualSpontaneity, initiative: n?.axes?.initiative, when, boost: [n?.boost?.desire !== false && pr?.sexualDesire?.text, n?.boost?.para !== false && pr?.paraphilia?.text].filter(Boolean) }; };
  const date = String(when).match(/\d{1,5}-\d{1,2}-\d{1,2}/)?.[0] ?? "";   // 2.2.22 이야기 날짜(종족 발정기·첫 관계 날짜)
  const changed = tickLife(f, { turn, present: who, events, gauge, text, date, evKey }, profOf);
  changed.push(...ensureHotGoals(f));   // 달아오름 90↑ → 장면 판단에 성관계 계획을 실제로 저장
  // 자주 쓴 체위·플레이 → 선호
  for (const [id, L] of Object.entries(f.life?.p ?? {})) {
    if (!f.nsfw?.[id] || !Object.keys(L.uses ?? {}).length) continue;
    const r = usesToPrefs(f.nsfw[id], L.uses); if (r.changed.length) { f.nsfw[id] = r.nsfw; changed.push(...r.changed); }
  }
  return changed;
}

const latestWhen = (f) => [...(f?.scenes ?? [])].filter((x) => !x.orphan && x.when).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]?.when ?? "";
// 0.3.22 성감대가 비어 있는 성인 프로필 인물(이번 턴 장면 인물)에게 무작위 성감대를 넣는다. 반환: 채운 인물 이름
export function seedZones(f, present = []) {
  const docs = characterDocs(f), done = [];
  const here = new Set(present.map(key));
  for (const d of docs) {
    const n = f?.nsfw?.[d.id];
    if (!n || n.zonesSeeded || (n.zones ?? []).length || !Object.keys(n.sexual ?? {}).length) continue;
    if (here.size && ![d.title, ...(d.aliases ?? [])].some((x) => here.has(key(x)))) continue;
    f.nsfw[d.id] = { ...n, zones: randomZones(d.id, { sex: genderOf(f, d) ?? "f" }), zonesSeeded: true };   // 모르면 예전처럼 여성
    done.push(d.title);
  }
  // 0.3.22 종족 성감대 기본값(종족이 정해지거나 바뀌면 한 번) — 직접 고친 부위는 건드리지 않음
  for (const d of docs) {
    const n = f?.nsfw?.[d.id]; if (!n || !Object.keys(n.sexual ?? {}).length) continue;
    const r = raceFor(f, [d.title, ...(d.aliases ?? [])]); if (!r.known || n.raceSeeded === r.id) continue;
    const zs = [...(n.zones ?? [])];
    for (const z of raceZones(r)) { const i = zs.findIndex((x) => x.part === z.part); if (i < 0) zs.push(z); else if (zs[i].src === "random" || zs[i].src === "race") zs[i] = { ...zs[i], level: Math.max(zs[i].level ?? 0, z.level), note: zs[i].note || z.note }; }
    f.nsfw[d.id] = { ...n, zones: zs, raceSeeded: r.id };
    if (raceZones(r).length) done.push(`${d.title}(${r.label})`);
  }
  return done;
}
export async function applyNsfwTurn(memory, log = () => {}, info = null, api = null) {
  const q0 = memory?.flow?.takeNsfw?.() ?? [], dq = memory?.flow?.takeDrive?.() ?? [];
  const ex = q0.filter((r) => EXTRA_KINDS.has(r.kind)), q1 = q0.filter((r) => !ex.includes(r));
  const events = q1.filter((r) => ["act", "sleep", "gauge", "past", "mood", "bond", "touch", "sat"].includes(r.kind)), q = q1.filter((r) => !events.includes(r));
  const present = (info?.people ?? []).map((p) => p?.name).filter(Boolean);
  if (!q.length && !dq.length && !events.length && !present.length && !ex.length) return 0;
  const cur = await memory.switches?.currentChat?.().catch?.(() => null);
  if (!cur) return 0;
  try { const ui = memory.flow?.runtime?.()?.wiki?.userIdentity; if (ui?.title) setUserNsfwNames([ui.title, ...(ui.aliases ?? [])]); } catch { /* 이름 모름 → {{user}}만 */ }
  let personaG = null; try { personaG = api ? guessGender((await personaInfo(api))?.desc) : null; } catch { personaG = null; }
  const gauge = await readGauge(api).catch(() => null);
  let out = [], drive = [], life = [], pruned = [], extra = [], zoned = [];
  await memory.store.updateFolder(cur.chaId, cur.chatId, (f) => { if (personaG) setGender(f, USER_NSFW_ID, personaG, { by: "persona" }); if (q.length) out = applyNsfwQueue(f, q);
    if (ex.length) extra = applyExtra(f, ex, { turn: Number.isInteger(f?.cursor?.at) ? f.cursor.at : 0, when: latestWhen(f) });
    zoned = seedZones(f, present); if (dq.length) drive = applyDriveQueue(f, dq); life = applyLifeTurn(f, { events, present, gauge, text: String(info?.rp ?? ""), evKey: String(info?.key ?? "").slice(0, 600) });
    if (f.wiki?.documents) { const pr = pruneWiki(f.wiki); if (pr.removed.length) { f.wiki = pr.wiki; pruned = pr.removed; } } });
  if (pruned.length) logEvent({ area: "위키 정리", title: `중요도 낮은 정보 ${pruned.length}개를 지웠어요 · ${[...new Set(pruned.map((x) => x.doc))].join(", ")}`, detail: pruned.map((x) => `${x.doc}: ${x.text}`) });
  if (extra.length) logEvent({ area: "이야기 기록", title: extra.join(" · ").slice(0, 160), detail: extra });
  if (zoned.length) logEvent({ area: "성감대", title: `성감대를 무작위로 채웠어요 · ${zoned.join(", ")}` });
  if (life.length) logEvent({ area: "몸·마음 계산", title: life.join(" · ").slice(0, 160), detail: life });
  for (const o of out) logEvent({ area: "성인 프로필", title: `${o.name} · ${o.changed.join(" · ")}` });
  if (drive.length) logEvent({ area: "장면 판단", title: drive.join(" · ").slice(0, 160), detail: drive });
  else if (dq.length) logEvent({ kind: "skip", area: "장면 판단", title: "이번 응답엔 새 계획·반응이 없었어요" });
  if (out.length) log(`성인 프로필 변화 반영: ${out.map((o) => o.name).join(", ")}`);
  return out.length + drive.length;
}
