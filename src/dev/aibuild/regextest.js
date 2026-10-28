// 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식. 원작자 허락. 원본은 저장소 ref/botbuilder 브랜치.
import { assert, bytes, tick } from './util.js';
import { RE2JS } from '../../vendor/re2js.js';
  function expandReplacement(out, matcher, input, start, end, compiled) {
    const groupCount = matcher.groupCount();
    return out.replace(/\$([$&`']|<[^>]*>|[0-9]{1,2})/g, (whole, token) => {
      if (token === "$") return "$";
      if (token === "&") return matcher.group(0);
      if (token === "`") return input.slice(0, start);
      if (token === "'") return input.slice(end);
      if (token.startsWith("<")) {
        const name = token.slice(1, -1), names = compiled.namedGroups();
        if (!names.size && !Object.keys(names).length) return whole;
        try {
          return matcher.group(name) ?? "";
        } catch {
          return "";
        }
      }
      let n = Number(token);
      if (!n) return whole;
      if (n <= groupCount) return matcher.group(n) ?? "";
      if (token.length === 2 && Number(token[0]) <= groupCount) return (matcher.group(Number(token[0])) ?? "") + token[1];
      return whole;
    });
  }
  async function regexTest(rule, input, job = {}) {
    assert(rule.in.length <= 1024 && input.length <= 65536, "상한: 패턴 1,024자 / 입력 65,536자입니다.");
    assert(bytes(rule.out) <= 1048576, "OUT 원문이 1MiB 상한을 초과했습니다.");
    const flags = rule.ableFlag ? rule.flag || "g" : "g";
    assert(/^[gimsu]*$/.test(flags) && new Set(flags).size === flags.length, "테스트 미지원 플래그입니다. g/i/m/s/u만 지원합니다.");
    assert(!rule.in.startsWith("<cbs>") && !rule.out.startsWith("@@"), "CBS·액션 스크립트는 단독 테스트 범위 밖입니다.");
    if (!rule.in) return { matches: [], output: input, note: "빈 IN은 RisuAI와 같이 건너뛰었습니다." };
    let compiled;
    try {
      compiled = RE2JS.compile(RE2JS.translateRegExp(new RegExp(rule.in, flags)));
    } catch (e) {
      throw new Error("잘못된 패턴 또는 테스트 미지원 문법: " + e.message);
    }
    const matcher = compiled.matcher(input), matches = [], chunks = [];
    let pos = 0, size = 0, limited = false;
    let out = rule.out.replaceAll("$n", "\n");
    if (out.endsWith(">")) out += "\n";
    const push = (text) => {
      size += bytes(text);
      assert(size <= 1048576, "치환 출력이 1MiB 상한에 도달해 중단했습니다.");
      chunks.push(text);
    };
    while (matcher.find()) {
      if (job.cancelled) throw new Error("정규식 테스트를 중단했습니다.");
      if (matches.length >= 1e3) {
        limited = true;
        break;
      }
      const start = matcher.start(), end = matcher.end();
      matches.push({ start, end, text: matcher.group(0), groups: Array.from({ length: matcher.groupCount() }, (_, i) => matcher.group(i + 1)) });
      push(input.slice(pos, start));
      push(expandReplacement(out, matcher, input, start, end, compiled));
      pos = end;
      if (!flags.includes("g")) break;
      if (matches.length % 25 === 0) await tick();
    }
    if (!limited) push(input.slice(pos));
    return { matches, output: chunks.join(""), note: limited ? "매칭 1,000개 한도로 중단했습니다. 아래는 전체 결과가 아닌 부분 결과입니다." : "RE2JS 공통 문법 기준입니다. 호스트 CBS·채팅 상태·전체 처리 파이프라인은 실행하지 않았습니다.", limited };
  }

export { expandReplacement, regexTest };
