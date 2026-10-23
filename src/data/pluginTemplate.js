// 플러그인 만들기 — 템플릿, 머리말·등록 코드 동기화, 검사, 설치용 객체, 도움말
import { INTEROP_SNIPPET } from './interopSnippet.js';
import { parseHeader } from './plugins.js';

export var DRAFT_KEY = "rbm:pluginDraft:v1";
var BODY_MARK = "// ===== 플러그인 본체 =====";
var REG_MARK = "// ===== DA Interop 등록 코드 =====";

export var DEFAULT_META = { name: "my_plugin", displayName: "내 플러그인", version: "1.0.0", id: "my-plugin", description: "" };

var q = (s) => `'${String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

export function buildTemplate(meta = DEFAULT_META) {
  const m = { ...DEFAULT_META, ...meta };
  // 주의: 이 파일의 문자열 안에서도 "//@"로 시작하는 줄을 쓰면 RisuAI가 번들 전체에서 머리말로 읽어요.
  // 그래서 머리말은 이어 붙여서 만듭니다.
  const header = ["//@name " + m.name, "//@display-name " + m.displayName, "//@api 3.0", "//@version " + m.version].join("\n");
  return header + `

${INTEROP_SNIPPET}
${BODY_MARK}
const risu = globalThis.risuai ?? globalThis.Risuai;

// 설정은 pluginStorage에 저장해요. 다른 플러그인과 겹치지 않게 키 앞에 플러그인 이름을 붙여요
const SETTINGS_KEY = ${q(m.name + ":settings")};
const DEFAULTS = {
  enabled: true,
  strength: 0.5,
  mode: 'normal',
};

async function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse((await risu.pluginStorage.getItem(SETTINGS_KEY)) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

async function saveSettings(values) {
  await risu.pluginStorage.setItem(SETTINGS_KEY, JSON.stringify(values));
}

// TODO: 여기에 플러그인 기능을 작성하세요.
// 설정 값이 필요할 때는 const s = await loadSettings(); 로 읽어요.

${REG_MARK}
registerInterop({
  id: ${q(m.id)},
  name: ${q(m.displayName)},
  version: ${q(m.version)},
  pluginName: ${q(m.name)},
  description: ${q(m.description)},

  // Dusk Atelier에 보일 설정 항목
  fields: [
    { key: 'enabled', label: '사용', type: 'toggle', default: true },
    { key: 'strength', label: '세기', type: 'slider', default: 0.5, min: 0, max: 1, step: 0.05 },
    { key: 'mode', label: '모드', type: 'select', default: 'normal', options: [
      { value: 'normal', label: '보통' },
      { value: 'strong', label: '강하게' },
    ] },
  ],

  // 한 번에 바꿀 값 묶음
  presets: [
    { name: '약하게', values: { strength: 0.2 } },
    { name: '강하게', values: { strength: 0.9, mode: 'strong' } },
  ],

  // 지금 값을 Dusk Atelier에 알려 줘요
  getValues: loadSettings,

  // Dusk Atelier에서 [적용]을 누르면 불려요
  apply: async (values, ctx) => {
    await saveSettings({ ...DEFAULTS, ...values });
  },
});
`;
}

// 폼 값이 바뀌면 코드의 머리말과 등록 코드 해당 줄만 바꾼다 (나머지는 사용자가 쓴 그대로)
export function syncMeta(code, meta) {
  let out = code;
  const setHeader = (k, v) => {
    const re = new RegExp(`^//@${k}[ \\t].*$`, "m");
    out = re.test(out) ? out.replace(re, `//@${k} ${v}`) : `//@${k} ${v}\n` + out;
  };
  setHeader("name", meta.name);
  setHeader("display-name", meta.displayName);
  setHeader("version", meta.version);
  const at = out.indexOf("registerInterop({", out.indexOf(REG_MARK) >= 0 ? out.indexOf(REG_MARK) : out.lastIndexOf("registerInterop({"));
  if (at < 0) return out;
  let head = out.slice(0, at), reg = out.slice(at);
  const setProp = (k, v) => {
    reg = reg.replace(new RegExp(`^(\\s*)${k}:\\s*(['"\`]).*?\\2,`, "m"), (_, sp) => `${sp}${k}: ${q(v)},`);
  };
  setProp("id", meta.id);
  setProp("name", meta.displayName);
  setProp("version", meta.version);
  setProp("pluginName", meta.name);
  setProp("description", meta.description);
  head = head.replace(/^(const SETTINGS_KEY = )(['"`]).*?\2;/m, (_, a) => `${a}${q(meta.name + ":settings")};`);
  return head + reg;
}

// 버전 비교: "1.2.3" 형식. 앞의 숫자부터 비교
export function isValidVersion(v) {
  return /^\d+(\.\d+)*$/.test(String(v).trim());
}
export function cmpVersion(a, b) {
  const x = String(a).split(".").map((n) => parseInt(n, 10) || 0), y = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

// 저장·설치 전에 확인할 것들. { level: 'err'|'warn', text }
export function checkCode(code, meta) {
  const out = [];
  const hd = parseHeader(code);
  if (!hd.name) out.push({ level: "err", text: "맨 위에 //@name 줄이 없어요. RisuAI가 플러그인 이름을 모르게 돼요." });
  else if (!/^[A-Za-z0-9_-]+$/.test(hd.name)) out.push({ level: "warn", text: "//@name에는 영문·숫자·_·- 만 쓰는 게 안전해요." });
  if (!hd.version) out.push({ level: "err", text: "//@version 줄이 없어요. 버전이 없으면 RisuAI가 설치를 거부해요." });
  else if (!isValidVersion(hd.version)) out.push({ level: "err", text: `버전 '${hd.version}'은(는) 올바르지 않아요. 숫자와 점으로만 쓰고(예: 1.0.0) 0.0.1 이상이어야 해요.` });
  else if (cmpVersion(hd.version, "0.0.1") < 0) out.push({ level: "err", text: `버전 '${hd.version}'은(는) 너무 낮아요. RisuAI는 0.0.1 이상만 받아요.` });
  if (hd.api !== "3.0") out.push({ level: "err", text: "//@api 3.0 줄이 필요해요. 이 화면은 API 3.0 플러그인만 만들어요." });
  const first = code.split("\n").find((l) => l.trim());
  if (first && !first.startsWith("//@")) out.push({ level: "warn", text: "//@ 머리말은 파일 맨 위에 두세요." });
  if (!code.includes("const registerInterop =")) out.push({ level: "warn", text: "DA Interop 스니펫이 없어요. Dusk Atelier에서 설정을 조절할 수 없어요." });
  if (!/registerInterop\(\{/.test(code.replace(/const registerInterop =[\s\S]*?\}\)\(\);/, ""))) out.push({ level: "warn", text: "registerInterop({...}) 등록 코드가 없어요." });
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(meta.id ?? "")) out.push({ level: "err", text: "연동 id는 영소문자·숫자로 시작하고 . - _ 만 쓸 수 있어요 (2~64자)." });
  const syntax = syntaxError(code);
  if (syntax) out.push({ level: "err", text: `문법 오류: ${syntax}` });
  return out;
}
function syntaxError(code) {
  try {
    new Function(`return async () => {\n${code}\n}`);
    return null;
  } catch (e) {
    if (e instanceof SyntaxError) return e.message;
    return null; // 보안 설정 때문에 검사 자체를 못 하는 환경이면 건너뜀
  }
}

// RisuAI가 가져오기 때 만드는 객체와 같은 모양
export function toPluginObject(code) {
  const hd = parseHeader(code);
  return {
    name: hd.name,
    displayName: hd.displayName || hd.name,
    script: code,
    realArg: {},
    arguments: {},
    argMeta: {},
    customLink: [],
    version: "3.0",
    versionOfPlugin: hd.version ?? "",
    updateURL: hd.updateURL ?? "",
    allowedIPC: [],
    enabled: true
  };
}

// ── 도움말 ── [제목, 설명, 예시 코드]
export var HELP = {
  name: ["플러그인 이름 (//@name)", "RisuAI가 플러그인을 구분하는 이름이에요. 같은 이름으로 설치하면 기존 플러그인을 덮어써요. 영문 소문자·숫자·_ 를 권장해요.", "//@name my_plugin"],
  displayName: ["표시 이름 (//@display-name)", "RisuAI 설정 화면과 Dusk Atelier 연동 목록에 보이는 이름이에요. 한글을 써도 돼요.", "//@display-name 내 플러그인"],
  version: ["버전 (//@version)", "고칠 때마다 올려 주세요. 업데이트 확인은 이 숫자를 비교해요. 점으로 나눈 숫자(1.0.0)를 권장해요.", "//@version 1.0.1"],
  id: ["연동 id", "Dusk Atelier가 이 플러그인을 찾을 때 쓰는 이름표예요. 영소문자·숫자로 시작하고 . - _ 만 써요. 한 번 정하면 바꾸지 마세요. 바꾸면 Dusk에 새 플러그인으로 보여요.", "id: 'my-plugin',"],
  description: ["설명", "Dusk Atelier 연동 설정 화면 위쪽에 보이는 한 줄 설명이에요. 비워도 돼요.", "description: '답변 말투를 바꿔요',"],
  header: ["① 머리말 (맨 위 //@ 줄)", "RisuAI가 플러그인 정보를 읽는 부분이라 반드시 파일 맨 위에 있어야 해요. 위 칸의 이름·표시 이름·버전을 바꾸면 자동으로 고쳐져요. //@api 3.0은 지우지 마세요.", "//@name my_plugin\n//@display-name 내 플러그인\n//@api 3.0\n//@version 1.0.0"],
  snippet: ["② DA Interop 스니펫", "Dusk Atelier와 값을 주고받는 공용 코드예요. 건드리지 않아도 돼요. 이 코드가 있어야 맨 아래 registerInterop을 쓸 수 있어요.", "const registerInterop = (() => { ... })();"],
  body: ["③ 플러그인 본체", "플러그인이 실제로 할 일을 여기에 써요. 설정 값은 loadSettings()로 읽어요. 저장 키(SETTINGS_KEY)는 다른 플러그인과 겹치지 않게 '플러그인이름:' 으로 시작해요.", "const s = await loadSettings();\nif (s.enabled) {\n  // ...\n}"],
  fields: ["④ fields — 설정 항목", "Dusk Atelier에 자동으로 만들어질 입력 칸 목록이에요. key는 DEFAULTS의 이름과 같아야 해요.\n\ntype 종류\n· toggle: 켜기/끄기 (true/false)\n· number: 숫자 칸 — min, max, step\n· slider: 슬라이더 — min, max, step\n· select: 고르기 — options: [{ value, label }]\n· text: 한 줄 글\n· textarea: 여러 줄 글\n· color: 색 (#rrggbb)\n\n공통: label(보일 이름), default(기본값), group(묶음 제목), description(작은 설명)", "{ key: 'strength', label: '세기', type: 'slider',\n  default: 0.5, min: 0, max: 1, step: 0.05, group: '생성' },"],
  presets: ["④ presets — 프리셋", "버튼 한 번으로 여러 값을 바꾸는 묶음이에요. values에는 바꿀 key만 적으면 되고, 나머지는 지금 값 그대로예요.", "{ name: '강하게', values: { strength: 0.9, mode: 'strong' } },"],
  getValues: ["④ getValues", "지금 저장된 값을 돌려주는 함수예요. Dusk Atelier 화면에 현재 값으로 보여요. 템플릿에서는 loadSettings를 그대로 써요.", "getValues: loadSettings,"],
  apply: ["④ apply", "Dusk Atelier에서 [적용]이나 프리셋을 누르면 불리는 함수예요. 받은 values를 저장하고, 필요하면 바로 반영하세요. 여기서 오류가 나면 Dusk Atelier에 오류로 표시돼요.\nctx.preset: 프리셋으로 적용했으면 그 이름\nctx.rev: 몇 번째 적용인지", "apply: async (values, ctx) => {\n  await saveSettings({ ...DEFAULTS, ...values });\n},"],
  install: ["설치·내려받기", "설치를 누르면 RisuAI가 설치 확인 창을 띄워요. 허락하면 플러그인 목록에 들어가요(같은 이름이면 덮어씀). 적용하려면 새로고침이 필요할 수 있어요.\n내려받기는 .js 파일로 저장해요. RisuAI 설정 → 플러그인에서 직접 가져올 수도 있어요.\n작성 중인 코드는 자동으로 임시 저장돼요.", ""]
};
export var HELP_ORDER = ["header", "snippet", "body", "fields", "presets", "getValues", "apply", "id", "install"];
