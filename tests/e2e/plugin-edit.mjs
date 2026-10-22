// 최신 원본 RisuAI(개발 서버)에서 Dusk Atelier로 다른 플러그인을 고치는 흐름을 확인한다.
// 사용: RISU_URL=http://localhost:5174 node tests/e2e/plugin-edit.mjs
// 확인창(권한 요청, 같은 이름 교체 등)은 사용자가 "예"를 누른 것으로 처리하고, 나온 문구를 기록한다.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const URL0 = process.env.RISU_URL ?? 'http://localhost:5174';
const OUT = process.env.OUT_DIR ?? 'e2e-out';
fs.mkdirSync(OUT, { recursive: true });
const dusk = fs.readFileSync(path.resolve('dusk_atelier.js'), 'utf8');
const otherV1 = `//@name other
//@display-name Other Plugin
//@api 3.0
//@version 0.1.0
//@arg key string
console.log('[other] v1 loaded');
`;
const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok: !!ok, info });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ` — ${info}` : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { const t = m.text(); if (/\[other\]|\[probe\]|Dusk Atelier|plugin/i.test(t)) console.log('  console:', t.slice(0, 200)); });
page.on('pageerror', (e) => console.log('  pageerror:', String(e).slice(0, 200)));
await page.goto(URL0, { waitUntil: 'domcontentloaded' });

// 앱이 데이터베이스를 다 불러올 때까지 기다린다
await page.waitForFunction(async () => {
  try {
    const S = await import('/src/ts/stores.svelte.ts');
    let loaded = false;
    S.loadedStore.subscribe((v) => { loaded = v; })();
    return loaded && !!S.DBState?.db && Array.isArray(S.DBState.db.characters);
  } catch { return false; }
}, null, { timeout: 180000, polling: 1000 });
console.log('RisuAI 준비됨');
await page.waitForTimeout(3000);

// 확인창 자동 응답("예")과 기록
await page.evaluate(async () => {
  const S = await import('/src/ts/stores.svelte.ts');
  window.__alerts = [];
  S.alertStore.subscribe((v) => {
    if (v && v.type && v.type !== 'none' && v.type !== 'wait' && v.type !== 'progress') {
      window.__alerts.push(`${v.type}: ${String(v.msg).slice(0, 160)}`);
      if (['ask', 'pluginconfirm', 'normal', 'error'].includes(v.type)) setTimeout(() => S.alertStore.set({ type: 'none', msg: 'yes' }), 50);
    }
  });
});
const alerts = async () => page.evaluate(() => window.__alerts.splice(0));
const plugins = async () => page.evaluate(async () => {
  const S = await import('/src/ts/stores.svelte.ts');
  return (S.DBState.db?.plugins ?? []).map((p) => ({ name: p.name, version: p.versionOfPlugin, script: p.script, realArg: { ...(p.realArg ?? {}) }, enabled: p.enabled }));
});
const importCode = async (code) => page.evaluate(async (c) => {
  const P = await import('/src/ts/plugins/plugins.svelte.ts');
  await P.importPlugin(c);
}, code);

// 첫 실행 직후에는 RisuAI가 저장 데이터를 다시 읽으면서 방금 넣은 플러그인이 사라질 수 있어 확인하며 넣는다
const ensure = async (code, name) => {
  for (let i = 0; i < 5; i++) {
    if ((await plugins()).some((p) => p.name === name)) return true;
    await importCode(code);
    await page.waitForTimeout(4000);
  }
  return (await plugins()).some((p) => p.name === name);
};
// 1. 설치: 다른 플러그인(v1)과 Dusk Atelier
await page.waitForTimeout(7000);
await ensure(otherV1, 'other');
await ensure(dusk, 'dusk_atelier');
await ensure(otherV1, 'other');
let ps = await plugins();
check('플러그인 2개 설치', ps.some((p) => p.name === 'other') && ps.some((p) => p.name === 'dusk_atelier'), ps.map((p) => p.name).join(', '));
// 사용자가 설정값을 바꿔 둔 상태를 만든다
await page.evaluate(async () => {
  const S = await import('/src/ts/stores.svelte.ts');
  const p = S.DBState.db.plugins.find((x) => x.name === 'other');
  p.realArg = { ...p.realArg, key: 'my-setting' };
});
const before = await plugins();
console.log('  alerts:', await alerts());

// 2. Dusk Atelier 열기 (햄버거 메뉴 버튼과 같은 콜백)
await page.evaluate(async () => {
  const S = await import('/src/ts/stores.svelte.ts');
  const b = S.additionalHamburgerMenu.find((m) => m.name === 'Dusk Atelier');
  if (!b) throw new Error('Dusk Atelier 버튼이 등록되지 않았어요');
  b.callback();
});
let frame = null;
for (let i = 0; i < 60 && !frame; i++) {
  for (const f of page.frames()) {
    try { if (await f.$('.rb-root:not([hidden]) .rb-nav')) frame = f; } catch {}
  }
  if (!frame) await page.waitForTimeout(500);
}
check('Dusk Atelier 창 열림', !!frame);
if (!frame) { await page.screenshot({ path: `${OUT}/fail-open.png` }); process.exit(1); }

// 3. 플러그인 탭에서 다른 플러그인 확인 → 코드 편집 → 파일로 저장
await frame.click('.rb-nav a[data-tab=plugins]');
await frame.waitForSelector('.rb-row[data-id=other]', { timeout: 30000 });
check('플러그인 탭에 다른 플러그인이 보임', true);
await frame.click('.rb-row[data-id=other] .name');
await page.waitForTimeout(500);
const argText = await frame.textContent('.rb-detail');
check('설정값(my-setting)이 보임', argText.includes('my-setting'));
await page.screenshot({ path: `${OUT}/1-plugin-tab.png` });
check('일반 모드에서는 코드 편집 버튼이 숨겨짐', await frame.locator('.rb-detail .rb-btn', { hasText: '코드 편집' }).count() === 0);
// 개발자 모드를 켜고 다시 연다 (코드 편집은 개발자 모드 기능)
await page.evaluate(async () => {
  const S = await import('/src/ts/stores.svelte.ts');
  const cs = S.DBState.db.pluginCustomStorage ??= {};
  cs['rbm:ui:v1'] = JSON.stringify({ ...JSON.parse(cs['rbm:ui:v1'] || '{}'), devMode: true });
});
await frame.click('#rb-close');
await page.waitForTimeout(500);
await page.evaluate(async () => {
  const S = await import('/src/ts/stores.svelte.ts');
  S.additionalHamburgerMenu.find((m) => m.name === 'Dusk Atelier').callback();
});
await frame.waitForSelector('.rb-root:not([hidden]) .rb-nav');
await frame.click('.rb-nav a[data-tab=plugins]');
await frame.waitForSelector('.rb-row[data-id=other]');
await frame.click('.rb-row[data-id=other] .name');
await page.waitForTimeout(500);
await frame.locator('.rb-detail .rb-btn', { hasText: '코드 편집' }).click();
await frame.waitForSelector('.rb-full textarea');
const edited = otherV1.replace('0.1.0', '0.1.1').replace("v1 loaded", "EDITED by Dusk Atelier");
await frame.fill('.rb-full textarea', edited);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/2-editor.png` });
const [dl] = await Promise.all([
  page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
  frame.locator('.rb-full .rb-btn', { hasText: '파일로 저장' }).click()
]);
check('편집한 코드가 파일로 저장됨', !!dl, dl?.suggestedFilename() ?? '다운로드 없음');
let saved = '';
if (dl) {
  const fp = `${OUT}/${dl.suggestedFilename()}`;
  await dl.saveAs(fp);
  saved = fs.readFileSync(fp, 'utf8');
}
check('저장된 파일이 편집한 내용과 같음', saved === edited);

// 4. 사용자가 설정 → 플러그인에서 그 파일을 추가 (설정 화면의 추가 버튼과 같은 함수에 파일 내용을 넘김)
await importCode(saved || edited);
await page.waitForTimeout(3000);
const after = await plugins();
const o2 = after.find((p) => p.name === 'other');
check('다른 플러그인이 편집한 코드로 교체됨', o2?.script?.includes('EDITED by Dusk Atelier'), `버전 ${o2?.version}`);
check('다른 플러그인 목록은 그대로', after.length === before.length && after.every((p) => before.some((b) => b.name === p.name)), after.map((p) => p.name).join(', '));
check('교체 뒤 설정값', true, `key = ${JSON.stringify(o2?.realArg?.key)} (교체 전 'my-setting')`);
console.log('  alerts:', await alerts());

// 5. 직접 쓰기가 막혔는지 확인 (조사용 플러그인)
const probe = `//@name probe
//@api 3.0
(async () => {
  const db = await risuai.getDatabase(['plugins']);
  const list = db.plugins;
  const o = list.find((p) => p.name === 'other');
  o.script = o.script + '\\n// PROBE-LITE';
  await risuai.setDatabaseLite({ plugins: list });
  console.log('[probe] setDatabaseLite done');
})();
`;
await importCode(probe);
await page.waitForTimeout(5000);
let cur = await plugins();
check('setDatabaseLite로 다른 플러그인 수정 → 막힘', !cur.find((p) => p.name === 'other')?.script.includes('PROBE-LITE'));
console.log('  alerts:', await alerts());

const probe2 = `//@name probe2
//@api 3.0
(async () => {
  const db = await risuai.getDatabase(['plugins']);
  const list = db.plugins;
  const o = list.find((p) => p.name === 'other');
  o.script = o.script + '\\n// PROBE-FULL';
  await risuai.setDatabase({ plugins: list });
  console.log('[probe] setDatabase done');
})();
`;
const n0 = (await plugins()).length;
await importCode(probe2);
await page.waitForTimeout(6000);
cur = await plugins();
check('setDatabase로 다른 플러그인 수정 → 결과 기록', true, `플러그인 ${n0}개 → ${cur.length}개: ${cur.map((p) => p.name + (p.script.includes('PROBE-FULL') ? '(수정됨)' : '')).join(', ')}`);
console.log('  alerts:', await alerts());

await page.screenshot({ path: `${OUT}/3-end.png` });
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
await browser.close();
const fail = results.filter((r) => !r.ok);
console.log(`\n${results.length - fail.length}/${results.length} 통과`);
process.exit(fail.length ? 1 : 0);
