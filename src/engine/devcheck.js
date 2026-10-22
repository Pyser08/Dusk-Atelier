export function projView(kind, obj) {
  if (kind === "module") return { name: obj?.name ?? "", lore: obj?.lorebook ?? [], regex: obj?.regex ?? [], trigger: obj?.trigger ?? [] };
  return { name: obj?.name ?? "", lore: obj?.globalLore ?? [], regex: obj?.customscript ?? [], trigger: obj?.triggerscript ?? [] };
}
function parseDecorators(content) {
  const decos = [], body = [];
  for (const line of String(content ?? "").split("\n")) {
    const m = /^@@([a-z_]+)(?:\s+(.*))?$/.exec(line.trim());
    if (m) decos.push({ name: m[1], args: (m[2] ?? "").split(",").map((s) => s.trim()).filter(Boolean) });
    else body.push(line);
  }
  return { decos, body: body.join("\n") };
}
function keyMatch(text, keys, { regex, fullWord }) {
  if (regex) {
    for (const k of keys) {
      const p = /^\/([\s\S]*)\/([dgimsuvy]*)$/.exec(k);
      if (!p) return null;
      try {
        if (new RegExp(p[1], p[2]).test(text)) return k;
      } catch {
        return null;
      }
    }
    return null;
  }
  const low = text.toLocaleLowerCase();
  if (fullWord) {
    const words = low.split(" ");
    for (const k of keys) if (words.includes(k.toLocaleLowerCase())) return k;
    return null;
  }
  const flat = low.replace(/ /g, "");
  for (const k of keys) if (flat.includes(k.toLocaleLowerCase().replace(/ /g, ""))) return k;
  return null;
}
export function loreActivation(lore, text, { recursive = false } = {}) {
  const out = [], on = /* @__PURE__ */ new Set();
  let scan = String(text ?? "");
  for (let round = 0; round < (recursive ? 10 : 1); round++) {
    let added = false;
    (lore ?? []).forEach((l, i) => {
      if (on.has(i) || !l || l.mode === "folder") return;
      const { decos, body } = parseDecorators(l.content);
      const has2 = (n) => decos.find((d) => d.name === n);
      if (has2("dont_activate")) return;
      const hit = (r) => {
        on.add(i);
        added = true;
        out.push({ index: i, entry: l, reason: r, body });
      };
      if (has2("activate")) return hit("@@activate");
      if (l.alwaysActive || l.mode === "constant") return hit("항상 켜짐");
      if (!String(l.key ?? "")) return;
      const opt = { regex: !!l.useRegex, fullWord: !!has2("match_full_word") };
      const first = keyMatch(scan, String(l.key).split(","), opt);
      if (first === null) return;
      if (l.selective && l.secondkey && keyMatch(scan, String(l.secondkey).split(","), opt) === null) return;
      for (const d of decos) {
        if (d.name === "additional_keys" && keyMatch(scan, d.args, opt) === null) return;
        if (d.name === "exclude_keys" && keyMatch(scan, d.args, opt) !== null) return;
      }
      hit(first === "" ? "빈 키(쉼표 끝)라서 늘 켜짐" : `키 "${first.trim()}"`);
    });
    if (!recursive || !added) break;
    scan = [String(text ?? ""), ...out.map((o) => o.body)].join("\n");
  }
  return out;
}
export function regexRun(scripts, text, mode = "editoutput") {
  let data = String(text ?? "");
  const steps = [];
  (scripts ?? []).forEach((s, i) => {
    if (!s || s.type !== mode || !s.in) return;
    const step = { index: i, comment: s.comment || `#${i + 1}`, matched: 0 };
    let flag = s.ableFlag ? s.flag || "g" : "g";
    flag = [...new Set(flag.trim().replace(/[^dgimsuvy]/g, ""))].join("") || "u";
    const outScript = String(s.out ?? "").replaceAll("$n", "\n");
    if (String(s.in).includes("{{")) {
      step.skipped = "CBS가 들어간 패턴은 실행할 때 바뀌어서 건너뜀";
      steps.push(step);
      return;
    }
    let reg;
    try {
      reg = new RegExp(s.in, flag);
    } catch (e) {
      step.error = e.message;
      steps.push(step);
      return;
    }
    const all = flag.includes("g") ? [...data.matchAll(new RegExp(s.in, flag))] : data.match(reg) ? [data.match(reg)] : [];
    step.matched = all.length;
    if (!all.length) {
      steps.push(step);
      return;
    }
    if (outScript.startsWith("@@")) {
      step.skipped = `특수 동작(${outScript.split(/\s/)[0]})은 테스트에서 실행하지 않음`;
      steps.push(step);
      return;
    }
    data = data.replace(reg, outScript);
    steps.push(step);
  });
  return { out: data, steps };
}
export function devLint(view) {
  const out = [];
  const keyOwners = /* @__PURE__ */ new Map();
  view.lore.forEach((l, i) => {
    if (!l || l.mode === "folder") return;
    const name = l.comment || `#${i + 1}`;
    const keys = String(l.key ?? "").split(",");
    if (!l.useRegex && String(l.key ?? "").trim() && keys.some((k) => k === "" || !k.trim()) && !l.alwaysActive)
      out.push({ level: "warn", tab: "lorebook", index: i, msg: `로어북 '${name}': 키 끝에 빈 칸(쉼표)이 있어서 대화와 상관없이 늘 켜져요` });
    if (!l.useRegex) for (const k of keys.map((x) => x.trim().toLowerCase()).filter(Boolean)) {
      if (!keyOwners.has(k)) keyOwners.set(k, []);
      keyOwners.get(k).push(name);
    }
    if (l.selective && !String(l.secondkey ?? "").trim()) out.push({ level: "info", tab: "lorebook", index: i, msg: `로어북 '${name}': 보조 키 사용이 켜져 있는데 보조 키가 비어 있어요(보조 키 없이 켜져요)` });
    if ((l.alwaysActive || l.mode === "constant") && String(l.content ?? "").length > 4e3) out.push({ level: "info", tab: "lorebook", index: i, msg: `로어북 '${name}': 항상 켜진 항목이 ${String(l.content).length.toLocaleString()}자예요(매 응답에 들어가요)` });
  });
  for (const [k, names] of keyOwners) if (names.length > 2) out.push({ level: "info", tab: "lorebook", msg: `키 "${k}"가 항목 ${names.length}개에 함께 쓰여요: ${names.slice(0, 4).join(", ")}${names.length > 4 ? " …" : ""}` });
  const dup = /* @__PURE__ */ new Map();
  view.regex.forEach((r, i) => {
    if (r?.in) {
      const k = `${r.type}\0${r.in}`;
      if (dup.has(k)) out.push({ level: "info", tab: "regex", index: i, msg: `정규식 '${r.comment || i + 1}': '${dup.get(k)}'와 같은 패턴·종류예요` });
      else dup.set(k, r.comment || `#${i + 1}`);
    }
  });
  return out;
}
export function devStats(view) {
  const loreChars = view.lore.reduce((n, l) => n + (l?.mode === "folder" ? 0 : String(l?.content ?? "").length), 0);
  const alwaysChars = view.lore.reduce((n, l) => n + (l?.alwaysActive || l?.mode === "constant" ? String(l?.content ?? "").length : 0), 0);
  return {
    lore: view.lore.filter((l) => l && l.mode !== "folder").length,
    regex: view.regex.length,
    trigger: view.trigger.length,
    loreChars,
    alwaysChars,
    alwaysTokens: Math.round(alwaysChars / 2.5)
  };
}
export function nextVersion(v) {
  const s = String(v ?? "").trim();
  const m = /^(.*?)(\d+)(\D*)$/.exec(s);
  if (!m) return s ? `${s}.1` : "1.0";
  return `${m[1]}${Number(m[2]) + 1}${m[3]}`;
}
