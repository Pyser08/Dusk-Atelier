// 에셋 제작 설정을 봇·모듈 안에 함께 저장하는 칸. 코어 내보내기(.charx·.risum·.json)는 이 칸을 빼고 만든다(배포용).
// 봇: char.extentions.dusk_sdstudio / 모듈: module.dusk_sdstudio — 값은 { t(저장 시각), z(gzip+base64 JSON) }
export var BOT_KEY = "dusk_sdstudio";

export function readSnap(obj, kind) {
  const v = kind === "module" ? obj?.[BOT_KEY] : obj?.extentions?.[BOT_KEY];
  return v && typeof v === "object" && typeof v.z === "string" && Number.isFinite(v.t) ? v : null;
}
export function writeSnap(obj, kind, snap) {
  if (kind === "module") { if (snap) obj[BOT_KEY] = snap; else delete obj[BOT_KEY]; return obj; }
  const ex = { ...(obj.extentions ?? {}) };
  if (snap) ex[BOT_KEY] = snap; else delete ex[BOT_KEY];
  obj.extentions = ex;
  return obj;
}
// 내보내기용 사본에서 빼기(원본은 그대로)
export function stripSnap(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const c = JSON.parse(JSON.stringify(obj));
  delete c[BOT_KEY];
  if (c.extentions && typeof c.extentions === "object") delete c.extentions[BOT_KEY];
  if (c.data?.extensions && typeof c.data.extensions === "object") delete c.data.extensions[BOT_KEY];
  return c;
}
