// 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식. 원작자 허락. 원본은 저장소 ref/botbuilder 브랜치.
import { assert, bytes } from './util.js';
  async function responseText(result, job) {
    assert(result !== null && result !== void 0, "모델 응답이 없습니다.");
    if (typeof result === "string") {
      assert(bytes(result) <= 1048576, "응답이 1MiB를 초과했습니다.");
      return result;
    }
    assert(result.type !== "fail", String(result.result ?? result.error ?? "모델 요청 실패"));
    if (typeof result.result === "string") return responseText(result.result, job);
    const stream = result.result?.getReader ? result.result : result.getReader ? result : null;
    assert(stream, "지원하지 않는 모델 응답 형식입니다.");
    const reader = stream.getReader();
    job.reader = reader;
    let current = "", decoder = new TextDecoder(), cumulative = false;
    try {
      while (true) {
        assert(!job.cancelled, "대기를 중단했습니다.");
        const { value, done } = await reader.read();
        if (done) break;
        if (typeof value === "string") current += value;
        else if (value instanceof Uint8Array) current += decoder.decode(value, { stream: true });
        else if (value && typeof value === "object" && typeof value["0"] === "string") {
          current = value["0"];
          cumulative = true;
        } else throw new Error("지원하지 않는 스트림 조각 형식입니다.");
        assert(bytes(current) <= 1048576, "응답이 1MiB를 초과했습니다.");
      }
      if (!cumulative) current += decoder.decode();
      assert(bytes(current) <= 1048576, "응답이 1MiB를 초과했습니다.");
      return current;
    } finally {
      if (job.cancelled) reader.cancel().catch(() => {
      });
      reader.releaseLock();
      job.reader = null;
    }
  }
  async function callModel(api2, messages, mode, timeoutSeconds, job) {
    assert(["model", "submodel"].includes(mode), "모델 선택이 올바르지 않습니다.");
    let timer;
    const stopped = new Promise((_, reject) => {
      job.stop = (message = "대기를 중단했습니다. 늦게 도착한 결과는 폐기합니다.") => {
        job.cancelled = true;
        job.reader?.cancel().catch(() => {
        });
        reject(new Error(message));
      };
      timer = setTimeout(() => job.stop("요청 대기 시간이 초과되었습니다. 늦게 도착한 결과는 폐기합니다."), timeoutSeconds * 1e3);
    });
    const work = Promise.resolve().then(() => api2.runLLMModel({ messages, mode, allowPlugins: true })).then((r) => responseText(r, job));
    try {
      return await Promise.race([work, stopped]);
    } finally {
      clearTimeout(timer);
      job.stop = null;
    }
  }
export { responseText, callModel };
