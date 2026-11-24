// 인물 속마음 보기 애드온(id innerthought)
//  · 요청(beforeRequest): 메인 모델에게 본문과 함께 <dusk-thought> 태그로 인물 속마음을 쓰라고 안내(인물당 최소~최대 횟수). 호출은 늘지 않아요.
//    지난 응답의 속마음 태그는 요청 사본에서 뺀다(토큰 절약). 저장된 채팅은 그대로.
//  · 화면(display): 태그 → 반투명 생각 풍선 + 그 감정의 이미지(봇이 이미지를 내보내는 방식대로: 감정 이미지 {{emotion::}}, 에셋은 <img=""> / {{img::}} …)
//  · 장기기억 애드온의 캐릭터 상태창(이름 누르기)에 ‘속마음’ 탭: ext svc "innerthought".tabFor(이름들)
// 설정은 이 애드온 저장소(dusk.storage "settings").
import { buildAssetIndex, resolveTag } from "../../src/engine/imgtagfix.js";
import { normSettings, summary, hintText, assetList, stripThoughts, renderThoughts, pickImage, imageTag, detectStyle, collectFromMessages, thoughtsFor, cardTabHtml, emotionWords, HINT_MARK, TAG } from "../../src/engine/innerthought.js";
import { insertHint } from "../../src/engine/imghint.js";
import { readChar, readChat } from "../../src/data/apiread.js";
import { loadPrimaryUserName } from "../../src/data/usernames.js";

const textOf = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => p?.text ?? "").join("") : "");

export async function activate(api, ctx) {
  const dusk = ctx.dusk, ext = dusk.ext ?? ctx.ext ?? ctx.app?.ext, { h } = dusk.ui;
  const log = (...a) => console.log("[Dusk 속마음]", ...a);
  let st = normSettings(await dusk.storage.get("settings", null));
  const save = async (patch) => { st = normSettings({ ...st, ...patch }); await dusk.storage.set("settings", st); rev++; };
  let rev = 0;

  // 지금 봇의 이미지 목록·출력 방식·속마음 모음(봇·채팅·메시지 수가 같으면 그대로)
  let view = null, loading = null, at = 0;
  async function load(force = false) {
    if (!force && view && Date.now() - at < 3000) return view;
    return (loading ??= (async () => {
      try {
        // 0.1.2: 열린 채팅이 없으면 리스가 "reading 'chatPage'" 오류를 던진다 → 채팅 없음으로 본다
        const ci = await Promise.resolve().then(() => api.getCurrentCharacterIndex?.()).catch(() => -1), ti = await Promise.resolve().then(() => api.getCurrentChatIndex?.()).catch(() => -1);
        if (!(ci >= 0) || !(ti >= 0)) return (view = null);
        const ch = await readChar(api, ci, `${ti}`).catch(() => null), chat = await readChat(api, ci, ti).catch(() => null) ?? ch?.chats?.[ti];
        const msgs = chat?.message ?? [];
        const key = `${ch?.chaId}|${ti}|${msgs.length}|${String(msgs.at(-1)?.data ?? "").length}`;
        if (view?.key === key) { at = Date.now(); return view; }
        const emotions = (ch?.emotionImages ?? []).map((a) => a?.[0]).filter(Boolean).map(String);
        const assets = (ch?.additionalAssets ?? []).map((a) => a?.[0]).filter(Boolean).map(String);
        // 켜진 모듈 이미지까지(봇·채팅에 고정한 모듈 + 전역 켜짐) — 이미지 태그 교정과 같은 범위
        const groups = [[...assets, ...emotions]];
        try {
          const db = await api.getDatabase?.(["modules", "enabledModules"]);
          const on = new Set([...(db?.enabledModules ?? []), ...(ch?.modules ?? []), ...(chat?.modules ?? [])]);
          for (const m of db?.modules ?? []) { if (!on.has(m?.id)) continue; const l = (m?.assets ?? []).map((a) => a?.[0]).filter(Boolean).map(String); if (l.length) groups.push(l); }
        } catch { /* 봇 이미지만 */ }
        const idx = buildAssetIndex(groups);
        const recent = msgs.filter((m) => m?.role !== "user").slice(-12).map((m) => String(m?.data ?? ""));
        view = { key, botName: ch?.name ?? "", emotions, assets, idx, list: assetList(idx), style: detectStyle(recent), by: collectFromMessages(msgs), emos: emotionWords([...emotions, ...assets], [ch?.name ?? ""]) };
        at = Date.now(); rev++;
        return view;
      } catch (e) { log("읽기 실패", e?.message ?? e); return view; } finally { loading = null; }
    })());
  }
  // 모델이 고른 img= 이름을 이 봇·모듈의 실제 이미지로 맞춘다(이미지 태그 교정과 같은 해석). 없으면 감정 낱말로 짐작
  const imgFor = (v) => (t) => {
    if (!st.image || !v) return "";
    let pick = null;
    if (t.img && v.idx?.size) { const r = resolveTag(v.idx, t.img, null); if (r?.name) pick = { kind: v.emotions.includes(r.name) && !v.assets.includes(r.name) ? "emotion" : "asset", name: r.name }; }
    pick ??= pickImage(v, t.name, t.emo, { botName: v.botName });
    return imageTag(pick, v.style);
  };

  async function beforeRequest(messages, type) {
    try {
      if (!st.on || (type && type !== "model") || !Array.isArray(messages)) return messages;
      const v = await load();
      const user = await loadPrimaryUserName(api).catch(() => "");
      const list = messages.filter((m) => !(m?.role === "system" && textOf(m.content).startsWith(HINT_MARK)))
        .map((m) => (typeof m?.content === "string" && m.content.includes(`<${TAG}`) ? { ...m, content: stripThoughts(m.content) } : m));
      return insertHint(list, hintText(st, { emos: v?.emos ?? [], user, assets: v?.list ?? "" }));
    } catch (e) { log("요청 안내 실패", e?.message ?? e); return messages; }
  }
  async function onDisplay(text) {
    try {
      if (typeof text !== "string" || !text.toLowerCase().includes(`<${TAG}`)) return text;
      const v = await load().catch(() => null);
      return renderThoughts(text, imgFor(v));
    } catch { return text; }
  }
  const hook = async (fn, what) => { try { await fn(); } catch (e) { log(`${what} 훅 등록 실패`, e?.message ?? e); } };
  await hook(() => api.addRisuReplacer("beforeRequest", beforeRequest), "요청");
  await hook(() => api.addRisuScriptHandler("display", onDisplay), "화면");

  // 장기기억 상태창 ‘속마음’ 탭(동기 호출 — 모음은 미리 읽어 둔 것). rev가 바뀌면 상태창을 다시 만든다
  const svc = {
    rev: () => rev,
    tabFor(names = []) { if (!view) { load().catch(() => {}); return ""; } return cardTabHtml(thoughtsFor(view.by, names)); },
    refresh: () => load(true),
    settings: () => st
  };
  const offSvc = ext?.add?.("svc", "innerthought", svc);
  if (offSvc) dusk.onCleanup(offSvc);
  load().catch(() => {});

  const num = (label, key, desc) => {
    const out = h("b", { style: "min-width:2em;text-align:center;font-variant-numeric:tabular-nums" }, String(st[key]));
    const set = async (d) => { await save({ [key]: st[key] + d }); out.textContent = String(st[key]); paintNums(); };
    const pm = (t, d, aria) => h("button", { type: "button", class: "rb-btn sm", "aria-label": aria, onClick: () => set(d) }, t);
    const row = h("div", { class: "rb-srow", dataset: { k: key } }, h("span", { class: "t" }, label, h("small", null, desc)),
      h("span", { style: "display:inline-flex;align-items:center;gap:8px" }, pm("−", -1, `${label} 줄이기`), out, pm("+", 1, `${label} 늘리기`)));
    row._out = out; return row;
  };
  let nums = [];
  const paintNums = () => { for (const r of nums) r._out.textContent = String(st[r.dataset.k]); };
  const sw = (title, desc, key) => h("div", { class: "rb-srow" }, h("span", { class: "t" }, title, h("small", null, desc)),
    dusk.ui.switchEl(st[key], { label: title, onChange: async (v, el) => { dusk.ui.setSwitch?.(el, v) ?? el.setAttribute("aria-checked", v ? "true" : "false"); await save({ [key]: v }); } }));
  const body = () => {
    nums = [num("인물당 최소", "min", "한 응답에서 인물마다 적어도 이만큼(0이면 어울릴 때만)."), num("인물당 최대", "max", "한 응답에서 인물마다 많아도 이만큼(0~5).")];
    return h("div", { class: "rb-it-set", style: "display:flex;flex-direction:column" },
      sw("사용하기", "메인 모델이 본문과 함께 인물의 속마음을 써요(AI 호출은 늘지 않아요). 본문 사이에 반투명 생각 풍선으로 보여요.", "on"),
      ...nums,
      sw("감정 이미지 함께", "속마음의 감정에 맞는 봇 이미지를 풍선 안에 봇이 이미지를 내보내는 방식대로 넣어요.", "image"),
      h("small", { class: "rb-muted", style: "padding:8px 0;white-space:normal" }, "모은 속마음은 본문 인물 이름을 눌러 여는 캐릭터 상태창의 ‘속마음’ 탭에서 봐요(장기기억·관계도 애드온)."));
  };
  if (typeof dusk.addQuickSetting === "function") dusk.addQuickSetting({ id: "rb-qs-innerthought", title: "인물 속마음 보기", desc: "본문 사이에 인물 속마음을 생각 풍선으로", value: () => summary(st), settings: (el) => el.append(body()) });
  if (typeof dusk.addSettingsCard === "function") dusk.addSettingsCard({ title: "인물 속마음 보기", render: (el) => el.append(body()) });
  dusk.addPage({ title: "인물 속마음 보기", render(el) { dusk.ui.replace(el, dusk.ui.card("인물 속마음 보기", body())); } });
  return { deactivate() {} };
}
