// v1.8.1 정규식 전처리 설정 카드: 기억 분석 입력·임베딩 질의에서 상태창 같은 군더더기를 걷어 낸다(원본 채팅은 그대로).
import { h } from "../../dom.js";
import { btn, note } from "../../kit.js";
import { parseRegexFile } from "../../../engine/regexprep.js";
import { fail } from "./common.js";

export function regexSection(ctx, { S, save, sw, section }) {
  const R = S.regex ?? { on: false, useChar: true, useModules: true, files: [] };
  const msg = h("div", { "aria-live": "polite" });
  const file = h("input", { type: "file", accept: ".json,application/json", "aria-label": "정규식 파일 올리기", style: "max-width:100%" });
  const upload = async () => {
    const f = file.files?.[0]; if (!f) { msg.replaceChildren(note("info", "정규식 JSON 파일을 먼저 고르세요.")); return; }
    const r = parseRegexFile(await f.text());
    if (r.error) { msg.replaceChildren(note("err", r.error)); return; }
    await save((s) => { const cur = s.regex ?? { on: false, useChar: true, useModules: true, files: [] }; cur.files = [...cur.files.filter((x) => x.name !== f.name), { name: f.name.slice(0, 80), entries: r.entries }].slice(-8); s.regex = cur; });
  };
  return section("정규식 전처리",
    h("p", { class: "rb-muted" }, "기억을 분석하거나 임베딩 질의를 만들 때, 글에서 상태창·HTML 같은 군더더기를 먼저 지워요. 리수의 ‘요청 데이터 수정’ 정규식만 쓰고, 원본 채팅은 바뀌지 않아요."),
    sw("정규식 전처리 켜기", !!R.on, (s, v) => { (s.regex ??= { useChar: true, useModules: true, files: [] }).on = v; }),
    sw("이 봇의 정규식 포함", R.useChar !== false, (s, v) => { (s.regex ??= { on: false, files: [] }).useChar = v; }),
    sw("켜진 모듈의 정규식 포함", R.useModules !== false, (s, v) => { (s.regex ??= { on: false, files: [] }).useModules = v; }),
    h("div", { class: "rb-mem-field", style: "flex-direction:column;align-items:stretch;gap:6px" },
      h("span", null, "정규식 파일 올리기 (선택)"), file, btn("올리기", { size: "sm", onClick: () => upload().catch(fail(ctx)) }),
      ...(R.files ?? []).map((f) => h("div", { class: "rb-mem-edrow", style: "justify-content:space-between;align-items:center" }, h("span", null, `${f.name} · ${f.entries.length}개`),
        btn("빼기", { size: "sm", onClick: () => save((s) => { s.regex.files = s.regex.files.filter((x) => x.name !== f.name); }) })))),
    msg);
}
