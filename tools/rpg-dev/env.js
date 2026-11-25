// 어디서 도는지: 미리보기(문서 전체) 또는 애드온(섀도 DOM + 애드온 저장소)
const H = globalThis.__duskSaga;
export const ROOT = H?.root ?? document, BODY = H?.body ?? document.body, STORE = H?.store ?? localStorage, HOST = H ?? { paused: false };
