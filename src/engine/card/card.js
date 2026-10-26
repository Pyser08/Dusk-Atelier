// 카드 모델: 생성·무결성 해시·이식용 사본. 순수 함수(해시는 crypto.subtle).
import { normGrade, colorOf } from "./grade.js";
import { newId } from "../util.js";

export const CARD_VERSION = 1;
const stable = (v) => JSON.stringify(v, (_, x) => x && !Array.isArray(x) && typeof x === "object" ? Object.keys(x).sort().reduce((o, k) => (o[k] = x[k], o), {}) : x);
// crypto.subtle은 http로 열린 리스(보안 컨텍스트 아님)에서는 없다 → 순수 JS 구현으로 대신한다.
const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
export function sha256Bytes(msg) {
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const len = msg.length, total = (len + 9 + 63) & ~63, buf = new Uint8Array(total), view = new DataView(buf.buffer), w = new Uint32Array(64);
  buf.set(msg); buf[len] = 0x80; view.setUint32(total - 8, Math.floor(len / 0x20000000)); view.setUint32(total - 4, (len << 3) >>> 0);
  const rr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (rr(a, 7) ^ rr(a, 18) ^ (a >>> 3)) + w[i - 7] + (rr(b, 17) ^ rr(b, 19) ^ (b >>> 10))) | 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  return [...H].map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}
export async function sha256(text) {
  const bytes = new TextEncoder().encode(typeof text === "string" ? text : stable(text));
  if (globalThis.crypto?.subtle) { const buf = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
  return sha256Bytes(bytes);
}
// 해시에 들어가는 필드(이미지 위치·확대 등 편집값은 제외 → 그림을 바꿔도 카드 정체성은 그대로).
const HASH_KEYS = ["v", "grade", "name", "keyword", "quote", "tags", "tagDefinitions", "before", "after", "relationship", "currentState", "memories", "source"];
export const hashData = (c) => Object.fromEntries(HASH_KEYS.map((k) => [k, c[k] ?? null]));
export const defaultCrop = () => ({ zoom: 1, x: 0, y: 0, rotation: 0 });
export const defaultImage = () => ({ ref: null, crop: defaultCrop(), veil: 1 });

// body: normalizeCardResponse 결과. source: {botName, chatName, chaId, chatId, from, to, minGrade, people}
export async function newCard({ body, grade, source, image = null, now = new Date() }) {
  const g = normGrade(grade);
  const c = {
    v: CARD_VERSION, id: newId("c"), createdAt: now.toISOString(), modifiedAt: now.toISOString(), grade: g, color: colorOf(g),
    name: body.name, keyword: body.keyword, quote: body.quote, tags: body.tags, tagDefinitions: body.tagDefinitions, stats: body.stats,
    before: body.before, after: body.after, relationship: body.relationship, currentState: body.currentState, memories: body.memories,
    source: { ...source }, image: image ?? defaultImage(), hash: ""
  };
  c.hash = await sha256(hashData(c));
  return c;
}
export async function verifyCard(c) {
  if (!c || c.v !== CARD_VERSION) throw new Error("지원하지 않는 카드 버전이에요.");
  if (!c.hash || c.hash !== await sha256(hashData(c))) throw new Error("카드 데이터 해시가 일치하지 않아요.");
  return c;
}
// 등급·태그·문구를 고치면 해시를 다시 만든다. patch는 얕게 합친다.
export async function editCard(c, patch) {
  const n = { ...c, ...patch, modifiedAt: new Date().toISOString() };
  if (patch.grade) { n.grade = normGrade(patch.grade); n.color = colorOf(n.grade); }
  n.hash = await sha256(hashData(n));
  return n;
}
// PNG에 넣는 사본: 이미지 경로 같은 기기 의존 값은 뺀다.
export const portable = (c) => { const { image, ...rest } = c; return { ...structuredClone(rest), image: { crop: image?.crop ?? defaultCrop(), veil: image?.veil ?? 1 } }; };
