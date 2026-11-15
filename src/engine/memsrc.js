// 앵커 → 출처 표시(게이지·기억 공용)
export const srcOf = (anchor) => anchor?.h ? { chatId: anchor.mid ?? null, hash: anchor.h, at: anchor.at ?? null } : undefined;
