// 출처: risupot 2.3.0 src/writer-import-mode.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

export const WRITER_MANUAL_IMPORT = Symbol('risupot.manual-json-import');
export const WRITER_MANUAL_SOURCE = 'source:manual_json_unverified';
export const writerManualReason = value => ('수동 강제 반영 · 원문 미검증 · '+String(value||'사용자 입력')).slice(0,800);
