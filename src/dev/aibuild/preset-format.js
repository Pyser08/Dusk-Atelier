// 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식. 원작자 허락. 원본은 저장소 ref/botbuilder 브랜치.
import { sha2562, gcm } from '../../vendor/noble.js';
import { Decompress } from '../../vendor/fflate-full.js';
import { assert, clone, bytes } from './util.js';
import msgpackrLib from '../../vendor/msgpackr.js';
  var rpackMap = Uint8Array.from(atob("xA0eC70rP1X8RW71ZlNPGuC7MJSGumu/QVBvm+/etxBhFyDfMomonW2ryZAADF2v0sFW5RZkkYJldJfKI9ZS0f+0oOgvilg4WmAZlknb18g7PkNLpWNHqmopkvQVz2I0eNMdPOIFjipXDhvNTC3yQCwleUgPsnq1p2w35px7VH7+h9yaAuQzouuxLgPdmaaw59WIGIN89r7hXJ/DIUYfCE7QdhJf7v2PROqjXosoCTWeacwKx4UHrUrzd+ln1NqEgJO2TXP6JyZ/BMb78XI5UcI2qWis+O3FucvOdaQ9gdlCcByVEbzYjJj5WaET9xR9s+xxwOON8AGuWzEGJCI6uCz3hIvJZfu2n66zAy0BaXQf5KPs7lw0IZNKD2riYgKeIpz9PPxxx8atWWcFcG2KRBL6JIZfr9F6R87+UGPdUQZvGOBSqAmdVnNMuFNsw6AOGc8+DX4HMmhG6kj5mS6rpEkgXlU1OAy807FYFnkoChrh8s3EOduiumBydn2V73/IwN43lL+1FIGSJUWs5/Vmpys2WsET40s66I2DG3wnsJpC64eq3FSOeCbSVynUt/gvj4l18EF3wh7/2BUR5QSXF/Mx0JsA18q0Tyo72bJr2l2hPzBhvZE9Tubfvk2CjB0jEJhk9IUze5BDu6mI8dalHPbMbrlbC5bt1enFywimgEA="), (c) => c.charCodeAt(0));
  var import_index_no_eval = msgpackrLib;
  var PRESET_LIMIT = 8 * 1024 * 1024;
  var key = sha2562(new TextEncoder().encode("risupreset"));
  function expand(data) {
    const chunks = [];
    let size = 0;
    const inflater = new Decompress((chunk) => {
      size += chunk.length;
      assert(size <= PRESET_LIMIT, "프리셋 압축 해제 크기가 8MiB를 초과했습니다.");
      chunks.push(chunk);
    });
    for (let i = 0; i < data.length; i += 2048) inflater.push(data.subarray(i, i + 2048), i + 2048 >= data.length);
    const output = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  }
  function checkTree(value, depth = 0, count = { n: 0 }) {
    assert(depth < 70 && ++count.n < 2e5, "프리셋의 데이터 구조가 너무 큽니다.");
    if (!value || typeof value !== "object") return;
    for (const [k, v] of Object.entries(value)) {
      assert(!["__proto__", "constructor", "prototype"].includes(k), "허용하지 않는 프리셋 키: " + k);
      checkTree(v, depth + 1, count);
    }
  }
  var allowed = ["name", "description", "mainPrompt", "jailbreak", "jailbreakToggle", "chainOfThought", "globalNote", "promptTemplate", "formatingOrder", "customPromptTemplateToggle", "templateDefaultVariables", "promptSettings", "promptBlockOverlay", "moduleIntergration", "regex"];
  function normalizePreset(raw) {
    assert(raw && typeof raw === "object" && !Array.isArray(raw), "프리셋 객체가 필요합니다.");
    checkTree(raw);
    assert(["promptTemplate", "mainPrompt", "formatingOrder", "customPromptTemplateToggle"].some((k) => Object.hasOwn(raw, k)), "프롬프트 프리셋 필드를 찾지 못했습니다.");
    const result = {};
    for (const k of allowed) if (Object.hasOwn(raw, k)) result[k] = clone(raw[k]);
    for (const k of ["name", "description", "mainPrompt", "jailbreak", "globalNote", "customPromptTemplateToggle", "templateDefaultVariables", "moduleIntergration"]) {
      if (result[k] === void 0) result[k] = "";
      assert(typeof result[k] === "string", "프리셋 문자열 형식 오류: " + k);
    }
    result.name ||= "가져온 프리셋";
    for (const k of ["jailbreakToggle", "chainOfThought"]) if (k in result) assert(typeof result[k] === "boolean", "프롬프트 활성화 설정 형식 오류: " + k);
    if (result.regex !== void 0) assert(Array.isArray(result.regex), "프리셋 정규식은 배열이어야 합니다.");
    if (result.promptBlockOverlay !== void 0) assert(result.promptBlockOverlay && typeof result.promptBlockOverlay === "object" && !Array.isArray(result.promptBlockOverlay), "오버레이 설정은 객체여야 합니다.");
    if (result.promptSettings !== void 0) assert(result.promptSettings && typeof result.promptSettings === "object" && !Array.isArray(result.promptSettings), "프롬프트 옵션은 객체여야 합니다.");
    if (result.promptTemplate == null) result.promptTemplate = legacyBlocks(result);
    assert(Array.isArray(result.promptTemplate) && result.promptTemplate.length <= 500, "프롬프트 블록은 500개 이하 배열이어야 합니다.");
    for (const b of result.promptTemplate) {
      assert(b && typeof b === "object" && !Array.isArray(b) && typeof b.type === "string", "잘못된 프롬프트 블록입니다.");
      for (const k of ["text", "innerFormat", "defaultText", "name"]) if (k in b) assert(typeof b[k] === "string", "블록 문자열 형식 오류: " + k);
      if ("enabled" in b) assert(typeof b.enabled === "boolean", "블록 활성화 형식이 올바르지 않습니다.");
    }
    assert(bytes(JSON.stringify(result)) <= PRESET_LIMIT, "프리셋이 8MiB를 초과했습니다.");
    return result;
  }
  function legacyBlocks(p) {
    const order = p.formatingOrder ?? ["main", "description", "personaPrompt", "lorebook", "chats", "lastChat", "globalNote", "authorNote"];
    assert(Array.isArray(order), "구형 프롬프트 순서가 올바르지 않습니다.");
    return order.map((type) => {
      if (["main", "jailbreak", "globalNote"].includes(type)) return { type: "plain", type2: type === "jailbreak" ? "normal" : type, name: type, role: "system", text: p[type === "main" ? "mainPrompt" : type] ?? "" };
      if (type === "chats") return { type: "chat", rangeStart: 0, rangeEnd: -1 };
      if (type === "lastChat") return { type: "chat", rangeStart: -1, rangeEnd: "end" };
      if (type === "personaPrompt") return { type: "persona" };
      if (type === "authorNote") return { type: "authornote" };
      return { type };
    });
  }
  function decodePreset(data, name = "preset.risup") {
    assert(data instanceof Uint8Array && data.length <= PRESET_LIMIT, "프리셋 파일은 8MiB 이하만 지원합니다.");
    let raw;
    if (/\.(risup|risupreset)$/i.test(name)) {
      const packed = /\.risup$/i.test(name) ? data.map((x) => rpackMap[x + 256]) : data;
      let wrapper;
      try {
        wrapper = (0, import_index_no_eval.decode)(expand(packed));
      } catch (error) {
        throw new Error("프리셋 압축·MessagePack을 읽지 못했습니다: " + error.message);
      }
      assert(wrapper && [0, 2].includes(wrapper.presetVersion) && wrapper.type === "preset", "지원하지 않는 프리셋 파일 버전입니다.");
      const encrypted = wrapper.preset ?? wrapper.pres;
      assert(encrypted instanceof Uint8Array && encrypted.length <= PRESET_LIMIT, "암호화된 프리셋 본문이 올바르지 않습니다.");
      try {
        raw = (0, import_index_no_eval.decode)(gcm(key, new Uint8Array(12)).decrypt(encrypted));
      } catch {
        throw new Error("프리셋 복호화·본문 해석에 실패했습니다. 파일 손상 또는 지원하지 않는 형식입니다.");
      }
    } else {
      try {
        raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
      } catch {
        throw new Error("UTF-8 프리셋 JSON을 읽지 못했습니다.");
      }
    }
    const result = normalizePreset(raw);
    for (const block of result.promptTemplate) {
      delete block.workshopError;
      delete block.workshopDraft;
    }
    return result;
  }

export { rpackMap, import_index_no_eval, PRESET_LIMIT, key, expand, checkTree, allowed, normalizePreset, legacyBlocks, decodePreset };
