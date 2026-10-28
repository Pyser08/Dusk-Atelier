// 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식. 원작자 허락. 원본은 저장소 ref/botbuilder 브랜치.
import { assert, bytes, clone, equal } from './util.js';
  var MODULE_LIMIT = 8 * 1024 * 1024;
  var badKeys = ["__proto__", "constructor", "prototype"];
  function tree(value, depth = 0, count = { n: 0 }) {
    assert(depth < 70 && ++count.n < 2e5, "모듈 데이터 구조가 너무 큽니다.");
    if (value && typeof value === "object") for (const [key2, item] of Object.entries(value)) {
      assert(!badKeys.includes(key2), "허용하지 않는 모듈 키: " + key2);
      tree(item, depth + 1, count);
    }
  }
  function normalizeModule(raw) {
    assert(raw && typeof raw === "object" && !Array.isArray(raw), "설치 모듈 객체가 필요합니다.");
    assert(typeof raw.id === "string" && raw.id.trim() && !badKeys.includes(raw.id), "모듈 ID가 없거나 올바르지 않습니다.");
    const result = {};
    for (const key2 of ["id", "name", "namespace", "description", "customModuleToggle", "cjs", "backgroundEmbedding"]) {
      const value = raw[key2] ?? "";
      assert(typeof value === "string", "모듈 문자열 형식 오류: " + key2);
      result[key2] = value;
    }
    result.name ||= result.id;
    for (const key2 of ["lorebook", "regex", "trigger", "assets"]) {
      const value = raw[key2] ?? [];
      assert(Array.isArray(value) && value.length <= 3e3, "모듈 배열 형식 또는 개수 오류: " + key2);
      result[key2] = value;
    }
    if (raw.mcp != null) result.mcp = raw.mcp;
    tree(result);
    assert(bytes(JSON.stringify(result)) <= MODULE_LIMIT, "모듈 한 개의 데이터가 8MiB를 초과했습니다.");
    for (const entry of result.lorebook) assert(entry && typeof entry === "object" && !Array.isArray(entry) && typeof entry.content === "string", "모듈 로어북 본문이 올바르지 않습니다.");
    for (const asset of result.assets) assert(Array.isArray(asset) && typeof asset[0] === "string", "모듈 에셋 이름 형식이 올바르지 않습니다.");
    return clone(result);
  }
  function normalizeModules(raw = []) {
    assert(Array.isArray(raw) && raw.length <= 100, "선택 모듈은 100개 이하 배열이어야 합니다.");
    const modules = raw.map(normalizeModule), ids = /* @__PURE__ */ new Set();
    for (const module of modules) {
      assert(!ids.has(module.id), "선택 모듈 ID가 중복됩니다: " + module.id);
      ids.add(module.id);
    }
    assert(modules.reduce((n, module) => n + module.lorebook.length, 0) <= 3e3, "선택 모듈의 로어북 합계는 3,000개 이하만 지원합니다.");
    assert(bytes(JSON.stringify(modules)) <= MODULE_LIMIT, "선택 모듈 합계가 8MiB를 초과했습니다.");
    return modules;
  }
  function moduleOptions(state, module) {
    const own = Object.hasOwn(state.moduleOptions ?? {}, module.id) ? state.moduleOptions[module.id] : {};
    return { skipRuntime: false, excludedLore: [], ...own };
  }
  function validateModuleOptions(state) {
    assert(state.moduleOptions && typeof state.moduleOptions === "object" && !Array.isArray(state.moduleOptions), "모듈 적용 설정은 객체여야 합니다.");
    tree(state.moduleOptions);
    const result = {};
    for (const module of state.modules) {
      const value = moduleOptions(state, module);
      assert(typeof value.skipRuntime === "boolean" && Array.isArray(value.excludedLore) && value.excludedLore.every((i) => Number.isInteger(i) && i >= 0 && i < module.lorebook.length), "모듈 적용 설정이 올바르지 않습니다: " + module.name);
      result[module.id] = { skipRuntime: value.skipRuntime, excludedLore: [...new Set(value.excludedLore)] };
    }
    return result;
  }
  var activeModules = (state) => state.excluded?.modules ? [] : state.modules ?? [];
  var moduleMatches = (module, reference) => module.id === reference || Boolean(module.namespace && module.namespace === reference);
  function moduleRuntimeProfile(module) {
    const items = [];
    const requestTriggerNames = { start: "시작 트리거", input: "입력 트리거", request: "요청 트리거" };
    const add = (kind, index, name, phase, category, blocking, reason) => items.push({ kind, index, name, phase, category, status: blocking ? "unsupported" : "not-applicable", reason });
    for (const [index, rule] of module.regex.entries()) {
      const name = rule?.comment || "정규식 " + (index + 1), phase = rule?.type ?? "unknown";
      if (phase === "editdisplay") add("regex", index, name, phase, "표시 정규식", false, "리스 채팅 화면의 표시 처리입니다. BB는 원문·수정안을 텍스트로 표시하므로 적용하지 않습니다.");
      else if (phase === "editoutput") add("regex", index, name, phase, "출력 정규식", false, "리스 채팅 응답의 후처리입니다. BB의 구조화된 JSON 응답에는 적용하지 않습니다.");
      else if (rule?.in === "") add("regex", index, name, phase, "빈 IN 정규식", false, "리스와 같이 빈 IN 규칙은 실행하지 않습니다.");
      else if (phase === "editinput") add("regex", index, name, phase, "입력 정규식", true, "입력문을 바꿀 수 있으나 BB 요청 파이프라인에서는 아직 지원하지 않습니다.");
      else if (phase === "editprocess") add("regex", index, name, phase, "전처리 정규식", true, "모델에 보내는 내용을 바꿀 수 있으나 아직 지원하지 않습니다.");
      else add("regex", index, name, phase, "유형 미확인 정규식", true, "적용 유형을 확인할 수 없어 요청과 무관하다고 판단하지 않았습니다.");
    }
    for (const [index, trigger] of module.trigger.entries()) {
      const name = trigger?.comment || "트리거 " + (index + 1), phase = trigger?.type ?? "unknown", first = trigger?.effect?.[0]?.type;
      if (first === "triggerlua" || first === "triggercode") add("trigger", index, name, phase, "Lua·JS 콜백 트리거", true, "코드 트리거는 실행 시점 표시와 별개로 콜백을 등록할 수 있어 코드 확인이 필요합니다.");
      else if (["manual", "display", "output"].includes(phase)) add("trigger", index, name, phase, { manual: "수동 트리거", display: "표시 트리거", output: "출력 트리거" }[phase], false, "리스 채팅의 수동·표시·응답 후처리 단계입니다. BB 제작 요청에서는 실행하지 않습니다.");
      else add("trigger", index, name, phase, Object.hasOwn(requestTriggerNames, phase) ? requestTriggerNames[phase] : "유형 미확인 트리거", true, "모델 요청이나 변수 상태를 바꿀 수 있으나 아직 지원하지 않습니다.");
    }
    if (module.cjs.trim()) add("cjs", 0, "모듈 JS", "script", "모듈 JS", true, "JS 실행·콜백 등록은 지원하지 않습니다.");
    if (module.mcp) add("mcp", 0, "MCP", "tools", "MCP", true, "모듈의 MCP 도구 연동은 지원하지 않습니다.");
    if (module.backgroundEmbedding.trim()) add("background", 0, "배경 코드", "display", "배경 화면 코드", false, "리스 화면을 꾸미는 코드입니다. BB는 배경 코드를 렌더링하거나 실행하지 않습니다.");
    const summarize = (status) => {
      const counts = /* @__PURE__ */ new Map();
      for (const item of items) if (item.status === status) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
      return [...counts].map(([name, count]) => name + " " + count + "개");
    };
    return { items, blocking: summarize("unsupported"), notApplicable: summarize("not-applicable") };
  }
  var presetRegexProfile = (regex) => moduleRuntimeProfile({ regex, trigger: [], cjs: "", backgroundEmbedding: "" });
  async function readInstalledModules(api2) {
    assert(typeof api2.getDatabase === "function", "이 호스트에는 설치 모듈 조회 API가 없습니다.");
    const db = await api2.getDatabase(["modules"]);
    assert(db && Array.isArray(db.modules), "설치 모듈 조회 권한이 필요하거나 호스트가 modules 조회를 지원하지 않습니다.");
    const seen = /* @__PURE__ */ new Set();
    return db.modules.filter((module) => module && typeof module.id === "string" && !seen.has(module.id) && seen.add(module.id));
  }
  function selectInstalledModules(state, catalog, ids) {
    const wanted = new Set(ids);
    assert([...wanted].every((id) => catalog.some((m) => m.id === id)), "설치 목록에 없는 모듈을 선택했습니다.");
    const modules = normalizeModules(catalog.filter((module) => wanted.has(module.id))), options = {};
    for (const module of modules) {
      const previous = (state.modules ?? []).find((old) => old.id === module.id);
      options[module.id] = previous && equal(previous, module) ? moduleOptions(state, module) : { skipRuntime: false, excludedLore: [] };
    }
    return { ...state, modules, moduleOptions: options, excluded: { ...state.excluded, modules: false } };
  }

export { MODULE_LIMIT, badKeys, tree, normalizeModule, normalizeModules, moduleOptions, validateModuleOptions, activeModules, moduleMatches, moduleRuntimeProfile, presetRegexProfile, readInstalledModules, selectInstalledModules };
