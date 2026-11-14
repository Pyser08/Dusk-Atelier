// 2.2.0 글래스 화면(HandOff/UI-GLASS.md). .rb-win.rb-skin-glass 안에서만 적용 — 보통 대비일 때 app.js가 붙인다(밝은 모드는 .rb-glass-light).
// 테마 6종의 빛 번짐·숫자 끝 색·발광은 app.js가 --rb-gb1~4·--rb-gtint·--rb-gglow로 준다(glassthemes.js). 없으면 강조색에서 만든다('내 강조색').
// 토큰 이름: 기존 --rb-glass(블러 값)와 겹치지 않게 카드 바탕은 --rb-glass-bg.
// 빛 번짐은 사용자가 고른 강조색(--rb-acc-a/b)에서 만들어 기존 테마 색을 따른다.
// .rb-lite(가벼운 화면) = 블러·발광 끔, 카드 바탕 불투명.
export var GLASS_CSS = `
.rb-win.rb-skin-glass{
  --rb-gbg:var(--rb-win);   /* 고른 테마의 바탕색 위에 빛 번짐 */
  --rb-blob1:var(--rb-gb1,color-mix(in srgb,var(--rb-acc-a) 55%,transparent));
  --rb-blob2:var(--rb-gb2,color-mix(in srgb,var(--rb-acc-b) 50%,rgba(100,120,255,.35)));
  --rb-blob3:var(--rb-gb3,rgba(255,180,100,.32));
  --rb-blob4:var(--rb-gb4,rgba(150,90,255,.4));
  --rb-glow:var(--rb-gglow,color-mix(in srgb,var(--rb-acc-a) 55%,transparent));
  --rb-tint:var(--rb-gtint,color-mix(in srgb,var(--rb-acc-a) 30%,#fff));
  --rb-ghost-line:rgba(255,255,255,.3);
  /* 카드 = 바탕색(흰빛 12%)을 62%로 덮음(2.2.0 가독성: 50→62) — 진한 빛 번짐 위에서도 글자 대비 4.5:1 이상(tests/glassthemes.test.js) */
  --rb-glass-bg:color-mix(in srgb,color-mix(in srgb,var(--rb-gbg) 88%,white) 62%,transparent);
  --rb-glass-2:rgba(255,255,255,.1);
  --rb-glass-line:rgba(255,255,255,.22);
  --rb-glass-hi:inset 0 1px 0 rgba(255,255,255,.25);
  --rb-glass-shadow:0 8px 30px rgba(0,0,0,.25);
  --rb-glass-blur:blur(22px) saturate(140%);
  --rb-text:#f2f0fa;--rb-sub:rgba(255,255,255,.88);--rb-mute:rgba(255,255,255,.66);
  --rb-surf:var(--rb-glass-bg);--rb-surf2:var(--rb-glass-2);--rb-hover:rgba(255,255,255,.12);
  --rb-line:rgba(255,255,255,.14);--rb-line2:rgba(255,255,255,.16);--rb-line3:rgba(255,255,255,.26);
  background:
    radial-gradient(40% 50% at 12% 18%,var(--rb-blob1),transparent 70%),
    radial-gradient(45% 55% at 88% 78%,var(--rb-blob2),transparent 70%),
    radial-gradient(35% 40% at 70% 8%,var(--rb-blob3),transparent 70%),
    radial-gradient(40% 45% at 30% 95%,var(--rb-blob4),transparent 70%),var(--rb-gbg);
  border-color:var(--rb-glass-line)}
.rb-skin-glass .rb-head,.rb-skin-glass .rb-topnav,.rb-skin-glass .rb-pagehead{background:transparent;border-color:transparent}
.rb-skin-glass .rb-navwrap{--nav-pl:16px;--nav-pb:16px;padding:0 0 16px 16px}
.rb-skin-glass .rb-nav{background:var(--rb-glass-bg);border:1px solid var(--rb-glass-line);border-radius:var(--rb-r3);box-shadow:var(--rb-glass-shadow),var(--rb-glass-hi);
  backdrop-filter:var(--rb-glass-blur);-webkit-backdrop-filter:var(--rb-glass-blur)}
.rb-skin-glass .rb-nav a[aria-current=page],.rb-skin-glass .rb-nav a.on{background:var(--rb-glass-2);color:var(--rb-text)}
.rb-skin-glass .rb-tabbar{background:color-mix(in srgb,var(--rb-gbg) 70%,transparent);border-top:1px solid var(--rb-glass-line);backdrop-filter:var(--rb-glass-blur);-webkit-backdrop-filter:var(--rb-glass-blur)}
.rb-skin-glass .rb-card{background:var(--rb-glass-bg);box-shadow:var(--rb-glass-shadow),var(--rb-glass-hi)}/* 스크롤 안 카드는 블러 없음(스크롤 깜빡임) */
.rb-skin-glass .rb-card.bordered{border-color:var(--rb-glass-line)}
.rb-skin-glass .rb-card .rb-card{backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:none;background:var(--rb-glass-2)}
.rb-skin-glass [role=switch][aria-checked=true]{box-shadow:0 0 12px var(--rb-glow)}
.rb-skin-glass .rb-search{background:var(--rb-glass-bg);border-color:var(--rb-glass-line)}
/* 공통 유리 카드 클래스(다른 탭 세션에서도 씀) */
.rb-gcard{background:var(--rb-glass-bg,var(--rb-surf));border:1px solid var(--rb-glass-line,var(--rb-line2));border-radius:var(--rb-r3);padding:18px 20px;
  box-shadow:var(--rb-glass-shadow,var(--rb-shadow-card)),var(--rb-glass-hi,0 0 0 transparent)}
.rb-gcell{background:var(--rb-glass-2,var(--rb-surf2));border-radius:var(--rb-r2)}
@media(max-width:760px){.rb-gcard{padding:16px}}
/* 가벼운 화면 */
.rb-skin-glass.rb-lite{--rb-glass-blur:none;--rb-glass-bg:color-mix(in srgb,var(--rb-gbg) 82%,white 8%);--rb-glass-2:color-mix(in srgb,var(--rb-gbg) 70%,white 14%);--rb-glow:transparent}
@media (prefers-reduced-transparency: reduce){.rb-win.rb-skin-glass{--rb-glass-blur:none;--rb-glass-bg:color-mix(in srgb,var(--rb-gbg) 82%,white 8%);--rb-glass-2:color-mix(in srgb,var(--rb-gbg) 70%,white 14%);--rb-glow:transparent}}

/* 밝은 모드 글래스: 옅은 바탕 + 하얀 반투명 카드 + 어두운 글자 */
.rb-win.rb-skin-glass.rb-glass-light{
  --rb-glass-bg:rgba(255,255,255,.72);
  --rb-glass-2:rgba(40,28,70,.055);
  --rb-glass-line:rgba(255,255,255,.85);
  --rb-glass-hi:inset 0 1px 0 rgba(255,255,255,.9);
  --rb-glass-shadow:0 8px 28px rgba(60,40,100,.12);
  --rb-text:#1f1a33;--rb-sub:rgba(31,26,51,.8);--rb-mute:rgba(31,26,51,.64);
  --rb-hover:rgba(31,26,51,.06);
  --rb-line:rgba(31,26,51,.10);--rb-line2:rgba(31,26,51,.10);--rb-line3:rgba(31,26,51,.18);
  --rb-ghost-line:rgba(31,26,51,.25);
  border-color:rgba(31,26,51,.12)}
.rb-glass-light .rb-card.bordered,.rb-glass-light .rb-hw,.rb-glass-light .rb-nav{border-color:var(--rb-glass-line)}
.rb-win.rb-glass-light .rb-hfocus .rb-hhead h1,.rb-win.rb-glass-light .rb-hw .rb-hnum b{background:linear-gradient(90deg,var(--rb-text),var(--rb-acc-text));-webkit-background-clip:text;background-clip:text;color:transparent}
.rb-glass-light .rb-hw-rm{background:rgba(31,26,51,.55)}
.rb-skin-glass.rb-glass-light.rb-lite{--rb-glass-bg:color-mix(in srgb,var(--rb-gbg) 70%,white 30%);--rb-glass-2:color-mix(in srgb,var(--rb-gbg) 90%,black 4%)}
@media (prefers-reduced-transparency: reduce){.rb-win.rb-skin-glass.rb-glass-light{--rb-glass-bg:color-mix(in srgb,var(--rb-gbg) 70%,white 30%)}}

/* 팝업·대화상자·메뉴·시트·둘러보기 카드·가져오기 창도 유리(블러 조금 더 · 바탕은 더 진하게 — 글자 읽기 우선) */
.rb-win.rb-skin-glass{--rb-pop-bg:color-mix(in srgb,color-mix(in srgb,var(--rb-gbg) 88%,white) 66%,transparent);--rb-pop-back:color-mix(in srgb,var(--rb-gbg) 36%,transparent)}
.rb-win.rb-skin-glass.rb-glass-light{--rb-pop-bg:rgba(255,255,255,.68);--rb-pop-back:rgba(40,30,70,.18)}
.rb-skin-glass :is(.rb-dialog,.rb-wn,.rb-menu,.rb-bsheet,.rb-tour-card,.rb-nav-menu),.rb-skin-glass #rbu-overlay .win{background:var(--rb-pop-bg);border:1px solid var(--rb-glass-line);
  box-shadow:0 20px 50px rgba(0,0,0,.35),var(--rb-glass-hi);backdrop-filter:blur(28px) saturate(140%);-webkit-backdrop-filter:blur(28px) saturate(140%)}
.rb-skin-glass.rb-glass-light :is(.rb-dialog,.rb-wn,.rb-menu,.rb-bsheet,.rb-tour-card,.rb-nav-menu),.rb-skin-glass.rb-glass-light #rbu-overlay .win{box-shadow:0 20px 50px rgba(60,40,100,.18),var(--rb-glass-hi)}
.rb-skin-glass :is(.rb-modal,.rb-bsheet-back),.rb-skin-glass #rbu-overlay{background:var(--rb-pop-back);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.rb-skin-glass.rb-lite{--rb-pop-bg:color-mix(in srgb,var(--rb-gbg) 92%,white 8%)}
.rb-skin-glass.rb-glass-light.rb-lite{--rb-pop-bg:#fff}
.rb-skin-glass.rb-lite :is(.rb-dialog,.rb-wn,.rb-menu,.rb-bsheet,.rb-tour-card,.rb-nav-menu,.rb-modal,.rb-bsheet-back),.rb-skin-glass.rb-lite #rbu-overlay,.rb-skin-glass.rb-lite #rbu-overlay .win{backdrop-filter:none;-webkit-backdrop-filter:none}
`;
