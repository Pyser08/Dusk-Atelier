import { h, replace, copyText } from "../dom.js";
import { btn, note, progressBar } from "../kit.js";
import { readDb } from "../../data/modules.js";
import { AI_MODES, runAI } from "../../engine/merge.js";
import { newCharacterBase, uniqueDisplayName, ensureCharacterInOrder } from "../../engine/character.js";
import { isGenerating } from "../../engine/safety.js";
import { scanChat, chunkEntries, pickLore, summaryPrompt, mergePrompt, profilePrompt, greetingPrompt } from "../../engine/charsplit.js";
import { loadCharSplit, saveCharSplit, makeInstruction } from "../../data/charsplit.js";

const drafts = new WeakMap();
const textOf = v => typeof v === "string" ? v : Array.isArray(v) ? v.map(p => typeof p === "string" ? p : textOf(p?.text ?? p?.data ?? p?.content ?? "")).join("\n") : v && typeof v === "object" ? textOf(v.text ?? v.data ?? v.content ?? v.mes ?? v.message ?? "") : String(v ?? "");
const messageText = m => {
  const values = [m?.data, m?.content, m?.text, m?.mes, m?.message].map(textOf);
  return values.find(v => /⟦(?:C:|\/C|S⟧|\/S|T:)/.test(v)) ?? values.find(v => v.trim()) ?? "";
};
const idOf = c => String(c?.chaId ?? c?.id ?? "");
const box = (...children) => h("div", { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:10px" }, ...children);
const row = (label, el) => h("label", { style: "display:flex;flex-direction:column;gap:5px" }, h("b", { style: "font-size:13px" }, label), el);
const input = (value, placeholder = "") => h("input", { class: "rb-input", value, placeholder });
const area = (value, placeholder = "", rows = 6) => h("textarea", { class: "rb-input", value, placeholder, rows, style: "width:100%;box-sizing:border-box;resize:vertical;min-height:90px" });
const actions = (...children) => h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;align-items:center" }, ...children);

export async function renderCharSplit(ctx) {
  let d = drafts.get(ctx);
  if (!d) {
    d = { step:0, bots:[], botId:"", chats:[], selected:[], people:[], person:"", entries:[], lore:[], aliases:{}, record:"", desc:"", greeting:"", lang:"English", extra:"", mode:"submodel", model:"", busy:false, creating:false };
    drafts.set(ctx, d);
  }
  const api = ctx.api;
  const settings = await loadCharSplit(api);
  const root = h("div", { class:"rb-section rb-scroll", style:"flex:1;max-width:1100px;min-width:0" });
  root.appendChild(actions(
    btn("← 도구", { onClick:() => ctx.go("tools", null) }),
    h("h2", { class:"rb-h2", style:"margin:0" }, "캐릭터 분리"),
    h("span", { class:"rb-badge k-good" }, settings.enabled === false ? "전역 꺼짐" : "기본 켜짐")
  ));
  root.appendChild(note("info", "인물과 {{user}}의 상호작용을 모아 관계 기록을 만들고, 로어북과 함께 단일 캐릭터 봇으로 분리해요. 원본 봇과 채팅은 수정하지 않아요."));
  root.appendChild(actions(...["① 봇·채팅","② 인물","③ 로어북","④ AI 요약","⑤ 새 봇"].map((label, i) =>
    btn(label, { kind:d.step === i ? "primary" : "", onClick:() => { if (!d.busy) { d.step = i; renderCharSplit(ctx); } } })
  )));
  const body = h("div", { style:"display:flex;flex-direction:column;gap:12px" });
  root.appendChild(body);
  const nav = n => { d.step = n; renderCharSplit(ctx); };
  if (d.step === 0) await stepChoose(ctx, d, settings, body, nav);
  else if (d.step === 1) stepPerson(ctx, d, body, nav);
  else if (d.step === 2) stepLore(ctx, d, body, nav);
  else if (d.step === 3) stepAI(ctx, d, body, nav);
  else stepCreate(ctx, d, body, nav);
  replace(ctx.main, root);
}

async function stepChoose(ctx, d, settings, body, nav) {
  const api = ctx.api;
  if (!d.bots.length) {
    try {
      const db = await readDb(api, ["characters"]);
      d.bots = (db.characters ?? []).filter(Boolean);
      const idx = await api.getCurrentCharacterIndex().catch(() => -1);
      if (!d.botId && d.bots[idx]) d.botId = idOf(d.bots[idx]);
    } catch (e) { body.appendChild(note("err", "봇 목록을 읽지 못했어요: " + (e?.message ?? e))); return; }
  }
  const botSearch = input(d.botSearch ?? "", "봇 이름 검색");
  const makeBotOptions = () => {
    const q = String(d.botSearch ?? "").trim().toLocaleLowerCase();
    const found = d.bots.filter(c => !q || String(c.name ?? "").toLocaleLowerCase().includes(q) || idOf(c).toLocaleLowerCase().includes(q));
    // 검색어가 현재 선택된 봇과 맞지 않아도 선택 상태가 사라지지 않게 유지해요.
    const current = d.bots.find(c => idOf(c) === d.botId);
    const list = current && !found.some(c => idOf(c) === d.botId) ? [current, ...found] : found;
    return list.map(c => h("option", { value:idOf(c), selected:idOf(c) === d.botId }, c.name || "(이름 없음)"));
  };
  const botSelect = h("select", { class:"rb-input" }, ...makeBotOptions());
  botSearch.addEventListener("input", () => {
    d.botSearch = botSearch.value;
    botSelect.replaceChildren(...makeBotOptions());
  });
  botSelect.addEventListener("change", () => { d.botId = botSelect.value; d.chats = []; d.selected = []; renderCharSplit(ctx); });
  const bot = d.bots.find(c => idOf(c) === d.botId);
  if (bot && !d.chats.length) {
    d.chats = (bot.chats ?? []).map((c, i) => ({ ...c, _i:i }));
    const chatIdx = await api.getCurrentChatIndex().catch(() => 0);
    d.selected = d.chats.some(c => c._i === chatIdx) ? [chatIdx] : d.chats.length ? [d.chats[0]._i] : [];
  }
  const cfg = settings.bots?.[d.botId] ?? { on:true, names:[], aliases:{} };
  d.aliases = cfg.aliases ?? {};
  const names = input((cfg.names ?? []).join(", "), "쉼표로 구분 · 비우면 전체 인물");
  const enabled = h("input", { type:"checkbox", checked:cfg.on !== false });
  const showTime = h("input", { type:"checkbox", checked:settings.showTime === true });
  const debug = h("input", { type:"checkbox", checked:settings.debug === true });
  const globalEnabled = h("input", { type:"checkbox", checked:settings.enabled !== false });
  const persist = async s => {
    if (ctx.charSplit?.update) await ctx.charSplit.update(s);
    else await saveCharSplit(api, s);
  };
  const save = async () => {
    const s = await loadCharSplit(api);
    s.enabled = globalEnabled.checked;
    s.bots[d.botId] = { on:enabled.checked, names:names.value.split(",").map(n => n.trim()).filter(Boolean), aliases:cfg.aliases ?? {} };
    s.showTime = showTime.checked; s.debug = debug.checked;
    await persist(s);
    ctx.toast("설정을 저장했어요.");
  };
  // 일괄 토글은 기존 봇별 이름·별칭 설정을 보존하고 on 값만 바꿔요.
  const toggleAllBots = async on => {
    const s = await loadCharSplit(api);
    for (const c of d.bots) {
      const id = idOf(c), prev = s.bots[id] ?? {};
      s.bots[id] = { on, names:Array.isArray(prev.names) ? prev.names : [], aliases:prev.aliases && typeof prev.aliases === "object" ? prev.aliases : {} };
    }
    await persist(s);
    ctx.toast(on ? "모든 봇의 마크 기록을 켰어요." : "모든 봇의 마크 기록을 껐어요.");
    renderCharSplit(ctx);
  };
  globalEnabled.addEventListener("change", async () => {
    const s = await loadCharSplit(api); s.enabled = globalEnabled.checked;
    await persist(s);
    ctx.toast(globalEnabled.checked ? "캐릭터 분리 기능을 전체 켰어요." : "캐릭터 분리 기능을 전체 껐어요.");
    renderCharSplit(ctx);
  });
  body.appendChild(box(
    row("봇 검색", botSearch),
    row("대상 봇", botSelect),
    h("label", { class:"rb-check" }, globalEnabled, h("span", null, "캐릭터 분리 기능 전체 켜기")),
    actions(
      btn("모든 봇 켜기", { onClick:() => toggleAllBots(true) }),
      btn("모든 봇 끄기", { onClick:() => toggleAllBots(false) })
    ),
    h("label", { class:"rb-check" }, enabled, h("span", null, "이 봇의 마크 기록 켜기")),
    row("허용 이름 목록 (비우면 전체 인물)", names),
    actions(
      btn("설정 저장", { kind:"primary", onClick:save }),
      btn("지시문 복사", { onClick:async () => ctx.toast(await copyText(makeInstruction({ names:names.value.split(",").map(n=>n.trim()).filter(Boolean) })) ? "복사했어요." : "복사하지 못했어요.") })
    ),
    h("b", null, "화면 표시"),
    h("label", { class:"rb-check" }, showTime, h("span", null, "이야기 속 시간 표시")),
    h("label", { class:"rb-check" }, debug, h("span", null, "마크 디버그 표시"))
  ));
  const chatItems = d.chats.map(c => {
    const check = h("input", { type:"checkbox", checked:d.selected.includes(c._i) });
    check.addEventListener("change", () => { d.selected = check.checked ? [...d.selected, c._i] : d.selected.filter(i => i !== c._i); });
    const count = (c.message ?? []).filter(m => /⟦C:[^⟧]+⟧/.test(messageText(m))).length;
    return h("label", { class:"rb-check" }, check, h("span", { style:"flex:1" }, c.name || "채팅 " + (c._i + 1)), h("span", { class:"rb-muted" }, "마크 " + count + "개"));
  });
  body.appendChild(box(h("b", null, "분석할 채팅"), ...chatItems, actions(btn("인물 분석 →", { kind:"primary", onClick:async () => {
    if (!d.selected.length) { ctx.toast("채팅을 하나 이상 선택해 주세요.", { error:true }); return; }
    await save();
    const botIndex = d.bots.findIndex(c => idOf(c) === d.botId);
    const people = {};
    for (const chatInfo of d.chats.filter(c => d.selected.includes(c._i))) {
      let chat = chatInfo;
      // chat 목록의 message가 요약/부분 데이터일 수 있으므로 공식 API에서 원본 채팅을 우선 조회해요.
      try {
        const fetched = await api.getChatFromIndex(botIndex, chatInfo._i);
        if (Array.isArray(fetched)) chat = { ...chatInfo, message:fetched };
        else if (Array.isArray(fetched?.message) && fetched.message.length) chat = fetched;
      } catch {}
      const messages = Array.isArray(chat?.message) ? chat.message : Array.isArray(chatInfo?.message) ? chatInfo.message : [];
      const scan = scanChat(messages, cfg.aliases ?? {});
      for (const [name, entries] of Object.entries(scan.chars)) (people[name] ??= []).push(...entries);
    }
    d.people = Object.entries(people).map(([name, entries]) => ({ name, entries, count:entries.length })).sort((a,b) => b.count-a.count);
    d.person = d.people[0]?.name ?? ""; d.entries = d.people[0]?.entries ?? [];
    nav(1);
  }}))));
}

function stepPerson(ctx, d, body, nav) {
  const list = h("div", { style:"display:flex;flex-direction:column;gap:6px" });
  for (const person of d.people) {
    list.appendChild(h("button", { class:"rb-row", style:"background:var(--rb-surf);padding:10px", onClick:() => { d.person=person.name; d.entries=person.entries; renderCharSplit(ctx); } },
      h("span", { class:"txt" }, h("span", { class:"name" }, person.name), h("span", { class:"meta" }, "마크 문장 " + person.count + "개"))
    ));
  }
  const timeline = h("div", { style:"max-height:350px;overflow:auto" }, ...d.entries.slice(-200).map(e =>
    h("div", { class:"rb-card pad", style:"margin:5px 0" }, h("small", { class:"rb-muted" }, e.t || "시각 미상"), e.situation ? h("div", { class:"rb-muted", style:"margin:3px 0 6px" }, "장면: " + e.situation) : null, h("div", { style:"white-space:pre-wrap" }, e.text))
  ));
  body.appendChild(box(h("b", null, "인물 선택"),
    d.people.length ? list : note("warn", "마크가 없어요. 기능을 켠 뒤 새 대화를 나누고 다시 분석해 주세요."),
    timeline,
    actions(btn("← 이전", { onClick:() => nav(0) }), btn("로어북 선택 →", { kind:"primary", disabled:!d.person, onClick:() => {
      const bot = d.bots.find(c => idOf(c) === d.botId);
      d.lore = pickLore(bot?.globalLore ?? [], d.person, { aliases:d.aliases ?? {} });
      nav(2);
    }}))
  ));
}

function stepLore(ctx, d, body, nav) {
  const list = h("div", { style:"display:flex;flex-direction:column;gap:6px;max-height:500px;overflow:auto" });
  for (const item of d.lore) {
    const check = h("input", { type:"checkbox", checked:item.selected });
    check.addEventListener("change", () => item.selected = check.checked);
    list.appendChild(h("label", { class:"rb-check", style:"align-items:flex-start" }, check,
      h("span", { style:"flex:1" }, h("b", null, item.entry.comment || item.entry.key || "(이름 없음)"), h("div", { class:"rb-muted", style:"font-size:12px;white-space:pre-wrap" }, String(item.entry.content ?? "").slice(0,250))),
      h("span", { class:"rb-badge" }, item.category)
    ));
  }
  body.appendChild(box(h("b", null, "가져올 로어북"), h("div", { class:"rb-muted" }, "본인·관련 항목 기본 선택 · " + d.lore.filter(x=>x.selected).length + "/" + d.lore.length), list,
    actions(btn("← 이전", { onClick:() => nav(1) }), btn("AI 요약 →", { kind:"primary", onClick:() => nav(3) }))
  ));
}

function stepAI(ctx, d, body, nav) {
  const api = ctx.api;
  const mode = h("select", { class:"rb-input" }, ...AI_MODES.map(([v,label]) => h("option", { value:v, selected:v===d.mode }, label)));
  mode.addEventListener("change", () => d.mode=mode.value);
  const model = input(d.model, "직접 입력 모드에서 사용할 모델 ID");
  const lang = h("select", { class:"rb-input" }, h("option",{value:"English",selected:d.lang==="English"},"English"), h("option",{value:"한국어",selected:d.lang==="한국어"},"한국어"));
  lang.addEventListener("change", () => d.lang=lang.value);
  const extra = area(d.extra, "추가 지시", 3), record = area(d.record, "관계 기록", 10), desc = area(d.desc, "새 봇 설명", 10), greeting = area(d.greeting, "첫 메시지", 8);
  const status = h("div", { class:"rb-muted" }), bar = progressBar(0);
  const generate = async (which="all") => {
    if (d.busy) return;
    d.busy=true; const controller=new AbortController(); d.abort=controller;
    try {
      const pick={mode:d.mode,staticModel:model.value};
      const lore=d.lore.filter(x=>x.selected).map(x=>"### "+(x.entry.comment||x.entry.key||"Lore")+"\n"+(x.entry.content??"")).join("\n\n");
      if (which==="all"||which==="record") {
        const chunks=chunkEntries(d.entries),parts=[];
        for(let i=0;i<chunks.length;i++){status.textContent="관계 기록 요약 중 "+(i+1)+"/"+chunks.length;bar.set((i+1)/Math.max(chunks.length,1)*40);parts.push(await runAI(api,summaryPrompt({name:d.person,entries:chunks[i],lang:d.lang,extra:extra.value}),pick,controller.signal));}
        d.record=parts.length>1?await runAI(api,mergePrompt({name:d.person,parts,lang:d.lang,extra:extra.value}),pick,controller.signal):(parts[0]??d.record);record.value=d.record;
      }
      if(which==="all"||which==="desc"){status.textContent="설명 작성 중…";d.desc=await runAI(api,profilePrompt({name:d.person,lore,record:record.value||d.record,lang:d.lang,extra:extra.value}),pick,controller.signal);desc.value=d.desc;bar.set(70);}
      if(which==="all"||which==="greeting"){status.textContent="첫 메시지 작성 중…";d.greeting=await runAI(api,greetingPrompt({name:d.person,record:record.value||d.record,lang:d.lang,extra:extra.value}),pick,controller.signal);greeting.value=d.greeting;bar.set(100);}
      d.record=record.value;d.desc=desc.value;d.greeting=greeting.value;d.model=model.value;d.extra=extra.value;status.textContent="완료했어요. 결과를 편집할 수 있어요.";
    } catch(e) { status.textContent=e?.message??String(e);ctx.toast(status.textContent,{error:true}); }
    finally { d.busy=false;d.abort=null; }
  };
  body.appendChild(box(row("AI 모델",mode),row("모델 ID (직접 입력 모드에서만 사용)",model),row("출력 언어",lang),row("추가 지시",extra),
    actions(btn("전체 생성",{kind:"primary",onClick:()=>generate("all")}),btn("관계 기록 재작성",{onClick:()=>generate("record")}),btn("설명 재작성",{onClick:()=>generate("desc")}),btn("첫 메시지 재작성",{onClick:()=>generate("greeting")}),btn("취소",{onClick:()=>d.abort?.abort()})),
    status,bar,h("b",null,"관계 기록"),record,h("b",null,"설명"),desc,h("b",null,"첫 메시지"),greeting,
    actions(btn("← 이전",{onClick:()=>{d.record=record.value;d.desc=desc.value;d.greeting=greeting.value;d.model=model.value;d.extra=extra.value;nav(2);}}),btn("새 봇 만들기 →",{kind:"primary",onClick:()=>{d.record=record.value;d.desc=desc.value;d.greeting=greeting.value;d.model=model.value;d.extra=extra.value;nav(4);}}))
  ));
}

function stepCreate(ctx, d, body, nav) {
  const api=ctx.api, name=input(d.person||"새 캐릭터"), image=h("input",{type:"checkbox",checked:true}), scripts=h("input",{type:"checkbox",checked:false}), status=h("div",{class:"rb-muted"});
  body.appendChild(box(h("b",null,"새 봇 만들기"),row("봇 이름",name),
    h("label",{class:"rb-check"},image,h("span",null,"원본 봇 이미지 복사")),
    h("label",{class:"rb-check"},scripts,h("span",null,"정규식·트리거 스크립트 복사 (기본 꺼짐)")),
    note("warn","원본 봇·채팅은 수정하지 않아요. 관계 기록은 상시 로어북으로 추가해요."),
    status,actions(btn("← 이전",{onClick:()=>nav(3)}),btn("새 봇 생성",{kind:"primary",onClick:async()=>{
      const original=d.bots.find(c=>idOf(c)===d.botId);
      if(!original){ctx.toast("원본 봇을 찾지 못했어요.",{error:true});return;}
      if(d.creating)return;
      if(!d.record.trim()){ctx.toast("먼저 AI 요약에서 관계 기록을 생성하거나 입력해 주세요.",{error:true});return;}
      d.creating=true;
      try{
        const db=await readDb(api,["characters"]),fresh=db.characters??[];
        if(fresh.some(isGenerating))throw new Error("다른 캐릭터가 응답 생성 중이에요.");
        const ch=newCharacterBase({});
        ch.name=uniqueDisplayName(name.value.trim()||d.person,fresh);ch.desc=d.desc;ch.firstMessage=d.greeting;
        ch.creatorNotes="Dusk Atelier 캐릭터 분리: 원본 '"+original.name+"'에서 "+new Date().toISOString().slice(0,10)+" 생성";
        ch.globalLore=structuredClone(d.lore.filter(x=>x.selected).map(x=>x.entry));
        for(const e of ch.globalLore){const rep=v=>typeof v==="string"?v.replace(/\{\{char\}\}/gi,original.name||""):v;e.content=rep(e.content);e.comment=rep(e.comment);}
        ch.globalLore.push({comment:"{{user}}와의 관계 기록",content:d.record,alwaysActive:true,key:[],secondkey:[],insertorder:100});
        if(image.checked)ch.image=original.image||"";
        if(scripts.checked){ch.customscript=structuredClone(original.customscript??[]);ch.triggerscript=structuredClone(original.triggerscript??[]);}
        fresh.push(ch);await api.setDatabaseLite({characters:fresh});await ensureCharacterInOrder(api,ch.chaId);
        status.textContent="새 봇 '"+ch.name+"'을 만들었어요.";ctx.toast(status.textContent);
        body.appendChild(btn("완료 · 사이드바에서 선택",{kind:"primary",onClick:async()=>{try{await api.hideContainer();ctx.toast("새 봇이 사이드바에 추가됐어요. 사이드바에서 선택해 주세요.");}catch(e){ctx.toast("Dusk 창을 닫지 못했어요: "+(e?.message??e),{error:true});}}}));
      }catch(e){status.textContent=e?.message??String(e);ctx.toast(status.textContent,{error:true});}
      finally{d.creating=false;}
    }}))
  ));
}
