// 페르소나 빌더 파일 백업 (aibuild 애드온 전용 — 페르소나 공방의 파일 백업을 Dusk 방식으로)
// 파일 하나에 고른 리스 페르소나(설명·이름·이미지)와 빌더의 양식·AI 프리셋·덮어쓰기 백업·봇 기본 페르소나를 담는다.
// 가져오기: 같은 id·같은 내용은 건너뛰고, 같은 id인데 내용이 다르면 '(가져옴)' 사본으로 더한다. 지금 쓰던 칸(draft)은 건드리지 않는다.
export var BACKUP_FORMAT = "dusk.personabuilder.backup";

var b64 = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
var unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
var PERSONA_KEYS = ["id", "name", "personaPrompt", "note", "icon", "largePortrait"];
var pick = (p) => Object.fromEntries(PERSONA_KEYS.filter((k) => p?.[k] !== undefined).map((k) => [k, p[k]]));

// 내보내기: personas = 리스 페르소나 중 고른 것, pb = loadPB 결과, backups = loadBackups 결과
export async function makeBackup({ personas = [], pb, backups = [], botDefaults = {}, readImage = null, version = "" }) {
  const images = {};
  for (const p of personas) {
    if (!p.icon || images[p.icon] || !readImage) continue;
    try {
      const d = await readImage(p.icon);
      if (d) images[p.icon] = b64(new Uint8Array(d));
    } catch { /* 이미지 없이 */ }
  }
  return {
    format: BACKUP_FORMAT, version: 1, plugin: version, exported: new Date().toISOString(),
    personas: personas.map(pick), images,
    templates: (pb?.templates ?? []).map((t) => ({ id: t.id, name: t.name, text: t.text, ...(t.builtin ? { builtin: true } : {}) })),
    ais: (pb?.ais ?? []).map((a) => ({ ...a })),
    backups: backups.map((b) => ({ ...b })),
    botDefaults: { ...botDefaults }
  };
}
export var backupName = (d = new Date()) => `dusk-persona-backup-${d.toISOString().slice(0, 10).replace(/-/g, "")}.json`;

export function parseBackup(text) {
  let d;
  try { d = typeof text === "string" ? JSON.parse(text) : text; } catch { throw new Error("JSON 파일이 아니에요."); }
  if (!d || d.format !== BACKUP_FORMAT || !Array.isArray(d.personas)) throw new Error("Dusk 페르소나 백업 파일이 아니에요.");
  return d;
}

// 가져오기 계획(저장은 하지 않음). cur = { personas, pb, backups, botDefaults }, uid = 새 id 함수.
// 돌려줌: { personas, templates, ais, backups, botDefaults, needImages: [{ from, persona }], stat }
export function planImport(cur, data, uid) {
  const stat = { added: 0, copies: 0, same: 0, templates: 0, ais: 0, backups: 0, botDefaults: 0 };
  const personas = [...(cur.personas ?? [])];
  const byId = new Map(personas.map((p) => [p?.id, p]));
  const needImages = [];
  const idMap = {};
  for (const raw of data.personas ?? []) {
    if (!raw || typeof raw !== "object" || !raw.id) continue;
    const p = { note: "", largePortrait: false, icon: "", ...pick(raw) };
    const old = byId.get(p.id);
    if (old && old.name === p.name && (old.personaPrompt ?? "") === (p.personaPrompt ?? "")) { stat.same++; idMap[raw.id] = old.id; continue; }
    if (old) { p.id = uid(); p.name = `${p.name || "이름 없음"} (가져옴)`; stat.copies++; }
    else stat.added++;
    idMap[raw.id] = p.id;
    if (p.icon && data.images?.[p.icon]) needImages.push({ from: p.icon, persona: p });
    else if (p.icon && !data.images?.[p.icon]) p.icon = old?.icon ?? p.icon;
    personas.push(p);
    byId.set(p.id, p);
  }
  const merge = (list, incoming, same, key) => {
    const out = [...list];
    for (const x of incoming ?? []) {
      if (!x?.id) continue;
      const o = out.find((y) => y.id === x.id);
      if (o && same(o, x)) continue;
      const add = { ...x };
      delete add.builtin;
      if (o || x.builtin) { add.id = uid(); add.name = `${x.name || "이름 없음"} (가져옴)`; }
      out.push(add);
      stat[key]++;
    }
    return out;
  };
  const templates = merge(cur.pb?.templates ?? [], data.templates, (a, b) => a.text === b.text, "templates");
  const ais = merge(cur.pb?.ais ?? [], data.ais, (a, b) => JSON.stringify({ ...a, id: 0, name: 0 }) === JSON.stringify({ ...b, id: 0, name: 0 }), "ais");
  const seen = new Set((cur.backups ?? []).map((b) => `${b.id}|${b.at}`));
  const extra = (data.backups ?? []).filter((b) => b && !seen.has(`${b.id}|${b.at}`));
  stat.backups = extra.length;
  const backups = [...(cur.backups ?? []), ...extra].sort((a, b) => (b.at ?? 0) - (a.at ?? 0)).slice(0, 20);
  const botDefaults = { ...(cur.botDefaults ?? {}) };
  for (const [k, v] of Object.entries(data.botDefaults ?? {})) {
    if (botDefaults[k] || !v?.pid) continue;
    botDefaults[k] = { ...v, pid: idMap[v.pid] ?? v.pid };
    stat.botDefaults++;
  }
  return { personas, templates, ais, backups, botDefaults, needImages, stat };
}

// 이미지 되살리기: 같은 경로가 이미 있으면 그대로, 없으면 새 에셋으로 저장
export async function restoreImages(plan, data, { readImage, saveAsset }) {
  const paths = {};
  for (const { from, persona } of plan.needImages) {
    if (!(from in paths)) {
      let ok = false;
      try { ok = !!(await readImage(from)); } catch { /* 없음 */ }
      try { paths[from] = ok ? from : (await saveAsset(unb64(data.images[from]))) || ""; } catch { paths[from] = ""; }
    }
    persona.icon = paths[from];
  }
  return plan;
}
