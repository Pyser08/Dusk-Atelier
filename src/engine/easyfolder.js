// 쉬운 로어북 애드온의 봇 폴더 정리 (순수). 리스 폴더 = DB characterOrder의 { id, name, color, data:[chaId] }.
//   classify: 봇 하나를 종류(시뮬봇·단일 캐릭터봇·그룹)와 장르로 나눈다 — 이름·태그·설명·로어북만 본다(AI 호출 없음).
//   suggest: 모드(kind·genre·both)에 따라 '폴더 이름 → 봇 id' 제안. applyPlan: 같은 이름 폴더가 있으면 거기로, 없으면 새로 만든다.
import { createFolder2, moveChar, layout } from "../data/charorder.js";

export const KIND_NAME = { sim: "시뮬봇", single: "단일 캐릭터봇", group: "그룹 채팅" };
// 순서가 우선순위 (점수가 같으면 앞의 것)
export const GENRES = [
  ["블루 아카이브", /블루\s?아카|블아|키보토스|blue\s?archive|샬레|게헨나|트리니티|밀레니엄|아비도스|백귀야행|붉은겨울|발키리|아리우스/i],
  ["무협", /무협|강호|무림|문파|사파|정파|내공|협객/i],
  ["판타지", /판타지|fantasy|마법|마왕|용사|엘프|드래곤|드워프|기사단|왕국|제국|던전|이세계|모험가/i],
  ["SF", /\bsf\b|sci-?fi|우주|사이버|cyber|로봇|안드로이드|미래|함선|행성|메카/i],
  ["호러", /호러|horror|공포|좀비|괴담|귀신|크리처|살인마|아포칼립스/i],
  ["현대", /현대|학교|학원|고등학교|대학|회사|직장|아파트|도시|카페|아이돌|school|office/i],
  ["로맨스", /로맨스|romance|연애|순애|썸|연인|결혼/i],
  ["일상", /일상|힐링|slice\s?of\s?life/i],
];
export const OTHER = "기타";

const textOf = (c) => [c?.name, ...(Array.isArray(c?.tags) ? c.tags : []), c?.creator, String(c?.desc ?? "").slice(0, 3000), String(c?.creatorNotes ?? "").slice(0, 1000)].filter(Boolean).join("\n");
const personish = (e) => e && e.mode !== "folder" && !e.alwaysActive && String(e.key ?? "").trim() && String(e.comment ?? "").trim().length <= 20;

export function kindOf(c) {
  if (c?.type === "group") return "group";
  const people = (c?.globalLore ?? []).filter(personish).length;
  // 인물처럼 보이는 키 항목이 4개 이상이거나, 설명에 '등장인물'·'캐릭터 목록' 같은 말이 있으면 시뮬봇
  if (people >= 4 || /등장\s?인물|캐릭터\s?(목록|리스트)|characters?\s?list|시뮬|simulat/i.test(textOf(c))) return "sim";
  return "single";
}
export function genreOf(c) {
  const t = textOf(c);
  let best = OTHER, score = 0;
  for (const [name, re] of GENRES) {
    const n = (t.match(new RegExp(re.source, "gi")) ?? []).length;
    if (n > score) { best = name; score = n; }
  }
  return best;
}
export const classify = (c) => ({ kind: kindOf(c), genre: genreOf(c) });

export function folderName(cls, mode) {
  if (mode === "kind") return KIND_NAME[cls.kind];
  if (mode === "genre") return cls.genre;
  return `${cls.genre} · ${KIND_NAME[cls.kind]}`;
}

// 제안: [{ name, ids:[chaId], names:[봇 이름] }]. keepFiled면 이미 폴더에 든 봇은 그대로 둔다
export function suggest(chars, order, { mode = "genre", keepFiled = true, classifyFn = classify } = {}) {
  const filed = new Set(layout(order ?? [], chars).filter((x) => x.type === "folder").flatMap((x) => x.ids));
  const map = new Map();
  for (const c of chars) {
    if (!c || c.trashTime || !c.chaId) continue;
    if (keepFiled && filed.has(c.chaId)) continue;
    const name = folderName(classifyFn(c), mode);
    if (!map.has(name)) map.set(name, { name, ids: [], names: [] });
    const g = map.get(name);
    g.ids.push(c.chaId);
    g.names.push(c.name || "(이름 없음)");
  }
  return [...map.values()].sort((a, b) => b.ids.length - a.ids.length);
}

const isFolder = (x) => x && typeof x === "object" && Array.isArray(x.data);
// 제안 적용 → 새 characterOrder. 같은 이름 폴더가 있으면 그 폴더에 더한다
export function applyPlan(order, plan, { mkId }) {
  let o = order ?? [];
  for (const g of plan) {
    if (!g.ids?.length) continue;
    const f = o.find((x) => isFolder(x) && x.name === g.name);
    o = f ? moveChar(o, g.ids, { folderId: f.id }) : createFolder2(o, { id: mkId(), name: g.name, ids: g.ids });
  }
  return o;
}

// 화면용 묶음: [{ folder:{id,name}|null, chars:[c] }] (폴더 밖 봇은 folder:null 한 묶음)
export function groups(chars, order) {
  const byId = new Map(chars.filter(Boolean).map((c) => [c.chaId, c]));
  const out = [], loose = [];
  for (const x of layout(order ?? [], chars)) {
    if (x.type === "folder") out.push({ folder: { id: x.folder.id, name: x.folder.name || "(이름 없는 폴더)" }, chars: x.ids.map((id) => byId.get(id)).filter(Boolean) });
    else if (byId.has(x.id)) loose.push(byId.get(x.id));
  }
  if (loose.length) out.push({ folder: null, chars: loose });
  return out;
}
