// Dusk Saga 엔진 — 서술용 기록 요약 (순수 함수, DOM·api 없음)
import { TN, fresh, objText } from "./rules.js";

// the record as the story model gets it: one line per phase, moves and turn-start healing folded together,
// idle waits and the running HP left out (the unit list above already carries the final HP)
export function digest(list) {
  const out = []; let cur = null;
  const open = head => { cur = { head, acts: [], mv: [], regen: [], ow: [] }; out.push(cur); };
  for (const e of list) {
    if (e.k === 'ph') { open(e.text); continue; }
    if (!cur) open('');
    if (e.k === 'wait') continue;
    const m = e.k === 'mv' && /^(.*): (\d+)칸 이동(?:, (.*))?$/.exec(e.text), r = e.k === 'regen' && /^(.*): 턴 시작 (\d+) 회복/.exec(e.text);
    const o = e.k === 'ow' && /^(.*?): (?:(\d+)칸 이동, (?:.+, )?)?경계$/.exec(e.text);
    if (o) cur.ow.push(o[1] + (o[2] ? '(' + o[2] + '칸 이동)' : ''));
    else if (m) cur.mv.push(m[1] + ' ' + m[2] + '칸' + (m[3] ? '(' + m[3] + ')' : ''));
    else if (r) cur.regen.push(r[1] + ' ' + r[2]);
    else cur.acts.push(e.text);
  }
  return out.map(g => { const parts = g.acts.slice(); if (g.ow.length) parts.push('경계 태세: ' + g.ow.join(', ')); if (g.mv.length) parts.push('이동만: ' + g.mv.join(', ')); if (g.regen.length) parts.push('턴 시작 회복: ' + g.regen.join(', ')); return parts.length ? (g.head ? g.head + ' — ' : '') + parts.join('; ') : ''; }).filter(Boolean);
}
// ── text handed to the story model ──
export function context(S) {
  const B = S.battle; if (!B) return '';
  if (B.status !== 'active' && S.seq <= S.sent) return '';
  const lines = ['[Dusk Saga — 게임 엔진이 확정한 전투 결과]',
    '전장: ' + B.name + ' / 목표: ' + objText(B) + ' / ' + B.turn + '턴 / ' + (B.status === 'active' ? '진행 중' : B.status === 'victory' ? '아군 승리' : B.status === 'retreat' ? '아군 도주(전장을 벗어남)' : '아군 패배')];
  if (B.later) lines.push('이 전투는 직전 장면에서 시간이 흐른 뒤에 벌어졌다.' + (B.premise ? ' 배경: ' + B.premise : ''));
  for (const u of Object.values(B.units)) { const d = S.defs[u.ref]; lines.push('- ' + TN[u.team] + ' ' + d.name + ' (Lv ' + d.level + ' ' + d.cls + ') ' + (u.hp > 0 ? 'HP ' + u.hp + '/' + d.stats.hp : '전투불능') + (u.rearOf && B.units[u.rearOf] ? ' — ' + S.defs[B.units[u.rearOf].ref].name + '의 후위(호위진)' : '')); }
  const all = digest(S.log.filter(e => e.n > S.sent)), fresh = all.slice(-30); if (all.length > 30) fresh.unshift('(이보다 앞선 ' + (all.length - 30) + '개 턴의 기록은 길어서 생략)');
  if (fresh.length) { lines.push('아직 서술되지 않은 전투 기록:'); for (const t of fresh) lines.push('· ' + t); }
  return lines.join('\n');
}
// what the story model is told: the record, then how to turn it into prose
export function storyNote(S) {
  const base = context(S); if (!base) return '';
  const active = S.battle.status === 'active';
  return base + '\n' + [
    '[서술 지침]',
    ...(S.battle.later ? ['- 이 전투는 직전 장면에 바로 이어지지 않는다. 위 배경에 맞춰 그 사이에 흐른 시간과 일을 짧게 잇고 나서 전투로 들어간다.'] : []),
    '- 턴별 나열이 아니라 하나로 이어지는 전투 장면으로 쓴다. 승부를 가른 몇 순간만 생생하게 그리고 나머지는 짧게 잇는다.',
    '- 타격의 무게는 깎인 HP에 맞춘다. 필살, 무기 상성, 협공, 호위진 방어는 그에 맞는 모습으로, 공격은 인물의 몸과 무기로 보여 준다.',
    '- 수치(HP·피해·명중·레벨·경험치)와 게임 용어(턴·페이즈·게이지)는 본문에 옮기지 않고 상처, 숨, 자세 같은 묘사로 바꾼다.',
    '- 전투에 있던 인물을 모두 등장시키고, 지형이 싸움에 영향을 줬다면 보여 준다.',
    '- 기록에 없는 공격·명중·격파를 더하지 않고 결과를 바꾸지 않는다.',
    active ? '- 전투는 아직 끝나지 않았다. 긴장을 남겨 두고, 결말로 몰아가지 않는다.' : '- 전투가 끝난 바로 그 순간부터, 인물들의 반응과 그 뒤의 이야기로 이어 쓴다.',
  ].join('\n');
}

/** 채팅에 유저 입력으로 남길 결과(사람이 읽는 꼴): 결말·활약·쓰러뜨린 적·부순 부위·동료 상태·얻은 것·의뢰. 자세한 기록·서술 지침은 storyNote가 따로 싣는다 */
export function resultFacts(S) {
  const B = S.battle; if (!B || B.status === 'active') return null;
  const st = { victory: '승리', defeat: '패배', retreat: '후퇴' }[B.status] || B.status, us = Object.values(B.units), name = (u) => S.defs[u.ref].name;
  const foes = us.filter((u) => u.team !== 'ally' && u.team !== 'friend'), beaten = foes.filter((u) => u.hp <= 0).map(name), left = foes.filter((u) => u.hp > 0).map(name);
  const parts = []; for (const u of us) if (u.parts) for (const [k, p] of Object.entries(u.parts)) if (p.broken) parts.push(name(u) + '의 ' + ({ head: '머리', legs: '다리', tail: '꼬리', wings: '날개' }[k] || k));
  const T = Object.entries(B.tally || {}).sort((a, b) => b[1].kills * 30 + b[1].dmg - (a[1].kills * 30 + a[1].dmg)), mvp = T[0] && S.defs[T[0][0]] ? S.defs[T[0][0]].name : '';
  const allies = us.filter((u) => u.team === 'ally').map((u) => { const d = S.defs[u.ref], r = u.hp / d.stats.hp; return { n: d.name, s: u.hp <= 0 ? '쓰러짐' : r <= 1 / 3 ? '크게 다침' : r < 0.75 ? '가벼운 상처' : '멀쩡함', inj: d.injury ? (d.injury.k === 'wound' ? '중상' : '부상') : '' }; });
  const wx = [B.wx && B.wx !== 'clear' ? { rain: '비', snow: '눈', fog: '안개', storm: '폭풍', sand: '모래바람' }[B.wx] : '', B.time && B.time !== 'day' ? { dusk: '황혼', night: '밤' }[B.time] : ''].filter(Boolean).join(' · ');
  return { st, status: B.status, name: B.name, turn: B.turn, wx, mvp, top: B.top ? B.top.name + ' ' + B.top.dmg : '', beaten: summ(beaten), left: B.status === 'victory' ? '' : summ(left), parts: parts.join(', '),
    caught: (B.caught || []).map((c) => c.name + (c.tame ? '(길들임)' : '(포로)')).join(', '), turned: (B.turned || []).join(', '), raids: (B.raids || []).map((r) => r.turn + '턴 ' + (r.team === 'friend' ? '우군 ' : '제3세력 ') + r.names).join(', '),
    out: (B.out || []).map((o) => S.defs[o.ref].name + (o.carry ? ' (' + (B.obj.item || '보물') + ' 확보)' : '')).join(', '), duo: (B.duoUsed || []).length, allies, got: summ(B.got || []), quests: (B.questDone || []).join(', ') };
}
export function resultLine(S) {
  const f = resultFacts(S); if (!f) return '';
  const row = (k, v) => (v ? k + ': ' + v : '');
  return ['[전투 결과 — ' + f.name + ' · ' + f.st + ' · ' + f.turn + '턴' + (f.wx ? ' · ' + f.wx : '') + ']', row('활약', f.mvp ? f.mvp + (f.top ? ' (가장 큰 한 방: ' + f.top + ')' : '') : ''), row('쓰러뜨림', f.beaten), row('남은 적', f.left), row('부순 부위', f.parts), row('포획', f.caught), row('설득해 합류', f.turned), row('탈출', f.out), row('난입', f.raids), f.duo ? '합체기: ' + f.duo + '번' : '',
    row('동료', f.allies.map((a) => a.n + ' ' + a.s + (a.inj ? '·' + a.inj : '')).join(', ')), row('얻은 것', f.got), row('의뢰', f.quests)].filter(Boolean).join('\n');
}
/** 채팅에 넣을 결과 카드(HTML, 인라인 스타일, 안쪽은 span만 — 인카운터 카드와 같은 방식). 모델에게는 카드 대신 안에 숨긴 글(dsg-plain)만 간다 */
export function resultCard(S) {
  const f = resultFacts(S); if (!f) return ''; const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const C = { victory: ['#ffd35a', '#2a1c04', 'VICTORY', '승리', '#f2c230', '#5a3a00'], defeat: ['#ff5a5a', '#1c0508', 'DEFEAT', '패배', '#e0283a', '#111'], retreat: ['#9ab8d8', '#0e141e', 'RETREAT', '후퇴', '#7aa0c8', '#1a2230'] }[f.status] || ['#ccc', '#222', '', f.st, '#888', '#333'];
  const stripe = `display:block;height:8px;background:repeating-linear-gradient(-60deg,${C[5]} 0 12px,${C[4]} 12px 24px)`;
  const row = (k, v) => (v ? `<span style="display:flex;gap:8px;padding:3px 0;border-top:1px solid #ffffff14"><span style="flex:none;width:5.2em;opacity:.65">${k}</span><span style="flex:1;min-width:0">${esc(v)}</span></span>` : '');
  const ally = f.allies.map((a) => `<span style="display:inline-block;margin:2px 4px 2px 0;padding:1px 8px;border-radius:9px;background:${a.s === '쓰러짐' ? '#5a1a20' : a.s === '크게 다침' ? '#5a3a1a' : '#ffffff18'}">${esc(a.n)} · ${a.s}${a.inj ? '·' + a.inj : ''}</span>`).join('');
  return `<div class="dsg-res" style="--dsg:res;display:block;margin:6px 0;border-radius:10px;overflow:hidden;background:linear-gradient(135deg,${C[1]},#16121c);border-top:3px solid ${C[0]};border-bottom:3px solid ${C[0]};color:#efe6d4;font-size:.93em;line-height:1.5;box-shadow:0 6px 18px #0008">`
    + `<span style="${stripe}"></span><span style="display:block;padding:10px 14px 12px">`
    + `<span style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px"><span style="font:900 1.5em/1 serif;letter-spacing:.14em;color:${C[0]};text-shadow:0 0 12px ${C[0]}88">${C[2]}</span><b>${C[3]} · ${esc(f.name)}</b><span style="opacity:.6">${f.turn}턴${f.wx ? ' · ' + esc(f.wx) : ''}</span></span>`
    + row('활약', f.mvp ? f.mvp + (f.top ? ` (가장 큰 한 방 ${f.top})` : '') : '') + row('쓰러뜨림', f.beaten) + row('남은 적', f.left) + row('부순 부위', f.parts) + row('포획', f.caught) + row('합류', f.turned) + row('탈출', f.out) + row('난입', f.raids) + (f.duo ? row('합체기', f.duo + '번') : '')
    + (ally ? `<span style="display:block;padding:5px 0 2px;border-top:1px solid #ffffff14">${ally}</span>` : '') + row('얻은 것', f.got) + row('의뢰', f.quests)
    + `<span class="dsg-plain" style="display:none;--dsg:plain">${esc(resultLine(S)).replace(/\n/g, "&#10;")}</span></span><span style="${stripe}"></span></div>`;
}
/** 모델에게 보낼 때: 결과 카드 → 숨긴 글만 */
export const RES_RE = /<div [^>]*(?:dsg-res|--dsg:res)[^>]*>[\s\S]*?<\/div>/g;
export function plainResults(text) { return String(text).replace(RES_RE, (m) => (/(?:dsg-plain|--dsg:plain)[^>]*>([\s\S]*?)<\/span>/.exec(m)?.[1] || '').replace(/&#10;/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')); }
const summ = (l) => { const m = new Map(); for (const x of l) m.set(x, (m.get(x) || 0) + 1); return [...m].map(([k, n]) => k + (n > 1 ? ' ×' + n : '')).join(', '); };

/** 저장된 결과 글([전투 결과 — …] 블록) → 화면용 카드 HTML(표시할 때만 쓴다. 본문에는 글만 남는다) */
export const RESULT_BLOCK_RE = /\[전투 결과 — ([^\]\n]+)\](?:\n[^\n\[]{1,40}: [^\n]*)*/g;
export function cardFromPlain(block) {
  // 다른 기능이 먼저 붙인 안전한 태그(Dusk 인물 이름 링크 <span data-dusk=…>이름</span>)는 살리고, 나머지만 글자로 바꾼다
  const keep = []; block = String(block).replace(/<span data-dusk="[^"]*"[^>]*>[^<]{0,60}<\/span>/g, (m) => { keep.push(m); return '\u0001' + (keep.length - 1) + '\u0002'; });
  const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]).replace(/\u0001(\d+)\u0002/g, (m, i) => keep[+i] ?? '');
  const lines = String(block).split('\n'), head = /\[전투 결과 — ([^\]]+)\]/.exec(lines[0])?.[1] || '', hp = head.split(' · '), name = hp[0] || '', st = hp[1] || '', rest = hp.slice(2).join(' · ');
  const C = { 승리: ['#ffd35a', '#2a1c04', 'VICTORY', '#f2c230', '#5a3a00'], 패배: ['#ff5a5a', '#1c0508', 'DEFEAT', '#e0283a', '#111'], 후퇴: ['#9ab8d8', '#0e141e', 'RETREAT', '#7aa0c8', '#1a2230'] }[st] || ['#ccc', '#222', st, '#888', '#333'];
  const stripe = `display:block;height:8px;background:repeating-linear-gradient(-60deg,${C[4]} 0 12px,${C[3]} 12px 24px)`;
  const rows = lines.slice(1).map((l) => { const i = l.indexOf(': '); if (i < 0) return ''; const k = l.slice(0, i), v = l.slice(i + 2); if (k === '동료') return `<span style="display:block;padding:5px 0 2px;border-top:1px solid #ffffff14">${v.split(', ').map((a) => `<span style="display:inline-block;margin:2px 4px 2px 0;padding:1px 8px;border-radius:9px;background:${/쓰러짐/.test(a) ? '#5a1a20' : /크게 다침/.test(a) ? '#5a3a1a' : '#ffffff18'}">${esc(a)}</span>`).join('')}</span>`; return `<span style="display:flex;gap:8px;padding:3px 0;border-top:1px solid #ffffff14"><span style="flex:none;width:5.2em;opacity:.65">${esc(k)}</span><span style="flex:1;min-width:0">${esc(v)}</span></span>`; }).join('');
  return `<div style="display:block;margin:6px 0;border-radius:10px;overflow:hidden;background:linear-gradient(135deg,${C[1]},#16121c);border-top:3px solid ${C[0]};border-bottom:3px solid ${C[0]};color:#efe6d4;font-size:.93em;line-height:1.5;box-shadow:0 6px 18px #0008"><span style="${stripe}"></span><span style="display:block;padding:10px 14px 12px"><span style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px"><span style="font:900 1.5em/1 serif;letter-spacing:.14em;color:${C[0]};text-shadow:0 0 12px ${C[0]}88">${esc(C[2])}</span><b>${esc(st)} · ${esc(name)}</b><span style="opacity:.6">${esc(rest)}</span></span>${rows}</span><span style="${stripe}"></span></div>`;
}
