// 간단 모드 빠른 시작 (순수): 키 하나와 모델 이름으로 연결·메인/보조 프로필·용도를 한 번에 만든다.
// 리스에서 쓰던 샘플링(온도·응답 길이·페널티)을 그대로 가져온다. 리스 플러그인 API는 API 키·일부 모델 칸을 읽을 수 없어 키는 직접 넣는다.
import { normalizeConnection, normalizeProfile } from "./profile.js";
const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
// 리스 DB(허용된 칸만) → 프로필 샘플링. 리스는 온도·페널티를 100배 값으로 저장한다(80 = 0.8).
export function risuSampling(db) {
  const pct = (v) => (n(v) == null ? null : Math.round(v) / 100);
  return { temperature: pct(db?.temperature), maxTokens: n(db?.maxResponse) && db.maxResponse > 0 ? Math.round(db.maxResponse) : null, frequencyPenalty: pct(db?.frequencyPenalty), presencePenalty: pct(db?.PresensePenalty) };
}
// 리스 모델 이름(읽을 수 있을 때만). "gemini-2.5-flash" 같은 실제 이름만 쓰고 리스 내부 별명은 버린다.
export function risuModels(db) {
  const real = (v) => (typeof v === "string" && /^(gemini|gpt|o\d|claude|deepseek|grok)[\w.\-:/]*$/i.test(v.trim()) ? v.trim() : "");
  return { main: real(db?.aiModel), sub: real(db?.subModel) };
}
// cfg를 바꾸지 않고 새 cfg를 돌려준다. 같은 종류 연결이 있으면 그 연결에 키를 더한다.
export function quickSetup(cfg, { kind = "google", keyId = "", mainModel, subModel = "", sampling = {} }) {
  if (!mainModel) throw new Error("메인 모델 이름이 필요해요");
  const out = JSON.parse(JSON.stringify(cfg));
  let conn = out.connections.find((c) => c.kind === kind);
  if (!conn) { conn = normalizeConnection({ kind }); out.connections.push(conn); }
  if (keyId && !conn.keyIds.includes(keyId)) conn.keyIds.push(keyId);
  const mk = (name, model) => normalizeProfile({ name, connectionId: conn.id, model, sampling, cache: { gemini: "auto", gv: 2 } });
  const main = mk(`메인 · ${mainModel}`.slice(0, 40), mainModel); out.profiles.push(main);
  out.purposes.main.profileId = main.id;
  if (subModel && subModel !== mainModel) { const sub = mk(`보조 · ${subModel}`.slice(0, 40), subModel); out.profiles.push(sub); out.subProfileId = sub.id; }
  else out.subProfileId = "";
  out.enabled = true;
  return out;
}
