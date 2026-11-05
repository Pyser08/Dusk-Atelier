// 인물 한 명의 NSFW 프로필(직접 고친 값 + 선호·금기 태그)을 파일로 주고받는다. AI가 분석한 값은 참고용으로만 담고 불러올 때는 쓰지 않는다.
export const PROFILE_KIND = "dusk-ero-profile";
const clamp = (v) => { if (v === null || v === undefined || v === "") return null; const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null; };
const strs = (a) => (Array.isArray(a) ? a : []).map((x) => String(x ?? "").trim().slice(0, 30)).filter(Boolean).slice(0, 12);
// got = er.profile("get") 결과, tags = { likes, limits }
export function buildProfileFile(got, tags) {
  const scalars = {}, analysed = {};
  for (const s of got.scalars ?? []) { if (s.override != null) scalars[s.key] = s.override; if (s.base != null) analysed[s.key] = s.base; }
  const pf = got.pref?.override ?? null;
  return {
    kind: PROFILE_KIND, v: 1, at: new Date().toISOString(), name: String(got.name ?? ""),
    overrides: {
      scalars, eroticInterest: got.eroticInterest?.override ?? null, gender: got.gender?.override || "", cycle: got.cycle?.override || "",
      pref: pf && ["female", "male", "genderless"].some((k) => pf[k] != null) ? { female: pf.female ?? null, male: pf.male ?? null, genderless: pf.genderless ?? null } : null
    },
    tags: { likes: strs(tags?.likes), limits: strs(tags?.limits) },
    analysed: { scalars: analysed, eroticInterest: got.eroticInterest?.base ?? null, gender: got.gender?.analysed ?? "" }
  };
}
export function readProfileFile(text) {
  let d; try { d = JSON.parse(text); } catch { throw new Error("프로필 파일을 읽지 못했어요 (JSON이 아니에요)"); }
  if (!d || d.kind !== PROFILE_KIND) throw new Error("Dusk NSFW 프로필 파일이 아니에요");
  if (d.v !== 1) throw new Error("이 파일은 더 새로운 버전이라 읽지 못해요");
  const o = d.overrides && typeof d.overrides === "object" ? d.overrides : {};
  const scalars = {};
  for (const [k, v] of Object.entries(o.scalars && typeof o.scalars === "object" ? o.scalars : {})) { const n = clamp(v); if (n != null) scalars[String(k).slice(0, 60)] = n; }
  const p = o.pref && typeof o.pref === "object" ? o.pref : null;
  return {
    name: String(d.name ?? "").slice(0, 100),
    scalars, eroticInterest: clamp(o.eroticInterest),
    gender: ["female", "male", "genderless"].includes(o.gender) ? o.gender : "", cycle: ["on", "off"].includes(o.cycle) ? o.cycle : "",
    pref: p ? { female: clamp(p.female), male: clamp(p.male), genderless: clamp(p.genderless) } : null,
    tags: { likes: strs(d.tags?.likes), limits: strs(d.tags?.limits) }
  };
}
// 불러온 값을 지금 인물에 '그대로 덮어쓰는' 고치기 patch로. 파일에 없는 칸은 분석값(null)으로 돌린다.
export function profilePatch(got, f) {
  const patch = {};
  for (const s of got.scalars ?? []) patch[s.key] = s.key in f.scalars ? f.scalars[s.key] : null;
  if (got.eroticInterest) patch.eroticInterest = f.eroticInterest;
  patch.gender = f.gender; patch.cycle = f.cycle; patch.pref = f.pref && Object.values(f.pref).some((x) => x != null) ? f.pref : null;
  return patch;
}
