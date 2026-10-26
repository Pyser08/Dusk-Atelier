// 기억 저장소 백엔드 선택. local = 플러그인 자체 저장·분석·주입, bardwiki = 리스바드 위키 읽기.
export const hasBardWiki = (api) => typeof api?.bardWiki?.getDocuments === "function";
// setting: "auto" | "local" | "bardwiki" | "off"
export function selectBackend(api, setting = "auto") {
  if (setting === "off") return { id: "off", reason: "사용자가 기억 저장소를 껐어요." };
  if (setting === "local") return { id: "local", reason: hasBardWiki(api) ? "직접 선택했어요. BardWiki와 장기기억이 중복돼요." : "직접 선택했어요.", duplicate: hasBardWiki(api) };
  if (setting === "bardwiki") return hasBardWiki(api) ? { id: "bardwiki", reason: "직접 선택했어요." } : { id: "local", reason: "BardWiki를 찾지 못해 플러그인 저장소를 써요." };
  return hasBardWiki(api) ? { id: "bardwiki", reason: "리스바드의 BardWiki를 감지했어요." } : { id: "local", reason: "BardWiki가 없어 플러그인 저장소를 써요." };
}
export const CAPABILITIES = {
  local: { analyze: true, inject: true, write: true, grades: "auto", anchors: "own" },
  bardwiki: { analyze: false, inject: false, write: true, grades: "on-demand", anchors: "via-chatId" },
  off: { analyze: false, inject: false, write: false, grades: "auto", anchors: "none" }
};
export const capabilitiesOf = (id) => CAPABILITIES[id] ?? CAPABILITIES.off;
