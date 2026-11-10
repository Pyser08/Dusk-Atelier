// 모듈 호환 화면(애드온 modcompat). 지금 연 봇에서 켜진 모듈의 이미지가 어떻게 처리되는지 보여 주고 끄고 켠다.
const GUARD = { none: "필요 없음", soft: "살짝 감싸 지킴", hard: "단단히 감싸 지킴" };
const VARS = [["auto", "자동"], ["found0", "나오면 0"], ["found1", "나오면 1"], ["off", "끔"]];
const RENDER = { keep: "봇 정규식 그대로", inline: "봇 정규식을 대신 적용", native: "리스 기본 그리기" };

export function renderModCompat(el, dusk, mc) {
  const { ui } = dusk;
  const { h, replace, card, note, btn, toggleRow, badge, chip } = ui;
  const draw = async () => {
    replace(el, note("info", "지금 연 봇을 살펴보는 중이에요…"));
    let d;
    try { d = await mc.diagnose(); } catch (e) { replace(el, note("err", `살펴보지 못했어요: ${e?.message ?? e}`)); return; }
    if (!d.ok) { replace(el, note("info", d.reason === "group" ? "그룹 채팅에서는 쓰지 않아요." : "채팅을 하나 연 뒤 다시 열어 주세요.")); return; }
    const set = async (patch) => { await mc.setBotCfg(d.chaId, patch); draw(); };
    const imgMods = d.modules.filter((m) => m.own > 0);

    const head = card(`${d.botName || "이 봇"}`,
      h("p", { class: "rb-mc-sub" }, `켜진 모듈 ${d.modules.length}개 · 이미지 있는 모듈 ${imgMods.length}개 · 안내할 인물 ${d.chars}명${d.singles ? ` · 단일 이미지 ${d.singles}장` : ""}`),
      toggleRow("이 봇에서 모듈 호환 쓰기", "모듈 이미지가 이 봇 이미지와 같은 모양으로 나오게 해요. 봇·모듈 파일은 바꾸지 않아요.", d.cfg.on !== false, (v) => set({ on: v })),
      imgMods.length ? null : note("info", "켜진 모듈에 이 봇에 없는 이미지가 없어요. 할 일이 없어요."));

    const rows = d.modules.map((m) => h("div", { class: "rb-mc-row" },
      h("div", { class: "rb-mc-name" }, m.name, m.own ? badge(`이미지 ${m.own}`) : badge("이미지 없음")),
      m.own ? h("div", { class: "rb-mc-meta" },
        `그리기: ${RENDER[m.render] ?? "-"} · 지키기: ${GUARD[m.guard] ?? "-"} · 모델 안내: ${m.selfRender ? "모듈이 직접 안내" : m.promptOff ? "끔" : "넣음"}`) : null,
      m.shadowed ? h("div", { class: "rb-mc-meta" }, `봇에 같은 이름이 있는 이미지 ${m.shadowed}장은 봇 것을 써요.`) : null,
      m.own && !m.selfRender ? h("div", { class: "rb-mc-act" }, btn(m.promptOff ? "안내 다시 넣기" : "이 모듈 안내 빼기", { size: "sm", kind: "ghost", onClick: () => {
        const off = new Set(d.cfg.promptOff ?? []); m.promptOff ? off.delete(m.id) : off.add(m.id); set({ promptOff: [...off] });
      } })) : null));
    const mods = card("모듈별 처리", ...(rows.length ? rows : [note("info", "켜진 모듈이 없어요.")]));

    const shapes = card("이 봇의 이미지 태그",
      h("p", { class: "rb-mc-sub" }, `모델에게 알려 주는 모양: ${d.template}`),
      d.shapes.length ? h("ul", { class: "rb-mc-list" }, ...d.shapes.map((s) => h("li", {}, h("code", {}, s.src), ` — ${s.kind === "bot" ? "봇" : s.kind === "module" ? `모듈 ${s.name}` : "프리셋"}${s.usesList ? " (봇 에셋 목록만 확인 → 대신 적용)" : ""}`)))
        : note("info", "이 봇에는 이미지를 그리는 정규식이 없어요. 모듈 이미지는 리스 기본 방식으로 그려요."));

    const v = d.vars;
    const vars = card("인물 감지 변수",
      h("p", { class: "rb-mc-sub" }, v.names.length
        ? `모듈 로어북이 {{getvar::인물}}로 소개를 숨기고 보이는 인물 ${v.names.length}명을 최근 대화에 나왔는지로 채워요. 봇 Lua가 다루는 인물은 건드리지 않아요.`
        : "모듈 로어북에 이 봇이 채우지 않는 인물 변수가 없어요."),
      v.names.length ? h("p", { class: "rb-mc-meta" }, `${v.names.slice(0, 8).join(", ")}${v.names.length > 8 ? ` 외 ${v.names.length - 8}명` : ""} · 지금 규칙: 나오면 ${v.mode === "found1" ? "1" : v.mode === "found0" ? "0" : v.found ?? "0"}${v.mode === "auto" ? " (자동)" : ""}`) : null,
      v.names.length ? h("div", { class: "rb-mc-act" }, ...VARS.map(([id, label]) => chip(label, { pressed: (v.mode ?? "auto") === id, onClick: () => set({ vars: id }) }))) : null);
    const block = h("details", { class: "rb-mc-details" }, h("summary", {}, "모델에게 넣는 안내 보기"), h("pre", { class: "rb-mc-pre" }, d.block || "(넣을 안내가 없어요)"));
    const adv = card("세부 설정",
      toggleRow("응답 저장 때 지키기", "봇의 ‘응답 수정’ 정규식이 모듈 이미지 태그를 지우지 못하게 해요.", d.cfg.guard !== false, (v) => set({ guard: v })),
      toggleRow("화면에 그리기", "봇 그리기 정규식이 모듈 이미지를 못 그리면 대신 그려요.", d.cfg.display !== false, (v) => set({ display: v })),
      toggleRow("모델에게 이미지 이름 알려 주기", "요청에 모듈 인물·표정 이름을 짧게 넣어요(저장되는 채팅은 그대로).", d.cfg.prompt !== false, (v) => set({ prompt: v })),
      block,
      h("div", { class: "rb-mc-act" }, btn("이 채팅의 지킴 표식 풀기", { size: "sm", kind: "ghost", onClick: async () => {
        const ok = await ui.confirm({ title: "표식 풀기", body: "이 채팅에 저장된 모듈 이미지 태그를 원래 모양으로 되돌려요. 애드온을 끄기 전에 쓰면 좋아요. 봇이 지우는 태그는 다음 표시부터 보이지 않을 수 있어요.", ok: "풀기" });
        if (!ok) return;
        try { const n = await mc.unwrapChat(); dusk.toast(n ? `메시지 ${n}개를 되돌렸어요` : "되돌릴 표식이 없어요"); } catch (e) { dusk.toast(`되돌리지 못했어요: ${e?.message ?? e}`, { error: true }); }
      } })));

    const o = d.overlaps;
    const warn = [];
    if (o.regex.length) warn.push(h("li", {}, `같은 정규식이 여러 곳에 있어요 ${o.regex.length}건 — `, o.regex.slice(0, 5).map((r) => `${r.where.join(" · ")}`).join(" / ")));
    if (o.lorebook.length) warn.push(h("li", {}, `같은 키워드 로어북이 여러 모듈에 있어요 ${o.lorebook.length}건 — `, o.lorebook.slice(0, 5).map((r) => r.where.join(" · ")).join(" / ")));
    if ((o.lua.bot ? 1 : 0) + o.lua.modules.length > 1) warn.push(h("li", {}, `Lua 트리거가 ${o.lua.bot ? "봇과 " : ""}${o.lua.modules.join(" · ")}에 있어요. 서로 따로 돌지만, 응답마다 엔진을 다시 만들어 느려질 수 있어요. 봇 고유 기능(호감도·상태창 등)은 모듈 인물에 적용되지 않을 수 있어요.`));
    const over = card("겹침 살펴보기", warn.length ? h("ul", { class: "rb-mc-list" }, ...warn) : note("info", "겹치는 곳을 찾지 못했어요."));

    replace(el, h("style", {}, CSS), head, mods, shapes, vars, adv, over,
      h("div", { class: "rb-mc-act" }, btn("다시 살펴보기", { size: "sm", onClick: draw })));
  };
  draw();
}

const CSS = `
.rb-addon-page .rb-addon-card{padding:14px 16px;margin-bottom:10px}
.rb-mc-sub{margin:6px 0 8px;color:var(--rb-sub);font-size:13px;overflow-wrap:anywhere}
.rb-mc-row{padding:10px 0;border-top:1px solid var(--rb-line2);min-width:0}
.rb-mc-row:first-of-type{border-top:0}
.rb-mc-name{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-weight:600;color:var(--rb-text);overflow-wrap:anywhere}
.rb-mc-meta{margin-top:6px;font-size:12.5px;color:var(--rb-sub);overflow-wrap:anywhere}
.rb-mc-act{margin-top:8px;display:flex;gap:8px;flex-wrap:wrap}
.rb-mc-list{margin:6px 0 0;padding-left:18px;font-size:12.5px;color:var(--rb-sub)}
.rb-mc-list li{margin:4px 0;overflow-wrap:anywhere}
.rb-mc-list code{font-size:12px;color:var(--rb-text);word-break:break-all}
.rb-mc-details{margin-top:10px}
.rb-mc-details summary{cursor:pointer;color:var(--rb-accent);font-size:13px}
.rb-mc-pre{white-space:pre-wrap;word-break:break-word;font-size:12px;background:var(--rb-surf);padding:10px 12px;border-radius:8px;margin:8px 0 0;max-height:280px;overflow:auto}
`;
