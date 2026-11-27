// 신고 #31(2.2.68): 리스 V3 SafeElement는 붙인 리스너를 플러그인이 떼거나 꺼질 때까지 보관한다(요소를 remove()해도 남음).
// 붙일 때 떼는 함수를 offs에 모아 두고, 요소를 지우기 전에 runOffs(offs)를 부른다.
export async function listen(el, type, fn, offs, opt) {
  const id = opt === undefined ? await el.addEventListener(type, fn) : await el.addEventListener(type, fn, opt);
  offs?.push(async () => { try { await el.removeEventListener?.(type, id ?? fn, ...(opt === undefined ? [] : [opt])); } catch { /* 이미 없음 */ } });
  return id;
}
export async function runOffs(offs) { const list = offs.splice(0); for (const f of list) { try { await f(); } catch { /* 무시 */ } } }
// 떼고 지우기
export async function removeWith(el, offs) { await runOffs(offs); try { await el?.remove?.(); } catch { /* 이미 없음 */ } }
