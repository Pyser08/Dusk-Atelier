// Dusk Saga 가방 — 전투 화면과 따로 뜨는 독립 화면. [제작] ↔ [정비]는 옆으로 밀거나 눌러서 넘긴다.
// 아래 서랍(가방 속 소재)은 끌어올리거나 손잡이를 눌러 펼친다. 바꾼 것은 곧바로 장부에 저장되고, 다음 답부터 ‘일행 장비’ 줄로 실린다.
import * as E from "../../src/rpg/engine/index.js";

const GC = { 조악: "#7a7680", 보통: "#d8d2c4", 양질: "#6fd08a", 정예: "#5aa8ff", 희귀: "#b07aff", 영웅: "#ffa040", 전설: "#ffd35a", 신화: "#ff5a7a" };
const gradeOf = (it) => String(it?.grade != null && typeof it.grade === "number" ? E.gradeName(it.grade) : it?.grade || "보통").replace(/[+-]$/, "");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const lookOf = (it) => (it?.a && !it.shape ? { shape: { head: "skull", body: "plate", hands: "w_fist", legs: "hide", feet: "leather" }[it.a.slot], pal: it.a.pal } : it?.w && !it.shape ? E.weaponIcon(it.w) : it?.mid && E.BY_ID[it.mid] ? E.BY_ID[it.mid] : it?.shape ? it : it?.part ? E.partMaterial(it.src, it.part, it.model, it.elem) : { shape: "ore", pal: "stone" });
const icon = (it, px = 34) => E.iconSvg(lookOf(it), px);
const catOf = (it) => (it.kind === "장비" || it.kind === "장신구" || it.kind === "방어구" ? "gear" : it.mid && E.BY_ID[it.mid] ? E.BY_ID[it.mid].cat : it.part ? "part" : "misc");
const FILTERS = [["all", "전체"], ["part", "부위"], ["ore", "광석"], ["metal", "금속"], ["gem", "보석"], ["wood", "나무"], ["plant", "약초"], ["hide", "가죽·천"], ["essence", "정수"], ["misc", "잡화"], ["gear", "장비"]];
const px = (shape, pal, n = 16) => `<i class=bg-ic>${E.iconSvg({ shape, pal }, n)}</i>`;
const ICO = { back: "‹", craft: px("w_hammer", "iron"), gear: px("w_shield", "steel"), book: px("w_tome", "leather"), clear: "↺", lock: px("charm", "gold", 14) };

export async function mountBag(root, host) {
  const ledger = host.ledger; let L = await ledger.get(); if (E.ensureStarter(L)) await ledger.put(L);
  const talk = (await ledger.recent?.().catch(() => "")) || "", shopHere = E.WORKSHOP.test(talk);
  const V = { page: host.start === "gear" ? 1 : 0, aslot: null, size: 3, grid: Array(9).fill(null), brush: null, filter: "all", open: false, who: Object.keys(L.party.defs)[0] || "", slot: null, pending: null, msg: "", flash: "" };
  const el = document.createElement("div"); el.className = "bg"; root.append(el);
  let saveT = 0; const save = () => { clearTimeout(saveT); saveT = setTimeout(async () => { await ledger.put(L); toast("저장됨 · 다음 답부터 반영돼요"); }, 120); };
  const toast = (t) => { const n = el.querySelector(".bg-toast"); if (!n) return; n.textContent = t; n.classList.remove("on"); void n.offsetWidth; n.classList.add("on"); };
  const item = (id) => L.bag.find((b) => b.id === id);
  const used = (id) => V.grid.filter((g) => g === id).length;
  const D = () => L.party.defs[V.who];

  // ── 그리기 ──
  function frame() {
    el.innerHTML = `<header class=bg-top><button class=bg-x data-a=close aria-label=닫기>${ICO.back}</button><h2>가방</h2><nav class=bg-tabs><button data-tab=0>${ICO.craft} 가방</button><button data-tab=1>${ICO.gear} 정비</button><button data-tab=2>${px("w_tome", "gold")} 길드</button><button data-tab=3>${px("powder", "gold")} 상점</button><i class=bg-ind></i></nav></header>
      <div class=bg-pages><section class="bg-page pc"></section><section class="bg-page pg"></section><section class="bg-page pq"></section><section class="bg-page ps"></section></div>
      <div class=bg-drawer><button class=bg-handle data-a=drawer><i></i><span class=bg-dh></span></button><div class=bg-chips></div><div class=bg-inv></div></div><div class=bg-toast></div><div class=bg-pop hidden></div>`;
    const pages = el.querySelector(".bg-pages"); pages.addEventListener("scroll", () => { const p = Math.round(pages.scrollLeft / pages.clientWidth); if (p !== V.page) { V.page = p; V.brush = null; for (const q of [p - 1, p, p + 1]) if (dirty.has(q)) page(q); tabs(); drawer(); } el.querySelector(".bg-ind").style.transform = `translateX(${(pages.scrollLeft / pages.clientWidth) * 100}%)`; if (p >= 2) readWorld(); }, { passive: true });
  }
  const tabs = () => { el.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", +b.dataset.tab === V.page)); const h = el.querySelector(".bg-top h2"); if (h) h.textContent = ["가방", "정비", "길드", "상점"][V.page]; };
  function craft() {
    const n = V.size, m = E.matchGrid(V.grid, n, L.bag), shopLock = !!m && m.recipe.shop && !shopHere && !V.unlock, p = m && !m.short ? E.preview(m, V.grid, L.bag, Math.max(1, ...Object.values(L.party.defs).map((d) => d.level || 1))) : null, lock = n === 5 && !shopHere && !V.unlock;
    const cells = V.grid.map((g, i) => { const it = g && item(g); return `<button class="bg-cell ${it ? "f" : ""} ${m?.cells?.some((c) => c.i === i) ? "hit" : ""}" data-cell=${i}>${it ? icon(it, n === 5 ? 26 : 38) : ""}</button>`; }).join("");
    el.querySelector(".pc").innerHTML = `<div class=bg-tables><button data-size=3 class="${n === 3 ? "on" : ""}">${shopHere || V.unlock ? "3×3 작업대" : "3×3 휴대 제작"}</button><button data-size=5 class="${n === 5 ? "on" : ""}">${shopHere || V.unlock ? "" : ICO.lock + " "}5×5 대장간</button></div>
      <div class="bg-bench s${n}"><div class=bg-grid style="--n:${n}">${cells}</div><div class=bg-arrow>${p ? "➜" : "⇢"}</div>
      <div class="bg-out ${p && !shopLock ? "ready" : ""} ${shopLock ? "lk" : ""}" style="--g:${p ? GC[gradeOf(p)] || "#fff" : "#444"}">${p ? icon(p.kind === "weapon" ? { w: p.w } : p, 52) : ""}${p?.n > 1 ? `<b>×${p.n}</b>` : ""}</div></div>
      <div class=bg-res>${shopLock ? `<p class=bg-lock>${ICO.lock} 「${esc(m.recipe.name)}」은(는) 대장간·아틀리에에서만 만들 수 있어요. 휴대 제작대로는 손질·약·부적만 돼요.</p>` : lock ? `<p class=bg-lock>${ICO.lock} 5×5는 대장간·공방 같은 곳에서만 쓸 수 있어요. 이야기 속에서 그런 곳에 가면 열려요.</p>` : p ? `<div class=bg-rname style="--g:${GC[gradeOf(p)]}"><b>${esc(p.name)}</b><small>${esc(m.recipe.name)} · ${esc(gradeOf(p))}${p.elem ? " · " + E.ELEM_NAME[p.elem] : ""}${p.kind === "weapon" ? ` · 위력 ${p.w.mt} 명중 ${p.w.hit}${p.w.crit ? " 필살 " + p.w.crit : ""}` : p.kind === "charm" ? " · " + esc(skillName(p.skill)) : ""}</small></div><button class="bg-make main" data-a=make>만들기</button>` : m?.short ? `<p>「${esc(m.recipe.name)}」 모양이에요. 재료 개수가 모자라요.</p>` : V.grid.some(Boolean) ? "<p>이 모양으로 만들 수 있는 게 없어요. 레시피를 보세요.</p>" : "<p>아래 가방에서 소재를 골라 칸을 눌러 놓아요. 끌어다 놓아도 돼요.</p>"}</div>
      <div class=bg-row><button data-a=clear>${ICO.clear} 비우기</button><button data-a=book>${ICO.book} 레시피</button><button data-a=dex>${px("skull", "bonew")} 도감</button></div>`;
  }
  const skillName = (id) => ({ str2: "공격 +2", def2: "수비 +2", spd2: "속도 +2", hit15: "명중 +15", avo10: "회피 +10", laststand: "HP 절반 이하 공격 +4", riposte: "방어 시 공격 +3", fullform: "HP 가득일 때 공격·명중 ↑" }[id] || id);
  // 3D 미리보기(처음 볼 때 불러온다. 못 불러오면 그림 인형 그대로)
  let P3 = null, P3load = null;
  async function mount3d(d) {
    const box = el.querySelector(".bg-3d"); if (!box) return;
    try { if (!P3) { P3load ||= import("./bag3d.js").then((m) => (P3 = m.createPreview())); await P3load; } } catch (e) { console.log("[Dusk Saga] 3D 미리보기 실패", e); return; }
    const box2 = el.querySelector(".bg-3d"); if (!box2) return; box2.querySelector("svg")?.remove(); P3.mount(box2);
    const look = E.armorLook(d) || { outfit: d.outfit || "", dye: {} }, w = d.weapons.find((x) => x.type !== "item") || d.weapons[0];
    P3.set({ outfit: look.outfit, dye: look.dye, hair: d.hair || 0, sex: d.sex, race: E.RACES[d.race]?.mem || "", w: w?.type || "", look: w ? E.lookOf(w) : {} });
  }
  function gear() {
    const ds = Object.values(L.party.defs).filter((d) => d.name); if (ds.length && !D()) V.who = ds[0].id; const d = D(), pg = el.querySelector(".pg");
    if (!ds.length) { pg.innerHTML = `<div class=bg-empty><b>아직 동료가 없어요</b><p>전투를 한 번 하면 함께 싸운 동료가 여기에 생겨요.</p></div>`; return; }
    E.starterArmor(d); const A = d.armor || {}, grp = E.groupOf(d), sets = E.setsOf(d), col = (a, fb) => (a ? (E.PAL[a.pal] || E.PAL.iron)[1] : fb), hair = d.hair ? "#" + d.hair.toString(16).padStart(6, "0") : "#4a4350";
    const doll = `<div class=bg-3d><svg viewBox="0 0 60 100" class=bg-doll><circle cx=30 cy=14 r=9 fill="#f0c8a4"/><path d="M21 12q9-12 18 0v-3q-9-9-18 0z" fill="${hair}"/>${A.head ? `<path d="M20 13q10-14 20 0v-2q-10-12-20 0z" fill="${col(A.head)}" stroke="#0006"/>` : ""}
      <rect x=19 y=24 width=22 height=26 rx=4 fill="${col(A.body, "#ece6d6")}" stroke="#0006"/><rect x=11 y=26 width=7 height=22 rx=3 fill="${A.body ? col(A.body) : "#f0c8a4"}"/><rect x=42 y=26 width=7 height=22 rx=3 fill="${A.body ? col(A.body) : "#f0c8a4"}"/>
      <rect x=10 y=46 width=9 height=8 rx=3 fill="${col(A.hands, "#f0c8a4")}" stroke="#0005"/><rect x=41 y=46 width=9 height=8 rx=3 fill="${col(A.hands, "#f0c8a4")}" stroke="#0005"/>
      <rect x=20 y=50 width=9 height=34 rx=3 fill="${col(A.legs, "#d8d0bc")}" stroke="#0005"/><rect x=31 y=50 width=9 height=34 rx=3 fill="${col(A.legs, "#d8d0bc")}" stroke="#0005"/>
      <rect x=18 y=84 width=12 height=8 rx=3 fill="${col(A.feet, "#f0c8a4")}" stroke="#0005"/><rect x=30 y=84 width=12 height=8 rx=3 fill="${col(A.feet, "#f0c8a4")}" stroke="#0005"/></svg></div>`;
    const aslot = (s) => { const a = A[s]; return `<button class="bg-aslot ${V.aslot === s ? "sel" : ""}" data-aslot=${s} style="--g:${a ? GC[gradeOf(a)] : "#3a2e44"}">${a ? E.iconSvg({ shape: { head: "skull", body: "plate", hands: "w_fist", legs: "hide", feet: "leather" }[s], pal: a.pal }, 26) : ""}<span><small>${E.SLOTS[s]}</small><b>${a ? esc(a.name) : "—"}</b></span></button>`; };
    const w = (x, i) => `<button class="bg-slot ${i === 0 ? "main" : ""} ${V.slot === i ? "sel" : ""}" data-slot=${i} style="--g:${GC[gradeOf(x)]}">${icon({ w: x }, i === 0 ? 40 : 28)}<span><b>${i === 0 ? "<em class=bg-tag>주</em>" : d.sub === x.name ? "<em class='bg-tag s'>보조</em>" : ""}${esc(x.name)}</b><small>${x.type === "item" ? `${x.uses}/${x.max}` : `${esc(gradeOf(x))}${x.elem ? " · " + E.ELEM_NAME[x.elem] : ""} · 위력 ${x.mt}`}</small></span></button>`;
    const sum = {}; for (const a of Object.values(A)) if (a?.st) for (const [k, v] of Object.entries(a.st)) sum[k] = (sum[k] || 0) + v; for (const s of sets) for (const f of s.fx) for (const [k, v] of Object.entries(f.m || {})) sum[k] = (sum[k] || 0) + v;
    const st = d.stats || {}, SN = { atk: "공격", hit: "명중", avo: "회피", crit: "필살", def: "수비", res: "마방", spd: "속도" };
    const acts = V.slot != null && d.weapons[V.slot] ? `<div class=bg-acts>${V.slot ? `<button data-g=main>주무기로</button><button data-g=sub class="${d.sub === d.weapons[V.slot].name ? "on" : ""}">${d.sub === d.weapons[V.slot].name ? "보조 해제" : "보조무기로"}</button>` : ""}<button data-g=repair ${d.weapons[V.slot].max && d.weapons[V.slot].uses < d.weapons[V.slot].max ? "" : "disabled"}>수리</button><button data-g=temper class="${V.pending === "temper" ? "on" : ""}">강화</button><button data-g=imbue class="${V.pending === "imbue" ? "on" : ""}">속성 입히기</button><button data-g=stash ${d.weapons.length > 1 ? "" : "disabled"}>가방에</button>${ds.length > 1 ? `<button data-g=give>넘기기</button>` : ""}</div>${V.pending ? `<p class=bg-hint>${V.pending === "give" ? "넘겨받을 동료를 위에서 누르세요" : V.pending === "temper" ? "강화: 소재 등급까지 무기 등급이 두 칸 오르고 위력·명중이 늘어요. 쓸 수 있는 소재만 밝게, 바뀌는 값은 소재 밑에 보여요" : "속성 입히기: 무기 속성이 소재의 속성으로 바뀌어요(그 속성에 약한 적에게 큰 피해). 속성 있는 소재만 밝게 보여요"}</p>` : ""}`
      : V.aslot && A[V.aslot] ? `<div class=bg-acts><button data-g=unarmor>벗기</button></div><p class=bg-hint>${esc(Object.entries(A[V.aslot].st).map(([k, v]) => SN[k] + (v > 0 ? " +" : " ") + v).join(" · "))}${A[V.aslot].elem ? " · " + E.ELEM_NAME[A[V.aslot].elem] + " 저항" : ""}</p>` : "";
    const sks = d.skills.map((k) => L.party.skills[k] || { name: k }).map((s, i) => `<button class="bg-sk ${s.flags?.area ? "area" : ""}" data-sk="${esc(d.skills[i])}">${esc(s.name)}${s.flags?.area ? " <small>범위</small>" : ""}</button>`).join("");
    const lib = (L.skillLib || []).filter((k) => !d.skills.includes(k) && L.party.skills[k]).map((k) => `<button class="bg-sk lib" data-learn="${esc(k)}">+ ${esc(L.party.skills[k].name)}</button>`).join("");
    pg.innerHTML = `<div class=bg-who>${ds.map((x) => `<button data-who="${esc(x.id)}" class="${x.id === V.who ? "on" : ""}"><i>${esc(x.name.slice(0, 1))}</i><span>${esc(x.name)}</span></button>`).join("")}</div>
      <div class=bg-card><div class=bg-ch><b>${esc(d.name)}</b><small>Lv ${d.level} · ${esc(d.cls || d.job || "")} · <em class=bg-grp>${E.GROUPS[grp].n}</em>${d.injury ? ` · <em>${d.injury.k === "wound" ? "중상" : "부상"} ${d.injury.left}판</em>` : ""}</small><button class=bg-auto data-g=stats>${V.edit ? "능력치 닫기" : "능력치 고치기"}</button><button class=bg-auto data-g=auto>추천 장비</button></div>
      <div class=bg-paper><div class=bg-acol>${["head", "body", "hands", "legs", "feet"].map(aslot).join("")}</div>${doll}<div class=bg-wcol>${d.weapons.map(w).join("")}${d.weapons.length < 5 ? `<div class="bg-slot none">무기 빈 칸 ${5 - d.weapons.length}</div>` : ""}${d.charm ? `<button class=bg-slot data-g=uncharm style="--g:${GC[gradeOf(d.charm)]}">${E.iconSvg({ shape: "charm", pal: d.charm.pal || "gold" }, 26)}<span><b>${esc(d.charm.name)}</b><small>${esc(skillName(d.charm.skill))} · 빼기</small></span></button>` : `<div class="bg-slot none">장신구 없음</div>`}</div></div>
      ${acts}
      ${V.edit ? `<div class=bg-sedit>${E.STATS.map((k) => { const mx = k === "hp" ? 120 : 60, v = st[k] ?? 0; return `<label class=bg-sr><span>${E.SL[k]}</span><input type=range min=${k === "hp" ? 1 : 0} max=${mx} value=${v} data-stat=${k} style="--p:${v / mx * 100}%"><b data-sv=${k}>${v}</b></label>`; }).join("")}<div class=bg-row><button data-g=statdone class=main>다 고쳤어요</button></div><p class=bg-hint>막대를 잡고 끌거나 눌러서 바꿔요. 바꾼 값은 다음 전투와 다음 답부터 반영돼요.</p></div>` : ""}
      <div class=bg-stats ${V.edit ? "hidden" : ""}>${["hp", "str", "mag", "skl", "spd", "def", "res"].map((k) => `<span><small>${E.SL[k]}</small>${st[k] ?? "-"}${k === "def" && sum.def ? `<u>+${sum.def}</u>` : k === "res" && sum.res ? `<u>+${sum.res}</u>` : k === "spd" && sum.spd ? `<u>${sum.spd > 0 ? "+" : ""}${sum.spd}</u>` : ""}</span>`).join("")}</div>
      <p class=bg-hint>방어구 합계: ${Object.entries(sum).filter(([, v]) => v).map(([k, v]) => SN[k] + (v > 0 ? " +" : " ") + v).join(" · ") || "없음(속옷 차림)"} · ${E.GROUPS[grp].n} 방어구만 입을 수 있어요</p>
      ${sets.length ? `<div class=bg-sets>${sets.map((s) => `<div class="bg-set ${s.fx.length ? "on" : ""}"><b>${esc(s.name)} ${s.n}/4</b>${s.all.map((f, i) => `<span class="${s.fx.length > i ? "on" : ""}">${i ? "4세트" : "2세트"} ${esc(f.n)}</span>`).join("")}</div>`).join("")}</div>` : ""}
      <div class=bg-skills><h4>기술 <small>${d.skills.length}/6 · 누르면 잊기</small></h4><div class=bg-skl>${sks}</div>${lib ? `<h4>만든 기술</h4><div class=bg-skl>${lib}</div>` : ""}
      <div class=bg-skf><input class=bg-in data-k=skname maxlength=24 placeholder="새 기술 이름"><input class=bg-in data-k=skdesc maxlength=80 placeholder="설명 (예: 번개를 실어 적을 꿰뚫는다, 광역이면 '광역')"><select class=bg-in data-k=skgrade>${E.GRADES.map((g, i) => `<option value=${i * 3 + 1} ${i === 3 ? "selected" : ""}>${g}</option>`).join("")}</select><select class=bg-in data-k=sktype><option value=art>공격</option><option value=passive>패시브</option></select><button data-g=mkskill>만들기</button></div>
      <h4>기술 세트</h4><div class=bg-skl>${(d.skillSets || []).map((v, i) => `<button class="bg-sk set" data-sset=${i}>${esc(v.name)}</button>`).join("")}<button class="bg-sk lib" data-g=saveset>+ 지금 기술을 세트로 저장</button></div></div></div>`;
    mount3d(d);
  }
  // ── 세계: 처음 길드·상점을 볼 때 AI가 배경을 읽어 길드·화폐·상점을 정한다 ──
  let reading = false;
  async function readWorld(force) {
    const w = E.worldOf(L); if (reading || (w.ai && !force) || !host.ask) return; reading = true; V.msg = "AI가 이 이야기의 세계를 읽는 중…"; guild(); shop();
    try { const t = await host.ask(E.WORLD_PROMPT, "위 이야기의 세계를 정해진 줄 형식으로만."); L = await ledger.get(); L.world = E.parseWorld(t, L.world); L.world.ai = true; await ledger.put(L); V.msg = `${E.ERAS[L.world.era]?.n || ""} 세계로 읽었어요 — ${L.world.guild.name} · ${L.world.money.units.map((u) => u.n).join("/")}`; }
    catch (e) { V.msg = "세계를 읽지 못했어요(기본값을 써요): " + (e?.message ?? e); } reading = false; draw();
  }
  const SHOP_RE = /상점|가게|시장|상인|잡화|대장간|약방|약국|편의점|매점|무기상|장비점|암시장|보급|포목|노점|shop|store|market/i;
  function guild() {
    const w = E.worldOf(L), g = w.guild, need = (g.rank + 1) * 60, qs = L.quests || [], pq = el.querySelector(".pq"), K = { hunt: "토벌", gather: "채집", deliver: "납품", escort: "호위" };
    const card = (q, mine) => `<div class="bg-q ${q.status}"><div class=bg-qh><b>${esc(q.title)}</b><em>${esc(g.ranks[q.rank] || "")}</em></div><small>${esc(q.giver)} · ${K[q.kind]} · ${esc(q.target)} ${mine ? `${q.got}/${q.n}` : "×" + q.n}</small><p>${esc(q.about)}</p><div class=bg-qf><span>${esc(E.fmtMoney(L, q.reward))} · 평판 +${q.rep}</span>${mine ? `${q.kind === "gather" || q.kind === "deliver" ? `<button data-qd="${q.id}">건네기</button>` : ""}<button data-qx="${q.id}">포기</button>` : q.status === "open" ? `<button class=main data-qt="${q.id}">수락</button>` : ""}</div></div>`;
    pq.innerHTML = `<div class=bg-gh><div><b>${esc(g.name)}</b><small>${esc(E.ERAS[w.era]?.n || "")} · 랭크 <em class=bg-rank>${esc(g.ranks[g.rank])}</em></small><i class=bg-rep><i style="width:${Math.min(100, (g.rep - g.rank * 60) / 60 * 100)}%"></i></i><small>평판 ${g.rep}${g.rank < g.ranks.length - 1 ? ` · 다음 랭크까지 ${need - g.rep}` : " · 최고 랭크"}</small></div><div class=bg-wal>${esc(E.fmtMoney(L, E.wallet(L)))}</div></div>
      ${V.msg ? `<p class=bg-hint>${esc(V.msg)}</p>` : ""}
      <h4 class=bg-h4>수락한 의뢰 <small>${qs.filter((q) => q.status === "taken").length}/3</small></h4>${qs.filter((q) => q.status === "taken").map((q) => card(q, true)).join("") || "<p class=bg-hint>없어요. 아래 게시판에서 수락하세요. 토벌은 전투에서 이기면, 채집·납품은 가방에 모이면 끝나요.</p>"}
      <h4 class=bg-h4>게시판</h4>${qs.filter((q) => q.status === "open").map((q) => card(q, false)).join("") || `<p class=bg-hint>${host.questMode?.() === "off" ? "의뢰 만들기가 꺼져 있어요(Dusk Saga 설정)." : host.questMode?.() === "manual" ? "아래 버튼으로 의뢰를 받아요." : "이야기에서 길드·게시판이 나오면 의뢰가 올라와요. 지금 받으려면 아래 버튼."}</p>`}
      <div class=bg-row><button data-a=newq ${host.ask && host.questMode?.() !== "off" ? "" : "disabled"}>새 의뢰 받기</button><button data-a=reworld ${host.ask ? "" : "disabled"}>세계 다시 읽기</button></div>
      ${qs.some((q) => q.status === "done") ? `<h4 class=bg-h4>끝낸 의뢰</h4><p class=bg-hint>${qs.filter((q) => q.status === "done").slice(-6).map((q) => esc(q.title)).join(" · ")}</p>` : ""}`;
  }
  function shop() {
    const w = E.worldOf(L), ps = el.querySelector(".ps"), near = SHOP_RE.test(talk) || V.unlock, cur = V.shop && w.shops.includes(V.shop) ? V.shop : w.shops[0], day = Math.floor(Date.now() / 864e5), st = E.stock(L, cur, day);
    const nm = (x) => (x.mid ? E.BY_ID[x.mid].name : x.w ? x.w.name || E.KINDS[x.w.kind]?.n : x.potion), ic = (x) => (x.mid ? icon({ mid: x.mid }, 30) : x.w ? icon({ w: x.w }, 30) : icon({ shape: "potion", pal: x.potion === "해독제" ? "emerald" : "ruby" }, 30));
    ps.innerHTML = `<div class=bg-gh><div><b>${esc(cur)}</b><small>${near ? "오늘의 진열 · 가방의 물건을 누르면 팔 수 있어요" : "이야기 속 상점·시장에 있을 때만 거래할 수 있어요"}</small></div><div class=bg-wal>${esc(E.fmtMoney(L, E.wallet(L)))}</div></div>
      <div class=bg-chips2>${w.shops.map((x) => `<button data-shop="${esc(x)}" class="${x === cur ? "on" : ""}">${esc(x)}</button>`).join("")}</div>
      ${V.msg && V.page === 3 ? `<p class=bg-hint>${esc(V.msg)}</p>` : ""}
      <div class="bg-stock ${near ? "" : "lk"}">${st.map((x, i) => `<button class=bg-ware data-buy=${i} ${near && E.wallet(L) >= x.price ? "" : "disabled"}>${ic(x)}<span><b>${esc(nm(x))}</b><small>${esc(E.fmtMoney(L, x.price))}</small></span></button>`).join("")}</div>`;
    V.stock = st; V.shop = cur; V.near = near;
  }
  // 강화·속성 입히기: 이 소재로 지금 무기가 어떻게 바뀌는지(못 쓰면 이유)
  function matUse(it) {
    const d = D(), w = d?.weapons?.[V.slot]; if (!w || it.kind !== "소재") return { ok: false, eff: "소재가 아니에요" };
    if (V.pending === "temper") { const cap = E.makeWeapon({ name: "x", grade: it.grade }).grade, g0 = w.grade ?? 0; if (cap <= g0) return { ok: false, eff: `${gradeOf(it)} 소재로는 더 못 올려요` }; const g1 = Math.min(cap, g0 + 2), nw = E.makeWeapon({ name: w.name, kind: w.kind || w.type, grade: g1, elem: w.elem || "" }, d.level); return { ok: true, eff: `${E.gradeName(g0)}→${E.gradeName(g1)} · 위력 ${w.mt}→${nw.mt}` }; }
    if (V.pending === "imbue") { if (!it.elem) return { ok: false, eff: "속성이 없는 소재" }; if (it.elem === w.elem) return { ok: false, eff: "이미 같은 속성" }; const el = E.ELEMENTS[it.elem]; return { ok: true, eff: `${E.ELEM_NAME[w.elem] || "무속성"}→${E.ELEM_NAME[it.elem]}${el?.x2?.length ? " · " + el.x2.slice(0, 3).map((x) => E.ELEM_NAME[x] || x).join("·") + "에 강함" : ""}` }; }
    return { ok: true, eff: "" };
  }
  function drawer() {
    const f = V.filter, pend = V.page === 1 && (V.pending === "temper" || V.pending === "imbue"), list = L.bag.filter((b) => (f === "all" ? true : catOf(b) === f)).sort((a, b) => (pend ? (matUse(b).ok ? 1 : 0) - (matUse(a).ok ? 1 : 0) : 0));
    el.querySelector(".bg-drawer").classList.toggle("open", V.open);
    el.querySelector(".bg-dh").textContent = `가방 ${L.bag.reduce((s, b) => s + (b.n || 1), 0)}개 · ${V.open ? "내리기" : "끌어올려 펼치기"}`;
    el.querySelector(".bg-chips").innerHTML = FILTERS.filter(([k]) => k === "all" || L.bag.some((b) => catOf(b) === k)).map(([k, t]) => `<button data-f=${k} class="${k === f ? "on" : ""}">${t}</button>`).join("");
    el.querySelector(".bg-inv").innerHTML = list.length ? list.map((b) => { const left = (b.n || 1) - used(b.id), mu = V.page === 1 && (V.pending === "temper" || V.pending === "imbue") ? matUse(b) : null; return `<button class="bg-it ${V.brush === b.id ? "sel" : ""} ${(left <= 0 && V.page === 0) || (mu && !mu.ok) ? "out" : ""} ${mu?.ok ? "use" : ""}" ${mu ? `data-eff="${esc(mu.eff)}"` : ""} data-it="${b.id}" style="--g:${GC[gradeOf(b)] || "#888"}" title="${esc(b.name)}">${icon(b, 30)}${(b.n || 1) > 1 || used(b.id) ? `<b>${V.page === 0 ? left : b.n}</b>` : ""}<span>${esc(b.name)}</span>${mu ? `<em class=bg-eff>${esc(mu.eff)}</em>` : ""}</button>`; }).join("") : `<p class=bg-none>비어 있어요</p>`;
  }
  // 그리기는 지금 쪽과 옆 쪽만(밀어 넘길 때 보이게). 나머지는 넘어갈 때 그린다 — 휴대폰에서 가볍게
  const PAGES = [() => craft(), () => gear(), () => guild(), () => shop()], dirty = new Set();
  const page = (p) => { if (p < 0 || p > 3) return; dirty.delete(p); PAGES[p](); };
  const draw = () => { for (let p = 0; p < 4; p++) dirty.add(p); for (const p of [V.page - 1, V.page, V.page + 1]) page(p); drawer(); tabs(); };

  // ── 동작 ──
  const place = (i, id) => { if (!id) { V.grid[i] = null; return; } const it = item(id); if (!it || (it.n || 1) - used(id) <= 0 || it.kind !== "소재") { toast(it && it.kind !== "소재" ? "제작대에는 소재만 놓을 수 있어요" : "남은 게 없어요"); return; } V.grid[i] = id; };
  function pickItem(id) {
    const it = item(id); if (!it) return;
    if (V.page === 3) { if (!V.near) return toast("상점에 있을 때만 팔 수 있어요"); const pr = E.sellPrice(L, it); if (confirm(`${it.name} 하나를 ${E.fmtMoney(L, pr)}에 팔까요?`)) { E.discard(L, id, 1); E.earn(L, pr); L.notes.push(`${it.name} 판매 — ${E.fmtMoney(L, pr)}`); save(); draw(); } return; }
    if (V.page === 0) { V.brush = V.brush === id ? null : id; if (!V.grid.some(Boolean) && V.brush) toast("칸을 눌러 놓아요"); return draw(); }
    const d = D(); if (!d) return;
    if (V.pending === "temper" || V.pending === "imbue") { const ok = V.pending === "temper" ? E.temper(L, d.id, V.slot, id) : E.imbue(L, d.id, V.slot, id); toast(ok ? (V.pending === "temper" ? "강화했어요" : "속성을 입혔어요") : V.pending === "temper" ? "이 소재로는 더 못 올려요" : "속성이 없거나 같은 속성이에요"); if (ok) { V.pending = null; save(); } return draw(); }
    if (it.charm) { E.equipCharm(L, id, d.id); save(); return draw(); }
    if (it.a) { if (!E.equipArmor(L, id, d.id)) return toast(`${E.GROUPS[it.a.group].n} 방어구는 ${E.GROUPS[E.groupOf(d)].n} 직업군이 못 입어요`); save(); return draw(); }
    if (it.w) { if (d.weapons.length >= 5) return toast("칸이 가득 찼어요"); E.equip(L, id, d.id); save(); return draw(); }
    pop(it);
  }
  function pop(it) { const n = el.querySelector(".bg-pop"), c = E.CATS[catOf(it)] || ""; n.innerHTML = `<div class=bg-pc style="--g:${GC[gradeOf(it)]}">${icon(it, 64)}<div><b>${esc(it.name)}</b><small>${esc(c)} · ${esc(gradeOf(it))}${it.elem ? " · " + E.ELEM_NAME[it.elem] : ""} · ${it.n || 1}개</small><p>${esc(desc(it))}</p></div><button data-a=popx>닫기</button><button data-a=drop>하나 버리기</button></div>`; n.hidden = false; n.dataset.id = it.id; }
  const desc = (it) => { if (it.a) return `${E.GROUPS[it.a.group].n} ${E.SLOTS[it.a.slot]} · ` + Object.entries(it.a.st).map(([k, v]) => k + (v > 0 ? "+" : "") + v).join(" ") + (it.a.setName ? ` · 세트: ${it.a.setName}` : ""); if (it.w) return it.w.type === "item" ? `회복 ${it.w.mt >= 99 ? "전부" : it.w.mt} · ${it.w.uses}/${it.w.max}번` : `위력 ${it.w.mt} · 명중 ${it.w.hit}${it.w.crit ? " · 필살 " + it.w.crit : ""} · 사정 ${it.w.rmin}–${it.w.rmax}`; if (it.charm) return skillName(it.charm.skill); const t = E.tagsOf(it), k = Object.entries(E.KEYS).filter(([, v]) => v.ok(it)).map(([, v]) => v.n).slice(0, 3); return (it.src ? it.src + "에게서 얻음. " : "") + (k.length ? "레시피에서 " + k.join(" · ") + "(으)로 써요." : t.join(", ")); };
  function book() {
    const n = el.querySelector(".bg-pop"), canMake = (r) => !!E.autoFill(r, L.bag, Math.max(V.size, r.size));
    const rows = E.RECIPES.map((r) => { const ok = canMake(r) && (!r.shop || shopHere || V.unlock), pat = E.RECIPES && r.rows; return `<button class="bg-rc ${ok ? "ok" : ""}" data-rc="${r.id}"><span class="bg-pat s${r.size}" style="--n:${Math.max(...pat.map((x) => x.length))}">${pat.map((row) => [...row.padEnd(Math.max(...pat.map((x) => x.length)), ".")].map((k) => `<i class="${k === "." ? "" : "k"}">${k === "." ? "" : k}</i>`).join("")).join("")}</span><span><b>${esc(r.name)}</b><small>${r.shop ? "대장간·아틀리에 · " : "휴대 · "}${r.size === 5 ? "5×5 · " : ""}${E.needOf(r).map((x) => x.name + "×" + x.n).join(", ")}${r.about ? " — " + esc(r.about) : ""}</small></span>${ok ? "<em>채우기</em>" : ""}</button>`; }).join("");
    n.innerHTML = `<div class="bg-book"><header><b>${ICO.book} 레시피</b><button data-a=popx>닫기</button></header><p class=bg-hint>모양대로 놓으면 돼요. 자리를 옮기거나 좌우로 뒤집어도 맞아요. 밝은 줄은 지금 가방으로 만들 수 있어요(누르면 채워 줘요).</p><div class=bg-legend>${Object.entries(E.KEYS).map(([k, v]) => `<span><i>${k}</i>${esc(v.n)}</span>`).join("")}</div>${rows}</div>`; n.hidden = false;
  }
  function dex() {
    const own = new Set(L.bag.map((b) => b.mid || b.name)), cell = (m) => `<div class="bg-dx ${own.has(m.id) || own.has(m.name) ? "own" : ""}" style="--g:${GC[m.grade] || "#555"}" title="${esc(m.name)}">${E.iconSvg(m, 30)}<small>${esc(m.name.replace(/^.+의 /, ""))}</small></div>`;
    const base = Object.entries(E.CATS).filter(([k]) => k !== "part" && k !== "gear" && k !== "made").map(([k, t]) => { const l = E.BASE.filter((m) => m.cat === k); return l.length ? `<h4>${t} · ${l.length}</h4><div class=bg-dg>${l.map(cell).join("")}</div>` : ""; }).join("");
    const mons = E.MONSTERS.map((mon) => `<h4>${esc(mon)}</h4><div class=bg-dg>${E.monsterMats(mon).map(cell).join("")}</div>`).join("");
    const n = el.querySelector(".bg-pop"), total = E.BASE.length + E.MONSTERS.reduce((s, m) => s + E.monsterMats(m).length, 0);
    n.innerHTML = `<div class=bg-dex><header><b>소재 도감 · ${total}종</b><button data-a=popx>닫기</button></header><p class=bg-hint>밝은 것은 지금 가방에 있어요. 몬스터 소재는 그 몬스터의 부위를 부수거나 쓰러뜨리면 얻어요.</p>${base}${mons}</div>`; n.hidden = false;
  }
  function gearAct(a) {
    const d = D(); if (!d) return; const i = V.slot;
    if (a === "main") { E.setMain(L, d.id, i); V.slot = 0; save(); }
    else if (a === "sub") { E.setSub(L, d.id, i); toast(d.sub ? "보조무기: 주무기가 닿지 않으면 이걸로 반격해요" : "보조무기를 뺐어요"); save(); }
    else if (a === "repair") { if (E.repair(L, d.id, i)) { toast("손질했어요"); save(); } }
    else if (a === "stash") { if (E.stash(L, d.id, i)) { V.slot = null; save(); } }
    else if (a === "temper" || a === "imbue" || a === "give") { V.pending = V.pending === a ? null : a; if (a !== "give") { V.open = true; V.filter = "all"; } }
    else if (a === "uncharm") { E.unequipCharm(L, d.id); save(); }
    else if (a === "unarmor") { E.unequipArmor(L, d.id, V.aslot); V.aslot = null; save(); }
    else if (a === "stats") { V.edit = !V.edit; }
    else if (a === "statdone") { V.edit = false; if (V.statDirty) { L.notes.push(`${d.name}: 능력치 조정 — ${E.STATS.map((k) => E.SL[k] + " " + d.stats[k]).join(", ")}`); V.statDirty = false; save(); } }
    else if (a === "auto") { const n = E.autoEquip(L, d.id); toast(n ? `${n}곳 바꿨어요` : "지금이 가장 좋아요"); if (n) save(); }
    else if (a === "mkskill") { const q = (k) => el.querySelector(`[data-k=${k}]`)?.value || ""; if (!q("skname").trim()) return toast("기술 이름을 적어 주세요"); const sk = E.createSkill(L, { name: q("skname"), desc: q("skdesc"), grade: +q("skgrade"), type: q("sktype") }, d.level || 10); if (sk) { E.learnSkill(L, d.id, sk.id); toast(`「${sk.name}」 만들었어요${d.skills.includes(sk.id) ? "" : " (칸이 가득해 목록에만)"}`); save(); } }
    else if (a === "saveset") { const nm = prompt("세트 이름", "세트 " + ((d.skillSets || []).length + 1)); if (nm != null) { E.saveSkillSet(L, d.id, nm); save(); } }
    draw();
  }

  // 끌어다 놓기(소재 → 칸): 누른 채 움직이면 그림자가 따라오고, 칸 위에서 떼면 놓인다
  let drag = null;
  const ghost = (it, x, y) => { let g = el.querySelector(".bg-ghost"); if (!g) { g = document.createElement("div"); g.className = "bg-ghost"; el.append(g); } g.innerHTML = icon(it, 40); g.style.transform = `translate(${x - 22}px,${y - 22}px)`; };
  const cellAt = (x, y) => { const r = (root.elementFromPoint ? root : document).elementFromPoint(x, y); return r?.closest?.("[data-cell]"); };
  // 서랍: 손잡이를 끌어 올리고 내리기
  let dd = null;
  el.addEventListener("pointerdown", (e) => {
    const h = e.target.closest(".bg-handle"); if (h) { dd = { y: e.clientY, open: V.open, moved: false }; return; }
    const b = e.target.closest("[data-it]"); if (b && V.page === 0) drag = { id: b.dataset.it, x: e.clientX, y: e.clientY, on: false };
  });
  el.addEventListener("pointermove", (e) => {
    if (dd) { const dy = e.clientY - dd.y; if (Math.abs(dy) > 12) { dd.moved = true; const want = dy < 0; if (want !== V.open) { V.open = want; drawer(); } } return; }
    if (!drag) return; if (!drag.on && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10) { drag.on = true; V.open = false; el.querySelector(".bg-drawer").classList.remove("open"); }
    if (drag.on) { e.preventDefault(); ghost(item(drag.id), e.clientX, e.clientY); el.querySelectorAll(".bg-cell.over").forEach((c) => c.classList.remove("over")); cellAt(e.clientX, e.clientY)?.classList.add("over"); }
  });
  const up = (e) => {
    if (dd) { const was = dd; dd = null; if (was.moved) { drag = { skipClick: true }; setTimeout(() => { if (drag?.skipClick) drag = null; }, 0); } return; }
    if (!drag) return; const d0 = drag; drag = null; el.querySelector(".bg-ghost")?.remove();
    if (d0.on) { const c = cellAt(e.clientX, e.clientY); if (c) { place(+c.dataset.cell, d0.id); craft(); drawer(); } el.querySelectorAll(".bg-cell.over").forEach((c) => c.classList.remove("over")); d0.dropped = true; drag = { skipClick: true }; setTimeout(() => { if (drag?.skipClick) drag = null; }, 0); }
  };
  // 능력치 막대: 끌면 바로 바뀐다(저장은 잠시 뒤 한 번)
  el.addEventListener("input", (e) => { const r = e.target.closest?.("[data-stat]"); if (!r) return; const d = D(); if (!d) return; const k = r.dataset.stat, v = +r.value; d.stats[k] = v; if (k === "hp") d.hpMax = v; r.style.setProperty("--p", (v / +r.max * 100) + "%"); const o = el.querySelector(`[data-sv="${k}"]`); if (o) o.textContent = v; V.statDirty = true; clearTimeout(V.statT); V.statT = setTimeout(() => ledger.put(L), 400); });
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", () => { drag = null; dd = null; el.querySelector(".bg-ghost")?.remove(); });

  el.addEventListener("click", async (e) => {
    if (drag?.skipClick) return; const b = e.target.closest("button"); if (!b) { if (e.target.classList.contains("bg-pop")) e.target.hidden = true; return; }
    const a = b.dataset.a;
    if (a === "close") return host.close?.();
    if (b.dataset.tab != null) { const pages = el.querySelector(".bg-pages"); pages.scrollTo({ left: +b.dataset.tab * pages.clientWidth, behavior: "smooth" }); return; }
    if (b.dataset.size) { const n = +b.dataset.size; if (n !== V.size) { V.size = n; V.grid = Array(n * n).fill(null); } return draw(); }
    if (b.dataset.cell != null) { const i = +b.dataset.cell; if (V.brush) place(i, V.grid[i] === V.brush ? null : V.brush); else V.grid[i] = null; craft(); drawer(); return; }
    if (b.dataset.it) return pickItem(b.dataset.it);
    if (b.dataset.f) { V.filter = b.dataset.f; return drawer(); }
    if (b.dataset.who) { if (V.pending === "give" && V.slot != null && b.dataset.who !== V.who) { if (E.giveTo(L, V.who, V.slot, b.dataset.who)) { toast("넘겼어요"); save(); } else toast("받는 쪽 칸이 가득 찼어요"); V.pending = null; V.slot = null; return draw(); } V.who = b.dataset.who; V.slot = null; V.pending = null; return draw(); }
    if (b.dataset.slot != null) { V.slot = V.slot === +b.dataset.slot ? null : +b.dataset.slot; V.aslot = null; V.pending = null; return draw(); }
    if (b.dataset.aslot) { V.aslot = V.aslot === b.dataset.aslot ? null : b.dataset.aslot; V.slot = null; V.pending = null; if (!D().armor?.[V.aslot]) { V.open = true; V.filter = "gear"; toast(E.SLOTS[V.aslot] + " 방어구를 아래 가방에서 고르세요"); } return draw(); }
    if (b.dataset.sk) { const d = D(); if (confirm(`「${L.party.skills[b.dataset.sk]?.name || b.dataset.sk}」을(를) 잊을까요? (만든 기술은 목록에 남아요)`)) { E.forgetSkill(L, d.id, b.dataset.sk); save(); draw(); } return; }
    if (b.dataset.learn) { if (!E.learnSkill(L, V.who, b.dataset.learn)) toast("기술 칸(6)이 가득해요"); else save(); return draw(); }
    if (b.dataset.sset != null) { E.loadSkillSet(L, V.who, +b.dataset.sset); save(); toast("기술 세트를 바꿨어요"); return draw(); }
    if (b.dataset.g) return gearAct(b.dataset.g);
    if (b.dataset.qt) { if (!E.takeQuest(L, b.dataset.qt)) toast("수락한 의뢰는 3개까지예요"); else { toast("수락했어요 — 다음 답부터 이야기에 실려요"); save(); } return draw(); }
    if (b.dataset.qx) { if (confirm("이 의뢰를 포기할까요? 평판이 조금 깎여요.")) { E.dropQuest(L, b.dataset.qx); save(); draw(); } return; }
    if (b.dataset.qd) { if (E.deliver(L, b.dataset.qd)) { toast("의뢰 완료!"); save(); } else toast("가방에 대상 소재가 모자라요"); return draw(); }
    if (b.dataset.shop) { V.shop = b.dataset.shop; return shop(); }
    if (b.dataset.buy != null) { const x = V.stock[+b.dataset.buy]; if (!x || !E.pay(L, x.price)) return toast("돈이 모자라요"); if (x.mid) E.addMat(L, x.mid); else if (x.w) E.addItem(L, { kind: "장비", name: x.w.name || E.KINDS[x.w.kind]?.n, w: { ...x.w, name: x.w.name || E.KINDS[x.w.kind]?.n }, n: 1 }); else E.addItem(L, { kind: "장비", name: x.potion, w: { name: x.potion, type: "item", mt: x.potion === "해독제" ? 5 : 10, hit: 0, crit: 0, rmin: 0, rmax: 0, max: 3, uses: 3 }, n: 1, shape: "potion", pal: x.potion === "해독제" ? "emerald" : "ruby" }); L.notes.push(`${V.shop}에서 ${x.mid ? E.BY_ID[x.mid].name : x.w?.name || x.potion} 구입 — ${E.fmtMoney(L, x.price)}`); toast("샀어요"); save(); return draw(); }
    if (b.dataset.rc) { const r = E.RECIPES.find((x) => x.id === b.dataset.rc), n = Math.max(V.size, r.size); if (r.shop && !shopHere && !V.unlock) return toast("대장간·아틀리에에서만 만들 수 있어요"); const g = E.autoFill(r, L.bag, n); if (!g) return toast("재료가 모자라요"); V.size = n; V.grid = g; el.querySelector(".bg-pop").hidden = true; return draw(); }
    if (a === "drawer") { V.open = !V.open; return drawer(); } if (a === "clear") { V.grid = V.grid.map(() => null); V.brush = null; return draw(); }
    if (a === "newq") { if (!host.ask) return; toast("의뢰를 받는 중…"); try { const t = await host.ask(E.QUEST_PROMPT(L, 3), "위 세계와 지금 장면에 맞는 의뢰를 정해진 줄 형식으로만.", { stage: "의뢰" }); const qs = E.parseQuests(L, t); E.addQuests(L, qs); L.questAt = Date.now(); toast(qs.length ? `의뢰 ${qs.length}건이 올라왔어요` : "의뢰를 못 읽었어요"); save(); draw(); } catch (e) { toast("의뢰를 못 받았어요: " + (e?.message ?? e)); } return; }
    if (a === "reworld") return readWorld(true);
    if (a === "book") return book(); if (a === "dex") return dex(); if (a === "popx") { el.querySelector(".bg-pop").hidden = true; return; }
    if (a === "drop") { const id = el.querySelector(".bg-pop").dataset.id; E.discard(L, id, 1); el.querySelector(".bg-pop").hidden = true; save(); return draw(); }
    if (a === "make") {
      const p = E.craftGrid(L, V.grid, V.size, { workshop: shopHere || V.unlock, level: Math.max(1, ...Object.values(L.party.defs).map((d) => d.level || 1)), addItem: E.addItem, note: (L0, t) => { L0.notes.push(t); L0.log.push({ at: Date.now(), text: t }); } });
      if (!p) return toast("만들 수 없어요"); const left = new Map(); V.grid = V.grid.map((g) => { if (!g || !item(g)) return null; const k = left.has(g) ? left.get(g) : item(g).n || 1; if (k <= 0) return null; left.set(g, k - 1); return g; });
      const o = el.querySelector(".bg-out"); o?.classList.add("pop"); save(); toast(`${p.name} 완성!`); setTimeout(draw, 380); return;
    }
  });
  frame(); V.unlock = !!host.unlock5; draw(); if (V.page) { const pg0 = el.querySelector(".bg-pages"); requestAnimationFrame(() => { pg0.scrollLeft = pg0.clientWidth; }); }
  return { refresh: async (start) => { L = await ledger.get(); draw(); if (start) { const pg0 = el.querySelector(".bg-pages"); pg0.scrollTo({ left: (start === "gear" ? 1 : 0) * pg0.clientWidth }); } } };
}
