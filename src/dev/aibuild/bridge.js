// 실시간 반영 다리 (v1.6.7 2단계).
// 봇빌더의 session.draft 대신 Dusk 편집기의 작업본(view)을 직접 읽고 쓴다.
//  - Dusk 편집기 view: lorebook / regex / trigger (+ 나머지 필드는 캐릭터 필드 이름 그대로)
//  - 봇빌더 draft:     globalLore / customscript / triggerscript (캐릭터 원본 이름)
// '적용' 한 번 = 편집기 작업본 교체 한 번 = 되돌리기 한 단계.
import { clone, stable } from './util.js';

const MAP = [['lorebook', 'globalLore'], ['regex', 'customscript'], ['trigger', 'triggerscript']];

// Dusk view → 봇빌더 draft (읽기용 복사본)
export function toDraft(view, assets, kind = 'character') {
  const d = clone(view) ?? {};
  if (kind === 'module') { d.desc = typeof d.description === 'string' ? d.description : ''; delete d.description; } // 모듈의 description ↔ 봇빌더 desc
  for (const [v, c] of MAP) {
    d[c] = Array.isArray(d[v]) ? d[v] : [];
    delete d[v];
  }
  d.additionalAssets = Array.isArray(assets) ? clone(assets) : [];
  return d;
}

// 봇빌더 draft → Dusk view (편집기에 되돌려 넣을 값)
export function toView(draft, kind = 'character') {
  const v = clone(draft) ?? {};
  if (kind === 'module') {
    v.description = typeof v.desc === 'string' ? v.desc : (v.description ?? '');
    for (const k of ['desc', 'personality', 'scenario', 'firstMessage', 'defaultVariables']) delete v[k];
  }
  for (const [vk, c] of MAP) {
    v[vk] = Array.isArray(v[c]) ? v[c] : [];
    delete v[c];
  }
  delete v.additionalAssets; // 에셋은 편집기 작업본에 없다(에셋 관리자 담당)
  return v;
}

// 편집기 핸들(openEditorCore 반환값)을 봇빌더 컨트롤러용 host로 감싼다.
// editor: { draft, replaceDraft(next, label), undoAi(), ... }
export function hostFromEditor(editor, { targetId, assets, kind = 'character' } = {}) {
  const tid = typeof targetId === 'function' ? targetId : () => targetId;
  return {
    kind: () => kind,
    getView: () => editor.draft,
    targetId: () => tid() ?? editor.draft?.chaId ?? editor.draft?.id ?? null,
    assets: () => (typeof assets === 'function' ? assets() : assets) ?? [],
    replaceView: (next, label) => editor.replaceDraft(next, label),
    undo: () => editor.undoAi?.(),
    canUndo: () => !!editor.canUndoAi?.(),
    signature: () => stable(editor.draft)
  };
}
