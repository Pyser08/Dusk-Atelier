// v1.6.5 읽기 경로 대조: 폴더를 읽어 메모리 사본에서만 앵커 정합성(reconcile)을 맞춘다. 저장하지 않는다.
// 다시 생성·삭제된 응답에 달린 기록·장면·관계·떡밥이 요청에 들어가지 않게, 주입·회상·분석 입력 앞에서 쓴다.
// getFolder는 저장소 문자열을 매번 새로 파싱해 돌려주므로 사본을 따로 만들지 않는다.
import { reconcile } from "../engine/memoryreconcile.js";

// messages가 비었으면(채팅을 못 읽은 경우 등) 전부 고아로 오인하지 않도록 대조를 건너뛴다.
export async function loadReconciled(store, chaId, chatId, messages) {
  const folder = await store.getFolder(String(chaId), String(chatId));
  if (folder && Array.isArray(messages) && messages.length) reconcile(folder, messages);
  return folder;
}
