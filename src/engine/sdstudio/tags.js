// 태그 자동완성(SDStudio db_v5.csv 이식, MIT — data/sdstudio/LICENSE-SDStudio.txt).
// 한 줄 = 단어,종류,횟수,넘겨줄 태그(없으면 null). 종류: 0 일반 · 1 작가 · 3 작품 · 4 캐릭터 · 5 메타.
// 한글 줄은 "머리/길이/긴 머리" 꼴(분류 경로) → 넣을 때는 넘겨줄 영어 태그.
export var CATEGORY_KO = { 0: "일반", 1: "작가", 3: "작품", 4: "캐릭터", 5: "메타" };
export var norm = (s) => String(s ?? "").toLowerCase().replace(/[_\s]+/g, " ").trim();

export function parseTagDb(text) {
  const words = [], keys = [], cats = [], freqs = [], redirs = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    let e = text.indexOf("\n", i); if (e < 0) e = n;
    const line = text.charCodeAt(e - 1) === 13 ? text.slice(i, e - 1) : text.slice(i, e);
    i = e + 1;
    if (!line) continue;
    // 단어에 쉼표가 들어 있을 수 있어 뒤에서부터 3칸을 자른다
    const c3 = line.lastIndexOf(","), c2 = line.lastIndexOf(",", c3 - 1), c1 = line.lastIndexOf(",", c2 - 1);
    if (c1 <= 0) continue;
    const w = line.slice(0, c1), r = line.slice(c3 + 1);
    words.push(w); keys.push(norm(w.includes("/") ? w.slice(w.lastIndexOf("/") + 1) : w) + (w.includes("/") ? "\u0000" + norm(w) : ""));
    cats.push(Number(line.slice(c1 + 1, c2)) || 0); freqs.push(Number(line.slice(c2 + 1, c3)) || 0); redirs.push(r === "null" ? "" : r);
  }
  return { words, keys, cats, freqs, redirs, size: words.length };
}

// 한글: 자모로 풀어서 비교 → 치는 중인 글자(머ㄹ·멀)·초성만(ㄱㅁ)도 맞게
var CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ", JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ", JONG = ["", "ㄱ", "ㄲ", "ㄱㅅ", "ㄴ", "ㄴㅈ", "ㄴㅎ", "ㄷ", "ㄹ", "ㄹㄱ", "ㄹㅁ", "ㄹㅂ", "ㄹㅅ", "ㄹㅌ", "ㄹㅍ", "ㄹㅎ", "ㅁ", "ㅂ", "ㅂㅅ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
var SPLIT = { "ㅘ": "ㅗㅏ", "ㅙ": "ㅗㅐ", "ㅚ": "ㅗㅣ", "ㅝ": "ㅜㅓ", "ㅞ": "ㅜㅔ", "ㅟ": "ㅜㅣ", "ㅢ": "ㅡㅣ", "ㄳ": "ㄱㅅ", "ㄵ": "ㄴㅈ", "ㄶ": "ㄴㅎ", "ㄺ": "ㄹㄱ", "ㄻ": "ㄹㅁ", "ㄼ": "ㄹㅂ", "ㄽ": "ㄹㅅ", "ㄾ": "ㄹㅌ", "ㄿ": "ㄹㅍ", "ㅀ": "ㄹㅎ", "ㅄ": "ㅂㅅ" };
export function jamo(str) {
  let o = "";
  for (const ch of String(str)) {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c >= 0 && c < 11172) { const j = JUNG[Math.floor(c / 28) % 21]; o += CHO[Math.floor(c / 588)] + (SPLIT[j] ?? j) + JONG[c % 28]; }
    else o += SPLIT[ch] ?? ch;
  }
  return o;
}
export var chosung = (str) => [...String(str)].map((ch) => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }).join("");
var HAS_KO = /[ㄱ-ㅎㅏ-ㅣ가-힣]/, ONLY_CHO = /^[ㄱ-ㅎ\s]+$/;
function koIndex(db) {
  if (db.ko) return db.ko;
  const ids = [], jk = [], ck = [];
  for (let i = 0; i < db.size; i++) if (HAS_KO.test(db.words[i])) { const k = norm(db.words[i]); ids.push(i); jk.push(jamo(k)); ck.push(chosung(k)); }
  return (db.ko = { ids, jk, ck });
}

// 찾기: 앞부분이 맞는 것 먼저, 그다음 중간에 들어 있는 것. 같은 태그로 넘어가는 줄은 하나만.
export function searchTags(db, q, limit = 8) {
  const k = norm(q);
  if (!db || k.length < 1) return [];
  const top = [], pre = [], mid = [];
  if (HAS_KO.test(k)) {   // 한글: 자모·초성으로(분류 경로 전체에서). 이름 첫머리·낱말 첫머리 > 이름 안 > 분류 경로
    const ko = koIndex(db), cho = ONLY_CHO.test(k), qq = cho ? k.replace(/\s+/g, "") : jamo(k);
    for (let n = 0; n < ko.ids.length; n++) {
      const hay = cho ? ko.ck[n].replace(/\s+/g, "") : ko.jk[n], at = hay.indexOf(qq);
      if (at < 0) continue;
      const last = hay.lastIndexOf("/");
      (at === last + 1 || (at > last && hay[at - 1] === " ") ? top : at > last || at === 0 ? pre : mid).push(ko.ids[n]);
    }
  } else for (let i = 0; i < db.size; i++) {
    const key = db.keys[i], at = key.indexOf(k);
    if (at < 0) continue;
    (at === 0 || key[at - 1] === " " || key[at - 1] === "\u0000" || key[at - 1] === "/" ? pre : mid).push(i);
  }
  const by = (a, b) => db.freqs[b] - db.freqs[a];
  top.sort(by); pre.sort(by); mid.sort(by);
  const out = [], seen = new Set();
  for (const i of [...top, ...pre, ...mid]) {
    const tag = db.redirs[i] || db.words[i];
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push({ word: db.words[i], tag, cat: db.cats[i], freq: db.freqs[i] });
    if (out.length >= limit) break;
  }
  return out;
}

// 커서 앞의 지금 쓰는 태그(쉼표·줄바꿈·|·{ 뒤부터) 범위
export function currentToken(text, caret) {
  let s = caret;
  while (s > 0 && !",\n|{}[]()<>".includes(text[s - 1])) s--;
  while (s < caret && text[s] === " ") s++;
  let e = caret;
  while (e < text.length && !",\n|{}[]()<>".includes(text[e])) e++;
  return { start: s, end: e, word: text.slice(s, caret) };
}
// 태그 넣기: 지금 쓰는 칸을 태그로 바꾸고 ", " 붙이기
export function insertTag(text, caret, tag) {
  const t = currentToken(text, caret);
  const after = text.slice(t.end).replace(/^\s*,?\s*/, "");
  const head = text.slice(0, t.start) + tag + ", ";
  return { text: head + after, caret: head.length };
}
export var fmtFreq = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
