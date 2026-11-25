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
    '전장: ' + B.name + ' / 목표: ' + objText(B) + ' / ' + B.turn + '턴 / ' + (B.status === 'active' ? '진행 중' : B.status === 'victory' ? '아군 승리' : '아군 패배')];
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
