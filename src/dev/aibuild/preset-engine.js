// 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식. 원작자 허락. 원본은 저장소 ref/botbuilder 브랜치.
import { assert, clone, bytes } from './util.js';
import { normalizePreset, PRESET_LIMIT } from './preset-format.js';
import { normalizeModules, validateModuleOptions, activeModules, moduleMatches, moduleOptions, moduleRuntimeProfile, presetRegexProfile } from './modules.js';
import { parseToggleTree, toggleDefault } from './preset-v2.js';
import { calculatePreset } from './preset-calc.js';
import { parseVariables } from './core.js';
  function newPresetState() {
    return { schemaVersion: 1, mode: "direct", preset: null, modules: [], moduleOptions: {}, values: {}, selected: 0, pane: "blocks", environment: { userName: "사용자", persona: "", authorNote: "", memory: "", globals: {} }, excluded: { regex: false, modules: false, overlay: false } };
  }
  function validatePresetState(raw) {
    assert(raw?.schemaVersion === 1 && ["direct", "preset"].includes(raw.mode), "지원하지 않는 공방 프리셋 설정입니다.");
    const result = { ...newPresetState(), ...clone(raw) };
    if (result.preset) result.preset = normalizePreset(result.preset);
    assert(result.values && typeof result.values === "object" && !Array.isArray(result.values), "토글 값 형식이 올바르지 않습니다.");
    result.environment = { ...newPresetState().environment, ...result.environment };
    for (const key2 of ["userName", "persona", "authorNote", "memory"]) assert(typeof result.environment[key2] === "string", "프리셋 참고자료 형식 오류: " + key2);
    assert(result.environment.globals && typeof result.environment.globals === "object" && !Array.isArray(result.environment.globals), "추가 전역 변수는 JSON 객체여야 합니다.");
    for (const values of [result.values, result.environment.globals]) for (const [key2, value] of Object.entries(values)) {
      assert(!["__proto__", "constructor", "prototype"].includes(key2) && typeof value === "string", "변수의 키·값이 올바르지 않습니다.");
    }
    result.excluded = { ...newPresetState().excluded, ...result.excluded };
    for (const key2 of ["regex", "modules", "overlay"]) assert(typeof result.excluded[key2] === "boolean", "제외 설정은 참/거짓이어야 합니다: " + key2);
    result.modules = normalizeModules(result.modules ?? []);
    result.moduleOptions ??= {};
    result.moduleOptions = validateModuleOptions(result);
    assert(bytes(JSON.stringify(result)) <= PRESET_LIMIT * 2, "프리셋 작업 상태가 너무 큽니다.");
    return result;
  }
  function toggleDefinitions(preset, modules = []) {
    const items = [], definitions = [], known = /* @__PURE__ */ new Map();
    for (const source of [{ name: "프리셋", text: preset?.customPromptTemplateToggle ?? "", preset: true }, ...modules.map((m) => ({ name: m.name, text: m.customModuleToggle }))]) {
      const tree2 = parseToggleTree(source.text), names = /* @__PURE__ */ new Set(), duplicates = /* @__PURE__ */ new Set();
      for (const d of tree2.definitions) {
        assert(!names.has(d.key), "중복 토글 키: " + d.rawKey + " (" + source.name + ")");
        names.add(d.key);
        assert(!/[{}\r\n]/.test(d.key) && !d.key.includes("::"), "토글 키에 중괄호·줄바꿈·::를 사용할 수 없습니다.");
        const previous = known.get(d.key);
        if (previous) {
          assert(previous.type === d.type && JSON.stringify(previous.options) === JSON.stringify(d.options), "프리셋·모듈 간 토글 형식 충돌: " + d.rawKey);
          previous.sources.push(source.name);
          duplicates.add(d);
        } else {
          d.sources = [source.name];
          known.set(d.key, d);
          definitions.push(d);
        }
      }
      const filter = (nodes) => nodes.filter((node) => node.type !== "toggle" || !duplicates.has(node.definition)).map((node) => node.type === "group" ? { ...node, children: filter(node.children) } : node);
      const children = filter(tree2.items);
      if (source.preset) items.push(...children);
      else if (children.length) items.push({ type: "group", label: "모듈 · " + source.name, children });
    }
    assert(definitions.length <= 300, "프리셋과 모듈을 합쳐 토글은 300개 이하만 지원합니다.");
    return { items, definitions };
  }
  function presetValues(state) {
    const r = { ...state.environment.globals };
    for (const d of toggleDefinitions(state.preset, activeModules(state)).definitions) {
      const value = state.values[d.key] ?? toggleDefault(d);
      if (d.type === "switch") assert(["0", "1"].includes(value), "스위치 토글 값은 0/1이어야 합니다: " + d.rawKey);
      if (d.type === "select") assert(/^\d+$/.test(value) && Number(value) < d.options.length, "선택형 토글 값이 올바르지 않습니다: " + d.rawKey);
      r[d.key] = value;
    }
    return r;
  }
  function tokenize(source) {
    assert(source.length <= 1048576, "블록 원문이 1MiB를 초과했습니다.");
    let position = 0, count = 0;
    function pieces(depth, inMacro) {
      assert(depth < 50, "CBS 중첩이 너무 깊습니다.");
      const parts = [[]];
      let text = "";
      const flush = () => {
        if (text) {
          parts.at(-1).push({ kind: "text", text });
          text = "";
        }
      };
      while (position < source.length) {
        assert(++count < 2e6, "CBS 처리 한도에 도달했습니다.");
        if (source.startsWith("{{", position)) {
          flush();
          position += 2;
          const nested = pieces(depth + 1, true);
          parts.at(-1).push({ kind: "macro", parts: nested });
        } else if (inMacro && source.startsWith("}}", position)) {
          flush();
          position += 2;
          return parts;
        } else if (inMacro && source.startsWith("::", position)) {
          flush();
          parts.push([]);
          position += 2;
        } else {
          text += source[position++];
        }
      }
      flush();
      assert(!inMacro, "CBS 닫는 중괄호가 없습니다.");
      return parts;
    }
    const nodes = pieces(0, false)[0];
    let cursor = 0;
    function group(closing, depth = 0) {
      assert(depth < 50, "CBS 블록 중첩이 너무 깊습니다.");
      const children = [];
      while (cursor < nodes.length) {
        const node = nodes[cursor++], head = node.kind === "macro" ? (node.parts[0][0]?.text ?? "").trim() : "";
        if (["else", "#else", ":else"].includes(head)) {
          assert(closing, "단독 else 문입니다.");
          const before = children.at(-1), after = nodes[cursor];
          const elseLine = head === ":else" && closing === "when" && (!before || before.kind === "text" && /(?:^|\n)[ \t]*$/.test(before.text)) && (!after || after.kind === "text" && /^[ \t]*(?:\r?\n|$)/.test(after.text));
          return { children, otherwise: true, elseLine };
        }
        if (head.startsWith("/") && !head.startsWith("//")) {
          assert(closing, "열린 CBS 블록이 없는 닫는 태그입니다: " + head);
          return { children, otherwise: false };
        }
        if (head.startsWith("#")) {
          const name = head.split(/\s/)[0].slice(1), first = group(name, depth + 1);
          const second = first.otherwise ? group(name, depth + 1) : { children: [] };
          children.push({ kind: "block", name, opening: node, yes: first.children, no: second.children, elseLine: first.elseLine });
        } else children.push(node);
      }
      assert(!closing, "CBS 블록 닫는 태그가 없습니다: " + closing);
      return { children };
    }
    return group(null).children;
  }
  var truth = (value) => value === "1" || value === "true";
  function whenCondition(values, context) {
    const stack = [...values];
    let mode = "normal";
    const global = (key2) => {
      assert(Object.hasOwn(context.globals, key2), "값이 없는 전역 변수: " + key2);
      return context.globals[key2];
    };
    const local = (key2) => Object.hasOwn(context.variables, key2) ? context.variables[key2] : "null";
    while (stack.length > 1) {
      const b = stack.pop(), op = stack.pop();
      let value;
      const left = () => {
        assert(stack.length, "CBS 조건식의 왼쪽 값이 없습니다: " + op);
        return stack.pop();
      };
      if (op === "keep" || op === "legacy") {
        mode = op;
        stack.push(b);
        continue;
      }
      switch (op) {
        case "not":
          value = !truth(b);
          break;
        case "and":
          value = truth(left()) && truth(b);
          break;
        case "or":
          value = truth(left()) || truth(b);
          break;
        case "is":
          value = left() === b;
          break;
        case "isnot":
          value = left() !== b;
          break;
        case ">":
          value = parseFloat(left()) > parseFloat(b);
          break;
        case "<":
          value = parseFloat(left()) < parseFloat(b);
          break;
        case ">=":
          value = parseFloat(left()) >= parseFloat(b);
          break;
        case "<=":
          value = parseFloat(left()) <= parseFloat(b);
          break;
        case "var":
          value = truth(local(b));
          break;
        case "toggle":
          value = truth(global("toggle_" + b));
          break;
        case "vis":
          value = local(left()) === b;
          break;
        case "visnot":
          value = local(left()) !== b;
          break;
        case "tis":
          value = global("toggle_" + left()) === b;
          break;
        case "tisnot":
          value = global("toggle_" + left()) !== b;
          break;
        default:
          throw new Error("지원하지 않는 CBS 조건 연산자: " + op);
      }
      stack.push(value ? "1" : "0");
    }
    return { active: truth(stack[0]), mode };
  }
  var trimLines = (text) => text.split("\n").map((line) => line.trimStart()).join("\n").trim();
  function trimBlankLines(text) {
    const lines = text.split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    return lines.join("\n");
  }
  function evaluate(nodes, context) {
    const render = (list) => {
      let out2 = "";
      for (const node of list) {
        out2 += one(node);
        assert(out2.length <= 2097152, "CBS 출력 상한을 초과했습니다.");
      }
      return out2;
    };
    const part = (p) => render(p);
    function one(node) {
      if (node.kind === "text") return node.text;
      if (node.kind === "block") {
        assert(["if", "if_pure", "when"].includes(node.name), "지원하지 않는 CBS 블록: #" + node.name);
        let active, mode = node.name === "if_pure" ? "keep" : "legacy";
        if (node.name === "when") {
          const values = node.opening.parts.length > 1 ? node.opening.parts.slice(1).map(part) : [part(node.opening.parts[0]).replace(/^#when\s*/, "")];
          ({ active, mode } = whenCondition(values, context));
        } else active = truth(part(node.opening.parts[0]).replace(/^#if(?:_pure)?\s*/, ""));
        let text = render(active ? node.yes : node.no);
        if (node.elseLine) text = active ? text.replace(/(?:\r?\n)?[ \t]*$/, "") : text.replace(/^[ \t]*\r?\n/, "");
        return mode === "keep" ? text : mode === "legacy" ? trimLines(text) : trimBlankLines(text);
      }
      const rawHead = part(node.parts[0]), head = rawHead.trim(), name = head.toLowerCase(), args = node.parts.slice(1).map(part);
      if (name.replace(/[\s_-]/g, "") === "userinput") {
        if (context.nativeLiterals && context.nativeLiterals.size < 10) context.nativeLiterals.add(head);
        return "{{" + [rawHead, ...args].join("::") + "}}";
      }
      if (head.startsWith("? ")) return calculatePreset(head.slice(2), context);
      if (name === "calc") {
        assert(args.length === 1, "calc 인자 오류");
        return calculatePreset(args[0], context);
      }
      if (head.startsWith("//") || head.startsWith("!")) return "";
      if (Object.hasOwn(context.fields, name)) {
        assert(!args.length, "인자 없는 CBS 표기입니다: " + head);
        if (name === "lorebook" && context.loreUsage) context.loreUsage.used = true;
        return context.fields[name];
      }
      if (["moduleenabled", "module_enabled"].includes(name)) {
        assert(args.length === 1, "moduleenabled 인자 오류");
        return (context.modules ?? []).some((m) => m.namespace === args[0]) ? "1" : "0";
      }
      if (["moduleassetlist", "module_assetlist"].includes(name)) {
        assert(args.length === 1, "moduleassetlist 인자 오류");
        const module = (context.modules ?? []).find((m) => m.namespace === args[0]);
        return module ? JSON.stringify(module.assets.map((a) => a[0].replace(/::/g, "\\u003A\\u003A"))) : "";
      }
      if (name === "getglobalvar") {
        assert(args.length === 1, "getglobalvar 인자 오류");
        assert(Object.hasOwn(context.globals, args[0]), "값이 없는 전역 변수: " + args[0] + " (토글 또는 추가 전역 변수에서 설정하세요)");
        return context.globals[args[0]];
      }
      if (name === "getvar") {
        assert(args.length === 1, "getvar 인자 오류");
        return Object.hasOwn(context.variables, args[0]) ? context.variables[args[0]] : "null";
      }
      if (["equal", "notequal", "greater", "greater_equal", "less", "less_equal"].includes(name)) {
        assert(args.length === 2, "비교식에는 값 2개가 필요합니다: " + name);
        const [a, b] = args;
        if (name === "equal") return a === b ? "1" : "0";
        if (name === "notequal") return a !== b ? "1" : "0";
        const x = Number(a), y = Number(b);
        assert(Number.isFinite(x) && Number.isFinite(y), "숫자 비교에 숫자가 아닌 값이 있습니다.");
        return { greater: x > y, greater_equal: x >= y, less: x < y, less_equal: x <= y }[name] ? "1" : "0";
      }
      if (name === "and") {
        assert(args.length === 2, "and 인자 오류");
        return args[0] === "1" && args[1] === "1" ? "1" : "0";
      }
      if (name === "or") {
        assert(args.length === 2, "or 인자 오류");
        return args[0] === "1" || args[1] === "1" ? "1" : "0";
      }
      if (name === "not") {
        assert(args.length === 1, "not 인자 오류");
        return args[0] === "1" ? "0" : "1";
      }
      if (name === "trim") {
        if (args.length) return args.join("::").trim();
        context.trim = true;
        return "";
      }
      if (name === "lower") return args.join("::").toLowerCase();
      if (name === "upper") return args.join("::").toUpperCase();
      throw new Error("지원하지 않는 CBS: " + head);
    }
    const out = render(nodes);
    return context.trim ? out.trim() : out;
  }
  function renderPresetText(source, context) {
    const value = evaluate(tokenize(source), { ...context, trim: false });
    assert(bytes(value) <= 2097152, "CBS 출력이 2MiB를 초과했습니다.");
    return value;
  }
  function range(block, count) {
    let start = block.rangeStart ?? 0, end = block.rangeEnd ?? "end";
    assert(Number.isInteger(start) && (end === "end" || Number.isInteger(end)), "채팅 범위가 올바르지 않습니다.");
    if (start === -1e3) return [0, count];
    if (end === "end") end = count;
    if (start < 0) start = Math.max(0, count + start);
    if (end < 0) end = Math.max(0, count + end);
    return [start, Math.min(end, count)];
  }
  var roles = { system: "system", user: "user", bot: "assistant", assistant: "assistant" };
  var role = (value) => Object.hasOwn(roles, value) ? roles[value] : void 0;
  var BLOCK_TYPES = [["plain", "일반 프롬프트"], ["chat", "제작 대화"], ["description", "캐릭터 설명"], ["persona", "페르소나"], ["lorebook", "로어북"], ["authornote", "작가 노트"], ["postEverything", "마지막 지시"], ["memory", "메모리 입력"], ["chatML", "ChatML"], ["jailbreak", "구형 추가 프롬프트"], ["cot", "구형 CoT 블록"], ["cache", "캐시 지점"]];
  var moduleReferences = (preset) => [...new Set((preset?.moduleIntergration ?? "").split(",").map((id) => id.trim()).filter(Boolean))];
  function assemblePreset(rawState, session, task, directMessages) {
    const state = validatePresetState(rawState), p = state.preset;
    assert(p, "먼저 프리셋 파일을 가져오세요.");
    const globals = presetValues(state), variables2 = { ...parseVariables(p.templateDefaultVariables), ...parseVariables(session.draft.defaultVariables ?? "") };
    const d = session.draft, env = state.environment;
    let lore = (d.globalLore ?? []).map((l) => "[" + (l.comment || l.key) + "]\n" + l.content).join("\n\n");
    const currentUser = { role: "user", content: "[공방 작업 지침]\n" + directMessages[0].content + "\n\n" + directMessages[1].content };
    const history = session.thread.filter((m) => !m.error && ["user", "assistant"].includes(m.role)).map((m) => ({ role: m.role, content: m.content }));
    const chats = [...history, currentUser];
    const context = { globals, variables: variables2, fields: { char: d.name ?? "", user: env.userName, description: d.desc ?? "", personality: d.personality ?? "", scenario: d.scenario ?? "", persona: env.persona, firstmessage: d.firstMessage ?? "", first_message: d.firstMessage ?? "", systemprompt: d.systemPrompt ?? "", lorebook: lore, chatindex: String(chats.length - 1), lastusermessage: currentUser.content, lastcharmessage: history.findLast((m) => m.role === "assistant")?.content ?? "", original: p.mainPrompt, slot: "" } };
    const messages = [], trace = [], issues = [], moduleTrace = [], presetRegexTrace = [], selectedModules = activeModules(state);
    let userCount = 0;
    const missing = moduleReferences(p).filter((ref) => !selectedModules.some((module) => moduleMatches(module, ref)));
    if (missing.length && !state.excluded.modules) issues.push("프리셋 참조 모듈이 선택되지 않았습니다 (" + missing.join(", ") + "). 설치 모듈 선택에서 불러오거나 참고자료에서 모듈 연동 전체 제외를 선택하세요. 제외한 모듈은 요청에 포함되지 않습니다.");
    context.modules = selectedModules;
    context.loreUsage = { used: false };
    context.nativeLiterals = /* @__PURE__ */ new Set();
    const moduleLore = [];
    let moduleSize = 0;
    for (const module of state.modules) {
      const options = moduleOptions(state, module), profile = moduleRuntimeProfile(module), features = profile.blocking;
      if (state.excluded.modules) {
        moduleTrace.push({ module: module.name, status: "excluded", reason: "모듈 연동 전체 제외" });
        continue;
      }
      if (profile.notApplicable.length) moduleTrace.push({ module: module.name, type: "runtime", status: "not-applicable", features: profile.notApplicable, items: profile.items.filter((item) => item.status === "not-applicable") });
      if (features.length) {
        const status = options.skipRuntime ? "excluded" : "error";
        moduleTrace.push({ module: module.name, type: "runtime", status, features, items: profile.items.filter((item) => item.status === "unsupported") });
        if (!options.skipRuntime) issues.push(module.name + ": " + features.join(", ") + " 실행은 지원하지 않습니다. 모듈 탭의 정규식·트리거 처리 내역을 확인하고 필요한 처리를 지원하거나 명시적으로 제외해야 합니다.");
      }
      for (const [index, entry] of module.lorebook.entries()) {
        const record = { module: module.name, index, name: entry.comment || entry.key || "로어북", status: "excluded" };
        moduleTrace.push(record);
        if (options.excludedLore.includes(index)) continue;
        let text;
        try {
          assert(!/(?:^|\n)\s*@@/.test(entry.content), "@@ 위치·활성화 지시 처리는 미지원입니다. 모듈 탭에서 이 항목을 제외하세요.");
          text = renderPresetText(entry.content, context);
          record.status = text ? "prepared" : "empty";
        } catch (error) {
          record.status = "error";
          record.error = error.message;
          issues.push(module.name + " / " + record.name + ": " + error.message);
          continue;
        }
        moduleSize += bytes(text);
        assert(moduleSize <= 4 * 1024 * 1024, "모듈 로어북 조립 결과가 4MiB를 초과했습니다.");
        if (text) moduleLore.push("[모듈 " + module.name + " · " + record.name + "]\n" + text);
      }
    }
    lore = [lore, ...moduleLore].filter(Boolean).join("\n\n");
    context.fields.lorebook = lore;
    context.loreUsage.used = false;
    if (p.regex?.length) {
      const profile = presetRegexProfile(p.regex);
      presetRegexTrace.push(...profile.items.map((item) => ({ ...item, status: state.excluded.regex ? "excluded" : item.status === "unsupported" ? "error" : "not-applicable" })));
      if (profile.blocking.length && !state.excluded.regex) issues.push("프리셋 정규식: " + profile.blocking.join(", ") + " 처리는 아직 지원하지 않습니다. 참고자료에서 정규식 처리 내역을 확인하고 명시적으로 제외해야 합니다.");
    }
    if (p.promptBlockOverlay?.enabled && !state.excluded.overlay) issues.push("보조 프롬프트 오버레이는 미지원입니다. 제외 여부를 설정하세요.");
    for (const option of ["sendChatAsSystem", "sendName", "utilOverride", "customChainOfThought"]) if (p.promptSettings?.[option]) issues.push("미지원 프롬프트 옵션: " + option + " (고급 JSON에서 해제하세요)");
    let size = 0;
    const push = (r, content, blockIndex, current = false) => {
      assert(role(r), "지원하지 않는 메시지 역할: " + r);
      size += bytes(content);
      assert(size <= 4 * 1024 * 1024, "조립된 프롬프트가 4MiB 상한을 초과했습니다.");
      if (current) userCount++;
      if (content) messages.push({ role: role(r), content });
      assert(messages.length <= 3e3, "전송 메시지가 3,000개를 초과했습니다.");
    };
    for (const [i, b] of p.promptTemplate.entries()) {
      const record = { index: i, name: b.name || b.type, type: b.type, status: "excluded", messages: 0 };
      trace.push(record);
      if (b.enabled === false) continue;
      if (b.type === "jailbreak" && p.jailbreakToggle === false || b.type === "cot" && p.chainOfThought === false) {
        record.reason = "프리셋의 구형 블록 활성화 설정이 꺼져 있습니다.";
        continue;
      }
      const before = messages.length;
      try {
        assert(!b.workshopError, b.workshopError);
        if (["plain", "jailbreak", "cot"].includes(b.type)) push(b.role ?? "system", renderPresetText(b.text ?? "", context), i);
        else if (b.type === "chat") {
          const [start, end] = range(b, chats.length);
          for (const m of chats.slice(start, Math.max(start, end))) push(m.role, m.content, i, m === currentUser);
        } else if (["description", "persona", "lorebook", "authornote", "memory", "postEverything"].includes(b.type)) {
          const values = { description: d.desc ?? "", persona: env.persona, lorebook: lore, authornote: env.authorNote || b.defaultText || "", memory: env.memory, postEverything: p.promptSettings?.postEndInnerFormat ?? "" };
          let text = values[b.type];
          if (text && (b.type === "postEverything" || b.type === "authornote" && !env.authorNote)) text = renderPresetText(text, context);
          if (text && b.innerFormat) {
            assert(b.innerFormat.includes("{{slot}}"), "감싸는 서식에 {{slot}}이 없습니다.");
            text = renderPresetText(b.innerFormat, { ...context, fields: { ...context.fields, slot: text } });
          }
          push(b.role2 ?? "system", text, i);
          if (b.type === "lorebook" && text) context.loreUsage.used = true;
        } else if (b.type === "chatML") {
          const text = renderPresetText(b.text ?? "", context), regex = /<\|im_start\|>(system|user|assistant)\r?\n([\s\S]*?)(?:<\|im_end\|>|$)/g;
          let match, position = 0;
          while (match = regex.exec(text)) {
            assert(!text.slice(position, match.index).trim(), "ChatML 시작 표기 앞에 해석할 수 없는 내용이 있습니다.");
            push(match[1], match[2], i);
            position = regex.lastIndex;
          }
          assert(position > 0 && !text.slice(position).trim(), "지원하지 않는 ChatML 형식입니다.");
        } else if (b.type === "cache") {
          const depth = b.depth ?? 1, filter = b.role ?? "all";
          assert(Number.isInteger(depth) && depth >= 0 && depth <= 3e3, "캐시 깊이는 0~3,000 정수여야 합니다.");
          assert(["system", "user", "assistant", "all"].includes(filter), "지원하지 않는 캐시 대상 역할: " + filter);
          record.status = "metadata";
          record.targets = [];
          for (let pointer = messages.length - 1; pointer >= 0 && record.targets.length < depth; pointer--) if (filter === "all" || messages[pointer].role === filter) {
            messages[pointer].cachePoint = true;
            record.targets.push(pointer);
          }
          record.reason = "앞선 메시지의 cachePoint 표식만 설정합니다. 실제 캐시는 본체·모델 제공자 설정을 따릅니다.";
          continue;
        } else throw new Error("지원하지 않는 블록 유형: " + b.type);
        record.status = messages.length > before ? "included" : "empty";
        record.messages = messages.length - before;
      } catch (error) {
        record.status = "error";
        record.error = error.message;
        issues.push(i + 1 + ". " + record.name + ": " + error.message);
      }
    }
    if (p.promptSettings?.assistantPrefill) {
      try {
        push("assistant", renderPresetText(p.promptSettings.assistantPrefill, context), -1);
      } catch (error) {
        issues.push("Assistant prefill: " + error.message);
      }
    }
    if (userCount !== 1) issues.push("이번 공방 요청을 포함하는 채팅 블록이 정확히 1개여야 합니다. 현재 " + userCount + "회 포함됐습니다.");
    if (moduleLore.length && !context.loreUsage.used) issues.push("선택 모듈의 로어북을 포함하는 블록이 없습니다. 로어북 블록 또는 {{lorebook}}을 사용하는 블록을 추가하세요.");
    for (const record of moduleTrace) if (record.status === "prepared") record.status = context.loreUsage.used ? "included" : "not-included";
    const notes = ["로어북 블록은 공방 현재안과 선택 모듈의 전체 포함 항목을 사용합니다. 본체의 키워드 활성화·토큰 예산 계산은 실행하지 않습니다.", "모듈 토글은 공방 값이며 선택한 모듈의 사본을 사용합니다. 본체 모듈 활성화와 자동 동기화하지 않습니다.", "페르소나·작가 노트·메모리는 이 프리셋 화면에서 입력한 값을 사용합니다. 본체 상태와 자동 동기화하지 않습니다."];
    if (context.nativeLiterals.size) notes.push("공식 내장 CBS로 정의되지 않은 " + [...context.nativeLiterals].map((name) => "{{" + name + "}}").join(", ") + " 표기를 리스처럼 원문으로 유지했습니다. 현재 사용자 요청문으로 치환한 것이 아닙니다.");
    return { messages, trace, moduleTrace, presetRegexTrace, issues, globals, notes };
  }

export { newPresetState, validatePresetState, toggleDefinitions, presetValues, tokenize, truth, whenCondition, trimLines, trimBlankLines, evaluate, renderPresetText, range, roles, role, BLOCK_TYPES, moduleReferences, assemblePreset };
