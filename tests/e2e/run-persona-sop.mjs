// 페르소나 빌더 SOP 흐름(애드온): SOP 양식 자동 선택 → 1 초안 → 2 검토 보고서(항목 고르기) → 3 최종 다듬기 → 바뀐 점 보기, NAI 태그·토큰 추정.
// 가짜 보조 모델이 단계별로 답한다. 실제 모델·호스트에는 접근하지 않는다.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.1.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const shot = process.argv.includes("--shot");
const browser = await chromium.launch();
for (const vw of [1280, 390]) {
  const page = await (await browser.newContext({ viewport: { width: vw, height: 900 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { story: true }));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__calls = [];
    window.__app.ctx.api.runLLMModel = async (o) => {
      const m = o.messages, last = m[m.length - 1].content;
      window.__calls.push(m);
      if (/Review the completed SOP sheet/.test(last)) return { type: "success", result: "## KEEP\n- Core Identity > Core Premise: drives behavior — keep\n\n## CUT\n- Appearance > Scent: decorative — no output — drop\n- Basic Information > Residence: unused — drop\n\n## MACRO RISK\n- Physical Mannerisms / Nonverbal Expression > Tells: one tell for all — add variants" };
      if (/Rewrite the SOP sheet above/.test(last)) return { type: "success", result: "### Basic Information\n- Name: Mina Park\n- Age / Gender: 25 | female\n\n### Core Identity\n- Core Premise: Mina is, above all else, a keeper of debts.\n- Mask / Leak System:\n  - Fear → mask: jokes / leak: counts exits" };
      if (/NovelAI/.test(m[0].content)) return { type: "success", result: "1girl, black hair, red eyes, 1girl" };
      if (/Instruction: Generate a broad first-draft/.test(last)) return { type: "success", result: "### Basic Information\n- Name: Mina\n- Age / Gender: 25 | female\n- Residence: studio flat\n\n### Appearance\n- Scent: rain and coffee\n\n### Core Identity\n- Core Premise: Mina is, above all else, careful.\n\n### Physical Mannerisms / Nonverbal Expression\n- Tells: taps ring" };
      return { type: "success", result: "번역" };
    };
  });
  await page.evaluate(() => {
    const api = window.__app.ctx.api, orig = api.getDatabase;
    window.__pdb = [{ id: "p1", name: "선생님", personaPrompt: "TEACHER" }, { id: "p2", name: "학생회장", personaPrompt: "PRES" }];
    api.getDatabase = async (k) => ({ ...(await orig(k)), personas: structuredClone(window.__pdb), selectedPersona: -1 });
    api.setDatabaseLite = async (o) => { if (o.personas) window.__pdb = structuredClone(o.personas); };
  });
  await page.evaluate(() => window.__app.ctx.go("personabuilder"));
  await page.waitForTimeout(700);
  if (shot) await page.screenshot({ path: `/tmp/pb-top-${vw}.png` });
  const T = () => page.evaluate(() => document.querySelector(".rb-main").innerText);
  ok(`[${vw}] SOP 양식이 골라져 있음`, await page.evaluate(() => [...document.querySelectorAll('select[aria-label="설명 양식"] option')].find((o) => o.selected)?.textContent === "SOP 기본 규칙"));
  ok(`[${vw}] 단계 버튼 3개`, /1 초안 쓰기/.test(await T()) && /2 검토 보고서/.test(await T()) && /3 최종 다듬기/.test(await T()));
  const click = async (txt) => { await page.evaluate((t) => [...document.querySelectorAll(".rb-main button")].find((b) => b.textContent.trim() === t && !b.disabled)?.click(), txt); await page.waitForTimeout(700); };
  await page.fill('textarea[aria-label="캐릭터 콘셉트"]', "25살 야간 편의점 알바생");
  await click("1 초안 쓰기");
  ok(`[${vw}] 초안: 6칸 채움`, /6칸을 썼어요/.test(await T()), (await T()).slice(0, 400));
  ok(`[${vw}] 초안 요청에 1단계 지침·콘셉트`, await page.evaluate(() => { const c = window.__calls[0]; return /^Instruction: Generate/.test(c[1].content) && /야간 편의점/.test(c[1].content); }));
  await click("3 최종 다듬기");
  ok(`[${vw}] 검토 전 3단계는 안내만`, /먼저 '2 검토 보고서'/.test(await T()));
  await click("2 검토 보고서");
  ok(`[${vw}] 검토 항목 4개 표시`, (await page.locator(".rb-pb-rv-i").count()) === 4);
  ok(`[${vw}] 검토 요청 = 요청→시트→검토 OOC`, await page.evaluate(() => { const c = window.__calls.findLast((x) => /Review the completed/.test(x.at(-1).content)); return c.map((x) => x.role).join() === "system,user,assistant,user" && /Name: Mina/.test(c[2].content); }));
  await page.locator(".rb-pb-rv-i input").nth(2).uncheck();   // Residence CUT 거절
  await page.fill('textarea[aria-label="검토 메모"]', "말투는 줄이지 말 것");
  await click("고른 항목으로 최종 다듬기");
  const fin = await page.evaluate(() => window.__calls.map((c) => c.at(-1).content).reverse().find((t) => /Rewrite the SOP/.test(t)) ?? "");
  ok(`[${vw}] 최종 요청: 고른 항목만·메모`, /Scent: decorative/.test(fin) && !/Residence: unused/.test(fin) && /말투는 줄이지/.test(fin), fin.slice(-500));
  const vals = await page.evaluate(() => JSON.parse(window.__app.ctx.api.store["rbm:personaBuilder:v1"] ?? "{}"));
  await page.waitForTimeout(500);
  const v2 = await page.evaluate(() => JSON.parse(window.__app.ctx.api.store["rbm:personaBuilder:v1"]).draft.values);
  ok(`[${vw}] 최종본으로 교체(빠진 칸 비움·하위 목록 합침)`, v2["Basic Information::Name"] === "Mina Park" && !v2["Appearance::Scent"] && /Fear → mask: jokes/.test(v2["Core Identity::Mask / Leak System"] ?? ""), JSON.stringify(v2));
  void vals;
  ok(`[${vw}] 바뀐 점 보기 버튼`, /바뀐 점 보기/.test(await T()));
  await click("바뀐 점 보기");
  ok(`[${vw}] 비교 창: 추가·삭제 줄`, await page.evaluate(() => document.querySelectorAll(".rb-pb-diff .add").length > 0 && document.querySelectorAll(".rb-pb-diff .del").length > 0));
  if (shot) await page.screenshot({ path: `/tmp/pb-diff-${vw}.png` });
  await page.evaluate(() => [...document.querySelectorAll(".rb-dialog button")].find((b) => b.textContent.trim() === "닫기")?.click());
  await page.waitForTimeout(400);
  ok(`[${vw}] 비교 창 닫힘`, !(await page.locator(".rb-pb-diff").count()));
  ok(`[${vw}] 미리보기에 토큰 추정`, /약 [\d,]+토큰/.test(await T()));
  ok(`[${vw}] 단계 탭(섹션 13 + 미리보기 + 폴더 추가)`, (await page.locator(".rb-pb-tabs > button").count()) === 15);
  ok(`[${vw}] 오른쪽/아래 시트 미리보기 보임`, await page.locator(".rb-pb-sheetc").isVisible());
  await page.locator(".rb-pb-tabs > button", { hasText: "핵심 정체성" }).click(); await page.waitForTimeout(300);
  ok(`[${vw}] 섹션 탭: 핵심 정체성 칸만`, (await page.locator(".rb-pb-card .rb-pb-f").count()) === 6 && /요청대로 고치기/.test(await T()));
  await page.fill('input[aria-label="핵심 정체성 요청"]', "더 건조하게");
  await page.locator(".rb-pb-gen button", { hasText: "요청대로 고치기" }).click(); await page.waitForTimeout(800);
  ok(`[${vw}] 섹션 요청: 그 섹션 칸만·요청 포함`, await page.evaluate(() => { const c = window.__calls.findLast((x) => /Change request: 더 건조하게/.test(x.at(-1).content)); return !!c && (c.at(-1).content.split("Structure:")[1].match(/<<WRITE/g) ?? []).length === 6; }));
  if (shot) await page.screenshot({ path: `/tmp/pb-step-${vw}.png` });
  ok(`[${vw}] 섹션 SOP 규칙 버튼 4개`, (await page.locator(".rb-pb-gen .rb-pb-chip").count()) === 4);
  await page.locator(".rb-pb-gen .rb-pb-chip", { hasText: "작동 방식으로" }).click(); await page.waitForTimeout(800);
  ok(`[${vw}] 규칙 버튼: SOP 문장 그대로 요청`, await page.evaluate(() => !!window.__calls.findLast((x) => /Change request: Do not write adjective stacks/.test(x.at(-1).content))));
  await page.evaluate(() => { const ta = document.querySelector('textarea[aria-label="건드릴 수 없는 것"]'); ta.value = "N/A"; ta.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.locator(".rb-pb-gen .rb-pb-chip", { hasText: "자리표시 지우기" }).click(); await page.waitForTimeout(300);
  ok(`[${vw}] 자리표시 지우기(AI 없이)`, (await page.inputValue('textarea[aria-label="건드릴 수 없는 것"]')) === "" && /자리표시 1칸/.test(await T()));
  ok(`[${vw}] 전체 규칙 버튼·규칙 원문`, (await page.locator(".rb-pb-fcard .rb-pb-rules .rb-pb-chip").count()) === 4);
  await page.locator(".rb-pb-fcard button", { hasText: "규칙 원문" }).click(); await page.waitForTimeout(300);
  ok(`[${vw}] 규칙 원문 창`, /Sort Of Persona/.test(await page.locator(".rb-dialog").innerText()) && /Instruction: Generate a broad first-draft/.test(await page.locator(".rb-dialog").innerText()));
  await page.locator(".rb-dialog button", { hasText: "닫기" }).click(); await page.waitForTimeout(200);
  ok(`[${vw}] 저장 막대 버튼 한 줄`, await page.evaluate(() => { const t = [...document.querySelectorAll(".rb-pb-foot>.rb-btn")].map((b) => Math.round(b.getBoundingClientRect().top)); return new Set(t).size === 1; }));
  await page.locator(".rb-pb-tabs > button", { hasText: "미리보기" }).click(); await page.waitForTimeout(300);
  ok(`[${vw}] 미리보기 단계에서는 옆 미리보기 숨김`, !(await page.locator(".rb-pb-sheetc").isVisible()));
  await page.evaluate(() => { const d = [...document.querySelectorAll(".rb-main details")].find((x) => /NAI 캐릭터 태그/.test(x.textContent)); d.open = true; });
  await click("태그 뽑기");
  ok(`[${vw}] NAI 태그 뽑기(중복 제거)`, (await page.inputValue('textarea[aria-label="NAI 캐릭터 태그"]')) === "1girl, black hair, red eyes");
  for (const n of [5, 4, 3, 2]) await click(`되돌리기 (${n})`);
  const v3 = await page.evaluate(() => new Promise((res) => setTimeout(() => res(JSON.parse(window.__app.ctx.api.store["rbm:personaBuilder:v1"]).draft.values), 600)));
  ok(`[${vw}] 되돌리기로 최종 전 내용 복원`, v3["Basic Information::Residence"] === "studio flat", JSON.stringify(v3));
  // 여백: 검토 항목 글이 상자 테두리에 붙지 않음
  await click("2 검토 보고서");
  const pad = await page.evaluate(() => { const i = document.querySelector(".rb-pb-rv-i"), s = i.querySelector("span"); const a = i.getBoundingClientRect(), b = s.getBoundingClientRect(); return Math.min(b.left - a.left, a.right - b.right, b.top - a.top); });
  ok(`[${vw}] 검토 항목 안쪽 여백 ≥ 5px`, pad >= 5, String(pad));
  ok(`[${vw}] 아래 저장 막대 화면 안`, await page.evaluate(() => { const b = document.querySelector(".rb-pb-foot").getBoundingClientRect(); return b.bottom <= innerHeight + 1 && b.top > 0; }));
  ok(`[${vw}] 크레딧: 페르소나 공방·SOP Lite`, /페르소나 공방/.test(await T()) && /SOP Lite/.test(await T()));
  ok(`[${vw}] 가로 넘침 없음`, await page.evaluate(() => { const m = document.querySelector(".rb-main .rb-section"); return m.scrollWidth <= m.clientWidth + 1; }));
  if (shot) { await page.evaluate(() => document.querySelector(".rb-pb-rv").scrollIntoView()); await page.screenshot({ path: `/tmp/pb-review-${vw}.png` }); }
  // ── 현재 채팅 · 봇 기본 페르소나 ──
  ok(`[${vw}] 현재 채팅 카드(봇 이름)`, /현재 채팅/.test(await T()) && /시로코/.test(await page.locator(".rb-pb-cs").innerText()));
  await page.selectOption('select[aria-label="이 봇 기본 페르소나"]', "p1"); await page.waitForTimeout(500);
  ok(`[${vw}] 봇 기본 페르소나 저장`, await page.evaluate(() => JSON.parse(window.__app.ctx.api.store["dusk.personaBotDefaults"] ?? "{}").c1?.pid === "p1"));
  ok(`[${vw}] 요청에 설명이 들어감`, await page.evaluate(async () => { const o = await window.__app.ctx.ext.get("svc", "aibuild").botDefaults.beforeRequest([{ role: "user", content: "hi", memo: "m" }], "model"); return o.length === 2 && /TEACHER/.test(o[0].content); }));
  if (shot) { await page.locator(".rb-pb-cs").scrollIntoViewIfNeeded(); await page.screenshot({ path: `/tmp/pb-cs-${vw}.png` }); }
  ok(`[${vw}] 카드에 '(봇 기본)' 표시`, /선생님 \(봇 기본\)/.test(await page.locator(".rb-pb-cs").innerText()));
  // ── 파일 백업 → 가져오기 ──
  const menu = async (label) => { await page.click('button[aria-label="백업 메뉴"]'); await page.waitForTimeout(200); await page.locator(".rb-menu button, [role=menu] button, [role=menuitem]", { hasText: label }).first().click(); await page.waitForTimeout(300); };
  await menu("파일로 백업");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator(".rb-dialog button", { hasText: "백업 파일 받기" }).click()]);
  const file = await dl.path().then((p) => import("node:fs").then((fs) => fs.readFileSync(p, "utf8")));
  const bk = JSON.parse(file);
  ok(`[${vw}] 백업 파일: 페르소나 2·양식·봇 기본`, bk.personas.length === 2 && bk.templates.some((t) => t.id === "sop") && bk.botDefaults.c1?.pid === "p1", file.slice(0, 200));
  await page.evaluate(() => { window.__pdb[0].personaPrompt = "CHANGED"; window.__pdb.splice(1, 1); });
  const [fc] = await Promise.all([page.waitForEvent("filechooser"), menu("파일에서 가져오기")]);
  await fc.setFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(file) });
  await page.waitForTimeout(600);
  ok(`[${vw}] 가져오기 확인창 요약`, /새로 1개 · 사본 1개/.test(await page.locator(".rb-dialog").innerText().catch(() => "")));
  await page.locator(".rb-dialog button", { hasText: "가져오기" }).last().click(); await page.waitForTimeout(900);
  const names = await page.evaluate(() => window.__pdb.map((p) => p.name + ":" + p.personaPrompt).join("|"));
  ok(`[${vw}] 가져오기: 바뀐 건 사본, 지운 건 되살림`, names === "선생님:CHANGED|선생님 (가져옴):TEACHER|학생회장:PRES", names);
  // ── 생성 중지 버튼 ──
  await page.evaluate(() => { const api = window.__app.ctx.api; window.__keep = api.runLLMModel; api.runLLMModel = window.__trackedRunLLM(() => new Promise(() => {})); });
  ok(`[${vw}] 쉴 때는 중지 버튼 없음`, !(await page.locator(".rb-ai-stop").count()));
  await page.locator(".rb-pb-fcard button", { hasText: "2 검토 보고서" }).click(); await page.waitForTimeout(700);
  ok(`[${vw}] AI 작업 중 오른쪽 아래 '생성 중지'`, await page.evaluate(() => { const b = document.querySelector(".rb-ai-stop"); if (!b) return false; const r = b.getBoundingClientRect(); return innerWidth - r.right < 40 && innerHeight - r.bottom < 40 && /생성 중지/.test(b.textContent); }));
  if (shot) await page.screenshot({ path: `/tmp/pb-stop-${vw}.png` });
  await page.click(".rb-ai-stop"); await page.waitForTimeout(400);
  ok(`[${vw}] 누르면 바로 멈추고 버튼 사라짐`, !(await page.locator(".rb-ai-stop").count()) && /생성을 중지했어요/.test(await T()));
  await page.evaluate(() => { window.__app.ctx.api.runLLMModel = window.__keep; });
  ok(`[${vw}] 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
