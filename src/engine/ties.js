// 2.2.30 장기기억: 관계 종류(가족·파티·동료·직장 동료·주종·사제 …). 관계 진도(처음 봄→아주 가까움)는 장면 수·감정으로 짐작해
// 가족인데도 '처음 봄'처럼 틀리기 쉬워 위키에서 뺐다. 대신 기록기가 이야기에 드러난 관계 종류를 줄 하나로 적고(추가 호출 없음),
// 위키는 그 종류를 배지로 보여 준다. 엔진의 진도(감정 상한용)는 남기되 관계 종류를 바닥으로 삼는다(가족은 친한 사이부터).
// up: 위·아래가 있는 관계에서 위쪽 사람(상사·주인·스승·선배·보호자). 없으면 "".
// g: 고치기 화면 묶음. 정규식은 위에서부터 맞춰 보므로 구체적인 것을 앞에 둔다.
export const TIE_GROUPS = Object.freeze([["fam", "가족·혼인"], ["love", "연애"], ["friend", "친구"], ["team", "소속·동료"], ["rank", "위계·주종"], ["deal", "계약·거래"], ["foe", "대립"], ["etc", "기타"]]);
export const TIE_KINDS = Object.freeze([
  { id: "parent", g: "fam", ko: "부모·자식", floor: 2, up: ["부모", "자식"], re: /parent|child|부모|자식|엄마|아빠|어머니|아버지|딸|아들|mother|father|daughter|son\b/ },
  { id: "sibling", g: "fam", ko: "형제자매", floor: 2, up: ["손위", "손아래"], re: /sibling|sister|brother|형제|자매|남매|언니|오빠|누나|동생/ },
  { id: "twin", g: "fam", ko: "쌍둥이", floor: 2, re: /twin|쌍둥이/ },
  { id: "spouse", g: "fam", ko: "부부", floor: 2, re: /spouse|부부|배우자|husband|wife|married|아내|남편/ },
  { id: "fiance", g: "fam", ko: "약혼", floor: 2, re: /fianc|약혼|정혼|betroth/ },
  { id: "inlaw", g: "fam", ko: "인척", floor: 1, re: /in-?law|인척|시댁|처가|사돈|며느리|사위|시누|처제/ },
  { id: "relative", g: "fam", ko: "친척", floor: 1, re: /relative|cousin|aunt|uncle|niece|nephew|친척|사촌|이모|고모|삼촌|조카/ },
  { id: "family", g: "fam", ko: "가족", floor: 2, re: /family|가족|식구/ },
  { id: "adopted", g: "fam", ko: "입양 가족", floor: 2, up: ["양부모", "양자"], re: /adopt|입양|양부|양모|양녀|양자/ },
  { id: "sworn", g: "fam", ko: "의형제", floor: 2, re: /sworn|의형제|의자매|의남매/ },
  { id: "ex", g: "love", ko: "전 연인", floor: 1, re: /\bex\b|ex-|전 ?애인|전 ?연인|전 ?남친|전 ?여친|헤어진|전처|전남편/ },
  { id: "dating", g: "love", ko: "연인", floor: 2, re: /dating|lover|girlfriend|boyfriend|연인|애인|사귀/ },
  { id: "arranged", g: "love", ko: "정략", floor: 1, re: /arranged|정략/ },
  { id: "fwb", g: "love", ko: "몸만 아는 사이", floor: 1, re: /fwb|friends with benefits|섹스 ?프렌드|섹프|파트너 관계/ },
  { id: "childhood", g: "friend", ko: "소꿉친구", floor: 2, re: /childhood|소꿉/ },
  { id: "bestfriend", g: "friend", ko: "단짝", floor: 2, re: /best ?friend|bff|단짝|절친|베프/ },
  { id: "friend", g: "friend", ko: "친구", floor: 1, re: /friend|친구|벗/ },
  { id: "penpal", g: "friend", ko: "온라인 친구", floor: 1, re: /pen ?pal|online|온라인|채팅 ?친구|게임 ?친구/ },
  { id: "party", g: "team", ko: "파티", floor: 1, re: /party|파티|모험|adventur/ },
  { id: "guild", g: "team", ko: "길드·조직", floor: 1, re: /guild|clan|order|organi[sz]ation|길드|조직|기사단|교단|클랜|문파/ },
  { id: "squad", g: "team", ko: "전우", floor: 1, re: /squad|soldier|army|전우|부대|소대|분대/ },
  { id: "coworker", g: "team", ko: "직장 동료", floor: 1, re: /cowork|직장|회사|colleague|office/ },
  { id: "comrade", g: "team", ko: "동료", floor: 1, re: /comrade|ally|동료|teammate|팀원|동지/ },
  { id: "classmate", g: "team", ko: "동급생", floor: 1, re: /classmate|동급생|반 ?친구|같은 반|동기/ },
  { id: "club", g: "team", ko: "동아리", floor: 1, re: /club|동아리|부원|서클/ },
  { id: "band", g: "team", ko: "팀·그룹 멤버", floor: 1, re: /band|idol group|member|멤버|그룹|밴드/ },
  { id: "senior", g: "rank", ko: "선후배", floor: 1, up: ["선배", "후배"], re: /senior|junior|선배|후배|선후배/ },
  { id: "boss", g: "rank", ko: "상사·부하", floor: 1, up: ["상사", "부하"], re: /boss|superior|subordinate|상사|부하|상관/ },
  { id: "master", g: "rank", ko: "주종", floor: 1, up: ["주인", "종자"], re: /master|servant|maid|butler|주종|주인|하인|메이드|집사|retainer/ },
  { id: "lord", g: "rank", ko: "군신", floor: 1, up: ["군주", "신하"], re: /lord|vassal|king|queen|ruler|subject|군신|군주|신하|왕|영주|기사 ?서약/ },
  { id: "guard", g: "rank", ko: "호위", floor: 1, up: ["호위 대상", "호위"], re: /guard|bodyguard|escort|호위|경호/ },
  { id: "mentor", g: "rank", ko: "사제", floor: 1, up: ["스승", "제자"], re: /mentor|teacher|student|disciple|apprentice|사제|스승|제자|선생/ },
  { id: "guardian", g: "rank", ko: "보호자", floor: 1, up: ["보호자", "피보호자"], re: /guardian|ward|보호자|후견/ },
  { id: "familiar", g: "rank", ko: "계약 소환", floor: 1, up: ["소환자", "사역마"], re: /familiar|summon|사역마|소환|권속|계약수/ },
  { id: "captor", g: "rank", ko: "포로", floor: 0, up: ["붙잡은 쪽", "포로"], re: /captor|captive|prisoner|hostage|포로|인질|감금/ },
  { id: "employer", g: "deal", ko: "고용", floor: 1, up: ["고용주", "고용인"], re: /employ|hire|고용|용병|mercenary/ },
  { id: "client", g: "deal", ko: "의뢰", floor: 1, up: ["의뢰인", "해결사"], re: /client|commission|의뢰/ },
  { id: "doctor", g: "deal", ko: "의사·환자", floor: 1, up: ["의사", "환자"], re: /doctor|patient|healer|의사|환자|치료사/ },
  { id: "landlord", g: "deal", ko: "집주인·세입자", floor: 1, up: ["집주인", "세입자"], re: /landlord|tenant|집주인|세입자|하숙/ },
  { id: "partner", g: "deal", ko: "사업 파트너", floor: 1, re: /business|사업|동업/ },
  { id: "contract", g: "deal", ko: "계약", floor: 1, re: /contract|계약|pact|맹약/ },
  { id: "debt", g: "deal", ko: "빚", floor: 0, up: ["빌려준 쪽", "빚진 쪽"], re: /debt|loan|빚|채권|채무/ },
  { id: "rival", g: "foe", ko: "라이벌", floor: 1, re: /rival|라이벌|경쟁/ },
  { id: "nemesis", g: "foe", ko: "숙적", floor: 0, re: /nemesis|archenemy|숙적|원수/ },
  { id: "enemy", g: "foe", ko: "적", floor: 0, re: /enemy|foe|적대|^적$/ },
  { id: "target", g: "foe", ko: "추적·표적", floor: 0, up: ["쫓는 쪽", "쫓기는 쪽"], re: /hunter|hunted|target|bounty|추적|표적|현상금/ },
  { id: "roommate", g: "etc", ko: "동거인", floor: 1, re: /roommate|housemate|동거|룸메/ },
  { id: "neighbor", g: "etc", ko: "이웃", floor: 0, re: /neighbo|이웃/ },
  { id: "savior", g: "etc", ko: "은인", floor: 1, up: ["은인", "도움받은 쪽"], re: /savior|saviour|benefactor|은인|목숨을 구/ },
  { id: "fan", g: "etc", ko: "팬", floor: 0, up: ["스타", "팬"], re: /fan|idol|팬|아이돌|추종/ },
  { id: "regular", g: "etc", ko: "단골", floor: 1, up: ["가게 주인", "단골"], re: /regular|customer|shopkeeper|단골|손님|가게/ },
  { id: "acquaint", g: "etc", ko: "지인", floor: 1, re: /acquaint|지인|아는 사이/ },
]);
export const TIE_BY_ID = Object.freeze(Object.fromEntries(TIE_KINDS.map((k) => [k.id, k])));
export const tieKind = (s) => { const t = String(s ?? "").trim().toLowerCase(); return TIE_BY_ID[t] ? t : TIE_KINDS.find((k) => k.re.test(t))?.id ?? ""; };
export const TIE_STAGE1 = "\ntie|Name|Other|kind|Upper      a lasting relationship newly shown (Other may be {{user}}); kind = one English word (parent, sibling, spouse, dating, ex, friend, party, guild, coworker, classmate, boss, master, lord, mentor, senior, guardian, employer, client, rival, enemy, roommate, savior …); Upper = who is above, or ended";

const nk0 = (s) => String(s ?? "").normalize("NFC").toLowerCase().replace(/\s+/g, "");
export const tieKey = (a, b, K = nk0) => [K(a), K(b)].sort().join("|");
// 기록기 줄(이미 | 로 나뉨) → 보고. who(name) → 알려진 이름("" 이면 버림)
export function tieReport(f, who) {
  const a = who(f[1]), b = who(f[2]), tie = tieKind(f[3]);
  if (!a || !b || a === b || !tie) return null;
  const u = String(f[4] ?? "").trim(), ended = /^(ended|end|끝|해소|종료)$/i.test(u);
  const up = ended || !TIE_BY_ID[tie].up || !u ? "" : (who(u) || "");
  return { kind: "tie", a, b, tie, up: up === a || up === b ? up : "", ...(ended ? { ended: true } : {}) };
}
// 반영(extra.ties). 직접 고친 쌍(lock)은 기록기가 바꾸지 않는다. 반환: 바뀐 글 또는 ""
export function applyTie(ties, r, turn = 0) {
  const k = tieKey(r.a, r.b), cur = ties[k] ??= { a: r.a, b: r.b, kinds: {} };
  if (cur.lock) return "";
  const had = cur.kinds[r.tie];
  if (r.ended) { if (!had) return ""; delete cur.kinds[r.tie]; if (!Object.keys(cur.kinds).length) delete ties[k]; return `관계 끝 ${r.a}·${r.b} ${TIE_BY_ID[r.tie].ko}`; }
  if (had && (had.up ?? "") === (r.up ?? "")) return "";
  cur.kinds[r.tie] = { up: r.up ?? "", at: had?.at ?? turn };
  return `관계 ${r.a}·${r.b} ${TIE_BY_ID[r.tie].ko}`;
}
// 두 사람 사이 관계 종류들(보기용). K: 이름 → 비교 키(유저 별칭을 맞추려면 memoryhuman.keyOf(folder))
export function tiesBetween(ties, a, b, K = nk0) {
  const ka = K(a), kb = K(b);
  const e = Object.values(ties ?? {}).find((x) => { const xa = K(x.a), xb = K(x.b); return (xa === ka && xb === kb) || (xa === kb && xb === ka); });
  if (!e) return [];
  return Object.entries(e.kinds ?? {}).filter(([id]) => TIE_BY_ID[id]).map(([id, v]) => {
    const kd = TIE_BY_ID[id], upK = v.up ? K(v.up) : "";
    // 내(a) 쪽에서 본 이름: 상대가 위면 상대의 위 이름(“스승”), 내가 위면 상대의 아래 이름(“제자”)
    const role = kd.up && upK ? (upK === kb ? kd.up[0] : upK === ka ? kd.up[1] : "") : "";
    return { id, ko: kd.ko, role, up: v.up ?? "", floor: kd.floor, label: role ? `${kd.ko}(${role})` : kd.ko, at: v.at };
  }).sort((x, y) => y.floor - x.floor);
}
export const tieFloor = (ties, a, b, K) => Math.max(0, ...tiesBetween(ties, a, b, K).map((t) => t.floor));
// 주입용 짧은 줄(등장인물끼리·유저 포함)
export function tieLines(ties, names, K = nk0, limit = 6) {
  const keys = new Set((names ?? []).map(K)), out = [];
  for (const e of Object.values(ties ?? {})) {
    if (!keys.has(K(e.a)) || !keys.has(K(e.b))) continue;
    const ks = Object.entries(e.kinds ?? {}).filter(([id]) => TIE_BY_ID[id]).map(([id, v]) => (v.up ? `${id} (${v.up} is ${TIE_BY_ID[id].up?.[0] ?? "above"})` : id));
    if (ks.length) out.push(`- ${e.a} ↔ ${e.b}: ${ks.join(", ")}`);
    if (out.length >= limit) break;
  }
  return out;
}
// 직접 고치기: kinds 통째 교체(빈 배열이면 지움) + 잠금
export function setTies(ties, a, b, list) {
  const k = tieKey(a, b);
  if (!list?.length) { ties[k] = { a, b, kinds: {}, lock: true }; return; }
  ties[k] = { a, b, lock: true, kinds: Object.fromEntries(list.filter((x) => TIE_BY_ID[x.id]).map((x) => [x.id, { up: x.up ?? "", at: x.at ?? 0 }])) };
}
