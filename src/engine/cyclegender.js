// 11-24: 성별이 바뀐(TS) 인물의 월경(순수). 기록 모델은 남자로 시작한 인물을 여성 줄에 잘 안 적어 월경이 영영 시작되지 않았다
// → 이 채팅 성별(folder.gender: 직접 고름·이야기에서 바뀜)과 이번 응답의 성별 변화 보고로 여성 목록을 맞춘다. Erosync 추정값(orient)은 쓰지 않는다.
import { characterDocs, isUserNsfwDoc } from "./usernsfw.js";
import { sameKoreanPerson } from "./namekr.js";
const nk = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
// 몸의 성별: 지금 남성으로 정해져 있고 임신 중이 아니면 주기를 멈춘다
export const cyclePaused = (f, doc, st = null) => f?.gender?.[doc?.id]?.g === "m" && !st?.conception;
export function cycleByGender(reports, { folder = null, scene = [], changes = [] } = {}) {
  const docs = characterDocs(folder), same = (a, b) => nk(a) === nk(b) || sameKoreanPerson(a, b);
  const docOf = (n) => docs.find((d) => [d.title, ...(d.aliases ?? [])].some((x) => nk(x) === nk(n))) ?? docs.find((d) => sameKoreanPerson(d.title, n)) ?? null;
  const isUser = (n, d) => /^(\{\{user\}\}|user|유저)$/i.test(String(n).trim()) || isUserNsfwDoc(d);
  const gOf = (n) => { const cur = folder?.gender?.[docOf(n)?.id]; if (cur?.by === "user") return cur.g; const c = changes.filter((x) => x?.kind === "sex" && same(x.name, n)).at(-1); return c?.g ?? cur?.g ?? null; };
  const added = [], removed = [];
  const out = (reports ?? []).filter((r) => { if (gOf(r.name) !== "m" || r.known || r.birth || r.loss) return true; removed.push(r.name); return false; });
  for (const n of new Set(scene)) {
    const d = docOf(n); if (!n || isUser(n, d) || gOf(n) !== "f" || out.some((r) => same(r.name, n) || (d && docOf(r.name) === d))) continue;
    const name = d?.title ?? n; added.push(name);
    out.push({ name, adult: true, sex: [], known: false, birth: false, period: false, loss: false });
  }
  return { reports: out, added, removed };
}
