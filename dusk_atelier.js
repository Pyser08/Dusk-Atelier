//@name dusk_atelier
//@display-name Dusk Atelier
//@api 3.0
//@version 1.1.0
//@link https://github.com/Pyser08/Dusk-Atelier 저장소

/* Dusk Atelier v1.1.0 — 소스: https://github.com/Pyser08/Dusk-Atelier (src/ 폴더). 이 파일은 빌드 결과물입니다. */
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/engine/index.js
  var engine_exports = {};
  __export(engine_exports, {
    Busy: () => Busy,
    CHAR_LISTS: () => CHAR_LISTS,
    Cancelled: () => Cancelled,
    MOD_LISTS: () => MOD_LISTS,
    MOD_SPEC: () => MOD_SPEC,
    USER_KEYS: () => USER_KEYS,
    __zipDir: () => readZipDirectory,
    __zipEntry: () => readZipEntry,
    applyView: () => applyView,
    assetKey: () => assetKey,
    backupSnapshot: () => backupSnapshot,
    buildMergedCharacter: () => buildMergedCharacter,
    buildMergedModule: () => buildMergedModule,
    buildNewCharacter: () => buildNewCharacter,
    buildRisum: () => buildRisum,
    cardToCharacter: () => cardToCharacter,
    cardToModule: () => cardToModule,
    charIncomingView: () => charIncomingView,
    charSpec: () => charSpec,
    characterAssetKeys: () => characterAssetKeys,
    characterFieldChanges: () => characterFieldChanges,
    characterView: () => characterView,
    collectKnownKeys: () => collectKnownKeys,
    crc32: () => crc32,
    createStore: () => createStore,
    createZip: () => createZip,
    fieldChanges: () => fieldChanges,
    findCandidates: () => findCandidates,
    isGenerating: () => isGenerating,
    merge3: () => merge3,
    mergeLorebook: () => mergeLorebook,
    modIncomingView: () => modIncomingView,
    moduleJson: () => moduleJson,
    newCharacterBase: () => newCharacterBase,
    newId: () => newId,
    normalizeName: () => normalizeName,
    offSpecToCharacter: () => offSpecToCharacter,
    pickView: () => pickView,
    planAssets: () => planAssets,
    planCharacter: () => planCharacter,
    readAssetBytes: () => readAssetBytes,
    readCharx: () => readCharx,
    readIncoming: () => readIncoming,
    readPngCard: () => readPngCard,
    restoreFromBackup: () => restoreFromBackup,
    rpackDecode: () => rpackDecode,
    rpackEncode: () => rpackEncode,
    safeFileName: () => safeFileName,
    scanRisum: () => scanRisum,
    sha256: () => sha256,
    sha256js: () => sha256js,
    stableJson: () => stableJson,
    stripTrailingNumber: () => stripTrailingNumber,
    summarize: () => summarize,
    uniqueDisplayName: () => uniqueDisplayName,
    uploadAssets: () => uploadAssets
  });

  // src/engine/rpack.js
  var RPACK_DECODE_B64 = "LPeEi8ll+7afrrMDLQFpdB/ko+zuXDQhk0oPauJiAp4inP08/HHHxq1ZZwVwbYpEEvokhl+v0XpHzv5QY91RBm8Y4FKoCZ1Wc0y4U2zDoA4Zzz4NfgcyaEbqSPmZLqukSSBeVTU4DLzTsVgWeSgKGuHyzcQ526K6YHJ2fZXvf8jA3jeUv7UUgZIlRazn9WanKzZawRPjSzrojYMbfCewmkLrh6rcVI54JtJXKdS3+C+PiXXwQXfCHv/YFRHlBJcX8zHQmwDXyrRPKjvZsmvaXaE/MGG9kT1O5t++TYKMHSMQmGT0hTN7kEO7qYjx1qUc9sxuuVsLlu3V6cXLCKaAQA==";
  var DECODE = (() => {
    const bin = atob(RPACK_DECODE_B64);
    const out = new Uint8Array(256);
    for (let i = 0; i < 256; i++) out[i] = bin.charCodeAt(i);
    return out;
  })();
  function rpackDecode(data) {
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = DECODE[data[i]];
    return out;
  }

  // src/engine/hash.js
  var K = new Uint32Array([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  function sha256js(data) {
    const len = data.length;
    const total = len + 9 + 63 >> 6 << 6;
    const buf = new Uint8Array(total);
    buf.set(data);
    buf[len] = 128;
    const bits = len * 8;
    const dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, Math.floor(bits / 4294967296));
    dv.setUint32(total - 4, bits >>> 0);
    const h2 = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]);
    const w = new Uint32Array(64);
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const a = w[i - 15], b = w[i - 2];
        const s0 = (a >>> 7 | a << 25) ^ (a >>> 18 | a << 14) ^ a >>> 3;
        const s1 = (b >>> 17 | b << 15) ^ (b >>> 19 | b << 13) ^ b >>> 10;
        w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
      }
      let [A, B, C, D, E, F, G, H] = h2;
      for (let i = 0; i < 64; i++) {
        const S1 = (E >>> 6 | E << 26) ^ (E >>> 11 | E << 21) ^ (E >>> 25 | E << 7);
        const ch = E & F ^ ~E & G;
        const t1 = H + S1 + ch + K[i] + w[i] >>> 0;
        const S0 = (A >>> 2 | A << 30) ^ (A >>> 13 | A << 19) ^ (A >>> 22 | A << 10);
        const mj = A & B ^ A & C ^ B & C;
        const t2 = S0 + mj >>> 0;
        H = G;
        G = F;
        F = E;
        E = D + t1 >>> 0;
        D = C;
        C = B;
        B = A;
        A = t1 + t2 >>> 0;
      }
      h2[0] += A;
      h2[1] += B;
      h2[2] += C;
      h2[3] += D;
      h2[4] += E;
      h2[5] += F;
      h2[6] += G;
      h2[7] += H;
    }
    let hex = "";
    for (let i = 0; i < 8; i++) hex += h2[i].toString(16).padStart(8, "0");
    return hex;
  }
  var subtle = typeof crypto !== "undefined" && crypto.subtle ? crypto.subtle : null;
  async function sha256(data) {
    if (subtle) {
      try {
        const d = new Uint8Array(await subtle.digest("SHA-256", data));
        let hex = "";
        for (let i = 0; i < d.length; i++) hex += d[i].toString(16).padStart(2, "0");
        return hex;
      } catch {
      }
    }
    return sha256js(data);
  }
  var assetKey = (hash) => `assets/${hash}.png`;
  var HASH_KEY = /^assets\/([a-f0-9]{64})\.[a-z0-9]+$/;

  // src/engine/util.js
  var Cancelled = class extends Error {
    constructor() {
      super("취소됨");
      this.name = "Cancelled";
    }
  };
  function stableJson(v) {
    return JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a < b ? -1 : 1)) : x);
  }
  function slotted(list, idOf) {
    const seen = /* @__PURE__ */ new Map();
    return (list ?? []).map((item) => {
      const id = idOf(item);
      const n = seen.get(id) ?? 0;
      seen.set(id, n + 1);
      return { slot: `${id}#${n}`, item };
    });
  }
  function newId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(b);
    else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = b[6] & 15 | 64;
    b[8] = b[8] & 63 | 128;
    const h2 = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${h2.slice(0, 8)}-${h2.slice(8, 12)}-${h2.slice(12, 16)}-${h2.slice(16, 20)}-${h2.slice(20)}`;
  }

  // src/engine/formats/risum.js
  async function readRange(blob, start2, end) {
    return new Uint8Array(await blob.slice(start2, end).arrayBuffer());
  }
  async function scanRisum(blob, onProgress, shouldStop) {
    const head = await readRange(blob, 0, 6);
    if (head.length < 6 || head[0] !== 111) throw new Error(".risum 파일이 아닙니다 (시작 바이트가 다름)");
    if (head[1] !== 0) throw new Error("지원하지 않는 .risum 버전입니다");
    const mainLen = new DataView(head.buffer).getUint32(2, true);
    let pos = 6;
    if (pos + mainLen > blob.size) throw new Error("파일이 잘렸습니다 (모듈 정보)");
    const mainRaw = rpackDecode(await readRange(blob, pos, pos + mainLen));
    pos += mainLen;
    let main;
    try {
      main = JSON.parse(new TextDecoder().decode(mainRaw));
    } catch {
      throw new Error("모듈 정보를 읽을 수 없습니다");
    }
    if (main?.type !== "risuModule" || !main.module) throw new Error("RisuAI 모듈 파일이 아닙니다");
    const mod = main.module;
    const metaAssets = Array.isArray(mod.assets) ? mod.assets : [];
    const assets = [];
    for (let index = 0; ; index++) {
      if (shouldStop?.()) throw new Cancelled();
      if (pos >= blob.size) throw new Error("파일이 잘렸습니다 (에셋 목록 끝 표시 없음)");
      const hdr = await readRange(blob, pos, Math.min(pos + 5, blob.size));
      if (hdr[0] === 0) break;
      if (hdr[0] !== 1 || hdr.length < 5) throw new Error("에셋 구역이 손상되었습니다");
      const len = new DataView(hdr.buffer).getUint32(1, true);
      const start2 = pos + 5;
      if (start2 + len > blob.size) throw new Error("파일이 잘렸습니다 (에셋)");
      const data = rpackDecode(await readRange(blob, start2, start2 + len));
      const hash = await sha256(data);
      const meta = metaAssets[index] ?? [];
      assets.push({ index, name: String(meta[0] ?? ""), ext: String(meta[2] ?? ""), offset: start2, length: len, size: data.length, hash });
      pos = start2 + len;
      onProgress?.(pos, blob.size, index + 1);
    }
    if (assets.length !== metaAssets.length) throw new Error(`에셋 개수가 맞지 않습니다 (정보 ${metaAssets.length}개, 실제 ${assets.length}개)`);
    return { kind: "risum", module: mod, assets };
  }

  // src/engine/formats/zip.js
  var u16 = (b, o) => b[o] | b[o + 1] << 8;
  var u32 = (b, o) => (b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24) >>> 0;
  var u64 = (b, o) => u32(b, o) + u32(b, o + 4) * 4294967296;
  async function readZipDirectory(blob) {
    const tailLen = Math.min(blob.size, 22 + 65535 + 20);
    const tailStart = blob.size - tailLen;
    const tail = await readRange(blob, tailStart, blob.size);
    let e = -1;
    for (let i = tail.length - 22; i >= 0; i--) if (u32(tail, i) === 101010256) {
      e = i;
      break;
    }
    if (e < 0) throw new Error("zip 파일이 아닙니다 (끝 표시 없음)");
    let count = u16(tail, e + 10), cdSize = u32(tail, e + 12), cdOffset = u32(tail, e + 16);
    if (e >= 20 && u32(tail, e - 20) === 117853008) {
      let z64 = u64(tail, e - 20 + 8);
      let rec = await readRange(blob, z64, z64 + 56);
      if (u32(rec, 0) !== 101075792) {
        z64 = tailStart + e - 20 - 56;
        rec = await readRange(blob, z64, z64 + 56);
      }
      if (u32(rec, 0) !== 101075792) throw new Error("zip64 정보가 손상되었습니다");
      count = u64(rec, 32);
      cdSize = u64(rec, 40);
      cdOffset = u64(rec, 48);
    }
    let base = 0;
    const eocdAbs = tailStart + e;
    const sigAt = async (off) => off >= 0 && off + 4 <= blob.size && u32(await readRange(blob, off, off + 4), 0) === 33639248;
    if (count > 0 && !await sigAt(cdOffset)) {
      const isZip64 = e >= 20 && u32(tail, e - 20) === 117853008;
      const cdAbs = isZip64 ? eocdAbs - 20 - 56 - cdSize : eocdAbs - cdSize;
      base = cdAbs - cdOffset;
      if (!await sigAt(cdOffset + base)) throw new Error("zip 목록 위치를 찾지 못했습니다");
    }
    cdOffset += base;
    if (cdOffset + cdSize > blob.size) throw new Error("zip 목록이 잘렸습니다");
    const cd = await readRange(blob, cdOffset, cdOffset + cdSize);
    const entries = [];
    let p = 0;
    const dec = new TextDecoder();
    for (let i = 0; i < count; i++) {
      if (u32(cd, p) !== 33639248) throw new Error("zip 목록이 손상되었습니다");
      const method = u16(cd, p + 10);
      let compSize = u32(cd, p + 20), size = u32(cd, p + 24);
      const nameLen = u16(cd, p + 28), extraLen = u16(cd, p + 30), commentLen = u16(cd, p + 32);
      let localOffset = u32(cd, p + 42);
      const name = dec.decode(cd.subarray(p + 46, p + 46 + nameLen));
      let x = p + 46 + nameLen;
      const xEnd = x + extraLen;
      while (x + 4 <= xEnd) {
        const id = u16(cd, x), len = u16(cd, x + 2);
        if (id === 1) {
          let q = x + 4;
          if (size === 4294967295) {
            size = u64(cd, q);
            q += 8;
          }
          if (compSize === 4294967295) {
            compSize = u64(cd, q);
            q += 8;
          }
          if (localOffset === 4294967295) {
            localOffset = u64(cd, q);
            q += 8;
          }
        }
        x += 4 + len;
      }
      if (!name.endsWith("/")) entries.push({ name, method, compSize, size, localOffset: localOffset + base });
      p = xEnd + commentLen;
    }
    return entries;
  }
  async function readZipEntry(blob, entry2) {
    const lh = await readRange(blob, entry2.localOffset, entry2.localOffset + 30);
    if (u32(lh, 0) !== 67324752) throw new Error(`zip 항목이 손상되었습니다: ${entry2.name}`);
    const start2 = entry2.localOffset + 30 + u16(lh, 26) + u16(lh, 28);
    const raw = blob.slice(start2, start2 + entry2.compSize);
    if (entry2.method === 0) return new Uint8Array(await raw.arrayBuffer());
    if (entry2.method !== 8) throw new Error(`지원하지 않는 압축 방식(${entry2.method}): ${entry2.name}`);
    const stream = raw.stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const out = new Uint8Array(await new Response(stream).arrayBuffer());
    if (out.length !== entry2.size) throw new Error(`압축 해제 크기가 맞지 않습니다: ${entry2.name}`);
    return out;
  }

  // src/engine/formats/card.js
  function convertCharbookEntries(charbook) {
    const out = [];
    for (const src of charbook?.entries ?? []) {
      const book = { ...src };
      let content = book.content;
      if (book.use_regex && !book.keys?.[0]?.startsWith("/")) book.use_regex = false;
      const extensions = JSON.parse(JSON.stringify(book.extensions ?? {}));
      if (extensions.useProbability && extensions.probability !== void 0 && extensions.probability !== 100) {
        content = `@@probability ${extensions.probability}
` + content;
        delete extensions.useProbability;
        delete extensions.probability;
      }
      if (extensions.position === 4 && typeof extensions.depth === "number" && typeof extensions.role === "number") {
        content = `@@depth ${extensions.depth}
@@role ${["system", "user", "assistant"][extensions.role]}
` + content;
        delete extensions.position;
        delete extensions.depth;
        delete extensions.role;
      }
      if (typeof extensions.selectiveLogic === "number" && book.secondary_keys && book.secondary_keys.length > 0) {
        switch (extensions.selectiveLogic) {
          case 1:
            book.selective = false;
            content = `@@exclude_keys_all ${book.secondary_keys.join(",")}
` + content;
            break;
          case 2:
            book.selective = false;
            for (const k of book.secondary_keys) content = `@@exclude_keys ${k}
` + content;
            break;
          case 3:
            book.selective = false;
            for (const k of book.secondary_keys) content = `@@additional_keys ${k}
` + content;
            break;
        }
      }
      if (typeof extensions.delay === "number" && extensions.delay > 0) {
        content = `@@activate_only_after ${extensions.delay}
` + content;
        delete extensions.delay;
      }
      if (extensions.match_whole_words === true) {
        content = `@@match_word_boundary
` + content;
        delete extensions.match_whole_words;
      }
      if (extensions.match_whole_words === false) {
        content = `@@match_partial_word
` + content;
        delete extensions.match_whole_words;
      }
      const rid = extensions.risu_id ?? book.id;
      out.push({
        enabled: book.enabled ?? true,
        key: (book.keys ?? []).join(", "),
        secondkey: book.secondary_keys?.join(", ") ?? "",
        insertorder: book.insertion_order,
        comment: book.name ?? book.comment ?? "",
        content,
        mode: book.mode ?? "normal",
        alwaysActive: book.constant ?? false,
        selective: book.selective ?? false,
        extentions: { ...extensions, risu_case_sensitive: book.case_sensitive },
        activationPercent: book.extensions?.risu_activationPercent,
        loreCache: book.extensions?.risu_loreCache ?? null,
        useRegex: book.use_regex ?? false,
        bookVersion: extensions.risu_bookVersion,
        id: rid === void 0 || rid === null ? void 0 : String(rid),
        folder: book.folder
      });
    }
    return out;
  }
  function cardToModule(card2, md, assetRef) {
    const data = card2.data ?? {};
    const risuext = data.extensions?.risuai;
    const assets = [];
    let icon2 = null;
    for (const a of data.assets ?? []) {
      const uri = String(a.uri ?? "");
      let ref = null;
      if (uri.startsWith("__asset:")) ref = assetRef(uri.slice(8), true);
      else if (uri.startsWith("embeded://")) ref = assetRef(uri.slice(10), true);
      else if (uri.startsWith("data:")) ref = assetRef(uri, false);
      else continue;
      if (!ref) continue;
      const name = a.name ?? "";
      if (a.type === "x-risu-asset") assets.push({ ...ref, name: String(name), ext: String(a.ext ?? "unknown") });
      else if (a.type === "icon" && a.name === "main") icon2 = ref;
    }
    let lorebook = md?.lorebook ? JSON.parse(JSON.stringify(md.lorebook)) : convertCharbookEntries(data.character_book);
    const desc = data.description ?? "";
    if (desc) lorebook.push({ key: "", secondkey: "", insertorder: 0, comment: "From Character Description", content: `@@indicator character_desc

${desc}`, mode: "constant", alwaysActive: true, selective: false });
    const first = data.first_mes ?? "", alts = data.alternate_greetings ?? [];
    if (first || alts.length > 0) {
      let fm = `<FM>
${first}
</FM>`;
      for (const g of alts) fm += `
<FM_alt>
${g}
</FM_alt>`;
      lorebook.push({ key: "", secondkey: "", insertorder: 0, comment: "From First Messages", content: `@@indicator character_first_message

${fm}`, mode: "constant", alwaysActive: false, selective: false });
    }
    const rgn = risuext && !Object.prototype.hasOwnProperty.call(risuext, "replaceGlobalNote") ? data.post_history_instructions ?? "" : risuext?.replaceGlobalNote ?? "";
    if (rgn) lorebook.push({ key: "", secondkey: "", insertorder: 0, comment: "From Replace Global Note", content: `@@indicator replace_global_note

${rgn}`, mode: "constant", alwaysActive: true, selective: false });
    const mod = {
      name: data.name ?? "",
      description: data.creator_notes ?? "",
      lorebook,
      regex: md ? md.regex ?? [] : risuext?.customScripts ?? [],
      trigger: md ? md.trigger ?? [] : risuext?.triggerscript ?? [],
      lowLevelAccess: risuext?.lowLevelAccess ?? false,
      hideIcon: risuext?.hideChatIcon ?? false,
      namespace: risuext?.moduleNamespace ?? "",
      backgroundEmbedding: risuext?.backgroundHTML,
      customModuleToggle: risuext?.toggles ?? ""
    };
    if (mod.backgroundEmbedding === void 0) delete mod.backgroundEmbedding;
    return { mod, assets, icon: icon2, bardExtension: !!data.extensions?.risubard };
  }
  var MAX_ZIP_ASSET = 100 * 1024 * 1024;
  async function readCharx(blob, onProgress, shouldStop) {
    const entries = await readZipDirectory(blob);
    const byName = new Map(entries.map((e) => [e.name, e]));
    const cardEntry = byName.get("card.json");
    if (!cardEntry) throw new Error("charx 안에 card.json이 없습니다");
    const card2 = JSON.parse(new TextDecoder().decode(await readZipEntry(blob, cardEntry)));
    if (card2?.spec !== "chara_card_v3") throw new Error("charx의 card.json이 V3 카드가 아닙니다");
    let md = null;
    const mdEntry = byName.get("module.risum");
    if (mdEntry) {
      const bytes = await readZipEntry(blob, mdEntry);
      md = (await scanRisum(new Blob([bytes]))).module;
    }
    const wanted = /* @__PURE__ */ new Set();
    for (const a of card2.data?.assets ?? []) {
      const uri = String(a.uri ?? "");
      if (uri.startsWith("embeded://")) wanted.add(uri.slice(10));
      else if (uri.startsWith("__asset:")) wanted.add(uri.slice(8));
    }
    const refs = /* @__PURE__ */ new Map();
    let doneBytes = 0;
    const totalBytes = [...wanted].reduce((s, n) => s + (byName.get(n)?.compSize ?? 0), 0) || 1;
    let count = 0;
    for (const name of wanted) {
      if (shouldStop?.()) throw new Cancelled();
      const entry2 = byName.get(name);
      if (!entry2 || entry2.name === "card.json" || entry2.name === "module.risum" || entry2.name.endsWith(".json") || entry2.size > MAX_ZIP_ASSET) {
        throw new Error(`charx에 카드가 가리키는 에셋이 없습니다: ${name}`);
      }
      const data = await readZipEntry(blob, entry2);
      refs.set(name, { source: "zip", entry: entry2, size: data.length, hash: await sha256(data) });
      doneBytes += entry2.compSize;
      count++;
      onProgress?.(doneBytes / totalBytes * blob.size, blob.size, count);
    }
    const dataRefs = /* @__PURE__ */ new Map();
    const assetRef = (key, mode) => {
      if (mode === true) return refs.get(key) ?? null;
      if (!key) return null;
      if (!dataRefs.has(key)) dataRefs.set(key, inlineRef(mode === false ? key.split(",")[1] ?? "" : key));
      return dataRefs.get(key);
    };
    const { mod, assets, icon: icon2, bardExtension } = cardToModule(card2, md, assetRef);
    const list = assets.map((a, index) => ({ ...a, index }));
    const character = cardToCharacter(card2, md, assetRef, null);
    return {
      kind: "charx",
      module: mod,
      assets: list,
      icon: icon2,
      character,
      notes: bardExtension ? ["RisuBard 전용 확장(bardLore 등)이 있는 카드입니다. 로어북 처리 결과가 기본 임포트와 조금 다를 수 있습니다."] : []
    };
  }
  var nullish = (v) => v === null || v === void 0;
  function cardToCharacter(card2, md, assetRef, mainRef) {
    const data = card2.data ?? {};
    const risuext = data.extensions?.risuai ? JSON.parse(JSON.stringify(data.extensions.risuai)) : void 0;
    if (md && risuext) {
      risuext.triggerscript = md.trigger ?? [];
      risuext.customScripts = md.regex ?? [];
    }
    const refs = { emotions: [], additional: [], cc: [], icon: mainRef ?? null, vits: null };
    const v2Ref = (val) => String(val ?? "").startsWith("__asset:") ? assetRef(String(val).slice(8), true) : assetRef(String(val ?? ""), "b64");
    if (risuext && card2.spec === "chara_card_v2") {
      for (const e of risuext.emotions ?? []) {
        const r = v2Ref(e[1]);
        if (r) refs.emotions.push({ ...r, name: String(e[0] ?? "") });
      }
      for (const a of risuext.additionalAssets ?? []) {
        const r = v2Ref(a[1]);
        if (r) refs.additional.push({ ...r, name: String(a[0] ?? ""), ext: a.length >= 3 ? String(a[2] ?? "") : "" });
      }
      const vk = Object.keys(risuext.vits ?? {});
      if (vk.length) refs.vits = vk.map((k) => ({ ...v2Ref(risuext.vits[k]), name: k }));
    }
    for (const a of card2.spec === "chara_card_v3" ? data.assets ?? [] : []) {
      const uri = String(a.uri ?? "");
      let ref = null;
      if (uri.startsWith("__asset:")) ref = assetRef(uri.slice(8), true);
      else if (uri.startsWith("embeded://")) ref = assetRef(uri.slice(10), true);
      else if (uri.startsWith("data:")) ref = assetRef(uri, false);
      else if (uri === "ccdefault:") ref = mainRef ?? null;
      else continue;
      if (!ref) continue;
      const name = String(a.name ?? "");
      if (a.type === "emotion") refs.emotions.push({ ...ref, name });
      else if (a.type === "x-risu-asset") refs.additional.push({ ...ref, name, ext: String(a.ext ?? "unknown") });
      else if (a.type === "icon" && a.name === "main") refs.icon = ref;
      else refs.cc.push({ ...ref, name, type: a.type ?? "asset", ext: a.ext ?? "unknown" });
    }
    const charbook = data.character_book;
    let lorebook = md?.lorebook ? JSON.parse(JSON.stringify(md.lorebook)) : [];
    let loreSettings, loreExt;
    if (charbook) {
      if (!nullish(charbook.recursive_scanning) && !nullish(charbook.scan_depth) && !nullish(charbook.token_budget)) {
        const ex = charbook.extensions ?? {};
        const mm = ex.risu_matchingMode;
        loreSettings = {
          tokenBudget: charbook.token_budget,
          scanDepth: charbook.scan_depth,
          recursiveScanning: charbook.recursive_scanning,
          maxRecursionSteps: ex.risu_maxRecursionSteps ?? 0,
          fullWordMatching: ex.risu_fullWordMatching ?? false,
          matchingMode: mm === "partial" || mm === "whitespace" || mm === "word-boundary" ? mm : ex.risu_fullWordMatching ? "whitespace" : "partial"
        };
      }
      loreExt = charbook.extensions;
      if (!md?.lorebook) lorebook = convertCharbookEntries(charbook);
    }
    const ext = JSON.parse(JSON.stringify(data.extensions ?? {}));
    delete ext.risuai;
    delete ext.risubard;
    delete ext.depth_prompt;
    const fields = {
      name: data.name ?? "",
      firstMessage: data.first_mes ?? "",
      desc: data.description ?? "",
      exampleMessage: data.mes_example ?? "",
      creatorNotes: data.creator_notes ?? "",
      systemPrompt: data.system_prompt ?? "",
      postHistoryInstructions: data.post_history_instructions ?? "",
      alternateGreetings: data.alternate_greetings ?? [],
      tags: data.tags ?? [],
      creator: data.creator ?? "",
      characterVersion: `${data.character_version}` || "",
      personality: data.personality ?? "",
      scenario: data.scenario ?? "",
      additionalData: { tag: data.tags ?? [], creator: data.creator, character_version: data.character_version },
      extentions: ext,
      group_only_greetings: data.group_only_greetings ?? [],
      nickname: data.nickname ?? "",
      source: data.source ?? risuext?.source ?? [],
      creation_date: data.creation_date ?? 0,
      modification_date: data.modification_date ?? 0,
      globalLore: lorebook,
      loreSettings,
      loreExt
    };
    const risuFields = risuext ? {
      bias: risuext.bias ?? [],
      viewScreen: risuext.viewScreen ?? "none",
      customscript: risuext.customScripts ?? [],
      utilityBot: risuext.utilityBot ?? false,
      replaceGlobalNote: !Object.prototype.hasOwnProperty.call(risuext, "replaceGlobalNote") ? data.post_history_instructions ?? "" : risuext.replaceGlobalNote ?? "",
      backgroundHTML: risuext.backgroundHTML,
      license: risuext.license,
      triggerscript: risuext.triggerscript ?? [],
      private: risuext.private ?? false,
      additionalText: risuext.additionalText ?? "",
      largePortrait: risuext.largePortrait ?? false,
      inlayViewScreen: risuext.inlayViewScreen ?? false,
      newGenData: risuext.newGenData ?? void 0,
      lowLevelAccess: risuext.lowLevelAccess ?? false,
      hideChatIcon: risuext.hideChatIcon ?? false,
      moduleNamespace: risuext.moduleNamespace ?? "",
      defaultVariables: risuext.defaultVariables ?? "",
      prebuiltAssetCommand: risuext.prebuiltAssetCommand ?? "",
      prebuiltAssetExclude: risuext.prebuiltAssetExclude ?? [],
      prebuiltAssetStyle: risuext.prebuiltAssetStyle ?? "",
      customModuleToggle: risuext.toggles ?? "",
      ...risuext.sdData ? { sdData: risuext.sdData } : {}
    } : {};
    return { fields, risuFields, refs, hasRisuExt: !!risuext, largePortraitDefault: !risuext };
  }
  function offSpecToCharacter(charaData, mainRef) {
    const v2 = charaData.spec_version === "2.0";
    const data = v2 ? charaData.data : charaData;
    const charbook = v2 ? charaData.data.character_book : null;
    let loreSettings, loreExt, lorebook = [];
    if (charbook) {
      if (!nullish(charbook.recursive_scanning) && !nullish(charbook.scan_depth) && !nullish(charbook.token_budget)) {
        const ex = charbook.extensions ?? {}, mm = ex.risu_matchingMode;
        loreSettings = {
          tokenBudget: charbook.token_budget,
          scanDepth: charbook.scan_depth,
          recursiveScanning: charbook.recursive_scanning,
          maxRecursionSteps: ex.risu_maxRecursionSteps ?? 0,
          fullWordMatching: ex.risu_fullWordMatching ?? false,
          matchingMode: mm === "partial" || mm === "whitespace" || mm === "word-boundary" ? mm : ex.risu_fullWordMatching ? "whitespace" : "partial"
        };
      }
      loreExt = charbook.extensions;
      lorebook = convertCharbookEntries(charbook);
    }
    return {
      fields: {
        name: data.name ?? "unknown name",
        firstMessage: data.first_mes ?? "unknown first message",
        desc: data.description ?? "",
        exampleMessage: data.mes_example,
        systemPrompt: (v2 ? charaData.data.system_prompt : "") ?? "",
        postHistoryInstructions: (v2 ? charaData.data.post_history_instructions : "") ?? "",
        personality: data.personality ?? "",
        scenario: data.scenario ?? "",
        globalLore: lorebook,
        loreSettings,
        loreExt
      },
      risuFields: {},
      refs: { emotions: [], additional: [], cc: [], icon: mainRef ?? null, vits: null },
      hasRisuExt: false,
      largePortraitDefault: false,
      offSpec: true
    };
  }
  function b64bytes(b642) {
    const bin = atob(String(b642).replace(/\s+/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function inlineRef(b642) {
    const bytes = b64bytes(b642);
    return { source: "mem", bytes, size: bytes.length, hash: sha256js(bytes) };
  }
  function missingRef(key, mode) {
    if (mode === true) throw new Error(`카드가 가리키는 에셋이 파일 안에 없습니다: ${key}`);
    if (!key) return null;
    return inlineRef(mode === false ? key.split(",")[1] ?? "" : key);
  }

  // src/engine/formats/bytes.js
  async function readAssetBytes(blob, asset) {
    if (asset.source === "zip") return readZipEntry(blob, asset.entry);
    if (asset.source === "mem") return asset.bytes.slice();
    if (asset.source === "png") {
      const text = new TextDecoder().decode(await readRange(blob, asset.offset, asset.offset + asset.length));
      return b64bytes(text);
    }
    return rpackDecode(await readRange(blob, asset.offset, asset.offset + asset.length));
  }

  // src/engine/formats/png.js
  async function readPngCard(blob, onProgress, shouldStop, hooks) {
    const sig = await readRange(blob, 0, 8);
    if (sig.length < 8 || sig[0] !== 137 || sig[1] !== 80 || sig[2] !== 78 || sig[3] !== 71) throw new Error("PNG 파일이 아닙니다");
    const trimmed = [sig];
    const chunkRefs = /* @__PURE__ */ new Map();
    let chara = "", ccv3 = "", pos = 8, count = 0;
    const be322 = (b, o2) => (b[o2] << 24 | b[o2 + 1] << 16 | b[o2 + 2] << 8 | b[o2 + 3]) >>> 0;
    const dec = new TextDecoder();
    while (pos + 12 <= blob.size) {
      if (shouldStop?.()) throw new Cancelled();
      const h2 = await readRange(blob, pos, pos + 8);
      const len = be322(h2, 0);
      const type = String.fromCharCode(h2[4], h2[5], h2[6], h2[7]);
      const end = pos + 12 + len;
      if (end > blob.size) throw new Error("PNG가 잘렸습니다");
      if (type === "tEXt") {
        const head = await readRange(blob, pos + 8, pos + 8 + Math.min(len, 80));
        let z = -1;
        for (let i = 0; i < Math.min(70, head.length); i++) if (head[i] === 0) {
          z = i;
          break;
        }
        if (z >= 0) {
          const key = dec.decode(head.subarray(0, z));
          const vStart = pos + 8 + z + 1, vLen = len - z - 1;
          if (key === "chara" || key === "ccv3") {
            const v = dec.decode(await readRange(blob, vStart, vStart + vLen));
            if (key === "chara" && chara.length < 5 * 1024 * 1024) chara = v;
            if (key === "ccv3" && ccv3.length < 5 * 1024 * 1024) ccv3 = v;
          } else if (key.startsWith("chara-ext-asset_")) {
            const idx = key.replace("chara-ext-asset_:", "").replace("chara-ext-asset_", "");
            const ref = { source: "png", offset: vStart, length: vLen };
            const bytes = await readAssetBytes(blob, ref);
            chunkRefs.set(idx, { ...ref, size: bytes.length, hash: await sha256(bytes) });
            count++;
          }
        }
      } else {
        trimmed.push(await readRange(blob, pos, end));
        if (type === "IEND") break;
      }
      pos = end;
      onProgress?.(pos, blob.size, count);
    }
    if (!chara && !ccv3) throw new Error("PNG 안에 캐릭터 카드 정보가 없습니다");
    const total = trimmed.reduce((n, b) => n + b.length, 0);
    const img = new Uint8Array(total);
    let o = 0;
    for (const b of trimmed) {
      img.set(b, o);
      o += b.length;
    }
    const mainRef = { source: "mem", bytes: img, size: img.length, hash: await sha256(img) };
    let raw = ccv3 || chara;
    let card2;
    if (raw.startsWith("rcc||")) card2 = await decryptRcc(raw, hooks);
    else {
      const text = new TextDecoder().decode(b64bytes(raw));
      card2 = JSON.parse(text);
      if (typeof card2?.data?.character_version === "number") card2.data.character_version = card2.data.character_version.toString();
    }
    const assetRef = (key, mode) => {
      if (mode === true) {
        const r = chunkRefs.get(key);
        if (!r) throw new Error(`카드가 가리키는 에셋이 PNG 안에 없습니다: ${key}`);
        return r;
      }
      if (!key) return null;
      return inlineRef(mode === false ? key.split(",")[1] ?? "" : key);
    };
    const character = card2?.spec === "chara_card_v2" || card2?.spec === "chara_card_v3" ? cardToCharacter(card2, null, assetRef, mainRef) : offSpecToCharacter(card2, mainRef);
    return { kind: "png", assets: [], character, notes: card2?.data?.extensions?.risubard ? ["RisuBard 전용 확장(bardLore 등)이 있는 카드입니다. 로어북 처리 결과가 기본 임포트와 조금 다를 수 있습니다."] : [] };
  }
  async function decryptRcc(raw, hooks) {
    const parts = raw.split("||");
    if (parts[1] !== "rccv1" || parts.length !== 5) throw new Error("알 수 없는 암호 카드 형식입니다");
    if (!subtle) throw new Error("암호 카드는 https 또는 localhost 접속에서만 풀 수 있습니다");
    const enc = b64bytes(parts[2]);
    if (await sha256(enc) !== parts[3]) throw new Error("암호 카드가 손상되었습니다");
    const meta = JSON.parse(new TextDecoder().decode(b64bytes(parts[4])));
    let pw = "RISU_NONE";
    if (meta?.usePassword) {
      pw = await hooks?.askPassword?.();
      if (!pw) throw new Cancelled();
    }
    try {
      const keyBytes = await subtle.digest("SHA-256", new TextEncoder().encode(pw));
      const key = await subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
      const out = await subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(12) }, key, enc);
      return JSON.parse(new TextDecoder().decode(new Uint8Array(out)));
    } catch {
      throw new Error(meta?.usePassword ? "비밀번호가 틀렸습니다" : "암호 카드를 풀지 못했습니다");
    }
  }

  // src/engine/formats/index.js
  async function readIncoming(name, blob, onProgress, shouldStop, hooks = {}) {
    const lower = name.toLowerCase();
    if (lower.endsWith(".risum")) return scanRisum(blob, onProgress, shouldStop);
    if (lower.endsWith(".png")) return readPngCard(blob, onProgress, shouldStop, hooks);
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
      try {
        return { ...await readCharx(blob, onProgress, shouldStop), kind: "charx-jpeg" };
      } catch (e) {
        throw new Error(`JPEG 안에서 캐릭터 데이터(charx)를 찾지 못했습니다: ${e?.message ?? e}`);
      }
    }
    if (lower.endsWith(".json")) {
      const json = JSON.parse(new TextDecoder().decode(await readRange(blob, 0, blob.size)));
      if (json?.spec === "chara_card_v2" || json?.spec === "chara_card_v3") {
        const character = cardToCharacter(json, null, missingRef, null);
        return { kind: "card-json", assets: [], character, notes: [] };
      }
      if (json?.type !== "risuModule" || !json.name) throw new Error("RisuAI 모듈 .json이 아닙니다 (type: risuModule)");
      const { type, ...mod } = json;
      const assets = (mod.assets ?? []).map((a, index) => ({ index, name: String(a[0] ?? ""), ext: String(a[2] ?? ""), path: String(a[1] ?? ""), hash: HASH_KEY.exec(String(a[1] ?? ""))?.[1] ?? null, size: 0 }));
      return { kind: "json", module: mod, assets };
    }
    if (lower.endsWith(".charx")) return readCharx(blob, onProgress, shouldStop);
    throw new Error(".charx · .png · .jpg · .risum · .json 파일을 골라 주세요");
  }

  // src/engine/match.js
  var DECOR = /[\s　_\-–—~·•|/\\:;,.!?'"`“”‘’「」『』【】〔〕<>《》()[\]{}♡♥❤☆★✦✧◆◇○●◎※♪♬#*+=^]+/g;
  var VERSION_WORDS = /(?:^|[\s_\-(\[【])(?:최종|수정본?|최신|업데이트|update[d]?|fix(?:ed)?|final|new|latest|patch(?:ed)?|hotfix)(?=$|[\s_\-)\]】])/gi;
  function normalizeName(name) {
    let s = String(name ?? "").normalize("NFKC").toLowerCase();
    s = s.replace(/[(\[【{](?:\s*(?:v|ver|version|버전|vol)\.?\s*[\d.]+[a-z]?\s*)[)\]】}]/gi, " ");
    s = s.replace(/(?:^|[\s_\-])(?:v|ver|version|버전)\.?\s*\d+(?:\.\d+)*(?=$|[\s_\-)\]】])/gi, " ");
    s = s.replace(VERSION_WORDS, " ");
    s = s.replace(/(?:^|[\s_\-])\d+(?:\.\d+)+(?=$|[\s_\-)\]】])/g, " ");
    return s.replace(DECOR, "");
  }
  function stripTrailingNumber(norm) {
    return norm.replace(/(?:v|ver|vol)?\d+$/i, "");
  }
  function moduleHashes(mod) {
    const set = /* @__PURE__ */ new Set();
    for (const a of mod.assets ?? []) {
      const m = HASH_KEY.exec(String(a?.[1] ?? ""));
      if (m) set.add(m[1]);
    }
    return set;
  }
  function findCandidates(existingModules, incomingMod, incomingHashes) {
    const inNorm = normalizeName(incomingMod.name);
    const inLoose = stripTrailingNumber(inNorm);
    const out = [];
    existingModules.forEach((mod, index) => {
      if (!mod || typeof mod !== "object") return;
      const reasons = [];
      let score = 0;
      const exNorm = normalizeName(mod.name);
      if (inNorm && exNorm === inNorm) {
        score += 50;
        reasons.push(mod.name === incomingMod.name ? "이름이 같음" : "버전 표시를 빼면 이름이 같음");
      } else if (inLoose && inLoose.length >= 2 && stripTrailingNumber(exNorm) === inLoose) {
        score += 20;
        reasons.push("이름 끝 숫자만 다름");
      }
      if (incomingMod.namespace && mod.namespace && incomingMod.namespace === mod.namespace) {
        score += 30;
        reasons.push("네임스페이스가 같음");
      }
      const ex = moduleHashes(mod);
      if (incomingHashes.size >= 5 && ex.size >= 5) {
        let shared = 0;
        for (const h2 of incomingHashes) if (ex.has(h2)) shared++;
        const ratio = shared / Math.min(incomingHashes.size, ex.size);
        if (ratio >= 0.5) {
          score += 40;
          reasons.push(`에셋 ${Math.round(ratio * 100)}% 겹침 (${shared}개)`);
        } else if (shared > 0 && score > 0) reasons.push(`에셋 ${shared}개 겹침`);
      }
      if (score <= 0) return;
      const confidence = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
      out.push({ index, module: mod, score, confidence, reasons });
    });
    return out.sort((a, b) => b.score - a.score);
  }

  // src/engine/module.js
  var AUTHOR_FIELDS = [
    "name",
    "description",
    "regex",
    "trigger",
    "cjs",
    "lowLevelAccess",
    "hideIcon",
    "backgroundEmbedding",
    "namespace",
    "customModuleToggle",
    "mcp"
  ];
  function loreIdentity(entry2) {
    return JSON.stringify([entry2?.mode ?? "", entry2?.comment ?? "", entry2?.key ?? "", entry2?.secondkey ?? ""]);
  }
  function mergeLorebook(existing, incoming, keepExistingOnly) {
    const ex = slotted(existing, loreIdentity);
    const exBySlot = new Map(ex.map((e) => [e.slot, e.item]));
    const inc = slotted(incoming, loreIdentity);
    const incSlots = new Set(inc.map((e) => e.slot));
    const result = [];
    const stat = { added: 0, updated: 0, same: 0, keptExistingOnly: 0, removedExistingOnly: 0 };
    for (const { slot, item } of inc) {
      const old = exBySlot.get(slot);
      if (!old) stat.added++;
      else if (stableJson(old) === stableJson(item)) stat.same++;
      else stat.updated++;
      result.push(item);
    }
    for (const { slot, item } of ex) {
      if (incSlots.has(slot)) continue;
      if (keepExistingOnly) {
        result.push(item);
        stat.keptExistingOnly++;
      } else stat.removedExistingOnly++;
    }
    return { lorebook: result, stat };
  }
  function planAssets(existingMod, incomingAssets, knownKeys, keepExistingOnly, incomingIcon) {
    const exAssets = existingMod?.assets ?? [];
    const exByName = /* @__PURE__ */ new Map();
    for (const a of exAssets) {
      const k = `${String(a[0]).toLowerCase()}|${a[2] ?? ""}`;
      if (!exByName.has(k)) exByName.set(k, a);
    }
    const toUpload = [];
    const entries = [];
    const stat = { added: 0, replaced: 0, unchanged: 0, upload: 0, uploadBytes: 0, reused: 0, keptExistingOnly: 0, removedExistingOnly: 0 };
    const uploadByHash = /* @__PURE__ */ new Map();
    const incNames = /* @__PURE__ */ new Set();
    for (const a of incomingAssets) {
      const nameKey = `${a.name.toLowerCase()}|${a.ext}`;
      incNames.add(nameKey);
      const old = exByName.get(nameKey);
      let path;
      if (a.hash) {
        const key = assetKey(a.hash);
        if (old && HASH_KEY.exec(old[1])?.[1] === a.hash) {
          path = old[1];
        } else if (knownKeys.has(key)) {
          path = key;
          stat.reused++;
        } else if (a.offset !== void 0 || a.source) {
          path = key;
          if (!uploadByHash.has(a.hash)) {
            uploadByHash.set(a.hash, a);
            toUpload.push(a);
            stat.upload++;
            stat.uploadBytes += a.size;
          }
        } else path = a.path;
      } else path = a.path ?? "";
      if (!old) stat.added++;
      else if (old[1] === path) stat.unchanged++;
      else stat.replaced++;
      entries.push({ asset: a, path });
    }
    const extra = [];
    for (const a of exAssets) {
      const nameKey = `${String(a[0]).toLowerCase()}|${a[2] ?? ""}`;
      if (incNames.has(nameKey)) continue;
      if (keepExistingOnly) {
        extra.push(a);
        stat.keptExistingOnly++;
      } else stat.removedExistingOnly++;
    }
    let iconPath = null;
    if (incomingIcon?.hash) {
      iconPath = assetKey(incomingIcon.hash);
      const sameAsOld = existingMod?.icon && HASH_KEY.exec(existingMod.icon)?.[1] === incomingIcon.hash;
      if (sameAsOld) iconPath = existingMod.icon;
      else if (!knownKeys.has(iconPath) && !uploadByHash.has(incomingIcon.hash)) {
        const iconAsset = { ...incomingIcon, name: "(모듈 아이콘)", ext: "png" };
        uploadByHash.set(incomingIcon.hash, iconAsset);
        toUpload.push(iconAsset);
        stat.upload++;
        stat.uploadBytes += incomingIcon.size ?? 0;
      }
    }
    return { entries, extra, toUpload, stat, iconPath };
  }
  function buildMergedModule(existingMod, incoming, assetPlan, uploaded, opts) {
    const inc = incoming.module;
    const merged = existingMod ? { ...existingMod } : {};
    for (const f of AUTHOR_FIELDS) {
      if (f in inc) merged[f] = inc[f];
      else if (existingMod && f !== "name") delete merged[f];
    }
    merged.name = inc.name ?? existingMod?.name ?? "이름 없는 모듈";
    const lore = mergeLorebook(existingMod?.lorebook, inc.lorebook, opts.keepExistingOnly && !!existingMod);
    merged.lorebook = lore.lorebook;
    merged.assets = [
      ...assetPlan.entries.map(({ asset, path }) => [asset.name, asset.hash && uploaded.get(asset.hash) || path, asset.ext]),
      ...assetPlan.extra
    ];
    if (assetPlan.iconPath) merged.icon = incoming.icon?.hash && uploaded.get(incoming.icon.hash) || assetPlan.iconPath;
    else if (inc.icon && opts.knownKeys.has(inc.icon)) merged.icon = inc.icon;
    else if (existingMod?.icon) merged.icon = existingMod.icon;
    else delete merged.icon;
    merged.id = existingMod?.id ?? opts.newId();
    return { module: merged, lore: lore.stat };
  }
  function fieldChanges(existingMod, inc) {
    if (!existingMod) return [];
    const labels = {
      name: "이름",
      description: "설명",
      regex: "정규식",
      trigger: "트리거",
      cjs: "스크립트",
      lowLevelAccess: "저수준 접근",
      hideIcon: "아이콘 숨김",
      backgroundEmbedding: "배경 HTML",
      namespace: "네임스페이스",
      customModuleToggle: "모듈 토글",
      mcp: "MCP"
    };
    const norm = (v) => v === void 0 || v === null || v === false || v === "" || Array.isArray(v) && !v.length ? null : v;
    return AUTHOR_FIELDS.filter((f) => stableJson(norm(existingMod[f])) !== stableJson(norm(inc[f]))).map((f) => labels[f] ?? f);
  }
  function collectKnownKeys(modules) {
    const keys = /* @__PURE__ */ new Set();
    for (const m of modules ?? []) {
      for (const a of m?.assets ?? []) if (a?.[1]) keys.add(String(a[1]));
      if (m?.icon) keys.add(String(m.icon));
    }
    return keys;
  }

  // src/engine/character.js
  function characterAssetKeys(ch) {
    const keys = [];
    if (ch?.image) keys.push(ch.image);
    for (const e of ch?.emotionImages ?? []) keys.push(e?.[1]);
    for (const a of ch?.additionalAssets ?? []) keys.push(a?.[1]);
    for (const c of ch?.ccAssets ?? []) keys.push(c?.uri);
    return keys.filter(Boolean).map(String);
  }
  function characterView(ch) {
    return { name: ch?.name, namespace: ch?.moduleNamespace || void 0, assets: characterAssetKeys(ch).map((k) => ["", k, ""]) };
  }
  function mergeNamedList(oldList, incoming, keyOf3, keepExistingOnly) {
    const oldBy = /* @__PURE__ */ new Map();
    for (const o of oldList ?? []) {
      const k = keyOf3(o);
      if (!oldBy.has(k)) oldBy.set(k, o);
    }
    const incKeys = new Set(incoming.map((i) => i.key));
    const stat = { added: 0, replaced: 0, unchanged: 0, keptExistingOnly: 0, removedExistingOnly: 0 };
    for (const i of incoming) {
      const o = oldBy.get(i.key);
      if (!o) stat.added++;
      else if (i.same(o)) stat.unchanged++;
      else stat.replaced++;
    }
    const extra = [];
    for (const o of oldList ?? []) {
      if (incKeys.has(keyOf3(o))) continue;
      if (keepExistingOnly) {
        extra.push(o);
        stat.keptExistingOnly++;
      } else stat.removedExistingOnly++;
    }
    return { extra, stat };
  }
  function planCharacter(existing, incomingChar, knownKeys, keepExistingOnly) {
    const toUpload = [], byHash = /* @__PURE__ */ new Map();
    let upload = 0, uploadBytes = 0, reused = 0;
    const pathFor = (ref, oldPath) => {
      const key = assetKey(ref.hash);
      if (oldPath && HASH_KEY.exec(oldPath)?.[1] === ref.hash) return oldPath;
      if (knownKeys.has(key)) {
        reused++;
        return key;
      }
      if (!byHash.has(ref.hash)) {
        byHash.set(ref.hash, ref);
        toUpload.push(ref);
        upload++;
        uploadBytes += ref.size ?? 0;
      }
      return key;
    };
    const r = incomingChar.refs;
    const oldEmo = new Map((existing.emotionImages ?? []).map((e) => [String(e[0]).toLowerCase(), e[1]]));
    const oldAdd = new Map((existing.additionalAssets ?? []).map((a) => [`${String(a[0]).toLowerCase()}|${a[2] ?? ""}`, a[1]]));
    const emotions = r.emotions.map((e) => ({ key: e.name.toLowerCase(), name: e.name, path: pathFor(e, oldEmo.get(e.name.toLowerCase())), ref: e }));
    const additional = r.additional.map((a) => {
      const k = `${a.name.toLowerCase()}|${a.ext}`;
      return { key: k, name: a.name, ext: a.ext, path: pathFor(a, oldAdd.get(k)), ref: a };
    });
    const cc = r.cc.map((c) => ({ type: c.type, name: c.name, ext: c.ext, path: pathFor(c), ref: c }));
    const image = r.icon ? pathFor(r.icon, existing.image) : null;
    const oldVits = existing.vits?.files ?? {};
    const vits = r.vits ? r.vits.map((v) => ({ name: v.name, path: pathFor(v, oldVits[v.name]), ref: v })) : null;
    const emoM = mergeNamedList(existing.emotionImages, emotions.map((e) => ({ key: e.key, same: (o) => o[1] === e.path })), (o) => String(o[0]).toLowerCase(), keepExistingOnly);
    const addM = mergeNamedList(existing.additionalAssets, additional.map((a) => ({ key: a.key, same: (o) => o[1] === a.path })), (o) => `${String(o[0]).toLowerCase()}|${o[2] ?? ""}`, keepExistingOnly);
    return {
      toUpload,
      emotions,
      additional,
      cc,
      image,
      vits,
      emoExtra: emoM.extra,
      addExtra: addM.extra,
      stat: { upload, uploadBytes, reused, emotions: emoM.stat, additional: addM.stat, imageChanged: !!image && image !== existing.image }
    };
  }
  function buildMergedCharacter(existing, incomingChar, plan, uploaded, keepExistingOnly) {
    const p = (ref, path) => ref?.hash && uploaded.get(ref.hash) || path;
    const merged = { ...existing, ...incomingChar.fields, ...incomingChar.risuFields };
    for (const k of ["loreSettings", "loreExt"]) if (merged[k] === void 0) {
      if (existing[k] !== void 0) merged[k] = existing[k];
      else delete merged[k];
    }
    for (const k of ["backgroundHTML", "license", "newGenData"]) if (merged[k] === void 0) delete merged[k];
    const lore = mergeLorebook(existing.globalLore, incomingChar.fields.globalLore, keepExistingOnly);
    merged.globalLore = lore.lorebook;
    merged.emotionImages = [...plan.emotions.map((e) => [e.name, p(e.ref, e.path)]), ...plan.emoExtra];
    merged.additionalAssets = [...plan.additional.map((a) => [a.name, p(a.ref, a.path), a.ext]), ...plan.addExtra];
    merged.ccAssets = plan.cc.map((c) => ({ type: c.type, uri: p(c.ref, c.path), name: c.name, ext: c.ext }));
    if (plan.image) merged.image = p(incomingChar.refs.icon, plan.image);
    if (plan.vits) {
      merged.vits = { name: "Imported VITS", files: Object.fromEntries(plan.vits.map((v) => [v.name, p(v.ref, v.path)])), id: existing.vits?.id ?? newId().replace(/-/g, "") };
      merged.ttsMode = "vits";
    }
    for (const k of ["chaId", "chats", "chatPage", "chatFolders", "notes", "firstMsgIndex", "type", "trashTime", "bardLore", "bardPainter", "modules"]) {
      if (k in existing) merged[k] = existing[k];
      else delete merged[k];
    }
    return { character: merged, lore: lore.stat };
  }
  function newCharacterBase(incomingChar) {
    return {
      type: "character",
      chaId: newId(),
      chatPage: 0,
      notes: "",
      firstMsgIndex: -1,
      removedQuotes: false,
      imported: true,
      virtualscript: "",
      chats: [{ id: newId(), message: [], note: "", name: "Chat 1", localLore: [], supaMemory: false }],
      chatFolders: [],
      vits: null,
      ttsMode: "normal",
      emotionImages: [],
      additionalAssets: [],
      ccAssets: [],
      globalLore: [],
      bias: [],
      viewScreen: "none",
      sdData: [["always", "solo, 1girl"], ["negative", ""], ["|character's appearance", ""], ["current situation", ""], ["$character's pose", ""], ["$character's emotion", ""], ["current location", ""]],
      utilityBot: false,
      customscript: [],
      replaceGlobalNote: "",
      triggerscript: [],
      private: false,
      additionalText: "",
      largePortrait: !!incomingChar.largePortraitDefault,
      inlayViewScreen: false,
      lowLevelAccess: false,
      hideChatIcon: false,
      moduleNamespace: "",
      defaultVariables: "",
      prebuiltAssetCommand: "",
      prebuiltAssetExclude: [],
      prebuiltAssetStyle: "",
      customModuleToggle: "",
      extentions: {},
      exampleMessage: "",
      creatorNotes: "",
      systemPrompt: "",
      postHistoryInstructions: "",
      alternateGreetings: [],
      tags: [],
      creator: "",
      characterVersion: "",
      personality: "",
      scenario: "",
      source: []
    };
  }
  function uniqueDisplayName(name, characters) {
    const norm = (v) => typeof v === "string" ? v.trim().normalize("NFC").toUpperCase().toLowerCase() : "";
    const taken = new Set((characters ?? []).map((c) => norm(c?.name)).filter(Boolean));
    const base = String(name ?? "").trim();
    if (!norm(base) || !taken.has(norm(base))) return base;
    let i = 2;
    while (taken.has(norm(`${base} (${i})`))) i++;
    return `${base} (${i})`;
  }
  function buildNewCharacter(incomingChar, plan, uploaded, characters) {
    const base = newCharacterBase(incomingChar);
    const { character } = buildMergedCharacter(base, incomingChar, plan, uploaded, false);
    character.name = uniqueDisplayName(character.name, characters);
    return character;
  }
  var CHAR_LABELS = {
    name: "이름",
    firstMessage: "첫 메시지",
    desc: "설명",
    exampleMessage: "예시 대화",
    creatorNotes: "제작자 노트",
    systemPrompt: "시스템 프롬프트",
    postHistoryInstructions: "후속 지시",
    alternateGreetings: "추가 인사말",
    personality: "성격",
    scenario: "시나리오",
    customscript: "정규식",
    triggerscript: "트리거",
    backgroundHTML: "배경 HTML",
    lowLevelAccess: "저수준 접근",
    replaceGlobalNote: "글로벌 노트 교체",
    defaultVariables: "기본 변수",
    customModuleToggle: "모듈 토글"
  };
  function characterFieldChanges(existing, incomingChar) {
    const all = { ...incomingChar.fields, ...incomingChar.risuFields };
    const norm = (v) => v === void 0 || v === null || v === false || v === "" || Array.isArray(v) && !v.length ? null : v;
    return Object.keys(CHAR_LABELS).filter((k) => k in all && stableJson(norm(existing[k])) !== stableJson(norm(all[k]))).map((k) => CHAR_LABELS[k]);
  }

  // src/engine/upload.js
  async function uploadAssets(blob, list, saveAsset, { onProgress, shouldStop, concurrency = 16, maxInflightBytes = 64 * 1024 * 1024, retryDelayMs = 1500 } = {}) {
    const uploaded = /* @__PURE__ */ new Map();
    const started = Date.now();
    let limit = Math.max(1, concurrency), next = 0, active = 0, inflight = 0, done = 0, bytes = 0, failed = null;
    const attempts = /* @__PURE__ */ new Map();
    const retry = [];
    const stopped = () => failed !== null || !!shouldStop?.();
    return await new Promise((resolve, reject) => {
      const finish = () => {
        if (active > 0) return;
        if (failed) return reject(failed);
        if (done < list.length && shouldStop?.()) return reject(new Cancelled());
        if (done === list.length) resolve(uploaded);
      };
      const pick = () => retry.length ? retry.shift() : next < list.length ? list[next++] : null;
      const pump = () => {
        while (!stopped() && active < limit) {
          const peek = retry.length ? retry[0] : list[next];
          if (!peek) break;
          if (active > 0 && inflight + (peek.size ?? 0) > maxInflightBytes) break;
          const a = pick();
          active++;
          inflight += a.size ?? 0;
          run(a);
        }
        finish();
      };
      const run = async (a) => {
        let ok = false;
        try {
          const data = await readAssetBytes(blob, a);
          const key = await saveAsset(data);
          if (typeof key !== "string" || !key) throw new Error("저장 결과가 비어 있습니다");
          uploaded.set(a.hash, key);
          done++;
          bytes += a.size ?? 0;
          ok = true;
          onProgress?.(done, list.length, bytes, Date.now() - started, limit);
        } catch (e) {
          const n = (attempts.get(a) ?? 0) + 1;
          attempts.set(a, n);
          if (n >= 4 || shouldStop?.()) failed ??= new Error(`에셋 저장 실패 (${a.name || a.index || a.hash?.slice(0, 8)}): ${e?.message ?? e}`);
          else {
            limit = Math.max(1, Math.floor(limit / 2));
            await new Promise((r) => setTimeout(r, retryDelayMs * n));
            retry.push(a);
          }
        } finally {
          active--;
          inflight -= a.size ?? 0;
          pump();
        }
      };
      if (!list.length) return resolve(uploaded);
      pump();
    });
  }

  // src/engine/merge3.js
  var idName = (e) => String(e?.[0] ?? "").toLowerCase();
  var idNameExt = (e) => `${String(e?.[0] ?? "").toLowerCase()}|${e?.[2] ?? ""}`;
  var idScript = (e) => JSON.stringify([e?.comment ?? "", e?.type ?? ""]);
  var CHAR_LISTS = { globalLore: loreIdentity, customscript: idScript, triggerscript: idScript, emotionImages: idName, additionalAssets: idNameExt };
  var MOD_LISTS = { lorebook: loreIdentity, regex: idScript, trigger: idScript, assets: idNameExt };
  var USER_KEYS = ["chaId", "chats", "chatPage", "chatFolders", "notes", "firstMsgIndex", "type", "trashTime", "bardLore", "bardPainter", "modules"];
  function charIncomingView(incomingChar, plan, uploaded) {
    const p = (ref, path) => ref?.hash && uploaded.get(ref.hash) || path;
    const v = { ...incomingChar.fields, ...incomingChar.risuFields };
    v.emotionImages = plan.emotions.map((e) => [e.name, p(e.ref, e.path)]);
    v.additionalAssets = plan.additional.map((a) => [a.name, p(a.ref, a.path), a.ext]);
    v.ccAssets = plan.cc.map((c) => ({ type: c.type, uri: p(c.ref, c.path), name: c.name, ext: c.ext }));
    if (plan.image) v.image = p(incomingChar.refs.icon, plan.image);
    if (plan.vits) {
      v.vits = { name: "Imported VITS", files: Object.fromEntries(plan.vits.map((x) => [x.name, p(x.ref, x.path)])) };
      v.ttsMode = "vits";
    }
    return v;
  }
  function modIncomingView(incoming, plan, uploaded, knownKeys) {
    const inc = incoming.module;
    const v = {};
    for (const f of AUTHOR_FIELDS) v[f] = inc[f];
    v.lorebook = inc.lorebook ?? [];
    v.assets = plan.entries.map(({ asset, path }) => [asset.name, asset.hash && uploaded.get(asset.hash) || path, asset.ext]);
    if (plan.iconPath) v.icon = incoming.icon?.hash && uploaded.get(incoming.icon.hash) || plan.iconPath;
    else if (inc.icon && knownKeys.has(inc.icon)) v.icon = inc.icon;
    return v;
  }
  function pickView(obj, keys) {
    const v = {};
    for (const k of keys) if (obj && k in obj) v[k] = obj[k];
    return v;
  }
  function merge3(base, cur, inc, spec, { choices = /* @__PURE__ */ new Map(), keepExistingOnly = true } = {}) {
    const eq = (a, b) => stableJson(a ?? null) === stableJson(b ?? null);
    const items = [];
    const view = {};
    const hasBase = !!base;
    const pick = (id, group, label, b, c, i, inB, inC, inI) => {
      if (!hasBase) {
        if (!inI) return keepExistingOnly ? [c, "kept"] : [void 0, "removed"];
        if (!inC) return [i, "added"];
        return eq(c, i) ? [c, "same"] : [i, "update"];
      }
      if (inC && inI && eq(c, i)) return [c, "same"];
      if (!inB) {
        if (inI && !inC) return [i, "added"];
        if (inC && !inI) return [c, "mine"];
        const ch = choices.get(id) ?? "inc";
        return [ch === "cur" ? c : i, "conflict"];
      }
      if (!inC) {
        if (!inI || eq(i, b)) return [void 0, "mine"];
        return (choices.get(id) ?? "inc") === "cur" ? [void 0, "conflict"] : [i, "conflict"];
      }
      if (!inI) {
        if (eq(c, b)) return [void 0, "removed"];
        return (choices.get(id) ?? "inc") === "cur" ? [c, "conflict"] : [void 0, "conflict"];
      }
      if (eq(c, b)) return [i, "update"];
      if (eq(i, b)) return [c, "mine"];
      return [(choices.get(id) ?? "inc") === "cur" ? c : i, "conflict"];
    };
    const record = (id, group, label, kind, extra) => {
      if (kind !== "same") items.push({ id, group, label, kind, choice: kind === "conflict" ? choices.get(id) ?? "inc" : void 0, ...extra });
    };
    for (const k of spec.scalars) {
      const has2 = (o, key) => !!o && key in o && o[key] !== void 0;
      const inB = hasBase && has2(base, k), inC = has2(cur, k), inI = has2(inc, k);
      if (!inI && !inB) continue;
      if (!hasBase && !inI) continue;
      const [val, kind] = pick(`f:${k}`, "field", spec.label(k), base?.[k], cur[k], inc[k], inB, inC, inI);
      if (kind === "removed" || val === void 0 && kind !== "kept") view[k] = void 0;
      else view[k] = val;
      if (kind === "kept") continue;
      record(`f:${k}`, "field", spec.label(k), kind, { cur: cur[k], inc: inc[k] });
    }
    for (const [k, idOf] of Object.entries(spec.lists)) {
      if (!(k in inc) && !(hasBase && k in base)) continue;
      const B = slotted(hasBase ? base[k] : [], idOf), C = slotted(cur[k], idOf), I = slotted(inc[k], idOf);
      const bm = new Map(B.map((x) => [x.slot, x.item])), cm = new Map(C.map((x) => [x.slot, x.item])), im = new Map(I.map((x) => [x.slot, x.item]));
      const out = [];
      const decide = (slot) => {
        const id = `l:${k}:${slot}`;
        const label = spec.itemLabel(k, cm.get(slot) ?? im.get(slot) ?? bm.get(slot));
        const [val, kind] = pick(id, k, label, bm.get(slot), cm.get(slot), im.get(slot), bm.has(slot), cm.has(slot), im.has(slot));
        record(id, k, label, kind, { cur: cm.get(slot), inc: im.get(slot) });
        return val;
      };
      const done = /* @__PURE__ */ new Set();
      for (const { slot } of I) {
        done.add(slot);
        const v = decide(slot);
        if (v !== void 0) out.push(v);
      }
      for (const { slot } of C) {
        if (done.has(slot)) continue;
        done.add(slot);
        const v = decide(slot);
        if (v !== void 0) out.push(v);
      }
      view[k] = out;
    }
    return { view, items, hasBase };
  }
  function charSpec(incomingChar) {
    const scalars = [.../* @__PURE__ */ new Set([...Object.keys(incomingChar.fields), ...Object.keys(incomingChar.risuFields), "image", "ccAssets", ...incomingChar.refs.vits ? ["vits", "ttsMode"] : []])].filter((k) => !(k in CHAR_LISTS));
    return { scalars, lists: CHAR_LISTS, label: (k) => CHAR_LABELS[k] ?? FIELD_EXTRA_LABELS[k] ?? k, itemLabel: listItemLabel };
  }
  var MOD_SPEC = { scalars: [...AUTHOR_FIELDS.filter((k) => !(k in MOD_LISTS)), "icon"], lists: MOD_LISTS, label: (k) => MOD_LABELS[k] ?? k, itemLabel: listItemLabel };
  var FIELD_EXTRA_LABELS = {
    image: "대표 이미지",
    ccAssets: "기타 카드 에셋",
    vits: "음성(VITS)",
    ttsMode: "TTS 방식",
    tags: "태그",
    creator: "제작자",
    characterVersion: "카드 버전",
    additionalData: "카드 메타데이터",
    extentions: "카드 확장",
    group_only_greetings: "그룹 첫 메시지",
    nickname: "별칭",
    source: "출처",
    creation_date: "작성일",
    modification_date: "수정일",
    loreSettings: "로어북 설정",
    loreExt: "로어북 확장",
    bias: "토큰 편향",
    viewScreen: "캐릭터 화면",
    utilityBot: "도구 봇",
    license: "라이선스",
    private: "비공개 카드",
    additionalText: "추가 텍스트",
    largePortrait: "세로 이미지",
    inlayViewScreen: "인레이 화면",
    newGenData: "이미지 생성 설정",
    hideChatIcon: "아이콘 숨기기",
    moduleNamespace: "모듈 네임스페이스",
    prebuiltAssetCommand: "사전 제작 에셋 명령",
    prebuiltAssetExclude: "사전 제작 에셋 제외",
    prebuiltAssetStyle: "사전 제작 에셋 스타일",
    sdData: "이미지 생성 프롬프트"
  };
  var MOD_LABELS = {
    name: "이름",
    description: "설명",
    cjs: "스크립트",
    lowLevelAccess: "저수준 접근",
    hideIcon: "아이콘 숨김",
    backgroundEmbedding: "배경 HTML",
    namespace: "네임스페이스",
    customModuleToggle: "모듈 토글",
    mcp: "MCP",
    icon: "아이콘",
    regex: "정규식",
    trigger: "트리거"
  };
  var LIST_LABELS = {
    globalLore: "로어북",
    lorebook: "로어북",
    customscript: "정규식",
    regex: "정규식",
    triggerscript: "트리거",
    trigger: "트리거",
    emotionImages: "감정 이미지",
    additionalAssets: "에셋",
    assets: "에셋"
  };
  function listItemLabel(list, item) {
    const g = LIST_LABELS[list] ?? list;
    if (Array.isArray(item)) return `${g}: ${item[0] || "(이름 없음)"}`;
    return `${g}: ${item?.comment || item?.key || "(이름 없음)"}`;
  }
  function applyView(existing, view, { userKeys = [] } = {}) {
    const out = { ...existing };
    for (const [k, v] of Object.entries(view)) {
      if (v === void 0) delete out[k];
      else out[k] = v;
    }
    for (const k of userKeys) {
      if (k in existing) out[k] = existing[k];
      else delete out[k];
    }
    return out;
  }
  function summarize(items) {
    const s = { update: 0, mine: 0, conflict: 0, added: 0, removed: 0, kept: 0 };
    for (const it of items) s[it.kind] = (s[it.kind] ?? 0) + 1;
    return s;
  }

  // src/engine/store.js
  async function gzip(bytes) {
    if (typeof CompressionStream !== "function") return bytes;
    try {
      return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
    } catch {
      return bytes;
    }
  }
  async function gunzip(bytes) {
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
  }
  var locks = /* @__PURE__ */ new WeakMap();
  function serial(api, fn) {
    const prev = locks.get(api) ?? Promise.resolve();
    const p = prev.then(fn, fn);
    locks.set(api, p.catch(() => {
    }));
    return p;
  }
  var STORE_KEY = "rbu:index:v1";
  var MAX_BACKUPS_PER_TARGET = 5;
  var MAX_BACKUPS = 80;
  function createStore(api) {
    const keepPerTarget = async () => {
      try {
        const raw = await api.pluginStorage.getItem("rbm:ui:v1");
        const n = raw ? JSON.parse(raw)?.keepBackups : null;
        return [3, 5, 10, 20].includes(n) ? n : MAX_BACKUPS_PER_TARGET;
      } catch {
        return MAX_BACKUPS_PER_TARGET;
      }
    };
    const readIndex = async () => {
      try {
        const raw = await api.pluginStorage.getItem(STORE_KEY);
        const j = raw ? JSON.parse(raw) : null;
        if (j && typeof j === "object") return { baselines: j.baselines ?? {}, backups: j.backups ?? [], history: j.history ?? [] };
      } catch {
      }
      return { baselines: {}, backups: [], history: [] };
    };
    const writeIndex = async (idx) => {
      await api.pluginStorage.setItem(STORE_KEY, JSON.stringify(idx));
    };
    const encode = async (obj) => {
      const raw = new TextEncoder().encode(JSON.stringify({ rbu: 1, data: obj }));
      const hash = await sha256(raw);
      return { raw, hash };
    };
    const upload = async (raw) => {
      const bytes = await gzip(raw);
      const size = bytes.length;
      const path = await api.saveAsset(bytes);
      if (typeof path !== "string" || !path) throw new Error("기록을 저장하지 못했습니다");
      return { path, size };
    };
    const getJson = async (path) => {
      const bytes = await api.readImage(path);
      if (!bytes) throw new Error("저장된 기록 파일을 찾지 못했습니다(에셋 정리로 지워졌을 수 있습니다)");
      let u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      if (u8[0] === 31 && u8[1] === 139) u8 = await gunzip(u8);
      const j = JSON.parse(new TextDecoder().decode(u8));
      if (j?.rbu !== 1) throw new Error("기록 파일 형식이 올바르지 않습니다");
      return j.data;
    };
    return {
      async getBaseline(key) {
        const idx = await readIndex();
        const b = idx.baselines[key];
        if (!b) return null;
        try {
          return await getJson(b.path);
        } catch {
          return null;
        }
      },
      async baselineInfo(key) {
        return (await readIndex()).baselines[key] ?? null;
      },
      async setBaseline(key, view) {
        const { raw, hash } = await encode(view);
        const cur = (await readIndex()).baselines[key];
        if (cur?.hash === hash) return;
        const { path } = await upload(raw);
        await serial(api, async () => {
          const idx = await readIndex();
          idx.baselines[key] = { path, hash, t: Date.now() };
          await writeIndex(idx);
        });
      },
      async addBackup({ kind, target, name, snapshot, note: note2, summary }) {
        const { raw, hash } = await encode(snapshot);
        const last2 = (await readIndex()).backups.find((b) => b.target === target);
        const file = last2?.hash === hash ? { path: last2.path, size: last2.size } : await upload(raw);
        return serial(api, async () => {
          const idx = await readIndex();
          const rec = { id: newId(), kind, target, name, t: Date.now(), path: file.path, size: file.size, hash, note: note2 ?? "", summary: summary ?? "", basePath: idx.baselines[`${kind === "character" ? "c" : "m"}:${target}`]?.path ?? null };
          idx.backups.unshift(rec);
          const keep = await keepPerTarget();
          const per = /* @__PURE__ */ new Map();
          const kept = idx.backups.filter((b) => {
            const n = (per.get(b.target) ?? 0) + 1;
            per.set(b.target, n);
            return n <= keep;
          }).slice(0, Math.max(MAX_BACKUPS, keep * 16));
          const dropped = idx.backups.filter((b) => !kept.includes(b));
          idx.history = [...dropped.map(({ id, kind: kind2, target: target2, name: name2, t, note: note3, summary: summary2 }) => ({ id, kind: kind2, target: target2, name: name2, t, note: note3, summary: summary2 })), ...idx.history ?? []].slice(0, 400);
          idx.backups = kept;
          await writeIndex(idx);
          return rec;
        });
      },
      async annotate(id, patch) {
        return serial(api, async () => {
          const idx = await readIndex();
          const b = idx.backups.find((x) => x.id === id);
          if (b) {
            Object.assign(b, patch);
            await writeIndex(idx);
          }
        });
      },
      async listBackups() {
        return (await readIndex()).backups;
      },
      async listHistory() {
        return (await readIndex()).history ?? [];
      },
      async loadBackup(rec) {
        return getJson(rec.path);
      },
      async removeBackup(id) {
        return serial(api, async () => {
          const idx = await readIndex();
          idx.backups = idx.backups.filter((b) => b.id !== id);
          await writeIndex(idx);
        });
      },
      async restoreBaseline(key, path) {
        return serial(api, async () => {
          const idx = await readIndex();
          if (path) idx.baselines[key] = { path, t: Date.now() };
          else delete idx.baselines[key];
          await writeIndex(idx);
        });
      }
    };
  }

  // src/engine/safety.js
  var isGenerating = (ch) => (ch?.chats ?? []).some((c) => c?.isStreaming === true || c?.message?.at?.(-1)?.isStreaming === true || c?.message?.at?.(-1)?.streaming === true);
  var Busy = class extends Error {
    constructor() {
      super("응답을 생성하는 중입니다. 생성이 끝난 뒤 다시 시도해 주세요. (에셋은 이미 올라가 있어 다음엔 빨리 끝납니다)");
      this.name = "Busy";
    }
  };
  function restoreFromBackup(kind, current, snapshot) {
    if (kind === "character") return applyView(current, Object.fromEntries(Object.keys({ ...current, ...snapshot }).filter((k) => !USER_KEYS.includes(k)).map((k) => [k, snapshot[k]])), { userKeys: USER_KEYS });
    return { ...snapshot, id: current.id };
  }
  var backupSnapshot = (kind, obj) => kind === "character" ? Object.fromEntries(Object.entries(obj).filter(([k]) => !["chats"].includes(k))) : obj;

  // src/engine/export.js
  var ENCODE = (() => {
    const e = new Uint8Array(256);
    for (let i = 0; i < 256; i++) e[DECODE[i]] = i;
    return e;
  })();
  function rpackEncode(data) {
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = ENCODE[data[i]];
    return out;
  }
  var u322 = (n) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n, true);
    return b;
  };
  async function buildRisum(module, readAsset, { onProgress, shouldStop } = {}) {
    const assets = module.assets ?? [];
    const clean = JSON.parse(JSON.stringify(module));
    delete clean.enabled;
    clean.assets = assets.map((a) => [a[0], "", a[2]]);
    const main = rpackEncode(new TextEncoder().encode(JSON.stringify({ module: clean, type: "risuModule" }, null, 2)));
    const parts = [new Uint8Array([111, 0]), u322(main.length), main];
    for (let i = 0; i < assets.length; i++) {
      if (shouldStop?.()) throw new Error("취소됨");
      const data = await readAsset(assets[i][1]);
      if (!data?.length) throw new Error(`에셋을 읽지 못했어요: ${assets[i][0] || assets[i][1]}`);
      const enc = rpackEncode(data instanceof Uint8Array ? data : new Uint8Array(data));
      parts.push(new Uint8Array([1]), u322(enc.length), enc);
      onProgress?.(i + 1, assets.length);
    }
    parts.push(new Uint8Array([0]));
    return new Blob(parts, { type: "application/octet-stream" });
  }
  function moduleJson(module) {
    const clean = JSON.parse(JSON.stringify(module));
    delete clean.enabled;
    return JSON.stringify({ ...clean, type: "risuModule" }, null, 2);
  }
  var safeFileName = (s) => String(s || "module").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").trim().slice(0, 120) || "module";

  // src/engine/zipwrite.js
  var CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(data) {
    let c = 4294967295;
    for (let i = 0; i < data.length; i++) c = CRC[(c ^ data[i]) & 255] ^ c >>> 8;
    return (c ^ 4294967295) >>> 0;
  }
  function createZip() {
    const parts = [], central = [];
    let offset = 0;
    const enc = new TextEncoder();
    const names = /* @__PURE__ */ new Set();
    const uniq = (name) => {
      let n = name, i = 2;
      const dot = name.lastIndexOf(".");
      while (names.has(n.toLowerCase())) n = dot > 0 ? `${name.slice(0, dot)} (${i++})${name.slice(dot)}` : `${name} (${i++})`;
      names.add(n.toLowerCase());
      return n;
    };
    return {
      add(name, data) {
        const bytes = typeof data === "string" ? enc.encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
        const nm = enc.encode(uniq(String(name).replace(/^\/+/, "")));
        const crc = crc32(bytes);
        const lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 67324752, true);
        lh.setUint16(4, 20, true);
        lh.setUint16(6, 2048, true);
        lh.setUint16(8, 0, true);
        lh.setUint32(14, crc, true);
        lh.setUint32(18, bytes.length, true);
        lh.setUint32(22, bytes.length, true);
        lh.setUint16(26, nm.length, true);
        parts.push(new Uint8Array(lh.buffer), nm, bytes);
        const ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 33639248, true);
        ch.setUint16(4, 20, true);
        ch.setUint16(6, 20, true);
        ch.setUint16(8, 2048, true);
        ch.setUint32(16, crc, true);
        ch.setUint32(20, bytes.length, true);
        ch.setUint32(24, bytes.length, true);
        ch.setUint16(28, nm.length, true);
        ch.setUint32(42, offset, true);
        central.push(new Uint8Array(ch.buffer), nm);
        offset += 30 + nm.length + bytes.length;
      },
      blob() {
        const cdSize = central.reduce((s, p) => s + p.length, 0);
        const count = central.length / 2;
        const end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 101010256, true);
        end.setUint16(8, count, true);
        end.setUint16(10, count, true);
        end.setUint32(12, cdSize, true);
        end.setUint32(16, offset, true);
        return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
      },
      get size() {
        return offset;
      }
    };
  }

  // src/data/modules.js
  var DISABLED_KEY = "rbm:disabledModules:v1";
  var ORDER_KEY = "rbm:moduleOrder:v1";
  var ModuleError = class extends Error {
    constructor(msg) {
      super(msg);
      this.name = "ModuleError";
    }
  };
  var hasAssets = (m) => (m?.assets?.length ?? 0) > 0;
  var valid = (m) => m && typeof m === "object" && m.id;
  var strip = (m) => {
    const { enabled, ...rest } = m;
    return rest;
  };
  async function loadCharacters(api, given) {
    if (Array.isArray(given)) return { list: given, unloaded: 0 };
    let order = [];
    try {
      order = (await api.getDatabase(["characterOrder"]))?.characterOrder ?? [];
    } catch {
    }
    const ids = /* @__PURE__ */ new Set();
    const walk = (o) => {
      for (const x of o ?? []) {
        if (typeof x === "string") ids.add(x);
        else if (x && Array.isArray(x.data)) walk(x.data);
      }
    };
    walk(order);
    const list = [];
    let miss = 0;
    for (let i = 0; i < ids.size + 200 && miss < 30; i++) {
      let c = null;
      try {
        c = await api.getCharacterFromIndex(i);
      } catch {
        c = null;
      }
      list.push(c);
      if (c) miss = 0;
      else if (i >= ids.size) miss++;
    }
    while (list.length && list[list.length - 1] == null) list.pop();
    return { list, unloaded: Math.max(0, ids.size - list.filter((c) => c && ids.has(c.chaId)).length) };
  }
  var isHostBlocked = (e) => !!e?.hostBlocked || /still loading|not loaded|history is only partially/i.test(String(e?.message ?? e));
  var hostBlockedMessage = "이 앱(RisuVault 등)은 대화가 긴 봇을 플러그인이 통째로 저장하지 못하게 막아요(채팅 보호). 이 봇은 앱 기본 화면에서 고쳐 주세요.";
  async function readDb(api, keys = ["modules", "pluginCustomStorage", "enabledModules", "characters"]) {
    const wantPcs = keys.includes("pluginCustomStorage");
    const db = await api.getDatabase(keys.filter((k) => k !== "pluginCustomStorage"));
    if (!db) throw new ModuleError("데이터베이스를 읽을 권한이 없습니다. 플러그인 권한을 허용해 주세요.");
    if (wantPcs) {
      const read = async (k) => {
        let v = await api.pluginStorage.getItem(k);
        if (typeof v === "string") {
          try {
            v = JSON.parse(v);
          } catch {
            v = [];
          }
        }
        return Array.isArray(v) ? v : [];
      };
      const [off, order] = await Promise.all([read(DISABLED_KEY), read(ORDER_KEY)]);
      db.pluginCustomStorage = { [DISABLED_KEY]: off, [ORDER_KEY]: order };
    }
    if (keys.includes("characters") && !Array.isArray(db.characters)) {
      const r = await loadCharacters(api, db.characters);
      db.characters = r.list;
      db.charsUnloaded = r.unloaded;
    }
    return db;
  }
  function entriesOf(db) {
    const on = (db.modules ?? []).filter(valid).map((m) => ({ module: m, enabled: true }));
    const offRaw = db.pluginCustomStorage?.[DISABLED_KEY];
    const off = (Array.isArray(offRaw) ? offRaw : []).filter(valid).map((m) => ({ module: m, enabled: false }));
    const all = [...on, ...off];
    const ord = db.pluginCustomStorage?.[ORDER_KEY];
    const at = new Map((Array.isArray(ord) ? ord : []).map((id, i) => [id, i]));
    all.forEach((e, i) => {
      e.order = at.has(e.module.id) ? at.get(e.module.id) : 1e9 + i;
      e.pos = i;
    });
    all.sort((a, b) => a.order - b.order || a.pos - b.pos);
    return all;
  }
  async function loadModuleState(api, { chars = false } = {}) {
    const db = await readDb(api, chars ? void 0 : ["modules", "pluginCustomStorage", "enabledModules"]);
    const entries = entriesOf(db);
    const globalOn = new Set(db.enabledModules ?? []);
    const charUse = /* @__PURE__ */ new Map();
    for (const c of db.characters ?? []) {
      if (!c || c.trashTime) continue;
      for (const id of c.modules ?? []) charUse.set(id, (charUse.get(id) ?? 0) + 1);
    }
    return { entries, globalOn, charUse, characters: db.characters ?? [] };
  }
  function moduleCounts(m) {
    return { lore: m.lorebook?.length ?? 0, regex: m.regex?.length ?? 0, trigger: m.trigger?.length ?? 0, assets: m.assets?.length ?? 0 };
  }
  function moduleFlags(m, globalOn) {
    return { global: globalOn?.has(m.id) ?? false, lla: !!m.lowLevelAccess, mcp: !!m.mcp, cjs: !!m.cjs };
  }
  function sortIds(ids, orderIds) {
    const pos = new Map(orderIds.map((id, i) => [id, i]));
    return [...ids].sort((a, b) => (pos.get(a) ?? Infinity) - (pos.get(b) ?? Infinity));
  }
  function insertOrdered(ids, id, orderIds) {
    if (ids.includes(id)) return ids;
    const pos = new Map(orderIds.map((x, i) => [x, i]));
    const p = pos.get(id) ?? Infinity;
    const out = [...ids];
    let at = out.findIndex((x) => (pos.get(x) ?? Infinity) > p);
    if (at < 0) at = out.length;
    out.splice(at, 0, id);
    return out;
  }
  async function commit(api, mutate, { chars = false } = {}) {
    const db = await readDb(api, chars ? ["modules", "pluginCustomStorage", "enabledModules", "characters"] : ["modules", "pluginCustomStorage", "enabledModules"]);
    const draft = {
      entries: entriesOf(db).map((e) => ({ module: { ...e.module }, enabled: e.enabled })),
      enabledModules: [...db.enabledModules ?? []],
      characters: db.characters ?? [],
      changedChars: /* @__PURE__ */ new Set(),
      removedIds: /* @__PURE__ */ new Set()
    };
    const result = await mutate(draft);
    const orderIds = draft.entries.map((e) => e.module.id);
    const offIds = new Set(draft.entries.filter((e) => !e.enabled).map((e) => e.module.id));
    const gone = /* @__PURE__ */ new Set([...draft.removedIds, ...offIds]);
    const enabledModules = sortIds(draft.enabledModules.filter((id) => !gone.has(id) && orderIds.includes(id)), orderIds);
    draft.characters.forEach((c, i) => {
      if (!c) return;
      const before = JSON.stringify([c.modules ?? [], (c.chats ?? []).map((x) => x?.modules ?? [])]);
      if (Array.isArray(c.modules)) c.modules = sortIds(c.modules.filter((id) => !gone.has(id)), orderIds);
      for (const ch of c.chats ?? []) if (ch && Array.isArray(ch.modules)) ch.modules = sortIds(ch.modules.filter((id) => !gone.has(id)), orderIds);
      if (JSON.stringify([c.modules ?? [], (c.chats ?? []).map((x) => x?.modules ?? [])]) !== before) draft.changedChars.add(i);
    });
    const modules = draft.entries.filter((e) => e.enabled).map((e) => strip(e.module));
    const disabled = draft.entries.filter((e) => !e.enabled).map((e) => strip(e.module));
    await api.setDatabaseLite({ modules, enabledModules, [DISABLED_KEY]: disabled, [ORDER_KEY]: orderIds });
    let skipped = 0;
    for (const i of draft.changedChars) {
      const want = draft.characters[i];
      const fresh = await api.getCharacterFromIndex(i);
      if (!fresh || fresh.chaId !== want.chaId) continue;
      fresh.modules = want.modules ?? [];
      (fresh.chats ?? []).forEach((ch, j) => {
        const w = want.chats?.[j];
        if (ch && w && (w.id === void 0 || w.id === ch.id) && Array.isArray(w.modules)) ch.modules = w.modules;
      });
      try {
        await api.setCharacterToIndex(i, fresh);
      } catch (e) {
        if (!isHostBlocked(e)) throw e;
        skipped++;
      }
    }
    if (skipped) for (const fn of noticeHooks) fn(`모듈은 저장했어요. 대화가 긴 봇 ${skipped}개는 앱이 보호하고 있어서 그 봇의 모듈 목록은 그대로 뒀어요.`);
    const state = { entries: draft.entries.map((e) => ({ module: strip(e.module), enabled: e.enabled })), enabledModules };
    for (const fn of commitHooks) {
      try {
        await fn(state);
      } catch (e) {
        console.warn("[Dusk Atelier] 저장 후 처리 실패", e);
      }
    }
    return result;
  }
  var commitHooks = /* @__PURE__ */ new Set();
  var noticeHooks = /* @__PURE__ */ new Set();
  var onNotice = (fn) => {
    noticeHooks.add(fn);
    return () => noticeHooks.delete(fn);
  };
  var onCommitted = (fn) => {
    commitHooks.add(fn);
    return () => commitHooks.delete(fn);
  };
  var find = (d, id) => {
    const e = d.entries.find((x) => x.module.id === id);
    if (!e) throw new ModuleError("모듈을 찾지 못했어요. 목록을 새로 고쳐 주세요.");
    return e;
  };
  var ops = {
    setEnabled: (api, id, on) => commit(api, (d) => {
      const e = find(d, id);
      if (!on && hasAssets(e.module)) throw new ModuleError("에셋이 있는 모듈은 끌 수 없어요. (끄면 RisuAI가 에셋을 정리할 수 있어요)");
      e.enabled = !!on;
    }, { chars: !on }),
    setGlobal: (api, id, on) => commit(api, (d) => {
      const e = find(d, id);
      if (on && !e.enabled) throw new ModuleError("꺼진 모듈은 글로벌로 켤 수 없어요. 먼저 켜 주세요.");
      const order = d.entries.map((x) => x.module.id);
      d.enabledModules = on ? insertOrdered(d.enabledModules, id, order) : d.enabledModules.filter((x) => x !== id);
    }),
    reorder: (api, orderedIds) => commit(api, (d) => {
      const pos = new Map(orderedIds.map((id, i) => [id, i]));
      d.entries.sort((a, b) => (pos.get(a.module.id) ?? Infinity) - (pos.get(b.module.id) ?? Infinity));
    }),
    remove: (api, id) => commit(api, (d) => {
      const e = find(d, id);
      d.entries = d.entries.filter((x) => x !== e);
      d.removedIds.add(id);
      return e.module;
    }, { chars: true }),
    create: (api, mod) => commit(api, (d) => {
      d.entries.push({ module: mod, enabled: true });
      return mod;
    }),
    update: (api, id, patch) => commit(api, (d) => {
      const e = find(d, id);
      Object.assign(e.module, patch);
      return e.module;
    }),
    // 캐릭터 연결: 캐릭터의 모든 채팅에서 켜진다
    setCharacterLink: (api, charIndex, id, on) => commit(api, (d) => {
      const c = d.characters[charIndex];
      if (!c) throw new ModuleError("캐릭터를 찾지 못했어요.");
      const order = d.entries.map((x) => x.module.id);
      const cur = Array.isArray(c.modules) ? c.modules : [];
      c.modules = on ? insertOrdered(cur, id, order) : cur.filter((x) => x !== id);
      d.changedChars.add(charIndex);
    }, { chars: true }),
    // 채팅 연결 해제 (채팅 연결 추가는 RisuAI 채팅 화면에서 한다)
    unlinkChat: (api, charIndex, chatIndex, id) => commit(api, (d) => {
      const ch = d.characters[charIndex]?.chats?.[chatIndex];
      if (!ch) throw new ModuleError("채팅을 찾지 못했어요.");
      ch.modules = (ch.modules ?? []).filter((x) => x !== id);
      d.changedChars.add(charIndex);
    }, { chars: true })
  };

  // src/ui/legacy.js
  async function createLegacy(api, { onExit, zIndex = 100, host, links } = {}) {
    let queue = [];
    const TITLE2 = "업데이트 가져오기";
    const css = `
    #rbu-overlay, #rbu-overlay *{box-sizing:border-box}
    #rbu-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--rb-backdrop,rgba(8,9,16,.55));
      font:14px/1.55 'IBM Plex Sans KR',system-ui,-apple-system,"Segoe UI","Noto Sans KR",sans-serif;color:var(--rb-text,#e9eaf6)}
    #rbu-overlay.hidden{display:none}
    #rbu-overlay .win{width:100%;max-width:620px;max-height:100%;overflow-y:auto;background:var(--rb-win,#151726);border:1px solid var(--rb-line,#2a2d47);border-radius:18px;
      box-shadow:var(--rb-shadow,0 24px 64px rgba(0,0,0,.45));padding:22px 24px;animation:rbu-in .16s ease-out;scrollbar-width:thin}
    @keyframes rbu-in{from{opacity:0;transform:translateY(8px) scale(.99)}to{opacity:1;transform:none}}
    #rbu-overlay .head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
    #rbu-overlay h1{font-size:17px;font-weight:700;margin:0;display:flex;gap:12px;align-items:center}
    #rbu-overlay h1 svg{width:34px;height:34px;padding:8px;border-radius:10px;background:var(--rb-acc-grad,linear-gradient(135deg,#4f63e0,#7c4fe0));color:var(--rb-on-acc,#fff)}
    #rbu-overlay .x{width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;color:var(--rb-sub,#a4a7c9);cursor:pointer;padding:0;border-radius:12px}
    #rbu-overlay .x:hover{background:var(--rb-hover,#20233a);color:var(--rb-text,#e9eaf6)}
    #rbu-overlay .sub{color:var(--rb-sub,#a4a7c9);margin:0 0 14px;font-size:13px;line-height:1.6}
    #rbu-overlay .card{background:var(--rb-surf,#1c1f33);border:1px solid var(--rb-line2,#22253b);border-radius:14px;padding:16px;margin:12px 0}
    #rbu-overlay .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:16px}
    #rbu-overlay .row>button{flex:1}
    #rbu-overlay button{font:inherit;min-height:42px;border-radius:12px;border:1px solid var(--rb-line3,#343857);background:var(--rb-surf,#1c1f33);color:var(--rb-text,#e9eaf6);padding:9px 16px;cursor:pointer;font-weight:500;transition:background .15s,filter .15s}
    #rbu-overlay button:hover{background:var(--rb-hover,#20233a)}
    #rbu-overlay button:focus-visible,#rbu-overlay .opt:focus-within{outline:2px solid var(--rb-focus,rgba(142,162,255,.55));outline-offset:2px}
    #rbu-overlay button.primary{background:var(--rb-acc-grad,linear-gradient(135deg,#4f63e0,#7c4fe0));border:0;color:var(--rb-on-acc,#fff);font-weight:600}
    #rbu-overlay button.primary:hover{filter:brightness(1.08)}
    #rbu-overlay button.danger{border:0;background:var(--rb-danger-soft,rgba(242,122,147,.13));color:var(--rb-danger,#f27a93);font-weight:600}
    #rbu-overlay button[disabled]{opacity:.5;cursor:not-allowed}
    #rbu-overlay .drop{border:1.5px dashed var(--rb-sel-ring,rgba(142,162,255,.45));border-radius:16px;padding:30px 16px;text-align:center;color:var(--rb-sub,#a4a7c9);font-size:13px;line-height:1.8;background:var(--rb-sel-bg,rgba(79,99,224,.06));transition:background .15s}
    #rbu-overlay .drop.over{border-color:var(--rb-acc-text,#8ea2ff);background:var(--rb-acc-soft,rgba(79,99,224,.16));color:var(--rb-text,#e9eaf6)}
    #rbu-overlay input[type=file]{font:inherit;color:var(--rb-sub,#a4a7c9);max-width:100%;margin-top:12px}
    #rbu-overlay input[type=file]::file-selector-button{font:inherit;font-weight:600;border-radius:12px;border:0;background:var(--rb-acc-grad,linear-gradient(135deg,#4f63e0,#7c4fe0));color:var(--rb-on-acc,#fff);padding:10px 16px;margin-right:12px;cursor:pointer}
    #rbu-overlay input[type=password],#rbu-overlay input[type=text]{width:100%;margin-top:10px;font:inherit;height:44px;padding:0 14px;border-radius:12px;border:1px solid var(--rb-line,#2a2d47);background:var(--rb-surf,#1c1f33);color:var(--rb-text,#e9eaf6);outline:none}
    #rbu-overlay .opt{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border:1px solid var(--rb-line,#2a2d47);border-radius:12px;margin:6px 0;cursor:pointer;background:var(--rb-win,#151726);transition:border-color .15s,background .15s}
    #rbu-overlay .opt:hover{border-color:var(--rb-line3,#343857);background:var(--rb-hover,#20233a)}
    #rbu-overlay .opt:has(input:checked){border-color:var(--rb-sel-ring,rgba(142,162,255,.45));background:var(--rb-sel-bg,rgba(79,99,224,.12))}
    #rbu-overlay .opt input{margin-top:3px;width:18px;height:18px;accent-color:var(--rb-acc-a,#4f63e0)}
    #rbu-overlay .kind{display:inline-block;font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;margin-right:8px;background:var(--rb-acc-soft,rgba(79,99,224,.16));color:var(--rb-acc-text,#8ea2ff);vertical-align:1px}
    #rbu-overlay .kind.mod{background:var(--rb-acc2-soft,rgba(124,79,224,.16));color:var(--rb-acc2-text,#c4b1ff)}
    #rbu-overlay .badge{display:inline-block;font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;margin-left:8px;vertical-align:1px}
    #rbu-overlay .high{background:var(--rb-teal-soft,rgba(111,220,192,.12));color:var(--rb-teal,#6fdcc0)}
    #rbu-overlay .medium{background:var(--rb-warn-soft,rgba(245,194,107,.13));color:var(--rb-warn,#f5c26b)}
    #rbu-overlay .low{background:var(--rb-rose-soft,rgba(245,142,163,.13));color:var(--rb-rose,#f58ea3)}
    #rbu-overlay .muted{color:var(--rb-mute,#8487ab);font-size:12.5px}
    #rbu-overlay .grid{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:13.5px}
    #rbu-overlay .grid>b{font-weight:500;color:var(--rb-sub,#a4a7c9)}
    #rbu-overlay .grid b b,#rbu-overlay .grid span b{color:var(--rb-text,#e9eaf6);font-weight:600}
    #rbu-overlay .bar{height:8px;background:var(--rb-track-off,#2e3150);border-radius:999px;overflow:hidden;margin:12px 0 8px}
    #rbu-overlay .bar>i{display:block;height:100%;width:0;border-radius:999px;background:var(--rb-deco-grad,linear-gradient(90deg,#6f8bff,#a78bfa));transition:width .2s}
    #rbu-overlay .warn{background:var(--rb-warn-soft,rgba(245,194,107,.13));box-shadow:inset 0 0 0 1px var(--rb-warn,#f5c26b);color:var(--rb-text,#e9eaf6);border-radius:12px;padding:12px 14px;margin:10px 0;font-size:13px}
    #rbu-overlay .err{background:var(--rb-danger-soft,rgba(242,122,147,.13));box-shadow:inset 0 0 0 1px var(--rb-danger,#f27a93);color:var(--rb-text,#e9eaf6);border-radius:12px;padding:12px 14px;margin:10px 0;white-space:pre-wrap}
    #rbu-overlay .ok{background:var(--rb-ok-soft,rgba(95,211,181,.13));box-shadow:inset 0 0 0 1px var(--rb-ok,#5fd3b5);color:var(--rb-text,#e9eaf6);border-radius:12px;padding:14px;margin:10px 0}
    #rbu-overlay .hl{color:var(--rb-warn,#f5c26b)}
    #rbu-overlay label.chk{display:flex;gap:10px;align-items:flex-start;margin-top:12px;font-size:13.5px;cursor:pointer}
    #rbu-overlay label.chk input{width:18px;height:18px;margin-top:2px;accent-color:var(--rb-acc-a,#4f63e0)}
    #rbu-overlay select{font:inherit;background:var(--rb-surf,#1c1f33);color:var(--rb-text,#e9eaf6);border:1px solid var(--rb-line,#2a2d47);border-radius:12px;height:42px;padding:0 10px;width:100%;margin-top:8px}
    #rbu-overlay details summary{cursor:pointer;color:var(--rb-sub,#a4a7c9)}
    #rbu-overlay details[open] summary{margin-bottom:6px}
    @media (max-width:760px){#rbu-overlay{padding:0;align-items:stretch}#rbu-overlay .win{max-width:none;border-radius:0;border:0;padding:18px 16px}}
    `;
    document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);
    const overlay = document.createElement("div");
    overlay.id = "rbu-overlay";
    overlay.className = "hidden";
    overlay.style.zIndex = String(zIndex);
    document.body.appendChild(overlay);
    const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>`;
    const X = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
    let busy = false, stopRequested = false, root = null;
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const fmtBytes2 = (n) => n >= 1e9 ? (n / 1e9).toFixed(2) + " GB" : n >= 1e6 ? (n / 1e6).toFixed(1) + " MB" : n >= 1e3 ? (n / 1e3).toFixed(0) + " KB" : n + " B";
    const fmtTime = (ms) => {
      const s = Math.round(ms / 1e3);
      return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`;
    };
    const kindTag = (k) => k === "character" ? '<span class="kind">캐릭터</span>' : '<span class="kind mod">모듈</span>';
    function frame(body) {
      overlay.innerHTML = `<div class="win" role="dialog" aria-modal="true">
            <div class="head"><h1>${ICON}${TITLE2}</h1><button class="x" id="x" title="${busy ? "취소" : "닫기"}">${X}</button></div>
            <p class="sub">캐릭터·모듈을 가져옵니다. 이미 있는 항목의 새 버전이면 바뀐 것만 올려 덮어쓰고, 채팅과 모듈 연결은 그대로 둡니다.</p>
            ${body}</div>`;
      root = overlay.querySelector(".win");
      overlay.querySelector("#x").addEventListener("click", onClose);
      root.querySelector("#close")?.addEventListener("click", onClose);
    }
    async function onClose() {
      if (busy) {
        stopRequested = true;
        const d = root?.querySelector("#detail");
        if (d) d.textContent = "취소하는 중… (진행 중인 저장이 끝나면 멈춥니다)";
        return;
      }
      overlay.className = "hidden";
      if (onExit) onExit();
      else await api.hideContainer();
    }
    const closeBtn = (label = "닫기") => `<button id="close">${label}</button>`;
    function renderStart(errorText) {
      busy = false;
      stopRequested = false;
      frame(`<div class="card"><div class="drop" id="drop"><b>파일을 여기로 끌어 놓거나 아래에서 고르세요</b> (여러 개도 돼요)<br>
              <span class="muted">캐릭터: .charx · .png · .jpg · 카드 .json &nbsp;|&nbsp; 모듈: .risum · .module.charx · 모듈 .json</span>
              <br><button class="primary" id="pick" style="margin-top:14px;min-width:160px">파일 고르기</button><input type="file" id="file" multiple accept=".charx,.png,.jpg,.jpeg,.risum,.json" style="display:none"></div>
            ${errorText ? `<div class="err">${esc(errorText)}</div>` : ""}
            ${queue.length ? `<div class="muted" style="margin-top:8px">대기 중인 파일 ${queue.length}개</div>` : ""}</div>
          <div class="row"><button id="backups">백업·되돌리기</button>${queue.length ? '<button class="primary" id="nextq">다음 파일</button>' : ""}${closeBtn()}</div>`);
      root.querySelector("#backups").addEventListener("click", () => renderBackups());
      root.querySelector("#nextq")?.addEventListener("click", () => runQueue());
      const go = (files) => {
        const list = [...files ?? []];
        if (!list.length) return;
        queue = [...list, ...queue];
        runQueue();
      };
      root.querySelector("#file").addEventListener("change", (e) => go(e.target.files));
      root.querySelector("#pick").addEventListener("click", () => root.querySelector("#file").click());
      const drop = root.querySelector("#drop");
      drop.addEventListener("dragover", (e) => {
        e.preventDefault();
        drop.classList.add("over");
      });
      drop.addEventListener("dragleave", () => drop.classList.remove("over"));
      drop.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("over");
        go(e.dataTransfer?.files);
      });
    }
    function renderProgress(title, pct, detail3) {
      frame(`<div class="card"><div>${esc(title)}</div>
            <div class="bar"><i style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%"></i></div>
            <div class="muted" id="detail">${esc(detail3 ?? "")}</div></div>
          <div class="row"><button id="close" class="danger">취소</button></div>`);
    }
    function updateProgress(pct, detail3) {
      const bar = root?.querySelector(".bar>i");
      if (!bar) return;
      bar.style.width = `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`;
      if (!stopRequested) root.querySelector("#detail").textContent = detail3 ?? "";
    }
    function askPassword() {
      return new Promise((resolve) => {
        const wasBusy = busy;
        busy = false;
        frame(`<div class="card"><div>비밀번호가 걸린 카드입니다.</div>
                <input type="password" id="pw" ></div>
              <div class="row"><button class="primary" id="ok">확인</button>${closeBtn("취소")}</div>`);
        const done = (v) => {
          busy = wasBusy;
          resolve(v);
        };
        root.querySelector("#ok").addEventListener("click", () => done(root.querySelector("#pw").value));
        root.querySelector("#pw").addEventListener("keydown", (e) => {
          if (e.key === "Enter") done(root.querySelector("#pw").value);
        });
        root.querySelector("#close").addEventListener("click", () => done(""), { capture: true });
        root.querySelector("#pw").focus();
      });
    }
    async function loadDb(withCharacters) {
      const db = await readDb(api, withCharacters ? ["modules", "pluginCustomStorage", "characters"] : ["modules", "pluginCustomStorage"]);
      return { modules: entriesOf(db).map((e) => e.module), characters: Array.isArray(db.characters) ? db.characters : [] };
    }
    async function startScan(file) {
      busy = true;
      stopRequested = false;
      renderProgress(`파일 확인 중: ${file.name}`, 0, fmtBytes2(file.size));
      let lastUi = 0;
      const incoming = await readIncoming(file.name, file, (pos, total, count) => {
        const now = Date.now();
        if (now - lastUi < 120) return;
        lastUi = now;
        updateProgress(pos / total * 100, `${fmtBytes2(pos)} / ${fmtBytes2(total)} · 에셋 ${count}개 확인`);
      }, () => stopRequested, { askPassword: async () => {
        const pw = await askPassword();
        renderProgress(`파일 확인 중: ${file.name}`, 100, "카드 푸는 중…");
        return pw;
      } });
      const db = await loadDb(!!incoming.character);
      busy = false;
      renderChoose(file, incoming, db);
    }
    function candidatesFor(incoming, db) {
      const hashes = new Set(incoming.assets.map((a) => a.hash).filter(Boolean));
      const list = incoming.module ? findCandidates(db.modules, incoming.module, hashes).map((c) => ({ ...c, kind: "module", label: c.module.name })) : [];
      if (incoming.character) {
        const ch = incoming.character;
        const chHashes = new Set([...ch.refs.emotions, ...ch.refs.additional, ...ch.refs.cc, ...ch.refs.icon ? [ch.refs.icon] : []].map((r) => r.hash));
        const views = db.characters.map((c) => c && c.type !== "group" && !c.trashTime ? characterView(c) : null);
        const inView = { name: ch.fields.name, namespace: ch.risuFields.moduleNamespace || void 0 };
        for (const c of findCandidates(views, inView, chHashes)) list.push({ ...c, kind: "character", label: db.characters[c.index].name, module: void 0 });
      }
      const prefer = !incoming.character || /\.module\.charx$/i.test(incoming.fileName ?? "") ? "module" : "character";
      const remembered = links?.get(linkKey(incoming));
      if (remembered) {
        let c = list.find((x) => (x.kind === "module" ? x.module?.id : db.characters[x.index]?.chaId) === remembered);
        if (!c) {
          const mi = incoming.module ? db.modules.findIndex((m) => m?.id === remembered) : -1;
          const ci = incoming.character ? db.characters.findIndex((ch) => ch?.chaId === remembered) : -1;
          if (mi >= 0) {
            c = { index: mi, module: db.modules[mi], score: 0, reasons: [], kind: "module", label: db.modules[mi].name };
            list.push(c);
          } else if (ci >= 0) {
            c = { index: ci, score: 0, reasons: [], kind: "character", label: db.characters[ci].name };
            list.push(c);
          }
        }
        if (c) {
          c.score += 1e3;
          c.confidence = "high";
          c.reasons = ["지난번에 이 파일로 업데이트함", ...c.reasons];
        }
      }
      return list.sort((a, b) => b.score - a.score || (b.kind === prefer) - (a.kind === prefer));
    }
    function linkKey(incoming) {
      return incoming.character && !(incoming.module && /\.module\.charx$/i.test(incoming.fileName ?? "")) ? `c:${normalizeName(incoming.character.fields.name)}` : `m:${normalizeName(incoming.module?.name)}`;
    }
    function renderChoose(file, incoming, db) {
      incoming.fileName = file.name;
      const cands = candidatesFor(incoming, db);
      const top = cands.slice(0, 6);
      const sizeOf = (c) => c.kind === "character" ? `에셋 ${characterAssetKeys(db.characters[c.index]).length}개 · 로어북 ${(db.characters[c.index].globalLore ?? []).length}개` : `에셋 ${(c.module.assets ?? []).length}개 · 로어북 ${(c.module.lorebook ?? []).length}개`;
      const opts = top.map((c, i) => `
          <label class="opt"><input type="radio" name="t" value="${i}" ${i === 0 ? "checked" : ""}>
            <div><div>${kindTag(c.kind)}<b>${esc(c.label)}</b> 업데이트<span class="badge ${c.confidence}">${{ high: "높음", medium: "보통", low: "낮음" }[c.confidence]}</span></div>
            <div class="muted">${esc(c.reasons.join(" · "))} · ${sizeOf(c)}</div></div></label>`).join("");
      const ch = incoming.character, hasMod = !!incoming.module;
      const manual = [
        ...ch ? db.characters.map((c, i) => c && c.type !== "group" && !c.trashTime ? `<option value="character:${i}">[캐릭터] ${esc(c.name)}</option>` : "") : [],
        ...hasMod ? db.modules.map((m, i) => `<option value="module:${i}">[모듈] ${esc(m.name)}</option>`) : []
      ].join("");
      const newOpts = [
        ch ? { v: "newchar", html: `${kindTag("character")}새 캐릭터로 추가`, sub: "기존 캐릭터는 건드리지 않습니다" } : null,
        hasMod ? { v: "newmod", html: `${kindTag("module")}새 모듈로 추가`, sub: "기존 모듈은 건드리지 않습니다" } : null
      ].filter(Boolean);
      if (!ch || /\.module\.charx$/i.test(file.name)) newOpts.reverse();
      frame(`<div class="card"><div class="grid"><b>파일</b><span>${esc(file.name)} (${fmtBytes2(file.size)})</span>
              <b>이름</b><span>${esc(ch ? ch.fields.name : incoming.module.name)}</span>
              <b>에셋</b><span>${ch ? ch.refs.emotions.length + ch.refs.additional.length + ch.refs.cc.length : incoming.assets.length}개</span></div></div>
          <div class="card"><div style="margin-bottom:6px">${top.length ? "어느 항목을 업데이트할까요?" : "비슷한 기존 항목이 없습니다. 새로 추가합니다."}</div>
            ${opts}
            ${newOpts.map((o, i) => `<label class="opt"><input type="radio" name="t" value="${o.v}" ${!top.length && i === 0 ? "checked" : ""}>
              <div><div>${o.html}</div><div class="muted">${o.sub}</div></div></label>`).join("")}
            <details style="margin-top:8px"><summary class="muted" style="cursor:pointer">목록에서 직접 고르기</summary>
              <select id="manual"><option value="">— 고르지 않음 —</option>${manual}</select></details></div>
          <div class="row"><button class="primary" id="next">다음</button>${closeBtn("취소")}</div>`);
      root.querySelector("#next").addEventListener("click", () => {
        const m = root.querySelector("#manual")?.value;
        let pick = null;
        if (m) {
          const [kind, i] = m.split(":");
          pick = { kind, index: Number(i) };
        } else {
          const v = root.querySelector("input[name=t]:checked")?.value;
          if (v === "newchar") return renderNewCharPlan(file, incoming, db);
          if (v === "newmod") pick = null;
          else if (v !== void 0) pick = { kind: top[Number(v)].kind, index: top[Number(v)].index };
        }
        if (pick?.kind === "character") renderCharPlan(file, incoming, db, pick.index, true);
        else renderModPlan(file, incoming, db, pick ? pick.index : null, true);
      });
    }
    function knownKeysOf(db) {
      const keys = collectKnownKeys(db.modules);
      for (const c of db.characters) for (const k of characterAssetKeys(c)) keys.add(k);
      return keys;
    }
    function planFooter(goLabel) {
      return `<div class="row"><button class="primary" id="go">${goLabel}</button><button id="back">뒤로</button>${closeBtn("취소")}</div>`;
    }
    function bindPlan(file, incoming, db, rerender, run) {
      root.querySelector("#keep")?.addEventListener("change", (e) => rerender(e.target.checked));
      root.querySelector("#back").addEventListener("click", () => renderChoose(file, incoming, db));
      root.querySelector("#go").addEventListener("click", () => run().catch((err) => {
        busy = false;
        if (err instanceof Cancelled) return renderResult(null, "취소했습니다. 기존 항목은 바뀌지 않았습니다.");
        if (err instanceof Busy) return renderResult(null, null, err.message);
        renderResult(null, null, err?.message ?? String(err));
      }));
    }
    const store = createStore(api);
    const fmtDate = (t) => {
      const d = new Date(t);
      const p = (n) => String(n).padStart(2, "0");
      return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    const KIND_KO2 = { update: "새 버전 적용", mine: "내 수정 유지", conflict: "충돌", added: "추가", removed: "삭제", kept: "기존 유지" };
    function mergeBox(m, choices, keepExistingOnly) {
      const s = summarize(m.items);
      const conflicts = m.items.filter((i) => i.kind === "conflict");
      const mine = m.items.filter((i) => i.kind === "mine");
      const short = (v) => {
        const t = typeof v === "string" ? v : v === void 0 ? "(없음)" : JSON.stringify(v);
        return esc(t.length > 140 ? t.slice(0, 140) + "…" : t);
      };
      const preview = (v) => Array.isArray(v) ? short(v[1] ?? v) : v && typeof v === "object" && "content" in v ? short(v.content) : short(v);
      return `<div class="grid" style="margin-top:6px">
              <b>바뀌는 것</b><span>새 버전 적용 ${s.update} · 추가 ${s.added} · 삭제 ${s.removed}${s.kept ? ` · 기존 유지 ${s.kept}` : ""}</span>
              ${m.hasBase ? `<b>내 수정</b><span>유지 ${s.mine}</span><b>충돌</b><span>${s.conflict ? `<b class="hl">${s.conflict}개</b> (아래에서 고르기)` : "없음"}</span>` : ""}
            </div>
            ${m.hasBase ? "" : `<div class="warn">이 항목은 처음 받았을 때의 기록이 없어 <b>지금 내용과 새 버전만</b> 비교합니다. 직접 고친 내용도 새 버전으로 바뀔 수 있어요. 이번 업데이트부터 기록이 남아, 다음 업데이트부터는 내 수정을 구분해 지킵니다.</div>
              <label class="chk"><input type="checkbox" id="keep" ${keepExistingOnly ? "checked" : ""}><span>새 버전에 없는 기존 로어북·에셋 유지<br><span class="muted">직접 추가한 항목을 지킵니다. 제작자가 지운 항목도 남을 수 있습니다.</span></span></label>`}
            ${conflicts.length ? `<details open style="margin-top:10px"><summary style="cursor:pointer">충돌 ${conflicts.length}개 — 나도 고치고 제작자도 바꾼 항목</summary>
              ${conflicts.map((c) => `<div class="opt" style="display:block;cursor:default">
                <div style="margin-bottom:4px">${esc(c.label)}</div>
                <div class="muted">지금: ${preview(c.cur)}</div><div class="muted">새 버전: ${preview(c.inc)}</div>
                <div class="row" style="margin-top:6px">
                  <label><input type="radio" name="c:${esc(c.id)}" data-cid="${esc(c.id)}" value="inc" ${(choices.get(c.id) ?? "inc") === "inc" ? "checked" : ""}> 새 버전</label>
                  <label><input type="radio" name="c:${esc(c.id)}" data-cid="${esc(c.id)}" value="cur" ${choices.get(c.id) === "cur" ? "checked" : ""}> 내 것 유지</label>
                </div></div>`).join("")}</details>` : ""}
            ${mine.length ? `<details style="margin-top:8px"><summary class="muted" style="cursor:pointer">그대로 두는 내 수정 ${mine.length}개</summary>
              <div class="muted" style="margin-top:6px">${mine.slice(0, 60).map((i) => esc(i.label)).join("<br>")}${mine.length > 60 ? "<br>…" : ""}</div></details>` : ""}`;
    }
    function bindMergeBox(rerender, choices) {
      root.querySelectorAll("input[data-cid]").forEach((el) => el.addEventListener("change", () => {
        choices.set(el.dataset.cid, el.value);
        rerender();
      }));
    }
    async function withPreparing(fn) {
      renderProgress("비교 준비 중…", 100, "원본 기록을 읽는 중");
      try {
        await fn();
      } catch (err) {
        renderResult(null, null, err?.message ?? String(err));
      }
    }
    function renderModPlan(file, incoming, db, targetIndex, keepExistingOnly, choices = /* @__PURE__ */ new Map(), base) {
      const target = targetIndex === null ? null : db.modules[targetIndex];
      if (target && base === void 0) return withPreparing(async () => renderModPlan(file, incoming, db, targetIndex, keepExistingOnly, choices, await store.getBaseline(`m:${target.id}`)));
      const knownKeys = knownKeysOf(db);
      const plan = planAssets(target, incoming.assets, knownKeys, false, incoming.icon);
      const incView = modIncomingView(incoming, plan, /* @__PURE__ */ new Map(), knownKeys);
      const spec = MOD_SPEC;
      const m = target ? merge3(base, pickView(target, [...spec.scalars, ...Object.keys(spec.lists)]), incView, spec, { choices, keepExistingOnly }) : null;
      const s = plan.stat;
      frame(`<div class="card">
            <div style="margin-bottom:8px">${kindTag("module")}${target ? `<b>${esc(target.name)}</b> 업데이트${target.name !== incoming.module.name ? ` → 이름이 <b>${esc(incoming.module.name)}</b>(으)로 바뀝니다` : ""}` : `새 모듈 <b>${esc(incoming.module.name)}</b> 추가`}</div>
            <div class="grid"><b>올릴 에셋</b><span><b>${s.upload}개</b> (${fmtBytes2(s.uploadBytes)})${s.reused ? ` · 서버에 이미 있음 ${s.reused}` : ""}</span>
              ${target ? "" : `<b>에셋</b><span>${incoming.assets.length}개</span><b>로어북</b><span>${(incoming.module.lorebook ?? []).length}개</span>`}</div>
            ${m ? mergeBox(m, choices, keepExistingOnly) : ""}
            ${notes(incoming, incoming.module.lowLevelAccess && !target?.lowLevelAccess, s.upload)}
            <p class="muted" style="margin:10px 0 0">모듈 연결(활성 상태)은 바뀌지 않습니다.${target ? " 바꾸기 전 상태를 백업하므로 [백업·되돌리기]에서 되돌릴 수 있어요." : ""}</p>
          </div>${planFooter(target ? "업데이트" : "추가")}`);
      bindMergeBox(() => renderModPlan(file, incoming, db, targetIndex, keepExistingOnly, choices, base), choices);
      bindPlan(file, incoming, db, (keep) => renderModPlan(file, incoming, db, targetIndex, keep, choices, base), async () => {
        const early = target ? store.addBackup({ kind: "module", target: target.id, name: target.name, snapshot: backupSnapshot("module", target), note: "업데이트 전" }).catch(() => null) : null;
        const uploaded = await uploadWithProgress(file, plan.toUpload);
        updateProgress(100, "모듈 저장 중…");
        const known2 = /* @__PURE__ */ new Set([...knownKeys, ...uploaded.values()]);
        const inc = modIncomingView(incoming, plan, uploaded, known2);
        let merged, note2 = "", backupRec = null, summary = "";
        await commit(api, async (d) => {
          if (target) {
            const e = d.entries.find((x) => x.module?.id === target.id);
            if (!e) throw new Error("업데이트할 모듈이 그 사이 삭제되었습니다. 저장하지 않았습니다.");
            const cur = e.module;
            const r = merge3(base, pickView(cur, [...spec.scalars, ...Object.keys(spec.lists)]), inc, spec, { choices, keepExistingOnly });
            const sm = summarize(r.items);
            summary = [sm.update && `제작자 수정 ${sm.update}`, sm.mine && `내 수정 유지 ${sm.mine}`, sm.conflict && `충돌 ${sm.conflict}`, sm.added && `추가 ${sm.added}`, sm.removed && `삭제 ${sm.removed}`, uploaded.size && `에셋 ${uploaded.size}개 올림`].filter(Boolean).join(" · ");
            const sumText = `${file.name} → ${summary || "변화 없음"}`;
            const pre = await early;
            if (pre && stableJson(cur) === stableJson(target)) {
              backupRec = pre;
              await store.annotate(pre.id, { summary: sumText }).catch(() => {
              });
            } else {
              if (pre) await store.removeBackup(pre.id).catch(() => {
              });
              try {
                backupRec = await store.addBackup({ kind: "module", target: cur.id, name: cur.name, snapshot: backupSnapshot("module", cur), note: "업데이트 전", summary: sumText });
              } catch (err) {
                throw new Error(`백업을 만들지 못해 아무것도 바꾸지 않았습니다: ${err?.message ?? err}`);
              }
            }
            merged = applyView(cur, r.view);
            merged.id = cur.id;
            e.module = merged;
          } else {
            merged = applyView({}, inc);
            merged.id = newId();
            d.entries.push({ module: merged, enabled: true });
          }
        });
        links?.set(linkKey(incoming), merged.id);
        try {
          await store.setBaseline(`m:${merged.id}`, inc);
        } catch {
          note2 = "다음 업데이트용 원본 기록을 저장하지 못했어요. 다음엔 2방향으로 비교합니다.";
        }
        busy = false;
        renderResult({ kind: "module", name: merged.name, updated: !!target, uploadedCount: uploaded.size, assets: (merged.assets ?? []).length, lore: (merged.lorebook ?? []).length, backup: !!target, backupRec, summary, note: note2 });
      });
    }
    function renderCharPlan(file, incoming, db, index, keepExistingOnly, choices = /* @__PURE__ */ new Map(), base) {
      const target = db.characters[index];
      if (base === void 0) return withPreparing(async () => renderCharPlan(file, incoming, db, index, keepExistingOnly, choices, await store.getBaseline(`c:${target.chaId}`)));
      const ch = incoming.character;
      const knownKeys = knownKeysOf(db);
      const plan = planCharacter(target, ch, knownKeys, false);
      const spec = charSpec(ch);
      const keys = [...spec.scalars, ...Object.keys(spec.lists)];
      const m = merge3(base, pickView(target, keys), charIncomingView(ch, plan, /* @__PURE__ */ new Map()), spec, { choices, keepExistingOnly });
      const s = plan.stat;
      const generating = isGenerating(target);
      frame(`<div class="card">
            <div style="margin-bottom:8px">${kindTag("character")}<b>${esc(target.name)}</b> 업데이트${target.name !== ch.fields.name ? ` → 이름이 <b>${esc(ch.fields.name)}</b>(으)로 바뀝니다` : ""}</div>
            <div class="grid"><b>올릴 에셋</b><span><b>${s.upload}개</b> (${fmtBytes2(s.uploadBytes)})${s.reused ? ` · 서버에 이미 있음 ${s.reused}` : ""}</span></div>
            ${mergeBox(m, choices, keepExistingOnly)}
            ${notes(incoming, ch.risuFields.lowLevelAccess && !target.lowLevelAccess, s.upload)}
            ${generating ? `<div class="err">이 캐릭터가 지금 응답을 생성하는 중이에요. 생성이 끝난 뒤 업데이트해 주세요.</div>` : ""}
            <p class="muted" style="margin:10px 0 0">채팅·채팅 폴더·메모는 그대로 둡니다. 바꾸기 전 상태를 백업하므로 [백업·되돌리기]에서 되돌릴 수 있어요. 저장 직전에 응답 생성 중인지 다시 확인합니다.</p>
          </div>${planFooter("업데이트")}`);
      bindMergeBox(() => renderCharPlan(file, incoming, db, index, keepExistingOnly, choices, base), choices);
      bindPlan(file, incoming, db, (keep) => renderCharPlan(file, incoming, db, index, keep, choices, base), async () => {
        const uploaded = await uploadWithProgress(file, plan.toUpload);
        updateProgress(100, "캐릭터 저장 중…");
        let idx = index;
        let fresh = await api.getCharacterFromIndex(idx);
        if (!fresh || fresh.chaId !== target.chaId) {
          const all = (await loadDb(true)).characters;
          idx = all.findIndex((c) => c?.chaId === target.chaId);
          if (idx < 0) throw new Error("업데이트할 캐릭터가 그 사이 삭제되었습니다. 저장하지 않았습니다.");
          fresh = await api.getCharacterFromIndex(idx);
          if (!fresh || fresh.chaId !== target.chaId) throw new Error("캐릭터를 다시 찾지 못했습니다. 저장하지 않았습니다.");
        }
        if (isGenerating(fresh)) throw new Busy();
        const inc = charIncomingView(ch, plan, uploaded);
        const r = merge3(base, pickView(fresh, keys), inc, spec, { choices, keepExistingOnly });
        const sm = summarize(r.items);
        const summary = [sm.update && `제작자 수정 ${sm.update}`, sm.mine && `내 수정 유지 ${sm.mine}`, sm.conflict && `충돌 ${sm.conflict}`, sm.added && `추가 ${sm.added}`, sm.removed && `삭제 ${sm.removed}`, uploaded.size && `에셋 ${uploaded.size}개 올림`].filter(Boolean).join(" · ");
        let backupRec;
        try {
          backupRec = await store.addBackup({ kind: "character", target: fresh.chaId, name: fresh.name, snapshot: backupSnapshot("character", fresh), note: "업데이트 전", summary: `${file.name} → ${summary || "변화 없음"}` });
        } catch (e) {
          throw new Error(`백업을 만들지 못해 아무것도 바꾸지 않았습니다: ${e?.message ?? e}`);
        }
        const merged = applyView(fresh, r.view, { userKeys: USER_KEYS });
        if (merged.vits && !merged.vits.id) merged.vits.id = fresh.vits?.id ?? newId().replace(/-/g, "");
        const last2 = await api.getCharacterFromIndex(idx);
        if (isGenerating(last2) || (last2?.chats ?? []).length !== (fresh.chats ?? []).length) throw new Busy();
        await api.setCharacterToIndex(idx, merged);
        const check = await api.getCharacterFromIndex(idx);
        if (check?.chaId !== target.chaId || (check.chats ?? []).length !== (fresh.chats ?? []).length) throw new Error("저장 후 확인에서 캐릭터가 예상과 다릅니다. [백업·되돌리기]에서 되돌릴 수 있어요.");
        let note2 = "";
        try {
          await store.setBaseline(`c:${fresh.chaId}`, inc);
        } catch {
          note2 = "다음 업데이트용 원본 기록을 저장하지 못했어요. 다음엔 2방향으로 비교합니다.";
        }
        busy = false;
        links?.set(linkKey(incoming), fresh.chaId);
        renderResult({
          kind: "character",
          name: merged.name,
          updated: true,
          uploadedCount: uploaded.size,
          assets: characterAssetKeys(merged).length,
          lore: (merged.globalLore ?? []).length,
          chats: (merged.chats ?? []).length,
          backup: true,
          backupRec,
          summary,
          note: note2
        });
      });
    }
    function renderNewCharPlan(file, incoming, db) {
      const ch = incoming.character;
      const knownKeys = knownKeysOf(db);
      const plan = planCharacter({}, ch, knownKeys, false);
      const name = uniqueDisplayName(ch.fields.name, db.characters);
      const s = plan.stat;
      const generating = db.characters.some(isGenerating);
      frame(`<div class="card">
            <div style="margin-bottom:8px">${kindTag("character")}새 캐릭터 <b>${esc(name)}</b> 추가</div>
            <div class="grid">
              <b>올릴 에셋</b><span><b>${s.upload}개</b> (${fmtBytes2(s.uploadBytes)})${s.reused ? ` · 서버에 이미 있음 ${s.reused}` : ""}</span>
              <b>추가 에셋</b><span>${plan.additional.length}개</span><b>감정 이미지</b><span>${plan.emotions.length}개</span>
              <b>로어북</b><span>${(ch.fields.globalLore ?? []).length}개</span>
            </div>
            ${notes(incoming, ch.risuFields.lowLevelAccess, s.upload)}
            ${ch.offSpec ? `<div class="warn">옛 형식(스펙 밖) 카드입니다. 기본 정보만 가져옵니다.</div>` : ""}
            ${generating ? `<div class="err">다른 캐릭터가 지금 응답을 생성하는 중이에요. 생성이 끝난 뒤 추가해 주세요.</div>` : ""}
            <p class="muted" style="margin:10px 0 0">플러그인은 캐릭터를 추가할 때 캐릭터 목록 전체를 다시 저장합니다(RisuBard 플러그인 API의 한계). 저장 직전에 응답 생성 중인지 다시 확인합니다.</p>
          </div>${planFooter("추가")}`);
      bindPlan(file, incoming, db, () => {
      }, async () => {
        const uploaded = await uploadWithProgress(file, plan.toUpload);
        updateProgress(100, "캐릭터 추가 중…");
        const fresh = (await loadDb(true)).characters;
        if (fresh.some(isGenerating)) throw new Busy();
        const created = buildNewCharacter(ch, plan, uploaded, fresh);
        fresh.push(created);
        await api.setDatabaseLite({ characters: fresh });
        try {
          await api.checkCharOrder();
        } catch {
        }
        const idx = fresh.length - 1;
        const check = await api.getCharacterFromIndex(idx);
        if (check?.chaId !== created.chaId) throw new Error("추가 후 확인에서 캐릭터를 찾지 못했습니다. 캐릭터 목록을 확인해 주세요.");
        try {
          await api.setChatToIndex(idx, 0, created.chats[0]);
        } catch {
        }
        let note2 = "";
        try {
          await store.setBaseline(`c:${created.chaId}`, charIncomingView(ch, plan, uploaded));
        } catch {
          note2 = "다음 업데이트용 원본 기록을 저장하지 못했어요.";
        }
        links?.set(linkKey(incoming), created.chaId);
        busy = false;
        renderResult({ kind: "character", name: created.name, updated: false, uploadedCount: uploaded.size, assets: characterAssetKeys(created).length, lore: created.globalLore.length, note: note2 });
      });
    }
    async function renderBackups(msg) {
      busy = false;
      renderProgress("백업 목록 읽는 중…", 100, "");
      let list = [];
      try {
        list = await store.listBackups();
      } catch (e) {
        return renderResult(null, null, e?.message ?? String(e));
      }
      frame(`${msg ? `<div class="ok">${esc(msg)}</div>` : ""}
          <div class="card"><div style="margin-bottom:6px">업데이트 전 백업 (항목마다 최근 ${5}개)</div>
            ${list.length ? list.map((b) => `<div class="opt" style="cursor:default;align-items:center">
                <div style="flex:1">${kindTag(b.kind)}<b>${esc(b.name)}</b><div class="muted">${fmtDate(b.t)} · ${esc(b.note || "")} · ${fmtBytes2(b.size ?? 0)}</div></div>
                <button data-restore="${esc(b.id)}">되돌리기</button><button class="danger" data-del="${esc(b.id)}">삭제</button></div>`).join("") : '<div class="muted">아직 백업이 없어요. 업데이트할 때마다 바꾸기 전 상태가 자동으로 저장됩니다.</div>'}
          </div>
          <p class="muted">백업은 서버에 파일로 저장돼 다른 기기에서도 보입니다. RisuAI의 "사용하지 않는 에셋 정리"를 하면 백업 기록이나 옛 이미지가 지워질 수 있어요.</p>
          <div class="row"><button id="back">뒤로</button>${closeBtn()}</div>`);
      root.querySelector("#back").addEventListener("click", () => renderStart());
      root.querySelectorAll("[data-del]").forEach((el) => el.addEventListener("click", async () => {
        if (!confirm("이 백업을 지울까요? 지우면 이 시점으로 되돌릴 수 없어요.")) return;
        await store.removeBackup(el.dataset.del);
        renderBackups("백업을 지웠어요.");
      }));
      root.querySelectorAll("[data-restore]").forEach((el) => el.addEventListener("click", () => {
        const rec = list.find((b) => b.id === el.dataset.restore);
        restoreBackup(rec).catch((err) => renderResult(null, null, err instanceof Busy ? err.message : `되돌리지 못했어요: ${err?.message ?? err}`));
      }));
    }
    async function restoreBackup(rec) {
      busy = true;
      renderProgress(`되돌리는 중: ${rec.name}`, 100, "백업 읽는 중…");
      const snap = await store.loadBackup(rec);
      if (rec.kind === "character") {
        const all = (await loadDb(true)).characters;
        const idx = all.findIndex((c) => c?.chaId === rec.target);
        if (idx < 0) throw new Error("이 백업의 캐릭터를 지금 목록에서 찾지 못했어요.");
        const cur = await api.getCharacterFromIndex(idx);
        if (!cur || cur.chaId !== rec.target) throw new Error("캐릭터를 다시 찾지 못했어요.");
        if (isGenerating(cur)) throw new Busy();
        await store.addBackup({ kind: "character", target: cur.chaId, name: cur.name, snapshot: backupSnapshot("character", cur), note: "되돌리기 전" });
        const restored = restoreFromBackup("character", cur, snap);
        await api.setCharacterToIndex(idx, restored);
        const check = await api.getCharacterFromIndex(idx);
        if (check?.chaId !== rec.target || (check.chats ?? []).length !== (cur.chats ?? []).length) throw new Error("되돌린 뒤 확인에서 캐릭터가 예상과 다릅니다.");
        await store.restoreBaseline(`c:${rec.target}`, rec.basePath);
      } else {
        await commit(api, async (d) => {
          const e = d.entries.find((x) => x.module?.id === rec.target);
          if (!e) {
            d.entries.push({ module: { ...snap, id: rec.target }, enabled: true });
            return;
          }
          await store.addBackup({ kind: "module", target: e.module.id, name: e.module.name, snapshot: backupSnapshot("module", e.module), note: "되돌리기 전" });
          e.module = restoreFromBackup("module", e.module, snap);
        });
        await store.restoreBaseline(`m:${rec.target}`, rec.basePath);
      }
      busy = false;
      renderBackups(`${rec.name}을(를) ${fmtDate(rec.t)} 상태로 되돌렸어요. 채팅은 그대로예요.`);
    }
    function keepBox(on) {
      return `<label class="chk"><input type="checkbox" id="keep" ${on ? "checked" : ""}>
          <span>새 버전에 없는 기존 로어북·에셋 유지<br><span class="muted">직접 추가한 항목을 지킵니다. 작성자가 지운 항목도 남을 수 있습니다.</span></span></label>`;
    }
    function notes(incoming, lowLevelNew, uploads) {
      return [
        ...(incoming.notes ?? []).map((n) => `<div class="warn">${esc(n)}</div>`),
        lowLevelNew ? `<div class="warn">이 버전은 <b>저수준 접근(lowLevelAccess)</b>을 사용합니다. 믿을 수 있는 파일인지 확인하세요.</div>` : "",
        uploads > 300 ? `<div class="warn">올릴 에셋이 ${uploads}개입니다. 서버 상태에 따라 오래 걸릴 수 있습니다. 진행 중에 예상 시간이 표시됩니다.</div>` : ""
      ].join("");
    }
    async function uploadWithProgress(file, list) {
      busy = true;
      stopRequested = false;
      renderProgress(`에셋 올리는 중 (${list.length}개)`, 0, list.length ? "시작하는 중…" : "올릴 에셋 없음");
      const uploaded = await uploadAssets(file, list, (data) => api.saveAsset(data), {
        shouldStop: () => stopRequested,
        onProgress: (done, all, bytes, ms, limit) => {
          const per = ms / done;
          updateProgress(done / all * 100, `${done} / ${all} · ${fmtBytes2(bytes)} · 개당 ${(per / 1e3).toFixed(2)}초 · 동시 ${limit} · 남은 시간 약 ${fmtTime(per * (all - done))}`);
        }
      });
      if (stopRequested) throw new Cancelled();
      return uploaded;
    }
    function renderResult(res, info, error) {
      busy = false;
      const what = res ? res.kind === "character" ? "캐릭터" : "모듈" : "";
      frame(`${res ? `<div class="ok"><b>${esc(res.name)}</b> ${what} ${res.updated ? "업데이트" : "추가"} 완료<br>
              <span class="muted">새로 올린 에셋 ${res.uploadedCount}개 · 전체 에셋 ${res.assets}개 · 로어북 ${res.lore}개${res.chats !== void 0 ? ` · 채팅 ${res.chats}개 유지` : ""}${res.backup ? " · 바꾸기 전 상태를 백업함" : ""}</span></div>
              ${res.note ? `<div class="warn">${esc(res.note)}</div>` : ""}` : ""}
          ${info ? `<div class="card">${esc(info)}</div>` : ""}
          ${error ? `<div class="err">${esc(error)}</div><p class="muted">기존 항목은 바뀌지 않았습니다. 이미 올라간 에셋은 쓰이지 않으면 서버 정리 때 지워집니다.</p>` : ""}
          ${res?.summary ? `<div class="card"><div class="grid"><b>바뀐 내용</b><span>${esc(res.summary)}</span></div></div>` : ""}
          ${queue.length ? `<div class="card">대기 중인 파일 ${queue.length}개 — 다음: <b>${esc(queue[0].name)}</b></div>` : ""}
          <div class="row">${queue.length ? '<button class="primary" id="nextq">다음 파일</button>' : '<button class="primary" id="again">다른 파일</button>'}${res?.backupRec ? '<button id="undo">바로 되돌리기</button>' : ""}${res?.backup ? '<button id="tobk">백업·되돌리기</button>' : ""}${closeBtn()}</div>`);
      root.querySelector("#again")?.addEventListener("click", () => renderStart());
      root.querySelector("#nextq")?.addEventListener("click", () => runQueue());
      root.querySelector("#tobk")?.addEventListener("click", () => renderBackups());
      root.querySelector("#undo")?.addEventListener("click", () => restoreBackup(res.backupRec).catch((err) => renderResult(null, null, err instanceof Busy ? err.message : `되돌리지 못했어요: ${err?.message ?? err}`)));
    }
    async function syncColorScheme() {
      let type = "dark";
      try {
        const cs = await api.getColorScheme();
        if (cs?.scheme?.type === "light") type = "light";
      } catch {
      }
      document.documentElement.style.colorScheme = type;
    }
    function runQueue() {
      const f = queue.shift();
      if (!f) return renderStart();
      startScan(f).catch((err) => renderStart(err instanceof Cancelled ? void 0 : err?.message ?? String(err)));
    }
    const show = async () => {
      const hostEl = host?.();
      if (hostEl && overlay.parentNode !== hostEl) hostEl.appendChild(overlay);
      else await syncColorScheme();
      overlay.className = "";
      await api.showContainer("fullscreen");
    };
    return {
      async open() {
        if (!busy && overlay.className === "hidden") renderStart();
        await show();
      },
      async openBackups() {
        if (!busy) renderBackups();
        await show();
      },
      async restore(rec) {
        if (busy) return show();
        await show();
        return restoreBackup(rec).catch((err) => renderResult(null, null, err instanceof Busy ? err.message : `되돌리지 못했어요: ${err?.message ?? err}`));
      },
      async startWithFile(file) {
        return this.startWithFiles([file]);
      },
      async startWithFiles(files) {
        if (busy) {
          queue.push(...files);
          return show();
        }
        queue = [...files];
        renderStart();
        await show();
        runQueue();
      },
      get busy() {
        return busy;
      }
    };
  }

  // src/ui/dom.js
  function h(tag, props, ...children) {
    const el = tag === "svg" || props?.svg ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === void 0 || v === null || v === false || k === "svg") continue;
        if (k === "class") el.setAttribute("class", Array.isArray(v) ? v.filter(Boolean).join(" ") : v);
        else if (k === "style") {
          if (typeof v === "string") el.style.cssText = v;
          else for (const [sk, sv] of Object.entries(v)) {
            if (sv === void 0 || sv === null) continue;
            if (sk.startsWith("--")) el.style.setProperty(sk, sv);
            else el.style[sk] = sv;
          }
        } else if (k === "ref") v(el);
        else if (k === "dataset") Object.assign(el.dataset, v);
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === "value" && "value" in el) el.value = v;
        else if (k === "checked" && "checked" in el) el.checked = !!v;
        else if (v === true) el.setAttribute(k, "");
        else el.setAttribute(k, String(v));
      }
    }
    append(el, children);
    return el;
  }
  function append(el, children) {
    for (const c of children.flat(Infinity)) {
      if (c === null || c === void 0 || c === false || c === true) continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }
  function replace(el, ...children) {
    clear(el);
    return append(el, children);
  }
  var tpl = typeof document !== "undefined" ? document.createElement("template") : null;
  function svgFrom(markup) {
    tpl.innerHTML = markup.trim();
    return tpl.content.firstChild;
  }
  var fmtBytes = (n) => n >= 1e9 ? (n / 1e9).toFixed(2) + " GB" : n >= 1e6 ? (n / 1e6).toFixed(1) + " MB" : n >= 1e3 ? (n / 1e3).toFixed(0) + " KB" : (n ?? 0) + " B";
  function fmtWhen(t, now = Date.now()) {
    const d = new Date(t), n = new Date(now);
    const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    if (d.toDateString() === n.toDateString()) return `오늘 ${hm}`;
    const y = new Date(n);
    y.setDate(n.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return `어제 ${hm}`;
    return d.getFullYear() === n.getFullYear() ? `${d.getMonth() + 1}월 ${d.getDate()}일` : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }
  function download(name, blobOrText, type = "application/octet-stream") {
    const blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3e4);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
  function pickFiles({ accept = "", multiple = false } = {}) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = multiple;
      input.style.display = "none";
      input.addEventListener("change", () => {
        resolve([...input.files ?? []]);
        input.remove();
      });
      document.body.appendChild(input);
      input.click();
    });
  }

  // src/ui/icons.js
  var P = {
    module: '<path d="M12 2 3 7l9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    character: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    preset: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><circle cx="7.5" cy="7" r="1"/><circle cx="16.5" cy="17" r="1"/>',
    history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5 2.5-2.5Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    upload: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M20 21H4"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M20 21H4"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    grip: '<circle cx="9" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.5" fill="currentColor" stroke="none"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M12 11v5"/><path d="M9.5 13.5h5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-7.8-9-7.8Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
    code: '<path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/><path d="m13.5 4-3 16"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
  };
  function icon(name, size = 18, extraStyle = "") {
    const body = P[name] ?? P.module;
    return svgFrom(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extraStyle ? ` style="${extraStyle}"` : ""}>${body}</svg>`);
  }
  function iconMarkup(name, size = 20) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[name] ?? P.module}</svg>`;
  }

  // src/ui/kit.js
  function btn(label, { kind = "", size = "", icon: ic, onClick, title, disabled, id, labelClass } = {}) {
    return h(
      "button",
      { type: "button", class: ["rb-btn", kind, size], onClick, title, disabled, id },
      ic ? icon(ic, 16) : null,
      label ? h("span", { class: labelClass }, label) : null
    );
  }
  function iconBtn(name, label, { onClick, boxed, id } = {}) {
    return h("button", { type: "button", class: ["rb-icon-btn", boxed && "boxed"], "aria-label": label, title: label, onClick, id }, icon(name, 18));
  }
  function switchEl(on, { label, onChange, disabled } = {}) {
    const el = h(
      "button",
      { type: "button", class: "rb-switch", role: "switch", "aria-checked": on ? "true" : "false", "aria-label": label, disabled },
      h("span")
    );
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (el.disabled) return;
      onChange?.(el.getAttribute("aria-checked") !== "true", el);
    });
    return el;
  }
  var setSwitch = (el, on) => el.setAttribute("aria-checked", on ? "true" : "false");
  function chip(label, { pressed, count, onClick } = {}) {
    return h(
      "button",
      { type: "button", class: "rb-chip", "aria-pressed": pressed ? "true" : "false", onClick },
      label,
      count !== void 0 ? h("small", null, String(count)) : null
    );
  }
  var badge = (label, kind = "mute") => h("span", { class: ["rb-badge", `k-${kind}`] }, label);
  function progressBar(pct = 0) {
    const i = h("i");
    const el = h("div", { class: "rb-progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, i);
    el.set = (p) => {
      const v = Math.max(0, Math.min(100, p));
      i.style.width = v + "%";
      el.setAttribute("aria-valuenow", String(Math.round(v)));
    };
    el.set(pct);
    return el;
  }
  var note = (kind, text) => h("div", { class: ["rb-note", kind], role: kind === "err" ? "alert" : "status" }, icon(kind === "err" ? "alert" : kind === "warn" ? "alert" : "info", 18), h("span", null, text));
  function toast(host, text, { action, seconds = 4, error = false } = {}) {
    let box = host.querySelector(":scope > .rb-toasts");
    if (!box) {
      box = h("div", { class: "rb-toasts", "aria-live": "polite" });
      host.appendChild(box);
    }
    let left = action ? seconds : 0;
    const actBtn = action ? h("button", { type: "button", class: "act" }) : null;
    const el = h(
      "div",
      { class: ["rb-toast", error && "err"], role: error ? "alert" : "status" },
      icon(error ? "alert" : "check", 18),
      h("span", null, text),
      actBtn
    );
    let timer = null;
    const close = () => {
      clearInterval(timer);
      el.remove();
    };
    const paint = () => {
      if (actBtn) actBtn.textContent = `${action.label} · ${left}초`;
    };
    if (actBtn) {
      actBtn.addEventListener("click", async () => {
        clearInterval(timer);
        actBtn.disabled = true;
        actBtn.textContent = "처리 중…";
        try {
          await action.run();
        } finally {
          close();
        }
      });
      paint();
      timer = setInterval(() => {
        left--;
        if (left <= 0) close();
        else paint();
      }, 1e3);
    } else timer = setInterval(close, seconds * 1e3);
    box.appendChild(el);
    return { close };
  }
  function modal(host, build) {
    return new Promise((resolve) => {
      const prevFocus = host.ownerDocument.activeElement;
      const back = h("div", { class: "rb-modal" });
      const done = (v) => {
        back.remove();
        host.ownerDocument.removeEventListener("keydown", onKey, true);
        prevFocus?.focus?.();
        resolve(v);
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          done(null);
        }
      };
      const box = build(done);
      back.appendChild(box);
      back.addEventListener("mousedown", (e) => {
        if (e.target === back) done(null);
      });
      host.ownerDocument.addEventListener("keydown", onKey, true);
      host.appendChild(back);
      (box.querySelector("[data-autofocus]") ?? box.querySelector("input,button.primary,button"))?.focus();
    });
  }
  function confirmDialog(host, { title, body, ok = "확인", cancel = "취소", danger = false }) {
    return modal(host, (done) => h(
      "div",
      { class: "rb-dialog", role: "alertdialog", "aria-modal": "true", "aria-label": title },
      h("h3", { class: "rb-h3" }, title),
      body ? h("p", { class: "rb-p", style: "white-space:pre-line" }, body) : null,
      h(
        "div",
        { class: "btns" },
        btn(cancel, { onClick: () => done(false) }),
        btn(ok, { kind: danger ? "danger" : "primary", onClick: () => done(true) })
      )
    )).then((v) => v === true);
  }
  function promptDialog(host, { title, label, value = "", ok = "확인", placeholder = "" }) {
    let input;
    return modal(host, (done) => {
      input = h("input", { class: "rb-input", value, placeholder, "aria-label": label ?? title, "data-autofocus": "1" });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) {
          e.preventDefault();
          done(input.value);
        }
      });
      setTimeout(() => input.select(), 0);
      return h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title },
        h("h3", { class: "rb-h3" }, title),
        label ? h("span", { class: "rb-label" }, label) : null,
        input,
        h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn(ok, { kind: "primary", onClick: () => done(input.value) }))
      );
    });
  }
  function folderDialog(host, { title, name = "", items, checked = [], ok = "만들기", withName = true, noun = "항목", current = null, othersMode = "hide", onOthersMode }) {
    const sel = new Set(checked);
    const isOther = (it) => !!it.folder && it.folder !== current;
    let others = othersMode === "hide" ? "hide" : "show";
    return modal(host, (done) => {
      const nameInput = withName ? h("input", { class: "rb-input", value: name, placeholder: "폴더 이름", "aria-label": "폴더 이름", "data-autofocus": "1" }) : null;
      const q = h("input", { class: "rb-input", type: "search", placeholder: `${noun} 찾기`, "aria-label": `${noun} 찾기`, style: "height:38px" });
      const count = h("span", { class: "rb-muted" });
      const list = h("div", { class: "rb-scroll rb-pick", role: "group", "aria-label": `넣을 ${noun}`, style: "max-height:min(46vh,380px);overflow:auto;border:1px solid var(--rb-line);border-radius:12px;padding:4px;overscroll-behavior:contain" });
      const rows = items.map((it) => {
        const cb = h("input", { type: "checkbox", checked: sel.has(it.id) });
        cb.addEventListener("change", () => {
          if (cb.checked) sel.add(it.id);
          else sel.delete(it.id);
          paintCount();
        });
        const r = h(
          "label",
          { class: "rb-check", style: "display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:8px;cursor:pointer" },
          cb,
          h("span", { style: "flex:1;min-width:0;display:flex;flex-direction:column" }, h("span", { style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, it.label || "(이름 없음)"), it.sub ? h("small", { class: "rb-muted" }, it.sub) : null)
        );
        r.dataset.q = `${it.label ?? ""} ${it.sub ?? ""}`.toLowerCase();
        r._cb = cb;
        r._id = it.id;
        r._other = isOther(it);
        return r;
      });
      list.append(...rows);
      if (!rows.length) list.appendChild(h("div", { class: "rb-empty" }, `넣을 ${noun}이(가) 없어요`));
      const visibleRows = () => rows.filter((r) => !r.hidden);
      const paintCount = () => {
        count.textContent = `${sel.size}개 고름`;
      };
      const all = btn("보이는 것 모두", { size: "sm", onClick: () => {
        const v = visibleRows();
        const on = v.some((r) => !r._cb.checked);
        for (const r of v) {
          r._cb.checked = on;
          if (on) sel.add(r._id);
          else sel.delete(r._id);
        }
        paintCount();
      } });
      const filter = () => {
        const v = q.value.trim().toLowerCase();
        for (const r of rows) r.hidden = others === "hide" && r._other || !!v && !r.dataset.q.includes(v);
      };
      q.addEventListener("input", filter);
      const otherCount = rows.filter((r) => r._other).length;
      const othersCtl = otherCount ? h(
        "div",
        { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" },
        h("span", { class: "rb-muted", style: "flex:1;min-width:140px" }, `다른 폴더에 든 ${noun} ${otherCount}개 (고르면 이 폴더로 옮겨져요)`),
        h("div", { class: "rb-seg-nowrap", style: "flex:1 1 300px" }, segmented([["show", "보이기 (골라서 옮기기)"], ["hide", "숨기기"]], others, (v) => {
          others = v;
          if (v === "hide") {
            for (const r of rows) if (r._other) {
              r._cb.checked = false;
              sel.delete(r._id);
            }
          }
          filter();
          paintCount();
          onOthersMode?.(v);
        }, `다른 폴더에 든 ${noun}`))
      ) : null;
      filter();
      paintCount();
      const submit = () => {
        const n = nameInput ? nameInput.value.trim() : name;
        if (withName && !n) {
          nameInput.focus();
          return;
        }
        done({ name: n, ids: items.map((i) => i.id).filter((id) => sel.has(id)) });
      };
      nameInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) {
          e.preventDefault();
          submit();
        }
      });
      return h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title, style: "width:min(560px,100%)" },
        h("h3", { class: "rb-h3" }, title),
        nameInput ? h("label", { class: "rb-field" }, h("span", { class: "rb-label" }, "이름"), nameInput) : null,
        h("div", { style: "display:flex;gap:8px;align-items:center" }, h("span", { class: "rb-label", style: "flex:1" }, `넣을 ${noun} 고르기 (나중에 바꿀 수 있어요)`), count),
        othersCtl,
        h("div", { style: "display:flex;gap:8px" }, h("div", { style: "flex:1" }, q), all),
        list,
        h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn(ok, { kind: "primary", onClick: submit }))
      );
    });
  }
  function colorDialog(host, { title, swatches, value, previewText }) {
    return modal(host, (done) => {
      let cur = value || "";
      const prev = h("span", { style: "font-size:15px;font-weight:600" }, previewText ?? "미리보기");
      const paint = () => {
        prev.style.color = cur || "var(--rb-text)";
        sw.forEach((b) => b.setAttribute("aria-pressed", b.dataset.c === cur ? "true" : "false"));
        custom.value = cur || "#c4b1ff";
      };
      const sw = swatches.map((c) => h("button", { type: "button", class: "rb-swatch", style: { background: c }, "aria-label": `색 ${c}`, dataset: { c }, onClick: () => {
        cur = c;
        paint();
      } }));
      const custom = h("input", { type: "color", "aria-label": "직접 고르기" });
      custom.addEventListener("input", () => {
        cur = custom.value;
        paint();
      });
      const box = h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title },
        h("h3", { class: "rb-h3" }, title),
        h("div", { class: "rb-card pad" }, prev),
        h("div", { class: "rb-swatches" }, sw, h("label", { class: "rb-color", style: "height:36px" }, custom, h("span", null, "직접"))),
        h(
          "div",
          { class: "btns" },
          btn("기본값", { kind: "ghost", onClick: () => done("") }),
          btn("취소", { onClick: () => done(null) }),
          btn("적용", { kind: "primary", onClick: () => done(cur) })
        )
      );
      paint();
      return box;
    });
  }
  function openMenu(host, anchor, items) {
    host.querySelector(":scope > .rb-menu")?.remove();
    const menu = h("div", { class: "rb-menu", role: "menu" });
    const close = () => {
      menu.remove();
      host.ownerDocument.removeEventListener("mousedown", onDown, true);
      host.ownerDocument.removeEventListener("keydown", onKey, true);
      anchor.focus?.();
    };
    const onDown = (e) => {
      if (!menu.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const bs = [...menu.querySelectorAll("button")];
        const i = bs.indexOf(host.ownerDocument.activeElement);
        bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length]?.focus();
      }
    };
    for (const it of items) {
      if (!it) continue;
      if (it === "sep") {
        menu.appendChild(h("hr"));
        continue;
      }
      menu.appendChild(h(
        "button",
        { type: "button", role: "menuitem", class: it.danger ? "danger" : "", onClick: () => {
          close();
          it.onClick?.();
        } },
        it.icon ? icon(it.icon, 16) : null,
        it.label
      ));
    }
    host.appendChild(menu);
    const hr = host.getBoundingClientRect(), ar = anchor.getBoundingClientRect(), mr = menu.getBoundingClientRect();
    let left = ar.right - hr.left - mr.width, top = ar.bottom - hr.top + 6;
    if (left < 8) left = 8;
    if (top + mr.height > hr.height - 8) top = Math.max(8, ar.top - hr.top - mr.height - 6);
    menu.style.left = left + "px";
    menu.style.top = top + "px";
    setTimeout(() => {
      host.ownerDocument.addEventListener("mousedown", onDown, true);
      host.ownerDocument.addEventListener("keydown", onKey, true);
      menu.querySelector("button")?.focus();
    }, 0);
    return { close };
  }
  function folderPickPrefs(ctx) {
    return { othersMode: ctx.prefs.meta.folderPickOthers === "hide" ? "hide" : ctx.prefs.meta.folderPickOthers ? "show" : "hide", onOthersMode: (v) => {
      ctx.svc.meta((m) => {
        m.folderPickOthers = v;
      }).catch(() => {
      });
    } };
  }
  function segmented(options, value, onChange, label) {
    const el = h("div", { class: "rb-seg", role: "radiogroup", "aria-label": label });
    const paint = (v) => el.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.v === v ? "true" : "false"));
    for (const [v, text] of options) el.appendChild(h("button", { type: "button", role: "radio", dataset: { v }, onClick: () => {
      paint(v);
      onChange(v);
    } }, text));
    paint(value);
    return el;
  }

  // src/ui/styles.js
  var FONT_LINK = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap";
  var CSS2 = `
*{box-sizing:border-box}
[hidden]{display:none !important}
html,body{margin:0;height:100%;background:transparent}
.rb-root{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--rb-backdrop);
  font:14px/1.5 'IBM Plex Sans KR',system-ui,-apple-system,'Segoe UI','Noto Sans KR',sans-serif;color:var(--rb-text);z-index:10}
.rb-root[hidden]{display:none}
.rb-root button,.rb-root input,.rb-root select,.rb-root textarea{font:inherit;color:inherit}
.rb-win{width:100%;max-width:min(1560px,100%);height:100%;max-height:min(1040px,100%);display:flex;flex-direction:column;overflow:hidden;
  border-radius:18px;background:var(--rb-win);border:1px solid var(--rb-line);box-shadow:var(--rb-shadow);position:relative}
.rb-scroll{overflow:auto;scrollbar-width:thin;scrollbar-color:var(--rb-line3) transparent}
.rb-scroll::-webkit-scrollbar{width:10px;height:10px}.rb-scroll::-webkit-scrollbar-thumb{background:var(--rb-line3);border-radius:10px;border:3px solid var(--rb-win)}

/* 머리줄 */
.rb-head{height:64px;flex-shrink:0;display:flex;align-items:center;gap:14px;padding:0 20px;border-bottom:1px solid var(--rb-line2)}
.rb-brand{display:flex;align-items:center;gap:12px;width:184px;flex-shrink:0}
.rb-logo{width:34px;height:34px;border-radius:10px;background:var(--rb-acc-grad);color:var(--rb-on-acc);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rb-brand b{display:block;font-size:15px;font-weight:700;line-height:1.2}.rb-brand small{display:block;font-size:11px;color:var(--rb-sub)}
.rb-search{flex:1;max-width:420px;height:40px;display:flex;align-items:center;gap:10px;padding:0 14px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);color:var(--rb-sub)}
.rb-search:focus-within{border-color:var(--rb-sel-ring);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-search input{flex:1;min-width:0;background:transparent;border:0;outline:none;font-size:14px;color:var(--rb-text)}
.rb-search input::placeholder{color:var(--rb-mute)}
.rb-kbd{font-size:11px;color:var(--rb-mute);border:1px solid var(--rb-line);border-radius:6px;padding:1px 6px}
.rb-spacer{flex:1}

/* 버튼 */
.rb-btn{height:40px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;border-radius:12px;border:1px solid var(--rb-line3);
  background:var(--rb-surf);color:var(--rb-text);font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s,filter .15s}
@media (hover: hover){.rb-btn:hover{background:var(--rb-hover)}}
.rb-btn:focus-visible,.rb-chip:focus-visible,.rb-nav a:focus-visible,.rb-switch:focus-visible,.rb-icon-btn:focus-visible{outline:2px solid var(--rb-focus);outline-offset:2px}
.rb-row:focus-visible{outline:2px solid var(--rb-focus);outline-offset:-2px}
.rb-btn.primary{border:0;background:var(--rb-acc-grad);color:var(--rb-on-acc);font-weight:600}
@media (hover: hover){.rb-btn.primary:hover{filter:brightness(1.08)}}
.rb-btn.ghost{border-color:transparent;background:transparent;color:var(--rb-sub)}
@media (hover: hover){.rb-btn.ghost:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-btn.danger{border:0;background:var(--rb-danger-soft);color:var(--rb-danger);font-weight:600}
.rb-btn.lg{height:44px;padding:0 20px}
.rb-btn.sm{height:32px;padding:0 12px;border-radius:10px;font-size:13px}
.rb-btn[disabled]{opacity:.5;cursor:not-allowed;filter:none}
.rb-icon-btn{width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;border:0;background:transparent;color:var(--rb-sub);cursor:pointer;flex-shrink:0}
@media (hover: hover){.rb-icon-btn:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-icon-btn.boxed{border:1px solid var(--rb-line3);background:var(--rb-surf)}

/* 본문 3단 */
.rb-body{flex:1;display:flex;min-height:0}
.rb-nav{width:216px;flex-shrink:0;padding:16px 12px;display:flex;flex-direction:column;gap:4px;border-right:1px solid var(--rb-line2)}
.rb-nav a{height:44px;display:flex;align-items:center;gap:12px;padding:0 12px;border-radius:12px;color:var(--rb-sub);text-decoration:none;font-size:14px;font-weight:500;cursor:pointer}
@media (hover: hover){.rb-nav a:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-nav a[aria-current=page]{background:var(--rb-sel-bg);color:var(--rb-text);font-weight:600}
.rb-nav a[aria-current=page] svg{color:var(--rb-acc-text)}
.rb-nav a span{flex:1}.rb-nav a small{font-size:12px;color:var(--rb-sub)}
.rb-nav-card{padding:14px;border-radius:14px;background:var(--rb-surf);border:1px solid var(--rb-line);display:flex;flex-direction:column;gap:6px}
.rb-nav-hint{padding:12px 4px 0;font-size:12px;color:var(--rb-mute);line-height:1.5}
.rb-main{flex:1;min-width:0;display:flex;flex-direction:column}
.rb-detail{width:380px;flex-shrink:0;border-left:1px solid var(--rb-line2);padding:20px;display:flex;flex-direction:column;gap:18px}

/* 칩·배지 */
.rb-chips{display:flex;align-items:center;gap:8px;padding:16px 20px 12px;flex-wrap:wrap}
.rb-chips.rb-fchips{padding-top:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin}
.rb-chips.rb-fchips .rb-chip{flex-shrink:0}
.rb-chip{height:34px;padding:0 14px;border-radius:999px;border:1px solid var(--rb-line);background:transparent;color:var(--rb-sub);font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
@media (hover: hover){.rb-chip:hover{color:var(--rb-text);border-color:var(--rb-line3)}}
.rb-chip[aria-pressed=true]{border-color:var(--rb-sel-ring);background:var(--rb-acc-soft);color:var(--rb-text);font-weight:600}
.rb-chip small{opacity:.75;font-size:inherit}
.rb-badge{display:inline-flex;align-items:center;font-size:11px;font-weight:500;border-radius:999px;padding:2px 8px;white-space:nowrap;flex-shrink:0}
.k-acc{color:var(--rb-acc-text);background:var(--rb-acc-soft)}.k-acc2{color:var(--rb-acc2-text);background:var(--rb-acc2-soft)}
.k-warn{color:var(--rb-warn);background:var(--rb-warn-soft)}.k-ok{color:var(--rb-teal);background:var(--rb-teal-soft)}
.k-danger{color:var(--rb-rose);background:var(--rb-rose-soft)}.k-mute{color:var(--rb-sub);background:var(--rb-surf2)}

/* 목록 줄 */
.rb-list{flex:1;padding:0 12px 16px;display:flex;flex-direction:column;gap:4px}
.rb-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;cursor:pointer;border:0;background:transparent;text-align:left;width:100%;color:inherit}
@media (hover: hover){.rb-row:hover{background:var(--rb-hover)}}
.rb-row[aria-selected=true]{background:var(--rb-sel-bg);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}
.rb-row .grip{color:var(--rb-grip);cursor:grab;flex-shrink:0;display:flex}
.rb-row .txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.rb-row .ttl{display:flex;align-items:center;gap:8px;min-width:0}
.rb-row .name{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-row .meta{font-size:12px;color:var(--rb-mute)}
.rb-row.off .name{color:var(--rb-mute)}
.rb-row{-webkit-touch-callout:none}
.rb-mcb{display:none;flex-shrink:0;width:22px;height:22px;border-radius:7px;border:1.5px solid var(--rb-grip);align-items:center;justify-content:center;cursor:pointer;color:#fff;margin:-4px -2px}
.rb-mcb::after{content:'';width:10px;height:6px;border:2.5px solid currentColor;border-top:0;border-right:0;transform:rotate(-45deg) translate(1px,-1px);opacity:0}
.picking .rb-mcb{display:flex}
.picking .rb-row{user-select:none;-webkit-user-select:none}
.rb-row.picked{background:var(--rb-acc-soft);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}
.rb-row.picked .rb-mcb{background:var(--rb-acc-grad);border-color:transparent}
.rb-row.picked .rb-mcb::after{opacity:1}
.rb-pickbar{display:flex;flex-shrink:0;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 10px;margin:0 12px 6px;border-radius:12px;background:var(--rb-sel-bg);border:1px solid var(--rb-sel-ring)}
.rb-pickbar b{font-size:13px;margin-right:auto}
.rb-pickbar[hidden]{display:none}
.rb-folder{height:40px;display:flex;align-items:center;gap:10px;padding:0 10px;margin-top:6px;border:0;border-radius:10px;background:transparent;color:var(--rb-text);cursor:pointer;text-align:left;width:100%}
@media (hover: hover){.rb-folder:hover{background:var(--rb-hover)}}
.rb-folder .chev{color:var(--rb-sub);transition:transform .15s;display:flex}
.rb-folder[aria-expanded=true] .chev{transform:rotate(90deg)}
.rb-folder b{font-size:13px;font-weight:600}.rb-folder small{font-size:12px;color:var(--rb-mute)}
.rb-folder-body{display:flex;flex-direction:column;gap:4px;padding-left:14px;margin-left:16px;box-shadow:inset 2px 0 0 var(--rb-line2)}

/* 스위치 */
.rb-switch{flex-shrink:0;width:44px;height:26px;border-radius:999px;border:0;padding:3px;cursor:pointer;display:flex;justify-content:flex-start;background:var(--rb-track-off);transition:background .15s}
.rb-switch>span{width:20px;height:20px;border-radius:999px;background:var(--rb-knob-off);box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .15s}
.rb-switch[aria-checked=true]{background:var(--rb-acc-grad)}
.rb-switch[aria-checked=true]>span{background:var(--rb-knob-on);transform:translateX(18px)}
.rb-switch[disabled]{opacity:.5;cursor:not-allowed}

/* 카드·필드 */
.rb-card{border-radius:14px;background:var(--rb-surf);overflow:hidden}
.rb-card.pad{padding:16px}
.rb-card.bordered{border:1px solid var(--rb-line)}
.rb-kv{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--rb-line2);font-size:13px}
.rb-kv:last-child{border-bottom:0}.rb-kv>span:first-child{flex:1}.rb-kv>span:last-child{font-size:12px;color:var(--rb-sub)}
.rb-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.rb-stat{padding:12px 14px;border-radius:12px;background:var(--rb-surf)}
.rb-stat small{display:block;font-size:11px;color:var(--rb-sub)}.rb-stat b{display:block;font-size:18px;font-weight:600;margin-top:2px}
.rb-label{font-size:12px;font-weight:600;color:var(--rb-sub)}
.rb-h2{margin:0;font-size:20px;font-weight:700;line-height:1.35}
.rb-h3{margin:0;font-size:16px;font-weight:600}
.rb-p{margin:0;font-size:13px;color:var(--rb-sub);line-height:1.6}
.rb-muted{font-size:12px;color:var(--rb-mute);line-height:1.5}
.rb-input{height:44px;width:100%;padding:0 14px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);color:var(--rb-text);font-size:14px;outline:none}
.rb-input:focus{border-color:var(--rb-sel-ring);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-field{display:flex;flex-direction:column;gap:6px}
.rb-seg{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);padding:4px;border-radius:12px;background:var(--rb-surf)}
.rb-seg button{height:36px;border:0;border-radius:9px;background:transparent;color:var(--rb-sub);font-size:13px;cursor:pointer}
.rb-seg-nowrap .rb-seg button{white-space:nowrap;padding:0 10px}
.rb-seg button[aria-checked=true]{background:var(--rb-line);color:var(--rb-text);font-weight:600}
.rb-empty{padding:40px 20px;text-align:center;color:var(--rb-mute);font-size:13px;line-height:1.7}
.rb-section{padding:20px;display:flex;flex-direction:column;gap:20px}
.rb-section.rb-scroll>*{flex-shrink:0}

/* 진행 · 알림 */
.rb-progress{height:8px;border-radius:999px;background:var(--rb-track-off);overflow:hidden}
.rb-progress>i{display:block;height:100%;width:0;border-radius:999px;background:var(--rb-deco-grad);transition:width .2s}
.rb-note{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:14px;font-size:13px;line-height:1.6}
.rb-note.warn{background:var(--rb-warn-soft);color:var(--rb-text);box-shadow:inset 0 0 0 1px var(--rb-warn)}
.rb-note.warn svg{color:var(--rb-warn);flex-shrink:0}
.rb-note.info{background:var(--rb-surf2);color:var(--rb-sub)}
.rb-note.info svg{color:var(--rb-acc-text);flex-shrink:0}
.rb-note.err{background:var(--rb-danger-soft);box-shadow:inset 0 0 0 1px var(--rb-danger)}
.rb-note.err svg{color:var(--rb-danger);flex-shrink:0}
.rb-toasts{position:absolute;left:20px;bottom:20px;display:flex;flex-direction:column;gap:8px;z-index:30;pointer-events:none}
.rb-toast{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:12px 14px 12px 16px;border-radius:14px;background:var(--rb-toast);border:1px solid var(--rb-line3);box-shadow:var(--rb-shadow-sm);font-size:13px;animation:rb-in .18s ease-out}
.rb-toast svg{flex-shrink:0;color:var(--rb-ok)}.rb-toast.err svg{color:var(--rb-danger)}
.rb-toast .act{height:32px;padding:0 12px;border-radius:10px;border:0;background:var(--rb-acc-soft);color:var(--rb-acc-text);font-size:13px;font-weight:600;cursor:pointer}
.rb-drop{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:var(--rb-backdrop);border-radius:18px}
.rb-drop>div{display:flex;align-items:center;gap:12px;padding:28px 36px;border-radius:18px;border:1.5px dashed var(--rb-sel-ring);background:var(--rb-win);color:var(--rb-acc-text);font-size:15px;font-weight:600}
@keyframes rb-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* 대화상자 · 시트 · 메뉴 */
.rb-modal{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--rb-backdrop)}
.rb-dialog{width:100%;max-width:440px;border-radius:18px;background:var(--rb-win);border:1px solid var(--rb-line3);box-shadow:var(--rb-shadow);padding:22px;display:flex;flex-direction:column;gap:14px;animation:rb-in .15s ease-out}
.rb-dialog .btns{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.rb-menu{position:absolute;z-index:60;min-width:200px;padding:6px;border-radius:14px;background:var(--rb-win);border:1px solid var(--rb-line3);box-shadow:var(--rb-shadow-sm);display:flex;flex-direction:column}
.rb-menu button{height:40px;display:flex;align-items:center;gap:10px;padding:0 12px;border:0;border-radius:10px;background:transparent;color:var(--rb-text);font-size:13px;cursor:pointer;text-align:left}
.rb-menu button:focus-visible{background:var(--rb-hover);outline:none}
@media (hover: hover){.rb-menu button:hover{background:var(--rb-hover)}}
.rb-menu button.danger{color:var(--rb-danger)}
.rb-menu hr{border:0;border-top:1px solid var(--rb-line2);margin:4px 0}
.rb-swatches{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.rb-swatch{width:32px;height:32px;border-radius:999px;border:0;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
.rb-swatch[aria-pressed=true]{box-shadow:0 0 0 2px var(--rb-win),0 0 0 4px var(--rb-text)}
.rb-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.rb-preset{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:10px;border-radius:12px;cursor:pointer;color:var(--rb-text);background:var(--rb-surf);border:1px solid var(--rb-line)}
.rb-preset[aria-pressed=true]{border-color:var(--rb-text)}
.rb-preset i{display:block;width:100%;height:28px;border-radius:8px}
.rb-color{display:flex;align-items:center;gap:10px;height:48px;padding:0 12px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);cursor:pointer}
.rb-color input{width:28px;height:28px;border:0;padding:0;background:transparent;cursor:pointer}
.rb-color span{flex:1;font-size:13px}.rb-color small{font-size:12px;color:var(--rb-sub)}

/* 전체 화면 패널(에디터·에셋 관리자) */
.rb-full{position:absolute;inset:0;z-index:25;display:flex;flex-direction:column;background:var(--rb-win);animation:rb-in .15s ease-out}
.rb-full-head{min-height:64px;flex-shrink:0;display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid var(--rb-line2);flex-wrap:wrap}
.rb-full-head .ttl{flex:1;min-width:120px;display:flex;flex-direction:column}
.rb-full-head .ttl small{font-size:11px;color:var(--rb-sub)}.rb-full-head .ttl b{font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-tabs{display:flex;gap:4px;padding:8px 16px 0;border-bottom:1px solid var(--rb-line2);overflow-x:auto;flex-shrink:0}
.rb-tabs button{height:40px;padding:0 14px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--rb-sub);font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap}
.rb-tabs button[aria-selected=true]{color:var(--rb-text);border-bottom-color:var(--rb-acc-text);font-weight:600}
.rb-tabs button small{margin-left:6px;font-size:12px;opacity:.75}
.rb-split{flex:1;display:flex;min-height:0}
.rb-split>*{min-height:0}
.rb-scroll,.rb-split>.pane,.rb-side-list{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.rb-split>.side{width:320px;flex-shrink:0;border-right:1px solid var(--rb-line2);display:flex;flex-direction:column;min-height:0}
.rb-split>.pane{flex:1;min-width:0;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:16px}
.rb-side-tools{display:flex;gap:6px;padding:12px;border-bottom:1px solid var(--rb-line2);flex-wrap:wrap}
.rb-side-list{flex:1;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:2px}
.rb-item{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:10px;border:0;background:transparent;color:var(--rb-text);text-align:left;cursor:pointer;width:100%;font-size:13px}
@media (hover: hover){.rb-item:hover{background:var(--rb-hover)}}
.rb-item[aria-selected=true]{background:var(--rb-sel-bg);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}
.rb-item .t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-item.off .t{color:var(--rb-mute);text-decoration:line-through}
.rb-item.child{padding-left:28px}
.rb-item-row{display:flex;align-items:center;gap:2px;border-radius:10px}
.rb-item-row>.grip{color:var(--rb-grip);cursor:grab;display:flex;padding:6px 2px;flex-shrink:0;touch-action:none}
.rb-item-row>.rb-item{flex:1;min-width:0}
.rb-item.divider .t{color:var(--rb-mute);font-size:12px;letter-spacing:.02em}
.rb-item.divider{padding-top:6px;padding-bottom:6px}
.rb-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.rb-form .wide{grid-column:1/-1}
.rb-textarea{width:100%;min-height:120px;padding:12px 14px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);color:var(--rb-text);font:13px/1.6 ui-monospace,'JetBrains Mono',Consolas,'D2Coding',monospace;resize:vertical;outline:none;tab-size:4}
.rb-textarea:focus{border-color:var(--rb-sel-ring);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-textarea.tall{min-height:max(300px,46vh)}
.rb-check{display:flex;align-items:center;gap:10px;min-height:44px;font-size:13px;cursor:pointer}
.rb-check input{width:18px;height:18px;accent-color:var(--rb-acc-a);margin:0}
select.rb-input{appearance:auto}
.rb-issues{display:flex;flex-direction:column;gap:6px}
.rb-issue{display:flex;gap:8px;align-items:flex-start;font-size:12px;padding:8px 10px;border-radius:10px;background:var(--rb-surf2);cursor:pointer;border:0;color:var(--rb-text);text-align:left;width:100%}
.rb-issue.err svg{color:var(--rb-danger)}.rb-issue.warn svg{color:var(--rb-warn)}
.rb-cbs{display:flex;flex-direction:column;gap:4px;max-height:60vh;overflow:auto}
.rb-cbs button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:8px 10px;border-radius:10px;border:0;background:var(--rb-surf);color:var(--rb-text);cursor:pointer;text-align:left}
.rb-cbs code{font:12px ui-monospace,Consolas,monospace;color:var(--rb-acc-text)}.rb-cbs span{font-size:12px;color:var(--rb-sub)}
/* 에셋 격자 */
.rb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px;align-content:start}
.rb-tile{position:relative;display:flex;flex-direction:column;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);overflow:hidden;cursor:pointer;text-align:left;padding:0;color:var(--rb-text)}
.rb-tile[aria-selected=true]{border-color:var(--rb-acc-text);box-shadow:0 0 0 2px var(--rb-sel-ring)}
.rb-tile .img{aspect-ratio:1/1;width:100%;background:var(--rb-surf2) center/contain no-repeat;display:flex;align-items:center;justify-content:center;color:var(--rb-mute)}
.rb-tile img{width:100%;height:100%;object-fit:contain;display:block}
.rb-tile .cap{padding:6px 8px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-tile .cap small{display:block;color:var(--rb-mute);font-size:11px}
.rb-tile .sel{position:absolute;top:6px;left:6px;width:22px;height:22px;border-radius:7px;background:var(--rb-win);border:1px solid var(--rb-line3);display:flex;align-items:center;justify-content:center;color:var(--rb-on-acc)}
.rb-tile[aria-selected=true] .sel{background:var(--rb-acc-grad);border:0}
.rb-folders{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.rb-lightbox{position:absolute;inset:0;z-index:55;background:rgba(5,6,12,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px}
.rb-lightbox img{max-width:100%;max-height:calc(100% - 80px);object-fit:contain;border-radius:8px}
.rb-lightbox .bar{display:flex;gap:8px;align-items:center;color:#e9eaf6;font-size:13px;flex-wrap:wrap;justify-content:center}
@media (max-width: 760px){
  .rb-split{flex-direction:column}
  .rb-split>.side{width:auto;max-height:38%;border-right:0;border-bottom:1px solid var(--rb-line2)}
  .rb-split>.pane{padding:14px}
  .rb-split>aside{width:auto !important;border-left:0 !important;border-top:1px solid var(--rb-line2);max-height:45%}
  .rb-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}
  .rb-am-info.none{display:none !important}
  .rb-am-thumb{max-height:140px !important}
  .rb-split.m-list>.side{max-height:none;flex:1;border-bottom:0}
  .rb-split.m-list>.pane{display:none}
  .rb-split.m-item>.side{display:none}
}
.rb-mobile-only{display:none}
@media (max-width: 760px){ .rb-mobile-only{display:block} }

/* 모바일: 아래 탭 바, 상세는 시트 */
.rb-tabbar{display:none}
.rb-nav a[hidden],.rb-tabbar a[hidden]{display:none!important}
.rb-mobile-search{display:none !important}
.rb-win.rb-nosearch .rb-head .rb-search{visibility:hidden}
.rb-sheet-back{display:none}
.rb-sheet-head{display:none}
@media (max-width: 760px){
  .rb-root{padding:0}
  .rb-win{max-width:none;max-height:none;border-radius:0;border:0}
  .rb-brand{width:auto}.rb-brand small{display:none}
  .rb-head{padding:0 12px;gap:8px;height:60px}
  .rb-head .rb-search{display:none}
  .rb-head .rb-btn .lbl{display:none}.rb-head .rb-btn{width:44px;padding:0}
  .rb-nav{display:none}
  .rb-mobile-search{display:flex !important;flex:0 0 auto;height:44px;margin:12px 16px 0;max-width:none}
  .rb-win.rb-nosearch .rb-mobile-search{display:none !important}
  .rb-tabbar{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);height:68px;flex-shrink:0;border-top:1px solid var(--rb-line2);background:var(--rb-win)}
  .rb-tabbar a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-decoration:none;color:var(--rb-sub);font-size:11px;cursor:pointer}
  .rb-tabbar a[aria-current=page]{color:var(--rb-acc-text);font-weight:600}
  .rb-chips{flex-wrap:nowrap;overflow-x:auto;padding:12px 16px 8px}
  .rb-chip{flex-shrink:0}
  .rb-detail{position:absolute;left:0;right:0;bottom:68px;width:auto;max-height:72%;border-left:0;border-radius:22px 22px 0 0;background:var(--rb-win);box-shadow:var(--rb-shadow);z-index:20;overflow:auto;transform:translateY(105%);visibility:hidden;pointer-events:none;transition:transform .2s ease-out,visibility 0s linear .2s}
  .rb-detail.open{transform:none;visibility:visible;pointer-events:auto;transition:transform .2s ease-out}
  .rb-detail::before{content:'';display:block;width:40px;height:5px;border-radius:999px;background:var(--rb-line3);margin:-8px auto 4px}
  .rb-sheet-head{display:flex;justify-content:flex-end;margin:-8px -8px -12px}
  .rb-sheet-back.open{display:block;position:absolute;inset:0;bottom:68px;background:var(--rb-backdrop);z-index:19}
  .rb-presets{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rb-toasts{left:12px;right:12px;bottom:80px}
}
button,a,[role=option],.rb-tile{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
@media (max-width: 760px){ .rb-input,.rb-textarea,.rb-search input,select{font-size:16px !important} }
@media (prefers-reduced-motion: reduce){*{transition:none !important;animation:none !important}}
`;

  // src/ui/color.js
  function parseHex(hex) {
    let s = String(hex ?? "").trim().replace(/^#/, "");
    if (s.length === 3) s = s.split("").map((c) => c + c).join("");
    if (!/^[0-9a-f]{6}$/i.test(s)) return null;
    const n = parseInt(s, 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  var isHex = (v) => parseHex(v) !== null;
  function toHex([r, g, b]) {
    return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  }
  function luminance(hex) {
    const rgb = parseHex(hex);
    if (!rgb) return 0;
    const [r, g, b] = rgb.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function rgbToHsl([r, g, b]) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h2 = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h2 = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h2 = (b - r) / d + 2;
      else h2 = (r - g) / d + 4;
      h2 /= 6;
    }
    return [h2, s, l];
  }
  function hslToRgb([h2, s, l]) {
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [f(h2 + 1 / 3) * 255, f(h2) * 255, f(h2 - 1 / 3) * 255];
  }
  function withLightness(hex, l) {
    const rgb = parseHex(hex);
    if (!rgb) return hex;
    const [h2, s] = rgbToHsl(rgb);
    return toHex(hslToRgb([h2, s, Math.max(0, Math.min(1, l))]));
  }
  function lightnessOf(hex) {
    const rgb = parseHex(hex);
    return rgb ? rgbToHsl(rgb)[2] : 0;
  }
  function ensureContrast(hex, bg, ratio = 4.5) {
    if (!isHex(hex)) return hex;
    if (contrast(hex, bg) >= ratio) return toHex(parseHex(hex));
    const up = luminance(bg) < 0.25;
    let l = lightnessOf(hex);
    for (let i = 0; i < 100; i++) {
      l += up ? 0.01 : -0.01;
      if (l <= 0 || l >= 1) break;
      const c = withLightness(hex, l);
      if (contrast(c, bg) >= ratio) return c;
    }
    return up ? "#ffffff" : "#000000";
  }
  function onAccent(a, b, dark = "#14152a") {
    const w = Math.min(contrast("#ffffff", a), contrast("#ffffff", b));
    const d = Math.min(contrast(dark, a), contrast(dark, b));
    return { fg: w >= d ? "#ffffff" : dark, ratio: Math.max(w, d) };
  }
  function alpha(hex, a) {
    const rgb = parseHex(hex);
    if (!rgb) return hex;
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
  }

  // src/ui/theme.js
  var PRESETS = [
    { id: "dusk", name: "Soft Dusk", a: "#4f63e0", b: "#7c4fe0" },
    { id: "ocean", name: "바다", a: "#1660b5", b: "#127a86" },
    { id: "forest", name: "숲", a: "#26775a", b: "#3d7f2a" },
    { id: "sunset", name: "노을", a: "#c2472b", b: "#b0317f" },
    { id: "rose", name: "장미", a: "#c2386e", b: "#8f45c9" },
    { id: "mono", name: "모노", a: "#4a4f6b", b: "#6b6f8c" }
  ];
  var DEFAULT_THEME = { v: 1, preset: "dusk", a: "#4f63e0", b: "#7c4fe0", mode: "auto" };
  var NAME_SWATCHES = ["#f2b8d6", "#f58ea3", "#f5c26b", "#e8e27a", "#9be3c8", "#8fd3ff", "#8ea2ff", "#c4b1ff", "#d7a6ff", "#c9cbe4"];
  var FOLDER_SWATCHES = ["#8ea2ff", "#c4b1ff", "#f2b8d6", "#f5c26b", "#9be3c8", "#8fd3ff", "#f58ea3", "#a4a7c9"];
  var BASE = {
    dark: {
      scheme: "dark",
      backdrop: "rgba(8, 9, 16, 0.55)",
      win: "#151726",
      surf: "#1c1f33",
      surf2: "#23263d",
      hover: "#20233a",
      line: "#2a2d47",
      line2: "#22253b",
      line3: "#343857",
      text: "#e9eaf6",
      sub: "#a4a7c9",
      mute: "#8487ab",
      grip: "#5a5e85",
      trackOff: "#2e3150",
      knobOff: "#8487ab",
      knobOn: "#ffffff",
      shadow: "0 24px 64px rgba(0, 0, 0, 0.45)",
      shadowSm: "0 12px 32px rgba(0, 0, 0, 0.4)",
      ok: "#5fd3b5",
      warn: "#f5c26b",
      danger: "#f27a93",
      teal: "#6fdcc0",
      rose: "#f58ea3"
    },
    light: {
      scheme: "light",
      backdrop: "rgba(35, 36, 58, 0.28)",
      win: "#f6f6fd",
      surf: "#ffffff",
      surf2: "#eef0fb",
      hover: "#eceefa",
      line: "#e1e3f3",
      line2: "#e8e9f6",
      line3: "#d6d9ee",
      text: "#23243a",
      sub: "#5d6080",
      mute: "#6b6e8f",
      grip: "#b3b6d1",
      trackOff: "#d6d9ee",
      knobOff: "#ffffff",
      knobOn: "#ffffff",
      shadow: "0 24px 64px rgba(35, 36, 58, 0.18)",
      shadowSm: "0 12px 32px rgba(35, 36, 58, 0.16)",
      ok: "#13795b",
      warn: "#8a5a00",
      danger: "#c0284f",
      teal: "#0f7a68",
      rose: "#b4234a"
    }
  };
  function normalizeTheme(t) {
    const out = { ...DEFAULT_THEME, ...t && typeof t === "object" ? t : {} };
    if (!isHex(out.a) || !isHex(out.b)) {
      out.a = DEFAULT_THEME.a;
      out.b = DEFAULT_THEME.b;
      out.preset = DEFAULT_THEME.preset;
    }
    if (!["auto", "dark", "light"].includes(out.mode)) out.mode = "auto";
    return out;
  }
  var resolveMode = (theme, risuScheme) => theme.mode === "auto" ? risuScheme === "light" ? "light" : "dark" : theme.mode;
  function textTone(hex, bg, mode) {
    const seed = mode === "dark" ? withLightness(hex, Math.max(lightnessOf(hex), 0.74)) : withLightness(hex, Math.min(lightnessOf(hex), 0.45));
    return ensureContrast(seed, bg, 4.5);
  }
  function themeVars(themeIn, mode) {
    const theme = normalizeTheme(themeIn);
    const B = BASE[mode] ?? BASE.dark;
    const { a, b } = theme;
    const on = onAccent(a, b);
    const accText = textTone(a, B.surf, mode), acc2Text = textTone(b, B.surf, mode);
    const decoA = mode === "dark" ? withLightness(a, Math.max(lightnessOf(a), 0.68)) : a;
    const decoB = mode === "dark" ? withLightness(b, Math.max(lightnessOf(b), 0.68)) : b;
    const v = {
      "--rb-backdrop": B.backdrop,
      "--rb-win": B.win,
      "--rb-surf": B.surf,
      "--rb-surf2": B.surf2,
      "--rb-hover": B.hover,
      "--rb-line": B.line,
      "--rb-line2": B.line2,
      "--rb-line3": B.line3,
      "--rb-text": B.text,
      "--rb-sub": B.sub,
      "--rb-mute": B.mute,
      "--rb-grip": B.grip,
      "--rb-track-off": B.trackOff,
      "--rb-knob-off": B.knobOff,
      "--rb-knob-on": B.knobOn,
      "--rb-shadow": B.shadow,
      "--rb-shadow-sm": B.shadowSm,
      "--rb-acc-a": a,
      "--rb-acc-b": b,
      "--rb-acc-grad": `linear-gradient(135deg, ${a}, ${b})`,
      "--rb-deco-grad": `linear-gradient(90deg, ${decoA}, ${decoB})`,
      "--rb-on-acc": on.fg,
      "--rb-acc-text": accText,
      "--rb-acc2-text": acc2Text,
      "--rb-acc-soft": alpha(a, mode === "dark" ? 0.16 : 0.12),
      "--rb-acc2-soft": alpha(b, mode === "dark" ? 0.16 : 0.12),
      "--rb-sel-bg": alpha(a, mode === "dark" ? 0.12 : 0.08),
      "--rb-sel-ring": alpha(accText, 0.45),
      "--rb-focus": alpha(accText, 0.55),
      "--rb-ok": B.ok,
      "--rb-warn": B.warn,
      "--rb-danger": B.danger,
      "--rb-teal": B.teal,
      "--rb-rose": B.rose,
      "--rb-ok-soft": alpha(B.ok, 0.13),
      "--rb-warn-soft": alpha(B.warn, 0.13),
      "--rb-danger-soft": alpha(B.danger, 0.13),
      "--rb-teal-soft": alpha(B.teal, 0.12),
      "--rb-rose-soft": alpha(B.rose, 0.13),
      "--rb-toast": mode === "dark" ? "#23263d" : "#ffffff"
    };
    return { vars: v, scheme: B.scheme, onAccentRatio: on.ratio, mode };
  }
  function readableName(hex, mode) {
    if (!isHex(hex)) return null;
    const bg = (BASE[mode] ?? BASE.dark).surf;
    return ensureContrast(hex, bg, 4.5);
  }
  function folderTint(hex, mode) {
    if (!isHex(hex)) return null;
    const c = readableName(hex, mode);
    return { stroke: c, fill: alpha(c, 0.2) };
  }

  // src/ui/prefs.js
  var KEYS = { ui: "rbm:ui:v1", meta: "rbm:moduleMeta:v1" };
  async function readJson(api, key, fallback) {
    try {
      const raw = await api.pluginStorage.getItem(key);
      if (raw === null || raw === void 0 || raw === "") return fallback;
      const v = typeof raw === "string" ? JSON.parse(raw) : raw;
      return v && typeof v === "object" ? v : fallback;
    } catch {
      return fallback;
    }
  }
  async function writeJson(api, key, value) {
    await api.pluginStorage.setItem(key, JSON.stringify(value));
  }
  var defaultsMeta = () => ({ v: 1, folders: [], mapping: {}, nameColors: {}, links: {}, charAssetFolders: {}, charFoldersCollapsed: {}, moduleAssetFolders: {}, folderPickOthers: "hide" });
  function createPrefs(api) {
    let ui = null, meta = null;
    return {
      async load() {
        ui = await readJson(api, KEYS.ui, {});
        ui.theme = normalizeTheme(ui.theme);
        meta = await readJson(api, KEYS.meta, defaultsMeta());
        for (const [k, d] of Object.entries(defaultsMeta())) if (!(k in meta) || typeof meta[k] !== typeof d || Array.isArray(meta[k]) !== Array.isArray(d)) meta[k] = d;
        return { ui, meta };
      },
      get ui() {
        return ui;
      },
      get meta() {
        return meta;
      },
      async saveUi(patch) {
        ui = { ...ui, ...patch };
        await writeJson(api, KEYS.ui, ui);
        return ui;
      },
      async saveMeta(next) {
        meta = next;
        await writeJson(api, KEYS.meta, meta);
        return meta;
      },
      async reloadMeta() {
        meta = await readJson(api, KEYS.meta, defaultsMeta());
        for (const [k, d] of Object.entries(defaultsMeta())) if (!(k in meta)) meta[k] = d;
        return meta;
      }
    };
  }

  // src/ui/multiselect.js
  var LONG_MS = 450;
  var SLOP = 8;
  function createMulti({ onChange }) {
    const sel = /* @__PURE__ */ new Set();
    let anchor = null, mode = false, suppressAt = 0, list = null, painting = null;
    const changed = () => {
      decorate();
      onChange?.();
    };
    const order = () => list ? [...list.querySelectorAll("[data-pick]")].map((r) => r.dataset.pick) : [];
    function decorate() {
      if (!list) return;
      list.classList.toggle("picking", api.active);
      for (const r of list.querySelectorAll("[data-pick]")) {
        const on = sel.has(r.dataset.pick);
        r.classList.toggle("picked", on);
        r.querySelector(":scope > .rb-mcb")?.setAttribute("aria-checked", on ? "true" : "false");
      }
    }
    function at(x, y) {
      const doc = list.ownerDocument;
      const r = doc.elementFromPoint(x, y)?.closest?.("[data-pick]");
      if (r && list.contains(r) && sel.has(r.dataset.pick) !== painting.on) api.toggle(r.dataset.pick, painting.on);
      const lr = list.getBoundingClientRect();
      if (y < lr.top + 36) list.scrollTop -= 14;
      else if (y > lr.bottom - 36) list.scrollTop += 14;
    }
    const api = {
      sel,
      get active() {
        return mode || sel.size > 0;
      },
      setMode(on) {
        mode = on;
        if (!on) {
          sel.clear();
          anchor = null;
        }
        changed();
      },
      has: (id) => sel.has(id),
      clear() {
        if (!sel.size && !mode) return;
        sel.clear();
        anchor = null;
        mode = false;
        changed();
      },
      set(ids) {
        sel.clear();
        for (const id of ids) sel.add(id);
        mode = true;
        changed();
      },
      // 지금 화면 순서대로 고른 id(화면에 없는 것은 뒤에)
      ordered() {
        const out = order().filter((id) => sel.has(id));
        for (const id of sel) if (!out.includes(id)) out.push(id);
        return out;
      },
      // 끌 때 함께 옮길 것: 고른 줄을 잡았으면 고른 전부, 아니면 그 줄 하나
      dragIds: (id) => sel.has(id) && sel.size > 1 ? api.ordered() : [id],
      toggle(id, on = !sel.has(id)) {
        if (on) sel.add(id);
        else sel.delete(id);
        anchor = id;
        changed();
      },
      range(id, current) {
        const o = order();
        let a = o.indexOf(anchor ?? current ?? id), b = o.indexOf(id);
        if (a < 0) a = b;
        if (a > b) [a, b] = [b, a];
        for (const x of o.slice(a, b + 1)) sel.add(x);
        changed();
      },
      // 줄 클릭을 여기서 처리했으면 true. current: 지금 열려 있는(하나 고른) 항목
      click(ev, id, current) {
        if (suppressAt && Date.now() - suppressAt < 700) {
          suppressAt = 0;
          return true;
        }
        if (ev.shiftKey) {
          if (!sel.size && current) sel.add(current);
          api.range(id, current);
          return true;
        }
        if (ev.ctrlKey || ev.metaKey) {
          if (!sel.size && current && current !== id) sel.add(current);
          api.toggle(id);
          return true;
        }
        if (api.active) {
          api.toggle(id);
          return true;
        }
        anchor = id;
        return false;
      },
      // 목록을 새로 그릴 때마다 한 번: 줄에는 data-pick="<id>"와 체크 칸(.rb-mcb)이 있어야 한다
      attach(el) {
        list = el;
        let timer = 0, x0 = 0, y0 = 0;
        el.addEventListener("touchstart", (ev) => {
          const t = ev.touches[0];
          if (ev.touches.length !== 1 || ev.target.closest("button,input,a,.grip,.rb-mcb")) return;
          const r = ev.target.closest("[data-pick]");
          if (!r) return;
          x0 = t.clientX;
          y0 = t.clientY;
          timer = setTimeout(() => {
            timer = 0;
            suppressAt = Date.now();
            navigator.vibrate?.(15);
            const on = !sel.has(r.dataset.pick);
            painting = { on };
            api.toggle(r.dataset.pick, on);
          }, LONG_MS);
        }, { passive: true });
        el.addEventListener("touchmove", (ev) => {
          const t = ev.touches[0];
          if (timer && Math.hypot(t.clientX - x0, t.clientY - y0) > SLOP) {
            clearTimeout(timer);
            timer = 0;
          }
          if (painting) {
            ev.preventDefault();
            at(t.clientX, t.clientY);
          }
        }, { passive: false });
        const end = () => {
          if (timer) clearTimeout(timer);
          timer = 0;
          painting = null;
        };
        el.addEventListener("touchend", end);
        el.addEventListener("touchcancel", end);
        el.addEventListener("contextmenu", (ev) => {
          if (suppressAt && Date.now() - suppressAt < 1500) ev.preventDefault();
        });
        el.addEventListener("pointerdown", (ev) => {
          const box = ev.target.closest(".rb-mcb");
          if (!box || ev.button !== 0) return;
          const r = box.closest("[data-pick]");
          ev.preventDefault();
          ev.stopPropagation();
          const on = !sel.has(r.dataset.pick);
          painting = { on, pointer: ev.pointerId };
          api.toggle(r.dataset.pick, on);
          try {
            box.setPointerCapture(ev.pointerId);
          } catch {
          }
          const mv = (e) => {
            if (e.pointerId === ev.pointerId && painting) at(e.clientX, e.clientY);
          };
          const up = (e) => {
            if (e.pointerId !== ev.pointerId) return;
            painting = null;
            box.removeEventListener("pointermove", mv);
            box.removeEventListener("pointerup", up);
            box.removeEventListener("pointercancel", up);
          };
          box.addEventListener("pointermove", mv);
          box.addEventListener("pointerup", up);
          box.addEventListener("pointercancel", up);
        });
        el.addEventListener("click", (ev) => {
          if (ev.target.closest(".rb-mcb")) {
            ev.stopPropagation();
            ev.preventDefault();
          }
        }, true);
        el.addEventListener("keydown", (ev) => {
          if (ev.key === "Escape" && api.active) {
            ev.stopPropagation();
            api.clear();
          }
        });
        decorate();
      }
    };
    return api;
  }

  // src/ui/sortable.js
  var EDGE = 48;
  function gripDrag({ grip, row: row2, root, scroller, onDrop, mouse = true, count, skip }) {
    grip.style.touchAction = "none";
    grip.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      if (ev.pointerType === "mouse" && !mouse) return;
      ev.preventDefault();
      ev.stopPropagation();
      const doc = grip.ownerDocument, win = doc.defaultView;
      const host = root.closest(".rb-win") ?? doc.body;
      const r = row2.getBoundingClientRect(), hr = host.getBoundingClientRect();
      const dy = ev.clientY - r.top;
      const ghost = row2.cloneNode(true);
      Object.assign(ghost.style, {
        position: "absolute",
        left: `${r.left - hr.left}px`,
        top: `${r.top - hr.top}px`,
        width: `${r.width}px`,
        opacity: "0.92",
        pointerEvents: "none",
        zIndex: "70",
        boxShadow: "0 12px 30px rgba(0,0,0,.35)",
        background: "var(--rb-surf2)",
        borderRadius: "12px",
        margin: "0"
      });
      ghost.setAttribute("aria-hidden", "true");
      const n = count?.() ?? 1;
      if (n > 1) ghost.appendChild(dragBadge(doc, n));
      host.appendChild(ghost);
      const dim = n > 1 ? [...root.querySelectorAll(".picked")] : [row2];
      if (!dim.includes(row2)) dim.push(row2);
      for (const d of dim) d.style.opacity = "0.35";
      try {
        grip.setPointerCapture(ev.pointerId);
      } catch {
      }
      let target = null, lastY = ev.clientY, raf = 0;
      const clear2 = () => {
        if (target?.el) {
          target.el.style.boxShadow = target.prev ?? "";
        }
        target = null;
      };
      const pick = (x, y) => {
        const under = doc.elementFromPoint(x, y);
        const el = under?.closest?.("[data-drop-row],[data-drop-folder]");
        if (!el || !root.contains(el) || el === row2 || skip?.(el)) {
          clear2();
          return;
        }
        const rr = el.getBoundingClientRect();
        const isRow = el.hasAttribute("data-drop-row");
        const after = isRow && y > rr.top + rr.height / 2;
        if (target?.el === el && target.after === after) return;
        clear2();
        target = { el, prev: el.style.boxShadow, isRow, after, id: el.getAttribute("data-drop-row"), folder: el.getAttribute("data-drop-folder") };
        el.style.boxShadow = isRow ? after ? "inset 0 -3px 0 var(--rb-acc-text)" : "inset 0 3px 0 var(--rb-acc-text)" : "inset 0 0 0 2px var(--rb-sel-ring)";
      };
      const tick = () => {
        raf = 0;
        if (!scroller) return;
        const sr = scroller.getBoundingClientRect();
        let v = 0;
        if (lastY < sr.top + EDGE) v = -Math.ceil((sr.top + EDGE - lastY) / 4);
        else if (lastY > sr.bottom - EDGE) v = Math.ceil((lastY - (sr.bottom - EDGE)) / 4);
        if (v) {
          scroller.scrollTop += v;
          raf = win.requestAnimationFrame(tick);
        }
      };
      const move2 = (e) => {
        if (e.pointerId !== ev.pointerId) return;
        e.preventDefault();
        lastY = e.clientY;
        ghost.style.top = `${e.clientY - dy - hr.top}px`;
        pick(e.clientX, e.clientY);
        if (!raf) raf = win.requestAnimationFrame(tick);
      };
      const end = async (e) => {
        if (e.pointerId !== ev.pointerId) return;
        grip.removeEventListener("pointermove", move2);
        grip.removeEventListener("pointerup", end);
        grip.removeEventListener("pointercancel", cancel);
        if (raf) win.cancelAnimationFrame(raf);
        ghost.remove();
        for (const d of dim) d.style.opacity = "";
        const t = target;
        clear2();
        if (!t || e.type === "pointercancel") return;
        if (t.isRow) await onDrop({ beforeId: t.id, after: t.after, folderId: void 0 });
        else await onDrop({ beforeId: null, after: false, folderId: t.folder || null });
      };
      const cancel = (e) => end(e);
      grip.addEventListener("pointermove", move2);
      grip.addEventListener("pointerup", end);
      grip.addEventListener("pointercancel", cancel);
    });
  }
  function dragBadge(doc, n) {
    const b = doc.createElement("span");
    b.textContent = `${n}개`;
    Object.assign(b.style, { position: "absolute", top: "-8px", right: "-6px", padding: "2px 9px", borderRadius: "999px", background: "var(--rb-acc-grad, #5b5bd6)", color: "#fff", fontSize: "12px", fontWeight: "700", boxShadow: "0 4px 12px rgba(0,0,0,.3)" });
    return b;
  }
  function placeIds(ids, moving, beforeId, after) {
    const set = new Set(moving);
    const out = ids.filter((x) => !set.has(x));
    const at = out.indexOf(beforeId);
    out.splice(at < 0 ? out.length : at + (after ? 1 : 0), 0, ...moving);
    return out;
  }

  // src/data/presets.js
  var PRESET_KEY = "rbm:presets:v1";
  var DEFAULT_PRESET = "기본";
  var isMobileDevice = () => /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(globalThis.navigator?.userAgent ?? "");
  async function loadPresets(api) {
    try {
      const raw = await api.pluginStorage.getItem(PRESET_KEY);
      const v = raw ? typeof raw === "string" ? JSON.parse(raw) : raw : null;
      if (v && typeof v === "object" && v.presets && typeof v.presets === "object") return v;
    } catch {
    }
    return { active: DEFAULT_PRESET, presets: {} };
  }
  async function savePresets(api, data) {
    await api.pluginStorage.setItem(PRESET_KEY, JSON.stringify(data));
    return data;
  }
  function snapshotOf(entries, enabledModules) {
    const moduleStates = {};
    entries.forEach((e, i) => {
      moduleStates[e.module.id] = { enabled: !!e.enabled, displayOrder: i * 100 };
    });
    return { moduleStates, globalEnabledIds: [...enabledModules] };
  }
  async function recordActive(api, entries, enabledModules) {
    const data = await loadPresets(api);
    const name = data.active || DEFAULT_PRESET;
    data.active = name;
    data.presets[name] = snapshotOf(entries, enabledModules);
    await savePresets(api, data);
    return data;
  }
  async function applyPreset(api, name) {
    const data = await loadPresets(api);
    const p = data.presets[name];
    if (!p) throw new Error(`프리셋 "${name}"이(가) 없어요.`);
    let skipped = 0;
    await commit(api, (d) => {
      const st = p.moduleStates ?? {};
      for (const e of d.entries) {
        const s = st[e.module.id];
        if (!s) continue;
        if (!s.enabled && hasAssets(e.module)) {
          skipped++;
          e.enabled = true;
          continue;
        }
        e.enabled = !!s.enabled;
      }
      const ord = (id) => st[id]?.displayOrder ?? Infinity;
      d.entries = d.entries.map((e, i) => ({ e, i })).sort((a, b) => ord(a.e.module.id) - ord(b.e.module.id) || a.i - b.i).map((x) => x.e);
      const on = new Set(d.entries.filter((e) => e.enabled).map((e) => e.module.id));
      d.enabledModules = sortIds((p.globalEnabledIds ?? []).filter((id) => on.has(id)), d.entries.map((e) => e.module.id));
    }, { chars: true });
    data.active = name;
    await savePresets(api, data);
    return { skipped };
  }
  function pairSwitchTarget(data, deviceType) {
    if (!data) return null;
    const { defaultMobile: m, defaultDesktop: dsk, active, lastDeviceType, presets } = data;
    if (!lastDeviceType || lastDeviceType === deviceType) return null;
    if (!m || !dsk) return null;
    if (active !== m && active !== dsk) return null;
    const target = deviceType === "mobile" ? m : dsk;
    if (target === active || !presets?.[target]) return null;
    return target;
  }
  function uniquePresetName(data, base) {
    let name = base.trim() || "새 프리셋", i = 2;
    while (data.presets[name]) name = `${base.trim() || "새 프리셋"} (${i++})`;
    return name;
  }

  // src/data/persona.js
  var PERSONA_KEY = "rbm:persona:v1";
  var isBlocked = (e) => !!e?.hostBlocked || /still loading|not loaded/i.test(String(e?.message ?? e));
  var INJECTED_KEY = "rbm:personaInjected:v1";
  async function loadPersonaMap(api) {
    try {
      const raw = await api.pluginStorage.getItem(PERSONA_KEY);
      const v = raw ? typeof raw === "string" ? JSON.parse(raw) : raw : null;
      if (v && typeof v === "object") return { map: v.map ?? {}, injectedIndex: v.injectedIndex ?? {}, chatInjected: v.chatInjected ?? {} };
    } catch {
    }
    return { map: {}, injectedIndex: {} };
  }
  async function savePersonaMap(api, data) {
    await api.pluginStorage.setItem(PERSONA_KEY, JSON.stringify(data));
    return data;
  }
  async function setPersonaLink(api, personaId, moduleId, on, orderIds) {
    const data = await loadPersonaMap(api);
    const cur = data.map[personaId] ?? [];
    let next = on ? cur.includes(moduleId) ? cur : [...cur, moduleId] : cur.filter((x) => x !== moduleId);
    if (orderIds) {
      const pos = new Map(orderIds.map((x, i) => [x, i]));
      next = [...next].sort((a, b) => (pos.get(a) ?? 1e9) - (pos.get(b) ?? 1e9));
    }
    if (next.length) data.map[personaId] = next;
    else delete data.map[personaId];
    await savePersonaMap(api, data);
    return data;
  }
  var hasPersonaLinks = (data) => Object.keys(data?.map ?? {}).length > 0;
  var last = "";
  async function syncPersonaModules(api, { force = false } = {}) {
    const data = await loadPersonaMap(api);
    let inj = await api.pluginStorage.getItem(INJECTED_KEY);
    if (typeof inj === "string") {
      try {
        inj = JSON.parse(inj);
      } catch {
        inj = null;
      }
    }
    const injected = { ...inj && typeof inj === "object" ? inj : {} };
    if (!hasPersonaLinks(data) && !Object.keys(injected).length && !Object.keys(data.chatInjected ?? {}).length) return { changed: false };
    const db = await api.getDatabase(["personas", "selectedPersona"]);
    if (!db) return { changed: false };
    const persona = db.personas?.[db.selectedPersona ?? 0];
    const want = persona?.id ? data.map[persona.id] ?? [] : [];
    const ci = await api.getCurrentCharacterIndex();
    const ch = ci >= 0 ? await api.getCharacterFromIndex(ci) : null;
    if (!ch?.chaId) return { changed: false };
    const key = JSON.stringify([persona?.id, ch.chaId, [...want].sort(), Object.keys(data.chatInjected ?? {}).length ? await api.getCurrentChatIndex() : 0]);
    if (!force && key === last) return { changed: false };
    let changed = false;
    data.chatInjected ??= {};
    const dropFromChat = async (chaId) => {
      const rec = data.chatInjected[chaId];
      if (!rec) return;
      try {
        const chat = await api.getChatFromIndex(rec.idx, rec.chatIdx);
        if (chat && (rec.chatId === void 0 || chat.id === rec.chatId) && Array.isArray(chat.modules)) {
          const n = chat.modules.filter((x) => !rec.ids.includes(x));
          if (n.length !== chat.modules.length) {
            chat.modules = n;
            await api.setChatToIndex(rec.idx, rec.chatIdx, chat);
          }
        }
      } catch (e) {
        console.warn("[Dusk Atelier] 채팅에서 페르소나 모듈 빼기 실패", e);
      }
      delete data.chatInjected[chaId];
      changed = true;
    };
    for (const [chaId, ids] of Object.entries(injected)) {
      if (chaId === ch.chaId) continue;
      const idx = data.injectedIndex[chaId];
      const other = typeof idx === "number" ? await api.getCharacterFromIndex(idx) : null;
      if (other?.chaId === chaId && Array.isArray(other.modules)) {
        const before = other.modules.length;
        other.modules = other.modules.filter((x) => !ids.includes(x));
        if (other.modules.length !== before) {
          try {
            await api.setCharacterToIndex(idx, other);
          } catch (e) {
            console.warn("[Dusk Atelier] 페르소나 모듈 빼기 실패", e);
          }
        }
      }
      delete injected[chaId];
      delete data.injectedIndex[chaId];
      changed = true;
    }
    for (const chaId of Object.keys(data.chatInjected)) if (chaId !== ch.chaId) await dropFromChat(chaId);
    const prev = injected[ch.chaId] ?? [];
    const mods = Array.isArray(ch.modules) ? [...ch.modules] : [];
    const drop = prev.filter((x) => !want.includes(x));
    let next = mods.filter((x) => !drop.includes(x));
    let viaChat = false;
    for (const id of want) if (!next.includes(id)) next.push(id);
    if (JSON.stringify(next) !== JSON.stringify(mods)) {
      try {
        ch.modules = next;
        await api.setCharacterToIndex(ci, ch);
        changed = true;
      } catch (e) {
        if (!isBlocked(e)) throw e;
        viaChat = true;
      }
    }
    if (viaChat || data.chatInjected[ch.chaId]) {
      const chatIdx = await api.getCurrentChatIndex();
      const rec = data.chatInjected[ch.chaId];
      if (rec && (rec.chatIdx !== chatIdx || !want.length)) await dropFromChat(ch.chaId);
      if (viaChat && want.length && chatIdx >= 0) {
        const chat = await api.getChatFromIndex(ci, chatIdx);
        if (chat) {
          const cm = Array.isArray(chat.modules) ? [...chat.modules] : [];
          const old = data.chatInjected[ch.chaId]?.ids ?? [];
          let n = cm.filter((x) => !old.includes(x) || want.includes(x));
          for (const id of want) if (!n.includes(id) && !mods.includes(id)) n.push(id);
          if (JSON.stringify(n) !== JSON.stringify(cm)) {
            chat.modules = n;
            await api.setChatToIndex(ci, chatIdx, chat);
            changed = true;
          }
          data.chatInjected[ch.chaId] = { idx: ci, chatIdx, chatId: chat.id, ids: want.filter((id) => !mods.includes(id)) };
        }
      }
    }
    if (want.length && !viaChat) {
      injected[ch.chaId] = [...want];
      data.injectedIndex[ch.chaId] = ci;
    } else {
      delete injected[ch.chaId];
      delete data.injectedIndex[ch.chaId];
    }
    await api.setDatabaseLite({ [INJECTED_KEY]: injected });
    await savePersonaMap(api, data);
    last = key;
    return { changed, persona: persona?.name, count: want.length };
  }
  var resetPersonaSyncCache = () => {
    last = "";
  };

  // src/data/service.js
  function createService(api, prefs) {
    let queue = Promise.resolve();
    const serial2 = (fn) => {
      const p = queue.then(fn, fn);
      queue = p.catch(() => {
      });
      return p;
    };
    let cache = null, presetQ = Promise.resolve(), pendingOrder = null, orderQueued = null;
    onCommitted((st) => {
      cache = { t: Date.now(), state: { entries: st.entries.map((e) => ({ module: e.module, enabled: e.enabled })), globalOn: new Set(st.enabledModules), charUse: cache?.state.charUse ?? /* @__PURE__ */ new Map(), characters: [] } };
      presetQ = presetQ.then(() => recordActive(api, st.entries, st.enabledModules)).catch(() => {
      });
    });
    const svc = {
      serial: serial2,
      async load(opts) {
        if (!opts?.fresh && cache && Date.now() - cache.t < 3e3) return cache.state;
        cache = null;
        return loadModuleState(api, opts);
      },
      invalidate() {
        cache = null;
      },
      flush: () => presetQ,
      run(name, ...args) {
        return serial2(async () => {
          const r = await ops[name](api, ...args);
          if (name === "remove") await svc.forgetModule(args[0]);
          return r;
        });
      },
      async forgetModule(id) {
        const m = structuredClone(prefs.meta);
        delete m.mapping[id];
        delete m.nameColors[id];
        if (m.moduleAssetFolders) delete m.moduleAssetFolders[id];
        for (const [k, v] of Object.entries(m.links ?? {})) if (v === id) delete m.links[k];
        await prefs.saveMeta(m);
        const per = await loadPersonaMap(api);
        for (const k of Object.keys(per.map)) {
          per.map[k] = per.map[k].filter((x) => x !== id);
          if (!per.map[k].length) delete per.map[k];
        }
        await savePersonaMap(api, per);
      },
      newModule(name) {
        return { id: newId(), name, description: "", lorebook: [], regex: [], trigger: [], assets: [] };
      },
      // ---- 폴더·이름 색 (모듈 데이터는 건드리지 않음) ----
      // fn이 동기면 prefs.meta가 바로 바뀐다(화면을 먼저 그리고 저장은 뒤에서 끝남)
      meta(fn) {
        const m = structuredClone(prefs.meta);
        const r = fn(m);
        if (r && typeof r.then === "function") return r.then(async (v) => {
          await prefs.saveMeta(m);
          return v;
        });
        return prefs.saveMeta(m).then(() => r);
      },
      // 순서만 바꿀 때: 연달아 끌어도 저장은 한 줄로 모아서(마지막 순서만) 한 번씩
      queueOrder(getIds) {
        pendingOrder = getIds;
        if (orderQueued) return orderQueued;
        orderQueued = serial2(async () => {
          const ids = pendingOrder();
          orderQueued = null;
          await ops.reorder(api, ids);
        });
        return orderQueued;
      },
      createFolder: (name, color) => svc.meta((m) => {
        const f = { id: "f_" + newId().slice(0, 8), name, color: color || "", collapsed: false };
        m.folders.push(f);
        return f;
      }),
      renameFolder: (id, name) => svc.meta((m) => {
        const f = m.folders.find((x) => x.id === id);
        if (f) f.name = name;
      }),
      colorFolder: (id, color) => svc.meta((m) => {
        const f = m.folders.find((x) => x.id === id);
        if (f) f.color = color;
      }),
      toggleFolder: (id) => svc.meta((m) => {
        const f = m.folders.find((x) => x.id === id);
        if (f) f.collapsed = !f.collapsed;
      }),
      moveFolder: (id, dir) => svc.meta((m) => {
        const i = m.folders.findIndex((x) => x.id === id), j = i + dir;
        if (i < 0 || j < 0 || j >= m.folders.length) return;
        [m.folders[i], m.folders[j]] = [m.folders[j], m.folders[i]];
      }),
      deleteFolder: (id) => svc.meta((m) => {
        m.folders = m.folders.filter((x) => x.id !== id);
        for (const [k, v] of Object.entries(m.mapping)) if (v === id) delete m.mapping[k];
      }),
      setFolder: (moduleIds, folderId) => svc.meta((m) => {
        for (const id of [].concat(moduleIds)) {
          if (folderId) m.mapping[id] = folderId;
          else delete m.mapping[id];
        }
      }),
      setNameColor: (id, color) => svc.meta((m) => {
        if (color) m.nameColors[id] = color;
        else delete m.nameColors[id];
      })
    };
    return svc;
  }
  function groupByFolder(entries, meta) {
    const folders = (meta?.folders ?? []).map((f) => ({ folder: f, items: [] }));
    const byId = new Map(folders.map((g) => [g.folder.id, g]));
    const loose = [];
    for (const e of entries) {
      const g = byId.get(meta?.mapping?.[e.module.id]);
      (g ? g.items : loose).push(e);
    }
    return { folders, loose };
  }

  // src/engine/patch.js
  var b64 = (u8) => {
    let s = "";
    for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode(...u8.subarray(i, i + 32768));
    return btoa(s);
  };
  var unb64 = (s) => {
    const bin = atob(s);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  };
  function specFor(kind, base, mine) {
    if (kind === "module") return MOD_SPEC;
    const lists = CHAR_LISTS;
    const scalars = [.../* @__PURE__ */ new Set([...Object.keys(base ?? {}), ...Object.keys(mine ?? {})])].filter((k) => !(k in lists) && !USER_KEYS.includes(k));
    return { scalars, lists, label: (k) => k, itemLabel: listItemLabel };
  }
  function viewKeys(kind, base) {
    if (kind === "module") return [...MOD_SPEC.scalars, ...Object.keys(MOD_LISTS)];
    return [.../* @__PURE__ */ new Set([...Object.keys(base ?? {}), ...Object.keys(CHAR_LISTS)])].filter((k) => !USER_KEYS.includes(k));
  }
  var assetPathsOf = (v) => {
    const out = /* @__PURE__ */ new Set();
    for (const a of v?.assets ?? []) if (a?.[1]) out.add(String(a[1]));
    for (const k of ["emotionImages", "additionalAssets"]) for (const a of v?.[k] ?? []) if (a?.[1]) out.add(String(a[1]));
    if (v?.image) out.add(String(v.image));
    if (v?.icon) out.add(String(v.icon));
    return out;
  };
  async function buildPatch({ kind, name, namespace, base, current, readAsset, includeAssets = true, version, note: note2, author }) {
    const keys = viewKeys(kind, base);
    const mine = pickView(current, keys);
    const baseView = pickView(base, keys);
    if (stableJson(mine) === stableJson(baseView)) return null;
    const changes = diffViews(kind, baseView, mine);
    if (!Object.keys(changes.scalars).length && !Object.values(changes.lists).some((l) => l.length)) return null;
    const patch = { type: "rbupatch", v: 2, kind, name, namespace: namespace || void 0, created: Date.now(), version: version || void 0, note: note2 || void 0, author: author || void 0, changes, assets: {} };
    if (includeAssets) {
      const before = assetPathsOf(baseView);
      for (const p of changedAssetPaths(changes)) {
        if (before.has(p)) continue;
        const d = await readAsset(p);
        if (d?.length) patch.assets[p] = b64(d instanceof Uint8Array ? d : new Uint8Array(d));
      }
    }
    return patch;
  }
  var has = (o, k) => !!o && k in o && o[k] !== void 0;
  var listsOf = (kind) => kind === "module" ? MOD_LISTS : CHAR_LISTS;
  function diffViews(kind, base, mine) {
    const lists = listsOf(kind);
    const scalars = {}, out = {};
    for (const k of /* @__PURE__ */ new Set([...Object.keys(base), ...Object.keys(mine)])) {
      if (k in lists) continue;
      if (stableJson(base[k] ?? null) === stableJson(mine[k] ?? null) && has(base, k) === has(mine, k)) continue;
      const c = {};
      if (has(base, k)) c.b = base[k];
      if (has(mine, k)) c.m = mine[k];
      scalars[k] = c;
    }
    for (const [k, idOf] of Object.entries(lists)) {
      if (!(k in base) && !(k in mine)) continue;
      const B = slotted(base[k], idOf), M = slotted(mine[k], idOf);
      const bm = new Map(B.map((x) => [x.slot, x.item]));
      const mm = new Map(M.map((x) => [x.slot, x.item]));
      const list = [];
      M.forEach((x, i) => {
        if (bm.has(x.slot)) {
          if (stableJson(bm.get(x.slot)) !== stableJson(x.item)) list.push({ slot: x.slot, b: bm.get(x.slot), m: x.item });
        } else list.push({ slot: x.slot, m: x.item, after: i ? M[i - 1].slot : null });
      });
      for (const x of B) if (!mm.has(x.slot)) list.push({ slot: x.slot, b: x.item });
      out[k] = list;
    }
    return { scalars, lists: out };
  }
  var changedAssetPaths = (ch) => assetPathsOf(Object.fromEntries(Object.entries(ch.lists).map(([k, l]) => [k, l.filter((c) => "m" in c).map((c) => c.m)]).concat(Object.entries(ch.scalars).filter(([k, c]) => (k === "image" || k === "icon") && "m" in c).map(([k, c]) => [k, c.m]))));
  function expand(patch, target) {
    const kind = patch.kind, lists = listsOf(kind), ch = patch.changes;
    const cur = pickView(target, viewKeys(kind, target));
    const base = {}, mine = {};
    for (const [k, v] of Object.entries(cur)) if (!(k in lists)) {
      base[k] = v;
      mine[k] = v;
    }
    for (const [k, c] of Object.entries(ch.scalars ?? {})) {
      if ("b" in c) base[k] = c.b;
      else delete base[k];
      if ("m" in c) mine[k] = c.m;
      else delete mine[k];
    }
    for (const [k, idOf] of Object.entries(lists)) {
      const changes = ch.lists?.[k] ?? [];
      if (!(k in cur) && !changes.length) continue;
      const bySlot = new Map(changes.map((c) => [c.slot, c]));
      const C = slotted(cur[k], idOf);
      const inCur = new Set(C.map((x) => x.slot));
      const bl = [], ml = [];
      for (const x of C) {
        const c = bySlot.get(x.slot);
        if (!c) {
          bl.push(x.item);
          ml.push({ slot: x.slot, item: x.item });
          continue;
        }
        if ("b" in c) bl.push(c.b);
        if ("m" in c) ml.push({ slot: x.slot, item: c.m });
      }
      for (const c of changes) {
        if (inCur.has(c.slot)) continue;
        if ("b" in c) bl.push(c.b);
        if (!("m" in c)) continue;
        if ("b" in c) {
          ml.push({ slot: c.slot, item: c.m });
          continue;
        }
        const at = c.after == null ? 0 : ml.findIndex((x) => x.slot === c.after) + 1;
        ml.splice(c.after == null ? at : at > 0 ? at : ml.length, 0, { slot: c.slot, item: c.m });
      }
      base[k] = bl;
      mine[k] = ml.map((x) => x.item);
    }
    return { base, mine };
  }
  function parsePatch(text) {
    const j = JSON.parse(text);
    if (j?.type !== "rbupatch" || !(j.mine || j.changes) || !j.kind) throw new Error("내 수정 패치(.rbupatch) 파일이 아니에요");
    return j;
  }
  function planPatch(patch, target, { choices } = {}) {
    const { base, mine } = patch.changes ? expand(patch, target) : patch;
    const spec = specFor(patch.kind, base, mine);
    const keys = patch.changes ? viewKeys(patch.kind, { ...base, ...mine, ...pickView(target, viewKeys(patch.kind, target)) }) : viewKeys(patch.kind, base);
    const r = merge3(base, pickView(target, keys), mine, spec, { choices: choices ?? /* @__PURE__ */ new Map(), keepExistingOnly: true });
    return { ...r, summary: summarize(r.items) };
  }
  async function applyPatch(patch, target, { saveAsset, choices } = {}) {
    const remap = /* @__PURE__ */ new Map();
    for (const [p, data] of Object.entries(patch.assets ?? {})) remap.set(p, await saveAsset(unb64(data)));
    const fix = (v) => JSON.parse(JSON.stringify(v), (k, x) => typeof x === "string" && remap.has(x) ? remap.get(x) : x);
    const p2 = !remap.size ? patch : patch.changes ? { ...patch, changes: fix(patch.changes) } : { ...patch, mine: fix(patch.mine) };
    const r = planPatch(p2, target, { choices });
    return { result: applyView(target, r.view, { userKeys: patch.kind === "character" ? USER_KEYS : [] }), items: r.items, summary: r.summary, uploaded: remap.size };
  }

  // src/engine/devcheck.js
  function projView(kind, obj) {
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
  function loreActivation(lore, text, { recursive = false } = {}) {
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
  function regexRun(scripts, text, mode = "editoutput") {
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
  function devLint(view) {
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
  function devStats(view) {
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
  function nextVersion(v) {
    const s = String(v ?? "").trim();
    const m = /^(.*?)(\d+)(\D*)$/.exec(s);
    if (!m) return s ? `${s}.1` : "1.0";
    return `${m[1]}${Number(m[2]) + 1}${m[3]}`;
  }

  // src/ui/cbs.js
  var CBS = [
    ["기본", [
      ["{{char}}", "캐릭터 이름"],
      ["{{user}}", "사용자(페르소나) 이름"],
      ["{{personality}}", "캐릭터 성격"],
      ["{{scenario}}", "시나리오"],
      ["{{description}}", "캐릭터 설명"],
      ["{{persona}}", "페르소나 설명"],
      ["{{lastmessage}}", "마지막 메시지"],
      ["{{lastcharmessage}}", "캐릭터의 마지막 메시지"],
      ["{{lastusermessage}}", "사용자의 마지막 메시지"],
      ["{{chat_index}}", "지금 메시지 번호"],
      ["{{messagecount}}", "메시지 수"],
      ["{{role}}", "지금 메시지의 역할"]
    ]],
    ["변수", [
      ["{{getvar::이름}}", "채팅 변수 읽기"],
      ["{{setvar::이름::값}}", "채팅 변수 쓰기"],
      ["{{addvar::이름::값}}", "채팅 변수에 더하기"],
      ["{{getglobalvar::이름}}", "전역 변수 읽기"],
      ["{{settempvar::이름::값}}", "임시 변수 쓰기"],
      ["{{gettempvar::이름}}", "임시 변수 읽기"]
    ]],
    ["조건", [
      ["{{#if 조건}}…{{/if}}", "조건이 참이면 보임"],
      ["{{#when::A::is::B}}…{{/when}}", "A가 B와 같으면"],
      ["{{#when::A::>::B}}…{{/when}}", "숫자 비교"],
      ["{{#when::A::and::B}}…{{/when}}", "둘 다 참"],
      ["{{#when::not::A}}…{{/when}}", "A가 거짓이면"],
      ["{{:else}}", "아니면"],
      ["{{equal::A::B}}", "같으면 1"],
      ["{{notequal::A::B}}", "다르면 1"],
      ["{{greater::A::B}}", "A>B면 1"],
      ["{{less::A::B}}", "A<B면 1"],
      ["{{and::A::B}}", "둘 다 1이면 1"],
      ["{{or::A::B}}", "하나라도 1이면 1"],
      ["{{not::A}}", "반대"]
    ]],
    ["반복·배열", [
      ["{{#each 배열 as 항목}}…{{/each}}", "배열 반복"],
      ["{{array::a::b::c}}", "배열 만들기"],
      ["{{array_element::배열::번호}}", "배열 항목"],
      ["{{array_length::배열}}", "배열 길이"],
      ["{{split::문자열::구분}}", "나누기"],
      ["{{join::배열::구분}}", "합치기"]
    ]],
    ["수·문자", [
      ["{{random::a::b::c}}", "무작위 하나"],
      ["{{pick::a::b::c}}", "메시지마다 고정된 무작위"],
      ["{{randint::1::10}}", "무작위 정수"],
      ["{{roll::2d6}}", "주사위"],
      ["{{calc::1+2}}", "계산"],
      ["{{round::3.6}}", "반올림"],
      ["{{floor::3.6}}", "내림"],
      ["{{ceil::3.2}}", "올림"],
      ["{{abs::-3}}", "절댓값"],
      ["{{length::문자열}}", "글자 수"],
      ["{{lower::ABC}}", "소문자"],
      ["{{upper::abc}}", "대문자"],
      ["{{replace::문자열::찾기::바꾸기}}", "바꾸기"],
      ["{{trim::문자열}}", "앞뒤 공백 빼기"]
    ]],
    ["시간·기타", [
      ["{{time}}", "지금 시각"],
      ["{{date}}", "오늘 날짜"],
      ["{{isotime}}", "UTC 시각"],
      ["{{idle_duration}}", "마지막 메시지 뒤 지난 시간"],
      ["{{asset::이름}}", "에셋 이미지 넣기"],
      ["{{emotion::이름}}", "감정 이미지"],
      ["{{raw::이름}}", "에셋 주소"],
      ["{{button::글자::트리거}}", "누르면 트리거 실행"],
      ["{{module_enabled::네임스페이스}}", "모듈이 켜져 있으면 1"],
      ["{{getglobalvar::toggle_이름}}", "모듈 토글 값"],
      ["{{// 주석}}", "주석(출력 안 됨)"],
      ["{{br}}", "줄바꿈"],
      ["{{decbo}}", "{ 문자"],
      ["{{decbc}}", "} 문자"]
    ]]
  ];

  // src/ui/screens/editor.js
  var LORE_MODES = [["normal", "일반"], ["constant", "항상 켜짐"], ["multiple", "여러 키"], ["child", "하위"], ["folder", "폴더"]];
  var REGEX_TYPES = [["editinput", "입력 수정"], ["editoutput", "출력 수정"], ["editprocess", "요청 데이터 수정"], ["editdisplay", "화면 표시 수정"], ["edittrans", "번역 표시 수정"], ["disabled", "사용 안 함"]];
  var TRIGGER_TYPES = [["start", "채팅 시작"], ["input", "입력할 때"], ["output", "출력할 때"], ["display", "화면 표시"], ["request", "요청할 때"], ["manual", "수동(버튼)"]];
  var newLore = () => ({ key: "", secondkey: "", insertorder: 100, comment: "새 항목", content: "", mode: "normal", alwaysActive: false, selective: false, useRegex: false });
  var newLoreFolder = () => ({ key: "folder:" + newId(), comment: "새 폴더", content: "", mode: "folder", insertorder: 100, alwaysActive: false, secondkey: "", selective: false });
  var newRegex = () => ({ comment: "새 정규식", in: "", out: "", type: "editoutput", flag: "g", ableFlag: false });
  var newTrigger = () => ({ comment: "새 트리거", type: "output", conditions: [], effect: [{ type: "triggerlua", code: "" }], lowLevelAccess: false });
  var DIV = /^\s*[-=─━═~*#_—–·•+<>]{2,}|[-=─━═~*#_—–·•+<>]{2,}\s*$/;
  var isDividerName = (s) => DIV.test(String(s ?? ""));
  var isLoreDivider = (l) => !String(l?.key ?? "").trim() && !l?.alwaysActive && l?.mode !== "constant" && (isDividerName(l?.comment) || !String(l?.content ?? "").trim());
  var isRegexDivider = (r) => !r?.in && (isDividerName(r?.comment) || !String(r?.out ?? "").trim());
  function validateModule(m) {
    const out = [];
    if (!String(m.name ?? "").trim()) out.push({ level: "err", tab: "info", msg: "이름이 비어 있어요" });
    (m.lorebook ?? []).forEach((l, i) => {
      if (l.mode === "folder" || isLoreDivider(l)) return;
      if (!l.alwaysActive && l.mode !== "constant" && !String(l.key ?? "").trim()) out.push({ level: "warn", tab: "lorebook", index: i, msg: `로어북 '${l.comment || i + 1}': 활성화 키가 없고 항상 켜짐도 아니라서 쓰이지 않아요` });
      if (l.useRegex) for (const k of String(l.key ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
        const mm = /^\/(.*)\/([a-z]*)$/s.exec(k);
        if (!mm) {
          out.push({ level: "warn", tab: "lorebook", index: i, msg: `로어북 '${l.comment || i + 1}': 정규식 키는 /패턴/플래그 모양이어야 해요` });
          continue;
        }
        try {
          new RegExp(mm[1], mm[2]);
        } catch (e) {
          out.push({ level: "err", tab: "lorebook", index: i, msg: `로어북 '${l.comment || i + 1}': 정규식 오류 — ${e.message}` });
        }
      }
      if (l.folder && !(m.lorebook ?? []).some((f) => f.mode === "folder" && f.key === l.folder)) out.push({ level: "warn", tab: "lorebook", index: i, msg: `로어북 '${l.comment || i + 1}': 없는 폴더에 들어 있어요` });
    });
    (m.regex ?? []).forEach((r, i) => {
      if (isRegexDivider(r)) return;
      if (!r.in) {
        out.push({ level: "warn", tab: "regex", index: i, msg: `정규식 '${r.comment || i + 1}': 찾을 패턴이 비어 있어요` });
        return;
      }
      if (String(r.in).includes("{{")) return;
      try {
        new RegExp(r.in, String(r.ableFlag ? r.flag ?? "" : "g").replace(/[^dgimsuyv]/g, ""));
      } catch (e) {
        out.push({ level: "err", tab: "regex", index: i, msg: `정규식 '${r.comment || i + 1}': ${e.message}` });
      }
    });
    (m.trigger ?? []).forEach((t, i) => {
      if (!Array.isArray(t.conditions)) out.push({ level: "err", tab: "trigger", index: i, msg: `트리거 '${t.comment || i + 1}': conditions가 배열이 아니에요` });
      if (!Array.isArray(t.effect)) out.push({ level: "err", tab: "trigger", index: i, msg: `트리거 '${t.comment || i + 1}': effect가 배열이 아니에요` });
    });
    if (m.mcp !== void 0 && m.mcp !== null && typeof m.mcp !== "object") out.push({ level: "err", tab: "info", msg: "MCP 설정은 객체여야 해요" });
    return out;
  }
  var MOD_INFO_LABELS = { name: "이름", description: "설명", namespace: "네임스페이스", lowLevelAccess: "저수준 접근", hideIcon: "아이콘 숨김", backgroundEmbedding: "배경 HTML", customModuleToggle: "모듈 토글", cjs: "스크립트", mcp: "MCP" };
  function diffSummary(a, b, { infoLabels = MOD_INFO_LABELS, infoTitle = "모듈 정보" } = {}) {
    const lines = [];
    const changedInfo = Object.keys(infoLabels).filter((k) => stableJson(a[k] ?? null) !== stableJson(b[k] ?? null));
    if (changedInfo.length) lines.push(`${infoTitle}: ${changedInfo.map((k) => infoLabels[k]).join(", ")}`);
    for (const [k, label] of [["lorebook", "로어북"], ["regex", "정규식"], ["trigger", "트리거"], ["assets", "에셋"]]) {
      const A = (a[k] ?? []).map((x) => stableJson(x)), B = (b[k] ?? []).map((x) => stableJson(x));
      const count = (arr) => arr.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), /* @__PURE__ */ new Map());
      const ca = count(A), cb = count(B);
      let added = 0, removed = 0;
      for (const [x, n] of cb) added += Math.max(0, n - (ca.get(x) ?? 0));
      for (const [x, n] of ca) removed += Math.max(0, n - (cb.get(x) ?? 0));
      const moved = !added && !removed && A.join("\n") !== B.join("\n");
      const changed = Math.min(added, removed);
      if (added || removed || moved) lines.push(`${label}: ${[changed && `수정 ${changed}`, added - changed && `추가 ${added - changed}`, removed - changed && `삭제 ${removed - changed}`, moved && "순서 바뀜"].filter(Boolean).join(" · ")}`);
    }
    return lines;
  }
  async function openEditor(ctx, id) {
    const data = await ctx.svc.load({ fresh: true });
    const entry2 = data.entries.find((e) => e.module.id === id);
    if (!entry2) {
      ctx.toast("모듈을 찾지 못했어요", { error: true });
      return;
    }
    return openEditorCore(ctx, {
      view: entry2.module,
      kindLabel: "모듈 편집",
      idKey: "id",
      validate: validateModule,
      async save(draft, original) {
        await createStore(ctx.api).addBackup({ kind: "module", target: original.id, name: original.name, snapshot: original, note: "편집 전" }).catch(() => null);
        const patch = {};
        for (const k of /* @__PURE__ */ new Set([...Object.keys(original), ...Object.keys(draft)])) if (k !== "id" && stableJson(original[k] ?? null) !== stableJson(draft[k] ?? null)) patch[k] = draft[k];
        await ctx.svc.run("update", original.id, patch);
        reload(ctx).catch(() => {
        });
      }
    });
  }
  async function openEditorCore(ctx, cfg) {
    const original = structuredClone(cfg.view);
    let draft = structuredClone(cfg.view);
    for (const k of ["lorebook", "regex", "trigger"]) if (!Array.isArray(draft[k])) draft[k] = [];
    const es = { tab: "lorebook", sel: { lorebook: 0, regex: 0, trigger: 0 }, q: { lorebook: "", regex: "", trigger: "" }, lastField: null, mItem: false };
    const dirty = () => stableJson(draft) !== stableJson(original);
    const panel = h("div", { class: "rb-full", role: "dialog", "aria-label": `${original.name} 편집` });
    const titleB = h("b", null, original.name || "(이름 없음)");
    const issuesBtn = btn("", { size: "sm", kind: "ghost", onClick: () => showIssues() });
    const applyBtn = btn("적용", { kind: "primary", icon: "check", onClick: () => apply() });
    const head = h(
      "div",
      { class: "rb-full-head" },
      iconBtn("back", "닫기", { onClick: () => close() }),
      h("div", { class: "ttl" }, h("small", null, cfg.kindLabel), titleB),
      issuesBtn,
      btn("CBS 사전", { size: "sm", onClick: () => cbsPanel() }),
      applyBtn
    );
    const tabsEl = h("div", { class: "rb-tabs", role: "tablist" });
    const body = h("div", { class: "rb-split" });
    panel.append(head, tabsEl, body);
    ctx.win.appendChild(panel);
    panel.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !ctx.win.querySelector(".rb-modal, .rb-menu")) {
        ev.stopPropagation();
        close();
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") {
        ev.preventDefault();
        apply();
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "f") {
        const s = panel.querySelector(".rb-side-tools input");
        if (s) {
          ev.preventDefault();
          s.focus();
          s.select();
        }
      }
    });
    panel.addEventListener("focusin", (ev) => {
      if (ev.target.matches("textarea, input[type=text], input:not([type])")) es.lastField = ev.target;
    });
    const TABS2 = [["info", "정보"], ["lorebook", "로어북"], ["regex", "정규식"], ["trigger", "트리거"], ["json", "JSON"]];
    function paintTabs() {
      replace(tabsEl, TABS2.map(([k, label]) => h(
        "button",
        { type: "button", role: "tab", "aria-selected": es.tab === k ? "true" : "false", onClick: () => {
          es.tab = k;
          es.mItem = false;
          render();
        } },
        label,
        ["lorebook", "regex", "trigger"].includes(k) ? h("small", null, String(draft[k].length)) : null
      )));
    }
    function paintHead() {
      const iss = cfg.validate(draft);
      const errs = iss.filter((i) => i.level === "err").length, warns = iss.length - errs;
      replace(issuesBtn, icon(errs || warns ? "alert" : "check", 16), h("span", null, errs ? `오류 ${errs}` : warns ? `경고 ${warns}` : "검증 통과"));
      issuesBtn.style.color = errs ? "var(--rb-danger)" : warns ? "var(--rb-warn)" : "var(--rb-teal)";
      applyBtn.disabled = !dirty();
      titleB.textContent = (draft.name || "(이름 없음)") + (dirty() ? " •" : "");
    }
    let headTimer = null, tabsTimer = null;
    const changed = () => {
      titleB.textContent = (draft.name || "(이름 없음)") + " •";
      applyBtn.disabled = false;
      clearTimeout(headTimer);
      headTimer = setTimeout(paintHead, 250);
      clearTimeout(tabsTimer);
      tabsTimer = setTimeout(paintTabs, 120);
    };
    const field = (label, input, wide) => h("label", { class: ["rb-field", wide && "wide"] }, h("span", { class: "rb-label" }, label), input);
    const text = (obj, key, { placeholder, onInput } = {}) => {
      const el = h("input", { class: "rb-input", value: obj[key] ?? "", placeholder });
      el.addEventListener("input", () => {
        obj[key] = el.value;
        onInput?.();
        changed();
      });
      return el;
    };
    const num = (obj, key) => {
      const el = h("input", { class: "rb-input", type: "number", value: obj[key] ?? "" });
      el.addEventListener("input", () => {
        obj[key] = el.value === "" ? void 0 : Number(el.value);
        changed();
      });
      return el;
    };
    const area = (obj, key, { tall, placeholder, mono = true } = {}) => {
      const el = h("textarea", { class: ["rb-textarea", tall && "tall"], spellcheck: "false", placeholder, style: mono ? null : "font-family:inherit;font-size:14px" });
      el.value = obj[key] ?? "";
      el.addEventListener("input", () => {
        obj[key] = el.value;
        changed();
      });
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Tab" && !ev.shiftKey && !ev.ctrlKey) {
          ev.preventDefault();
          el.setRangeText("	", el.selectionStart, el.selectionEnd, "end");
          el.dispatchEvent(new Event("input"));
        }
      });
      return el;
    };
    const check = (obj, key, label) => {
      const el = h("input", { type: "checkbox", checked: !!obj[key] });
      el.addEventListener("change", () => {
        obj[key] = el.checked;
        changed();
      });
      return h("label", { class: "rb-check" }, el, h("span", null, label));
    };
    const select2 = (obj, key, options, onChange) => {
      const el = h("select", { class: "rb-input" }, options.map(([v, l]) => h("option", { value: v, selected: (obj[key] ?? options[0][0]) === v }, l)));
      el.addEventListener("change", () => {
        obj[key] = el.value;
        changed();
        onChange?.();
      });
      return el;
    };
    const jsonArea = (obj, key, { tall } = {}) => {
      const el = h("textarea", { class: ["rb-textarea", tall && "tall"], spellcheck: "false" });
      el.value = obj[key] === void 0 ? "" : JSON.stringify(obj[key], null, 2);
      const err = h("span", { class: "rb-muted" });
      el.addEventListener("input", () => {
        if (!el.value.trim()) {
          delete obj[key];
          err.textContent = "";
          changed();
          return;
        }
        try {
          obj[key] = JSON.parse(el.value);
          err.textContent = "";
          el.style.borderColor = "";
          changed();
        } catch (e) {
          err.textContent = `JSON 오류: ${e.message}`;
          el.style.borderColor = "var(--rb-danger)";
        }
      });
      return h("div", { style: "display:flex;flex-direction:column;gap:4px" }, el, err);
    };
    function renderInfo() {
      if (cfg.renderInfo) {
        replace(body, h("div", { class: "pane" }, cfg.renderInfo({ draft, field, text, area, check, num, jsonArea, select: select2, changed })));
        return;
      }
      replace(body, h(
        "div",
        { class: "pane" },
        h(
          "div",
          { class: "rb-form" },
          field("이름", text(draft, "name")),
          field("네임스페이스", text(draft, "namespace", { placeholder: "다른 모듈·트리거가 이 모듈을 가리킬 때 쓰는 이름" })),
          field("설명", area(draft, "description", { mono: false }), true),
          h("div", { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap" }, check(draft, "lowLevelAccess", "저수준 접근 (AI 호출·이미지 생성 등 고급 기능)"), check(draft, "hideIcon", "채팅에서 아이콘 숨기기")),
          field("모듈 토글 정의 (customModuleToggle)", area(draft, "customModuleToggle", { placeholder: "예) toggle_이름=보여줄 이름" }), true),
          field("배경 HTML (backgroundEmbedding)", area(draft, "backgroundEmbedding"), true),
          field("스크립트 (cjs)", area(draft, "cjs"), true),
          field("MCP 설정 (JSON)", jsonArea(draft, "mcp"), true)
        ),
        draft.lowLevelAccess ? note("warn", "저수준 접근을 켠 모듈은 믿을 수 있는 출처일 때만 쓰세요.") : null
      ));
    }
    function renderList(kind) {
      const list = draft[kind];
      const q = es.q[kind].trim().toLowerCase();
      const match = (it2) => !q || [it2.comment, it2.key, it2.secondkey, it2.content, it2.in, it2.out, JSON.stringify(it2.effect ?? "")].some((v) => String(v ?? "").toLowerCase().includes(q));
      if (es.sel[kind] >= list.length) es.sel[kind] = list.length - 1;
      if (list[es.sel[kind]]?.mode === "folder") {
        const j = list.findIndex((x, k) => k >= es.sel[kind] && x.mode !== "folder");
        es.sel[kind] = j >= 0 ? j : list.findIndex((x) => x.mode !== "folder");
      }
      const search = h("input", { class: "rb-input", style: "height:36px;flex:1;min-width:120px", placeholder: "찾기 (Ctrl+F) — 이름·키·내용", value: es.q[kind], "aria-label": "찾기" });
      search.addEventListener("input", () => {
        es.q[kind] = search.value;
        paintItems();
      });
      const add = (mk) => {
        const at = es.sel[kind] >= 0 ? es.sel[kind] + 1 : list.length;
        const it2 = mk();
        const cur = list[es.sel[kind]];
        if (kind === "lorebook" && cur && it2.mode !== "folder") {
          if (cur.mode === "folder") it2.folder = cur.key;
          else if (cur.folder) it2.folder = cur.folder;
        }
        list.splice(at, 0, it2);
        es.sel[kind] = at;
        es.mItem = true;
        changed();
        render();
      };
      const tools = h(
        "div",
        { class: "rb-side-tools" },
        search,
        btn("추가", { size: "sm", icon: "plus", onClick: () => add(kind === "lorebook" ? newLore : kind === "regex" ? newRegex : newTrigger) }),
        kind === "lorebook" ? btn("폴더", { size: "sm", icon: "folderPlus", onClick: () => newFolderPicked() }) : null
      );
      const items = h("div", { class: "rb-side-list", role: "listbox", "aria-label": "항목" });
      const uid = /* @__PURE__ */ new WeakMap();
      let seq = 0;
      const idOf = (it2) => {
        if (!uid.has(it2)) uid.set(it2, "i" + ++seq);
        return uid.get(it2);
      };
      const byUid = (id) => list.find((x) => uid.get(x) === id);
      const selObj = () => list[es.sel[kind]];
      const reselect = (obj) => {
        es.sel[kind] = obj ? list.indexOf(obj) : es.sel[kind];
      };
      es.loreCollapsed ??= /* @__PURE__ */ new Set();
      const dropTo = ({ beforeId, after, folderId }, dragged) => {
        const keepSel = selObj();
        const from = list.indexOf(dragged);
        if (from < 0) return;
        if (beforeId) {
          const target = byUid(beforeId);
          if (!target || target === dragged) return;
          list.splice(from, 1);
          list.splice(list.indexOf(target) + (after ? 1 : 0), 0, dragged);
          if (kind === "lorebook" && dragged.mode !== "folder") {
            if (target.mode === "folder") dragged.folder = target.key;
            else if (target.folder) dragged.folder = target.folder;
            else delete dragged.folder;
          }
        } else if (kind === "lorebook") {
          list.splice(from, 1);
          if (folderId) {
            let at = list.findIndex((x) => x.mode === "folder" && x.key === folderId);
            list.forEach((x, k) => {
              if (x.folder === folderId) at = k;
            });
            list.splice(at + 1, 0, dragged);
            dragged.folder = folderId;
          } else {
            list.push(dragged);
            delete dragged.folder;
          }
        }
        reselect(keepSel);
        changed();
        render();
      };
      const rowFor = (it2, i2, { child = false, grip = true } = {}) => {
        const divider = kind === "lorebook" ? isLoreDivider(it2) : kind === "regex" ? isRegexDivider(it2) : false;
        const label = it2.comment || (kind === "lorebook" ? it2.key : it2.in) || "(이름 없음)";
        const off = kind === "regex" ? it2.type === "disabled" : kind === "lorebook" ? it2.enabled === false : false;
        const b = h(
          "button",
          { type: "button", class: ["rb-item", off && "off", child && "child", divider && "divider"], role: "option", "aria-selected": es.sel[kind] === i2 ? "true" : "false", onClick: () => {
            es.sel[kind] = i2;
            es.mItem = true;
            render();
          } },
          h("span", { class: "t" }, label),
          kind === "lorebook" && !divider && (it2.alwaysActive || it2.mode === "constant") ? badge("항상", "acc") : null,
          kind === "trigger" ? badge(TRIGGER_TYPES.find((x) => x[0] === it2.type)?.[1] ?? it2.type, "mute") : null
        );
        if (!grip) return b;
        const g = h("span", { class: "grip", title: "끌어서 순서 바꾸기·폴더에 넣기", "aria-hidden": "true" }, icon("grip", 14));
        const w = h("div", { class: "rb-item-row", dataset: { dropRow: idOf(it2) } }, g, b);
        gripDrag({ grip: g, row: w, root: items, scroller: items, onDrop: (d) => dropTo(d, it2) });
        return w;
      };
      const folderHead = (f, kids) => {
        const open = !es.loreCollapsed.has(f.key);
        const head2 = h(
          "div",
          { class: "rb-item-row", dataset: { dropFolder: f.key } },
          h(
            "button",
            { type: "button", class: "rb-folder", style: "flex:1;margin-top:2px", "aria-expanded": open ? "true" : "false", onClick: () => {
              if (open) es.loreCollapsed.add(f.key);
              else es.loreCollapsed.delete(f.key);
              paintItems();
            } },
            h("span", { class: "chev" }, icon("chevron", 14)),
            h("span", { style: "display:flex;color:var(--rb-acc-text)" }, icon("folder", 15)),
            h("b", { style: "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, f.comment || "(이름 없는 폴더)"),
            h("small", null, String(kids.length))
          ),
          iconBtn("more", `${f.comment} 폴더 메뉴`, { onClick: (e) => folderMenuLore(f, e.currentTarget) })
        );
        return head2;
      };
      function paintItems() {
        const out = [];
        if (q || kind !== "lorebook") {
          list.forEach((it2, i2) => {
            if (match(it2)) out.push(rowFor(it2, i2, { grip: !q }));
          });
        } else {
          const keys = new Set(list.filter((x) => x.mode === "folder").map((x) => x.key));
          list.forEach((it2, i2) => {
            if (it2.mode === "folder") {
              const kids = list.map((x, k) => [x, k]).filter(([x]) => x.mode !== "folder" && x.folder === it2.key);
              out.push(folderHead(it2, kids));
              if (!es.loreCollapsed.has(it2.key)) {
                const bodyEl = h("div", { class: "rb-folder-body", style: "margin-left:12px;padding-left:8px" }, ...kids.map(([x, k]) => rowFor(x, k)));
                if (!kids.length) bodyEl.appendChild(h("div", { class: "rb-muted", style: "padding:6px 10px;font-size:12px" }, "항목을 여기로 끌어다 놓으세요"));
                out.push(bodyEl);
              }
              return;
            }
            if (it2.folder && keys.has(it2.folder)) return;
            out.push(rowFor(it2, i2));
          });
          if (keys.size) out.push(h("div", { class: "rb-label", style: "padding:10px 10px 6px;border-radius:8px", dataset: { dropFolder: "" } }, "여기에 놓으면 폴더 밖으로"));
        }
        replace(items, out.length ? out : h("div", { class: "rb-empty" }, list.length ? "찾는 항목이 없어요" : '항목이 없어요. "추가"를 눌러 만드세요.'));
      }
      const loreItems = () => list.filter((x) => x.mode !== "folder").map((x) => ({ id: idOf(x), label: x.comment || x.key || "(이름 없음)", folder: x.folder || null, sub: x.folder ? `지금: ${list.find((f) => f.mode === "folder" && f.key === x.folder)?.comment ?? "폴더"}` : "폴더 없음" }));
      async function newFolderPicked() {
        const r = await folderDialog(ctx.win, { title: "새 로어북 폴더", items: loreItems(), noun: "항목", ...folderPickPrefs(ctx) });
        if (!r) return;
        const keepSel = selObj();
        const f = { ...newLoreFolder(), comment: r.name };
        const picked = r.ids.map(byUid).filter(Boolean);
        let at = picked.length ? Math.min(...picked.map((x) => list.indexOf(x))) : list.length;
        for (const x of picked) list.splice(list.indexOf(x), 1);
        at = Math.min(at, list.length);
        list.splice(at, 0, f, ...picked);
        for (const x of picked) x.folder = f.key;
        reselect(keepSel);
        changed();
        render();
      }
      function folderMenuLore(f, anchor) {
        openMenu(ctx.win, anchor, [
          { label: "넣을 항목 고르기…", icon: "plus", onClick: async () => {
            const r = await folderDialog(ctx.win, { title: `'${f.comment}' 폴더에 넣을 항목`, items: loreItems(), checked: list.filter((x) => x.folder === f.key).map(idOf), ok: "저장", withName: false, noun: "항목", current: f.key, ...folderPickPrefs(ctx) });
            if (!r) return;
            const keepSel = selObj();
            for (const x of list) if (x.folder === f.key && !r.ids.includes(idOf(x))) delete x.folder;
            const picked = r.ids.map(byUid).filter(Boolean);
            for (const x of picked) list.splice(list.indexOf(x), 1);
            let at = list.indexOf(f);
            list.forEach((x, k) => {
              if (x.folder === f.key) at = k;
            });
            list.splice(at + 1, 0, ...picked);
            for (const x of picked) x.folder = f.key;
            reselect(keepSel);
            changed();
            render();
          } },
          { label: "이름 바꾸기", icon: "edit", onClick: async () => {
            const n = await promptDialog(ctx.win, { title: "폴더 이름", value: f.comment });
            if (n?.trim()) {
              f.comment = n.trim();
              changed();
              render();
            }
          } },
          "sep",
          { label: "폴더 삭제 (항목은 남음)", icon: "trash", danger: true, onClick: () => {
            const keepSel = selObj();
            for (const x of list) if (x.folder === f.key) delete x.folder;
            list.splice(list.indexOf(f), 1);
            reselect(keepSel === f ? null : keepSel);
            if (keepSel === f) es.sel[kind] = Math.min(es.sel[kind], list.length - 1);
            changed();
            render();
          } }
        ]);
      }
      paintItems();
      const i = es.sel[kind], it = list[i];
      const moveIt = (d) => {
        const j = i + d;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        es.sel[kind] = j;
        changed();
        render();
      };
      const itemTools = it ? h(
        "div",
        { style: "display:flex;gap:6px;flex-wrap:wrap" },
        btn("복제", { size: "sm", onClick: () => {
          const c = structuredClone(it);
          if (c.mode === "folder") c.key = "folder:" + newId();
          delete c.id;
          c.comment = (c.comment || "") + " (복사)";
          list.splice(i + 1, 0, c);
          es.sel[kind] = i + 1;
          changed();
          render();
        } }),
        btn("위로", { size: "sm", icon: "up", onClick: () => moveIt(-1) }),
        btn("아래로", { size: "sm", icon: "down", onClick: () => moveIt(1) }),
        h("div", { class: "rb-spacer" }),
        btn("삭제", { size: "sm", kind: "danger", icon: "trash", onClick: async () => {
          if (it.mode === "folder" && list.some((x) => x.folder === it.key) && !await confirmDialog(ctx.win, { title: "폴더를 지울까요?", body: "안의 항목은 폴더 밖으로 나와요.", ok: "삭제", danger: true })) return;
          if (it.mode === "folder") {
            for (const x of list) if (x.folder === it.key) delete x.folder;
          }
          list.splice(i, 1);
          es.sel[kind] = Math.min(i, list.length - 1);
          changed();
          render();
        } })
      ) : null;
      const pane = h("div", { class: "pane" });
      body.classList.toggle("m-item", !!(es.mItem && it));
      body.classList.toggle("m-list", !(es.mItem && it));
      pane.appendChild(h("div", { class: "rb-mobile-only" }, btn("목록으로", { size: "sm", icon: "back", onClick: () => {
        es.mItem = false;
        render();
      } })));
      if (!it) pane.appendChild(h("div", { class: "rb-empty" }, "왼쪽에서 항목을 고르세요."));
      else pane.append(itemTools, kind === "lorebook" ? loreForm(it) : kind === "regex" ? regexForm(it) : triggerForm(it));
      replace(body, h("div", { class: "side" }, tools, items), pane);
    }
    function loreForm(l) {
      const folders = draft.lorebook.filter((x) => x.mode === "folder");
      if (l.mode === "folder") return h("div", { class: "rb-form" }, field("폴더 이름", text(l, "comment")), h("p", { class: "rb-muted wide" }, `이 폴더 안 항목 ${draft.lorebook.filter((x) => x.folder === l.key).length}개`));
      const enabled = h("input", { type: "checkbox", checked: l.enabled !== false });
      enabled.addEventListener("change", () => {
        if (enabled.checked) delete l.enabled;
        else l.enabled = false;
        changed();
      });
      const folderSel = h("select", { class: "rb-input" }, h("option", { value: "" }, "(폴더 없음)"), folders.map((f) => h("option", { value: f.key, selected: l.folder === f.key }, f.comment || "(이름 없는 폴더)")));
      folderSel.addEventListener("change", () => {
        if (folderSel.value) l.folder = folderSel.value;
        else delete l.folder;
        changed();
        renderList("lorebook");
      });
      return h(
        "div",
        { class: "rb-form" },
        field("이름", text(l, "comment")),
        field("방식", select2(l, "mode", LORE_MODES.filter((x) => x[0] !== "folder"))),
        field("활성화 키 (쉼표로 구분)", text(l, "key"), true),
        field("내용", area(l, "content", { tall: true, mono: false }), true),
        h(
          "div",
          { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap" },
          h("label", { class: "rb-check" }, enabled, h("span", null, "사용")),
          check(l, "alwaysActive", "항상 켜짐"),
          check(l, "selective", "보조 키 사용"),
          check(l, "useRegex", "키를 정규식으로")
        ),
        field("보조 키", text(l, "secondkey", { placeholder: "보조 키 사용을 켜면 둘 다 있어야 켜짐" })),
        field("삽입 순서", num(l, "insertorder")),
        field("켜질 확률 (%)", num(l, "activationPercent")),
        field("폴더", folderSel)
      );
    }
    function regexForm(r) {
      const flags = h("div", { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap;align-items:center" }, check(r, "ableFlag", "플래그 직접 지정"));
      const flagInput = text(r, "flag", { placeholder: "g, i, m, s…" });
      flags.appendChild(h("div", { style: "width:180px" }, flagInput));
      return h(
        "div",
        { class: "rb-form" },
        field("이름", text(r, "comment")),
        field("적용 시점", select2(r, "type", REGEX_TYPES)),
        field("찾을 패턴 (IN)", area(r, "in"), true),
        field("바꿀 내용 (OUT)", area(r, "out", { tall: true }), true),
        flags
      );
    }
    function triggerForm(t) {
      const lua = Array.isArray(t.effect) && t.effect.length === 1 && ["triggerlua", "triggercode"].includes(t.effect[0]?.type) ? t.effect[0] : null;
      return h(
        "div",
        { class: "rb-form" },
        field("이름", text(t, "comment")),
        field("실행 시점", select2(t, "type", TRIGGER_TYPES)),
        h("div", { class: "wide", style: "display:flex;gap:16px" }, check(t, "lowLevelAccess", "저수준 접근")),
        lua ? field(lua.type === "triggerlua" ? "Lua 코드" : "트리거 코드", area(lua, "code", { tall: true }), true) : null,
        field("조건 (conditions, JSON)", jsonArea(t, "conditions"), true),
        lua ? null : field("효과 (effect, JSON)", jsonArea(t, "effect", { tall: true }), true)
      );
    }
    function renderJson() {
      const view = structuredClone(draft);
      delete view[cfg.idKey];
      const el = h("textarea", { class: "rb-textarea", style: "flex:1;min-height:60vh", spellcheck: "false" });
      el.value = JSON.stringify(view, null, 2);
      const msg = h("span", { class: "rb-muted" }, "전체를 JSON으로 고쳐요. 식별자(id)는 바꿀 수 없어요.");
      const applyJson = btn("JSON 반영", { size: "sm", kind: "primary", onClick: () => {
        try {
          const j = JSON.parse(el.value);
          if (!j || typeof j !== "object" || Array.isArray(j)) throw new Error("최상위는 객체({…})여야 해요");
          for (const k of ["lorebook", "regex", "trigger"]) if (j[k] !== void 0 && !Array.isArray(j[k])) throw new Error(`${k}는 배열이어야 해요`);
          draft = { ...j, [cfg.idKey]: original[cfg.idKey] };
          for (const k of ["lorebook", "regex", "trigger"]) if (!Array.isArray(draft[k])) draft[k] = [];
          msg.textContent = '반영했어요. "적용"을 눌러야 저장돼요.';
          msg.style.color = "var(--rb-teal)";
          changed();
        } catch (e) {
          msg.textContent = `JSON 오류: ${e.message}`;
          msg.style.color = "var(--rb-danger)";
        }
      } });
      replace(body, h("div", { class: "pane" }, h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap" }, msg, h("div", { class: "rb-spacer" }), applyJson), el));
    }
    function render() {
      paintTabs();
      paintHead();
      if (es.tab === "info" || es.tab === "json") body.classList.remove("m-item", "m-list");
      if (es.tab === "info") renderInfo();
      else if (es.tab === "json") renderJson();
      else renderList(es.tab);
    }
    function showIssues() {
      const iss = cfg.validate(draft);
      const back = h(
        "div",
        { class: "rb-modal", onMousedown: (ev) => {
          if (ev.target === back) back.remove();
        } },
        h(
          "div",
          { class: "rb-dialog", role: "dialog", "aria-label": "검증 결과" },
          h("h3", { class: "rb-h3" }, iss.length ? `검증 결과 (${iss.length})` : "문제 없어요"),
          h("div", { class: "rb-issues rb-scroll", style: "max-height:50vh" }, iss.map((x) => h("button", { type: "button", class: ["rb-issue", x.level], onClick: () => {
            back.remove();
            es.tab = x.tab;
            if (x.index !== void 0) {
              es.sel[x.tab] = x.index;
              es.q[x.tab] = "";
            }
            render();
          } }, icon("alert", 14), h("span", null, x.msg)))),
          h("div", { class: "btns" }, btn("닫기", { onClick: () => back.remove() }))
        )
      );
      ctx.win.appendChild(back);
    }
    function cbsPanel() {
      const target = es.lastField;
      const back = h("div", { class: "rb-modal", onMousedown: (ev) => {
        if (ev.target === back) back.remove();
      } });
      const box = h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-label": "CBS 사전", style: "max-width:560px" },
        h("h3", { class: "rb-h3" }, "CBS 사전"),
        h("p", { class: "rb-muted" }, target ? "누르면 마지막으로 고치던 칸의 커서 자리에 넣어요." : "누르면 복사해요."),
        h("div", { class: "rb-cbs" }, CBS.map(([group, items]) => [h("span", { class: "rb-label", style: "margin-top:8px" }, group), items.map(([code, desc]) => h("button", { type: "button", onClick: () => {
          if (target && target.isConnected) {
            target.focus();
            target.setRangeText(code, target.selectionStart ?? target.value.length, target.selectionEnd ?? target.value.length, "end");
            target.dispatchEvent(new Event("input"));
          } else navigator.clipboard?.writeText(code).catch(() => {
          });
          back.remove();
        } }, h("code", null, code), h("span", null, desc)))])),
        h("div", { class: "btns" }, btn("닫기", { onClick: () => back.remove() }))
      );
      back.appendChild(box);
      ctx.win.appendChild(back);
    }
    async function apply() {
      if (!dirty()) return;
      const iss = cfg.validate(draft);
      const errs = iss.filter((x) => x.level === "err");
      const lines = diffSummary(original, draft, { infoLabels: cfg.infoLabels, infoTitle: cfg.infoTitle });
      const ok = await confirmDialog(ctx.win, { title: "바뀐 내용을 저장할까요?", body: [...lines, "", errs.length ? `⚠ 오류 ${errs.length}개가 있어요. 그대로 저장할 수도 있어요.` : "", '저장하기 전 상태는 백업해서 "기록" 탭에서 되돌릴 수 있어요.'].filter((x, i, a) => x || i && a[i - 1]).join("\n"), ok: "저장" });
      if (!ok) return;
      applyBtn.disabled = true;
      try {
        await cfg.save(draft, original);
        Object.assign(original, structuredClone(draft));
        for (const k of Object.keys(original)) if (!(k in draft)) delete original[k];
        ctx.toast("저장했어요");
        paintHead();
      } catch (err) {
        ctx.toast(`저장하지 못했어요: ${err?.message ?? err}`, { error: true });
        applyBtn.disabled = false;
      }
    }
    async function close() {
      if (dirty() && !await confirmDialog(ctx.win, { title: "저장하지 않은 변경이 있어요", body: "닫으면 바뀐 내용이 사라져요.", ok: "버리고 닫기", danger: true })) return;
      panel.remove();
    }
    render();
    panel.querySelector(".rb-tabs button[aria-selected=true]")?.focus();
    return { panel, close, get draft() {
      return draft;
    }, apply };
  }

  // src/ui/assets.js
  var MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", svg: "image/svg+xml", mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", mp4: "video/mp4", webm: "video/webm" };
  var mimeOf = (ext, bytes) => {
    if (bytes?.length > 12) {
      const b = bytes;
      if (b[0] === 137 && b[1] === 80) return "image/png";
      if (b[0] === 255 && b[1] === 216) return "image/jpeg";
      if (b[0] === 71 && b[1] === 73) return "image/gif";
      if (b[0] === 82 && b[1] === 73 && b[8] === 87 && b[9] === 69) return "image/webp";
      if (b[4] === 102 && b[5] === 116 && b[6] === 121 && b[7] === 112 && b[8] === 97 && b[9] === 118) return "image/avif";
    }
    return MIME[String(ext ?? "").toLowerCase()] ?? "application/octet-stream";
  };
  var isImageExt = (ext) => /^(png|jpe?g|webp|gif|avif|svg)$/i.test(String(ext ?? "")) || !ext;
  function createAssetLoader(api, { concurrency = 8, thumbSize = 240, maxBytesCache = 96 * 1024 * 1024 } = {}) {
    const inflight = /* @__PURE__ */ new Map();
    const bytes = /* @__PURE__ */ new Map();
    let cachedBytes = 0;
    const thumbs = /* @__PURE__ */ new Map();
    const thumbInflight = /* @__PURE__ */ new Map();
    const queue = [];
    let active = 0;
    const remember = (path, data) => {
      if (!data || data.length > maxBytesCache / 4) return;
      bytes.set(path, data);
      cachedBytes += data.length;
      while (cachedBytes > maxBytesCache && bytes.size) {
        const [k, v] = bytes.entries().next().value;
        bytes.delete(k);
        cachedBytes -= v.length;
      }
    };
    const pump = () => {
      while (active < concurrency && queue.length) {
        queue.sort((a, b) => b.prio - a.prio);
        const job = queue.shift();
        if (job.signal?.aborted) {
          job.resolve(null);
          continue;
        }
        active++;
        Promise.resolve().then(() => api.readImage(job.path)).then((d) => {
          const u8 = d ? d instanceof Uint8Array ? d : new Uint8Array(d) : null;
          job.resolve(u8);
        }).catch(job.reject).finally(() => {
          active--;
          pump();
        });
      }
    };
    function read(path, { prio = 0, signal } = {}) {
      if (!path) return Promise.resolve(null);
      if (path.startsWith("data:")) {
        const b642 = path.split(",")[1] ?? "";
        const bin = atob(b642);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return Promise.resolve(u8);
      }
      const hit = bytes.get(path);
      if (hit) {
        bytes.delete(path);
        bytes.set(path, hit);
        return Promise.resolve(hit);
      }
      if (inflight.has(path)) return inflight.get(path);
      const p = new Promise((resolve, reject) => {
        queue.push({ path, resolve, reject, prio, signal });
        pump();
      }).then((d) => {
        inflight.delete(path);
        if (d) remember(path, d);
        return d;
      }, (e) => {
        inflight.delete(path);
        throw e;
      });
      inflight.set(path, p);
      return p;
    }
    async function makeThumb(data, ext) {
      const type = mimeOf(ext, data);
      const blob = new Blob([data], { type });
      if (!type.startsWith("image/") || type === "image/svg+xml" || type === "image/gif" || data.length < 48 * 1024 || typeof createImageBitmap !== "function") return URL.createObjectURL(blob);
      try {
        const bmp = await createImageBitmap(blob);
        const scale = Math.min(1, thumbSize / Math.max(bmp.width, bmp.height));
        if (scale >= 1) {
          bmp.close?.();
          return URL.createObjectURL(blob);
        }
        const w = Math.max(1, Math.round(bmp.width * scale)), hgt = Math.max(1, Math.round(bmp.height * scale));
        let out;
        if (typeof OffscreenCanvas === "function") {
          const c = new OffscreenCanvas(w, hgt);
          c.getContext("2d").drawImage(bmp, 0, 0, w, hgt);
          out = await c.convertToBlob({ type: "image/webp", quality: 0.82 });
        } else {
          const c = document.createElement("canvas");
          c.width = w;
          c.height = hgt;
          c.getContext("2d").drawImage(bmp, 0, 0, w, hgt);
          out = await new Promise((r) => c.toBlob(r, "image/webp", 0.82));
        }
        bmp.close?.();
        return URL.createObjectURL(out ?? blob);
      } catch {
        return URL.createObjectURL(blob);
      }
    }
    function thumb(path, ext, opts) {
      if (thumbs.has(path)) return Promise.resolve(thumbs.get(path));
      if (thumbInflight.has(path)) return thumbInflight.get(path);
      const p = read(path, opts).then((d) => d ? makeThumb(d, ext) : null).then((url) => {
        thumbInflight.delete(path);
        if (url) thumbs.set(path, url);
        return url;
      }, (e) => {
        thumbInflight.delete(path);
        throw e;
      });
      thumbInflight.set(path, p);
      return p;
    }
    async function fullUrl(path, ext) {
      const d = await read(path, { prio: 100 });
      return d ? URL.createObjectURL(new Blob([d], { type: mimeOf(ext, d) })) : null;
    }
    function lazy(root) {
      const ctl = /* @__PURE__ */ new Map();
      const io = typeof IntersectionObserver === "function" ? new IntersectionObserver((items) => {
        for (const it of items) {
          const img = it.target;
          if (it.isIntersecting) {
            if (img.dataset.loaded) continue;
            const ac = new AbortController();
            ctl.set(img, ac);
            const prio = 50 - Math.min(49, Math.abs(it.boundingClientRect.top - (it.rootBounds?.top ?? 0)) / 100);
            thumb(img.dataset.path, img.dataset.ext, { prio, signal: ac.signal }).then((url) => {
              if (!url) {
                if (!ac.signal.aborted) img.dataset.failed = "1";
                return;
              }
              img.src = url;
              img.dataset.loaded = "1";
              io.unobserve(img);
            }).catch(() => {
              img.dataset.failed = "1";
            });
          } else {
            ctl.get(img)?.abort();
            ctl.delete(img);
          }
        }
      }, { root, rootMargin: "300px 0px" }) : null;
      return {
        observe(img) {
          const u = thumbs.get(img.dataset.path);
          if (u) {
            img.src = u;
            img.dataset.loaded = "1";
            return;
          }
          if (io) io.observe(img);
          else thumb(img.dataset.path, img.dataset.ext).then((u2) => {
            if (u2) img.src = u2;
          });
        },
        disconnect() {
          io?.disconnect();
          for (const a of ctl.values()) a.abort();
          ctl.clear();
        }
      };
    }
    function forget(path) {
      const u = thumbs.get(path);
      if (u) URL.revokeObjectURL(u);
      thumbs.delete(path);
      const b = bytes.get(path);
      if (b) {
        cachedBytes -= b.length;
        bytes.delete(path);
      }
    }
    return { read, thumb, fullUrl, lazy, forget, peek: (p) => thumbs.get(p), stats: () => ({ active, queued: queue.length, cachedBytes, thumbs: thumbs.size }) };
  }

  // src/data/assetfolders.js
  function foldersOf(f) {
    return { _folders: Array.isArray(f?._folders) ? f._folders.filter((x) => x && x.id && x.name).map((x) => ({ ...x })) : [], _mapping: f?._mapping && typeof f._mapping === "object" ? { ...f._mapping } : {} };
  }
  var parentOf = (name) => name.includes("/") ? name.slice(0, name.lastIndexOf("/")) : "";
  var leaf = (name) => name.split("/").pop();
  function childFolders(fd, parentId) {
    const parent = parentId ? fd._folders.find((f) => f.id === parentId) : null;
    const pname = parent?.name ?? "";
    return fd._folders.filter((f) => parentOf(f.name) === pname).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }
  function folderPath(fd, id) {
    const f = fd._folders.find((x) => x.id === id);
    if (!f) return [];
    const parts = f.name.split("/");
    return parts.map((_, i) => fd._folders.find((x) => x.name === parts.slice(0, i + 1).join("/"))).filter(Boolean);
  }
  function createFolder(fd, name, parentId) {
    const clean = String(name).replace(/\//g, "／").trim();
    if (!clean) throw new Error("폴더 이름을 입력해 주세요");
    const parent = parentId ? fd._folders.find((f2) => f2.id === parentId) : null;
    const full = parent ? `${parent.name}/${clean}` : clean;
    if (fd._folders.some((f2) => f2.name.toLowerCase() === full.toLowerCase())) throw new Error("같은 이름의 폴더가 있어요");
    const siblings = childFolders(fd, parentId);
    const f = { id: "af_" + newId().slice(0, 8), name: full, order: siblings.reduce((m, x) => Math.max(m, x.order ?? 0), -1) + 1 };
    fd._folders.push(f);
    return f;
  }
  function renameFolder(fd, id, name) {
    const f = fd._folders.find((x) => x.id === id);
    if (!f) return;
    const clean = String(name).replace(/\//g, "／").trim();
    if (!clean) return;
    const old = f.name, next = (parentOf(old) ? parentOf(old) + "/" : "") + clean;
    if (fd._folders.some((x) => x !== f && x.name.toLowerCase() === next.toLowerCase())) throw new Error("같은 이름의 폴더가 있어요");
    for (const x of fd._folders) if (x === f) x.name = next;
    else if (x.name.startsWith(old + "/")) x.name = next + x.name.slice(old.length);
  }
  function deleteFolder(fd, id) {
    const f = fd._folders.find((x) => x.id === id);
    if (!f) return;
    const gone = new Set(fd._folders.filter((x) => x === f || x.name.startsWith(f.name + "/")).map((x) => x.id));
    fd._folders = fd._folders.filter((x) => !gone.has(x.id));
    for (const [k, v] of Object.entries(fd._mapping)) if (gone.has(v)) delete fd._mapping[k];
  }
  function inFolder(fd, assetName, folderId) {
    const v = fd._mapping[assetName] ?? null;
    if (folderId === null) return true;
    if (folderId === "uncategorized") return !v || !fd._folders.some((f) => f.id === v);
    return v === folderId;
  }
  function setAssetFolder(fd, names, folderId) {
    for (const n of [].concat(names)) {
      if (folderId) fd._mapping[n] = folderId;
      else delete fd._mapping[n];
    }
  }
  function renameMapping(fd, oldName, newName) {
    if (oldName === newName || !(oldName in fd._mapping)) return;
    fd._mapping[newName] = fd._mapping[oldName];
    delete fd._mapping[oldName];
  }
  var isEmpty = (fd) => !fd._folders.length && !Object.keys(fd._mapping).length;

  // src/engine/image.js
  var be32 = (b, o) => (b[o] << 24 | b[o + 1] << 16 | b[o + 2] << 8 | b[o + 3]) >>> 0;
  var isPng = (b) => b?.length > 8 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71;
  var isJpeg = (b) => b?.length > 3 && b[0] === 255 && b[1] === 216;
  var isWebp = (b) => b?.length > 12 && b[0] === 82 && b[1] === 73 && b[8] === 87 && b[9] === 69;
  var formatOf = (b) => isPng(b) ? "png" : isJpeg(b) ? "jpeg" : isWebp(b) ? "webp" : b?.[0] === 71 && b?.[1] === 73 ? "gif" : b?.[4] === 102 && b?.[8] === 97 && b?.[9] === 118 ? "avif" : "unknown";
  function imageSize(b) {
    try {
      if (isPng(b)) return { w: be32(b, 16), h: be32(b, 20) };
      if (isJpeg(b)) {
        let p = 2;
        while (p + 9 < b.length) {
          if (b[p] !== 255) {
            p++;
            continue;
          }
          const m = b[p + 1], len = b[p + 2] << 8 | b[p + 3];
          if (m >= 192 && m <= 207 && ![196, 200, 204].includes(m)) return { w: b[p + 7] << 8 | b[p + 8], h: b[p + 5] << 8 | b[p + 6] };
          p += 2 + len;
        }
      }
      if (isWebp(b)) {
        const t = String.fromCharCode(b[12], b[13], b[14], b[15]);
        if (t === "VP8X") return { w: 1 + (b[24] | b[25] << 8 | b[26] << 16), h: 1 + (b[27] | b[28] << 8 | b[29] << 16) };
        if (t === "VP8 ") return { w: (b[26] | b[27] << 8) & 16383, h: (b[28] | b[29] << 8) & 16383 };
        if (t === "VP8L") {
          const v = b[21] | b[22] << 8 | b[23] << 16 | b[24] << 24;
          return { w: (v & 16383) + 1, h: (v >> 14 & 16383) + 1 };
        }
      }
    } catch {
    }
    return null;
  }
  function readMetadata(b) {
    const out = [];
    const dec = new TextDecoder("latin1"), utf = new TextDecoder();
    if (isPng(b)) {
      let p = 8;
      while (p + 12 <= b.length) {
        const len = be32(b, p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
        const data = b.subarray(p + 8, p + 8 + len);
        if (type === "tEXt" || type === "iTXt" || type === "zTXt") {
          const z = data.indexOf(0);
          const key = dec.decode(data.subarray(0, z));
          let value = "";
          if (type === "tEXt") value = dec.decode(data.subarray(z + 1));
          else if (type === "iTXt") {
            let q = z + 3;
            q = data.indexOf(0, q) + 1;
            q = data.indexOf(0, q) + 1;
            value = utf.decode(data.subarray(q));
          } else value = "(압축된 텍스트)";
          out.push({ kind: type, key, value: value.length > 2e3 ? value.slice(0, 2e3) + "…" : value, size: len });
        } else if (type === "eXIf") out.push({ kind: "EXIF", key: "eXIf", value: `${len} 바이트`, size: len });
        if (type === "IEND") break;
        p += 12 + len;
      }
    } else if (isJpeg(b)) {
      let p = 2;
      while (p + 4 < b.length && b[p] === 255) {
        const m = b[p + 1];
        if (m === 218 || m === 217) break;
        const len = b[p + 2] << 8 | b[p + 3];
        const seg = b.subarray(p + 4, p + 2 + len);
        if (m === 225) {
          const head = dec.decode(seg.subarray(0, 30));
          out.push({ kind: head.startsWith("Exif") ? "EXIF" : "XMP", key: head.startsWith("Exif") ? "Exif" : "XMP", value: head.startsWith("Exif") ? `${len} 바이트` : utf.decode(seg).slice(0, 2e3), size: len });
        } else if (m === 254) out.push({ kind: "COM", key: "주석", value: utf.decode(seg), size: len });
        else if (m >= 226 && m <= 239) out.push({ kind: `APP${m - 224}`, key: dec.decode(seg.subarray(0, 12)).replace(/\0.*$/, ""), value: `${len} 바이트`, size: len });
        p += 2 + len;
      }
    } else if (isWebp(b)) {
      let p = 12;
      while (p + 8 <= b.length) {
        const t = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]), len = b[p + 4] | b[p + 5] << 8 | b[p + 6] << 16 | b[p + 7] << 24;
        if (t === "EXIF" || t === "XMP ") out.push({ kind: t.trim(), key: t.trim(), value: t === "XMP " ? utf.decode(b.subarray(p + 8, p + 8 + len)).slice(0, 2e3) : `${len} 바이트`, size: len });
        p += 8 + len + (len & 1);
      }
    }
    return out;
  }
  function stripMetadata(b, { keepKeys = [] } = {}) {
    if (isPng(b)) {
      const parts = [b.subarray(0, 8)];
      let p = 8;
      while (p + 12 <= b.length) {
        const len = be32(b, p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
        const chunk = b.subarray(p, p + 12 + len);
        let keep = !["tEXt", "iTXt", "zTXt", "eXIf", "tIME"].includes(type);
        if (!keep && keepKeys.length && type !== "eXIf") {
          const d = b.subarray(p + 8, p + 8 + len);
          const key = new TextDecoder("latin1").decode(d.subarray(0, d.indexOf(0)));
          keep = keepKeys.includes(key);
        }
        if (keep) parts.push(chunk);
        p += 12 + len;
        if (type === "IEND") break;
      }
      return concat(parts);
    }
    if (isJpeg(b)) {
      const parts = [b.subarray(0, 2)];
      let p = 2;
      while (p + 4 < b.length && b[p] === 255) {
        const m = b[p + 1];
        if (m === 218) {
          parts.push(b.subarray(p));
          return concat(parts);
        }
        const len = b[p + 2] << 8 | b[p + 3];
        const keep = !(m === 225 || m === 254 || m >= 227 && m <= 239);
        if (keep) parts.push(b.subarray(p, p + 2 + len));
        p += 2 + len;
      }
      parts.push(b.subarray(p));
      return concat(parts);
    }
    if (isWebp(b)) {
      const parts = [];
      let p = 12, flagsAt = -1;
      while (p + 8 <= b.length) {
        const t = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]), len = b[p + 4] | b[p + 5] << 8 | b[p + 6] << 16 | b[p + 7] << 24;
        const total = 8 + len + (len & 1);
        if (t !== "EXIF" && t !== "XMP ") {
          if (t === "VP8X") flagsAt = parts.reduce((s, x) => s + x.length, 12) + 8;
          parts.push(b.slice(p, p + total));
        }
        p += total;
      }
      const body = concat([b.subarray(0, 12), ...parts]);
      new DataView(body.buffer, body.byteOffset).setUint32(4, body.length - 8, true);
      if (flagsAt > 0) body[flagsAt] &= ~12;
      return body;
    }
    return b;
  }
  function concat(parts) {
    const n = parts.reduce((s, x) => s + x.length, 0);
    const out = new Uint8Array(n);
    let o = 0;
    for (const x of parts) {
      out.set(x, o);
      o += x.length;
    }
    return out;
  }
  var avifOk = null;
  async function canEncode(format) {
    if (format !== "avif") return typeof OffscreenCanvas === "function" || typeof document !== "undefined";
    if (avifOk !== null) return avifOk;
    try {
      const c = new OffscreenCanvas(2, 2);
      c.getContext("2d").fillRect(0, 0, 1, 1);
      const b = await c.convertToBlob({ type: "image/avif", quality: 0.8 });
      avifOk = b.type === "image/avif";
    } catch {
      avifOk = false;
    }
    return avifOk;
  }
  async function convertImage(bytes, { format = "webp", quality = 0.85, maxSide = 0 } = {}) {
    const bmp = await createImageBitmap(new Blob([bytes]));
    let w = bmp.width, hgt = bmp.height;
    if (maxSide && Math.max(w, hgt) > maxSide) {
      const s = maxSide / Math.max(w, hgt);
      w = Math.round(w * s);
      hgt = Math.round(hgt * s);
    }
    const c = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(w, hgt) : Object.assign(document.createElement("canvas"), { width: w, height: hgt });
    c.getContext("2d").drawImage(bmp, 0, 0, w, hgt);
    bmp.close?.();
    const type = `image/${format}`;
    const blob = c.convertToBlob ? await c.convertToBlob({ type, quality }) : await new Promise((r) => c.toBlob(r, type, quality));
    if (!blob || blob.type !== type) throw new Error(`이 브라우저는 ${format.toUpperCase()} 저장을 지원하지 않아요`);
    return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h: hgt };
  }

  // src/ui/screens/assetmgr.js
  var PAGE = 240;
  var extOf = (name) => {
    const m = /\.([a-z0-9]+)$/i.exec(name);
    return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "png";
  };
  var stemOf = (name) => name.replace(/\.[a-z0-9]+$/i, "");
  var COARSE = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  async function openAssets(ctx, id) {
    const data = await ctx.svc.load({ fresh: true });
    const entry2 = data.entries.find((e) => e.module.id === id);
    if (!entry2) {
      ctx.toast("모듈을 찾지 못했어요", { error: true });
      return;
    }
    let mod = structuredClone(entry2.module), backedUp = false;
    return openAssetsCore(ctx, {
      name: mod.name,
      label: "에셋 관리",
      assets: (mod.assets ?? []).map((a) => [String(a[0] ?? ""), String(a[1] ?? ""), String(a[2] ?? "")]),
      folders: foldersOf(ctx.prefs.meta.moduleAssetFolders?.[mod.id]),
      async save(nextAssets, nextFd, note2) {
        if (!backedUp) {
          await createStore(ctx.api).addBackup({ kind: "module", target: mod.id, name: mod.name, snapshot: mod, note: "에셋 관리 전", summary: note2 }).catch(() => null);
          backedUp = true;
        }
        if (JSON.stringify(nextAssets) !== JSON.stringify(mod.assets ?? [])) await ctx.svc.run("update", mod.id, { assets: nextAssets });
        await ctx.svc.meta((m) => {
          m.moduleAssetFolders ??= {};
          if (isEmpty(nextFd)) delete m.moduleAssetFolders[mod.id];
          else m.moduleAssetFolders[mod.id] = nextFd;
        });
        mod = { ...mod, assets: nextAssets.map((a) => [...a]) };
        reload(ctx).catch(() => {
        });
      }
    });
  }
  async function openAssetsCore(ctx, src) {
    const mod = { name: src.name };
    let assets = src.assets;
    let fd = src.folders;
    const as = { folder: null, q: "", sel: /* @__PURE__ */ new Set(), focus: null, shown: PAGE, busy: false };
    const keyOf3 = (a) => a[1] + "\0" + a[0];
    const panel = h("div", { class: "rb-full", role: "dialog", "aria-label": `${mod.name} 에셋` });
    const titleB = h("b", null, mod.name);
    const subT = h("small", null, src.label ?? "에셋 관리");
    const head = h(
      "div",
      { class: "rb-full-head" },
      iconBtn("back", "닫기", { onClick: () => close() }),
      h("div", { class: "ttl" }, subT, titleB),
      btn("이미지 추가", { kind: "primary", icon: "plus", onClick: () => addFiles() })
    );
    const bar = h("div", { class: "rb-side-tools", style: "border-bottom:1px solid var(--rb-line2);padding:10px 16px" });
    const folderBar = h("div", { class: "rb-folders", style: "padding:10px 16px 0" });
    const grid = h("div", { class: "rb-grid" });
    const gridWrap = h("div", { class: "rb-scroll", style: "flex:1;overflow:auto;padding:12px 16px 24px;position:relative" }, grid);
    const info = h("aside", { class: "rb-scroll rb-am-info", style: "width:320px;flex-shrink:0;border-left:1px solid var(--rb-line2);padding:16px;display:flex;flex-direction:column;gap:14px;overflow:auto" });
    const main = h("div", { style: "flex:1;min-width:0;display:flex;flex-direction:column" }, folderBar, bar, gridWrap);
    const bodyEl = h("div", { class: "rb-split" }, main, info);
    panel.append(head, bodyEl);
    ctx.win.appendChild(panel);
    let lazy = ctx.assets.lazy(gridWrap);
    panel.addEventListener("dragover", (ev) => {
      if ([...ev.dataTransfer?.types ?? []].includes("Files")) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    });
    panel.addEventListener("drop", (ev) => {
      if (!ev.dataTransfer?.files?.length) return;
      ev.preventDefault();
      ev.stopPropagation();
      addFiles([...ev.dataTransfer.files]);
    });
    panel.addEventListener("dragenter", (ev) => ev.stopPropagation());
    panel.addEventListener("keydown", (ev) => {
      if (ctx.win.querySelector(".rb-modal, .rb-menu")) return;
      if (ev.key === "Escape") {
        ev.stopPropagation();
        if (ctx.win.querySelector(".rb-lightbox")) return;
        if (as.sel.size) {
          as.sel.clear();
          paint();
        } else close();
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "a" && ev.target.tagName !== "INPUT") {
        ev.preventDefault();
        visible().forEach((a) => as.sel.add(keyOf3(a)));
        paint();
      }
      if (ev.key === "Delete" && as.sel.size && ev.target.tagName !== "INPUT") removeSelected();
    });
    const visible = () => {
      const q = as.q.trim().toLowerCase();
      return assets.filter((a) => inFolder(fd, a[0], as.folder) && (!q || a[0].toLowerCase().includes(q)));
    };
    const selected = () => assets.filter((a) => as.sel.has(keyOf3(a)));
    async function save(nextAssets, nextFd, note2) {
      as.busy = true;
      try {
        await src.save(nextAssets, nextFd, note2);
        assets = nextAssets;
        fd = nextFd;
      } finally {
        as.busy = false;
      }
    }
    const saveFolders = async (nextFd) => {
      await save(assets, nextFd, "에셋 폴더 변경 전");
      paint();
    };
    function paint() {
      paintFolders();
      paintBar3();
      paintGrid();
      paintInfo();
      subT.textContent = `${src.label ?? "에셋 관리"} · ${assets.length}개${as.sel.size ? ` · ${as.sel.size}개 선택` : ""}`;
    }
    function paintFolders() {
      const count = (fid) => assets.filter((a) => inFolder(fd, a[0], fid)).length;
      const chipEl = (label, fid, extra) => h(
        "button",
        { type: "button", class: "rb-chip", "aria-pressed": as.folder === fid ? "true" : "false", dataset: { folder: fid ?? "" }, onClick: () => {
          as.folder = fid;
          as.shown = PAGE;
          paint();
        } },
        extra ?? null,
        label,
        h("small", null, String(count(fid)))
      );
      const cur = as.folder && as.folder !== "uncategorized" ? as.folder : null;
      const crumbs = cur ? folderPath(fd, cur) : [];
      const kids = childFolders(fd, cur);
      const folderChips = kids.map((f) => {
        const c = chipEl(leaf(f.name), f.id, icon("folder", 14));
        dropAssets(c, f.id);
        return c;
      });
      replace(
        folderBar,
        chipEl("전체", null),
        chipEl("미분류", "uncategorized"),
        crumbs.length ? h("span", { class: "rb-muted" }, "›") : null,
        crumbs.slice(0, -1).map((f) => [chipEl(leaf(f.name), f.id, icon("folder", 14)), h("span", { class: "rb-muted" }, "›")]),
        crumbs.length ? chipEl(leaf(crumbs.at(-1).name), crumbs.at(-1).id, icon("folder", 14)) : null,
        folderChips,
        btn("폴더", { size: "sm", kind: "ghost", icon: "folderPlus", onClick: async () => {
          const n = await promptDialog(ctx.win, { title: cur ? `'${leaf(crumbs.at(-1).name)}' 안에 새 폴더` : "새 폴더", label: "폴더 이름" });
          if (!n?.trim()) return;
          try {
            const next = structuredClone(fd);
            createFolder(next, n, cur);
            await saveFolders(next);
          } catch (e) {
            ctx.toast(e.message, { error: true });
          }
        } }),
        cur ? iconBtn("more", "이 폴더 메뉴", { onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
          { label: "이름 바꾸기", icon: "edit", onClick: async () => {
            const f = fd._folders.find((x) => x.id === cur);
            const n = await promptDialog(ctx.win, { title: "폴더 이름", value: leaf(f.name) });
            if (!n?.trim()) return;
            try {
              const next = structuredClone(fd);
              renameFolder(next, cur, n);
              await saveFolders(next);
            } catch (e) {
              ctx.toast(e.message, { error: true });
            }
          } },
          { label: "폴더 삭제 (에셋은 남음)", icon: "trash", danger: true, onClick: async () => {
            if (!await confirmDialog(ctx.win, { title: "이 폴더를 지울까요?", body: '하위 폴더도 함께 지워지고, 안의 에셋은 "미분류"로 가요.', ok: "삭제", danger: true })) return;
            const next = structuredClone(fd);
            deleteFolder(next, cur);
            as.folder = null;
            await saveFolders(next);
          } }
        ]) }) : null
      );
    }
    function paintBar3() {
      const search = h("input", { class: "rb-input", style: "height:36px;flex:1;min-width:140px;max-width:320px", placeholder: "이름으로 찾기", value: as.q, "aria-label": "에셋 찾기" });
      search.addEventListener("input", () => {
        as.q = search.value;
        as.shown = PAGE;
        paintGrid();
      });
      const n = as.sel.size;
      replace(
        bar,
        search,
        btn(n ? "선택 해제" : "모두 선택", { size: "sm", onClick: () => {
          if (n) as.sel.clear();
          else visible().forEach((a) => as.sel.add(keyOf3(a)));
          paint();
        } }),
        h("div", { class: "rb-spacer" }),
        n ? [
          btn("폴더로", { size: "sm", icon: "folder", onClick: (ev) => moveMenu(ev.currentTarget) }),
          btn("내려받기", { size: "sm", icon: "download", onClick: () => downloadAssets(selected()) }),
          btn("최적화", { size: "sm", icon: "image", onClick: () => optimize(selected()) }),
          btn("일괄 교체", { size: "sm", icon: "refresh", onClick: () => batchReplace(selected()) }),
          iconBtn("more", "더 보기", { onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
            { label: "메타데이터 지우기", icon: "x", onClick: () => stripSelected() },
            { label: "삭제", icon: "trash", danger: true, onClick: () => removeSelected() }
          ]) })
        ] : [
          btn("일괄 교체", { size: "sm", icon: "refresh", onClick: () => batchReplace(visible()) }),
          btn("ZIP 받기", { size: "sm", icon: "download", onClick: () => downloadAssets(visible()) })
        ]
      );
    }
    function paintGrid() {
      lazy.disconnect();
      lazy = ctx.assets.lazy(gridWrap);
      const list = visible();
      const tiles = list.slice(0, as.shown).map((a) => tile2(a));
      replace(grid, tiles);
      if (!list.length) grid.appendChild(h("div", { class: "rb-empty", style: "grid-column:1/-1" }, assets.length ? "이 폴더에 에셋이 없어요." : '에셋이 없어요. 이미지를 끌어다 놓거나 "이미지 추가"를 누르세요.'));
      if (list.length > as.shown) {
        const more = h("div", { style: "grid-column:1/-1;display:flex;justify-content:center;padding:12px" }, btn(`더 보기 (${list.length - as.shown}개 남음)`, { size: "sm", onClick: () => {
          as.shown += PAGE * 2;
          paintGrid();
        } }));
        grid.appendChild(more);
        if (typeof IntersectionObserver === "function") {
          const io = new IntersectionObserver((es) => {
            if (es.some((e) => e.isIntersecting)) {
              io.disconnect();
              as.shown += PAGE;
              paintGrid();
            }
          }, { root: gridWrap, rootMargin: "600px 0px" });
          io.observe(more);
        }
      }
    }
    let lastClicked = null;
    function tile2(a) {
      const k = keyOf3(a), isSel = as.sel.has(k);
      const img = isImageExt(a[2]) ? h("img", { alt: "", loading: "lazy", decoding: "async", dataset: { path: a[1], ext: a[2] }, draggable: "false" }) : null;
      const el = h(
        "button",
        {
          type: "button",
          class: "rb-tile",
          "aria-selected": isSel ? "true" : "false",
          title: a[0],
          draggable: COARSE ? "false" : "true",
          onClick: (ev) => {
            if (ev.shiftKey && lastClicked) {
              const list = visible();
              const i = list.findIndex((x) => keyOf3(x) === lastClicked), j = list.findIndex((x) => keyOf3(x) === k);
              for (let x = Math.min(i, j); x <= Math.max(i, j); x++) as.sel.add(keyOf3(list[x]));
            } else if (ev.ctrlKey || ev.metaKey || as.sel.size || ev.target.closest?.(".sel")) {
              if (as.sel.has(k)) as.sel.delete(k);
              else as.sel.add(k);
            }
            as.focus = k;
            lastClicked = k;
            paintBar3();
            paintInfo();
            subT.textContent = `${src.label ?? "에셋 관리"} · ${assets.length}개${as.sel.size ? ` · ${as.sel.size}개 선택` : ""}`;
            grid.querySelectorAll(".rb-tile").forEach((t) => t.setAttribute("aria-selected", "false"));
            for (const t of grid.querySelectorAll(".rb-tile")) if (as.sel.has(t.dataset.key) || !as.sel.size && t.dataset.key === as.focus) t.setAttribute("aria-selected", "true");
          },
          onDblclick: () => lightbox(a),
          dataset: { key: k }
        },
        h("span", { class: "sel", "aria-hidden": "true" }, isSel ? icon("check", 14) : null),
        h("span", { class: "img" }, img ?? icon(/^(mp3|ogg|wav)$/i.test(a[2]) ? "info" : "image", 28)),
        h("span", { class: "cap" }, a[0] || "(이름 없음)", h("small", null, (a[2] || "?").toUpperCase()))
      );
      el.addEventListener("dragstart", (ev) => {
        if (!as.sel.has(k)) {
          as.sel.clear();
          as.sel.add(k);
        }
        ev.dataTransfer.setData("text/x-rbm-assets", "1");
        ev.dataTransfer.effectAllowed = "move";
      });
      if (img) lazy.observe(img);
      return el;
    }
    function dropAssets(el, folderId) {
      el.addEventListener("dragover", (ev) => {
        if ([...ev.dataTransfer?.types ?? []].includes("text/x-rbm-assets")) {
          ev.preventDefault();
          el.style.boxShadow = "inset 0 0 0 2px var(--rb-sel-ring)";
        }
      });
      el.addEventListener("dragleave", () => {
        el.style.boxShadow = "";
      });
      el.addEventListener("drop", async (ev) => {
        if (![...ev.dataTransfer?.types ?? []].includes("text/x-rbm-assets")) return;
        ev.preventDefault();
        ev.stopPropagation();
        el.style.boxShadow = "";
        await moveTo(folderId);
      });
    }
    async function moveTo(folderId) {
      const next = structuredClone(fd);
      const names = selected().map((a) => a[0]);
      setAssetFolder(next, names, folderId);
      await save(assets, next, "에셋 이동 전");
      as.sel.clear();
      ctx.toast(`${names.length}개를 옮겼어요`);
      paint();
    }
    function moveMenu(anchor) {
      openMenu(ctx.win, anchor, [
        ...fd._folders.slice().sort((a, b) => a.name.localeCompare(b.name)).map((f) => ({ label: f.name.replace(/\//g, " › "), icon: "folder", onClick: () => moveTo(f.id) })),
        fd._folders.length ? "sep" : null,
        { label: "미분류로", icon: "x", onClick: () => moveTo(null) }
      ].filter(Boolean));
    }
    async function paintInfo() {
      const sel = selected();
      const a = sel.length === 1 ? sel[0] : !sel.length && as.focus ? assets.find((x) => keyOf3(x) === as.focus) : null;
      info.classList.toggle("none", !a && !sel.length);
      if (!a) {
        const total = sel.length ? sel : visible();
        replace(
          info,
          h("h3", { class: "rb-h3" }, sel.length ? `${sel.length}개 선택` : "에셋"),
          h("p", { class: "rb-p" }, sel.length ? "위쪽 도구로 한꺼번에 옮기거나 내려받고, 최적화·교체·삭제할 수 있어요." : "눌러서 고르고, 두 번 누르면 크게 봐요. Ctrl·Shift로 여러 개 고를 수 있어요. 고른 것을 폴더 칩으로 끌어 옮길 수도 있어요."),
          h("div", { class: "rb-stats" }, h("div", { class: "rb-stat" }, h("small", null, "개수"), h("b", null, String(total.length))), h("div", { class: "rb-stat" }, h("small", null, "폴더"), h("b", null, String(fd._folders.length)))),
          note("info", '바꾸면 바로 저장돼요. 바꾸기 전 상태는 "기록" 탭에 백업돼요.')
        );
        return;
      }
      const thumb = h("img", { alt: a[0], class: "rb-am-thumb", style: "width:100%;max-height:260px;object-fit:contain;border-radius:12px;background:var(--rb-surf2)" });
      const metaBox = h("div", { class: "rb-card" }, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "읽는 중…")));
      replace(
        info,
        isImageExt(a[2]) ? h("button", { type: "button", style: "border:0;padding:0;background:none;cursor:zoom-in", "aria-label": "크게 보기", onClick: () => lightbox(a) }, thumb) : null,
        h("div", { style: "display:flex;flex-direction:column;gap:2px" }, h("h3", { class: "rb-h3", style: "word-break:break-all" }, a[0] || "(이름 없음)"), h("span", { class: "rb-muted", style: "word-break:break-all" }, a[1])),
        metaBox,
        h(
          "div",
          { style: "display:flex;gap:6px;flex-wrap:wrap" },
          btn("이름", { size: "sm", icon: "edit", onClick: () => renameAsset(a) }),
          btn("교체", { size: "sm", icon: "refresh", onClick: () => replaceOne(a) }),
          btn("받기", { size: "sm", icon: "download", onClick: () => downloadAssets([a]) }),
          btn("삭제", { size: "sm", kind: "danger", icon: "trash", onClick: () => {
            as.sel = /* @__PURE__ */ new Set([keyOf3(a)]);
            removeSelected();
          } })
        )
      );
      ctx.assets.thumb(a[1], a[2], { prio: 90 }).then((u) => {
        if (u) thumb.src = u;
      }).catch(() => {
      });
      try {
        const bytes = await ctx.assets.read(a[1], { prio: 80 });
        if (!bytes) throw new Error("없음");
        const size = imageSize(bytes), md = readMetadata(bytes);
        replace(
          metaBox,
          h("div", { class: "rb-kv" }, h("span", null, "형식"), h("span", null, formatOf(bytes).toUpperCase())),
          h("div", { class: "rb-kv" }, h("span", null, "크기"), h("span", null, fmtBytes(bytes.length))),
          size ? h("div", { class: "rb-kv" }, h("span", null, "해상도"), h("span", null, `${size.w} × ${size.h}`)) : null,
          h("div", { class: "rb-kv" }, h("span", null, "폴더"), h("span", null, fd._folders.find((f) => f.id === fd._mapping[a[0]])?.name.replace(/\//g, " › ") ?? "미분류")),
          h("div", { class: "rb-kv" }, h("span", null, "메타데이터"), h("span", null, md.length ? `${md.length}개` : "없음")),
          md.length ? h(
            "details",
            { style: "padding:0 14px 12px" },
            h("summary", { class: "rb-muted", style: "cursor:pointer;padding:6px 0" }, "자세히 보기"),
            md.map((m) => h("div", { style: "font-size:12px;padding:6px 0;border-top:1px solid var(--rb-line2)" }, h("b", null, `${m.kind} · ${m.key}`), h("div", { style: "white-space:pre-wrap;word-break:break-all;color:var(--rb-sub);max-height:160px;overflow:auto" }, m.value))),
            btn("메타데이터 지우기", { size: "sm", onClick: () => {
              as.sel = /* @__PURE__ */ new Set([keyOf3(a)]);
              stripSelected();
            } })
          ) : null
        );
      } catch {
        replace(metaBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "서버에서 파일을 읽지 못했어요 (지워졌을 수 있어요)")));
      }
    }
    const uniqueName = (base, taken) => {
      let n = base || "image", i = 2;
      const t = new Set([...taken].map((x) => x.toLowerCase()));
      while (t.has(n.toLowerCase())) n = `${base}_${i++}`;
      return n;
    };
    async function uploadMany(files, onEach) {
      const out = new Array(files.length);
      let next = 0, done = 0;
      const t = ctx.toast(`올리는 중 0/${files.length}`, { seconds: 600 });
      const span = t && ctx.win.querySelector(".rb-toasts .rb-toast:last-child span");
      const worker = async () => {
        while (next < files.length) {
          const i = next++;
          const f = files[i];
          const bytes = f instanceof Uint8Array ? f : new Uint8Array(await f.arrayBuffer());
          const size = bytes.length;
          let path, err;
          for (let attempt = 0; attempt < 3 && !path; attempt++) {
            try {
              path = await ctx.api.saveAsset(bytes.slice());
            } catch (e) {
              err = e;
              await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
            }
          }
          if (!path) {
            t.close();
            throw new Error(`올리지 못했어요: ${err?.message ?? err}`);
          }
          out[i] = { path, size };
          done++;
          if (span) span.textContent = `올리는 중 ${done}/${files.length}`;
          onEach?.(i, path);
        }
      };
      await Promise.all(Array.from({ length: Math.min(6, files.length) }, worker));
      t.close();
      return out;
    }
    async function addFiles(files) {
      files ??= await pickFiles({ accept: "image/*,audio/*,video/*", multiple: true });
      if (!files?.length) return;
      try {
        const up = await uploadMany(files);
        const taken = new Set(assets.map((a) => a[0]));
        const added = files.map((f, i) => {
          const n = uniqueName(stemOf(f.name), taken);
          taken.add(n);
          return [n, up[i].path, extOf(f.name)];
        });
        const next = structuredClone(fd);
        const target = as.folder && as.folder !== "uncategorized" ? as.folder : null;
        if (target) setAssetFolder(next, added.map((a) => a[0]), target);
        await save([...assets, ...added], next, "에셋 추가 전");
        ctx.toast(`${added.length}개를 추가했어요`);
        paint();
      } catch (e) {
        ctx.toast(e?.message ?? String(e), { error: true });
      }
    }
    async function renameAsset(a) {
      const n = await promptDialog(ctx.win, { title: "에셋 이름", label: "{{asset::이름}}처럼 이 이름으로 불러와요", value: a[0] });
      if (n === null || n.trim() === a[0]) return;
      const name = n.trim();
      if (!name) return;
      if (assets.some((x) => x !== a && x[0].toLowerCase() === name.toLowerCase()) && !await confirmDialog(ctx.win, { title: "같은 이름이 있어요", body: "그래도 바꿀까요? 같은 이름이면 앞쪽 것만 불러와질 수 있어요.", ok: "바꾸기" })) return;
      const nextFd = structuredClone(fd);
      renameMapping(nextFd, a[0], name);
      const next = assets.map((x) => x === a ? [name, x[1], x[2]] : x);
      await save(next, nextFd, "이름 바꾸기 전");
      as.focus = keyOf3([name, a[1]]);
      paint();
    }
    async function replaceOne(a) {
      const [f] = await pickFiles({ accept: "image/*,audio/*,video/*" });
      if (!f) return;
      try {
        const [up] = await uploadMany([f]);
        const next = assets.map((x) => x === a ? [x[0], up.path, extOf(f.name)] : x);
        await save(next, fd, "이미지 교체 전");
        ctx.assets.forget(a[1]);
        as.focus = keyOf3([a[0], up.path]);
        as.sel.clear();
        ctx.toast("바꿨어요", { action: { label: "되돌리기", run: () => undoTo(a, (x) => x[0] === a[0] && x[1] === up.path) }, seconds: 10 });
        paint();
      } catch (e) {
        ctx.toast(e?.message ?? String(e), { error: true });
      }
    }
    async function undoTo(oldAsset, match) {
      const next = assets.map((x) => match(x) ? [...oldAsset] : x);
      await save(next, fd, "되돌리기 전");
      paint();
    }
    async function removeSelected() {
      const sel = selected();
      if (!sel.length) return;
      if (!await confirmDialog(ctx.win, { title: `에셋 ${sel.length}개를 지울까요?`, body: "모듈 목록에서 빠져요. 바꾸기 전 상태는 백업돼요.", ok: "삭제", danger: true })) return;
      const before = assets, beforeFd = fd;
      const gone = new Set(sel.map(keyOf3));
      const nextFd = structuredClone(fd);
      for (const a of sel) if (!assets.some((x) => !gone.has(keyOf3(x)) && x[0] === a[0])) delete nextFd._mapping[a[0]];
      await save(assets.filter((a) => !gone.has(keyOf3(a))), nextFd, "에셋 삭제 전");
      as.sel.clear();
      as.focus = null;
      ctx.toast(`${sel.length}개를 지웠어요`, { action: { label: "되돌리기", run: async () => {
        await save(before, beforeFd, "삭제 되돌리기 전");
        paint();
      } }, seconds: 10 });
      paint();
    }
    async function downloadAssets(list) {
      if (!list.length) return;
      if (list.length === 1) {
        const d = await ctx.assets.read(list[0][1], { prio: 100 });
        if (!d) {
          ctx.toast("파일을 읽지 못했어요", { error: true });
          return;
        }
        download(`${safeFileName(list[0][0])}.${list[0][2] || "png"}`, new Blob([d], { type: mimeOf(list[0][2], d) }));
        return;
      }
      const t = ctx.toast(`ZIP 만드는 중 0/${list.length}`, { seconds: 600 });
      try {
        const zip = createZip();
        let i = 0;
        await Promise.all(Array.from({ length: 6 }, async () => {
          while (i < list.length) {
            const a = list[i++];
            const d = await ctx.assets.read(a[1]);
            if (!d) continue;
            const folder = fd._folders.find((f) => f.id === fd._mapping[a[0]])?.name;
            zip.add(`${folder ? folder.split("/").map(safeFileName).join("/") + "/" : ""}${safeFileName(a[0])}.${a[2] || "png"}`, d);
            const span = ctx.win.querySelector(".rb-toasts .rb-toast:last-child span");
            if (span) span.textContent = `ZIP 만드는 중 ${i}/${list.length}`;
          }
        }));
        download(`${safeFileName(mod.name)}-assets.zip`, zip.blob());
        t.close();
      } catch (e) {
        t.close();
        ctx.toast(`ZIP을 만들지 못했어요: ${e?.message ?? e}`, { error: true });
      }
    }
    async function stripSelected() {
      const sel = selected().filter((a) => isImageExt(a[2]));
      if (!sel.length) return;
      const t = ctx.toast(`메타데이터 확인 중 0/${sel.length}`, { seconds: 600 });
      try {
        const changes = [];
        for (const a of sel) {
          const d = await ctx.assets.read(a[1]);
          if (!d) continue;
          if (!readMetadata(d).length) continue;
          changes.push({ a, bytes: stripMetadata(d) });
        }
        t.close();
        if (!changes.length) {
          ctx.toast("지울 메타데이터가 없어요");
          return;
        }
        const up = await uploadMany(changes.map((c) => c.bytes));
        const map = new Map(changes.map((c, i) => [c.a, up[i].path]));
        await save(assets.map((x) => map.has(x) ? [x[0], map.get(x), x[2]] : x), fd, "메타데이터 지우기 전");
        as.sel.clear();
        ctx.toast(`${changes.length}개에서 메타데이터를 지웠어요`);
        paint();
      } catch (e) {
        t.close();
        ctx.toast(e?.message ?? String(e), { error: true });
      }
    }
    async function optimize(list) {
      list = list.filter((a) => isImageExt(a[2]) && !/gif|svg/i.test(a[2]));
      if (!list.length) {
        ctx.toast("최적화할 이미지가 없어요 (GIF·SVG 제외)");
        return;
      }
      const avif = await canEncode("avif");
      let format = "webp", quality = 0.85, maxSide = 0;
      const formats = [["webp", "WebP"], ...avif ? [["avif", "AVIF"]] : []];
      const result = h("div", { class: "rb-muted" });
      const bar2 = progressBar(0);
      let prepared = null;
      const ok = await new Promise((resolve) => {
        const back = h("div", { class: "rb-modal" });
        const done = (v) => {
          back.remove();
          resolve(v);
        };
        const run = btn("미리 계산", { kind: "primary", onClick: async () => {
          run.disabled = true;
          prepared = [];
          let before = 0, after = 0, skipped = 0, i = 0;
          for (const a of list) {
            try {
              const d = await ctx.assets.read(a[1]);
              if (!d) {
                skipped++;
                continue;
              }
              const out = await convertImage(d, { format, quality, maxSide });
              before += d.length;
              if (out.bytes.length < d.length * 0.97) {
                prepared.push({ a, bytes: out.bytes });
                after += out.bytes.length;
              } else {
                after += d.length;
                skipped++;
              }
            } catch {
              skipped++;
            }
            bar2.set(++i / list.length * 100);
          }
          result.textContent = `${fmtBytes(before)} → ${fmtBytes(after)} (${before ? Math.round((1 - after / before) * 100) : 0}% 줄어듦) · 바꿀 것 ${prepared.length}개${skipped ? ` · 그대로 ${skipped}개(더 커지거나 못 읽음)` : ""}`;
          apply.disabled = !prepared.length;
          run.disabled = false;
          run.querySelector("span").textContent = "다시 계산";
        } });
        const apply = btn("적용", { kind: "primary", disabled: true, onClick: () => done(true) });
        back.appendChild(h(
          "div",
          { class: "rb-dialog", role: "dialog", "aria-label": "이미지 최적화", style: "max-width:480px" },
          h("h3", { class: "rb-h3" }, `이미지 최적화 (${list.length}개)`),
          h("span", { class: "rb-label" }, "형식"),
          segmented(formats, format, (v) => {
            format = v;
          }, "형식"),
          h("span", { class: "rb-label" }, "품질"),
          segmented([["0.95", "고품질"], ["0.85", "균형"], ["0.7", "최대 압축"]], "0.85", (v) => {
            quality = Number(v);
          }, "품질"),
          h("span", { class: "rb-label" }, "최대 크기"),
          segmented([["0", "원본"], ["2048", "2048px"], ["1024", "1024px"]], "0", (v) => {
            maxSide = Number(v);
          }, "최대 크기"),
          avif ? null : h("p", { class: "rb-muted" }, "이 브라우저는 AVIF 저장을 지원하지 않아 WebP만 쓸 수 있어요."),
          bar2,
          result,
          h("p", { class: "rb-muted" }, "더 작아지는 것만 바꿔요. 바꾸기 전 모듈은 백업되고, 원래 파일은 서버에 남아 있어요."),
          h("div", { class: "btns" }, btn("취소", { onClick: () => done(false) }), run, apply)
        ));
        ctx.win.appendChild(back);
      });
      if (!ok || !prepared?.length) return;
      try {
        const up = await uploadMany(prepared.map((p) => p.bytes));
        const map = new Map(prepared.map((p, i) => [p.a, up[i].path]));
        await save(assets.map((x) => map.has(x) ? [x[0], map.get(x), format] : x), fd, "최적화 전");
        as.sel.clear();
        ctx.toast(`${prepared.length}개를 최적화했어요`);
        paint();
      } catch (e) {
        ctx.toast(e?.message ?? String(e), { error: true });
      }
    }
    async function batchReplace(targets) {
      if (!targets.length) {
        ctx.toast("바꿀 에셋이 없어요");
        return;
      }
      const files = await pickFiles({ accept: "image/*,audio/*,video/*", multiple: true });
      if (!files.length) return;
      let mode = "name";
      const summary = h("div", { class: "rb-scroll", style: "max-height:240px;display:flex;flex-direction:column;gap:4px" });
      const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name, void 0, { numeric: true }));
      const match = () => {
        if (mode === "order") return targets.map((a, i) => ({ a, f: sortedFiles[i] })).filter((x) => x.f);
        const by = new Map(files.map((f) => [stemOf(f.name).toLowerCase(), f]));
        return targets.map((a) => ({ a, f: by.get(a[0].toLowerCase()) })).filter((x) => x.f);
      };
      const paintSum = () => {
        const m2 = match();
        replace(
          summary,
          h("span", { class: "rb-label" }, `맞춘 것 ${m2.length}개 · 못 맞춘 에셋 ${targets.length - m2.length}개 · 남은 파일 ${files.length - m2.length}개`),
          m2.slice(0, 200).map((x) => h("div", { style: "font-size:12px;display:flex;gap:8px" }, h("span", { style: "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, x.a[0]), h("span", { class: "rb-muted" }, "←"), h("span", { style: "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--rb-sub)" }, x.f.name)))
        );
      };
      const ok = await new Promise((resolve) => {
        const back = h("div", { class: "rb-modal" });
        const done = (v) => {
          back.remove();
          resolve(v);
        };
        back.appendChild(h(
          "div",
          { class: "rb-dialog", role: "dialog", "aria-label": "일괄 교체", style: "max-width:520px" },
          h("h3", { class: "rb-h3" }, `일괄 교체 — 파일 ${files.length}개`),
          segmented([["name", "이름으로 맞추기"], ["order", "순서로 맞추기"]], mode, (v) => {
            mode = v;
            paintSum();
          }, "맞추는 방식"),
          h("p", { class: "rb-muted" }, mode === "name" ? "파일 이름(확장자 빼고)이 에셋 이름과 같은 것끼리 바꿔요." : "대상 에셋 순서와 파일 이름 순서대로 바꿔요."),
          summary,
          h("div", { class: "btns" }, btn("취소", { onClick: () => done(false) }), btn("바꾸기", { kind: "primary", onClick: () => done(true) }))
        ));
        ctx.win.appendChild(back);
        paintSum();
      });
      if (!ok) return;
      const m = match();
      if (!m.length) {
        ctx.toast("맞춘 것이 없어요", { error: true });
        return;
      }
      try {
        const up = await uploadMany(m.map((x) => x.f));
        const map = new Map(m.map((x, i) => [x.a, [x.a[0], up[i].path, extOf(x.f.name)]]));
        await save(assets.map((x) => map.get(x) ?? x), fd, "일괄 교체 전");
        for (const x of m) ctx.assets.forget(x.a[1]);
        as.sel.clear();
        ctx.toast(`${m.length}개를 바꿨어요`);
        paint();
      } catch (e) {
        ctx.toast(e?.message ?? String(e), { error: true });
      }
    }
    function lightbox(a) {
      const list = visible().filter((x) => isImageExt(x[2]));
      let i = Math.max(0, list.findIndex((x) => keyOf3(x) === keyOf3(a)));
      const img = h("img", { alt: "" });
      const cap = h("span");
      let url = null;
      const show = async () => {
        const cur = list[i];
        cap.textContent = `${cur[0]} · ${i + 1}/${list.length}`;
        const thumbUrl = await ctx.assets.thumb(cur[1], cur[2], { prio: 100 }).catch(() => null);
        if (thumbUrl) img.src = thumbUrl;
        const full = await ctx.assets.fullUrl(cur[1], cur[2]).catch(() => null);
        if (list[i] !== cur) {
          if (full) URL.revokeObjectURL(full);
          return;
        }
        if (url) URL.revokeObjectURL(url);
        url = full;
        if (full) img.src = full;
        const n = list[i + 1];
        if (n) ctx.assets.read(n[1], { prio: 60 }).catch(() => {
        });
      };
      const closeLb = () => {
        box.remove();
        if (url) URL.revokeObjectURL(url);
        panel.focus();
      };
      const box = h(
        "div",
        { class: "rb-lightbox", role: "dialog", "aria-label": "크게 보기", tabindex: "-1" },
        img,
        h(
          "div",
          { class: "bar" },
          btn("이전", { size: "sm", icon: "back", onClick: () => {
            i = (i - 1 + list.length) % list.length;
            show();
          } }),
          cap,
          btn("다음", { size: "sm", icon: "chevron", onClick: () => {
            i = (i + 1) % list.length;
            show();
          } }),
          btn("받기", { size: "sm", icon: "download", onClick: () => downloadAssets([list[i]]) }),
          btn("닫기", { size: "sm", icon: "x", onClick: closeLb })
        )
      );
      box.addEventListener("keydown", (ev) => {
        ev.stopPropagation();
        if (ev.key === "Escape") closeLb();
        if (ev.key === "ArrowLeft") {
          i = (i - 1 + list.length) % list.length;
          show();
        }
        if (ev.key === "ArrowRight") {
          i = (i + 1) % list.length;
          show();
        }
      });
      box.addEventListener("mousedown", (ev) => {
        if (ev.target === box) closeLb();
      });
      ctx.win.appendChild(box);
      box.focus();
      show();
    }
    function close() {
      if (as.busy) return;
      lazy.disconnect();
      panel.remove();
    }
    panel.tabIndex = -1;
    paint();
    panel.focus();
    return { panel, close, get assets() {
      return assets;
    }, get folders() {
      return fd;
    } };
  }

  // src/ui/screens/chareditor.js
  var MAP = { lorebook: "globalLore", regex: "customscript", trigger: "triggerscript" };
  var SKIP = /* @__PURE__ */ new Set([...USER_KEYS, "emotionImages", "additionalAssets", "ccAssets", "image", "vits", "chats", "chatFolders", "chatPage", "loreCache", "lowLevelHistory"]);
  var CHAR_INFO_LABELS = {
    name: "이름",
    nickname: "별명",
    desc: "설명",
    firstMessage: "첫 메시지",
    alternateGreetings: "추가 인사말",
    personality: "성격",
    scenario: "시나리오",
    exampleMessage: "예시 대화",
    systemPrompt: "시스템 프롬프트",
    postHistoryInstructions: "후속 지시",
    replaceGlobalNote: "글로벌 노트 교체",
    additionalText: "추가 텍스트",
    creatorNotes: "제작자 노트",
    creator: "제작자",
    characterVersion: "버전",
    tags: "태그",
    backgroundHTML: "배경 HTML",
    defaultVariables: "기본 변수",
    customModuleToggle: "모듈 토글",
    lowLevelAccess: "저수준 접근",
    utilityBot: "도구 봇",
    moduleNamespace: "모듈 네임스페이스"
  };
  function charToView(ch) {
    const v = {};
    for (const [k, val] of Object.entries(ch)) if (!SKIP.has(k)) v[k] = val;
    v.chaId = ch.chaId;
    for (const [vk, ck] of Object.entries(MAP)) {
      v[vk] = Array.isArray(ch[ck]) ? ch[ck] : [];
      delete v[ck];
    }
    return v;
  }
  function viewToChar(fresh, view, original) {
    const out = { ...fresh };
    const unmap = (v) => {
      const o = { ...v };
      for (const [vk, ck] of Object.entries(MAP)) {
        o[ck] = o[vk];
        delete o[vk];
      }
      delete o.chaId;
      return o;
    };
    const want = unmap(view), before = unmap(original);
    for (const k of /* @__PURE__ */ new Set([...Object.keys(want), ...Object.keys(before)])) {
      if (SKIP.has(k)) continue;
      if (stableJson(want[k] ?? null) === stableJson(before[k] ?? null)) continue;
      if (want[k] === void 0) delete out[k];
      else out[k] = want[k];
    }
    return out;
  }
  async function freshChar(ctx, index, chaId) {
    const cur = await ctx.api.getCharacterFromIndex(index);
    if (!cur || cur.chaId !== chaId) throw new Error("캐릭터를 다시 찾지 못했어요. 목록을 새로 고쳐 주세요.");
    return cur;
  }
  async function openCharEditor(ctx, index, chaId) {
    const ch = await freshChar(ctx, index, chaId);
    return openEditorCore(ctx, {
      view: charToView(ch),
      kindLabel: "봇 편집",
      idKey: "chaId",
      infoLabels: CHAR_INFO_LABELS,
      infoTitle: "봇 정보",
      validate: (v) => validateModule(v),
      renderInfo: ({ draft, field, text, area, check, changed }) => {
        const greets = h("div", { class: "wide", style: "display:flex;flex-direction:column;gap:8px" });
        const paintGreets = () => {
          if (!Array.isArray(draft.alternateGreetings)) draft.alternateGreetings = [];
          greets.replaceChildren(
            h("span", { class: "rb-label" }, `추가 인사말 (${draft.alternateGreetings.length})`),
            ...draft.alternateGreetings.map((g, i) => {
              const ta = h("textarea", { class: "rb-textarea", spellcheck: "false", style: "font-family:inherit;font-size:14px;min-height:90px" });
              ta.value = g ?? "";
              ta.addEventListener("input", () => {
                draft.alternateGreetings[i] = ta.value;
                changed();
              });
              return h("div", { style: "display:flex;gap:6px;align-items:flex-start" }, ta, iconBtn("trash", `추가 인사말 ${i + 1} 지우기`, { onClick: () => {
                draft.alternateGreetings.splice(i, 1);
                changed();
                paintGreets();
              } }));
            }),
            h("div", null, btn("인사말 추가", { size: "sm", icon: "plus", onClick: () => {
              draft.alternateGreetings.push("");
              changed();
              paintGreets();
            } }))
          );
        };
        paintGreets();
        const tags = h("input", { class: "rb-input", value: (draft.tags ?? []).join(", "), placeholder: "쉼표로 구분" });
        tags.addEventListener("input", () => {
          draft.tags = tags.value.split(",").map((s) => s.trim()).filter(Boolean);
          changed();
        });
        const prose = { mono: false };
        return [
          h(
            "div",
            { class: "rb-form" },
            field("이름", text(draft, "name")),
            field("별명", text(draft, "nickname")),
            field("제작자", text(draft, "creator")),
            field("버전", text(draft, "characterVersion")),
            field("태그", tags, true),
            field("설명", area(draft, "desc", { tall: true, ...prose }), true),
            field("첫 메시지", area(draft, "firstMessage", { tall: true, ...prose }), true),
            greets,
            field("성격", area(draft, "personality", prose), true),
            field("시나리오", area(draft, "scenario", prose), true),
            field("예시 대화", area(draft, "exampleMessage", prose), true),
            field("시스템 프롬프트", area(draft, "systemPrompt", prose), true),
            field("후속 지시 (post history)", area(draft, "postHistoryInstructions", prose), true),
            field("글로벌 노트 교체", area(draft, "replaceGlobalNote", prose), true),
            field("추가 텍스트", area(draft, "additionalText", prose), true),
            field("제작자 노트", area(draft, "creatorNotes", prose), true),
            field("기본 변수 (defaultVariables)", area(draft, "defaultVariables"), true),
            field("모듈 토글 정의 (customModuleToggle)", area(draft, "customModuleToggle"), true),
            field("배경 HTML (backgroundHTML)", area(draft, "backgroundHTML"), true),
            field("모듈 네임스페이스", text(draft, "moduleNamespace")),
            h("div", { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap" }, check(draft, "lowLevelAccess", "저수준 접근"), check(draft, "utilityBot", "도구 봇"))
          ),
          note("info", '채팅·메모는 건드리지 않아요. 이미지는 봇 상세의 "에셋"에서 고쳐요.')
        ];
      },
      async save(draft, original) {
        const fresh = await freshChar(ctx, index, chaId);
        if (isGenerating(fresh)) throw new Busy();
        await createStore(ctx.api).addBackup({ kind: "character", target: chaId, name: fresh.name, snapshot: backupSnapshot("character", fresh), note: "편집 전" });
        const merged = viewToChar(fresh, draft, original);
        const last2 = await freshChar(ctx, index, chaId);
        if (isGenerating(last2) || (last2.chats ?? []).length !== (fresh.chats ?? []).length) throw new Busy();
        merged.chats = last2.chats;
        await ctx.api.setCharacterToIndex(index, merged);
        ctx.state.charsDirty = true;
        if (ctx.state.tab === "characters") ctx.refresh();
      }
    });
  }
  async function openCharAssets(ctx, index, chaId) {
    const ch = await freshChar(ctx, index, chaId);
    const list = (ch.additionalAssets ?? []).map((a) => [String(a?.[0] ?? ""), String(a?.[1] ?? ""), String(a?.[2] ?? "")]);
    const folderKey = `${chaId}:additional`;
    let backedUp = false;
    return openAssetsCore(ctx, {
      name: ch.name,
      label: "봇 에셋",
      assets: list,
      folders: structuredClone(ctx.prefs.meta.charAssetFolders?.[folderKey] ?? { _folders: [], _mapping: {} }),
      async save(nextAssets, nextFd, note2) {
        const fresh = await freshChar(ctx, index, chaId);
        if (isGenerating(fresh)) throw new Busy();
        if (!backedUp) {
          await createStore(ctx.api).addBackup({ kind: "character", target: chaId, name: fresh.name, snapshot: backupSnapshot("character", fresh), note: "에셋 관리 전", summary: note2 });
          backedUp = true;
        }
        fresh.additionalAssets = nextAssets.map((a) => [...a]);
        await ctx.api.setCharacterToIndex(index, fresh);
        const empty = !nextFd._folders.length && !Object.keys(nextFd._mapping).length;
        if (stableJson(ctx.prefs.meta.charAssetFolders?.[folderKey] ?? null) !== stableJson(empty ? null : nextFd)) {
          await ctx.svc.meta((m) => {
            m.charAssetFolders ??= {};
            if (empty) delete m.charAssetFolders[folderKey];
            else m.charAssetFolders[folderKey] = nextFd;
          });
        }
        ctx.state.charsDirty = true;
        if (ctx.state.tab === "characters") ctx.refresh();
      }
    });
  }

  // src/ui/screens/dev.js
  var KIND_KO = { module: "모듈", character: "봇" };
  var keyOf = (p) => p.kind === "module" ? `m:${p.id}` : `c:${p.id}`;
  var projects = (ctx) => ctx.prefs.meta.devProjects ?? [];
  var findProject = (ctx, kind, id) => projects(ctx).find((p) => p.kind === kind && p.id === id) ?? null;
  function saveProjects(ctx, fn) {
    return ctx.svc.meta((m) => {
      m.devProjects ??= [];
      return fn(m.devProjects, m);
    });
  }
  function addProjects(ctx, list) {
    return saveProjects(ctx, (ps) => {
      let n = 0;
      for (const x of list) if (!ps.some((p) => p.kind === x.kind && p.id === x.id)) {
        ps.push({ kind: x.kind, id: x.id, addedAt: Date.now(), version: "", releases: [] });
        n++;
      }
      return n;
    });
  }
  function recordRelease(ctx, kind, id, rel) {
    return saveProjects(ctx, (ps) => {
      let p = ps.find((x) => x.kind === kind && x.id === id);
      if (!p) {
        p = { kind, id, addedAt: Date.now(), version: "", releases: [] };
        ps.push(p);
      }
      p.releases = [{ t: Date.now(), ...rel }, ...p.releases ?? []].slice(0, 100);
      if (rel.version) p.version = rel.version;
    });
  }
  async function loadAll(ctx, fresh) {
    const st = ctx.state;
    if (!fresh && st.devAll && Date.now() - st.devAll.t < 3e4) return st.devAll;
    const { entries } = await ctx.svc.load(fresh ? { fresh: true } : void 0);
    const db = await ctx.api.getDatabase(["characters"]);
    const lc = await loadCharacters(ctx.api, db?.characters);
    const mods = new Map(entries.map((e) => [e.module.id, { kind: "module", id: e.module.id, name: e.module.name ?? "", enabled: e.enabled, module: e.module }]));
    const chars = /* @__PURE__ */ new Map();
    lc.list.forEach((c, i) => {
      if (c && !c.trashTime && c.type !== "group") chars.set(c.chaId, { kind: "character", id: c.chaId, i, name: c.name ?? "", image: c.image, creator: c.creator });
    });
    st.devAll = { t: Date.now(), mods, chars, unloaded: lc.unloaded };
    return st.devAll;
  }
  var targetOf = (all, p) => (p.kind === "module" ? all.mods.get(p.id) : all.chars.get(p.id)) ?? null;
  async function fullOf(ctx, all, p) {
    const t = targetOf(all, p);
    if (!t) throw new Error("찾을 수 없어요. 지워졌거나 아직 불러오는 중이에요.");
    if (p.kind === "module") return (await ctx.svc.load({ fresh: true })).entries.find((e) => e.module.id === p.id)?.module ?? t.module;
    const c = await ctx.api.getCharacterFromIndex(t.i);
    if (!c || c.chaId !== p.id) throw new Error("봇을 다시 찾지 못했어요. 새로 고침을 눌러 주세요.");
    return c;
  }
  async function renderDev(ctx) {
    const st = ctx.state;
    if (st.sub === "patchmaker") return renderPatchMaker(ctx, { backTo: "dev", backLabel: "개발" });
    if (!st.devAll) replace(ctx.main, h("div", { class: "rb-empty" }, "개발 목록을 불러오는 중…"));
    const all = await loadAll(ctx);
    const ps = projects(ctx);
    ctx.setNavCount("dev", ps.length || void 0);
    if (!st.devSel || !ps.some((p) => keyOf(p) === st.devSel)) st.devSel = ps[0] ? keyOf(ps[0]) : null;
    const list = h("div", { class: "rb-list rb-scroll", role: "listbox", "aria-label": "개발 목록" });
    const lazy = ctx.assets.lazy(list);
    const row2 = (p) => {
      const t = targetOf(all, p);
      const meta = rowMeta(p);
      const pic = p.kind === "character" && t?.image ? h("img", { alt: "", dataset: { path: t.image, ext: "png" }, style: "width:36px;height:36px;border-radius:10px;object-fit:cover;background:var(--rb-surf2);flex-shrink:0" }) : h("span", { style: "width:36px;height:36px;border-radius:10px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, icon(p.kind === "module" ? "module" : "character", 18));
      if (pic.tagName === "IMG") lazy.observe(pic);
      const r = h(
        "div",
        {
          class: ["rb-row", !t && "off"],
          role: "option",
          tabindex: "0",
          "aria-selected": st.devSel === keyOf(p) ? "true" : "false",
          dataset: { id: keyOf(p) },
          onClick: () => {
            st.devSel = keyOf(p);
            list.querySelectorAll(".rb-row").forEach((x) => x.setAttribute("aria-selected", "false"));
            r.setAttribute("aria-selected", "true");
            detail(ctx, all, p);
            if (ctx.isMobile()) ctx.openSheet();
          },
          onKeydown: (ev) => {
            if (ev.target === r && (ev.key === "Enter" || ev.key === " ")) {
              ev.preventDefault();
              r.click();
            }
          }
        },
        pic,
        h(
          "div",
          { class: "txt" },
          h("div", { class: "ttl" }, h("span", { class: "name" }, t?.name || "(찾을 수 없음)"), !t && badge("없음", "warn"), t && p.kind === "module" && !t.enabled && badge("꺼짐", "mute")),
          h("span", { class: "meta" }, meta)
        )
      );
      return r;
    };
    for (const kind of ["module", "character"]) {
      const mine = ps.filter((p) => p.kind === kind);
      if (!mine.length) continue;
      list.appendChild(h("div", { class: "rb-label", style: "padding:12px 12px 4px" }, `${KIND_KO[kind]} ${mine.length}`));
      for (const p of mine) list.appendChild(row2(p));
    }
    if (!ps.length) list.appendChild(h(
      "div",
      { class: "rb-card pad bordered", style: "margin:12px;display:flex;flex-direction:column;gap:10px" },
      h("b", null, "개발 중인 모듈·봇을 모아 두는 곳이에요"),
      h("span", { class: "rb-muted", style: "white-space:normal" }, '"추가"로 이미 있는 모듈·봇을 고르거나, "새 모듈"·"새 봇"으로 바로 만들어요. 여기 넣은 것만 모아서 버전·배포 기준·검사·테스트·패치를 관리해요. 목록에서 빼도 모듈·봇은 그대로예요.'),
      h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, btn("추가", { size: "sm", icon: "plus", onClick: () => pickProjects(ctx) }), btn("새 모듈", { size: "sm", icon: "module", onClick: () => newDevModule(ctx) }), btn("새 봇", { size: "sm", icon: "character", onClick: () => newDevBot(ctx) }))
    ));
    const keep = ctx.main.querySelector(".rb-list")?.scrollTop ?? 0;
    replace(
      ctx.main,
      h(
        "div",
        { class: "rb-chips", role: "toolbar", "aria-label": "개발" },
        h("span", { class: "rb-muted", style: "white-space:nowrap;flex-shrink:0" }, `개발 중 ${ps.length}개${all.unloaded ? ` · 앱이 아직 불러오는 중인 봇 ${all.unloaded}명` : ""}`),
        h("div", { class: "rb-spacer" }),
        btn("추가", { size: "sm", icon: "plus", onClick: () => pickProjects(ctx), id: "rb-dev-add" }),
        btn("새로 만들기", { size: "sm", icon: "plus", onClick: (e) => openMenu(ctx.win, e.currentTarget, [
          { label: "새 모듈", icon: "module", onClick: () => newDevModule(ctx) },
          { label: "새 봇", icon: "character", onClick: () => newDevBot(ctx) }
        ]), id: "rb-dev-new" }),
        btn("패치 만들기", { size: "sm", kind: "primary", icon: "code", onClick: () => ctx.go("dev", "patchmaker"), id: "rb-dev-pm" }),
        iconBtn("refresh", "새로 고침", { onClick: async () => {
          await loadAll(ctx, true);
          renderDev(ctx);
        } })
      ),
      list
    );
    list.scrollTop = keep;
    const sel = ps.find((p) => keyOf(p) === st.devSel);
    if (sel) detail(ctx, all, sel);
    else ctx.showDetail(h("div", { class: "rb-empty" }, "개발 중인 모듈·봇을 고르면 여기에 도구가 나와요."));
  }
  async function pickProjects(ctx) {
    const all = await loadAll(ctx, true);
    const mine = new Set(projects(ctx).map(keyOf));
    const items = [
      ...[...all.mods.values()].map((m) => ({ id: `m:${m.id}`, label: m.name, sub: `모듈${m.enabled ? "" : " · 꺼짐"}` })),
      ...[...all.chars.values()].map((c) => ({ id: `c:${c.id}`, label: c.name, sub: `봇${c.creator ? ` · 제작자 ${c.creator}` : ""}` }))
    ].filter((x) => !mine.has(x.id));
    const r = await folderDialog(ctx.win, { title: "개발 목록에 넣기", items, ok: "넣기", withName: false, noun: "모듈·봇" });
    if (!r?.ids.length) return;
    const n = await addProjects(ctx, r.ids.map((k) => ({ kind: k.startsWith("m:") ? "module" : "character", id: k.slice(2) })));
    ctx.state.devSel = r.ids[0];
    ctx.toast(`${n}개를 개발 목록에 넣었어요`);
    renderDev(ctx);
  }
  async function newDevModule(ctx) {
    const n = await promptDialog(ctx.win, { title: "새 개발 모듈", label: "모듈 이름", placeholder: "예: 내 세계관" });
    if (!n?.trim()) return;
    const m = ctx.svc.newModule(n.trim());
    try {
      await ctx.svc.run("create", m);
      await addProjects(ctx, [{ kind: "module", id: m.id }]);
      ctx.state.modDirty = true;
      ctx.state.devSel = `m:${m.id}`;
      await loadAll(ctx, true);
      ctx.toast(`'${m.name}' 모듈을 만들고 개발 목록에 넣었어요`);
      renderDev(ctx);
    } catch (e) {
      ctx.toast(`만들지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  }
  async function newDevBot(ctx) {
    const n = await promptDialog(ctx.win, { title: "새 개발 봇", label: "봇 이름", placeholder: "예: 테스트 봇" });
    if (!n?.trim()) return;
    try {
      const db = await ctx.api.getDatabase(["characters"]);
      const chars = db?.characters;
      if (!Array.isArray(chars)) throw new Error("앱이 아직 봇 목록을 불러오는 중이에요. 잠시 뒤 다시 해 주세요.");
      if (chars.some(isGenerating)) throw new Busy();
      const c = newCharacterBase({});
      c.name = uniqueDisplayName(n.trim(), chars);
      c.firstMessage = "";
      c.desc = "";
      c.image = "";
      chars.push(c);
      await ctx.api.setDatabaseLite({ characters: chars });
      try {
        await ctx.api.checkCharOrder();
      } catch {
      }
      await addProjects(ctx, [{ kind: "character", id: c.chaId }]);
      ctx.state.charsDirty = true;
      ctx.state.devSel = `c:${c.chaId}`;
      await loadAll(ctx, true);
      ctx.toast(`'${c.name}' 봇을 만들고 개발 목록에 넣었어요`);
      renderDev(ctx);
    } catch (e) {
      ctx.toast(e instanceof Busy ? "다른 봇이 응답을 생성하는 중이에요. 끝난 뒤 다시 해 주세요." : `만들지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  }
  function card(title, ...children) {
    return h("div", { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:10px" }, typeof title === "string" ? h("b", null, title) : title, ...children);
  }
  function detail(ctx, all, p) {
    const st = ctx.state;
    const t = targetOf(all, p);
    const remove = btn("개발 목록에서 빼기", { size: "sm", icon: "x", onClick: async () => {
      await saveProjects(ctx, (ps) => {
        const i = ps.findIndex((x) => x.kind === p.kind && x.id === p.id);
        if (i >= 0) ps.splice(i, 1);
      });
      ctx.toast(`개발 목록에서 뺐어요. ${KIND_KO[p.kind]}은(는) 그대로예요.`);
      renderDev(ctx);
    } });
    if (!t) {
      ctx.showDetail(h("h2", { class: "rb-h2" }, "(찾을 수 없음)"), note("warn", `이 ${KIND_KO[p.kind]}을(를) 찾지 못했어요. 지워졌거나 앱이 아직 불러오는 중이에요.`), h("div", null, remove));
      return;
    }
    const body = h("div", { style: "display:flex;flex-direction:column;gap:12px" }, h("div", { class: "rb-empty" }, "불러오는 중…"));
    ctx.showDetail(
      h("div", { style: "display:flex;flex-direction:column;gap:4px" }, h("span", { style: "font-size:12px;color:var(--rb-acc-text)" }, `개발 중인 ${KIND_KO[p.kind]}`), h("h2", { class: "rb-h2" }, t.name || "(이름 없음)")),
      body
    );
    const my = st.devToken = (st.devToken ?? 0) + 1;
    (async () => {
      const obj = await fullOf(ctx, all, p);
      if (my !== st.devToken) return;
      const view = projView(p.kind, obj);
      const s = devStats(view);
      const stat = (label, v) => h("div", { class: "rb-stat" }, h("small", null, label), h("b", null, String(v)));
      replace(
        body,
        versionCard(ctx, p),
        h("div", { class: "rb-stats" }, stat("로어북", s.lore), stat("정규식", s.regex), stat("트리거", s.trigger), stat("항상 켜짐", `약 ${s.alwaysTokens.toLocaleString()} 토큰`)),
        actions(ctx, all, p, obj),
        baseCard(ctx, all, p, obj),
        lintCard(ctx, p, obj, view),
        testCard(ctx, p, view),
        releaseCard(ctx, p, t),
        h("div", null, remove)
      );
    })().catch((e) => {
      if (my === st.devToken) replace(body, note("err", e?.message ?? String(e)), h("div", null, remove));
    });
  }
  function versionCard(ctx, p) {
    const inp = h("input", { class: "rb-input", value: p.version ?? "", placeholder: "예: 1.0", "aria-label": "개발 버전", id: "rb-dev-version", style: "height:38px" });
    const last2 = p.releases?.[0]?.version;
    const suggest = () => nextVersion(last2 || inp.value.trim() || p.version);
    const nextBtn = btn("", { size: "sm", onClick: () => {
      inp.value = suggest();
      save();
      ctx.toast(`버전을 ${inp.value}(으)로 바꿨어요`);
    } });
    const paintNext = () => {
      const v = suggest();
      nextBtn.textContent = `다음: ${v}`;
      nextBtn.hidden = v === inp.value.trim();
    };
    const save = () => {
      const v = inp.value.trim();
      p.version = v;
      paintNext();
      const meta = ctx.main.querySelector(`.rb-row[data-id="${CSS.escape(keyOf(p))}"] .meta`);
      if (meta) meta.textContent = rowMeta(p);
      return saveProjects(ctx, (ps) => {
        const x = ps.find((y) => y.kind === p.kind && y.id === p.id);
        if (x) x.version = v;
      });
    };
    inp.addEventListener("change", save);
    inp.addEventListener("input", paintNext);
    paintNext();
    return card(
      h("div", { style: "display:flex;align-items:center;gap:8px" }, h("b", { style: "flex:1" }, "개발 버전"), last2 ? h("span", { class: "rb-muted" }, `마지막 배포 v${last2}`) : null),
      h("div", { style: "display:flex;gap:8px" }, h("div", { style: "flex:1" }, inp), nextBtn),
      h("span", { class: "rb-muted", style: "white-space:normal" }, "패치를 만들 때 이 버전이 미리 채워지고, 만든 뒤에는 릴리스 기록에 남아요.")
    );
  }
  var rowMeta = (p) => {
    const rel = p.releases?.[0];
    return [p.version ? `v${p.version}` : "버전 없음", rel ? `패치 ${p.releases.length}번 · 최근 ${fmtWhen(rel.t)}` : "아직 패치 없음"].join(" · ");
  };
  function actions(ctx, all, p, obj) {
    const t = targetOf(all, p);
    const edit = () => (p.kind === "module" ? ctx.openEditor(p.id) : openCharEditor(ctx, t.i, p.id)).catch?.((e) => ctx.toast(e?.message ?? String(e), { error: true }));
    const assets = () => (p.kind === "module" ? ctx.openAssets(p.id) : openCharAssets(ctx, t.i, p.id)).catch?.((e) => ctx.toast(e?.message ?? String(e), { error: true }));
    const checkpoint = async () => {
      const n = await promptDialog(ctx.win, { title: "체크포인트 저장", label: "메모 (기록 탭에 보여요)", value: p.version ? `v${p.version} 작업 중` : "작업 중", ok: "저장" });
      if (n === null) return;
      try {
        const fresh = await fullOf(ctx, all, p);
        await createStore(ctx.api).addBackup({ kind: p.kind, target: p.id, name: fresh.name, snapshot: p.kind === "module" ? fresh : backupSnapshot("character", fresh), note: `체크포인트${n.trim() ? ` · ${n.trim()}` : ""}` });
        ctx.toast("체크포인트를 저장했어요. 기록 탭에서 언제든 이 상태로 되돌릴 수 있어요.");
      } catch (e) {
        ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
      }
    };
    const exportFull = async () => {
      const tt = ctx.toast(".risum 만드는 중…", { seconds: 120 });
      try {
        const m = await fullOf(ctx, all, p);
        const bytes = await buildRisum(m, (path) => ctx.assets.read(path));
        tt.close();
        download(`${safeFileName(m.name)}${p.version ? `_v${safeFileName(p.version)}` : ""}.risum`, bytes, "application/octet-stream");
        ctx.toast(`전체 파일을 만들었어요 (${fmtBytes(bytes.size)})`);
      } catch (e) {
        tt.close();
        ctx.toast(`만들지 못했어요: ${e?.message ?? e}`, { error: true });
      }
    };
    return h(
      "div",
      { style: "display:flex;gap:8px;flex-wrap:wrap" },
      btn("편집", { kind: "primary", icon: "edit", onClick: edit, id: "rb-dev-edit" }),
      btn("에셋", { icon: "image", onClick: assets }),
      btn("체크포인트", { icon: "check", onClick: checkpoint, id: "rb-dev-checkpoint" }),
      p.kind === "module" ? btn(".risum 전체", { icon: "download", onClick: exportFull }) : null
    );
  }
  function baseCard(ctx, all, p, obj) {
    const store = createStore(ctx.api);
    const st = h("div", { class: "rb-muted" }, "배포 기준과 비교하는 중…");
    const head = h("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" }, h("b", { style: "flex:1" }, "배포 기준"));
    const go = () => {
      const t = targetOf(all, p);
      ctx.state.pm = { ...ctx.state.pm ?? {}, kind: p.kind, target: p.kind === "module" ? { kind: "module", key: keyOf(p), id: p.id, name: t.name } : { kind: "character", key: keyOf(p), i: t.i, chaId: p.id, name: t.name }, q: "", version: p.version || nextVersion(p.releases?.[0]?.version) };
      ctx.go("dev", "patchmaker");
    };
    const btns = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" });
    (async () => {
      const [info, base] = await Promise.all([store.baselineInfo(keyOf(p)), store.getBaseline(keyOf(p))]);
      const setBase = btn(base ? "지금 상태를 새 기준으로" : "지금 상태를 기준으로 표시", { size: "sm", icon: "check", id: "rb-dev-setbase", onClick: async () => {
        if (base && !await confirmDialog(ctx.win, { title: "지금 상태를 배포 기준으로 할까요?", body: "이후 고친 부분만 다음 패치에 들어가요. 아직 패치로 내보내지 않은 변경은 기준에 묻혀요.", ok: "기준으로 표시" })) return;
        await store.setBaseline(keyOf(p), baseViewOf(p.kind, await fullOf(ctx, all, p)));
        ctx.toast("지금 상태를 배포 기준으로 기록했어요");
        renderDev(ctx);
      } });
      if (!base) {
        head.appendChild(badge("없음", "warn"));
        replace(st, "아직 배포 기준이 없어요. 사람들에게 올린 파일과 같은 상태일 때 기준으로 표시해 두면, 그 뒤에 고친 것만 패치로 만들 수 있어요.");
        replace(btns, setBase);
        return;
      }
      head.appendChild(badge(`기록됨 · ${fmtWhen(info?.t)}`, "ok"));
      const patch = await buildPatch({ kind: p.kind, name: obj.name, namespace: obj.namespace ?? obj.moduleNamespace, base, current: obj, readAsset: async () => null, includeAssets: false });
      const n = patch ? planPatch(patch, base).items.length : 0;
      head.appendChild(badge(n ? `바뀐 곳 ${n}` : "바뀐 곳 없음", n ? "acc" : "mute"));
      replace(st, n ? `기준 뒤로 ${n}곳을 고쳤어요. 패치 크기 약 ${fmtBytes(new Blob([JSON.stringify(patch)]).size)} (에셋 제외).` : "기준과 같아요. 고친 뒤 다시 보면 바뀐 곳이 나와요.");
      replace(btns, n ? btn("패치 만들기", { size: "sm", kind: "primary", icon: "code", onClick: go, id: "rb-dev-makepatch" }) : null, setBase);
    })().catch((e) => replace(st, `비교하지 못했어요: ${e?.message ?? e}`));
    return card(head, st, btns);
  }
  function lintCard(ctx, p, obj, view) {
    const base = validateModule({ name: view.name, lorebook: view.lore, regex: view.regex, trigger: view.trigger, mcp: obj.mcp });
    const items = [...base, ...devLint(view)];
    const lv = { err: ["오류", "danger"], warn: ["주의", "warn"], info: ["참고", "mute"] };
    const errs = items.filter((x) => x.level === "err").length, warns = items.filter((x) => x.level === "warn").length;
    const head = h(
      "div",
      { style: "display:flex;align-items:center;gap:8px" },
      h("b", { style: "flex:1" }, "검사"),
      items.length ? badge(`오류 ${errs} · 주의 ${warns} · 참고 ${items.length - errs - warns}`, errs ? "danger" : warns ? "warn" : "mute") : badge("문제 없음", "ok")
    );
    return card(
      head,
      items.length ? h(
        "div",
        { id: "rb-dev-lint", style: "display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto" },
        ...items.slice(0, 120).map((x) => h("div", { style: "display:flex;gap:8px;align-items:flex-start" }, badge(...lv[x.level]), h("span", { style: "white-space:normal;font-size:13px" }, x.msg)))
      ) : h("span", { class: "rb-muted" }, "빈 키, 정규식 오류, 쓰이지 않는 항목, 늘 켜지는 실수 키 같은 문제가 없어요."),
      h("span", { class: "rb-muted", style: "white-space:normal" }, "편집기에서 저장할 때도 같은 검사를 해요.")
    );
  }
  function testCard(ctx, p, view) {
    const st = ctx.state;
    st.devTest ??= { tab: "lore", text: "", mode: "editoutput", recursive: false };
    const T = st.devTest;
    const input = h("textarea", { class: "rb-textarea", style: "min-height:90px", placeholder: "", "aria-label": "테스트 문장", id: "rb-dev-test-input" });
    input.value = T.text;
    const out = h("div", { style: "display:flex;flex-direction:column;gap:6px", id: "rb-dev-test-out" });
    const opts = h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" });
    const run = () => {
      T.text = input.value;
      if (T.tab === "lore") {
        input.placeholder = "최근 대화를 붙여 넣으면 켜지는 로어북 항목을 보여 줘요";
        const res = loreActivation(view.lore, input.value, { recursive: T.recursive });
        const chars = res.reduce((n, r) => n + String(r.entry.content ?? "").length, 0);
        replace(
          out,
          h("span", { class: "rb-muted" }, `켜지는 항목 ${res.length}개 · 약 ${Math.round(chars / 2.5).toLocaleString()} 토큰`),
          ...res.slice(0, 80).map((r) => h(
            "div",
            { style: "display:flex;gap:8px;align-items:center;min-width:0" },
            badge(r.reason, r.reason.startsWith("빈 키") ? "warn" : r.reason.startsWith("키") ? "acc" : "mute"),
            h("span", { style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, r.entry.comment || r.entry.key || `#${r.index + 1}`)
          ))
        );
      } else {
        input.placeholder = "응답 예시를 넣으면 정규식을 순서대로 적용한 결과를 보여 줘요";
        const res = regexRun(view.regex, input.value, T.mode);
        replace(
          out,
          h("span", { class: "rb-muted" }, `적용된 스크립트 ${res.steps.filter((s) => s.matched && !s.skipped && !s.error).length}개 / 이 종류 ${res.steps.length}개`),
          ...res.steps.filter((s) => s.matched || s.error || s.skipped).slice(0, 60).map((s) => h(
            "div",
            { style: "display:flex;gap:8px;align-items:flex-start" },
            badge(s.error ? "오류" : s.skipped ? "건너뜀" : `${s.matched}곳`, s.error ? "danger" : s.skipped ? "mute" : "acc"),
            h("span", { style: "white-space:normal;font-size:13px" }, s.comment, s.error || s.skipped ? h("small", { class: "rb-muted" }, ` — ${s.error ?? s.skipped}`) : null)
          )),
          h("span", { class: "rb-label" }, "결과"),
          h("pre", { style: "margin:0;padding:10px 12px;border-radius:10px;background:var(--rb-surf);white-space:pre-wrap;word-break:break-word;font-size:12px;max-height:200px;overflow:auto" }, res.out || " ")
        );
      }
    };
    const paintOpts = () => {
      if (T.tab === "lore") {
        const cb = h("input", { type: "checkbox", checked: T.recursive });
        cb.addEventListener("change", () => {
          T.recursive = cb.checked;
          run();
        });
        replace(opts, h("label", { class: "rb-check", style: "display:flex;gap:6px;align-items:center" }, cb, "재귀 검색 (켜진 항목 내용으로 다시 찾기)"));
      } else {
        replace(opts, segmented([["editinput", "입력"], ["editoutput", "출력"], ["editprocess", "요청"], ["editdisplay", "표시"]], T.mode, (v) => {
          T.mode = v;
          run();
        }, "정규식 종류"));
      }
    };
    let timer = 0;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(run, 120);
    });
    paintOpts();
    run();
    return card(
      h("div", { style: "display:flex;align-items:center;gap:8px" }, h("b", { style: "flex:1" }, "테스트")),
      segmented([["lore", "로어북 활성"], ["regex", "정규식"]], T.tab, (v) => {
        T.tab = v;
        paintOpts();
        run();
      }, "테스트 종류"),
      opts,
      input,
      out,
      h("span", { class: "rb-muted", style: "white-space:normal" }, "RisuAI 규칙대로 미리 돌려 봐요. CBS({{…}})·트리거·확률처럼 채팅 중에만 정해지는 것은 계산하지 않아요.")
    );
  }
  function releaseCard(ctx, p, t) {
    const rels = p.releases ?? [];
    const md = () => rels.map((r) => `## v${r.version || "?"} (${new Date(r.t).toLocaleDateString()})
${(r.note || "").trim() || "- (변경 내용 없음)"}`).join("\n\n");
    return card(
      h("div", { style: "display:flex;align-items:center;gap:8px" }, h("b", { style: "flex:1" }, "릴리스 기록"), badge(`${rels.length}번`, rels.length ? "acc" : "mute")),
      rels.length ? h(
        "div",
        { style: "display:flex;flex-direction:column;gap:8px;max-height:240px;overflow:auto", id: "rb-dev-releases" },
        ...rels.slice(0, 30).map((r) => h(
          "div",
          { style: "display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:10px;background:var(--rb-surf)" },
          h("div", { style: "display:flex;gap:8px;align-items:center" }, h("b", null, `v${r.version || "?"}`), h("span", { class: "rb-muted" }, fmtWhen(r.t)), r.size ? h("span", { class: "rb-muted", style: "margin-left:auto" }, fmtBytes(r.size)) : null),
          r.note ? h("span", { style: "white-space:pre-line;font-size:13px" }, r.note) : null
        ))
      ) : h("span", { class: "rb-muted", style: "white-space:normal" }, "패치를 만들면 버전·변경 내용·크기가 여기에 쌓여요."),
      rels.length ? h(
        "div",
        { style: "display:flex;gap:8px;flex-wrap:wrap" },
        btn("변경 기록 복사", { size: "sm", icon: "link", onClick: async () => ctx.toast(await copyText(md()) ? "마크다운으로 복사했어요. 배포글에 붙여 넣으세요." : "복사하지 못했어요") }),
        btn("CHANGELOG.md", { size: "sm", icon: "download", onClick: () => download(`${safeFileName(t.name)}_CHANGELOG.md`, `# ${t.name} 변경 기록

${md()}
`, "text/markdown") })
      ) : null
    );
  }

  // src/ui/screens/devtools.js
  var isDev = (ctx) => !!ctx.prefs.ui?.devMode;
  var SKIP_CHAR = ["loreCache", "lowLevelHistory", "chatPage", "chats"];
  function baseViewOf(kind, obj) {
    const v = pickView(obj, viewKeys(kind, kind === "module" ? null : obj));
    if (kind === "character") for (const k of SKIP_CHAR) delete v[k];
    return v;
  }
  var GROUP = { field: "정보", lorebook: "로어북", regex: "정규식", trigger: "트리거", assets: "에셋", globalLore: "로어북", customscript: "정규식", triggerscript: "트리거", emotionImages: "감정 이미지", additionalAssets: "에셋" };
  var KIND = { update: ["수정", "acc"], added: ["추가", "ok"], removed: ["삭제", "danger"], conflict: ["수정", "acc"], mine: ["수정", "acc"] };
  function devToggleCard(ctx, onChange) {
    const on = isDev(ctx);
    return h(
      "div",
      { class: "rb-card pad bordered", style: "display:flex;gap:14px;align-items:center;margin-bottom:14px", id: "rb-devmode" },
      h("span", { style: "width:40px;height:40px;border-radius:12px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, icon("code", 20)),
      h(
        "div",
        { style: "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px" },
        h("b", null, "개발자 모드"),
        h("span", { class: "rb-muted", style: "white-space:normal" }, "모듈·봇 제작자를 위한 기능이에요. 켜면 옆에 개발 탭이 생겨서, 개발 중인 모듈·봇을 모아 두고 검사·테스트·패치 배포를 한곳에서 할 수 있어요.")
      ),
      switchEl(on, { label: "개발자 모드", onChange: async (v) => {
        await ctx.prefs.saveUi({ devMode: v });
        ctx.toast(v ? "개발자 모드를 켰어요" : "개발자 모드를 껐어요");
        onChange?.();
      } })
    );
  }
  async function loadTargets(ctx) {
    const { entries } = await ctx.svc.load();
    const mods = entries.map((e) => ({ kind: "module", key: `m:${e.module.id}`, id: e.module.id, name: e.module.name ?? "", sub: e.module.namespace || "" }));
    const db = await ctx.api.getDatabase(["characters"]);
    db.characters = (await loadCharacters(ctx.api, db?.characters)).list;
    const chars = (db?.characters ?? []).map((c, i) => c && !c.trashTime && c.type !== "group" ? { kind: "character", key: `c:${c.chaId}`, i, chaId: c.chaId, name: c.name ?? "", sub: c.creator ? `제작자 ${c.creator}` : "" } : null).filter(Boolean);
    return { mods, chars };
  }
  async function currentOf(ctx, t) {
    if (t.kind === "module") {
      const m = (await ctx.svc.load({ fresh: true })).entries.find((e) => e.module.id === t.id)?.module;
      if (!m) throw new Error("모듈을 다시 찾지 못했어요");
      return m;
    }
    const c = await ctx.api.getCharacterFromIndex(t.i);
    if (!c || c.chaId !== t.chaId) throw new Error("봇을 다시 찾지 못했어요. 목록을 새로 고쳐 주세요.");
    return c;
  }
  async function renderPatchMaker(ctx, { backTo = "dev", backLabel = "개발" } = {}) {
    const st = ctx.state;
    st.pm ??= { kind: "module", target: null, q: "" };
    const pm = st.pm;
    replace(ctx.main, h("div", { class: "rb-empty" }, "불러오는 중…"));
    const { mods, chars } = await loadTargets(ctx);
    const store = createStore(ctx.api);
    const back = btn(backLabel, { size: "sm", icon: "back", onClick: () => {
      ctx.go(backTo);
    } });
    const pickBox = h("div", { class: "rb-list", style: "max-height:260px;overflow:auto;border:1px solid var(--rb-line);border-radius:14px;padding:6px" });
    const work = h("div", { style: "display:flex;flex-direction:column;gap:14px" });
    const search = h("input", { class: "rb-input", type: "search", placeholder: "이름으로 찾기", value: pm.q, "aria-label": "대상 찾기" });
    const paintList = () => {
      const list = (pm.kind === "module" ? mods : chars).filter((t) => !pm.q || t.name.toLowerCase().includes(pm.q.toLowerCase()));
      replace(
        pickBox,
        ...list.slice(0, 300).map((t) => h(
          "button",
          { type: "button", class: "rb-row", "aria-selected": pm.target?.key === t.key ? "true" : "false", onClick: () => {
            pm.target = t;
            paintList();
            paintWork();
          } },
          h("span", { style: "display:flex;color:var(--rb-sub)" }, icon(t.kind === "module" ? "module" : "character", 18)),
          h("div", { class: "txt" }, h("span", { class: "name" }, t.name || "(이름 없음)"), t.sub && h("span", { class: "meta" }, t.sub))
        )),
        !list.length && h("div", { class: "rb-empty" }, "없어요")
      );
    };
    search.addEventListener("input", () => {
      pm.q = search.value;
      paintList();
    });
    let token = 0;
    async function paintWork() {
      const my = ++token;
      const t = pm.target;
      if (!t) {
        replace(work, h("div", { class: "rb-empty" }, "위에서 패치를 만들 모듈이나 봇을 고르세요."));
        return;
      }
      replace(work, h("div", { class: "rb-empty" }, "비교하는 중…"));
      let cur, info, base, backups;
      try {
        [cur, info, backups] = await Promise.all([currentOf(ctx, t), store.baselineInfo(t.key), store.listBackups()]);
        base = pm.baseFrom?.key === t.key ? pm.baseFrom.view : info ? await store.getBaseline(t.key) : null;
      } catch (e) {
        if (my === token) replace(work, note("err", e?.message ?? String(e)));
        return;
      }
      if (my !== token) return;
      const targetId = t.kind === "module" ? t.id : t.chaId;
      const mineBackups = backups.filter((b) => b.target === targetId && b.path);
      const setBaseNow = async () => {
        if (base && !await confirmDialog(ctx.win, { title: "지금 상태를 배포 기준으로 할까요?", body: '지금 상태를 "배포한 버전"으로 기록해요. 이후 고친 부분만 패치에 들어가요.', ok: "기준으로 표시" })) return;
        await store.setBaseline(t.key, baseViewOf(t.kind, cur));
        pm.baseFrom = null;
        ctx.toast("지금 상태를 배포 기준으로 기록했어요");
        paintWork();
      };
      const baseCard2 = h(
        "div",
        { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:10px" },
        h(
          "div",
          { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" },
          h("b", null, "① 배포한 버전 (기준)"),
          base ? badge(pm.baseFrom?.key === t.key ? `기록에서 고름 · ${fmtWhen(pm.baseFrom.t)}` : `기록됨 · ${fmtWhen(info?.t)}`, "ok") : badge("없음", "warn")
        ),
        h("span", { class: "rb-muted", style: "white-space:normal" }, base ? "사람들에게 마지막으로 배포한 상태예요. 이 상태와 지금을 비교해서 바뀐 부분만 패치에 담아요." : '아직 기준이 없어요. 배포한 파일 그대로인 지금 "기준으로 표시"를 누르고, 그다음에 수정하세요. 이미 수정했다면 아래 기록에서 수정 전 상태를 고를 수 있어요.'),
        h(
          "div",
          { style: "display:flex;gap:8px;flex-wrap:wrap" },
          btn("지금 상태를 기준으로 표시", { size: "sm", icon: "check", onClick: setBaseNow, id: "rb-pm-setbase" }),
          mineBackups.length ? (() => {
            const sel = h(
              "select",
              { class: "rb-input", style: "height:36px;width:auto;max-width:100%", "aria-label": "기록에서 기준 고르기" },
              h("option", { value: "" }, "기록에서 기준 고르기…"),
              ...mineBackups.map((b) => h("option", { value: b.id }, `${new Date(b.t).toLocaleString()} · ${b.note || "백업"}`))
            );
            sel.addEventListener("change", async () => {
              const rec = mineBackups.find((b) => b.id === sel.value);
              if (!rec) return;
              try {
                const snap = await store.loadBackup(rec);
                pm.baseFrom = { key: t.key, t: rec.t, view: baseViewOf(t.kind, snap) };
                paintWork();
              } catch (e) {
                ctx.toast(`기록을 읽지 못했어요: ${e?.message ?? e}`, { error: true });
              }
            });
            return sel;
          })() : null
        )
      );
      if (!base) {
        replace(work, baseCard2);
        return;
      }
      const preview = await buildPatch({ kind: t.kind, name: cur.name, namespace: cur.namespace ?? cur.moduleNamespace, base, current: cur, readAsset: async () => null, includeAssets: false });
      if (my !== token) return;
      const items = preview ? planPatch(preview, base).items : [];
      const newAssets = preview?.changes ? [...changedAssetPaths(preview.changes)].length : 0;
      const groups = /* @__PURE__ */ new Map();
      for (const it of items) {
        const g = GROUP[it.group] ?? it.group;
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(it);
      }
      const changeCard = h(
        "div",
        { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:10px", id: "rb-pm-changes" },
        h(
          "div",
          { style: "display:flex;align-items:center;gap:8px" },
          h("b", null, "② 바뀐 내용"),
          badge(`${items.length}곳`, items.length ? "acc" : "mute"),
          preview ? h("span", { class: "rb-muted", style: "margin-left:auto", id: "rb-pm-size" }, `패치 크기 약 ${fmtBytes(new Blob([JSON.stringify(preview)]).size)}${newAssets ? ` + 바뀐 에셋 ${newAssets}개` : ""}`) : null
        ),
        items.length ? h(
          "div",
          { style: "display:flex;flex-direction:column;gap:10px;max-height:320px;overflow:auto" },
          ...[...groups].map(([g, list]) => h(
            "div",
            { style: "display:flex;flex-direction:column;gap:4px" },
            h("span", { class: "rb-label" }, `${g} (${list.length})`),
            ...list.slice(0, 200).map((it) => h("div", { style: "display:flex;gap:8px;align-items:center;min-width:0" }, badge(...KIND[it.kind] ?? [it.kind, "mute"]), h("span", { style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, String(it.label ?? it.id)))),
            list.length > 200 ? h("span", { class: "rb-muted" }, `외 ${list.length - 200}곳`) : null
          ))
        ) : h("span", { class: "rb-muted" }, "기준과 달라진 내용이 없어요. 수정한 다음 다시 열어 보세요.")
      );
      if (!items.length) {
        replace(work, baseCard2, changeCard);
        return;
      }
      const proj = findProject(ctx, t.kind, t.kind === "module" ? t.id : t.chaId);
      if (!pm.version && proj) pm.version = proj.version && proj.version !== proj.releases?.[0]?.version ? proj.version : nextVersion(proj.releases?.[0]?.version || proj.version);
      const ver = h("input", { class: "rb-input", value: pm.version ?? "", placeholder: "예: 1.1", "aria-label": "버전" });
      const who = h("input", { class: "rb-input", value: pm.author ?? (cur.creator ?? ""), placeholder: "제작자 이름", "aria-label": "제작자" });
      const memo = h("textarea", { class: "rb-textarea", placeholder: "받는 사람에게 보여 줄 변경 내용 (적용 전에 보여요)", style: "min-height:90px;font-family:inherit", "aria-label": "변경 내용" });
      memo.value = pm.note ?? "";
      ver.addEventListener("input", () => {
        pm.version = ver.value;
        fname.textContent = fileName();
      });
      who.addEventListener("input", () => {
        pm.author = who.value;
      });
      memo.addEventListener("input", () => {
        pm.note = memo.value;
      });
      let withAssets = pm.withAssets ?? true, moveBase = pm.moveBase ?? true;
      const fileName = () => `${safeFileName(cur.name)}${ver.value.trim() ? `_v${safeFileName(ver.value.trim())}` : ""}.rbupatch`;
      const fname = h("code", null, fileName());
      const row2 = (label, desc, on, set) => h(
        "div",
        { style: "display:flex;gap:12px;align-items:center" },
        h("div", { style: "flex:1;min-width:0;display:flex;flex-direction:column" }, h("span", null, label), h("span", { class: "rb-muted", style: "white-space:normal" }, desc)),
        switchEl(on, { label, onChange: (v) => set(v) })
      );
      const make = btn("패치 파일 만들기", { kind: "primary", size: "lg", icon: "download", id: "rb-pm-make", onClick: async () => {
        make.disabled = true;
        const tt = ctx.toast("패치 만드는 중…", { seconds: 120 });
        try {
          const fresh = await currentOf(ctx, t);
          const patch = await buildPatch({ kind: t.kind, name: fresh.name, namespace: fresh.namespace ?? fresh.moduleNamespace, base, current: fresh, readAsset: (p) => ctx.assets.read(p), includeAssets: withAssets, version: ver.value.trim(), note: memo.value.trim(), author: who.value.trim() });
          tt.close();
          if (!patch) {
            ctx.toast("기준과 달라진 내용이 없어요");
            return;
          }
          const text = JSON.stringify(patch);
          download(fileName(), text, "application/json");
          if (moveBase) {
            await store.setBaseline(t.key, baseViewOf(t.kind, fresh));
            pm.baseFrom = null;
          }
          const items2 = planPatch(patch, base).items.length;
          await recordRelease(ctx, t.kind, t.kind === "module" ? t.id : t.chaId, { version: ver.value.trim(), note: memo.value.trim(), size: text.length, items: items2, cumulative: !moveBase }).catch(() => {
          });
          pm.version = "";
          pm.note = "";
          ctx.toast(`패치를 만들었어요 (${fmtBytes(text.length)})${moveBase ? " · 지금 상태가 새 기준이에요" : ""}`);
          paintWork();
        } catch (e) {
          tt.close();
          ctx.toast(`만들지 못했어요: ${e?.message ?? e}`, { error: true });
        } finally {
          make.disabled = false;
        }
      } });
      const outCard = h(
        "div",
        { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:12px" },
        h("b", null, "③ 패치 정보"),
        h(
          "div",
          { class: "rb-form" },
          h("label", { class: "rb-field" }, h("span", { class: "rb-label" }, "버전"), ver),
          h("label", { class: "rb-field" }, h("span", { class: "rb-label" }, "제작자"), who),
          h("label", { class: "rb-field wide" }, h("span", { class: "rb-label" }, "변경 내용"), memo)
        ),
        row2("바뀐 에셋 넣기", "받는 사람이 이미지를 따로 구하지 않아도 돼요. 파일이 커질 수 있어요.", withAssets, (v) => {
          withAssets = pm.withAssets = v;
        }),
        row2("만든 뒤 지금 상태를 새 기준으로", "다음 패치에는 이번 이후에 고친 것만 들어가요. 끄면 기준이 그대로라 누적 패치가 돼요.", moveBase, (v) => {
          moveBase = pm.moveBase = v;
        }),
        h("div", { class: "rb-muted" }, "파일 이름: ", fname),
        h("div", null, make),
        note("info", '받는 사람은 모듈 메뉴나 봇 상세에서 "패치 적용"을 눌러 이 파일을 고르면 돼요. 받는 사람이 직접 고친 부분은 그대로 남아요.')
      );
      replace(work, baseCard2, changeCard, outCard);
    }
    replace(ctx.main, h(
      "div",
      { class: "rb-section rb-scroll", style: "flex:1;display:flex;flex-direction:column;gap:14px" },
      h("div", null, back),
      h("div", null, h("h2", { class: "rb-h2" }, "패치 만들기"), h("p", { class: "rb-p" }, "배포한 버전과 지금을 비교해서 바뀐 부분만 담은 업데이트 파일(.rbupatch)을 만들어요.")),
      segmented([["module", "모듈"], ["character", "봇"]], pm.kind, (v) => {
        pm.kind = v;
        if (pm.target?.kind !== v) pm.target = null;
        paintList();
        paintWork();
      }, "종류"),
      search,
      pickBox,
      work
    ));
    paintList();
    paintWork();
  }
  function openPatchMaker(ctx, target) {
    ctx.state.pm = { ...ctx.state.pm ?? {}, kind: target.kind, target, q: "" };
    ctx.go("dev", "patchmaker");
  }

  // src/ui/screens/patchui.js
  var keyOf2 = (kind, obj) => kind === "module" ? `m:${obj.id}` : `c:${obj.chaId}`;
  async function exportMyChanges(ctx, kind, obj) {
    const store = createStore(ctx.api);
    const base = await store.getBaseline(keyOf2(kind, obj));
    if (!base) {
      const ok = await confirmDialog(ctx.win, { title: "원본 기록이 없어요", body: '이 플러그인으로 가져오거나 업데이트한 적이 없어서 "제작자 원본"을 몰라요.\n지금 상태를 원본으로 기록해 둘까요? 그 뒤에 고친 것부터 내보낼 수 있어요.', ok: "지금 상태로 기록 시작" });
      if (ok) {
        await store.setBaseline(keyOf2(kind, obj), baseViewOf(kind, obj));
        ctx.toast("기록을 시작했어요. 이제부터 고친 내용을 내보낼 수 있어요.");
      }
      return;
    }
    const includeAssets = await confirmDialog(ctx.win, { title: "바꾼 에셋도 넣을까요?", body: "넣으면 받는 사람이 같은 이미지를 따로 구하지 않아도 돼요. 파일이 커질 수 있어요.", ok: "에셋 넣기", cancel: "글자만" });
    const t = ctx.toast("패치 만드는 중…", { seconds: 120 });
    try {
      const patch = await buildPatch({ kind, name: obj.name, namespace: obj.namespace ?? obj.moduleNamespace, base, current: obj, readAsset: (p) => ctx.assets.read(p), includeAssets });
      t.close();
      if (!patch) {
        ctx.toast("원본과 달라진 내용이 없어요");
        return;
      }
      download(`${safeFileName(obj.name)}.rbupatch`, JSON.stringify(patch), "application/json");
      ctx.toast("내 수정 패치를 내보냈어요");
    } catch (e) {
      t.close();
      ctx.toast(`만들지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  }
  async function applyPatchFile(ctx, kind, getTarget, save) {
    const [f] = await pickFiles({ accept: ".rbupatch,application/json" });
    if (!f) return;
    let patch;
    try {
      patch = parsePatch(await f.text());
    } catch (e) {
      ctx.toast(e?.message ?? String(e), { error: true });
      return;
    }
    if (patch.kind !== kind) {
      ctx.toast(`${patch.kind === "module" ? "모듈" : "캐릭터"}용 패치예요`, { error: true });
      return;
    }
    const target = await getTarget();
    const plan = planPatch(patch, target);
    const s = plan.summary;
    const lines = [
      `패치: ${patch.name}${patch.version ? ` v${patch.version}` : ""}${patch.name !== target.name ? ` → 적용 대상: ${target.name}` : ""}`,
      patch.author ? `제작자: ${patch.author}` : "",
      patch.note ? `변경 내용:
${patch.note}` : "",
      `패치의 수정 ${s.update ?? 0} · 내 수정 유지 ${s.mine ?? 0} · 충돌 ${s.conflict ?? 0}(패치 쪽으로) · 추가 ${s.added ?? 0} · 삭제 ${s.removed ?? 0}`,
      Object.keys(patch.assets ?? {}).length ? `에셋 ${Object.keys(patch.assets).length}개를 올려요` : "",
      "적용하기 전 상태는 백업해요."
    ].filter(Boolean);
    if (!plan.items.length) {
      ctx.toast("적용할 내용이 없어요 (이미 같아요)");
      return;
    }
    if (!await confirmDialog(ctx.win, { title: "패치를 적용할까요?", body: lines.join("\n"), ok: "적용" })) return;
    try {
      const cur = await getTarget();
      if (kind === "character" && isGenerating(cur)) throw new Busy();
      await createStore(ctx.api).addBackup({ kind, target: kind === "module" ? cur.id : cur.chaId, name: cur.name, snapshot: backupSnapshot(kind, cur), note: "패치 적용 전", summary: `${f.name}` });
      const r = await applyPatch(patch, cur, { saveAsset: (d) => ctx.api.saveAsset(d) });
      await save(r.result, cur);
      ctx.toast("패치를 적용했어요");
    } catch (e) {
      ctx.toast(`적용하지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  }
  function changedKeys(before, after) {
    const out = {};
    for (const k of /* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])) if (k !== "id" && stableJson(before[k] ?? null) !== stableJson(after[k] ?? null)) out[k] = after[k];
    return out;
  }

  // src/ui/screens/modules.js
  var FILTERS = [["all", "전체"], ["on", "켜짐"], ["off", "꺼짐"], ["global", "전역"], ["lla", "LLA"], ["mcp", "MCP"]];
  function searchText(m) {
    const parts = [m.name, m.namespace, m.description];
    for (const l of m.lorebook ?? []) parts.push(l?.comment, l?.key, l?.secondkey);
    for (const r of m.regex ?? []) parts.push(r?.comment);
    for (const r of m.trigger ?? []) parts.push(r?.comment);
    return parts.filter(Boolean).join("\n").toLowerCase();
  }
  var COARSE2 = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  async function renderModules(ctx) {
    const st = ctx.state;
    st.modFilter ??= "all";
    if (!st.modData || st.modDirty) {
      if (!st.modData) replace(ctx.main, h("div", { class: "rb-empty" }, "모듈을 불러오는 중…"));
      st.modData = await ctx.svc.load();
      st.modDirty = false;
      st.modIndex = new Map(st.modData.entries.map((e) => [e.module.id, searchText(e.module)]));
    }
    draw(ctx);
  }
  function draw(ctx) {
    const st = ctx.state;
    const { entries, globalOn } = st.modData;
    const meta = ctx.prefs.meta;
    ctx.setNavCount("modules", entries.length);
    const q = st.search.trim().toLowerCase();
    const filtering = !!q || st.modFilter !== "all";
    if (st.modFolder && !meta.folders.some((f) => f.id === st.modFolder)) st.modFolder = void 0;
    const fv = st.modFolder;
    const inView = (e) => fv === void 0 || (meta.mapping[e.module.id] ?? "") === fv;
    const pass = (e) => {
      if (!inView(e)) return false;
      const f = moduleFlags(e.module, globalOn);
      if (st.modFilter === "on" && !e.enabled) return false;
      if (st.modFilter === "off" && e.enabled) return false;
      if (["global", "lla", "mcp"].includes(st.modFilter) && !f[st.modFilter]) return false;
      return !q || st.modIndex.get(e.module.id)?.includes(q);
    };
    const count = (id) => entries.filter((e) => inView(e)).filter((e) => id === "all" || id === "on" && e.enabled || id === "off" && !e.enabled || moduleFlags(e.module, globalOn)[id]).length;
    const shown = entries.filter(pass);
    if (!st.modSel || !entries.some((e) => e.module.id === st.modSel)) st.modSel = shown[0]?.module.id ?? null;
    const toolbar = h(
      "div",
      { class: "rb-chips", role: "toolbar", "aria-label": "필터" },
      FILTERS.map(([id, label]) => chip(label, { pressed: st.modFilter === id, count: count(id), onClick: () => {
        st.modFilter = id;
        draw(ctx);
      } })),
      h("div", { class: "rb-spacer" }),
      filtering ? null : btn(multiOf(ctx).active ? "선택 끝" : "선택", { size: "sm", icon: "check", id: "rb-pick-toggle", onClick: () => {
        const mu2 = multiOf(ctx);
        mu2.setMode(!mu2.active);
      } }),
      btn("폴더", { size: "sm", icon: "folderPlus", onClick: () => newFolder(ctx) }),
      btn("새 모듈", { size: "sm", kind: "primary", icon: "plus", onClick: () => newModule(ctx) })
    );
    const inFolder2 = (id) => entries.filter((e) => (meta.mapping[e.module.id] ?? "") === id).length;
    const setView = (v) => {
      st.modFolder = v;
      draw(ctx);
    };
    const folderBar = meta.folders.length ? h(
      "div",
      { class: "rb-chips rb-fchips", role: "toolbar", "aria-label": "폴더별 보기" },
      chip("모든 폴더", { pressed: fv === void 0, onClick: () => setView(void 0) }),
      meta.folders.map((f) => {
        const tint = folderTint(f.color, st.mode);
        const c = chip(
          h("span", { style: "display:inline-flex;align-items:center;gap:6px" }, h("span", { style: { color: tint?.stroke ?? "var(--rb-sub)", display: "flex" } }, icon("folder", 14)), f.name || "(이름 없음)"),
          { pressed: fv === f.id, count: inFolder2(f.id), onClick: () => setView(fv === f.id ? void 0 : f.id) }
        );
        c.dataset.folderView = f.id;
        return c;
      }),
      chip("폴더 없음", { pressed: fv === "", count: inFolder2(""), onClick: () => setView(fv === "" ? void 0 : "") })
    ) : null;
    const list = h("div", { class: "rb-list rb-scroll", role: "listbox", "aria-label": "모듈 목록" });
    const grouped = groupByFolder(shown, meta);
    const folders = fv === void 0 ? grouped.folders : [];
    const loose = fv === void 0 ? grouped.loose : shown;
    for (const g of folders) {
      if (filtering && !g.items.length) continue;
      const f = g.folder;
      const tint = folderTint(f.color, ctx.state.mode) ?? { stroke: "var(--rb-sub)", fill: "transparent" };
      const open = filtering || !f.collapsed;
      const head = h(
        "div",
        { style: "display:flex;align-items:center;gap:4px", dataset: filtering ? {} : { dropFolder: f.id } },
        h(
          "button",
          { type: "button", class: "rb-folder", "aria-expanded": open ? "true" : "false", dataset: { folder: f.id }, onClick: () => {
            if (filtering) return;
            ctx.svc.toggleFolder(f.id).catch((err) => ctx.toast(err?.message ?? String(err), { error: true }));
            draw(ctx);
          } },
          h("span", { class: "chev" }, icon("chevron", 14)),
          h("span", { style: { color: tint.stroke, display: "flex" } }, icon("folder", 16)),
          h("b", null, f.name),
          h("small", null, String(g.items.length))
        ),
        iconBtn("more", `${f.name} 폴더 메뉴`, { onClick: (e) => folderMenu(ctx, f, e.currentTarget) })
      );
      dropTarget(ctx, head, { folderId: f.id });
      list.appendChild(head);
      if (open) {
        const body = h("div", { class: "rb-folder-body" });
        for (const e of g.items) body.appendChild(row(ctx, e, filtering));
        if (!g.items.length) body.appendChild(h("div", { class: "rb-muted", style: "padding:8px 10px" }, "모듈을 여기로 끌어다 놓으세요"));
        list.appendChild(body);
      }
    }
    if (fv !== void 0 && !filtering) list.dataset.dropFolder = fv;
    if (folders.length) list.appendChild(h("div", { class: "rb-label", style: "padding:14px 12px 6px;border-radius:10px", dataset: filtering ? {} : { dropFolder: "" } }, "폴더 없음"));
    for (const e of loose) list.appendChild(row(ctx, e, filtering));
    if (folders.length) dropTarget(ctx, list, { folderId: null, onlySelf: true });
    if (!shown.length) list.appendChild(h("div", { class: "rb-empty" }, fv !== void 0 && !filtering ? '이 폴더에 모듈이 없어요. 폴더 메뉴의 "넣을 모듈 고르기"로 넣을 수 있어요.' : entries.length ? "조건에 맞는 모듈이 없어요." : '설치된 모듈이 없어요. 위의 "가져오기"나 파일을 창에 끌어 놓아서 추가하세요.'));
    const scroll = ctx.main.querySelector(".rb-list")?.scrollTop ?? 0;
    const bar = h("div", { class: "rb-pickbar", role: "toolbar", "aria-label": "고른 모듈" });
    replace(ctx.main, toolbar, folderBar, bar, list);
    list.scrollTop = scroll;
    const mu = multiOf(ctx);
    if (filtering) mu.clear();
    mu.bar = bar;
    mu.ctx = ctx;
    mu.attach(list);
    paintBar(ctx);
    showDetail(ctx);
  }
  function multiOf(ctx) {
    const st = ctx.state;
    st.modMulti ??= createMulti({ onChange: () => paintBar(ctx) });
    return st.modMulti;
  }
  function paintBar(ctx) {
    const mu = multiOf(ctx), bar = mu.bar;
    if (!bar) return;
    const tb = ctx.main.querySelector("#rb-pick-toggle");
    if (tb) tb.lastChild.textContent = mu.active ? "선택 끝" : "선택";
    bar.hidden = !mu.active;
    if (!mu.active) {
      bar.replaceChildren();
      return;
    }
    const n = mu.sel.size;
    const visible = () => [...ctx.main.querySelectorAll(".rb-list [data-pick]")].map((r) => r.dataset.pick);
    bar.replaceChildren(
      h("b", null, n ? `${n}개 고름` : "고를 모듈을 누르세요"),
      btn("폴더로", { size: "sm", icon: "folder", disabled: !n, onClick: (ev) => pickFolderFor(ctx, mu.ordered(), ev.currentTarget) }),
      btn("폴더 밖으로", { size: "sm", disabled: !n, onClick: () => applyDrop(ctx, mu.ordered(), { folderId: null }) }),
      btn("보이는 것 모두", { size: "sm", onClick: () => {
        const v = visible();
        mu.set(v.every((id) => mu.has(id)) ? [] : v);
      } }),
      iconBtn("x", "고르기 끝내기", { onClick: () => mu.clear() })
    );
  }
  function pickFolderFor(ctx, ids, anchor) {
    const meta = ctx.prefs.meta;
    openMenu(ctx.win, anchor, [
      ...meta.folders.map((f) => ({ label: f.name || "(이름 없는 폴더)", icon: "folder", onClick: () => applyDrop(ctx, ids, { folderId: f.id }) })),
      meta.folders.length ? "sep" : null,
      { label: "새 폴더…", icon: "folderPlus", onClick: async () => {
        const n = await promptDialog(ctx.win, { title: "새 폴더", label: `고른 모듈 ${ids.length}개를 넣어요`, placeholder: "폴더 이름" });
        if (!n?.trim()) return;
        const f = await ctx.svc.createFolder(n.trim(), FOLDER_SWATCHES[meta.folders.length % FOLDER_SWATCHES.length]);
        await applyDrop(ctx, ids, { folderId: f.id });
      } }
    ].filter(Boolean));
  }
  function row(ctx, e, filtering) {
    const st = ctx.state, m = e.module, c = moduleCounts(m), f = moduleFlags(m, st.modData.globalOn);
    const meta = [c.lore && `로어 ${c.lore}`, c.regex && `정규식 ${c.regex}`, c.trigger && `트리거 ${c.trigger}`, c.assets && `에셋 ${c.assets}`].filter(Boolean).join(" · ") || "비어 있음";
    const color = readableName(ctx.prefs.meta.nameColors?.[m.id], st.mode);
    const sw = switchEl(e.enabled, { label: `${m.name} ${e.enabled ? "끄기" : "켜기"}`, onChange: (on) => toggleEnabled(ctx, e, on, sw) });
    if (!e.enabled && !hasAssets(m)) sw.title = "켜기";
    else if (hasAssets(m)) sw.title = "에셋이 있는 모듈은 끌 수 없어요";
    let grip = null;
    const mu = multiOf(ctx);
    const el = h(
      "div",
      {
        class: ["rb-row", !e.enabled && "off"],
        role: "option",
        tabindex: "0",
        "aria-selected": st.modSel === m.id ? "true" : "false",
        dataset: filtering ? { id: m.id } : { id: m.id, dropRow: m.id, pick: m.id },
        draggable: filtering || COARSE2 ? "false" : "true",
        onClick: (ev) => {
          if (!filtering && mu.click(ev, m.id, st.modSel)) return;
          select(ctx, m.id, el);
        },
        onKeydown: (ev) => {
          if (ev.target !== el) return;
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            select(ctx, m.id, el);
          }
          if (ev.altKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown")) {
            ev.preventDefault();
            move(ctx, m.id, ev.key === "ArrowUp" ? -1 : 1);
          }
          if (!ev.altKey && (ev.key === "ArrowDown" || ev.key === "ArrowUp")) {
            ev.preventDefault();
            const rows = [...ctx.main.querySelectorAll(".rb-row")];
            rows[rows.indexOf(el) + (ev.key === "ArrowDown" ? 1 : -1)]?.focus();
          }
        }
      },
      filtering ? null : h("span", { class: "rb-mcb", role: "checkbox", "aria-checked": "false", "aria-label": `${m.name} 고르기` }),
      filtering ? null : grip = h("span", { class: "grip", title: "끌어서 순서 바꾸기 (Alt+↑↓) · Ctrl/⌘·Shift+클릭으로 여러 개", "aria-hidden": "true" }, icon("grip", 14)),
      h(
        "div",
        { class: "txt" },
        h(
          "div",
          { class: "ttl" },
          h("span", { class: "name", style: color && e.enabled ? { color } : null }, m.name || "(이름 없음)"),
          f.global && badge("전역", "acc"),
          f.lla && badge("LLA", "warn"),
          f.mcp && badge("MCP", "ok"),
          !e.enabled && badge("꺼짐", "mute")
        ),
        h("span", { class: "meta" }, meta)
      ),
      sw,
      iconBtn("more", `${m.name} 메뉴`, { onClick: (ev) => {
        ev.stopPropagation();
        moduleMenu(ctx, e, ev.currentTarget);
      } })
    );
    if (!filtering) {
      dragSource(ctx, el, m.id);
      dropTarget(ctx, el, { beforeId: m.id });
      queueMicrotask(() => {
        const list = el.closest(".rb-list");
        if (list && grip) gripDrag({ grip, row: el, root: list, scroller: list, mouse: false, count: () => mu.dragIds(m.id).length, skip: (t) => mu.dragIds(m.id).includes(t.getAttribute("data-drop-row")), onDrop: (d) => applyDrop(ctx, mu.dragIds(m.id), d) });
      });
    }
    return el;
  }
  function select(ctx, id, el) {
    ctx.state.modSel = id;
    ctx.main.querySelectorAll(".rb-row[aria-selected=true]").forEach((r) => r.setAttribute("aria-selected", "false"));
    el?.setAttribute("aria-selected", "true");
    showDetail(ctx);
    if (ctx.isMobile()) ctx.openSheet();
  }
  async function toggleEnabled(ctx, e, on, sw) {
    setSwitch(sw, on);
    try {
      await ctx.svc.run("setEnabled", e.module.id, on);
      ctx.toast(on ? `'${e.module.name}'을(를) 켰어요` : `'${e.module.name}'을(를) 껐어요`, on ? {} : { action: { label: "되돌리기", run: () => ctx.svc.run("setEnabled", e.module.id, true).then(() => reload(ctx)) }, seconds: 8 });
      await reload(ctx);
    } catch (err) {
      setSwitch(sw, !on);
      ctx.toast(err?.message ?? String(err), { error: true });
    }
  }
  async function reload(ctx) {
    ctx.state.modDirty = true;
    ctx.state.modData = await ctx.svc.load();
    ctx.state.modIndex = new Map(ctx.state.modData.entries.map((e) => [e.module.id, searchText(e.module)]));
    ctx.state.modDirty = false;
    if (ctx.state.tab === "modules") draw(ctx);
  }
  var dragIds = null;
  function dragSource(ctx, el, id) {
    el.addEventListener("dragstart", (ev) => {
      dragIds = multiOf(ctx).dragIds(id);
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/x-rbm-module", dragIds.join("\n"));
      if (dragIds.length > 1) {
        const g = el.cloneNode(true);
        Object.assign(g.style, { position: "absolute", top: "-1000px", left: "0", width: `${el.offsetWidth}px`, background: "var(--rb-surf2)", borderRadius: "12px" });
        g.appendChild(dragBadge(el.ownerDocument, dragIds.length));
        ctx.win.appendChild(g);
        ev.dataTransfer.setDragImage(g, 24, 20);
        setTimeout(() => g.remove(), 0);
        ctx.main.querySelectorAll(".rb-row.picked").forEach((r) => {
          r.style.opacity = "0.5";
        });
      }
      el.style.opacity = "0.5";
    });
    el.addEventListener("dragend", () => {
      dragIds = null;
      ctx.main.querySelectorAll(".rb-row").forEach((r) => {
        r.style.opacity = "";
      });
      ctx.main.querySelectorAll("[data-drop]").forEach((x) => {
        x.removeAttribute("data-drop");
        x.style.boxShadow = "";
      });
    });
  }
  function dropTarget(ctx, el, { beforeId, folderId, onlySelf }) {
    const ok = (ev) => dragIds && [...ev.dataTransfer?.types ?? []].includes("text/x-rbm-module") && (!onlySelf || ev.target === el) && !(beforeId && dragIds.includes(beforeId));
    el.addEventListener("dragover", (ev) => {
      if (!ok(ev)) return;
      ev.preventDefault();
      ev.stopPropagation();
      const after = beforeId && ev.offsetY > el.clientHeight / 2;
      const d = after ? "after" : "before";
      if (el.dataset.drop === d) return;
      el.dataset.drop = d;
      el.style.boxShadow = beforeId ? after ? "inset 0 -2px 0 var(--rb-acc-text)" : "inset 0 2px 0 var(--rb-acc-text)" : "inset 0 0 0 2px var(--rb-sel-ring)";
    });
    el.addEventListener("dragleave", (ev) => {
      if (el.contains(ev.relatedTarget)) return;
      el.style.boxShadow = "";
      el.removeAttribute("data-drop");
    });
    el.addEventListener("drop", (ev) => {
      if (!ok(ev)) return;
      ev.preventDefault();
      ev.stopPropagation();
      const ids = dragIds, after = el.dataset.drop === "after";
      el.style.boxShadow = "";
      el.removeAttribute("data-drop");
      if (!ids?.length) return;
      applyDrop(ctx, ids, { beforeId, after, folderId });
    });
  }
  function applyDrop(ctx, ids, { beforeId, after, folderId }) {
    ids = [].concat(ids);
    if (beforeId && ids.includes(beforeId)) return;
    const st = ctx.state, meta = ctx.prefs.meta;
    const fail = (err) => {
      ctx.toast(`옮기지 못했어요: ${err?.message ?? err}`, { error: true });
      reload(ctx);
    };
    const target = beforeId ? meta.mapping[beforeId] ?? null : folderId ?? null;
    const moveFolder2 = ids.filter((id) => (meta.mapping[id] ?? null) !== target);
    if (moveFolder2.length) ctx.svc.setFolder(moveFolder2, target).catch(fail);
    if (beforeId) {
      const before = st.modData.entries.map((e) => e.module.id);
      const next = placeIds(before, ids, beforeId, after);
      if (next.join("\n") !== before.join("\n")) {
        const pos = new Map(next.map((id, i) => [id, i]));
        st.modData.entries.sort((a, b) => pos.get(a.module.id) - pos.get(b.module.id));
        ctx.svc.queueOrder(() => ctx.state.modData.entries.map((e) => e.module.id)).catch(fail);
      }
    }
    if (ids.length > 1) ctx.toast(target ? `모듈 ${ids.length}개를 '${meta.folders.find((f) => f.id === target)?.name ?? "폴더"}'(으)로 옮겼어요` : `모듈 ${ids.length}개를 옮겼어요`);
    draw(ctx);
  }
  async function move(ctx, id, dir) {
    const meta = ctx.prefs.meta;
    const entries = ctx.state.modData.entries;
    const group = entries.filter((e) => (meta.mapping[e.module.id] ?? null) === (meta.mapping[id] ?? null)).map((e) => e.module.id);
    const i = group.indexOf(id), j = i + dir;
    if (j < 0 || j >= group.length) return;
    const ids = entries.map((e) => e.module.id).filter((x) => x !== id);
    const at = ids.indexOf(group[j]) + (dir > 0 ? 1 : 0);
    ids.splice(at, 0, id);
    await ctx.svc.run("reorder", ids);
    await reload(ctx);
    ctx.main.querySelector(`.rb-row[data-id="${CSS.escape(id)}"]`)?.focus();
  }
  function moduleMenu(ctx, e, anchor) {
    const m = e.module;
    openMenu(ctx.win, anchor, [
      { label: "편집", icon: "edit", onClick: () => ctx.openEditor(m.id) },
      { label: "에셋 관리", icon: "image", onClick: () => ctx.openAssets(m.id) },
      "sep",
      { label: "이름 색", icon: "palette", onClick: () => pickNameColor(ctx, m) },
      { label: "폴더로 옮기기", icon: "folder", onClick: () => pickFolder(ctx, m) },
      { label: "위로", icon: "up", onClick: () => move(ctx, m.id, -1) },
      { label: "아래로", icon: "down", onClick: () => move(ctx, m.id, 1) },
      "sep",
      { label: ".risum으로 내보내기", icon: "download", onClick: () => exportRisum(ctx, m) },
      isDev(ctx) && !findProject(ctx, "module", m.id) ? { label: "개발 목록에 넣기", icon: "code", onClick: async () => {
        await addProjects(ctx, [{ kind: "module", id: m.id }]);
        ctx.state.devSel = `m:${m.id}`;
        ctx.toast(`'${m.name}'을(를) 개발 목록에 넣었어요`, { action: { label: "개발 탭", run: () => ctx.go("dev") } });
      } } : null,
      isDev(ctx) ? { label: "패치 만들기 (개발자)", icon: "code", onClick: () => openPatchMaker(ctx, { kind: "module", key: `m:${m.id}`, id: m.id, name: m.name ?? "" }) } : { label: "내 수정만 내보내기 (.rbupatch)", icon: "download", onClick: () => exportMyChanges(ctx, "module", m) },
      { label: "패치 적용…", icon: "upload", onClick: () => applyPatchFile(ctx, "module", async () => (await ctx.svc.load()).entries.find((x) => x.module.id === m.id)?.module ?? m, async (res, cur) => {
        await ctx.svc.run("update", m.id, changedKeys(cur, res));
        await reload(ctx);
      }) },
      { label: "JSON 복사", icon: "link", onClick: async () => ctx.toast(await copyText(moduleJson(m)) ? "JSON을 복사했어요" : "복사하지 못했어요", { error: false }) },
      { label: "이름 바꾸기", icon: "edit", onClick: () => renameModule(ctx, m) },
      "sep",
      { label: "삭제", icon: "trash", danger: true, onClick: () => removeModule(ctx, m) }
    ]);
  }
  function folderMenu(ctx, f, anchor) {
    openMenu(ctx.win, anchor, [
      { label: "넣을 모듈 고르기…", icon: "plus", onClick: () => pickFolderMembers(ctx, f) },
      { label: "이름 바꾸기", icon: "edit", onClick: async () => {
        const n = await promptDialog(ctx.win, { title: "폴더 이름", value: f.name });
        if (n?.trim()) {
          await ctx.svc.renameFolder(f.id, n.trim());
          draw(ctx);
        }
      } },
      { label: "폴더 색", icon: "palette", onClick: async () => {
        const c = await colorDialog(ctx.win, { title: "폴더 색", swatches: FOLDER_SWATCHES, value: f.color, previewText: f.name });
        if (c !== null) {
          await ctx.svc.colorFolder(f.id, c);
          draw(ctx);
        }
      } },
      { label: "위로", icon: "up", onClick: async () => {
        await ctx.svc.moveFolder(f.id, -1);
        draw(ctx);
      } },
      { label: "아래로", icon: "down", onClick: async () => {
        await ctx.svc.moveFolder(f.id, 1);
        draw(ctx);
      } },
      "sep",
      { label: "폴더 삭제 (모듈은 남음)", icon: "trash", danger: true, onClick: async () => {
        if (await confirmDialog(ctx.win, { title: `'${f.name}' 폴더를 지울까요?`, body: '안에 있던 모듈은 지워지지 않고 "폴더 없음"으로 옮겨져요.', ok: "폴더 삭제", danger: true })) {
          await ctx.svc.deleteFolder(f.id);
          draw(ctx);
        }
      } }
    ]);
  }
  function moduleItems(ctx) {
    const meta = ctx.prefs.meta, names = new Map(meta.folders.map((f) => [f.id, f.name]));
    return ctx.state.modData.entries.map((e) => ({
      id: e.module.id,
      label: e.module.name,
      folder: meta.mapping[e.module.id] ?? null,
      sub: [meta.mapping[e.module.id] ? `지금: ${names.get(meta.mapping[e.module.id]) ?? "폴더"}` : "폴더 없음", !e.enabled && "꺼짐"].filter(Boolean).join(" · ")
    }));
  }
  async function newFolder(ctx) {
    const r = await folderDialog(ctx.win, { title: "새 폴더", items: moduleItems(ctx), noun: "모듈", ...folderPickPrefs(ctx) });
    if (!r) return;
    const f = await ctx.svc.createFolder(r.name, FOLDER_SWATCHES[ctx.prefs.meta.folders.length % FOLDER_SWATCHES.length]);
    if (r.ids.length) await ctx.svc.setFolder(r.ids, f.id);
    draw(ctx);
    ctx.toast(`'${r.name}' 폴더를 만들었어요${r.ids.length ? ` (모듈 ${r.ids.length}개)` : ""}`);
  }
  async function pickFolderMembers(ctx, f) {
    const before = Object.entries(ctx.prefs.meta.mapping).filter(([, v]) => v === f.id).map(([k]) => k);
    const r = await folderDialog(ctx.win, { title: `'${f.name}' 폴더에 넣을 모듈`, items: moduleItems(ctx), checked: before, ok: "저장", withName: false, noun: "모듈", current: f.id, ...folderPickPrefs(ctx) });
    if (!r) return;
    const out = before.filter((id) => !r.ids.includes(id));
    if (out.length) await ctx.svc.setFolder(out, null);
    if (r.ids.length) await ctx.svc.setFolder(r.ids, f.id);
    draw(ctx);
  }
  async function newModule(ctx) {
    const n = await promptDialog(ctx.win, { title: "새 모듈", label: "모듈 이름", placeholder: "예: 내 로어북" });
    if (!n?.trim()) return;
    const m = ctx.svc.newModule(n.trim());
    await ctx.svc.run("create", m);
    ctx.state.modSel = m.id;
    await reload(ctx);
    ctx.toast(`'${m.name}' 모듈을 만들었어요`);
  }
  async function renameModule(ctx, m) {
    const n = await promptDialog(ctx.win, { title: "모듈 이름", value: m.name });
    if (!n?.trim() || n.trim() === m.name) return;
    await ctx.svc.run("update", m.id, { name: n.trim() });
    await reload(ctx);
  }
  async function pickNameColor(ctx, m) {
    const c = await colorDialog(ctx.win, { title: "이름 색", swatches: NAME_SWATCHES, value: ctx.prefs.meta.nameColors?.[m.id] ?? "", previewText: m.name });
    if (c === null) return;
    await ctx.svc.setNameColor(m.id, c);
    draw(ctx);
  }
  async function pickFolder(ctx, m) {
    const meta = ctx.prefs.meta;
    if (!meta.folders.length) {
      await newFolder(ctx);
      if (!ctx.prefs.meta.folders.length) return;
    }
    const anchor = ctx.main.querySelector(`.rb-row[data-id="${CSS.escape(m.id)}"] .rb-icon-btn`) ?? ctx.main;
    openMenu(ctx.win, anchor, [
      ...ctx.prefs.meta.folders.map((f) => ({ label: (meta.mapping[m.id] === f.id ? "✓ " : "") + f.name, icon: "folder", onClick: async () => {
        await ctx.svc.setFolder(m.id, f.id);
        draw(ctx);
      } })),
      "sep",
      { label: "폴더에서 빼기", icon: "x", onClick: async () => {
        await ctx.svc.setFolder(m.id, null);
        draw(ctx);
      } },
      { label: "새 폴더…", icon: "folderPlus", onClick: async () => {
        const n = await promptDialog(ctx.win, { title: "새 폴더", label: "폴더 이름" });
        if (n?.trim()) {
          const f = await ctx.svc.createFolder(n.trim(), FOLDER_SWATCHES[meta.folders.length % FOLDER_SWATCHES.length]);
          await ctx.svc.setFolder(m.id, f.id);
          draw(ctx);
        }
      } }
    ]);
  }
  async function removeModule(ctx, m) {
    const ok = await confirmDialog(ctx.win, { title: `'${m.name}'을(를) 지울까요?`, body: '모든 캐릭터·채팅·페르소나 연결에서도 빠져요. 지우기 전 상태는 백업해 두니 "기록" 탭에서 되살릴 수 있어요.', ok: "삭제", danger: true });
    if (!ok) return;
    try {
      await createStore(ctx.api).addBackup({ kind: "module", target: m.id, name: m.name, snapshot: m, note: "삭제 전" });
    } catch (err) {
      if (!await confirmDialog(ctx.win, { title: "백업을 만들지 못했어요", body: `${err?.message ?? err}
그래도 지울까요?`, ok: "그래도 삭제", danger: true })) return;
    }
    await ctx.svc.run("remove", m.id);
    await reload(ctx);
    ctx.toast(`'${m.name}'을(를) 지웠어요`);
  }
  async function exportRisum(ctx, m) {
    const t = ctx.toast(`'${m.name}' 내보내는 중…`, { seconds: 60 });
    try {
      const blob = await buildRisum(m, (p) => ctx.assets.read(p));
      download(`${safeFileName(m.name)}.risum`, blob);
      t.close();
      ctx.toast("내보냈어요");
    } catch (err) {
      t.close();
      ctx.toast(`내보내지 못했어요: ${err?.message ?? err}`, { error: true });
    }
  }
  async function showDetail(ctx) {
    const st = ctx.state, data = st.modData;
    const e = data?.entries.find((x) => x.module.id === st.modSel);
    if (!e) {
      ctx.showDetail(h("div", { class: "rb-empty" }, "모듈을 고르면 여기에 자세히 보여요."));
      return;
    }
    const m = e.module, c = moduleCounts(m), f = moduleFlags(m, data.globalOn);
    const stat = (label, v) => h("div", { class: "rb-stat" }, h("small", null, label), h("b", null, String(v)));
    const globalSw = switchEl(f.global, { label: "글로벌 활성화", disabled: !e.enabled, onChange: async (on) => {
      setSwitch(globalSw, on);
      try {
        await ctx.svc.run("setGlobal", m.id, on);
        await reload(ctx);
      } catch (err) {
        setSwitch(globalSw, !on);
        ctx.toast(err?.message ?? String(err), { error: true });
      }
    } });
    const links = h(
      "div",
      { class: "rb-card" },
      h("div", { class: "rb-kv" }, h("span", null, "글로벌 활성화", h("br"), h("small", { class: "rb-muted" }, "모든 캐릭터·채팅에서 켜짐")), globalSw)
    );
    const personaBox = h("div", { class: "rb-card" }, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "불러오는 중…")));
    const charBox = h("div", { class: "rb-card" });
    const chatBox = h("div", { class: "rb-card" });
    const timeline = h("div", { style: "display:flex;flex-direction:column" });
    ctx.showDetail(
      h(
        "div",
        { style: "display:flex;flex-direction:column;gap:6px" },
        m.namespace ? h("span", { style: "font-size:12px;color:var(--rb-acc-text)" }, m.namespace) : null,
        h("h2", { class: "rb-h2", style: readableName(ctx.prefs.meta.nameColors?.[m.id], st.mode) ? { color: readableName(ctx.prefs.meta.nameColors[m.id], st.mode) } : null }, m.name || "(이름 없음)"),
        m.description ? h("p", { class: "rb-p", style: "white-space:pre-line;max-height:120px;overflow:auto" }, m.description) : null,
        !e.enabled ? note("info", "꺼진 모듈이에요. 켜면 다시 연결할 수 있어요.") : null
      ),
      h("div", { class: "rb-stats" }, stat("로어북", c.lore), stat("정규식", c.regex), stat("트리거", c.trigger), stat("에셋", c.assets)),
      h(
        "div",
        { class: "rb-field" },
        h("span", { class: "rb-label" }, "연결"),
        links,
        h("span", { class: "rb-label", style: "margin-top:6px" }, "페르소나 — 그 페르소나를 쓰는 동안 자동으로 켜짐"),
        personaBox,
        h("span", { class: "rb-label", style: "margin-top:6px" }, "캐릭터 — 그 캐릭터의 모든 채팅에서 켜짐"),
        charBox,
        h("span", { class: "rb-label", style: "margin-top:6px" }, "지금 채팅"),
        chatBox
      ),
      h("div", { class: "rb-field" }, h(
        "div",
        { style: "display:flex;align-items:center" },
        h("span", { class: "rb-label", style: "flex:1" }, "버전 타임라인"),
        h("a", { href: "#", style: "font-size:12px;color:var(--rb-acc-text)", onClick: (ev) => {
          ev.preventDefault();
          ctx.state.histTarget = m.id;
          ctx.go("history");
        } }, "전체 보기")
      ), timeline),
      h("div", { style: "flex:1" }),
      h(
        "div",
        { style: "display:flex;gap:8px;flex-wrap:wrap" },
        btn("편집", { kind: "primary", size: "lg", icon: "edit", onClick: () => ctx.openEditor(m.id) }),
        btn("에셋", { size: "lg", icon: "image", onClick: () => ctx.openAssets(m.id) }),
        btn("내보내기", { size: "lg", icon: "download", onClick: () => exportRisum(ctx, m) })
      )
    );
    (async () => {
      const [db, pm] = await Promise.all([ctx.api.getDatabase(["personas"]), loadPersonaMap(ctx.api)]);
      const personas = (db?.personas ?? []).filter((p) => p?.id);
      const linked = (p) => (pm.map[p.id] ?? []).includes(m.id);
      personas.sort((a, b) => Number(linked(b)) - Number(linked(a)));
      const box = h("div", { class: "rb-scroll", style: "max-height:232px;overflow:auto;overscroll-behavior:contain", id: "rb-persona-box" });
      const q = personas.length > 6 ? h("input", { class: "rb-input", type: "search", placeholder: `페르소나 ${personas.length}개에서 찾기`, "aria-label": "페르소나 찾기", style: "height:36px;border-radius:0;border-width:0 0 1px 0" }) : null;
      const rows = personas.length ? personas.map((p) => {
        const on = (pm.map[p.id] ?? []).includes(m.id);
        const sw = switchEl(on, { label: `${p.name} 페르소나에 연결`, disabled: !e.enabled, onChange: async (v) => {
          setSwitch(sw, v);
          try {
            await setPersonaLink(ctx.api, p.id, m.id, v, data.entries.map((x) => x.module.id));
            ctx.onPersonaChanged?.();
            ctx.toast(v ? `'${p.name}' 페르소나를 쓰면 켜져요` : `'${p.name}' 연결을 풀었어요`);
          } catch (err) {
            setSwitch(sw, !v);
            ctx.toast(err?.message ?? String(err), { error: true });
          }
        } });
        const r = h("div", { class: "rb-kv" }, h("span", null, p.name || "(이름 없음)"), sw);
        r.dataset.name = String(p.name ?? "").toLowerCase();
        return r;
      }) : [h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "페르소나가 없어요"))];
      box.append(...rows);
      q?.addEventListener("input", () => {
        const v = q.value.trim().toLowerCase();
        for (const r of rows) r.hidden = !!v && !r.dataset.name?.includes(v);
      });
      replace(personaBox, q, box);
    })().catch(() => replace(personaBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "페르소나를 읽지 못했어요"))));
    const loadChars = async () => {
      replace(charBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "캐릭터 불러오는 중…")));
      const db = await ctx.api.getDatabase(["characters"]);
      db.characters = (await loadCharacters(ctx.api, db?.characters)).list;
      const chars = (db?.characters ?? []).map((ch, i) => ({ ch, i })).filter((x) => x.ch && !x.ch.trashTime && x.ch.type !== "group");
      const linked = chars.filter((x) => x.ch.modules?.includes(m.id));
      const filterBox = h("input", { class: "rb-input", style: "height:36px;margin:8px 14px;width:calc(100% - 28px)", placeholder: "캐릭터 검색", "aria-label": "캐릭터 검색" });
      const listEl = h("div", { class: "rb-scroll", style: "max-height:240px" });
      const paint = () => {
        const q = filterBox.value.trim().toLowerCase();
        replace(listEl, chars.filter((x) => !q || String(x.ch.name ?? "").toLowerCase().includes(q)).slice(0, 200).map(({ ch, i }) => {
          const on = ch.modules?.includes(m.id) ?? false;
          const sw = switchEl(on, { label: `${ch.name}에 연결`, disabled: !e.enabled, onChange: async (v) => {
            setSwitch(sw, v);
            try {
              await ctx.svc.run("setCharacterLink", i, m.id, v);
              ch.modules = v ? [...ch.modules ?? [], m.id] : (ch.modules ?? []).filter((x) => x !== m.id);
            } catch (err) {
              setSwitch(sw, !v);
              ctx.toast(err?.message ?? String(err), { error: true });
            }
          } });
          return h("div", { class: "rb-kv" }, h("span", null, ch.name || "(이름 없음)"), sw);
        }));
      };
      filterBox.addEventListener("input", paint);
      replace(charBox, h("div", { class: "rb-kv" }, h("span", null, `연결된 캐릭터 ${linked.length}명`), h("span", null, linked.slice(0, 3).map((x) => x.ch.name).join(", ") + (linked.length > 3 ? " 외" : ""))), filterBox, listEl);
      paint();
    };
    replace(charBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "캐릭터 목록은 눌러서 불러와요"), btn("불러오기", { size: "sm", onClick: () => loadChars().catch((err) => ctx.toast(err?.message ?? String(err), { error: true })) })));
    (async () => {
      const ci = await ctx.api.getCurrentCharacterIndex(), chi = await ctx.api.getCurrentChatIndex?.();
      if (ci < 0 || chi === void 0 || chi < 0) {
        replace(chatBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "열린 채팅이 없어요")));
        return;
      }
      const chat = await ctx.api.getChatFromIndex(ci, chi);
      const on = chat?.modules?.includes(m.id);
      replace(chatBox, h(
        "div",
        { class: "rb-kv" },
        h("span", null, on ? "이 채팅에서 켜짐" : "이 채팅에는 따로 연결 안 됨", h("br"), h("small", { class: "rb-muted" }, "채팅 연결 추가는 RisuAI 채팅 화면에서 해요")),
        on ? btn("이 채팅에서 해제", { size: "sm", onClick: async () => {
          await ctx.svc.run("unlinkChat", ci, chi, m.id);
          ctx.toast("이 채팅에서 해제했어요");
          showDetail(ctx);
        } }) : null
      ));
    })().catch(() => replace(chatBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "채팅 정보를 읽지 못했어요"))));
    (async () => {
      const list = (await createStore(ctx.api).listBackups()).filter((b) => b.target === m.id).slice(0, 3);
      replace(timeline, list.length ? list.map((b, i) => h(
        "div",
        { style: "display:flex;gap:12px" },
        h(
          "div",
          { style: "display:flex;flex-direction:column;align-items:center;width:12px" },
          h("span", { style: `width:12px;height:12px;border-radius:999px;margin-top:3px;flex-shrink:0;${i === 0 ? "background:var(--rb-deco-grad)" : "box-shadow:inset 0 0 0 2px var(--rb-line3)"}` }),
          h("span", { style: "width:2px;flex:1;background:var(--rb-line)" })
        ),
        h(
          "div",
          { style: "flex:1;padding-bottom:14px;display:flex;flex-direction:column;gap:2px" },
          h("div", { style: "display:flex;gap:8px;align-items:baseline" }, h("span", { style: "font-size:13px;font-weight:600" }, b.note || "업데이트 전"), h("span", { class: "rb-muted" }, fmtWhen(b.t))),
          b.summary ? h("span", { class: "rb-muted" }, b.summary) : null
        )
      )) : h("div", { class: "rb-muted", style: "padding:12px 14px;border-radius:12px;border:1px dashed var(--rb-line)" }, "아직 기록이 없어요. 이 플러그인으로 업데이트하거나 편집하면 쌓여요."));
    })().catch(() => {
    });
  }

  // src/ui/screens/settings.js
  function renderSettings(ctx) {
    const { prefs } = ctx;
    let theme = { ...prefs.ui.theme };
    let saveTimer = null;
    const saved = h("span", { class: "rb-muted", "aria-live": "polite" });
    const persist = () => {
      clearTimeout(saveTimer);
      saved.textContent = "저장하는 중…";
      saveTimer = setTimeout(async () => {
        try {
          await prefs.saveUi({ theme });
          saved.textContent = "저장했어요";
        } catch (e) {
          saved.textContent = `저장하지 못했어요: ${e?.message ?? e}`;
        }
      }, 300);
    };
    const update = (patch) => {
      theme = { ...theme, ...patch };
      prefs.ui.theme = theme;
      ctx.applyTheme();
      paint();
      persist();
    };
    const presetBtns = PRESETS.map((p) => h(
      "button",
      { type: "button", class: "rb-preset", dataset: { id: p.id }, onClick: () => update({ preset: p.id, a: p.a, b: p.b }) },
      h("i", { style: { background: `linear-gradient(135deg, ${p.a}, ${p.b})` } }),
      h("span", { style: "font-size:13px;font-weight:500" }, p.name)
    ));
    const colorField = (key, label) => {
      const input = h("input", { type: "color", "aria-label": label });
      const code = h("small");
      input.addEventListener("input", () => update({ [key]: input.value, preset: "custom" }));
      const el = h("label", { class: "rb-color" }, input, h("span", null, label), code);
      el.sync = () => {
        input.value = theme[key];
        code.textContent = theme[key];
      };
      return el;
    };
    const fa = colorField("a", "시작 색"), fb = colorField("b", "끝 색");
    const contrastNote = h("span", { class: "rb-muted" });
    const modeNotes = { auto: "창을 열 때마다 RisuAI 테마의 밝기에 맞춰요.", dark: "RisuAI 설정과 상관없이 항상 다크로 열려요.", light: "RisuAI 설정과 상관없이 항상 라이트로 열려요." };
    const modeNote = h("span", { class: "rb-muted" });
    const modeSeg = segmented([["auto", "RisuAI 따라가기"], ["dark", "다크 고정"], ["light", "라이트 고정"]], theme.mode, (v) => update({ mode: v }), "밝기");
    function paint() {
      presetBtns.forEach((b) => b.setAttribute("aria-pressed", b.dataset.id === theme.preset ? "true" : "false"));
      fa.sync();
      fb.sync();
      const r = themeVars(theme, ctx.state.mode);
      const fgName = r.vars["--rb-on-acc"] === "#ffffff" ? "흰 글자" : "검은 글자";
      contrastNote.textContent = `버튼 글자색은 대비를 계산해서 자동으로 정해요. 지금: ${fgName} · 대비 ${r.onAccentRatio.toFixed(1)}:1` + (r.onAccentRatio < 4.5 ? " — 낮아요. 색을 조금 더 진하게 하면 잘 읽혀요." : "");
      modeNote.textContent = modeNotes[theme.mode] + (theme.mode === "auto" ? ` (지금 RisuAI: ${ctx.state.risuScheme === "light" ? "라이트" : "다크"})` : "");
    }
    const left = h(
      "div",
      { class: "rb-section", style: "flex:1;min-width:300px;max-width:600px" },
      h(
        "div",
        { style: "display:flex;align-items:center;gap:10px" },
        iconBtn("back", "도구로 돌아가기", { onClick: () => ctx.go("tools") }),
        h("div", null, h("span", { class: "rb-muted" }, "도구 · 설정"), h("h2", { class: "rb-h2" }, "색 바꾸기"))
      ),
      h("div", { class: "rb-field" }, h("span", { class: "rb-label" }, "테마"), h("div", { class: "rb-presets" }, presetBtns)),
      h(
        "div",
        { class: "rb-field" },
        h("span", { class: "rb-label" }, "직접 고르기"),
        h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px" }, fa, fb),
        contrastNote
      ),
      h("div", { class: "rb-field" }, h("span", { class: "rb-label" }, "밝기"), modeSeg, modeNote),
      h(
        "div",
        { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" },
        btn("기본값으로", { onClick: () => {
          update({ ...DEFAULT_THEME, mode: theme.mode });
        } }),
        saved
      )
    );
    const demoSwitch = switchEl(true, { label: "미리보기 스위치", onChange: (on, el) => el.setAttribute("aria-checked", on ? "true" : "false") });
    const preview = h(
      "div",
      { class: "rb-section", style: "flex:1;min-width:280px" },
      h("span", { class: "rb-label" }, "미리보기"),
      h(
        "div",
        { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:14px" },
        h(
          "div",
          { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap" },
          btn("적용하기", { kind: "primary" }),
          btn("보조 버튼"),
          chip("선택된 필터", { pressed: true, count: 12 }),
          demoSwitch
        ),
        h(
          "div",
          { class: "rb-row", "aria-selected": "true", style: "cursor:default" },
          h("span", { class: "grip" }, icon("grip", 14)),
          h("div", { class: "txt" }, h("div", { class: "ttl" }, h("span", { class: "name" }, "예시 모듈"), badge("페르소나", "acc2")), h("span", { class: "meta" }, "로어 12 · 에셋 34"))
        ),
        h("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, badge("제작자 수정", "acc"), badge("내 수정", "acc2"), badge("충돌", "warn"), badge("추가", "ok"), badge("삭제", "danger")),
        progressBar(61)
      ),
      h("p", { class: "rb-muted" }, "모듈 이름 색과 폴더 색은 모듈 목록에서 각 모듈의 ⋯ 메뉴로 바꿔요. 어떤 밝기에서도 읽히도록 자동으로 진하기를 맞춰요.")
    );
    replace(ctx.main, h("div", { class: "rb-scroll", style: "flex:1;display:flex;flex-wrap:wrap;align-content:flex-start" }, left, preview));
    paint();
  }

  // src/ui/screens/tools.js
  function tile(ic, title, desc, onClick, id) {
    return h(
      "button",
      { type: "button", class: "rb-row", style: "background:var(--rb-surf);padding:16px", onClick, id },
      h("span", { style: "width:40px;height:40px;border-radius:12px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, icon(ic, 20)),
      h("span", { class: "txt" }, h("span", { class: "name" }, title), h("span", { class: "meta", style: "white-space:normal" }, desc)),
      h("span", { style: "color:var(--rb-mute);display:flex" }, icon("chevron", 16))
    );
  }
  function renderTools(ctx) {
    if (ctx.state.sub === "inspector") return renderInspector(ctx);
    if (ctx.state.sub === "cleanup") return renderCleanup(ctx);
    if (ctx.state.sub === "patchmaker") {
      ctx.go("dev", "patchmaker");
      return;
    }
    const dev = isDev(ctx);
    replace(ctx.main, h(
      "div",
      { class: "rb-section rb-scroll", style: "flex:1" },
      h("h2", { class: "rb-h2" }, "도구"),
      devToggleCard(ctx, () => {
        ctx.refreshTabs();
        renderTools(ctx);
      }),
      dev && h(
        "div",
        { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-bottom:10px" },
        tile("code", "개발 탭 열기", "개발 중인 모듈·봇 모음, 검사·테스트, 패치 만들기·릴리스 기록", () => ctx.go("dev"), "rb-tool-dev")
      ),
      h(
        "div",
        { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px" },
        tile("palette", "색 바꾸기", "테마 색, 직접 고른 색, 밝기(RisuAI 따라가기/다크/라이트)", () => ctx.go("tools", "settings"), "rb-tool-settings"),
        tile("upload", "업데이트 가져오기", "모듈·캐릭터 파일로 기존 항목을 업데이트하거나 새로 넣기 (여러 파일 가능)", () => ctx.legacy.open(), "rb-tool-import"),
        tile("undo", "백업·되돌리기", "업데이트하기 전 상태로 되돌리기 (채팅은 그대로)", () => ctx.go("history"), "rb-tool-backups"),
        tile("download", "전체 백업", "모든 모듈(꺼진 것 포함)·에셋·프리셋·폴더·색 설정을 zip 한 파일로", () => fullBackup(ctx), "rb-tool-fullbackup"),
        tile("upload", "전체 복원", "전체 백업 zip에서 모듈과 설정을 되살리기", () => fullRestore(ctx), "rb-tool-restore"),
        tile("info", ".risum 인스펙터", "모듈 파일 안을 열어 보기: 필드별 크기, 압축률, 에셋 목록, ZIP 추출", () => ctx.go("tools", "inspector"), "rb-tool-inspector"),
        tile("trash", "설정 정리", "이 플러그인이 저장한 순서·폴더·프리셋·연결 정보를 골라서 지우기", () => ctx.go("tools", "cleanup"), "rb-tool-cleanup")
      )
    ));
  }
  async function fullBackup(ctx) {
    const db = await readDb(ctx.api, ["modules", "pluginCustomStorage", "enabledModules"]);
    const on = db.modules ?? [], off = db.pluginCustomStorage?.[DISABLED_KEY] ?? [];
    const paths = /* @__PURE__ */ new Map();
    for (const m of [...on, ...off]) {
      for (const a of m.assets ?? []) if (a?.[1]) paths.set(a[1], a[2]);
      if (m.icon) paths.set(m.icon, "png");
    }
    const mode = await new Promise((resolve) => {
      const back2 = h("div", { class: "rb-modal" });
      const done = (v) => {
        back2.remove();
        resolve(v);
      };
      back2.appendChild(h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-label": "전체 백업" },
        h("h3", { class: "rb-h3" }, "전체 백업"),
        h("p", { class: "rb-p" }, `모듈 ${on.length + off.length}개 · 에셋 ${paths.size}개`),
        h("div", { class: "rb-card pad", style: "display:flex;flex-direction:column;gap:6px" }, h("b", null, "빠른 백업 — 몇 초"), h("span", { class: "rb-muted" }, "모듈 내용·켜짐·순서·프리셋·폴더·색 설정만 담아요. 에셋 파일은 서버에 그대로 있으니 같은 서버에서 되살릴 때 충분해요.")),
        h("div", { class: "rb-card pad", style: "display:flex;flex-direction:column;gap:6px" }, h("b", null, "에셋까지 — 시간이 걸려요"), h("span", { class: "rb-muted" }, "에셋 파일도 모두 담아요. 다른 서버로 옮기거나 서버 정리에 대비할 때 쓰세요.")),
        h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn("빠른 백업", { kind: "primary", onClick: () => done("quick") }), btn("에셋까지", { onClick: () => done("full") }))
      ));
      ctx.win.appendChild(back2);
    });
    if (!mode) return;
    if (mode === "quick") paths.clear();
    const bar = progressBar(0), txt = h("span", { class: "rb-muted" }, "준비 중…");
    const back = h("div", { class: "rb-modal" }, h("div", { class: "rb-dialog" }, h("h3", { class: "rb-h3" }, "전체 백업 만드는 중"), bar, txt));
    ctx.win.appendChild(back);
    try {
      const zip = createZip();
      const [presets, persona] = await Promise.all([loadPresets(ctx.api), loadPersonaMap(ctx.api)]);
      zip.add("manifest.json", JSON.stringify({
        type: "rbm-backup",
        v: 1,
        created: Date.now(),
        withAssets: mode === "full",
        modules: on,
        disabledModules: off,
        enabledModules: db.enabledModules ?? [],
        prefs: { ui: ctx.prefs.ui, meta: ctx.prefs.meta, presets, persona: persona.map }
      }, null, 1));
      const list = [...paths.keys()];
      let done = 0, missing = 0, i = 0;
      const started = Date.now();
      await Promise.all(Array.from({ length: Math.min(16, list.length) }, async () => {
        while (i < list.length) {
          const p = list[i++];
          const d = await ctx.assets.read(p).catch(() => null);
          if (d?.length) zip.add(`files/${p}`, d);
          else missing++;
          done++;
          bar.set(done / list.length * 100);
          const per = (Date.now() - started) / done;
          txt.textContent = `에셋 ${done}/${list.length} · ${fmtBytes(zip.size)} · 남은 시간 약 ${Math.ceil(per * (list.length - done) / 1e3)}초`;
        }
      }));
      const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      download(`dusk-atelier-backup-${stamp}${mode === "quick" ? "-quick" : ""}.zip`, zip.blob());
      back.remove();
      ctx.toast(`전체 백업을 내려받았어요${missing ? ` (읽지 못한 에셋 ${missing}개)` : ""}`);
    } catch (e) {
      back.remove();
      ctx.toast(`백업하지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  }
  async function fullRestore(ctx) {
    const [f] = await pickFiles({ accept: ".zip,application/zip" });
    if (!f) return;
    let entries, man;
    try {
      entries = await readZipDirectory(f);
      const me = entries.find((e) => e.name === "manifest.json");
      if (!me) throw new Error("전체 백업 파일이 아니에요 (manifest.json 없음)");
      man = JSON.parse(new TextDecoder().decode(await readZipEntry(f, me)));
      if (man?.type !== "rbm-backup") throw new Error("전체 백업 파일이 아니에요");
    } catch (e) {
      ctx.toast(e?.message ?? String(e), { error: true });
      return;
    }
    const mods = [...(man.modules ?? []).map((m) => ({ m, on: true })), ...(man.disabledModules ?? []).map((m) => ({ m, on: false }))];
    const mode = await new Promise((resolve) => {
      const back2 = h("div", { class: "rb-modal" });
      const done = (v) => {
        back2.remove();
        resolve(v);
      };
      back2.appendChild(h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-label": "전체 복원" },
        h("h3", { class: "rb-h3" }, "전체 복원"),
        h("p", { class: "rb-p" }, `${new Date(man.created).toLocaleString()} 백업 · 모듈 ${mods.length}개 · 파일 ${entries.length - 1}개`),
        h("label", { class: "rb-check" }, h("input", { type: "radio", name: "m", value: "merge", checked: true }), h("span", null, "합치기 — 없는 모듈은 추가, 같은 id는 백업 것으로")),
        h("label", { class: "rb-check" }, h("input", { type: "radio", name: "m", value: "add" }), h("span", null, "없는 것만 추가 — 지금 있는 모듈은 그대로")),
        h("label", { class: "rb-check" }, h("input", { type: "radio", name: "m", value: "replace" }), h("span", null, "통째로 바꾸기 — 지금 모듈 목록을 백업 것으로")),
        h("label", { class: "rb-check" }, h("input", { type: "checkbox", name: "prefs", checked: true }), h("span", null, "프리셋·폴더·색·페르소나 연결도 되살리기")),
        h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn("복원", { kind: "primary", onClick: () => done({ mode: back2.querySelector("input[name=m]:checked").value, prefs: back2.querySelector("input[name=prefs]").checked }) }))
      ));
      ctx.win.appendChild(back2);
    });
    if (!mode) return;
    if (mode.mode === "replace" && !await confirmDialog(ctx.win, { title: "지금 모듈 목록을 바꿀까요?", body: "백업에 없는 모듈은 목록에서 빠져요.", ok: "바꾸기", danger: true })) return;
    const bar = progressBar(0), txt = h("span", { class: "rb-muted" }, "파일 올리는 중…");
    const back = h("div", { class: "rb-modal" }, h("div", { class: "rb-dialog" }, h("h3", { class: "rb-h3" }, "복원하는 중"), bar, txt));
    ctx.win.appendChild(back);
    try {
      const files = entries.filter((e) => e.name.startsWith("files/"));
      const remap = /* @__PURE__ */ new Map();
      let i = 0, done = 0;
      await Promise.all(Array.from({ length: Math.min(12, files.length) }, async () => {
        while (i < files.length) {
          const e = files[i++];
          let key = null, err;
          for (let a = 0; a < 3 && !key; a++) {
            try {
              key = await ctx.api.saveAsset(await readAssetBytes(f, { source: "zip", entry: e }));
            } catch (x) {
              err = x;
              await new Promise((r) => setTimeout(r, 600 * (a + 1)));
            }
          }
          if (!key) throw new Error(`파일을 올리지 못했어요: ${e.name} (${err?.message ?? err})`);
          remap.set(e.name.slice(6), key);
          done++;
          bar.set(done / files.length * 100);
          txt.textContent = `파일 ${done}/${files.length}`;
        }
      }));
      const fix = (m) => JSON.parse(JSON.stringify(m), (k, v) => typeof v === "string" && remap.has(v) ? remap.get(v) : v);
      txt.textContent = "모듈 저장 중…";
      await commit(ctx.api, (d) => {
        if (mode.mode === "replace") d.entries = [];
        for (const { m, on } of mods) {
          const mm = fix(m);
          const e = d.entries.find((x) => x.module.id === mm.id);
          if (e) {
            if (mode.mode !== "add") {
              e.module = mm;
              e.enabled = on || mm.assets?.length > 0;
            }
          } else d.entries.push({ module: mm, enabled: on || mm.assets?.length > 0 });
        }
        if (mode.mode === "replace" || mode.mode === "merge") d.enabledModules = [.../* @__PURE__ */ new Set([...mode.mode === "merge" ? d.enabledModules : [], ...man.enabledModules ?? []])];
      }, { chars: mode.mode === "replace" });
      if (mode.prefs && man.prefs) {
        if (man.prefs.meta) await ctx.prefs.saveMeta({ ...defaultsMeta(), ...man.prefs.meta });
        if (man.prefs.ui?.theme) {
          await ctx.prefs.saveUi({ theme: man.prefs.ui.theme });
          ctx.applyTheme();
        }
        if (man.prefs.presets?.presets) await savePresets(ctx.api, man.prefs.presets);
        if (man.prefs.persona) {
          const p = await loadPersonaMap(ctx.api);
          p.map = man.prefs.persona;
          await savePersonaMap(ctx.api, p);
          ctx.onPersonaChanged?.();
        }
      }
      back.remove();
      await reload(ctx).catch(() => {
      });
      ctx.toast(`복원했어요 (모듈 ${mods.length}개, 파일 ${files.length}개)`);
    } catch (e) {
      back.remove();
      ctx.toast(`복원하지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  }
  async function renderInspector(ctx) {
    const st = ctx.state;
    const pick = async () => {
      const [f] = await pickFiles({ accept: ".risum" });
      if (!f) return;
      try {
        st.insp = { file: f, scan: await scanRisum(f), mainSize: null };
      } catch (e) {
        ctx.toast(`분석하지 못했어요: ${e?.message ?? e}`, { error: true });
        return;
      }
      renderInspector(ctx);
    };
    const back = h("div", { style: "display:flex;align-items:center;gap:10px" }, btn("", { kind: "ghost", icon: "back", onClick: () => ctx.go("tools") }), h("div", null, h("span", { class: "rb-muted" }, "도구"), h("h2", { class: "rb-h2" }, ".risum 인스펙터")));
    back.querySelector("button").setAttribute("aria-label", "도구로 돌아가기");
    if (!st.insp) {
      replace(ctx.main, h(
        "div",
        { class: "rb-section rb-scroll", style: "flex:1" },
        back,
        h("p", { class: "rb-p" }, ".risum 파일을 고르면 설치하지 않고 안을 보여 줘요. 무엇이 파일을 크게 만드는지 찾을 때 좋아요."),
        btn(".risum 파일 고르기", { kind: "primary", icon: "upload", onClick: pick })
      ));
      return;
    }
    const { file, scan } = st.insp;
    const m = scan.module;
    const json = JSON.stringify({ module: m, type: "risuModule" });
    const fields = Object.keys(m).map((k) => [k, new TextEncoder().encode(JSON.stringify(m[k]) ?? "").length]).sort((a, b) => b[1] - a[1]);
    const assetBytes = scan.assets.reduce((s, a) => s + a.size, 0);
    const big = fields[0]?.[1] || 1;
    const kv = (k, v) => h("div", { class: "rb-kv" }, h("span", null, k), h("span", null, v));
    const extract = async () => {
      const zip = createZip();
      zip.add("module.json", JSON.stringify({ ...m, type: "risuModule" }, null, 2));
      for (const a of scan.assets) zip.add(`assets/${safeFileName(a.name || String(a.index))}.${a.ext || "png"}`, await readAssetBytes(file, { ...a, source: void 0 }));
      download(`${safeFileName(m.name)}-extracted.zip`, zip.blob());
    };
    replace(ctx.main, h(
      "div",
      { class: "rb-section rb-scroll", style: "flex:1" },
      back,
      h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, btn("다른 파일", { icon: "upload", onClick: pick }), btn("ZIP으로 풀기", { kind: "primary", icon: "download", onClick: () => extract().catch((e) => ctx.toast(e.message, { error: true })) })),
      h(
        "div",
        { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px" },
        h("div", { class: "rb-field" }, h("span", { class: "rb-label" }, "파일 정보"), h(
          "div",
          { class: "rb-card" },
          kv("파일명", file.name),
          kv("파일 크기", fmtBytes(file.size)),
          kv("모듈 이름", m.name ?? ""),
          kv("형식", ".risum v0 (유효)"),
          kv("모듈 JSON", fmtBytes(json.length)),
          kv("에셋", `${scan.assets.length}개 · ${fmtBytes(assetBytes)}`),
          kv("로어북 · 정규식 · 트리거", `${m.lorebook?.length ?? 0} · ${m.regex?.length ?? 0} · ${m.trigger?.length ?? 0}`),
          kv("저수준 접근", m.lowLevelAccess ? "사용" : "없음")
        )),
        h("div", { class: "rb-field" }, h("span", { class: "rb-label" }, "필드별 크기 (큰 순)"), h(
          "div",
          { class: "rb-card pad", style: "display:flex;flex-direction:column;gap:8px" },
          fields.slice(0, 14).map(([k, n]) => h(
            "div",
            { style: "display:flex;flex-direction:column;gap:4px" },
            h("div", { style: "display:flex;font-size:13px" }, h("span", { style: "flex:1" }, k), h("span", { class: "rb-muted" }, fmtBytes(n))),
            h("div", { class: "rb-progress", style: "height:6px" }, h("i", { style: { width: `${Math.max(2, n / big * 100)}%` } }))
          ))
        ))
      ),
      h(
        "div",
        { class: "rb-field" },
        h("span", { class: "rb-label" }, `에셋 (${scan.assets.length}개, 큰 순)`),
        h("div", { class: "rb-card" }, [...scan.assets].sort((a, b) => b.size - a.size).slice(0, 200).map((a) => kv(`${a.name || "(이름 없음)"}.${a.ext}`, fmtBytes(a.size))))
      )
    ));
  }
  async function renderCleanup(ctx) {
    const db = await readDb(ctx.api, ["modules", "pluginCustomStorage"]);
    const presets = await loadPresets(ctx.api), persona = await loadPersonaMap(ctx.api);
    const meta = ctx.prefs.meta;
    const opts = [
      ["order", "정렬 순서 초기화", `이 플러그인이 기억한 모듈 순서(${(db.pluginCustomStorage?.[ORDER_KEY] ?? []).length}개)를 지워요`],
      ["enableAll", "꺼진 모듈 모두 켜기", `꺼짐 보관함의 ${(db.pluginCustomStorage?.[DISABLED_KEY] ?? []).length}개를 다시 켜요 (이 플러그인을 지우기 전에 하세요. 꺼진 모듈은 이 플러그인 보관함에만 있어요)`],
      ["assetFolders", "에셋 폴더 정보 지우기", `${Object.keys(meta.moduleAssetFolders ?? {}).length}개 모듈의 에셋 폴더 구분을 지워요 (에셋은 남아요)`],
      ["presets", "프리셋 초기화", `${Object.keys(presets.presets).length}개 프리셋과 디바이스 페어를 지워요`],
      ["persona", "페르소나 연결 초기화", `${Object.values(persona.map).reduce((s, x) => s + x.length, 0)}개 연결을 지워요`],
      ["charLinks", "캐릭터 연결 초기화", "모든 캐릭터·채팅에 연결된 모듈 목록을 비워요 (캐릭터를 다 읽어서 시간이 걸려요)"],
      ["folders", "모듈 목록 폴더·이름 색 지우기", `폴더 ${meta.folders.length}개, 이름 색 ${Object.keys(meta.nameColors).length}개`]
    ];
    const checks = /* @__PURE__ */ new Map();
    const back = h("div", { style: "display:flex;align-items:center;gap:10px" }, btn("", { kind: "ghost", icon: "back", onClick: () => ctx.go("tools") }), h("div", null, h("span", { class: "rb-muted" }, "도구"), h("h2", { class: "rb-h2" }, "설정 정리")));
    back.querySelector("button").setAttribute("aria-label", "도구로 돌아가기");
    replace(ctx.main, h(
      "div",
      { class: "rb-section rb-scroll", style: "flex:1" },
      back,
      note("warn", "골라서 지운 정보는 되돌릴 수 없어요. 모듈 내용(로어북·에셋)은 지우지 않아요."),
      h("div", { class: "rb-card" }, opts.map(([k, label, desc]) => {
        const c = h("input", { type: "checkbox" });
        checks.set(k, c);
        return h("label", { class: "rb-kv", style: "cursor:pointer" }, c, h("span", null, label, h("br"), h("small", { class: "rb-muted" }, desc)));
      })),
      h("div", null, btn("정리 실행", { kind: "danger", icon: "trash", onClick: async () => {
        const sel = [...checks].filter(([, c]) => c.checked).map(([k]) => k);
        if (!sel.length) {
          ctx.toast("정리할 항목을 골라 주세요");
          return;
        }
        if (!await confirmDialog(ctx.win, { title: `${sel.length}가지를 정리할까요?`, body: sel.map((k) => "• " + opts.find((o) => o[0] === k)[1]).join("\n"), ok: "정리", danger: true })) return;
        try {
          if (sel.some((k) => ["order", "enableAll", "charLinks"].includes(k))) {
            await commit(ctx.api, (d) => {
              for (const e of d.entries) {
                if (sel.includes("enableAll")) e.enabled = true;
              }
              if (sel.includes("charLinks")) d.characters.forEach((c, i) => {
                if (!c) return;
                if (c.modules?.length) {
                  c.modules = [];
                  d.changedChars.add(i);
                }
                for (const ch of c.chats ?? []) if (ch?.modules?.length) {
                  ch.modules = [];
                  d.changedChars.add(i);
                }
              });
            }, { chars: sel.includes("charLinks") });
            if (sel.includes("order")) await ctx.api.setDatabaseLite({ [ORDER_KEY]: [] });
          }
          if (sel.includes("assetFolders")) await ctx.prefs.saveMeta({ ...ctx.prefs.meta, moduleAssetFolders: {} });
          if (sel.includes("presets")) await ctx.api.pluginStorage.setItem(PRESET_KEY, JSON.stringify({ active: "기본", presets: {} }));
          if (sel.includes("persona")) {
            await savePersonaMap(ctx.api, { map: {}, injectedIndex: {} });
            await ctx.api.setDatabaseLite({ [INJECTED_KEY]: {} });
            ctx.onPersonaChanged?.();
          }
          if (sel.includes("folders")) await ctx.prefs.saveMeta({ ...ctx.prefs.meta, folders: [], mapping: {}, nameColors: {} });
          ctx.toast("정리했어요");
          await reload(ctx).catch(() => {
          });
          renderCleanup(ctx);
        } catch (e) {
          ctx.toast(`정리하지 못했어요: ${e?.message ?? e}`, { error: true });
        }
      } }))
    ));
  }

  // src/ui/screens/placeholder.js
  var PLAN = {
    characters: ["캐릭터", "캐릭터 업데이트·새로 넣기 화면이 들어올 자리예요. (5단계)", '지금은 도구 탭의 "업데이트 가져오기"에서 캐릭터 파일을 넣을 수 있어요.'],
    presets: ["프리셋", "모듈 켜기/끄기 묶음과 디바이스 페어가 들어올 자리예요. (1단계)", ""],
    history: ["기록", "버전 타임라인이 들어올 자리예요. (5단계)", '지금은 도구 탭의 "백업·되돌리기"에서 업데이트 전 상태로 되돌릴 수 있어요.']
  };
  function renderPlaceholder(ctx) {
    const [title, what, now] = PLAN[ctx.state.tab] ?? ["준비 중", "", ""];
    const t = ctx.tabs.find((x) => x.id === ctx.state.tab);
    replace(ctx.main, h(
      "div",
      { class: "rb-empty", style: "margin:auto;max-width:420px" },
      h("div", { style: "color:var(--rb-acc-text);display:flex;justify-content:center;margin-bottom:12px" }, icon(t?.icon ?? "info", 32)),
      h("h2", { class: "rb-h2", style: "color:var(--rb-text);margin-bottom:6px" }, title),
      h("p", { class: "rb-p" }, what),
      now ? h("p", { class: "rb-muted", style: "margin-top:8px" }, now) : null
    ));
  }

  // src/ui/screens/presets.js
  async function renderPresets(ctx) {
    const data = await loadPresets(ctx.api);
    const st = await ctx.svc.load();
    if (!data.presets[DEFAULT_PRESET] && !Object.keys(data.presets).length) {
      data.presets[DEFAULT_PRESET] = snapshotOf(st.entries, [...st.globalOn]);
      data.active = DEFAULT_PRESET;
      await savePresets(ctx.api, data);
    }
    const names = Object.keys(data.presets);
    const device = isMobileDevice() ? "mobile" : "desktop";
    const summary = (p) => {
      const states = Object.values(p.moduleStates ?? {});
      return `켜짐 ${states.filter((s) => s.enabled).length} · 꺼짐 ${states.filter((s) => !s.enabled).length} · 글로벌 ${(p.globalEnabledIds ?? []).length}`;
    };
    const list = h("div", { style: "display:flex;flex-direction:column;gap:6px" }, names.map((name) => {
      const p = data.presets[name], active = data.active === name;
      return h(
        "div",
        { class: "rb-row", "aria-selected": active ? "true" : "false", style: "cursor:default" },
        h("span", { style: `display:flex;color:${active ? "var(--rb-acc-text)" : "var(--rb-sub)"}` }, icon("preset", 18)),
        h(
          "div",
          { class: "txt" },
          h(
            "div",
            { class: "ttl" },
            h("span", { class: "name" }, name),
            active && badge("사용 중", "acc"),
            data.defaultMobile === name && badge("모바일 기본", "acc2"),
            data.defaultDesktop === name && badge("데스크탑 기본", "acc2")
          ),
          h("span", { class: "meta" }, summary(p))
        ),
        active ? null : btn("전환", { size: "sm", kind: "primary", onClick: () => switchTo(ctx, name) }),
        iconBtn("more", `${name} 메뉴`, { onClick: (ev) => presetMenu(ctx, data, name, ev.currentTarget) })
      );
    }));
    const pairSel = (key, label) => {
      const sel = h("select", { class: "rb-input", "aria-label": label, onChange: async (ev) => {
        const d = await loadPresets(ctx.api);
        d[key] = ev.target.value || void 0;
        if (!d.lastDeviceType) d.lastDeviceType = device;
        if (d.defaultMobile && d.defaultMobile === d.defaultDesktop) {
          ctx.toast("모바일과 데스크탑에 서로 다른 프리셋을 골라 주세요", { error: true });
          ev.target.value = data[key] ?? "";
          return;
        }
        await savePresets(ctx.api, d);
        ctx.toast("디바이스 페어를 저장했어요");
        renderPresets(ctx);
      } }, h("option", { value: "" }, "지정 안 함"), names.map((n) => h("option", { value: n, selected: data[key] === n }, n)));
      return h("label", { class: "rb-field", style: "flex:1;min-width:200px" }, h("span", { class: "rb-label" }, label), sel);
    };
    replace(ctx.main, h(
      "div",
      { class: "rb-section rb-scroll", style: "flex:1" },
      h(
        "div",
        { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" },
        h("div", { style: "flex:1" }, h("h2", { class: "rb-h2" }, "프리셋"), h("p", { class: "rb-p" }, "어떤 모듈을 켜고 끌지, 순서, 글로벌 활성화를 묶어서 저장해요. 지금 상태는 사용 중인 프리셋에 자동으로 저장돼요.")),
        btn("가져오기", { icon: "upload", onClick: () => importPresets(ctx) }),
        btn("새 프리셋", { kind: "primary", icon: "plus", onClick: () => newPreset(ctx) })
      ),
      list,
      h(
        "div",
        { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:12px" },
        h("h3", { class: "rb-h3" }, "디바이스 페어"),
        h("p", { class: "rb-p" }, `모바일과 데스크탑에서 쓸 프리셋을 정해 두면, 기기가 바뀔 때 자동으로 전환해요. 지금 기기: ${device === "mobile" ? "모바일" : "데스크탑"}`),
        h("div", { style: "display:flex;gap:12px;flex-wrap:wrap" }, pairSel("defaultMobile", "모바일 프리셋"), pairSel("defaultDesktop", "데스크탑 프리셋")),
        note("info", "페어로 지정한 프리셋을 쓰고 있을 때만 자동 전환돼요. 다른 프리셋을 직접 골랐다면 그대로 둬요.")
      )
    ));
  }
  async function switchTo(ctx, name) {
    try {
      const r = await ctx.svc.serial(() => applyPreset(ctx.api, name));
      ctx.toast(`'${name}' 프리셋으로 바꿨어요` + (r.skipped ? ` (에셋 모듈 ${r.skipped}개는 켜 둠)` : ""));
      await reload(ctx);
      renderPresets(ctx);
    } catch (err) {
      ctx.toast(err?.message ?? String(err), { error: true });
    }
  }
  async function newPreset(ctx) {
    const data = await loadPresets(ctx.api);
    const n = await promptDialog(ctx.win, { title: "새 프리셋", label: "지금 상태를 새 프리셋으로 저장해요", placeholder: "예: 가볍게" });
    if (!n?.trim()) return;
    const name = uniquePresetName(data, n);
    const st = await ctx.svc.load();
    data.presets[name] = snapshotOf(st.entries, [...st.globalOn]);
    data.active = name;
    await savePresets(ctx.api, data);
    ctx.toast(`'${name}' 프리셋을 만들었어요`);
    renderPresets(ctx);
  }
  function presetMenu(ctx, data, name, anchor) {
    const isDefault = name === DEFAULT_PRESET;
    openMenu(ctx.win, anchor, [
      { label: "지금 상태로 덮어쓰기", icon: "refresh", onClick: async () => {
        if (!await confirmDialog(ctx.win, { title: `'${name}'을(를) 지금 상태로 바꿀까요?`, ok: "덮어쓰기" })) return;
        const d = await loadPresets(ctx.api);
        const st = await ctx.svc.load();
        d.presets[name] = snapshotOf(st.entries, [...st.globalOn]);
        await savePresets(ctx.api, d);
        ctx.toast("덮어썼어요");
        renderPresets(ctx);
      } },
      isDefault ? null : { label: "이름 바꾸기", icon: "edit", onClick: async () => {
        const n = await promptDialog(ctx.win, { title: "프리셋 이름", value: name });
        if (!n?.trim() || n.trim() === name) return;
        const d = await loadPresets(ctx.api);
        if (d.presets[n.trim()]) {
          ctx.toast("같은 이름이 있어요", { error: true });
          return;
        }
        d.presets[n.trim()] = d.presets[name];
        delete d.presets[name];
        for (const k of ["active", "defaultMobile", "defaultDesktop"]) if (d[k] === name) d[k] = n.trim();
        await savePresets(ctx.api, d);
        renderPresets(ctx);
      } },
      { label: "내보내기 (파일)", icon: "download", onClick: () => download(`preset-${name}.json`, JSON.stringify({ type: "rbm-presets", presets: { [name]: data.presets[name] } }, null, 2), "application/json") },
      { label: "전체 내보내기", icon: "download", onClick: () => download("presets.json", JSON.stringify({ type: "rbm-presets", presets: data.presets }, null, 2), "application/json") },
      isDefault ? null : "sep",
      isDefault ? null : { label: "삭제", icon: "trash", danger: true, onClick: async () => {
        if (!await confirmDialog(ctx.win, { title: `'${name}' 프리셋을 지울까요?`, body: "모듈은 바뀌지 않아요.", ok: "삭제", danger: true })) return;
        const d = await loadPresets(ctx.api);
        delete d.presets[name];
        for (const k of ["defaultMobile", "defaultDesktop"]) if (d[k] === name) delete d[k];
        if (d.active === name) d.active = DEFAULT_PRESET;
        await savePresets(ctx.api, d);
        renderPresets(ctx);
      } }
    ].filter(Boolean));
  }
  async function importPresets(ctx) {
    const [f] = await pickFiles({ accept: ".json,application/json" });
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const src = j?.presets && typeof j.presets === "object" ? j.presets : null;
      if (!src) throw new Error("프리셋 파일이 아니에요");
      const d = await loadPresets(ctx.api);
      let n = 0;
      for (const [name, p] of Object.entries(src)) {
        if (!p?.moduleStates) continue;
        d.presets[d.presets[name] ? uniquePresetName(d, name) : name] = p;
        n++;
      }
      await savePresets(ctx.api, d);
      ctx.toast(`프리셋 ${n}개를 가져왔어요`);
      renderPresets(ctx);
    } catch (err) {
      ctx.toast(`가져오지 못했어요: ${err?.message ?? err}`, { error: true });
    }
  }

  // src/data/charorder.js
  var FOLDER_COLORS = ["default", "red", "yellow", "green", "blue", "indigo", "purple", "pink"];
  var FOLDER_COLOR_CSS = { default: null, red: "#f87171", yellow: "#facc15", green: "#4ade80", blue: "#60a5fa", indigo: "#818cf8", purple: "#c084fc", pink: "#f472b6" };
  var FOLDER_COLOR_KO = { default: "기본", red: "빨강", yellow: "노랑", green: "초록", blue: "파랑", indigo: "남색", purple: "보라", pink: "분홍" };
  var isFolder = (x) => x && typeof x === "object" && Array.isArray(x.data);
  var clone = (o) => o.map((x) => isFolder(x) ? { ...x, data: [...x.data] } : x);
  function layout(order, chars) {
    const live = new Set(chars.filter((c) => c && !c.trashTime).map((c) => c.chaId));
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const x of order ?? []) {
      if (typeof x === "string") {
        if (live.has(x) && !seen.has(x)) {
          seen.add(x);
          out.push({ type: "char", id: x });
        }
      } else if (isFolder(x)) {
        const ids = x.data.filter((id) => live.has(id) && !seen.has(id));
        ids.forEach((id) => seen.add(id));
        out.push({ type: "folder", folder: x, ids });
      }
    }
    for (const c of chars) if (c && !c.trashTime && !seen.has(c.chaId)) {
      seen.add(c.chaId);
      out.push({ type: "char", id: c.chaId });
    }
    return out;
  }
  function take(order, id) {
    const o = [];
    for (const x of order) {
      if (x === id) continue;
      if (isFolder(x)) o.push({ ...x, data: x.data.filter((d) => d !== id) });
      else o.push(x);
    }
    return o;
  }
  function moveChar(order, id, { beforeId, after, folderId }) {
    const ids = [].concat(id);
    if (beforeId && ids.includes(beforeId)) return clone(order ?? []);
    let o = clone(order ?? []);
    for (const c of ids) o = take(o, c);
    if (beforeId) {
      const top = o.indexOf(beforeId);
      if (top >= 0) {
        o.splice(top + (after ? 1 : 0), 0, ...ids);
        return o;
      }
      for (const x of o) if (isFolder(x)) {
        const i = x.data.indexOf(beforeId);
        if (i >= 0) {
          x.data.splice(i + (after ? 1 : 0), 0, ...ids);
          return o;
        }
      }
      o.push(...ids);
      return o;
    }
    if (folderId) {
      const f = o.find((x) => isFolder(x) && x.id === folderId);
      if (f) {
        f.data.push(...ids);
        return o;
      }
    }
    o.push(...ids);
    return o;
  }
  function createFolder2(order, { id, name, color = "default", ids = [] }) {
    let o = clone(order ?? []);
    let at = o.length;
    if (ids.length) {
      const first = o.findIndex((x) => x === ids[0] || isFolder(x) && x.data.includes(ids[0]));
      if (first >= 0) at = first;
    }
    for (const c of ids) o = take(o, c);
    at = Math.min(at, o.length);
    o.splice(at, 0, { id, name, color, data: [...ids] });
    return o;
  }
  function setMembers(order, folderId, ids) {
    let o = clone(order ?? []);
    const f = o.find((x) => isFolder(x) && x.id === folderId);
    if (!f) return o;
    const out = f.data.filter((d) => !ids.includes(d));
    for (const c of ids) o = take(o, c);
    const g = o.find((x) => isFolder(x) && x.id === folderId);
    g.data = [...ids];
    const at = o.indexOf(g) + 1;
    o.splice(at, 0, ...out);
    return o;
  }
  function renameFolder2(order, folderId, name) {
    return clone(order ?? []).map((x) => isFolder(x) && x.id === folderId ? { ...x, name } : x);
  }
  function colorFolder(order, folderId, color) {
    return clone(order ?? []).map((x) => isFolder(x) && x.id === folderId ? { ...x, color } : x);
  }
  function deleteFolder2(order, folderId) {
    const o = [];
    for (const x of clone(order ?? [])) {
      if (isFolder(x) && x.id === folderId) o.push(...x.data);
      else o.push(x);
    }
    return o;
  }
  function moveFolder(order, folderId, dir) {
    const o = clone(order ?? []);
    const i = o.findIndex((x) => isFolder(x) && x.id === folderId), j = i + dir;
    if (i < 0 || j < 0 || j >= o.length) return o;
    [o[i], o[j]] = [o[j], o[i]];
    return o;
  }
  var folderOf = (order, id) => (order ?? []).find((x) => isFolder(x) && x.data.includes(id)) ?? null;

  // src/ui/screens/characters.js
  async function renderCharacters(ctx) {
    const st = ctx.state;
    if (!st.chars || st.charsDirty) {
      replace(ctx.main, h("div", { class: "rb-empty" }, "캐릭터를 불러오는 중…"));
      const db = await ctx.api.getDatabase(["characters", "modules", "characterOrder"]);
      st.charOrder = Array.isArray(db?.characterOrder) ? db.characterOrder : [];
      const lc = await loadCharacters(ctx.api, db?.characters);
      db.characters = lc.list;
      st.charsUnloaded = lc.unloaded;
      st.chars = (db?.characters ?? []).map((c, i) => c && !c.trashTime ? {
        i,
        chaId: c.chaId,
        name: c.name ?? "",
        type: c.type,
        image: c.image,
        creator: c.creator,
        version: c.characterVersion,
        lore: (c.globalLore ?? []).length,
        assets: characterAssetKeys(c).length,
        chats: (c.chats ?? []).length,
        modules: c.modules ?? [],
        streaming: isGenerating(c),
        desc: (c.creatorNotes || c.desc || "").slice(0, 400)
      } : null).filter(Boolean);
      st.charModNames = new Map((db?.modules ?? []).map((m) => [m.id, m.name]));
      st.charsDirty = false;
      st.charsAt = Date.now();
    }
    const q = st.search.trim().toLowerCase();
    const filtering = !!q;
    const list = st.chars.filter((c) => !q || c.name.toLowerCase().includes(q) || String(c.creator ?? "").toLowerCase().includes(q));
    ctx.setNavCount("characters", st.chars.length);
    if (!st.charSel || !st.chars.some((c) => c.chaId === st.charSel)) st.charSel = list[0]?.chaId ?? null;
    const box = h("div", { class: "rb-list rb-scroll", role: "listbox", "aria-label": "캐릭터 목록", style: "padding-top:12px" });
    const lazy = ctx.assets.lazy(box);
    const byId = new Map(st.chars.map((c) => [c.chaId, c]));
    const collapsed = ctx.prefs.meta.charFoldersCollapsed ?? {};
    const mu = multiOf2(ctx);
    if (filtering) mu.clear();
    const rowOf = (c) => {
      const img = c.image ? h("img", { alt: "", dataset: { path: c.image, ext: "png" }, style: "width:40px;height:40px;border-radius:12px;object-fit:cover;background:var(--rb-surf2);flex-shrink:0" }) : h("span", { style: "width:40px;height:40px;border-radius:12px;background:var(--rb-surf2);display:flex;align-items:center;justify-content:center;color:var(--rb-mute);flex-shrink:0" }, icon("character", 18));
      const grip = filtering ? null : h("span", { class: "grip", title: "끌어서 순서 바꾸기·폴더에 넣기 · Ctrl/⌘·Shift+클릭으로 여러 개", "aria-hidden": "true" }, icon("grip", 14));
      const mcb = filtering ? null : h("span", { class: "rb-mcb", role: "checkbox", "aria-checked": "false", "aria-label": `${c.name} 고르기` });
      const row2 = h(
        "div",
        {
          class: "rb-row",
          role: "option",
          tabindex: "0",
          "aria-selected": st.charSel === c.chaId ? "true" : "false",
          dataset: filtering ? { id: c.chaId } : { id: c.chaId, dropRow: c.chaId, pick: c.chaId },
          onClick: (ev) => {
            if (!filtering && mu.click(ev, c.chaId, st.charSel)) return;
            st.charSel = c.chaId;
            box.querySelectorAll(".rb-row").forEach((r) => r.setAttribute("aria-selected", "false"));
            row2.setAttribute("aria-selected", "true");
            detail2(ctx, c);
            if (ctx.isMobile()) ctx.openSheet();
          },
          onKeydown: (ev) => {
            if (ev.target === row2 && (ev.key === "Enter" || ev.key === " ")) {
              ev.preventDefault();
              row2.click();
            }
          }
        },
        mcb,
        grip,
        img,
        h(
          "div",
          { class: "txt" },
          h("div", { class: "ttl" }, h("span", { class: "name" }, c.name || "(이름 없음)"), c.type === "group" && badge("그룹", "mute"), c.streaming && badge("응답 생성 중", "warn")),
          h("span", { class: "meta" }, [c.creator && `제작자 ${c.creator}`, `로어 ${c.lore}`, `에셋 ${c.assets}`, `채팅 ${c.chats}`].filter(Boolean).join(" · "))
        )
      );
      if (grip) gripDrag({
        grip,
        row: row2,
        root: box,
        scroller: box,
        count: () => mu.dragIds(c.chaId).length,
        skip: (t) => mu.dragIds(c.chaId).includes(t.getAttribute("data-drop-row")),
        onDrop: (d) => {
          const ids = mu.dragIds(c.chaId);
          return saveOrder(ctx, (o) => moveChar(o, ids, d), ids.length > 1 ? `봇 ${ids.length}개를 옮겼어요` : null);
        }
      });
      if (img.tagName === "IMG") lazy.observe(img);
      return row2;
    };
    if (filtering) {
      for (const c of list.slice(0, 600)) box.appendChild(rowOf(c));
    } else {
      let shown = 0;
      const items = layout(st.charOrder, st.chars.map((c) => ({ chaId: c.chaId })));
      const hasFolders = items.some((x) => x.type === "folder");
      for (const it of items) {
        if (shown > 600) break;
        if (it.type === "char") {
          const c = byId.get(it.id);
          if (c) {
            box.appendChild(rowOf(c));
            shown++;
          }
          continue;
        }
        const f = it.folder, open = !collapsed[f.id];
        const color = FOLDER_COLOR_CSS[f.color] ?? "var(--rb-sub)";
        const head = h(
          "div",
          { style: "display:flex;align-items:center;gap:4px", dataset: { dropFolder: f.id } },
          h(
            "button",
            { type: "button", class: "rb-folder", "aria-expanded": open ? "true" : "false", onClick: () => {
              ctx.svc.meta((m) => {
                m.charFoldersCollapsed ??= {};
                if (open) m.charFoldersCollapsed[f.id] = true;
                else delete m.charFoldersCollapsed[f.id];
              }).catch(() => {
              });
              renderCharacters(ctx);
            } },
            h("span", { class: "chev" }, icon("chevron", 14)),
            h("span", { style: { color, display: "flex" } }, icon("folder", 16)),
            h("b", null, f.name || "(이름 없는 폴더)"),
            h("small", null, String(it.ids.length))
          ),
          iconBtn("more", `${f.name} 폴더 메뉴`, { onClick: (e) => charFolderMenu(ctx, f, e.currentTarget) })
        );
        box.appendChild(head);
        if (open) {
          const body = h("div", { class: "rb-folder-body" });
          for (const id of it.ids) {
            const c = byId.get(id);
            if (c) {
              body.appendChild(rowOf(c));
              shown++;
            }
          }
          if (!it.ids.length) body.appendChild(h("div", { class: "rb-muted", style: "padding:8px 10px" }, "봇을 여기로 끌어다 놓으세요"));
          box.appendChild(body);
        }
      }
      if (hasFolders) box.appendChild(h("div", { class: "rb-label", style: "padding:14px 12px 6px;border-radius:10px", dataset: { dropFolder: "" } }, "여기에 놓으면 폴더 밖으로"));
    }
    if (!list.length) box.appendChild(h("div", { class: "rb-empty" }, st.chars.length ? "찾는 캐릭터가 없어요." : "캐릭터가 없어요."));
    const keep = ctx.main.querySelector(".rb-list")?.scrollTop ?? 0;
    const bar = h("div", { class: "rb-pickbar", role: "toolbar", "aria-label": "고른 봇" });
    replace(ctx.main, h(
      "div",
      { class: "rb-chips" },
      h("span", { class: "rb-muted" }, `캐릭터 ${st.chars.length}명${list.length > 600 ? " · 앞쪽 600명만 표시 (검색으로 좁혀 보세요)" : ""}${st.charsUnloaded ? ` · 앱이 아직 불러오는 중인 봇 ${st.charsUnloaded}명은 빠져 있어요` : ""}`),
      st.charsUnloaded ? btn("새로 고침", { size: "sm", icon: "refresh", onClick: () => {
        st.charsDirty = true;
        renderCharacters(ctx);
      } }) : null,
      h("div", { class: "rb-spacer" }),
      filtering ? null : btn(mu.active ? "선택 끝" : "선택", { size: "sm", icon: "check", id: "rb-pick-toggle", onClick: () => mu.setMode(!mu.active) }),
      btn("폴더", { size: "sm", icon: "folderPlus", onClick: () => newCharFolder(ctx) }),
      btn("업데이트·새로 넣기", { size: "sm", kind: "primary", icon: "upload", onClick: () => ctx.legacy.open() })
    ), bar, box);
    box.scrollTop = keep;
    mu.bar = bar;
    mu.attach(box);
    paintBar2(ctx);
    const sel = st.chars.find((c) => c.chaId === st.charSel);
    if (sel) detail2(ctx, sel);
    else ctx.showDetail(h("div", { class: "rb-empty" }, "캐릭터를 고르면 여기에 자세히 보여요."));
  }
  var orderQ = Promise.resolve();
  function saveOrder(ctx, fn, done) {
    const st = ctx.state;
    const next = fn(st.charOrder ?? []);
    st.charOrder = next;
    renderCharacters(ctx);
    if (done) ctx.toast(done);
    const p = orderQ.then(async () => {
      const fresh = (await ctx.api.getDatabase(["characterOrder"]))?.characterOrder;
      const out = Array.isArray(fresh) ? fn(fresh) : st.charOrder;
      await ctx.api.setDatabaseLite({ characterOrder: out });
      if (JSON.stringify(out) !== JSON.stringify(st.charOrder)) {
        st.charOrder = out;
        if (st.tab === "characters") renderCharacters(ctx);
      }
    }).catch(async (e) => {
      ctx.toast(`순서를 저장하지 못했어요: ${e?.message ?? e}`, { error: true });
      try {
        const cur = (await ctx.api.getDatabase(["characterOrder"]))?.characterOrder;
        if (Array.isArray(cur)) {
          st.charOrder = cur;
          renderCharacters(ctx);
        }
      } catch {
      }
    });
    orderQ = p;
    return p;
  }
  function multiOf2(ctx) {
    ctx.state.charMulti ??= createMulti({ onChange: () => paintBar2(ctx) });
    return ctx.state.charMulti;
  }
  function paintBar2(ctx) {
    const mu = multiOf2(ctx), bar = mu.bar;
    if (!bar) return;
    const tb = ctx.main.querySelector("#rb-pick-toggle");
    if (tb) tb.lastChild.textContent = mu.active ? "선택 끝" : "선택";
    bar.hidden = !mu.active;
    if (!mu.active) {
      bar.replaceChildren();
      return;
    }
    const n = mu.sel.size;
    const visible = () => [...ctx.main.querySelectorAll(".rb-list [data-pick]")].map((r) => r.dataset.pick);
    bar.replaceChildren(
      h("b", null, n ? `${n}개 고름` : "고를 봇을 누르세요"),
      btn("폴더로", { size: "sm", icon: "folder", disabled: !n, onClick: (ev) => {
        const ids = mu.ordered();
        const folders = (ctx.state.charOrder ?? []).filter((x) => x && typeof x === "object" && Array.isArray(x.data));
        openMenu(ctx.win, ev.currentTarget, [
          ...folders.map((f) => ({ label: f.name || "(이름 없는 폴더)", icon: "folder", onClick: () => saveOrder(ctx, (o) => moveChar(o, ids, { folderId: f.id }), `봇 ${ids.length}개를 '${f.name}'(으)로 옮겼어요`) })),
          folders.length ? "sep" : null,
          { label: "새 폴더…", icon: "folderPlus", onClick: async () => {
            const name = await promptDialog(ctx.win, { title: "새 봇 폴더", label: `고른 봇 ${ids.length}개를 넣어요`, placeholder: "폴더 이름" });
            if (name?.trim()) saveOrder(ctx, (o) => createFolder2(o, { id: "df_" + newId().slice(0, 10), name: name.trim(), ids }), `'${name.trim()}' 폴더를 만들었어요 (봇 ${ids.length}개)`);
          } }
        ].filter(Boolean));
      } }),
      btn("폴더 밖으로", { size: "sm", disabled: !n, onClick: () => {
        const ids = mu.ordered();
        saveOrder(ctx, (o) => moveChar(o, ids, { folderId: null }));
      } }),
      btn("보이는 것 모두", { size: "sm", onClick: () => {
        const v = visible();
        mu.set(v.every((id) => mu.has(id)) ? [] : v);
      } }),
      iconBtn("x", "고르기 끝내기", { onClick: () => mu.clear() })
    );
  }
  function charItems(ctx) {
    return ctx.state.chars.map((c) => {
      const f = folderOf(ctx.state.charOrder, c.chaId);
      return { id: c.chaId, label: c.name, folder: f?.id ?? null, sub: [f ? `지금: ${f.name}` : "폴더 없음", c.creator && `제작자 ${c.creator}`].filter(Boolean).join(" · ") };
    });
  }
  async function newCharFolder(ctx) {
    const r = await folderDialog(ctx.win, { title: "새 봇 폴더", items: charItems(ctx), noun: "봇", ...folderPickPrefs(ctx) });
    if (!r) return;
    await saveOrder(ctx, (o) => createFolder2(o, { id: "df_" + newId().slice(0, 10), name: r.name, ids: r.ids }), `'${r.name}' 폴더를 만들었어요${r.ids.length ? ` (봇 ${r.ids.length}개)` : ""}. RisuAI 사이드바에도 같은 폴더가 생겨요.`);
  }
  function charFolderMenu(ctx, f, anchor) {
    openMenu(ctx.win, anchor, [
      { label: "넣을 봇 고르기…", icon: "plus", onClick: async () => {
        const r = await folderDialog(ctx.win, { title: `'${f.name}' 폴더에 넣을 봇`, items: charItems(ctx), checked: [...f.data], ok: "저장", withName: false, noun: "봇", current: f.id, ...folderPickPrefs(ctx) });
        if (r) await saveOrder(ctx, (o) => setMembers(o, f.id, r.ids));
      } },
      { label: "이름 바꾸기", icon: "edit", onClick: async () => {
        const n = await promptDialog(ctx.win, { title: "폴더 이름", value: f.name });
        if (n?.trim()) await saveOrder(ctx, (o) => renameFolder2(o, f.id, n.trim()));
      } },
      { label: "폴더 색", icon: "palette", onClick: async () => {
        const c = await new Promise((res) => openMenu(ctx.win, anchor, FOLDER_COLORS.map((k) => ({ label: FOLDER_COLOR_KO[k], icon: "folder", onClick: () => res(k) }))));
        if (c) await saveOrder(ctx, (o) => colorFolder(o, f.id, c));
      } },
      { label: "위로", icon: "up", onClick: () => saveOrder(ctx, (o) => moveFolder(o, f.id, -1)) },
      { label: "아래로", icon: "down", onClick: () => saveOrder(ctx, (o) => moveFolder(o, f.id, 1)) },
      "sep",
      { label: "폴더 삭제 (봇은 남음)", icon: "trash", danger: true, onClick: async () => {
        if (await confirmDialog(ctx.win, { title: `'${f.name}' 폴더를 지울까요?`, body: "안에 있던 봇은 폴더 밖으로 나와요. 봇은 지워지지 않아요.", ok: "폴더 삭제", danger: true })) await saveOrder(ctx, (o) => deleteFolder2(o, f.id));
      } }
    ]);
  }
  function detail2(ctx, c) {
    const st = ctx.state;
    const stat = (label, v) => h("div", { class: "rb-stat" }, h("small", null, label), h("b", null, String(v)));
    const timeline = h("div", { style: "display:flex;flex-direction:column;gap:8px" });
    const full = async () => {
      const cur = await ctx.api.getCharacterFromIndex(c.i);
      if (!cur || cur.chaId !== c.chaId) throw new Error("캐릭터를 다시 찾지 못했어요. 목록을 새로 고쳐 주세요.");
      return cur;
    };
    ctx.showDetail(
      h(
        "div",
        { style: "display:flex;flex-direction:column;gap:6px" },
        c.creator ? h("span", { style: "font-size:12px;color:var(--rb-acc-text)" }, c.creator + (c.version ? ` · ${c.version}` : "")) : null,
        h("h2", { class: "rb-h2" }, c.name || "(이름 없음)"),
        c.desc ? h("p", { class: "rb-p", style: "white-space:pre-line;max-height:120px;overflow:auto" }, c.desc) : null,
        c.streaming ? note("warn", "지금 응답을 생성하는 중이에요. 끝난 뒤에 업데이트할 수 있어요.") : null
      ),
      h("div", { class: "rb-stats" }, stat("로어북", c.lore), stat("에셋", c.assets), stat("채팅", c.chats), stat("연결 모듈", c.modules.length)),
      h(
        "div",
        { class: "rb-field" },
        h("span", { class: "rb-label" }, "연결된 모듈"),
        h("div", { class: "rb-card" }, c.modules.length ? c.modules.map((id) => h(
          "div",
          { class: "rb-kv" },
          h("span", null, st.charModNames.get(id) ?? "(꺼졌거나 없는 모듈)"),
          h("a", { href: "#", style: "font-size:12px;color:var(--rb-acc-text)", onClick: (ev) => {
            ev.preventDefault();
            st.modSel = id;
            ctx.go("modules");
          } }, "열기")
        )) : h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "연결된 모듈이 없어요")))
      ),
      h("div", { class: "rb-field" }, h(
        "div",
        { style: "display:flex;align-items:center" },
        h("span", { class: "rb-label", style: "flex:1" }, "버전 타임라인"),
        h("a", { href: "#", style: "font-size:12px;color:var(--rb-acc-text)", onClick: (ev) => {
          ev.preventDefault();
          st.histTarget = c.chaId;
          ctx.go("history");
        } }, "전체 보기")
      ), timeline),
      h("div", { style: "flex:1" }),
      h(
        "div",
        { style: "display:flex;gap:8px;flex-wrap:wrap" },
        btn("편집", { kind: "primary", size: "lg", icon: "edit", onClick: () => openCharEditor(ctx, c.i, c.chaId).catch((e) => ctx.toast(e?.message ?? String(e), { error: true })) }),
        btn("에셋", { size: "lg", icon: "image", onClick: () => openCharAssets(ctx, c.i, c.chaId).catch((e) => ctx.toast(e?.message ?? String(e), { error: true })) })
      ),
      h(
        "div",
        { style: "display:flex;gap:8px;flex-wrap:wrap" },
        btn("업데이트 가져오기", { size: "lg", icon: "upload", onClick: () => ctx.legacy.open() }),
        isDev(ctx) ? btn(findProject(ctx, "character", c.chaId) ? "개발 탭에서 보기" : "개발 목록에 넣기", { size: "lg", icon: "code", onClick: async () => {
          await addProjects(ctx, [{ kind: "character", id: c.chaId }]);
          ctx.state.devSel = `c:${c.chaId}`;
          ctx.go("dev");
        } }) : null,
        isDev(ctx) ? btn("패치 만들기", { size: "lg", icon: "code", onClick: () => openPatchMaker(ctx, { kind: "character", key: `c:${c.chaId}`, i: c.i, chaId: c.chaId, name: c.name }) }) : btn("내 수정 내보내기", { size: "lg", icon: "download", onClick: async () => {
          try {
            await exportMyChanges(ctx, "character", await full());
          } catch (e) {
            ctx.toast(e.message, { error: true });
          }
        } }),
        btn("패치 적용", { size: "lg", icon: "refresh", onClick: () => applyPatchFile(ctx, "character", full, async (res) => {
          const last2 = await full();
          if (isGenerating(last2)) throw new Busy();
          await ctx.api.setCharacterToIndex(c.i, res);
          st.charsDirty = true;
          renderCharacters(ctx);
        }) })
      )
    );
    (async () => {
      const list = (await createStore(ctx.api).listBackups()).filter((b) => b.target === c.chaId).slice(0, 3);
      replace(timeline, list.length ? list.map((b) => h("div", { class: "rb-card pad", style: "padding:10px 14px" }, h("div", { style: "display:flex;gap:8px" }, h("b", { style: "font-size:13px" }, b.note || "업데이트 전"), h("span", { class: "rb-muted" }, fmtWhen(b.t))), b.summary ? h("div", { class: "rb-muted" }, b.summary) : null)) : h("div", { class: "rb-muted", style: "padding:12px 14px;border-radius:12px;border:1px dashed var(--rb-line)" }, "아직 기록이 없어요."));
    })().catch(() => {
    });
  }

  // src/ui/screens/history.js
  async function renderHistory(ctx) {
    const st = ctx.state;
    const store = createStore(ctx.api);
    const [backups, history] = await Promise.all([store.listBackups(), store.listHistory()]);
    const all = [...backups.map((b) => ({ ...b, hasFile: true })), ...history.map((b) => ({ ...b, hasFile: false }))].sort((a, b) => b.t - a.t);
    const targets = /* @__PURE__ */ new Map();
    for (const b of all) if (!targets.has(b.target)) targets.set(b.target, { target: b.target, kind: b.kind, name: b.name, items: [] });
    for (const b of all) targets.get(b.target).items.push(b);
    const groups = [...targets.values()];
    if (st.histTarget && !targets.has(st.histTarget)) st.histTarget = null;
    st.histKind ??= "all";
    const q = st.search.trim().toLowerCase();
    const shownGroups = groups.filter((g) => (st.histKind === "all" || g.kind === st.histKind) && (!q || String(g.name).toLowerCase().includes(q)));
    const cur = st.histTarget ? targets.get(st.histTarget) : null;
    const keep = ctx.prefs.ui?.keepBackups ?? 5;
    const side = h(
      "div",
      { class: "rb-list rb-scroll", style: "padding-top:8px" },
      h(
        "button",
        { type: "button", class: "rb-row", "aria-selected": !cur ? "true" : "false", onClick: () => {
          st.histTarget = null;
          renderHistory(ctx);
        } },
        h("span", { style: "display:flex;color:var(--rb-acc-text)" }, icon("history", 18)),
        h("div", { class: "txt" }, h("span", { class: "name" }, "전체 기록"), h("span", { class: "meta" }, `${all.length}개`))
      ),
      shownGroups.map((g) => h(
        "button",
        { type: "button", class: "rb-row", "aria-selected": cur === g ? "true" : "false", onClick: () => {
          st.histTarget = g.target;
          renderHistory(ctx);
        } },
        h("span", { style: "display:flex;color:var(--rb-sub)" }, icon(g.kind === "character" ? "character" : "module", 18)),
        h("div", { class: "txt" }, h("span", { class: "name" }, g.name || "(이름 없음)"), h("span", { class: "meta" }, `${g.items.length}개 · 최근 ${fmtWhen(g.items[0].t)}`))
      ))
    );
    const items = cur ? cur.items : all.slice(0, 200);
    const timeline = h("div", { style: "display:flex;flex-direction:column" }, items.map((b, i) => entry(ctx, b, i === 0 && !!cur, !cur)));
    const pane = h(
      "div",
      { class: "rb-section rb-scroll", style: "flex:1" },
      h(
        "div",
        { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" },
        h(
          "div",
          { style: "flex:1;min-width:200px" },
          h("h2", { class: "rb-h2" }, cur ? cur.name : "버전 타임라인"),
          h("p", { class: "rb-p" }, cur ? "이 항목을 업데이트·편집하기 전 상태들이에요. 되돌려도 채팅은 그대로예요." : "업데이트·편집·삭제 전에 자동으로 저장한 상태들이에요.")
        ),
        h(
          "label",
          { class: "rb-field", style: "width:230px" },
          h("span", { class: "rb-label" }, "항목마다 보관할 백업 수"),
          segmented([["3", "3"], ["5", "5"], ["10", "10"], ["20", "20"]], String(keep), async (v) => {
            await ctx.prefs.saveUi({ keepBackups: Number(v) });
            ctx.toast(`항목마다 ${v}개씩 보관해요 (다음 백업부터)`);
          }, "보관 수")
        )
      ),
      items.length ? timeline : h("div", { class: "rb-empty" }, "아직 기록이 없어요. 이 플러그인으로 업데이트·편집하면 쌓여요."),
      h("p", { class: "rb-muted" }, '백업은 서버에 파일로 저장돼 다른 기기에서도 보여요. 오래된 백업은 보관 수를 넘으면 파일은 지우고 요약만 남겨요. RisuAI의 "사용하지 않는 에셋 정리"를 하면 백업 파일이 지워질 수 있어요.')
    );
    const left = h(
      "div",
      { style: "width:300px;flex-shrink:0;border-right:1px solid var(--rb-line2);display:flex;flex-direction:column;min-height:0" },
      h("div", { class: "rb-chips", style: "padding:14px 12px 4px" }, chip("전체", { pressed: st.histKind === "all", onClick: () => {
        st.histKind = "all";
        renderHistory(ctx);
      } }), chip("모듈", { pressed: st.histKind === "module", onClick: () => {
        st.histKind = "module";
        renderHistory(ctx);
      } }), chip("캐릭터", { pressed: st.histKind === "character", onClick: () => {
        st.histKind = "character";
        renderHistory(ctx);
      } })),
      side
    );
    replace(ctx.main, h("div", { style: "flex:1;display:flex;min-height:0;flex-wrap:wrap" }, ctx.isMobile() ? null : left, pane));
    ctx.setNavCount("history", all.length || void 0);
  }
  function entry(ctx, b, first, showName) {
    const diffBox = h("div");
    return h(
      "div",
      { style: "display:flex;gap:14px" },
      h(
        "div",
        { style: "display:flex;flex-direction:column;align-items:center;width:14px" },
        h("span", { style: `width:14px;height:14px;border-radius:999px;margin-top:4px;flex-shrink:0;${first ? "background:var(--rb-deco-grad)" : b.hasFile ? "box-shadow:inset 0 0 0 2px var(--rb-line3)" : "box-shadow:inset 0 0 0 2px var(--rb-line);opacity:.6"}` }),
        h("span", { style: "width:2px;flex:1;background:var(--rb-line)" })
      ),
      h(
        "div",
        { style: "flex:1;padding-bottom:18px;display:flex;flex-direction:column;gap:6px;min-width:0" },
        h(
          "div",
          { style: "display:flex;gap:8px;align-items:baseline;flex-wrap:wrap" },
          showName ? h("b", { style: "font-size:14px" }, b.name) : null,
          h("span", { style: "font-size:13px;font-weight:600;color:var(--rb-sub)" }, b.note || "업데이트 전"),
          badge(b.kind === "character" ? "캐릭터" : "모듈", b.kind === "character" ? "acc" : "acc2"),
          h("span", { class: "rb-muted" }, fmtWhen(b.t)),
          b.hasFile && b.size ? h("span", { class: "rb-muted" }, fmtBytes(b.size)) : null,
          !b.hasFile ? badge("요약만 남음", "mute") : null
        ),
        b.summary ? h("span", { class: "rb-muted" }, b.summary) : null,
        b.hasFile ? h(
          "div",
          { style: "display:flex;gap:6px;flex-wrap:wrap" },
          btn("이 시점으로 되돌리기", { size: "sm", icon: "undo", onClick: async () => {
            if (!await confirmDialog(ctx.win, { title: `${b.name}을(를) 이 시점으로 되돌릴까요?`, body: `${fmtWhen(b.t)} ${b.note || ""} 상태로 돌아가요. 지금 상태도 먼저 백업해요. 채팅은 그대로예요.`, ok: "되돌리기" })) return;
            await ctx.legacy.restore(b);
          } }),
          b.kind === "module" ? btn("지금과 비교", { size: "sm", onClick: async () => {
            try {
              const snap = await createStore(ctx.api).loadBackup(b);
              const now = (await ctx.svc.load()).entries.find((e) => e.module.id === b.target)?.module;
              const lines = now ? diffSummary(snap, now) : ["지금은 이 모듈이 없어요 (지워졌어요). 되돌리면 다시 생겨요."];
              replace(diffBox, h("div", { class: "rb-card pad", style: "font-size:13px;display:flex;flex-direction:column;gap:4px" }, h("b", null, "이 시점 → 지금"), lines.length ? lines.map((l) => h("span", null, l)) : h("span", { class: "rb-muted" }, "차이가 없어요")));
            } catch (e) {
              ctx.toast(e?.message ?? String(e), { error: true });
            }
          } }) : null,
          btn("지우기", { size: "sm", kind: "ghost", icon: "trash", onClick: async () => {
            if (!await confirmDialog(ctx.win, { title: "이 백업을 지울까요?", body: "지우면 이 시점으로 되돌릴 수 없어요.", ok: "삭제", danger: true })) return;
            await createStore(ctx.api).removeBackup(b.id);
            renderHistory(ctx);
          } })
        ) : null,
        diffBox
      )
    );
  }

  // src/ui/app.js
  var TABS = [
    { id: "modules", label: "모듈", icon: "module" },
    { id: "characters", label: "캐릭터", icon: "character" },
    { id: "presets", label: "프리셋", icon: "preset" },
    { id: "history", label: "기록", icon: "history" },
    { id: "tools", label: "도구", icon: "tools" },
    { id: "dev", label: "개발", icon: "code", dev: true }
  ];
  function createApp(api, { legacy, version, onPersonaChanged }) {
    const doc = document;
    if (!doc.getElementById("rb-style")) {
      doc.head.appendChild(h("link", { rel: "stylesheet", href: FONT_LINK }));
      doc.head.appendChild(h("style", { id: "rb-style" }, CSS2));
    }
    const prefs = createPrefs(api);
    const svc = createService(api, prefs);
    const assets = createAssetLoader(api);
    const state = { tab: "modules", search: "", risuScheme: "dark", mode: "dark", sub: null, opened: false };
    const root = h("div", { class: "rb-root", hidden: true });
    const win = h("div", { class: "rb-win", role: "dialog", "aria-modal": "true", "aria-label": "Dusk Atelier" });
    root.appendChild(win);
    doc.body.appendChild(root);
    const searchInput = h("input", { type: "search", placeholder: "모듈 이름, 로어북 키워드 검색", "aria-label": "검색" });
    const mobileSearchInput = h("input", { type: "search", placeholder: "검색", "aria-label": "검색" });
    let searchTimer = null;
    const onSearch = (e) => {
      state.search = e.target.value;
      (e.target === searchInput ? mobileSearchInput : searchInput).value = state.search;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => ctx.refresh(), 120);
    };
    searchInput.addEventListener("input", onSearch);
    mobileSearchInput.addEventListener("input", onSearch);
    const head = h(
      "header",
      { class: "rb-head" },
      h(
        "div",
        { class: "rb-brand" },
        h("div", { class: "rb-logo", "aria-hidden": "true" }, icon("module", 18)),
        h("div", null, h("b", null, "Dusk Atelier"), h("small", null, "for RisuBard"))
      ),
      h("label", { class: "rb-search" }, icon("search", 16), searchInput, h("span", { class: "rb-kbd", "aria-hidden": "true" }, "/")),
      h("div", { class: "rb-spacer" }),
      btn("가져오기", { icon: "upload", labelClass: "lbl", onClick: () => legacy.open(), id: "rb-import" }),
      iconBtn("palette", "색 바꾸기", { onClick: () => go("tools", "settings") }),
      iconBtn("x", "닫기", { onClick: () => close(), id: "rb-close" })
    );
    const nav = h("nav", { class: "rb-nav", "aria-label": "탭" });
    const tabbar = h("nav", { class: "rb-tabbar", "aria-label": "탭" });
    const navLinks = /* @__PURE__ */ new Map(), barLinks = /* @__PURE__ */ new Map();
    for (const t of TABS) {
      const a = h("a", { href: "#", dataset: { tab: t.id }, onClick: (e) => {
        e.preventDefault();
        go(t.id);
      } }, icon(t.icon, 18), h("span", null, t.label), h("small"));
      navLinks.set(t.id, a);
      nav.appendChild(a);
      const b = h("a", { href: "#", dataset: { tab: t.id }, onClick: (e) => {
        e.preventDefault();
        go(t.id);
      } }, icon(t.icon, 22), t.label);
      barLinks.set(t.id, b);
      tabbar.appendChild(b);
    }
    const navFoot = h("div", { style: "margin-top:auto;display:flex;flex-direction:column" });
    nav.appendChild(navFoot);
    const main = h("section", { class: "rb-main", "aria-live": "polite" });
    const detail3 = h("aside", { class: "rb-detail rb-scroll", "aria-label": "상세" });
    const sheetBack = h("div", { class: "rb-sheet-back", onClick: () => ctx.closeSheet() });
    const body = h("div", { class: "rb-body" }, nav, main, sheetBack, detail3);
    win.append(head, h("label", { class: "rb-search rb-mobile-search" }, icon("search", 16), mobileSearchInput), body, tabbar);
    let dragDepth = 0, dropEl = null;
    const hasFiles = (e) => [...e.dataTransfer?.types ?? []].includes("Files");
    win.addEventListener("dragenter", (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth++;
      if (!dropEl) {
        dropEl = h("div", { class: "rb-drop" }, h("div", null, icon("upload", 20), "놓으면 종류와 대상을 알아서 찾아요"));
        win.appendChild(dropEl);
      }
    });
    win.addEventListener("dragover", (e) => {
      if (hasFiles(e)) e.preventDefault();
    });
    win.addEventListener("dragleave", () => {
      if (--dragDepth <= 0) {
        dragDepth = 0;
        dropEl?.remove();
        dropEl = null;
      }
    });
    win.addEventListener("drop", (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth = 0;
      dropEl?.remove();
      dropEl = null;
      const files = [...e.dataTransfer.files ?? []];
      if (files.length) legacy.startWithFiles(files);
    });
    doc.addEventListener("keydown", (e) => {
      if (root.hidden) return;
      if (e.key === "Escape" && !win.querySelector(".rb-modal, .rb-menu, .rb-full, .rb-lightbox")) {
        if (detail3.classList.contains("open")) ctx.closeSheet();
        else close();
      }
      if (e.key === "/" && doc.activeElement?.tagName !== "INPUT" && doc.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInput.focus();
      }
    });
    function applyTheme() {
      const theme = prefs.ui?.theme;
      state.mode = resolveMode(theme ?? { mode: "auto" }, state.risuScheme);
      const { vars, scheme } = themeVars(theme, state.mode);
      for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
      doc.documentElement.style.colorScheme = state.risuScheme;
      win.style.colorScheme = scheme;
    }
    function go(tab, sub = null) {
      if (tab !== state.tab) {
        state.search = "";
        searchInput.value = "";
        mobileSearchInput.value = "";
      }
      if (tab === "characters" && Date.now() - (state.charsAt ?? 0) > 3e4) state.charsDirty = true;
      if (tab === "dev" && !prefs.ui?.devMode) {
        tab = "tools";
        sub = null;
      }
      state.tab = tab;
      state.sub = sub;
      ctx.closeSheet();
      render();
    }
    function refreshTabs() {
      const on = !!prefs.ui?.devMode;
      for (const links of [navLinks, barLinks]) {
        const a = links.get("dev");
        if (a) a.hidden = !on;
      }
      win.classList.toggle("rb-has-dev", on);
      if (!on && state.tab === "dev") go("tools");
    }
    function render() {
      refreshTabs();
      for (const links of [navLinks, barLinks]) for (const [id, a] of links) {
        if (id === state.tab) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      }
      replace(
        navFoot,
        h("div", { class: "rb-nav-hint" }, "파일을 창 어디에 끌어다 놓아도 바로 가져와요"),
        h("div", { class: "rb-nav-hint", style: "padding-top:4px" }, `v${version}`)
      );
      const showSearch = ["modules", "characters", "history"].includes(state.tab);
      searchInput.placeholder = { modules: "모듈 이름, 로어북 키워드 검색", characters: "캐릭터 이름, 제작자 검색", history: "기록에서 이름 찾기" }[state.tab] ?? "검색";
      win.classList.toggle("rb-nosearch", !showSearch);
      replace(detail3);
      detail3.hidden = true;
      const screen = { modules: renderModules, characters: renderCharacters, presets: renderPresets, history: renderHistory, tools: state.sub === "settings" ? renderSettings : renderTools, dev: renderDev }[state.tab] ?? renderPlaceholder;
      Promise.resolve(screen(ctx)).catch((err) => {
        replace(main, h("div", { class: "rb-section" }, h("div", { class: "rb-note err", role: "alert" }, icon("alert", 18), h("span", null, `화면을 열지 못했어요: ${err?.message ?? err}`))));
      });
    }
    async function open() {
      try {
        const cs = await api.getColorScheme();
        state.risuScheme = cs?.scheme?.type === "light" ? "light" : "dark";
      } catch {
        state.risuScheme = "dark";
      }
      if (!prefs.ui) await prefs.load();
      else await prefs.reloadMeta();
      state.modDirty = true;
      svc.invalidate();
      applyTheme();
      root.hidden = false;
      await api.showContainer("fullscreen");
      render();
      state.opened = true;
      setTimeout(() => (win.querySelector(".rb-row") ?? searchInput).focus?.(), 50);
    }
    async function close() {
      if (legacy.busy) return;
      root.hidden = true;
      await api.hideContainer();
    }
    const ctx = {
      api,
      prefs,
      svc,
      assets,
      state,
      root,
      win,
      main,
      detail: detail3,
      version,
      legacy,
      onPersonaChanged,
      openEditor: (id) => openEditor(ctx, id),
      openAssets: (id) => openAssets(ctx, id),
      tabs: TABS,
      navLinks,
      go,
      refresh: () => render(),
      applyTheme,
      refreshTabs: () => refreshTabs(),
      setNavCount(tab, n) {
        const s = navLinks.get(tab)?.querySelector("small");
        if (s) s.textContent = n === void 0 ? "" : String(n);
      },
      openSheet() {
        detail3.hidden = false;
        detail3.classList.add("open");
        sheetBack.classList.add("open");
      },
      closeSheet() {
        detail3.classList.remove("open");
        sheetBack.classList.remove("open");
      },
      showDetail(...children) {
        replace(detail3, h("div", { class: "rb-sheet-head" }, iconBtn("x", "상세 닫기", { onClick: () => ctx.closeSheet() })), ...children);
        detail3.hidden = false;
      },
      toast: (text, opts) => toast(win, text, opts),
      isMobile: () => (win.clientWidth || 1e3) <= 760
    };
    onNotice((msg) => ctx.toast(msg, { seconds: 8 }));
    return { open, close, ctx };
  }

  // src/main.js
  var VERSION = true ? "1.1.0" : "dev";
  var TITLE = "Dusk Atelier";
  async function start() {
    const raw = globalThis.risuai ?? globalThis.Risuai;
    if (!raw) return;
    const friendly = (fn) => async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        if (isHostBlocked(e) && !e?.hostBlocked) {
          const err = new Error(hostBlockedMessage);
          err.hostBlocked = true;
          err.cause = e;
          throw err;
        }
        throw e;
      }
    };
    const wrapped = { setCharacterToIndex: friendly((...a) => raw.setCharacterToIndex(...a)), setDatabaseLite: friendly((...a) => raw.setDatabaseLite(...a)) };
    const api = new Proxy(raw, { get: (t, k) => k in wrapped ? wrapped[k] : t[k] });
    const ICON = iconMarkup("module", 20);
    if (globalThis.__RBM_ENTRY__ === "legacy") {
      if (!document.getElementById("rb-style")) document.head.appendChild(h("style", { id: "rb-style" }, CSS2));
      const legacy2 = await createLegacy(api);
      await api.registerButton({ name: TITLE, icon: ICON, iconType: "html", location: "hamburger" }, () => legacy2.open());
      await api.registerSetting(TITLE, () => legacy2.open(), ICON, "html");
      return;
    }
    let app = null;
    const legacy = await createLegacy(api, {
      onExit: () => {
        if (app) {
          app.ctx.state.modDirty = true;
          app.ctx.refresh();
        }
      },
      host: () => app?.ctx.root,
      links: {
        get: (k) => app?.ctx.prefs.meta?.links?.[k],
        set: (k, id) => {
          app?.ctx.svc.meta((m) => {
            m.links ??= {};
            m.links[k] = id;
          }).catch(() => {
          });
        }
      }
    });
    let handlers = null, timer = null;
    const sync = () => app?.ctx.svc.serial(() => syncPersonaModules(api)).catch((e) => console.log("[Dusk Atelier] 페르소나 동기화 실패", e?.message ?? e));
    const onInput = async (text) => {
      await sync();
      return text;
    };
    const onDisplay = async (text) => {
      clearTimeout(timer);
      timer = setTimeout(sync, 250);
      return text;
    };
    async function refreshPersonaHandlers() {
      const on = hasPersonaLinks(await loadPersonaMap(api).catch(() => ({ map: {} })));
      if (on && !handlers) {
        await api.addRisuScriptHandler("input", onInput);
        await api.addRisuScriptHandler("display", onDisplay);
        handlers = true;
      }
      if (!on && handlers) {
        try {
          await api.removeRisuScriptHandler("input", onInput);
          await api.removeRisuScriptHandler("display", onDisplay);
        } catch {
        }
        handlers = null;
      }
      resetPersonaSyncCache();
      if (on) sync();
    }
    app = createApp(api, { legacy, version: VERSION, onPersonaChanged: () => refreshPersonaHandlers().catch(() => {
    }) });
    refreshPersonaHandlers().catch(() => {
    });
    (async () => {
      const data = await loadPresets(api);
      const device = isMobileDevice() ? "mobile" : "desktop";
      const target = pairSwitchTarget(data, device);
      if (target) await app.ctx.svc.serial(() => applyPreset(api, target));
      const fresh = await loadPresets(api);
      if (fresh.lastDeviceType !== device && (fresh.defaultMobile || fresh.defaultDesktop || target)) {
        fresh.lastDeviceType = device;
        await savePresets(api, fresh);
      }
      if (target) console.log(`[Dusk Atelier] ${device === "mobile" ? "모바일" : "데스크탑"} 감지 → '${target}' 프리셋으로 전환`);
    })().catch((e) => console.log("[Dusk Atelier] 디바이스 페어 확인 실패", e?.message ?? e));
    const open = () => app.open().catch((e) => console.log(`[${TITLE}] 열기 실패: ${e?.message ?? e}`));
    await api.registerButton({ name: TITLE, icon: ICON, iconType: "html", location: "hamburger" }, open);
    await api.registerSetting(TITLE, open, ICON, "html");
  }
  if (typeof globalThis.__RBU_TEST__ !== "undefined") globalThis.__RBU_TEST__.RBU = { ...engine_exports };
  else start().catch((e) => console.log(`[${TITLE}] 초기화 실패: ${e?.message ?? e}`));
})();
