// 월경·임신 보고를 슬롯과 무관한 별도 칸(cycle_report)으로 받는다(2.0.0 버그 5, 순수).
// 리수폿 Writer 규칙은 표식을 core.current_state 쓰기에만 붙이게 해서, 모델이 그 슬롯을 생략하면 추적이 영영 시작되지 않았다.
// 여기서는 cycle_report를 받아 기존 표식 줄(CYCLE:/SEX:/PREGNANCY KNOWN/BIRTH)로 바꿔 해당 인물의 current_state 항목에 붙인다.
// 리수폿 코드(src/engine/pot, 자동 생성)는 건드리지 않는다 — 표식 줄은 거기서 그대로 떼어 처리된다.
export const CYCLE_BLOCK_MARK = "[MENSTRUAL CYCLE · REPORT LINES]";
export const CYCLE_FIELD = "cycle_report";

export const CYCLE_FIELD_PROMPT = "\n\n# Cycle report (Dusk, separate field — required while cycle tracking is on)\n" +
  "Besides the report lines above, ALWAYS add one extra top-level key `cycle_report` to your single JSON object, even when you write no core.current_state entry. " +
  "List EVERY woman who appears in source:rp this turn: [{\"name\": \"<her wiki title>\", \"adult\": true, \"sex\": [{\"partner\": \"<man>\", \"contraception\": \"used\"|\"none\"}], \"known\": false, \"birth\": false}]. " +
  "`sex` lists only vaginal intercourse with a man shown in this turn (contraception \"used\" only when the RP clearly shows it). `known` = she learns this turn that she is pregnant; `birth` = she gives birth this turn. " +
  "Every other field stays exactly as specified.";

const key = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const clean = (v, n = 60) => String(v ?? "").replace(/[\r\n|]+/g, " ").trim().slice(0, n);

export function cycleLines(item) {
  if (!item || typeof item !== "object" || item.adult === false) return [];
  const out = ["CYCLE: adult woman"];
  for (const s of Array.isArray(item.sex) ? item.sex : []) {
    const partner = clean(s?.partner); if (!partner) continue;
    out.push(`SEX: ${partner} | contraception: ${String(s?.contraception).toLowerCase() === "used" ? "used" : "none"}`);
  }
  if (item.known === true) out.push("PREGNANCY KNOWN");
  if (item.birth === true) out.push("BIRTH");
  return out;
}

const markerEntry = (text) => ({ operation: "upsert", entry_ref: null, slot_id: "core.current_state", target_refs: [], context_key: null, label: "", assertion: "fact", text, evidence_refs: ["source:rp"], links: [], reason: "cycle report" });

// obj: Writer 응답 객체, scope: 위키 사본(snapshot). 반환: {obj, applied}
export function applyCycleReportObject(obj, scope) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj) || !Object.hasOwn(obj, CYCLE_FIELD)) return { obj, applied: 0 };
  const { [CYCLE_FIELD]: list, ...rest } = obj;
  const docs = Array.isArray(rest.documents) ? rest.documents.map((d) => ({ ...d, entries: Array.isArray(d?.entries) ? [...d.entries] : [] })) : [];
  const wikiDocs = Object.values(scope?.documents ?? {}).filter((d) => d?.type === "Character");
  const names = (d) => [d?.title, ...(d?.aliases ?? [])].map(key).filter(Boolean);
  let applied = 0;
  for (const item of Array.isArray(list) ? list : []) {
    const lines = cycleLines(item), k = key(item?.name);
    if (!lines.length || !k) continue;
    const doc = wikiDocs.find((d) => names(d).includes(k));
    const change = docs.find((c) => [c.title, ...(c.aliases_add ?? [])].map(key).includes(k) || (doc && c.document_ref === doc.id));
    if (change) {
      const cur = change.entries.find((e) => e?.slot_id === "core.current_state" && typeof e.text === "string");
      if (cur) { if (!/^CYCLE:/m.test(cur.text)) cur.text = `${cur.text}\n${lines.join("\n")}`; }
      else change.entries.push(markerEntry(lines.join("\n")));
      applied++;
    } else if (doc) {
      // 이번 턴에 바뀐 칸이 없는 인물: 같은 제목의 create를 보내면 리수폿이 기존 문서 갱신으로 바꾼다(redirectDuplicateCreates).
      docs.push({ document_ref: `new:cycle-${applied}-${String(doc.id).replace(/[^A-Za-z0-9_-]/g, "_")}`, operation: "create", type: "character", title: doc.title, aliases_add: [], aliases_remove: [], tags_add: [], tags_remove: [], event_context: null, entries: [markerEntry(lines.join("\n"))] });
      applied++;
    }
  }
  return { obj: { ...rest, documents: docs }, applied };
}

export function applyCycleReport(raw, scope, parse = JSON.parse) {
  let obj; try { obj = parse(raw); } catch { return { raw, applied: 0 }; }
  const r = applyCycleReportObject(obj, scope);
  return r.obj === obj ? { raw, applied: 0 } : { raw: JSON.stringify(r.obj), applied: r.applied };
}
