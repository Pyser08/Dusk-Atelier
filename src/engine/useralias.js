// 장기기억 애드온: 유저(페르소나) 별칭(순수). 11-22 제보 — 페르소나 이름이 ‘Jade’인데 본문·기록은 ‘제이드’로 적혀
// 인물 위키에 jade(나)와 제이드가 따로 생기고 호감도도 갈라졌다. 영문 이름의 한글 읽기 후보와, 합칠 때 배운 이름을 유저 별칭으로 쓴다.
const CONS = { b: 7, c: 15, d: 3, f: 17, g: 0, h: 18, j: 12, k: 15, l: 5, m: 6, n: 2, p: 17, q: 15, r: 5, s: 9, t: 16, v: 7, z: 12 };
const CODA = { n: 4, m: 16, l: 8, ng: 21 };
const isV = (c) => "aeiou".includes(c);
const syl = (l, v, t = 0) => String.fromCharCode(0xac00 + (l * 21 + v) * 28 + t);

function read(word, { magic, ae, th }) {
  let w = word;
  let longAt = -1;
  const mm = /([aeiou])([^aeiouwy])e$/.exec(w);
  if (mm) { if (magic) longAt = mm.index; w = w.slice(0, -1); }   // 끝 e는 소리 안 남(magic이면 앞 모음을 길게)
  const softNext = (i) => "eiy".includes(word[i + 1] ?? "");
  const toks = [];
  for (let i = 0; i < w.length;) {
    const c = w[i], two = w.slice(i, i + 2);
    if (isV(c) || (c === "y" && i > 0 && !isV(w[i + 1] ?? ""))) {
      const g = { ee: [20], ea: [20], ie: [20], oo: [13], ai: [5, 20], ay: [5, 20], ei: [5, 20], ey: [5, 20], ou: [0, 13], ow: [0, 13], au: [8], aw: [8], oa: [8], eo: [5, 8] }[two];
      if (g && two !== "eo") { toks.push({ v: g }); i += 2; continue; }
      const long = i === longAt;
      const v = c === "a" ? (long ? [5, 20] : [ae ? 1 : 0]) : c === "e" ? (long ? [20] : [5]) : c === "i" || c === "y" ? (long ? [0, 20] : [20]) : c === "o" ? [8] : (long ? [17] : [13]);
      toks.push({ v }); i++; continue;
    }
    if (two === "ch") { toks.push({ c: 14, s: "ch" }); i += 2; continue; }
    if (two === "sh") { toks.push({ c: 9, s: "sh" }); i += 2; continue; }
    if (two === "th") { toks.push({ c: th ? 3 : 9, s: "th" }); i += 2; continue; }
    if (two === "ph") { toks.push({ c: 17 }); i += 2; continue; }
    if (two === "ck") { toks.push({ c: 15 }); i += 2; continue; }
    if (two === "ng" && !isV(w[i + 2] ?? "")) { toks.push({ c: 11, s: "ng" }); i += 2; continue; }
    if (c === "x") { toks.push({ c: 15 }, { c: 9 }); i++; continue; }
    if (c === "w" || c === "y") { toks.push({ glide: c }); i++; continue; }
    let j = CONS[c]; if (j == null) { i++; continue; }
    if (c === "c" && softNext(i)) j = 9;
    if (c === "g" && softNext(i)) j = 12;
    if (c === "s" && mm && i === w.length - 1 && magic) j = 12;   // Rose → 로즈
    toks.push({ c: j, s: j === 12 && c === "s" ? "z" : c }); i++;
  }
  let out = "", onset = null, glide = null;
  const last = () => out.slice(-1);
  const setCoda = (t) => { const ch = out.charCodeAt(out.length - 1) - 0xac00; if (ch < 0 || ch % 28) return false; out = out.slice(0, -1) + String.fromCharCode(0xac00 + ch + t); return true; };
  const flush = (tk) => { const v = tk.s === "ch" || tk.s === "sh" || tk.s === "j" ? 20 : 18; out += syl(tk.c, v); };
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i], nx = toks[i + 1];
    if (tk.glide) { glide = tk.glide; continue; }
    if (tk.v) {
      let v0 = tk.v[0];
      if (glide === "w") v0 = { 0: 9, 5: 15, 20: 16, 8: 14, 4: 14 }[v0] ?? 13;
      if (glide === "y") v0 = { 0: 2, 5: 7, 8: 12, 13: 17, 4: 6 }[v0] ?? 20;
      out += syl(onset ?? 11, v0); for (const v of tk.v.slice(1)) out += syl(11, v);
      onset = null; glide = null; continue;
    }
    if (nx?.v || nx?.glide) {
      if (onset != null) flush({ c: onset });
      if (tk.s === "l" && out && toks[i - 1]?.v) setCoda(8);   // 모음 사이 l → ㄹㄹ (Alice → 앨리스)
      onset = tk.c; continue;
    }
    if (onset != null) { flush({ c: onset }); onset = null; }
    if (CODA[tk.s] != null && out && setCoda(CODA[tk.s])) continue;
    flush(tk);
  }
  if (onset != null) flush({ c: onset });
  return out;
}

// 영문 이름(한 단어 또는 띄어 쓴 이름) → 한글 읽기 후보(최대 6개). 한글·기타 글자면 []
export function hangulReadings(name) {
  const s = String(name ?? "").trim().toLowerCase();
  if (!/^[a-z][a-z' -]{1,30}$/.test(s)) return [];
  const words = s.replace(/'/g, "").split(/[\s-]+/).filter(Boolean);
  const out = new Set();
  for (const magic of [true, false]) for (const ae of [false, true]) for (const th of [true, false]) {
    const r = words.map((w) => read(w, { magic, ae, th })).join(" ");
    if (r.trim()) out.add(r); if (words.length > 1) out.add(r.replace(/\s+/g, ""));
  }
  return [...out].slice(0, 6);
}
// 유저 이름 목록 + 한글 읽기 + 이 채팅에서 합칠 때 배운 이름(folder.userAliases)
export function userAliasesFor(names = [], folder = null) {
  const base = (names ?? []).filter((n) => typeof n === "string" && n.trim());
  return [...new Set([...base, ...base.flatMap(hangulReadings), ...(Array.isArray(folder?.userAliases) ? folder.userAliases : [])])];
}
export function addUserAlias(folder, name) {
  const n = String(name ?? "").trim(); if (!folder || !n) return;
  folder.userAliases = [...new Set([...(folder.userAliases ?? []), n])].slice(-16);
}
