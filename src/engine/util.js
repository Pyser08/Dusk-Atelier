export var Cancelled = class extends Error {
  constructor() {
    super("취소됨");
    this.name = "Cancelled";
  }
};
export function stableJson(v) {
  return JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a < b ? -1 : 1)) : x);
}
export function slotted(list, idOf) {
  const seen = /* @__PURE__ */ new Map();
  return (list ?? []).map((item) => {
    const id = idOf(item);
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    return { slot: `${id}#${n}`, item };
  });
}
export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = b[6] & 15 | 64;
  b[8] = b[8] & 63 | 128;
  const h2 = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h2.slice(0, 8)}-${h2.slice(8, 12)}-${h2.slice(12, 16)}-${h2.slice(16, 20)}-${h2.slice(20)}`;
}
