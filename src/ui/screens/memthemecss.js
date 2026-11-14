// 2.2.0 라이트바 컨셉(UI-GLASS 맨 위) — 인물 관계도(.rb-rm, 파랑) · 코코아(.rb-skills, 민트) · 기억 카드(.rb-cards2, 주황).
// 모양만 덮어쓴다(배치·기능 그대로). 카드 왼쪽 빛 막대, 제목 앞 작은 색 막대, 고른 칸은 네온, 가벼운 화면에선 빛만 끔.
export var MEMTHEME_CSS = `
.rb-rm{--k:#6f9dff}.rb-skills{--k:#3fcfa6}.rb-cards2{--k:#ff8a5c}
/* 관계도 */
.rb-rm .rb-rm-stage,.rb-rm .rb-rm-panel{position:relative;border-radius:16px}
.rb-rm .rb-rm-panel{padding-left:22px}
.rb-rm .rb-rm-panel::before,.rb-rm .rb-rm-stage::before{content:"";position:absolute;left:0;top:14px;width:4px;height:36px;border-radius:0 4px 4px 0;background:var(--k);box-shadow:0 0 10px var(--k);pointer-events:none;z-index:2}
.rb-rm .rb-rm-panel h3{display:flex;align-items:center;gap:8px;color:var(--rb-sub);letter-spacing:.02em}
.rb-rm .rb-rm-panel h3::before{content:"";width:3px;height:13px;border-radius:3px;background:var(--k);box-shadow:0 0 6px color-mix(in srgb,var(--k) 60%,transparent);flex:none}
.rb-rm .rb-rm-ctrls .rb-chip{border-radius:999px;border:1px solid var(--rb-line2);background:color-mix(in srgb,var(--rb-win) 70%,transparent);backdrop-filter:blur(8px)}
.rb-rm .rb-rm-ctrls .rb-chip:is([aria-pressed=true],.on){color:var(--rb-text);background:color-mix(in srgb,var(--k) 18%,transparent);border-color:color-mix(in srgb,var(--k) 60%,transparent);box-shadow:0 0 10px color-mix(in srgb,var(--k) 30%,transparent)}
.rb-rm .rb-rm-legend span{border:1px solid var(--rb-line2);background:color-mix(in srgb,var(--rb-win) 70%,transparent);backdrop-filter:blur(8px)}
.rb-rm .rb-rm-help{border:1px solid color-mix(in srgb,var(--k) 55%,transparent);box-shadow:0 0 8px color-mix(in srgb,var(--k) 30%,transparent)}
.rb-rm .rb-rm-filters input[type=search]{border-radius:999px;padding-left:14px}
.rb-rm .rb-rm-panel .rb-chip{border-radius:999px}
/* 코코아·기억 카드: 겉 카드 라이트바 */
.rb-skills .rb-mem2-grid{grid-template-columns:minmax(0,1fr)!important;max-width:none}
.rb-skills .rb-mem2-main>div>.rb-card,.rb-skills .rb-mem2-main>.rb-card,.rb-cards2 .rb-cards3-pick,.rb-cards2 .rb-mem-root .rb-card.bordered{position:relative;padding-left:22px;border-radius:16px}
.rb-skills .rb-mem2-main>div>.rb-card::before,.rb-skills .rb-mem2-main>.rb-card::before,.rb-cards2 .rb-cards3-pick::before,.rb-cards2 .rb-mem-root .rb-card.bordered::before{content:"";position:absolute;left:0;top:14px;width:4px;height:32px;border-radius:0 4px 4px 0;background:var(--k);box-shadow:0 0 10px var(--k);pointer-events:none}
.rb-skills .rb-card h3,.rb-skills .rb-card>b,.rb-cards2 .rb-card h3{display:flex;align-items:center;gap:8px}
.rb-skills .rb-card .rb-card,.rb-cards2 .rb-card .rb-card{box-shadow:none}
.rb-skills .rb-card .rb-card::before,.rb-cards2 .rb-card .rb-card::before{display:none}
.rb-cards2 .rb-cards3-av{border-radius:12px!important;background:linear-gradient(135deg,color-mix(in srgb,var(--k) 60%,transparent),color-mix(in srgb,var(--k) 30%,transparent))!important;border:1px solid color-mix(in srgb,var(--k) 60%,transparent);color:color-mix(in srgb,var(--k) 25%,#fff)!important;box-shadow:0 0 8px color-mix(in srgb,var(--k) 35%,transparent)}
/* 칸 고르기(만든 카드/새로 만들기 등): 장기 기억 칸 단추와 같은 네온 */
:is(.rb-cards2,.rb-skills,.rb-rm) .rb-seg{border-radius:999px;padding:4px;gap:2px;border:1px solid var(--rb-line2);background:var(--rb-card,transparent)}
:is(.rb-cards2,.rb-skills,.rb-rm) .rb-seg button{border-radius:999px;border:0;background:none;color:var(--rb-sub)}
:is(.rb-cards2,.rb-skills,.rb-rm) .rb-seg button[aria-checked=true]{color:var(--rb-text);font-weight:700;background:color-mix(in srgb,var(--k) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--k) 60%,transparent),0 0 10px color-mix(in srgb,var(--k) 28%,transparent)}
:is(.rb-cards2,.rb-skills) .rb-btn.primary{color:var(--rb-text);background:color-mix(in srgb,var(--rb-acc) 14%,transparent);border:1px solid color-mix(in srgb,var(--rb-acc) 60%,transparent);box-shadow:0 0 10px color-mix(in srgb,var(--rb-acc) 30%,transparent)}
.rb-lite :is(.rb-rm,.rb-skills,.rb-cards2) *::before,.rb-lite :is(.rb-rm,.rb-skills,.rb-cards2) .rb-seg button,.rb-lite .rb-cards2 .rb-cards3-av{box-shadow:none!important}
`;
