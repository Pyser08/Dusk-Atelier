// 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식. 원작자 허락. 원본은 저장소 ref/botbuilder 브랜치.
  var VERSION = "0.3.2";
  var PREFIX = "risu-character-editor:v1:";
  var FIELDS = ["name", "desc", "personality", "scenario", "systemPrompt", "postHistoryInstructions", "exampleMessage", "creatorNotes", "creator", "characterVersion", "tags", "firstMessage", "alternateGreetings", "globalLore", "customscript", "triggerscript", "defaultVariables", "additionalAssets"];
  var ARRAY_FIELDS = ["globalLore", "customscript", "triggerscript", "additionalAssets"];
  var dangerous = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
  var clone = (x) => x === void 0 ? void 0 : JSON.parse(JSON.stringify(x));
  var equal = (a, b) => stable(a) === stable(b);
  function stable(x) {
    if (x === void 0) return "undefined";
    if (x === null || typeof x !== "object") return JSON.stringify(x);
    if (Array.isArray(x)) return "[" + x.map(stable).join(",") + "]";
    return "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + stable(x[k])).join(",") + "}";
  }
  var uid = () => globalThis.crypto?.randomUUID?.() ?? "w-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  var bytes = (text) => new TextEncoder().encode(text).length;
  var tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function object(x, label) {
    assert(x && typeof x === "object" && !Array.isArray(x), label + ": 객체가 필요합니다.");
    for (const key2 of Object.keys(x)) assert(!dangerous.has(key2), "허용하지 않는 키: " + key2);
  }
  function keys(x, required, optional = []) {
    object(x, "응답");
    for (const k of required) assert(Object.hasOwn(x, k), "필수 필드 누락: " + k);
    for (const k of Object.keys(x)) assert([...required, ...optional].includes(k), "허용하지 않는 필드: " + k);
  }
  function str(x, label) {
    assert(typeof x === "string", label + ": 문자열이 필요합니다.");
  }
  function array(x, label) {
    assert(Array.isArray(x) && x.length <= 1e3, label + ": 1,000개 이하 배열이 필요합니다.");
  }
export { VERSION, PREFIX, FIELDS, ARRAY_FIELDS, dangerous, clone, equal, stable, uid, bytes, tick, assert, object, keys, str, array };
