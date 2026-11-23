// addon-rebuild: 인물 기본 성격 + 채팅별 NSFW 값을 미리 만들어 둔다.
// 1) 위키에 문서만 있고 기본 성격이 없는 인물 → 기본 성격을 묶어서 만들고(최대 4명/호출), 성인 항목이 켜져 있으면 같은 답에 nsfw도 받는다.
// 2) 기본 성격은 있는데 이 채팅 nsfw가 없는 인물 → 위키 성격·성적 욕망·이상성향으로 nsfw만 묶어서 만든다(최대 4명/호출).
// nsfw는 장기기억 폴더(folder.nsfw[문서 id])에 채팅별로 저장한다(Erosync 프로필은 쓰지 않음). 같은 인물이 3번 실패하면 이번 세션엔 더 안 한다.
import { logEvent, logFailure } from "./memlog.js";
import { normalizeNsfw, withRolledSexual } from "../engine/nsfwprofile.js";
import { readSeedOpt } from "./adultseed.js";
import { rollAdult } from "../engine/adultseed.js";
import { USER_NSFW_ID, userNsfwDoc, setUserNsfwNames } from "../engine/usernsfw.js";
import { dbRead } from "./dbcache.js";
import { userNameList, primaryUserName } from "./usernames.js";
import { withoutPast } from "../engine/pastpersona.js";

// 지금 페르소나 이름·설명(유저 칸 성인 프로필·성별 짐작에 씀)
export async function personaInfo(api) {
  let db = null; try { db = api ? await dbRead(api, ["username", "personas", "selectedPersona"]) : null; } catch { db = null; }
  if (db) setUserNsfwNames(withoutPast(userNameList(db)));
  const p = (Array.isArray(db?.personas) ? db.personas : [])[db?.selectedPersona ?? 0];
  return { name: primaryUserName(db), desc: String(p?.personaPrompt ?? "").trim().slice(0, 2500) };
}
// 유저 칸: 위키 문서·기본 성격이 없으니 페르소나 설명으로 성인 프로필을 만든다(3번 실패하면 이번 세션엔 그만)
export async function userNsfwNeed(api, have) {
  if (have?.[USER_NSFW_ID] || (nsfwTries.get(USER_NSFW_ID) ?? 0) >= 3) return null;
  const { name, desc } = await personaInfo(api);
  return { id: USER_NSFW_ID, name: name || userNsfwDoc().title, profile: ["플레이어 캐릭터({{user}})", desc && `페르소나 설명: ${desc}`].filter(Boolean).join("\n") };
}

const tries = new Map(), nsfwTries = new Map();   // docId → 실패 횟수(세션)
let running = null;

export function missingProfiles(scope) {
  const profiles = scope?.people?.profiles ?? {};
  return Object.values(scope?.documents ?? {}).filter((d) => d?.type === "Character" && !profiles[d.id] && (tries.get(d.id) ?? 0) < 3);
}
export function missingNsfw(scope, nsfwMap) {
  const profiles = scope?.people?.profiles ?? {};
  return Object.values(scope?.documents ?? {}).filter((d) => d?.type === "Character" && profiles[d.id] && !nsfwMap?.[d.id] && (nsfwTries.get(d.id) ?? 0) < 3 && profiles[d.id].sexualDesireEnabled !== false);
}
// 위키 성격 → nsfw 만들기에 넘길 글
export function profileText(p) {
  if (!p) return "";
  return [p.summary && `성격: ${p.summary}`, p.coreTraits?.length && `특성: ${p.coreTraits.join(", ")}`, p.values?.length && `가치: ${p.values.join(", ")}`,
    p.emotionExpression && `감정 표현: ${p.emotionExpression}`, p.intimacyStyle && `친밀감: ${p.intimacyStyle}`,
    p.sexualDesire?.text && `성적 욕망: ${p.sexualDesire.text}`, p.paraphilia?.text && `이상성향: ${p.paraphilia.text}`, p.longTermPatterns?.length && `패턴: ${p.longTermPatterns.join(" / ")}`].filter(Boolean).join("\n");
}
const censored = (m) => /^\s*검열[:：]/.test(String(m ?? ""));
function fail(area, name, what, f, list) {
  list.set(f.id, (list.get(f.id) ?? 0) + 1);
  const msg = String(f.error ?? "") || "문제: 이유를 받지 못했어요";
  logFailure({ area, title: `‘${name}’ ${what} ${censored(msg) ? "— 검열" : "— 문제"}`, error: msg, fallback: "다음 턴에 다시 시도해요(3번까지)" });
}

export function ensureProfiles(memory, { max = 4, log = () => {}, api = null, wait = 0, step = 3000 } = {}) {
  return running ??= (async () => {
    const flow = memory?.flow, rt = flow?.runtime?.(), tools = flow?.tools?.();
    const imp = tools?.importer;
    if (!rt?.wiki || !imp) return 0;
    let ps = {}; try { ps = rt.settings?.snapshot?.() ?? {}; } catch { /* 설정 없음 */ }
    if (ps.peopleProfileEnabled === false) return 0;
    // addon-rebuild: 성적 욕망·이상성향은 늘 함께 — 욕구 기록이 켜져 있는데 이상성향이 꺼진 예전 설정은 맞춘다
    if (ps.sexualDesireEnabled === true && ps.paraphiliaEnabled !== true) { try { rt.settings.update((s) => { s.paraphiliaEnabled = true; }); ps = rt.settings.snapshot?.() ?? { ...ps, paraphiliaEnabled: true }; logEvent({ kind: "info", area: "설정", title: "욕구 기록과 함께 이상성향 기록도 켰어요(늘 함께)" }); } catch { /* 설정 저장 실패면 이번엔 그대로 */ } }
    // 다른 위키 작업이나 응답 자동 기록 중이면 다음 턴에(겹치면 위키가 바뀌어 호출만 버려진다)
    const autoBusy = () => { try { const st = rt.auto?.status?.(); return !!(st?.running || ["running", "applying", "repairing", "checking"].includes(st?.phase)); } catch { return false; } };
    // 2.2.30: 턴 6초 뒤에 불리는데 그때 위키 기록이 아직 돌고 있으면 매번 그냥 끝나 기본 성격이 거의 안 생겼다 → 끝날 때까지 기다린다(wait ms까지)
    for (const until = Date.now() + wait; (tools.busy?.() || autoBusy()) && Date.now() < until;) await new Promise((r) => setTimeout(r, step));
    if (tools.busy?.() || autoBusy()) { if (wait) log("기본 성격 만들기: 위키 기록이 길어져 다음 응답 때 다시 해요"); return 0; }
    const cur = await memory.switches?.currentChat?.().catch?.(() => null);
    const adult = ps.sexualDesireEnabled === true;
    const scope = rt.wiki.snapshot?.();
    const nameOf = (id) => scope?.documents?.[id]?.title || (id === USER_NSFW_ID ? userNsfwDoc().title : id);
    const nsfwOut = {};   // id → raw
    let made = 0;

    // 1) 기본 성격(+nsfw)
    const todo = missingProfiles(scope).slice(0, max);
    if (todo.length && typeof imp.runCharacters === "function") {
      const r = await imp.runCharacters(todo.map((d) => d.id), { nsfw: adult }).catch((e) => ({ made: [], failed: todo.map((d) => ({ id: d.id, error: e?.message ?? String(e) })) }));
      made = r.made.length;
      if (made) logEvent({ area: "기본 성격 만들기", title: `${made}명 · ${r.made.map(nameOf).join(", ")}${adult ? ` · 성인 프로필 ${r.made.filter((id) => r.nsfw?.[id]).length}명 함께` : ""}` });
      for (const f of r.failed) fail("기본 성격 만들기", nameOf(f.id), "성격", f, tries);
      Object.assign(nsfwOut, r.nsfw ?? {});
      if (r.deferred) return made;
    }

    // 2) 성격은 있는데 이 채팅 nsfw가 없는 인물
    if (adult && cur && typeof imp.runNsfw === "function" && !tools.busy?.() && !autoBusy()) {
      const folder = await memory.store.getFolder(cur.chaId, cur.chatId).catch(() => null);
      const have = { ...(folder?.nsfw ?? {}), ...nsfwOut };
      const after = rt.wiki.snapshot?.(), prof = after?.people?.profiles ?? {};
      const need = missingNsfw(after, have).slice(0, max).map((d) => ({ id: d.id, name: d.title || d.id, profile: profileText(prof[d.id]) }));
      const me = await userNsfwNeed(api, have).catch(() => null);
      if (me && need.length < max) need.push(me);
      if (need.length) {
        const r = await imp.runNsfw(need).catch((e) => ({ byId: {}, failed: need.map((p) => ({ id: p.id, error: e?.message ?? String(e) })) }));
        Object.assign(nsfwOut, r.byId);
        for (const f of r.failed) fail("성인 프로필 만들기", need.find((p) => p.id === f.id)?.name ?? f.id, "성인 프로필", f, nsfwTries);
      }
    }

    // 저장(채팅별). 무작위 성적 수치 옵션이 켜져 있으면 그 값으로 덮는다(기억 옵션 ‘처음 등장 때 성인 항목 무작위로’)
    const ids = Object.keys(nsfwOut);
    if (ids.length && cur) {
      let opt = null; try { opt = api ? await readSeedOpt(api) : null; } catch { opt = null; }
      const saved = [], bad = [];
      await memory.store.updateFolder(cur.chaId, cur.chatId, (f) => {
        f.nsfw ??= {};
        for (const id of ids) {
          if (f.nsfw[id]?.by === "user") continue;   // 사용자가 고친 값은 덮지 않는다
          let n = normalizeNsfw(nsfwOut[id]);
          if (!n) { bad.push(id); continue; }
          if (opt?.on && opt.sexual) n = withRolledSexual(n, rollAdult(nameOf(id), null, opt).sexual);
          f.nsfw[id] = n; saved.push(id);
        }
      });
      if (saved.length) logEvent({ area: "성인 프로필 만들기", title: `${saved.length}명 · ${saved.map((id) => `${nameOf(id)}(체위·장소 ${nsfwOut[id]?.positions?.length ?? 0})`).join(", ")}` });
      for (const id of bad) fail("성인 프로필 만들기", nameOf(id), "성인 프로필", { id, error: "문제: 답의 nsfw 값이 비었거나 형식이 맞지 않아요" }, nsfwTries);
    }
    if (made) log(`기본 성격이 없던 인물 ${made}명의 성격을 만들었어요`);
    return made;
  })().finally(() => { running = null; });
}
