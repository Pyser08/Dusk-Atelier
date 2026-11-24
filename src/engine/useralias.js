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

// 신고 #12: 규칙만으로는 흔한 이름 절반이 틀렸다(Ryan→랸, James→자메스) → 흔한 이름 표 + 한국어 로마자 표기를 먼저 본다
const table = (t) => new Map(t.split(";").map((x) => { const i = x.indexOf(" "); return [x.slice(0, i).toLowerCase(), x.slice(i + 1).split(",")]; }));
const NAMES = table(`Ryan 라이언;Ethan 이든,에단,이선;Michael 마이클,미카엘;Kai 카이;Noah 노아;Arthur 아서;Daniel 다니엘,대니얼;Alex 알렉스;Alexander 알렉산더;Alexandra 알렉산드라;Theo 테오;Theodore 시어도어;Chris 크리스;Christian 크리스찬,크리스티안;Christina 크리스티나;James 제임스;William 윌리엄;Charlotte 샬롯,샬럿;Emily 에밀리;Evelyn 에블린,에벌린;Claire 클레어;Clara 클라라;Victor 빅터;Victoria 빅토리아;Felix 펠릭스;Oliver 올리버;Olivia 올리비아;Sebastian 세바스찬,세바스티안;John 존;Johnny 조니;Jonathan 조나단,조너선;Jack 잭;Jackson 잭슨;Jacob 제이콥,야곱;Carter 카터;Adam 아담,애덤;Adrian 아드리안,에이드리언;Aiden 에이든,에이단;Alan 앨런,알란;Albert 앨버트,알베르트;Amy 에이미;Andrew 앤드류,앤드루;Angela 안젤라,앤젤라;Anna 안나,애나;Anne 앤;Anthony 앤서니,안토니;Ashley 애슐리;Aria 아리아;Asher 애셔,아셰르;Aurora 오로라;Ava 에이바,아바;Bella 벨라;Benjamin 벤자민;Blake 블레이크;Brian 브라이언;Caleb 칼렙,케일럽;Carl 칼;Caroline 캐롤라인;Cecilia 세실리아;Charles 찰스;Charlie 찰리;Chloe 클로이,클로에;Cole 콜;Cyrus 사이러스;Damian 데미안,다미안;Damon 데이먼;Dan 댄;Dante 단테;David 데이비드,다비드;Dean 딘;Diana 다이애나,디아나;Dominic 도미닉;Dylan 딜런;Edgar 에드거;Edward 에드워드;Eleanor 엘리너,엘레노어;Elena 엘레나;Eli 일라이,엘리;Elias 엘리아스;Elijah 엘리야,일라이저;Elizabeth 엘리자베스;Ella 엘라;Elliot 엘리엇;Emma 엠마;Eric 에릭;Eugene 유진;Eva 에바;Eve 이브;Evan 에반;Finn 핀;Frank 프랭크;Gabriel 가브리엘;George 조지;Grace 그레이스;Gray 그레이;Hannah 한나,해나;Harry 해리;Helen 헬렌;Henry 헨리;Hugo 휴고,위고;Ian 이안;Iris 아이리스;Isaac 아이작;Isabella 이사벨라;Ivan 이반;Ivy 아이비;Jane 제인;Jason 제이슨;Jasper 재스퍼;Jay 제이;Jennifer 제니퍼;Jenny 제니;Jeremy 제레미;Jessica 제시카;Jin 진;Joe 조;Joel 조엘;Joseph 조셉,요셉;Joshua 조슈아;Julia 줄리아;Julian 줄리안,율리안;Juliet 줄리엣;Justin 저스틴;Karl 칼;Katherine 캐서린;Kevin 케빈;Kyle 카일;Laura 로라;Lauren 로렌;Leah 레아,리아;Leo 레오;Leon 레온,리온;Levi 레비,리바이;Liam 리암;Lily 릴리;Lincoln 링컨;Logan 로건;Louis 루이스,루이;Lucas 루카스;Luke 루크;Lucy 루시;Lucifer 루시퍼;Luna 루나;Lydia 리디아;Marcus 마커스,마르쿠스;Maria 마리아;Mark 마크;Martin 마틴;Mary 메리;Mason 메이슨;Matthew 매튜;Max 맥스,막스;Maya 마야;Mia 미아;Mike 마이크;Nathan 네이선,나단;Nicholas 니콜라스;Nick 닉;Nina 니나;Nora 노라;Oscar 오스카;Owen 오웬;Patrick 패트릭;Paul 폴,바울;Peter 피터;Philip 필립;Phoenix 피닉스;Quinn 퀸;Rachel 레이첼;Raven 레이븐;Ray 레이;Rebecca 레베카;Rhys 리스;Richard 리처드;Robert 로버트;Robin 로빈;Roman 로만;Rose 로즈;Ruby 루비;Rune 룬;Ryder 라이더;Sam 샘;Samuel 사무엘,새뮤얼;Sara 사라,세라;Sarah 사라,세라;Scarlett 스칼렛;Sean 숀;Seraph 세라프;Seth 세스;Shade 셰이드;Silas 사일러스;Simon 사이먼,시몬;Sky 스카이;Skyler 스카일러;Sophia 소피아;Sophie 소피;Stella 스텔라;Stephen 스티븐;Steve 스티브;Summer 서머;Susan 수잔;Sylvia 실비아;Thomas 토마스;Tom 톰;Tony 토니;Tristan 트리스탄;Tyler 타일러;Vera 베라;Vincent 빈센트;Violet 바이올렛;Walter 월터;Wendy 웬디;Xavier 자비에,재비어;Zach 잭;Zane 제인,제인;Zero 제로;Zoe 조이,조에;Smith 스미스;Brown 브라운;Taylor 테일러;Jones 존스;Miller 밀러;Wilson 윌슨;Moore 무어;White 화이트;Black 블랙;Clark 클라크;Walker 워커;King 킹;Wright 라이트;Scott 스콧;Hill 힐;Green 그린;Baker 베이커;Parker 파커;Cooper 쿠퍼;Reed 리드;Bell 벨;Knight 나이트;Winter 윈터;Stone 스톤;Wolf 울프;Fox 폭스`);
const SURNAMES = table("kim 김;lee 이;yi 이;park 박;choi 최;jung 정;jeong 정;kang 강;cho 조;jo 조;yoon 윤;yun 윤;jang 장;lim 임;im 임;han 한;oh 오;seo 서;shin 신;kwon 권;hwang 황;ahn 안;an 안;song 송;ryu 류;yoo 유;yu 유;hong 홍;jeon 전;ko 고;go 고;moon 문;mun 문;yang 양;son 손;bae 배;baek 백;heo 허;nam 남;sim 심;noh 노;ha 하;kwak 곽;sung 성;cha 차;joo 주;ju 주;woo 우;min 민;jin 진;na 나;ji 지;um 엄;chae 채;won 원;bang 방;kong 공;hyun 현;byun 변;do 도;seok 석;sun 선");
const RR_I = [["kk", 1], ["tt", 4], ["pp", 8], ["ss", 10], ["jj", 13], ["ch", 14], ["g", 0], ["n", 2], ["d", 3], ["r", 5], ["l", 5], ["m", 6], ["b", 7], ["s", 9], ["j", 12], ["k", 15], ["t", 16], ["p", 17], ["h", 18], ["", 11]];
const RR_V = [["yeo", 6], ["yae", 3], ["wae", 10], ["ae", 1], ["ya", 2], ["eo", 4], ["ye", 7], ["wa", 9], ["oe", 11], ["yo", 12], ["wo", 14], ["we", 15], ["wi", 16], ["yu", 17], ["yoo", 17], ["eu", 18], ["ui", 19], ["oo", 13], ["ee", 20], ["a", 0], ["e", 5], ["o", 8], ["u", 13], ["i", 20]];
const RR_F = [["ng", 21], ["n", 4], ["m", 16], ["l", 8], ["k", 1], ["p", 17], ["t", 7], ["", 0]];
// 한국어 로마자 이름(Seojun → 서준). 음절이 적은 것부터 최대 3개. 끝까지 안 맞으면 []
function koreanReadings(w) {
  const out = []; let steps = 0;
  const go = (i, acc) => {
    if (steps++ > 3000) return;
    if (i === w.length) { if (acc.length) out.push(acc); return; }
    if (acc.length >= 4) return;
    for (const [a, l] of RR_I) { if (!w.startsWith(a, i)) continue;
      for (const [b, v] of RR_V) { const j = i + a.length; if (!w.startsWith(b, j)) continue;
        for (const [c, t] of RR_F) if (w.startsWith(c, j + b.length)) go(j + b.length + c.length, acc + syl(l, v, t)); } }
  };
  go(0, "");
  // 같은 길이면 다음 음절 첫소리로 넘기는 쪽(받침 적은 쪽)을 먼저
  const codas = (x) => [...x].filter((ch) => (ch.charCodeAt(0) - 0xac00) % 28).length;
  return [...new Set(out)].sort((x, y) => x.length - y.length || codas(x) - codas(y)).slice(0, 3);
}
// 확실한 읽기(표·로마자 성+이름)만
function sureReadings(words) {
  if (words.length > 1 && SURNAMES.has(words[0]) && !NAMES.has(words[1])) {
    const given = koreanReadings(words.slice(1).join("")); if (given.length) return SURNAMES.get(words[0]).flatMap((s) => given.slice(0, 2).flatMap((g) => [s + g]));
  }
  if (words.length > 1 && words.every((w) => NAMES.has(w))) { const a = words.map((w) => NAMES.get(w)[0]); return [a.join(" "), ...(NAMES.get(words[0]).slice(0, 2))]; }
  if (words.length > 1 && NAMES.has(words[0])) return NAMES.get(words[0]).slice(0, 2);
  return words.length === 1 ? NAMES.get(words[0]) ?? [] : [];
}
// 영문 이름(한 단어 또는 띄어 쓴 이름) → 한글 읽기 후보(최대 6개). 한글·기타 글자면 []
export function hangulReadings(name) {
  const s = String(name ?? "").trim().toLowerCase();
  if (!/^[a-z][a-z' -]{1,30}$/.test(s)) return [];
  const words = s.replace(/'/g, "").split(/[\s-]+/).filter(Boolean);
  const out = new Set(sureReadings(words));
  if (words.length === 1 && !out.size) for (const r of koreanReadings(words[0])) if (r.length >= 2) out.add(r);
  if (!out.size || words.length === 1) for (const magic of [true, false]) for (const ae of [false, true]) for (const th of [true, false]) {
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

// 직접 적은 다른 이름 바꾸기(나 화면). 쉼표·줄바꿈으로 나눈 글
export function setUserAliases(folder, text) {
  if (!folder) return [];
  folder.userAliases = [...new Set(String(text ?? "").split(/[,，\n]/).map((x) => x.trim().slice(0, 40)).filter((x) => x && !/^\{\{.*\}\}$/.test(x)))].slice(0, 16);
  return folder.userAliases;
}
const ak = (n) => String(n ?? "").normalize("NFKC").toLowerCase().replace(/[\s'"“”‘’「」『』]/g, "");
export const sameUserName = (a, b) => !!ak(a) && (ak(a) === ak(b) || hangulReadings(a).some((x) => ak(x) === ak(b)) || hangulReadings(b).some((x) => ak(x) === ak(a)));
// 기록기 답의 줄에서 이름 칸이 나의 이름과 정확히 같으면 {{user}}로(글·인용 칸은 건드리지 않음). taken: 나와 이름이 같은 다른 인물(문서 제목) — 직접 적은 이름(explicit)은 이보다 먼저
export function foldUserNames(raw, names = [], { taken = [], explicit = [] } = {}) {
  const ex = new Set(explicit.map(ak).filter(Boolean)), no = new Set(taken.map(ak)), set = new Set([...ex, ...names.map(ak).filter((k) => k && !no.has(k))]);
  if (!set.size) return String(raw ?? "");
  const one = (v) => { const t = v.trim(); return t && set.has(ak(t)) ? "{{user}}" : null; };
  return String(raw ?? "").split(/\r?\n/).map((line) => {
    const parts = line.split(/([|｜¦])/); if (parts.length < 3) return line;
    const end = /^\W*(?:call|호칭|keys|키워드)\W*$/i.test(parts[0]) ? Math.min(parts.length, 4) : parts.length;   // 호칭·키워드 글은 그대로
    for (let i = 2; i < end; i += 2) { const u = one(parts[i]); if (u) { parts[i] = u; continue; }
      if (i <= 10 && /[,，、]/.test(parts[i])) { const xs = parts[i].split(/[,，、]/); if (xs.length <= 12 && xs.every((x) => x.trim().length <= 24) && xs.some(one)) parts[i] = [...new Set(xs.map((x) => one(x) ?? x.trim()))].join(", "); } }
    return parts.join("");
  }).join("\n");
}
