// 설정 탭 (1.8.3 목업 5): 묶음 이름 달기(화면 · 백업 · 도움말). 고급은 묶음별 한 줄 목록(현재 값 오른쪽, 누르면 바꾸기):
// 이야기 도우미(재해석/존중은 바로 고르기) · 로어북·채팅 메뉴 · 정리·기록. '이럴 땐 여기로'는 ? 도움말로. PC 2열.
import { renderPrompts } from './promptstab.js';
import { h, replace } from '../dom.js';
import { advFold, modal, btn, openMenu, pageHead, segmented, confirmDialog, fmtSize } from '../kit.js';
import { icon } from '../icons.js';
import { openTour } from '../tour.js';
import { CHANGELOG, openChangelog } from '../whatsnew.js';
import { LORE_DEFAULTS, loadLoreSettings, saveLoreSettings } from '../../data/lorerules.js';
import { devToggleCard, experimentalCard } from './devtools.js';
import { renderCleanup, fullBackup, fullRestore } from './tools.js';
import { renderSettings } from './settings.js';
import { renderUpdateSettings } from './updsettings.js';
import { openAbout } from './about.js';
import { loadMemoryButtonOn } from '../../data/memorybutton.js';
import { createCellar, loadCellarEnabled, saveCellarEnabled, loadCellarUrl, saveCellarUrl, CELLAR_DEFAULT_URL } from '../../data/cellar.js';
import { createCellarBackups } from '../../data/cellarbackup.js';
import { createCellarUpdate } from '../../data/cellarupdate.js';
import { addonCard } from './addonsui.js';

export async function renderSettingsTab(ctx) {
  if (ctx.state.sub === "prompts") return renderPrompts(ctx);
  if (ctx.state.sub === "theme") return renderSettings(ctx);
  if (ctx.state.sub === "updset") return renderUpdateSettings(ctx);
  if (ctx.state.sub === "cleanup") return renderCleanup(ctx);
  const adv = ctx.prefs.advanced;
  const fail = (e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });


  // ── 줄 만들기 ──
  const segRow = (title, text, seg, cls = "") => h("div", { class: ["rb-srow has-seg", cls] }, h("span", { class: "t" }, title, text ? h("small", null, text) : null), seg);
  // id는 클래스로도 붙인다(? 화면 안내가 클래스로 찾는다 — 예전엔 id만 있어서 안내가 그 자리를 못 짚었다)
  const linkRow = (title, text, onClick, id, value) => h("button", { type: "button", class: ["rb-srow", id], onClick, id }, h("span", { class: "t" }, title, text ? h("small", null, text) : null), value ? h("span", { class: "val" }, value) : null, h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));
  const card = (title, ...rows) => h("section", { class: "rb-card bordered rb-scard" }, title ? h("span", { class: "h" }, title) : null, ...rows);

  const layoutSeg = segmented([["left", "◧ 왼쪽"], ["top", "⬒ 위쪽"]], ctx.prefs.ui?.theme?.layout === "top" ? "top" : "left", (v) => ctx.setLayout(v), "메뉴 위치");
  const main = h(
    "div",
    { class: "rb-mem2-main" },
    pageHead("설정", { sub: "바꾸면 바로 적용되고 자동으로 저장돼요." }),
    card(
      "화면",
      segRow("화면 모드", "고급을 켜면 각 화면에 세부 설정이 더 보여요.", segmented([["simple", "간단"], ["advanced", "고급"]], ctx.prefs.uiMode, (v) => ctx.setUiMode(v), "화면 모드")),
      segRow("메뉴 위치", "PC에서 메뉴를 왼쪽 또는 위쪽에 둬요.", layoutSeg, "rb-pc-only"),
      linkRow("플러그인 꾸미기", "색·밝기·글자 크기", () => ctx.go("look"), "rb-set-look")
    ),
    ...(ctx.ext?.render("slot", "settings.cards", ctx) ?? []),   // 애드온 카드(위젯 홈 등)
    cellarCard(ctx, linkRow, card),
    addonCard(ctx, card),
    card("백업", linkRow("백업 만들기", "모듈·에셋·설정을 zip 한 파일로", () => fullBackup(ctx), "rb-set-fullbackup"), linkRow("백업에서 복원", "전체 백업 zip으로 되살리기", () => fullRestore(ctx), "rb-set-restore")),
    card("도움말",
      ctx.openOnboarding ? linkRow("시작 안내 다시 보기", "처음 설정을 단계별로 다시 해요", () => ctx.openOnboarding(), "rb-set-onboard") : null,
      linkRow("기능 맛보기 다시 켜기", "홈에서 다음에 써 볼 기능을 하나씩 다시 권해요", async () => { await ctx.prefs.saveUi({ discover: {} }); ctx.toast("홈에서 다시 권해 드릴게요."); }, "rb-set-discover"),
      linkRow("처음 둘러보기", "버튼을 하나씩 짚어 드려요", () => openTour(ctx), "rb-set-tour"),
      linkRow("새로 바뀐 점", null, () => openChangelog(ctx, CHANGELOG.slice(0, 4), "변경 기록"), "rb-set-whatsnew", `v${ctx.version}`))
  );

  // 기본 설정은 먼저 보여 주고, 고급 설정 데이터는 뒤에서 불러와요.
  const shell = h("div", { class: "rb-scroll rb-mem2", "data-page": "settings" },
    h("div", { class: ["rb-mem2-grid", adv && "has-adv"] },
      main,
      adv ? h("div", { class: "rb-mem2-side" }, h("div", { class: "rb-card bordered" }, h("span", { class: "h" }, "고급 설정"), h("span", { class: "rb-muted" }, "불러오는 중…"))) : null
    )
  );
  const advSide = shell.querySelector(".rb-mem2-side");
  replace(ctx.main, shell);


  // ── 고급 영역 ──
  let advBlocks = [true];
  if (adv) {
    const [memBtnOn, lore, chatQuickOn] = await Promise.all([
      loadMemoryButtonOn(ctx.api),
      loadLoreSettings(ctx.api).catch(() => ({ ...LORE_DEFAULTS })),
      ctx.chatMenu ? ctx.chatMenu.isOn().catch(() => true) : Promise.resolve(true)
    ]);
    const saved = h("span", { class: "rb-muted", style: "font-size:12.5px" });
    const setLore = async (patch) => {
      Object.assign(lore, patch);
      try {
        await saveLoreSettings(ctx.api, lore);
        ctx.loreRuntime?.setSettings?.(lore);
        ctx.loreLog?.setSettings?.(lore);
        saved.textContent = "저장했어요";
        setTimeout(() => saved.textContent = "", 1500);
      } catch (e) {
        fail(e);
      }
    };
    const rerollSeg = segmented([["new", "새로 굴리기"], ["keep", "이전 결과 유지"]], lore.reroll === "keep" ? "keep" : "new", (v) => setLore({ reroll: v }), "리롤 때 확률");
    const logSeg = segmented([["on", "켜기"], ["off", "끄기"]], lore.log === false ? "off" : "on", (v) => setLore({ log: v === "on" }), "로어북 로그");
    const btnSeg = segmented([["on", "보이기"], ["off", "숨기기"]], lore.button === false ? "off" : "on", (v) => setLore({ button: v === "on" }), "응답 아래 로어북 버튼");
    const bdSeg = segmented([["off", "끄기"], ["short", "짧은 이름만"], ["all", "모든 키"]], ["off", "all"].includes(lore.boundary) ? lore.boundary : "short", (v) => setLore({ boundary: v }), "이름 경계 기본값");
    const memBtnSeg = segmented([["on", "보이기"], ["off", "숨기기"]], memBtnOn ? "on" : "off", async (v) => {
      const ok = await ctx.memoryButton?.set(v === "on");
      ctx.toast(ok === false ? "저장했어요. 이 화면에선 바로 안 바뀌어서 리스를 새로 고치면 적용돼요." : v === "on" ? "채팅 메뉴에 관계도 버튼을 보여요" : "채팅 메뉴의 관계도 버튼을 숨겼어요");
    }, "채팅 메뉴 관계도 버튼");
    // 한 줄: 제목·설명 + 현재 값(오른쪽). 누르면 고르는 메뉴가 뜬다.
    const valRow = (title, sub, options, cur, onPick, id) => {
      const val = h("span", { class: "val" }, options.find(([v]) => v === cur)?.[1] ?? "");
      const row = h("button", { type: "button", class: ["rb-srow", id], id, onClick: (ev) => openMenu(ctx.win, ev.currentTarget, options.map(([v, l]) => ({ label: `${v === cur ? "✓ " : ""}${l}`, onClick: async () => { cur = v; val.textContent = l; await onPick(v); } }))) },
        h("span", { class: "t" }, title, sub ? h("small", null, sub) : null), val, h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));
      return row;
    };
    const explain = (title, body) => modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title }, h("h3", null, title), ...body.map((t) => h("p", { class: "rb-p" }, t)), h("div", { class: "rb-dialog-actions" }, btn("닫기", { kind: "primary", onClick: () => done(null) }))));
    void rerollSeg; void logSeg; void btnSeg; void bdSeg; void memBtnSeg;
    advBlocks = [
      card("이야기 도우미",
        valRow("캐시 깨짐 알림", "앞부분이 절반도 안 같아 캐시가 깨지면 화면 구석에 잠깐 알려요", [["on", "켜짐"], ["off", "꺼짐"]], ctx.turnInfo?.isCacheAlert?.() === false ? "off" : "on", async (v) => {
          try { await ctx.turnInfo?.setCacheAlert(v === "on"); ctx.toast(v === "on" ? "캐시 깨짐 알림을 켰어요" : "캐시 깨짐 알림을 껐어요"); } catch (e) { fail(e); }
        }, "rb-set-cachealert"),
        linkRow("이야기 시간", "응답 첫 줄 상태 줄을 읽어 이어 가요", () => explain("이야기 시간", ["응답 첫 줄 ‘[2026-10-28 15:30 | 교실]’ 같은 상태 줄을 읽어 이어 가요.", "실제 현재 시각이 아니라 이야기 속 시각이에요. 홈의 빠른 설정에서 켜고 꺼요."]), "rb-set-storytime", "설명")),
      card("로어북 · 채팅 메뉴",
        valRow("다시 생성(리롤) 때 로어북", "확률로 켜지는 로어북을 다시 굴릴지", [["new", "새로 굴리기"], ["keep", "이전 결과 유지"]], lore.reroll === "keep" ? "keep" : "new", (v) => setLore({ reroll: v }), "rb-set-reroll"),
        valRow("이름 경계", "키가 다른 낱말 속에 끼어 잘못 켜지는 걸 막아요", [["short", "짧은 이름만 (추천)"], ["all", "모든 키"], ["off", "끄기"]], ["off", "all"].includes(lore.boundary) ? lore.boundary : "short", (v) => setLore({ boundary: v }), "rb-set-boundary"),
        valRow("로어북 로그", "응답마다 들어간 로어북을 남겨요", [["on", "켜짐"], ["off", "꺼짐"]], lore.log === false ? "off" : "on", (v) => setLore({ log: v === "on" }), "rb-set-lorelog"),
        valRow("응답 아래 로어북 버튼", "응답 아래 [📖 로어북] 버튼", [["on", "보임"], ["off", "숨김"]], lore.button === false ? "off" : "on", (v) => setLore({ button: v === "on" }), "rb-set-lorebtn"),
        valRow("채팅 메뉴의 [관계도] 버튼", "누르면 인물 관계도가 열려요. 기억 기능 자체는 그대로예요", [["on", "보임"], ["off", "숨김"]], memBtnOn ? "on" : "off", async (v) => {
          const ok = await ctx.memoryButton?.set(v === "on");
          ctx.toast(ok === false ? "저장했어요. 이 화면에선 바로 안 바뀌어서 리스를 새로 고치면 적용돼요." : v === "on" ? "채팅 메뉴에 관계도 버튼을 보여요" : "채팅 메뉴의 관계도 버튼을 숨겼어요");
        }, "rb-set-membtn"),
        valRow("채팅 메뉴의 빠른 설정", "입력창 옆 메뉴에 공정한 전개·유저 편향·주사위 결과 표시", [["on", "보임"], ["off", "숨김"]], chatQuickOn ? "on" : "off", async (v) => {
          try { await ctx.chatMenu?.setOn(v === "on"); ctx.toast(v === "on" ? "채팅 메뉴에 빠른 설정을 보여요" : "채팅 메뉴의 빠른 설정을 숨겼어요"); } catch (e) { fail(e); }
        }, "rb-set-chatquick"),
        saved),
      card("정리 · 기록",
        linkRow("기록 · 되돌리기", `편집·삭제 전 상태 보기${ctx.state.histCount ? ` · ${ctx.state.histCount}개` : ""}`, () => ctx.go("settings", "history"), "rb-set-backups"),
        linkRow("업데이트 설정", "새로 가져온 봇 자동 감지·채팅 백업", () => ctx.go("settings", "updset"), "rb-set-updset"),
        linkRow("설정 정리", "저장한 순서·폴더·프리셋 골라 지우기", () => ctx.go("settings", "cleanup"), "rb-set-cleanup"),
        linkRow("정보 · 라이선스", "버전·AGPL-3.0·소스 위치", () => openAbout(ctx), "rb-set-about")),
      experimentalCard(ctx, () => {
        ctx.refreshTabs();
        ctx.provider?.sync?.().catch(() => {});
        renderSettingsTab(ctx);
      }),
      devToggleCard(ctx, () => {
        ctx.refreshTabs();
        renderSettingsTab(ctx);
      })
    ];
  }
  // 고급은 점선 '고급' 칸 없이 묶음 카드를 그대로 오른쪽 열에 둔다
  if (advSide) replace(advSide, ...(adv ? advBlocks : [advFold(ctx, "settings", true)]));
}

// ── Dusk Cellar (선택 서버) ── 줄 하나: 오른쪽에 상태(확인 중 → 연결됨 vX / 없음). 누르면 상태·주소·다시 확인.
const cellarText = (st, newV) => (!st ? "확인 중…" : st.ok ? `연결됨 v${st.version}${newV ? ` · 새 버전 v${newV}` : ""}` : st.off ? "꺼짐" : "없음");
function cellarCard(ctx, linkRow, card) {
  const cel = (ctx.cellar ??= ctx.memory?.cellar ?? createCellar(ctx.api));
  const row = linkRow("Dusk Cellar", "리스 서버 옆에서 도는 선택 서버예요. 없어도 모든 기능이 그대로 돼요.", () => openCellar(ctx, cel, paint), "rb-set-cellar", cellarText(cel.peek(), ctx.cellarNew));
  const paint = (st) => { const v = row.querySelector(".val"); if (v) v.textContent = cellarText(st, ctx.cellarNew); };
  cel.status().then(paint).catch(() => paint({ ok: false }));
  return card("서버", row);
}
async function openCellar(ctx, cel, paint) {
  const url0 = await loadCellarUrl(ctx.api);
  let on = await loadCellarEnabled(ctx.api);
  await modal(ctx.win, (done) => {
    const stEl = h("p", { class: "rb-p", id: "rb-cellar-st" }, "확인 중…");
    const bkBtn = btn("세이브 백업…", { id: "rb-cellar-backup", onClick: () => { const st = cel.peek(); if (st?.ok) openCellarBackup(ctx, st); } });
    bkBtn.hidden = true;
    const upBtn = btn("업데이트 확인", { id: "rb-cellar-update", onClick: async () => {
      const st = cel.peek(); if (!st?.ok) return;
      const up = createCellarUpdate(ctx.api, { url: st.url, via: st.via });
      upBtn.disabled = true; replace(stEl, "업데이트 확인 중…");
      try {
        const c = await up.check();
        if (!c.behind) { replace(stEl, `최신 버전이에요 (${c.head})`); return; }
        if (!c.canApply) { replace(stEl, c.dirty?.length ? `서버에서 직접 고친 파일이 있어 자동 업데이트를 할 수 없어요: ${c.dirty.slice(0, 3).join(", ")}` : "이 서버의 Cellar는 원격보다 앞서 있어서 자동 업데이트를 할 수 없어요"); return; }
        const ok = await confirmDialog(ctx.win, { title: "Dusk Cellar를 업데이트할까요?", body: `새 변경 ${c.behind}건 (${c.head} → ${c.latest})\n${c.commits.slice(0, 8).map((x) => `· ${x}`).join("\n")}\n\nCellar만 잠깐 다시 켜져요. 리스는 그대로 돌아요. 새 버전이 안 불러지면 자동으로 이전 버전으로 돌아가요.`, ok: "업데이트" });
        if (!ok) { replace(stEl, "업데이트를 취소했어요"); return; }
        replace(stEl, "업데이트 중…");
        const r = await up.apply({ onWait: (i) => replace(stEl, `Cellar를 다시 켜는 중… (${Math.round((i + 1) * 1.5)}초)`) });
        replace(stEl, !r.back ? "업데이트했지만 Cellar가 아직 응답하지 않아요. 잠시 뒤 '다시 확인'을 눌러 주세요." : r.fullRestart ? `v${r.back.version}로 업데이트했어요. 실행기도 바뀌어서 서버에서 pm2 restart(또는 리스 재시작)를 한 번 해야 모두 적용돼요.` : `v${r.back.version}로 업데이트했어요.`);
        cel.forget(); await check();
      } catch (e) { replace(stEl, String(e?.message ?? e)); } finally { upBtn.disabled = false; }
    } });
    upBtn.hidden = true;
    const show = (st) => {
      paint(st);
      replace(stEl, st.off ? "꺼져 있어요 — 서버를 찾지 않아요" : st.ok ? `연결됨 · Dusk Cellar v${st.version}` : `연결 안 됨 · ${st.error ?? ""}`);
      bkBtn.hidden = !(st.ok && st.features?.includes("backup"));
      upBtn.hidden = !(st.ok && st.features?.includes("update"));
    };
    const input = h("input", { class: "rb-input", type: "url", value: url0, placeholder: CELLAR_DEFAULT_URL, "aria-label": "Cellar 주소", id: "rb-cellar-url" });
    // 장기기억 저장 위치(1.8.3): Cellar가 기억 저장을 지원하면 서버에만 저장, 끊기면 잠깐 이 기기에 쌓았다가 다시 올린다
    const remote = ctx.memory?.remote;
    const memEl = h("p", { class: "rb-p", id: "rb-cellar-mem" });
    const backBtn = remote ? btn("기억을 이 기기로 되돌리기", { id: "rb-cellar-memback", onClick: async () => {
      const m = remote.state();
      const ok = await confirmDialog(ctx.win, { title: "기억을 이 기기로 되돌릴까요?", body: m.online ? "서버에 있는 장기기억을 모두 플러그인 저장소로 받아 오고, 이후엔 플러그인에 저장해요. 서버의 기억은 지우지 않아요." : "지금 서버에 연결되지 않아요. 서버로 옮기기 전의 기억과 끊긴 동안 쌓인 변경만 남아요(서버에만 있는 최신 기억은 빠져요).", ok: "되돌리기", danger: !m.online });
      if (!ok) return;
      try { const r = await remote.disable({ force: !m.online }); replace(memEl, `되돌렸어요 · ${r.pulled}개`); } catch (e) { replace(memEl, String(e?.message ?? e)); }
      paintMem();
    } }) : null;
    const paintMem = () => {
      if (!remote) return;
      const m = remote.state();
      replace(memEl, m.mode !== "remote" ? "기억 저장: 이 기기(플러그인)" : m.online ? `기억 저장: 서버(Dusk Cellar)${m.queued ? ` · 올릴 변경 ${m.queued}건` : ""}` : `기억 저장: 서버 — 연결 끊김, 변경 ${m.queued}건을 잠시 이 기기에 모아 두는 중`);
      if (backBtn) backBtn.hidden = m.mode !== "remote";
    };
    paintMem();
    const check = async (fresh = true) => { replace(stEl, "확인 중…"); try { show(await cel.status({ fresh })); if (fresh) await remote?.detect?.().catch(() => {}); } catch (e) { show({ ok: false, error: String(e?.message ?? e) }); } paintMem(); };
    const onBtn = btn(on ? "Cellar 끄기" : "Cellar 켜기", { id: "rb-cellar-toggle", onClick: async () => { on = !on; await saveCellarEnabled(ctx.api, on); onBtn.textContent = on ? "Cellar 끄기" : "Cellar 켜기"; cel.forget(); await check(); } });
    check(false);
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "Dusk Cellar" },
      h("h3", null, "Dusk Cellar"),
      stEl,
      memEl,
      h("p", { class: "rb-muted" }, "리스를 직접 돌리는 서버(RisuBard 등)에 Dusk Cellar를 설치하면 자동으로 연결되고, 장기기억은 서버에만 저장돼요. 설치: github.com/Pyser08/Dusk-Cellar/releases/latest 에서 설치 파일(윈도우 install.bat · 맥 install.command)을 받아 리스 폴더에서 실행해요(git·Node 없이도 돼요)."),
      ctx.prefs.advanced ? h("label", { class: "rb-p" }, "주소 (보통은 그대로 두세요)", input) : null,
      h("div", { class: "rb-dialog-actions" },
        ctx.prefs.advanced ? btn("주소 저장", { onClick: async () => { try { await saveCellarUrl(ctx.api, input.value); cel.forget(); await check(); } catch (e) { replace(stEl, String(e?.message ?? e)); } } }) : null,
        bkBtn,
        upBtn,
        backBtn,
        onBtn,
        btn("다시 확인", { onClick: () => check(true), id: "rb-cellar-recheck" }),
        btn("닫기", { kind: "primary", onClick: () => done(true) })));
  });
}

// ── 세이브 백업(Dusk Cellar) ── 리스 세이브 폴더 + 서버 기억을 통째로. 바뀐 파일만 복사해서 빠르다.
const bkWhen = (it) => { try { return new Date(it.at).toLocaleString(); } catch { return it.id; } };
async function openCellarBackup(ctx, st) {
  const bk = createCellarBackups(ctx.api, { url: st.url, via: st.via });
  let closed = false, timer = null;
  await modal(ctx.win, (done) => {
    const stEl = h("p", { class: "rb-p", id: "rb-bk-st" }, "불러오는 중…");
    const listEl = h("div", { id: "rb-bk-list", style: "display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow:auto" });
    let busy = false;
    const nowBtn = btn("지금 백업", { kind: "primary", id: "rb-bk-now", onClick: async () => {
      try { await bk.create("수동"); load(); } catch (e) { replace(stEl, String(e?.message ?? e)); }
    } });
    const row = (it) => h("div", { class: "rb-row", style: "display:flex;align-items:center;gap:10px" },
      h("div", { style: "flex:1;min-width:0" },
        h("div", null, bkWhen(it), it.label ? h("span", { class: "rb-muted" }, ` · ${it.label}`) : null),
        h("div", { class: "rb-muted" }, `파일 ${it.files.toLocaleString()}개 · ${fmtSize(it.bytes)} · ${(it.ms / 1000).toFixed(1)}초`),
        it.unstable ? h("div", { class: "rb-muted", style: "color:var(--rb-warn,#c97a00)" }, "백업 중에도 세이브가 계속 바뀌어서 일부 파일이 서로 안 맞을 수 있어요") : null),
      btn("복원", { size: "sm", onClick: () => doRestore(it) }));
    async function doRestore(it) {
      if (busy) return;
      const ok = await confirmDialog(ctx.win, { title: "이 백업으로 되돌릴까요?", body: `${bkWhen(it)} 상태로 리스 세이브 전체와 서버 기억을 되돌려요.\n· 리스가 잠깐 꺼졌다 다시 켜져요.\n· 지금 상태는 '복원 전 자동' 백업으로 남겨요.\n· 끝나면 리스를 열어 둔 화면(다른 기기 포함)을 모두 새로고침해 주세요. 새로고침 전 화면이 옛 데이터를 다시 저장할 수 있어요.`, ok: "복원", danger: true });
      if (!ok) return;
      busy = true; clearTimeout(timer); nowBtn.disabled = true;
      replace(stEl, "복원 중… 리스를 다시 켜는 중이에요");
      try {
        const back = await bk.restore(it.id, { onWait: (i) => replace(stEl, `복원 중… 리스를 다시 켜는 중이에요 (${(i + 1) * 2}초)`) });
        replace(stEl, back ? "복원했어요. 지금 리스를 새로고침해 주세요(F5 또는 앱 다시 시작)." : "리스가 아직 응답하지 않아요. 잠시 뒤 새로고침해 주세요.");
      } catch (e) { replace(stEl, `복원 실패 · ${String(e?.message ?? e)}`); busy = false; nowBtn.disabled = false; }
    }
    async function load() {
      if (closed || busy) return;
      try {
        const { items, job } = await bk.list();
        const running = job && !job.finishedAt;
        nowBtn.disabled = !!running;
        replace(stEl, running ? `백업 중… ${job.done.toLocaleString()} / ${job.total.toLocaleString()}개` : job?.error ? `마지막 백업 실패 · ${job.error}` : `백업 ${items.length}개 · 바뀐 파일만 복사해서 두 번째부터는 빨라요`);
        replace(listEl, ...(items.length ? items.map(row) : [h("p", { class: "rb-muted" }, "아직 백업이 없어요.")]));
        if (running) timer = setTimeout(load, 1000);
      } catch (e) { replace(stEl, String(e?.message ?? e)); }
    }
    load();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "세이브 백업" },
      h("h3", null, "세이브 백업"),
      h("p", { class: "rb-muted" }, "리스 세이브 폴더 전체(캐릭터·채팅·에셋·설정)와 서버의 장기기억을 서버에 백업해요. 최근 5개를 보관해요."),
      stEl, listEl,
      h("div", { class: "rb-dialog-actions" }, nowBtn, btn("닫기", { onClick: () => done(true) })));
  });
  closed = true; clearTimeout(timer);
}
