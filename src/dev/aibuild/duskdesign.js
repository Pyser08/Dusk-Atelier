// v1.6.7 4단계: 로어북 'Dusk 방식'.
// AI는 extentions·@@activate·{{#if}} 게이트를 직접 쓰지 않고, 이름으로 서로를 가리키는 "Dusk 설계 JSON"을 낸다.
// 이 파일은 (1) 설계 JSON → Dusk 항목(폴더·소속·장소·규칙) 변환 (2) 변환 전 검사 (3) AI에게 보낼 안내문·맥락을 맡는다.
// 순수 함수만 둔다(화면·api 없음). 변환 결과는 기존 로어북 수정안 형식 {upsert, remove}로 돌려주므로
// 이후 흐름(수정안 카드·적용·되돌리기)은 일반 방식과 같다.
import { newId } from '../../engine/util.js';
import {
  AFF_PREFIX, PLACE_PREFIX, COND_TYPES, VAR_OPS, SET_OPS,
  affName, affOf, bodyOf, checkExpr, defaultAff, defaultRule, folderIdOf, folderMap, isAff, isDuskFolder, isFolder,
  isManaged, isPlace, nativeContent, parentOf, placeLinks, ridOf, ruleOf, validateRules
} from '../../engine/lorerules.js';

const clean = (s) => String(s ?? '').trim();
const normName = (s) => clean(s).replace(/^\[(소속|장소)\]\s*/, '').replace(/\s+/g, '').toLowerCase();
const num = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));
const words = (v) => (Array.isArray(v) ? v.map(clean).filter(Boolean).join(',') : clean(v));
const REPEAT_IN = { none: 'none', once: 'chat', cooldown: 'cooldown' };
const REPEAT_OUT = { none: 'none', chat: 'once', cooldown: 'cooldown' };
const COND_KEYS = COND_TYPES.map(([k]) => k);
const SET_KEYS = SET_OPS.map(([k]) => k);
const WITHIN = ['any', 'user', 'char'];
const wrapProb = (body, pct, other = '') => `{{#if {{? {{random}} < ${String(Math.round(pct * 10) / 1000)}}}}}${body}${other ? `{{:else}}${other}` : ''}{{/if}}`;

export const hasDusk = (lore) => (lore ?? []).some((e) => e?.extentions?.da_rule || e?.extentions?.da_folder || e?.extentions?.da_place);
// 설정(auto|dusk|plain)·봇별 기억·로어북 내용으로 이번에 쓸 방식을 정한다
export function resolveLoreMode({ setting = 'auto', remembered, lore } = {}) {
  if (remembered === 'dusk' || remembered === 'plain') return remembered;
  if (setting === 'dusk' || setting === 'plain') return setting;
  return hasDusk(lore) ? 'dusk' : 'plain';
}

// ---------- 규칙 ⇄ 설계 ----------
// 규칙 → 설계 모양 (AI에게 기존 항목을 보여 줄 때)
export function ruleToDesign(rule, nameOfRid = () => null) {
  const r = rule;
  const out = { match: r.mode === 'any' ? 'any' : 'all', conditions: [], chance: Number(r.prob ?? 100) };
  for (const c of r.cond ?? []) {
    const o = { type: c.t };
    if (c.t === 'text' || c.t === 'notext' || c.t === 'count') {
      o.words = c.keys ?? '';
      if (c.regex) o.regex = true;
      if (c.all) o.all = true;
      if (c.in && c.in !== 'any') o.within = c.in;
      if (c.scan !== undefined && c.scan !== '') o.scan = Number(c.scan);
    }
    if (c.t === 'var') Object.assign(o, { name: c.name, op: c.op || '=', value: c.val });
    if (c.t === 'turn' || c.t === 'count' || c.t === 'times') {
      if (c.min !== undefined && c.min !== '') o.min = Number(c.min);
      if (c.max !== undefined && c.max !== '') o.max = Number(c.max);
    }
    if (c.t === 'times' || c.t === 'with' || c.t === 'without') o.target = c.rid ? nameOfRid(c.rid) : null;
    out.conditions.push(o);
  }
  if (r.once && r.once !== 'none') out.repeat = REPEAT_OUT[r.once] ?? 'none';
  if (r.once === 'cooldown') out.cooldown = Number(r.cool) || 1;
  if (Number(r.hold) > 0) out.hold = Number(r.hold);
  if (r.group) out.group = r.group;
  if (r.at && r.at !== 'top') out.position = r.at;
  if (r.at === 'depth') out.depth = Number(r.depth) || 0;
  if (r.role && r.role !== 'system') out.role = r.role;
  if (Number(r.scan) && Number(r.scan) !== 4) out.scan = Number(r.scan);
  if ((r.set ?? []).length) out.set = r.set.map((x) => ({ var: x.name, op: x.op || '=', value: x.val }));
  if ((r.chain ?? []).length) out.chain = r.chain.map((x) => ({ target: nameOfRid(x.rid), chance: Number(x.prob ?? 100) }));
  if (r.whole) out.wholeWord = true;
  if (r.common) { out.commonWord = true; if (r.commonWords) out.confirmWords = r.commonWords; }
  return out;
}

// 설계 → 규칙 조각 (준 항목만). ctx: { resolve(name) → rid|null, selfRid, err(msg) }
function ruleFromDesign(d, ctx) {
  const o = {};
  if (d === undefined || d === null) return o;
  if (typeof d !== 'object' || Array.isArray(d)) { ctx.err('rule은 객체여야 해요'); return o; }
  if (d.match !== undefined) { if (!['all', 'any'].includes(d.match)) ctx.err(`match는 all 또는 any예요 (받은 값: ${d.match})`); else o.mode = d.match; }
  if (d.conditions !== undefined) {
    if (!Array.isArray(d.conditions)) ctx.err('conditions는 배열이어야 해요');
    else {
      o.cond = [];
      for (const c of d.conditions) {
        const t = c?.type;
        if (!COND_KEYS.includes(t)) { ctx.err(`조건 종류 '${t}'를 몰라요 (${COND_KEYS.join('·')} 중 하나)`); continue; }
        const x = { t };
        if (t === 'text' || t === 'notext' || t === 'count') {
          x.keys = words(c.words);
          if (!x.keys) ctx.err(`'${t}' 조건에는 words(단어)가 필요해요`);
          if (c.regex) x.regex = true;
          if (c.all) x.all = true;
          if (c.within !== undefined) { if (!WITHIN.includes(c.within)) ctx.err(`within은 ${WITHIN.join('·')} 중 하나예요`); else if (c.within !== 'any') x.in = c.within; }
          if (c.scan !== undefined) x.scan = Number(c.scan);
        }
        if (t === 'var') {
          if (!clean(c.name)) ctx.err('var 조건에는 name이 필요해요');
          const op = c.op ?? '=';
          if (!VAR_OPS.includes(op)) ctx.err(`var 조건의 op '${op}'를 몰라요 (${VAR_OPS.join(' ')})`);
          Object.assign(x, { name: clean(c.name), op, val: c.value === undefined ? '' : String(c.value) });
        }
        if (t === 'turn' || t === 'count' || t === 'times') {
          for (const k of ['min', 'max']) if (c[k] !== undefined) { if (!(Number(c[k]) >= 0)) ctx.err(`${t} 조건의 ${k}는 0 이상 숫자예요`); else x[k] = Number(c[k]); }
        }
        if (t === 'times') x.rid = c.target ? ctx.resolve(c.target) : ctx.selfRid;
        if (t === 'with' || t === 'without') {
          if (!c.target) ctx.err(`'${t}' 조건에는 target(항목 이름)이 필요해요`);
          x.rid = ctx.resolve(c.target);
          if (x.rid && x.rid === ctx.selfRid) ctx.err(`'${t}' 조건이 자기 자신을 가리켜요`);
        }
        o.cond.push(x);
      }
    }
  }
  if (d.chance !== undefined) { const p = Number(d.chance); if (!(p >= 0 && p <= 100)) ctx.err('chance는 0~100이에요'); else o.prob = p; }
  if (d.repeat !== undefined) {
    if (!REPEAT_IN[d.repeat]) ctx.err(`repeat는 none·once·cooldown 중 하나예요 (받은 값: ${d.repeat})`);
    else { o.once = REPEAT_IN[d.repeat]; if (d.repeat === 'cooldown') o.cool = Math.max(1, Math.floor(Number(d.cooldown) || 3)); }
  }
  if (d.hold !== undefined) { if (!(Number(d.hold) >= 0)) ctx.err('hold는 0 이상이에요'); else o.hold = Math.floor(Number(d.hold)); }
  if (d.group !== undefined) o.group = clean(d.group);
  if (d.position !== undefined) { if (!['top', 'depth', 'bottom'].includes(d.position)) ctx.err('position은 top·depth·bottom 중 하나예요'); else o.at = d.position; }
  if (d.depth !== undefined) { if (!(Number(d.depth) >= 0)) ctx.err('depth는 0 이상이에요'); else o.depth = Math.floor(Number(d.depth)); }
  if (d.role !== undefined) { if (!['system', 'user', 'assistant'].includes(d.role)) ctx.err('role은 system·user·assistant 중 하나예요'); else o.role = d.role; }
  if (d.scan !== undefined) { if (!(Number(d.scan) >= 1)) ctx.err('scan은 1 이상이에요'); else o.scan = Math.floor(Number(d.scan)); }
  if (d.set !== undefined) {
    if (!Array.isArray(d.set)) ctx.err('set은 배열이어야 해요');
    else {
      o.set = [];
      for (const s of d.set) {
        const op = s?.op ?? '=';
        if (!SET_KEYS.includes(op)) { ctx.err(`set의 op '${op}'를 몰라요 (${SET_KEYS.join(' ')})`); continue; }
        if (!clean(s.var)) { ctx.err('set에는 var(변수 이름)이 필요해요'); continue; }
        const x = { name: clean(s.var), op, val: s.value === undefined ? '' : String(s.value) };
        if (op === 'expr') { const er = checkExpr(x.val); if (er) ctx.err(`'${x.name}' 수식 오류 — ${er}`); }
        o.set.push(x);
      }
    }
  }
  if (d.chain !== undefined) {
    if (!Array.isArray(d.chain)) ctx.err('chain은 배열이어야 해요');
    else {
      o.chain = [];
      for (const c of d.chain) {
        if (!c?.target) { ctx.err('chain에는 target(항목 이름)이 필요해요'); continue; }
        const rid = ctx.resolve(c.target);
        if (rid && rid === ctx.selfRid) ctx.err('chain이 자기 자신을 가리켜요');
        const p = c.chance === undefined ? 100 : Number(c.chance);
        if (!(p >= 0 && p <= 100)) ctx.err('chain의 chance는 0~100이에요');
        o.chain.push({ rid, prob: p });
      }
    }
  }
  if (d.wholeWord !== undefined) o.whole = !!d.wholeWord;
  if (d.commonWord !== undefined) o.common = !!d.commonWord;
  if (d.confirmWords !== undefined) o.commonWords = words(d.confirmWords);
  return o;
}

// 한 줄 규칙 요약 (미리보기용)
export function ruleLine(rule) {
  if (!rule) return '';
  const p = [];
  const c = rule.cond ?? [];
  p.push(c.length ? c.map((x) => ({ keys: '키', text: '단어', notext: '단어 없음', var: '변수', turn: '턴', count: '누적 단어', times: '켜진 횟수', with: '같이', without: '안 켜졌을 때' }[x.t] ?? x.t)).join(rule.mode === 'any' ? ' 또는 ' : ' + ') : '조건 없음');
  if (Number(rule.prob) < 100) p.push(`${rule.prob}%`);
  if (rule.once === 'chat') p.push('한 번만');
  if (rule.once === 'cooldown') p.push(`${rule.cool}턴 쉬기`);
  if (Number(rule.hold) > 0) p.push(`${rule.hold}턴 유지`);
  if (rule.group) p.push(`그룹 ${rule.group}`);
  if ((rule.set ?? []).length) p.push(`변수 ${rule.set.map((x) => x.name).join(',')}`);
  if ((rule.chain ?? []).length) p.push(`연쇄 ${rule.chain.length}`);
  return p.join(' · ');
}

// ---------- AI에게 보여 줄 현재 로어북 (구조) ----------
export function duskContext(lore, { bodyMax = 300 } = {}) {
  const L = lore ?? [];
  const fmap = folderMap(L);
  const ridName = new Map();
  L.forEach((e) => { const r = ridOf(e); if (r && !ridName.has(r)) ridName.set(r, affName(e) || e.comment); });
  const nameOfRid = (r) => ridName.get(r) ?? null;
  const folderName = (id) => (id && fmap.has(id) ? affName(fmap.get(id)) || fmap.get(id).comment : null);
  return L.map((e, i) => {
    const o = { ref: 'l' + i };
    const rule = ruleOf(e);
    if (isFolder(e)) {
      o.kind = isAff(e) ? 'affiliation' : 'folder';
      o.name = affName(e) || e.comment;
      const par = folderName(parentOf(e)); if (par) o.parent = par;
      const a = affOf(e);
      if (a) {
        const members = {};
        for (const [r, p] of Object.entries(a.prob)) members[nameOfRid(r) ?? r] = Number(p);
        o.affiliation = { chance: a.def, max: a.max === '' ? null : a.max, members };
      }
      if (e.key) o.keys = e.key;
    } else {
      o.kind = isPlace(e) ? 'place' : 'entry';
      o.name = affName(e) || e.comment;
      const par = folderName(parentOf(e)); if (par) o.folder = par;
      if (isPlace(e)) o.links = placeLinks(e).map(folderName).filter(Boolean);
      o.keys = e.key;
      const body = bodyOf(e.content);
      o.content = body.length > bodyMax ? body.slice(0, bodyMax) + '…(이하 생략: content를 생략하면 기존 내용 유지)' : body;
    }
    if (rule && rule.on !== false) o.rule = ruleToDesign(rule, nameOfRid);
    else if (!isFolder(e)) o.rule = null;
    return o;
  });
}

// ---------- 설계 JSON 형식 ----------
export const DESIGN_FORMAT = {
  folders: [{ name: '소속·폴더 이름', parent: '상위 폴더 이름 또는 null', keys: '(소속일 때) 소속 자체를 켜는 단어', affiliation: { chance: 100, max: null, members: { '구성원 이름': 50 } }, rule: {} }],
  entries: [{ ref: null, kind: 'person | place | info', name: '항목 이름', keys: '키1,키2', content: '내용', folder: '들어갈 폴더 이름', links: ['(장소) 연결할 소속 이름'], rule: { match: 'all | any', conditions: [{ type: 'keys' }], chance: 100, repeat: 'none | once | cooldown', hold: 0, set: [], chain: [] }, probBlocks: [{ text: '내용 중 확률로 나올 부분', chance: 30, else: '' }] }],
  remove: []
};

export const DUSK_GUIDE = String.raw`[로어북 방식: Dusk]
이 봇은 Dusk 플러그인이 턴마다 어떤 로어북 항목을 프롬프트에 넣을지 정한다. 항목 하나하나에 '규칙'이 있고, 규칙은 조건·확률·반복·유지·연쇄·변수로 구성된다. 플러그인이 없는 사용자에게는 규칙 항목이 꺼진 것으로 보이므로 본문은 평범한 로어북 글로 쓴다.
너는 @@activate·{{#if}}·extentions를 직접 쓰지 않는다. 대신 아래 "설계"를 data.design에 담는다. 항목끼리는 이름으로 서로를 가리키고, 기존 항목은 ref(l0, l1…)로 고친다. 폴더·소속·규칙 id는 Dusk가 만든다.

[설계 필드]
folders: 폴더. name, parent(상위 폴더 이름|null), keys(소속 자체를 켜는 단어), affiliation(있으면 '소속'), rule.
  affiliation = { chance: 구성원 기본 확률 %, max: 한 번에 최대 N명|null, members: { 구성원 이름: 개별 확률 % } }
entries: 항목. ref(null=새 항목), kind(person|place|info), name, keys, content, folder(들어갈 폴더 이름), links(장소가 연결할 소속 이름들), rule, probBlocks. 기존 항목을 고칠 때는 바꿀 필드만 쓴다(content를 생략하면 내용 유지).
remove: 지울 기존 항목 ref 목록.

[rule 필드] 모두 선택. 쓰지 않으면 기본값(키가 나오면 매번 켜짐).
- match: all(조건 모두) | any(하나라도). conditions: 조건 목록.
- 조건 9종 (type):
  keys    이 항목의 키가 최근 대화에 나옴 (기본 조건)
  text    words 중 하나가 최근 대화에 나옴 (all:true면 전부). regex, within(any|user|char), scan(최근 N개 메시지)
  notext  words가 최근 대화에 없음
  var     채팅 변수 비교 {name, op(= != > < >= <= 있음 없음), value}
  turn    턴 범위 {min, max}
  count   words가 대화 전체에서 N번 이상 나옴 {words, min, max} — 누적 조건
  times   항목(target 이름, 생략 시 자기 자신)이 지금까지 N번 이상 켜짐 {target, min, max} — 누적 조건
  with    target 항목이 이번 턴에 켜짐 / without: 안 켜짐
- chance 0~100. repeat: none(매번 가능) | once(채팅 전체에서 한 번만) | cooldown(+cooldown N턴 쉬기). hold N: 켜진 뒤 N턴 동안 계속 켜 둠.
- group: 같은 이름의 그룹은 한 턴에 하나만 켜짐(서로 겹치면 안 되는 항목끼리).
- position: top(기본, 로어북 자리) | depth(+depth N: 끝에서 N번째) | bottom(맨 끝). role: system|user|assistant. scan: 키를 찾는 범위(메시지 수, 기본 4).
- set: 켜질 때 변수 바꾸기 [{var, op(= + - * / expr), value}]. expr는 수식(예: "min(love+2, 10)"; 쓸 수 있는 함수 min max abs floor ceil round clamp rand, 변수 turn). 없는 변수는 0, 0으로 나누기는 금지.
- chain: 이 항목이 켜지면 target을 chance% 확률로 같이 켬 [{target, chance}]. wholeWord(이름 경계). commonWord+confirmWords: 흔한 낱말 이름(하늘·유리)일 때 확인 단어가 같이 나와야 켜짐.
probBlocks: content 안의 text(content에 그대로 들어 있는 문장)를 chance% 확률로만 나오게, else는 안 나올 때 대신 쓸 글.

[소속·장소 동작]
- 소속 폴더 안의 항목은 하위 폴더까지 전부 구성원이다(게헨나 ⊃ 선도부 ⊃ 히나 → 히나는 둘 다).
- 소속이 켜지는 길 3가지: 소속 keys, 그 안(가장 가까운 소속)이거나 연결된 장소가 켜짐, 구성원이 자기 키로 켜짐. 켜지면 구성원마다 chance를 굴려 통과한 사람 중 무작위로 최대 max명을 켠다. 자기 키로 켜진 구성원은 제한과 무관하다.
- 따라 켜진 소속은 정보만 넣는다(연쇄·구성원 뽑기를 하지 않는다).
- 장소: kind=place. 소속 폴더 안에 두면 그 소속의 종속 장소, 폴더 밖이면 links로 소속을 연결한다. 장소는 가장 가까운 소속만 켠다(상위 소속까지 올라가지 않는다).
- 같은 인물이 여러 소속이면 항목을 복제하되 name·content를 똑같이 쓴다.

[자주 틀리는 점]
1) count·times는 한 번 맞으면 이후 매 턴 계속 맞는다. '한 번만'이면 repeat:once 또는 cooldown을 같이 쓴다.
2) 연쇄·with 대상 항목에도 규칙이 있어야 하고 target 이름이 설계 또는 현재 로어북에 실제로 있어야 한다.
3) 자기 자신을 chain·with·without 대상으로 쓰지 않는다.
4) 이름이 다른 이름의 일부면(김민/김민수) wholeWord:true. 흔한 낱말 이름은 commonWord:true와 confirmWords.
5) 변수 이름에 da_ 접두어를 쓰지 않는다. 변수가 필요한 조건은 먼저 set으로 만드는 항목도 설계에 둔다.
6) 확률 구성원(members)의 이름은 설계 또는 현재 로어북에 있는 항목이어야 한다.
7) 키에는 실제 대화에 나올 말만 쓰고, 항목마다 키가 겹치지 않게 한다(겹치면 group으로 묶는다).

[응답 전 점검] target·members·folder·links 이름이 실제로 있는가 / 자기 참조가 없는가 / 누적 조건에 repeat가 있는가 / expr 문법이 맞는가 / content에 {{#if}}·@@ 같은 게이트를 직접 쓰지 않았는가.`;

export function designExamples() {
  const wrap = (design) => JSON.stringify({ schemaVersion: 1, task: 'lorebook', data: { design } }, null, 2);
  return [
    wrap({
      folders: [
        { name: '게헨나', keys: '게헨나,Gehenna', affiliation: { chance: 100, max: null, members: {} } },
        { name: '선도부', parent: '게헨나', keys: '선도부', affiliation: { chance: 100, max: 2, members: { 히나: 100, 이오리: 60 } } }
      ],
      entries: [
        { ref: null, kind: 'person', name: '히나', keys: '히나,Hina', content: '소라사키 히나. 게헨나 학원 선도부의 부장이다.', folder: '선도부', rule: { chance: 100 } },
        { ref: null, kind: 'person', name: '이오리', keys: '이오리,Iori', content: '시모에 이오리. 선도부의 부부장이다.', folder: '선도부' },
        { ref: null, kind: 'place', name: '선도부 사무실', keys: '선도부 사무실', content: '선도부 부원들이 업무를 보는 사무실.', folder: '선도부' }
      ],
      remove: []
    }),
    wrap({
      folders: [],
      entries: [
        { ref: null, kind: 'info', name: '히나의 피로', keys: '야근,서류', content: '히나는 쌓인 서류 때문에 눈에 띄게 지쳐 있다.', rule: { conditions: [{ type: 'count', words: '야근,서류', min: 3 }], repeat: 'once', set: [{ var: 'fatigue', op: 'expr', value: 'min(fatigue + 2, 10)' }], chain: [{ target: '히나', chance: 50 }] } }
      ],
      remove: []
    })
  ];
}

// ---------- 변환 ----------
export class DesignError extends Error {
  constructor(errors) {
    super('Dusk 설계 검사에서 고쳐야 할 점이 있어요:\n- ' + errors.join('\n- '));
    this.name = 'DesignError';
    this.errors = errors;
  }
}

export function convertDesign(design, lore) {
  const L = lore ?? [];
  const errors = [], warnings = [], fixes = [], notes = [];
  const err = (m) => { if (!errors.includes(m)) errors.push(m); };
  const d = design && typeof design === 'object' && !Array.isArray(design) ? design : {};
  for (const k of Object.keys(d)) if (!['folders', 'entries', 'remove'].includes(k)) err(`design에 알 수 없는 필드 '${k}'가 있어요 (folders·entries·remove만 써요)`);
  const folders = Array.isArray(d.folders) ? d.folders : [];
  const entries = Array.isArray(d.entries) ? d.entries : [];
  const removes = Array.isArray(d.remove) ? d.remove : [];
  if (d.folders !== undefined && !Array.isArray(d.folders)) err('folders는 배열이어야 해요');
  if (d.entries !== undefined && !Array.isArray(d.entries)) err('entries는 배열이어야 해요');
  if (!folders.length && !entries.length && !removes.length) err('설계가 비어 있어요 (folders·entries·remove가 모두 비었어요)');
  if (folders.length + entries.length > 400) err('한 번에 400개를 넘는 항목은 만들 수 없어요. 나눠서 요청해 주세요');

  // 기존 색인
  const fmap = new Map(folderMap(L));
  const byName = new Map();
  L.forEach((e, i) => { const k = normName(affName(e) || e.comment); if (k) (byName.get(k) ?? byName.set(k, []).get(k)).push(i); });
  const patched = new Map();
  const patch = (i) => { if (!patched.has(i)) patched.set(i, structuredClone(L[i])); return patched.get(i); };
  const created = [];      // 새로 만들 항목 (폴더 먼저)
  const ridByName = new Map(); // 새 항목 이름 → rid
  const newFolderId = new Map(); // 새 폴더 이름 → id
  const folderIdByName = (name) => {
    const k = normName(name);
    if (newFolderId.has(k)) return newFolderId.get(k);
    const i = (byName.get(k) ?? []).find((x) => isFolder(L[x]));
    return i === undefined ? null : folderIdOf(L[i]);
  };
  const allFolders = (id) => created.find((e) => folderIdOf(e) === id) ?? fmap.get(id) ?? null;
  const rulePatch = new Map(); // entry → 규칙 조각 (모든 이름이 정해진 뒤 풀기)

  // 이름 → rid. 기존 항목은 규칙이 없으면 켠다(자동 수정으로 기록)
  const resolve = (name) => {
    const k = normName(name);
    if (!k) return null;
    if (ridByName.has(k)) return ridByName.get(k);
    const idxs = byName.get(k);
    if (!idxs) { err(`'${name}'라는 항목을 설계와 현재 로어북에서 찾지 못했어요`); return null; }
    const i = idxs.find((x) => !isFolder(L[x]) || isAff(L[x]));
    if (i === undefined) { err(`'${name}'은 그냥 폴더라서 규칙 대상이 될 수 없어요 (소속 폴더만 가능)`); return null; }
    const cur = patched.get(i) ?? L[i];
    if (ridOf(cur) && isManaged(cur)) return ridOf(cur);
    const e = patch(i);
    e.extentions = { ...(e.extentions ?? {}) };
    e.extentions.da_rid ||= newId();
    e.extentions.da_rule = { ...(ruleOf(e) ?? defaultRule()), on: true };
    fixes.push(`'${affName(e) || e.comment}' 항목은 규칙이 꺼져 있어 Dusk 규칙을 켰어요`);
    return e.extentions.da_rid;
  };

  // 1) 폴더
  const folderNodes = [];
  for (const f of folders) {
    const name = clean(f?.name);
    if (!name) { err('이름이 비어 있는 폴더가 있어요'); continue; }
    for (const k of Object.keys(f)) if (!['name', 'parent', 'keys', 'affiliation', 'rule', 'color'].includes(k)) err(`폴더 '${name}'에 알 수 없는 필드 '${k}'가 있어요`);
    const k = normName(name);
    if (newFolderId.has(k)) { err(`폴더 '${name}'가 두 번 나와요`); continue; }
    const aff = f.affiliation && typeof f.affiliation === 'object' ? f.affiliation : null;
    if (f.affiliation !== undefined && f.affiliation !== null && !aff) err(`폴더 '${name}'의 affiliation은 객체여야 해요`);
    const exIdx = (byName.get(k) ?? []).find((x) => isFolder(L[x]));
    if (exIdx !== undefined) {
      newFolderId.set(k, folderIdOf(L[exIdx]));
      folderNodes.push({ f, name, exIdx, aff });
      continue;
    }
    const id = newId();
    const e = { key: clean(f.keys), secondkey: '', insertorder: 100, comment: (aff ? AFF_PREFIX : '') + name, content: '', mode: 'normal', alwaysActive: false, selective: false, useRegex: false, extentions: { da_folder: { id, ...(/^#[0-9a-fA-F]{3,8}$/.test(clean(f.color)) ? { color: clean(f.color) } : {}), ...(aff ? { aff: defaultAff() } : {}) } } };
    if (aff) { e.extentions.da_rid = newId(); e.extentions.da_rule = { ...defaultRule(), on: true }; ridByName.set(k, e.extentions.da_rid); }
    newFolderId.set(k, id);
    created.push(e);
    folderNodes.push({ f, name, e, aff, isNew: true });
  }
  for (const n of folderNodes) {
    if (n.isNew && n.f.parent !== undefined && n.f.parent !== null && clean(n.f.parent)) {
      const pid = folderIdByName(n.f.parent);
      if (!pid) err(`폴더 '${n.name}'의 상위 폴더 '${n.f.parent}'를 찾지 못했어요`);
      else if (normName(n.f.parent) === normName(n.name)) err(`폴더 '${n.name}'가 자기 자신을 상위로 가리켜요`);
      else n.e.extentions.da_parent = pid;
    }
  }
  // 순환 검사
  for (const n of folderNodes) {
    if (!n.isNew) continue;
    const seen = new Set([folderIdOf(n.e)]);
    for (let p = n.e.extentions.da_parent, k = 0; p && k < 50; k++) {
      if (seen.has(p)) { err(`폴더 '${n.name}'의 상위 관계가 순환해요`); break; }
      seen.add(p);
      p = allFolders(p)?.extentions?.da_parent ?? allFolders(p)?.folder ?? null;
    }
  }
  const setParent = (e, fid) => {
    e.extentions = { ...(e.extentions ?? {}) };
    delete e.extentions.da_parent;
    e.folder = '';
    if (!fid) return;
    const pf = allFolders(fid);
    if (pf && isDuskFolder(pf)) e.extentions.da_parent = fid; else e.folder = fid;
  };

  // 2) 항목: 뼈대 먼저(이름·rid), 그다음 내용
  const entryNodes = [];
  const seenRefs = new Set();
  for (const de of entries) {
    if (!de || typeof de !== 'object') { err('entries 안에 객체가 아닌 값이 있어요'); continue; }
    for (const k of Object.keys(de)) if (!['ref', 'kind', 'name', 'keys', 'secondKeys', 'content', 'folder', 'links', 'rule', 'probBlocks'].includes(k)) err(`항목 '${de.name ?? de.ref ?? '?'}'에 알 수 없는 필드 '${k}'가 있어요`);
    const ref = de.ref ?? null;
    if (ref !== null) {
      const m = /^l(0|[1-9][0-9]*)$/.exec(String(ref));
      const i = m ? Number(m[1]) : -1;
      if (i < 0 || i >= L.length) { err(`ref '${ref}'는 현재 로어북에 없어요`); continue; }
      if (seenRefs.has(i)) { err(`ref '${ref}'가 두 번 나와요`); continue; }
      seenRefs.add(i);
      if (isFolder(L[i])) { err(`ref '${ref}'는 폴더예요. 폴더는 folders에서 이름으로 고쳐요`); continue; }
      entryNodes.push({ de, i, name: clean(de.name) || affName(L[i]) || L[i].comment, kind: isPlace(L[i]) ? 'place' : 'info', isNew: false });
      continue;
    }
    const name = clean(de.name);
    if (!name) { err('이름이 비어 있는 새 항목이 있어요'); continue; }
    const kind = de.kind ?? 'info';
    if (!['person', 'place', 'info'].includes(kind)) { err(`항목 '${name}'의 kind는 person·place·info 중 하나예요`); continue; }
    const k = normName(name);
    const clash = (byName.get(k) ?? []).find((x) => !isFolder(L[x]));
    if (clash !== undefined) { err(`'${name}'은 이미 있는 항목이에요 (l${clash}). 새로 만들지 말고 ref "l${clash}"로 고치세요`); continue; }
    if (de.content === undefined || typeof de.content !== 'string' || !de.content.trim()) { err(`새 항목 '${name}'에는 content(내용)가 필요해요`); continue; }
    if (!words(de.keys)) { err(`새 항목 '${name}'에는 keys(키)가 필요해요`); continue; }
    const dup = entryNodes.find((n) => n.isNew && normName(n.name) === k);
    if (dup) {
      if (dup.de.content !== de.content || kind !== dup.kind) { err(`'${name}'이 두 번 나오는데 내용이 달라요 (여러 소속에 같은 인물을 넣으려면 내용을 똑같이 쓰세요)`); continue; }
    }
    const rid = newId();
    if (!dup) ridByName.set(k, rid);
    entryNodes.push({ de, name, kind, isNew: true, rid });
  }

  // 3) 항목 채우기
  const touchedExisting = new Set();
  for (const n of entryNodes) {
    const { de, name } = n;
    let e;
    if (n.isNew) {
      e = { key: words(de.keys), secondkey: words(de.secondKeys), insertorder: 100, comment: (n.kind === 'place' ? PLACE_PREFIX : '') + name, content: de.content, mode: 'normal', alwaysActive: false, selective: !!words(de.secondKeys), useRegex: false, extentions: { da_rid: n.rid, da_rule: { ...defaultRule(), on: true } } };
      created.push(e);
    } else {
      e = patch(n.i);
      touchedExisting.add(n.i);
      e.extentions = { ...(e.extentions ?? {}) };
      if (clean(de.name) && normName(de.name) !== normName(affName(L[n.i]) || L[n.i].comment)) e.comment = (isPlace(L[n.i]) ? PLACE_PREFIX : '') + clean(de.name);
      if (de.keys !== undefined) e.key = words(de.keys);
      if (de.secondKeys !== undefined) { e.secondkey = words(de.secondKeys); e.selective = !!e.secondkey; }
      if (de.content !== undefined) { if (typeof de.content !== 'string') err(`항목 '${name}'의 content는 문자열이에요`); else e.content = de.content; }
    }
    n.e = e;
    if (n.isNew && n.kind === 'place' || (!n.isNew && isPlace(L[n.i]))) {
      let links;
      if (de.links !== undefined) {
        if (!Array.isArray(de.links)) { err(`장소 '${name}'의 links는 배열이에요`); links = placeLinks(e); }
        else links = de.links.map((x) => {
          const fid = folderIdByName(x);
          const fe = fid && allFolders(fid);
          if (!fe || !(isAff(fe) || (fe.extentions?.da_folder?.aff))) { err(`장소 '${name}'가 연결하려는 소속 '${x}'를 찾지 못했어요 (소속 폴더만 연결할 수 있어요)`); return null; }
          return fid;
        }).filter(Boolean);
      } else links = placeLinks(e);
      e.extentions.da_place = { links };
    } else if (de.links !== undefined && (de.links?.length ?? 0)) warnings.push(`'${name}'는 장소가 아니라서 links를 무시했어요 (kind: place로 만드세요)`);
    if (de.folder !== undefined) {
      if (de.folder === null || clean(de.folder) === '') setParent(e, null);
      else {
        const fid = folderIdByName(de.folder);
        if (!fid) err(`항목 '${name}'가 들어갈 폴더 '${de.folder}'를 찾지 못했어요`);
        else setParent(e, fid);
      }
    }
    // 확률 블록
    if (de.probBlocks !== undefined) {
      if (!Array.isArray(de.probBlocks)) err(`항목 '${name}'의 probBlocks는 배열이에요`);
      else for (const b of de.probBlocks) {
        const t = String(b?.text ?? '');
        const p = Number(b?.chance);
        if (!t) { err(`항목 '${name}'의 probBlocks에 text가 없어요`); continue; }
        if (!(p >= 0 && p <= 100)) { err(`항목 '${name}'의 probBlocks chance는 0~100이에요`); continue; }
        const at = e.content.indexOf(t);
        if (at < 0) { err(`항목 '${name}'의 probBlocks text가 content에 그대로 들어 있지 않아요: "${t.slice(0, 20)}…"`); continue; }
        if (e.content.indexOf(t, at + 1) >= 0) { err(`항목 '${name}'의 probBlocks text가 content에 여러 번 나와요. 더 긴 문장으로 지정하세요`); continue; }
        e.content = e.content.slice(0, at) + wrapProb(t, p, String(b.else ?? '')) + e.content.slice(at + t.length);
      }
    }
    rulePatch.set(e, { de: de.rule, name, isNew: n.isNew });
  }

  // 4) 규칙 풀기 (이름 해석은 모든 항목이 정해진 뒤)
  const touched = new Set();
  for (const n of entryNodes) {
    if (!n.e) continue;
    const rp = rulePatch.get(n.e);
    const e = n.e;
    // 기존 항목을 고치는데 규칙이 없고 규칙을 쓰지도 않았으면 건드리지 않는다 (일반 항목은 일반 항목으로 둔다)
    if (!n.isNew && !ruleOf(L[n.i]) && rp.de === undefined && !e.extentions?.da_rid) continue;
    const selfRid = e.extentions.da_rid ?? (e.extentions.da_rid = newId());
    const msgs = [];
    const part = ruleFromDesign(rp.de, { resolve, selfRid, err: (m) => msgs.push(m) });
    for (const m of msgs) err(`'${n.name}': ${m}`);
    const base = ruleOf(e) ?? defaultRule();
    e.extentions.da_rule = { ...base, ...part, on: true };
    const body = e.content;
    e.content = nativeContent(body, e.extentions.da_rule, selfRid);
    n.rule = e.extentions.da_rule;
  }
  // 소속 폴더 (구성원 확률·규칙)
  for (const n of folderNodes) {
    if (!n.isNew && !n.aff && n.f.rule === undefined && n.f.keys === undefined) continue;
    const target = n.isNew ? n.e : patch(n.exIdx);
    if (n.aff) {
      if (!n.isNew && !isAff(L[n.exIdx])) { warnings.push(`폴더 '${n.name}'는 소속이 아니라서 affiliation을 무시했어요`); continue; }
      const df = target.extentions.da_folder = { ...target.extentions.da_folder };
      const a = { ...defaultAff(), ...(df.aff ?? {}) };
      if (n.aff.chance !== undefined) { const p = Number(n.aff.chance); if (!(p >= 0 && p <= 100)) err(`소속 '${n.name}'의 chance는 0~100이에요`); else a.def = p; }
      if (n.aff.max !== undefined) { if (n.aff.max === null || n.aff.max === '') a.max = ''; else if (!(Number(n.aff.max) >= 0)) err(`소속 '${n.name}'의 max는 0 이상이거나 null이에요`); else a.max = Math.floor(Number(n.aff.max)); }
      if (n.aff.members !== undefined) {
        if (!n.aff.members || typeof n.aff.members !== 'object' || Array.isArray(n.aff.members)) err(`소속 '${n.name}'의 members는 {이름: 확률} 객체예요`);
        else {
          a.prob = { ...(a.prob ?? {}) };
          for (const [mn, mp] of Object.entries(n.aff.members)) {
            const p = Number(mp);
            if (!(p >= 0 && p <= 100)) { err(`소속 '${n.name}'의 구성원 '${mn}' 확률은 0~100이에요`); continue; }
            const rid = resolve(mn);
            if (rid) a.prob[rid] = p;
          }
        }
      }
      df.aff = a;
    }
    if (n.f.keys !== undefined && !n.isNew) target.key = clean(n.f.keys);
    if (n.f.rule !== undefined && target.extentions?.da_rule) {
      const msgs = [];
      const part = ruleFromDesign(n.f.rule, { resolve, selfRid: ridOf(target), err: (m) => msgs.push(m) });
      for (const m of msgs) err(`소속 '${n.name}': ${m}`);
      target.extentions.da_rule = { ...ruleOf(target), ...part, on: true };
    }
    if (n.isNew) n.rule = ruleOf(target);
  }

  // 5) 삭제
  const remove = [];
  for (const r of removes) {
    const m = /^l(0|[1-9][0-9]*)$/.exec(String(r));
    const i = m ? Number(m[1]) : -1;
    if (i < 0 || i >= L.length) { err(`remove의 '${r}'는 현재 로어북에 없어요`); continue; }
    if (isFolder(L[i])) { err(`remove의 '${r}'는 폴더예요. 폴더는 지울 수 없어요 (안에 든 항목이 함께 사라져요)`); continue; }
    if (patched.has(i) && touchedExisting.has(i)) { err(`'${r}'를 고치면서 지우도록 했어요`); continue; }
    if (!remove.includes('l' + i)) remove.push('l' + i);
  }
  for (const r of remove) patched.delete(Number(r.slice(1)));

  // 6) 만들어진 결과로 Dusk 규칙 검사 (고친 항목·새 항목에 대한 것만)
  if (!errors.length) {
    const result = L.map((e, i) => patched.get(i) ?? e);
    const from = result.length;
    result.push(...created);
    const touchedIdx = new Set([...patched.keys(), ...created.map((_, j) => from + j)]);
    for (const x of validateRules(result)) {
      const hit = (x.sync ?? [x.index]).some((i) => touchedIdx.has(i));
      if (!hit) continue;
      if (isAff(result[x.index]) && /'키' 조건이 있지만/.test(x.msg)) continue; // 소속은 구성원·장소로도 켜진다
      if (x.level === 'err') err(x.msg);
      else if (!/내용 머리/.test(x.msg)) warnings.push(x.msg);
    }
    for (const n of [...entryNodes, ...folderNodes]) {
      const r = n.rule;
      if (!r) continue;
      const cum = (r.cond ?? []).some((c) => c.t === 'count' || c.t === 'times');
      if (cum && r.once === 'none' && !(Number(r.hold) > 0)) warnings.push(`'${n.name}': 누적 조건은 한 번 맞으면 이후 매 턴 켜져요. 한 번만 나오게 하려면 repeat를 once나 cooldown으로 두세요`);
    }
    for (const n of entryNodes) {
      if (n.isNew && n.kind === 'person' && n.rule && !n.rule.whole && !n.rule.common && words(n.de.keys).split(',').some((k) => clean(k).length === 1)) warnings.push(`'${n.name}': 한 글자 키는 다른 낱말 안에서도 켜질 수 있어요 (wholeWord나 commonWord를 고려하세요)`);
    }
  }

  // 7) 수정안 + 미리보기
  const upsert = [];
  const parentName = (e) => { const p = parentOf(e); const f = p && allFolders(p); return f ? affName(f) || f.comment : null; };
  const preview = [];
  for (const e of created) {
    upsert.push({ ref: null, entry: e });
    const fol = isFolder(e);
    preview.push({ isNew: true, kind: fol ? (isAff(e) ? 'affiliation' : 'folder') : isPlace(e) ? 'place' : 'entry', name: affName(e) || e.comment, parent: parentName(e), summary: ruleLine(ruleOf(e)) });
  }
  const upKey = ['comment', 'key', 'secondkey', 'content', 'selective', 'folder'];
  for (const [i, e] of patched) {
    const old = L[i];
    const entry = {};
    for (const k of upKey) if (JSON.stringify(e[k] ?? '') !== JSON.stringify(old[k] ?? '')) entry[k] = e[k] ?? '';
    if (JSON.stringify(e.extentions ?? {}) !== JSON.stringify(old.extentions ?? {})) entry.extentions = e.extentions;
    if (!Object.keys(entry).length) continue;
    upsert.push({ ref: 'l' + i, entry });
    preview.push({ isNew: false, kind: isFolder(e) ? (isAff(e) ? 'affiliation' : 'folder') : isPlace(e) ? 'place' : 'entry', name: affName(e) || e.comment, parent: parentName(e), summary: ruleLine(ruleOf(e)), changed: Object.keys(entry).map((k) => ({ comment: '이름', key: '키', secondkey: '보조 키', content: '내용', selective: '보조 키', folder: '폴더', extentions: '규칙·구조' }[k])).filter((v, j, a) => a.indexOf(v) === j) });
  }
  for (const r of remove) { const e = L[Number(r.slice(1))]; preview.push({ isNew: false, removed: true, kind: 'entry', name: affName(e) || e.comment }); }
  return { upsert, remove, errors, warnings, fixes, notes, preview };
}

// 응답 객체(JSON.parse 결과)에서 lorebook 설계를 찾아 {upsert, remove}로 바꾼다. 바꾸면 response.dusk=true.
// 반환: { response, errors, warnings, fixes, preview } — errors가 있으면 던지지 않고 돌려준다(재요청 판단은 호출자)
export function applyDesignToResponse(response, lore) {
  const out = { response, errors: [], warnings: [], fixes: [], preview: [] };
  const take = (data) => {
    const r = convertDesign(data.design, lore);
    out.errors.push(...r.errors); out.warnings.push(...r.warnings); out.fixes.push(...r.fixes); out.preview.push(...r.preview);
    for (const k of Object.keys(data)) if (k !== 'design') out.errors.push(`data에 알 수 없는 필드 '${k}'가 있어요 (design만 써요)`);
    return { upsert: r.upsert, remove: r.remove };
  };
  if (response?.task === 'lorebook' && response.data && typeof response.data === 'object' && 'design' in response.data) {
    response.data = take(response.data);
    response.dusk = true;
  } else if (response?.task === 'workshop' && Array.isArray(response.data?.changes)) {
    for (const ch of response.data.changes) {
      if (ch?.task === 'lorebook' && ch.data && typeof ch.data === 'object' && 'design' in ch.data) {
        ch.data = take(ch.data);
        response.dusk = true;
      }
    }
  }
  return out;
}
