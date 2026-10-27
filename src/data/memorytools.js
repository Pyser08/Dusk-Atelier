// 인물 AI 도구(7단계 B): 리수폿 컨트롤러를 한 묶음으로 만든다. 턴 흐름이 켜져 있고 그 채팅이 열려 있어야 쓸 수 있다.
//   field   항목 하나를 AI로 작성   command  직접 지시로 변경안   metric  수치 변경안   refresh 인물 전체 다시 정리(표준·꼼꼼)
//   recovery 모델 원문 JSON 붙여넣어 강제 반영   persona  내 이름(페르소나)   orphan  고아 정리
import { PeopleFieldController } from "../engine/pot/people-field.js";
import { PeopleCommandController } from "./pot/people-command.js";
import { PeopleMetricAIController } from "./pot/people-metric-ai.js";
import { PersonRefreshController } from "./pot/person-thorough-refresh.js";
import { WriterRecoveryController } from "./pot/writer-recovery.js";
import { PersonaNameController } from "../engine/pot/persona-name.js";

const busyOf = (list) => () => list.some((c) => c && (c.status().running || ["running", "applying"].includes(c.status().phase)));

export function makeTools({ api, rt, sourceLibrary, llmCall }) {
  const base = { api, settingsStore: rt.settings, keyStore: rt.keys, wikiController: rt.wiki, traceStore: rt.trace };
  const llm = llmCall ? { llmCall } : {};
  const field = new PeopleFieldController({ ...base, ...llm });
  const command = new PeopleCommandController({ ...base, sourceLibrary, ...llm });
  const sourceReader = (settings, person) => field.sources(settings, person);
  const metric = new PeopleMetricAIController({ ...base, sourceReader, ...llm });
  const refresh = new PersonRefreshController({ ...base, sourceLibrary, sourceReader, ...llm });
  const all = [field, command, metric, refresh];
  const recovery = new WriterRecoveryController({ ...base, sourceLibrary, isBusy: busyOf([...all, rt.auto]) });
  const persona = new PersonaNameController({ api, settingsStore: rt.settings, wikiController: rt.wiki, isBusy: busyOf(all) });
  const dispose = () => { for (const c of [...all, recovery, persona]) { try { c.dispose?.(); } catch {} } };
  return { field, command, metric, refresh, recovery, persona, busy: busyOf(all), dispose };
}
