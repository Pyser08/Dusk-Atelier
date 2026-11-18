// 장기기억 애드온이 업데이트되며 다시 켜지는 사이(ctx.memory가 잠깐 비는 때) 버튼을 눌러도 오류 대신 안내
export function memStore(ctx) {
  const st = ctx?.memory?.store;
  if (st) return st;
  const err = new Error("장기 기억이 다시 켜지는 중이에요. 잠시 뒤 다시 눌러 주세요."); err.soft = true; throw err;
}
