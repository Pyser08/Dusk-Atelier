// 페르소나 이름(·user·유저 등)으로 따로 쌓인 옛 기록을 {{user}} 하나로 자동으로 합친다 (v1.9.3).
// 새 분석은 이미 {{user}}로 모아 기록하므로, 이 합치기는 예전에 갈라진 기록을 한 번 정리하는 용도다. 합칠 게 없으면 아무것도 쓰지 않는다.
import { userMergePlan, mergeIntoUser } from "../engine/memoryuser.js";
// 반환: null(합칠 것 없음) | { people, links, names:[합친 이름들] }
export async function autoMergeUser(store, chaId, chatId, folder, names) {
  if (!folder || !names?.length) return null;
  const plan = userMergePlan(folder, names);
  if (!plan.people.length && !plan.links) return null;
  let r = null;
  await store.updateFolder(chaId, chatId, (f) => { r = mergeIntoUser(f, names); });
  return r && (r.people || r.links) ? { ...r, names: plan.people.map((x) => x.name) } : null;
}
