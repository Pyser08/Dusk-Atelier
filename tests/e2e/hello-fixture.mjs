// 시험용 애드온 hello: 사용자 목록(addons.src.json)에서는 뺐고, 로더 e2e에서만 목록에 붙여 쓴다(addons/dist/hello.js).
import fs from "node:fs";
import crypto from "node:crypto";
export function manifestWithHello() {
  const m = JSON.parse(fs.readFileSync("addons/addons.json", "utf8"));
  const code = fs.readFileSync("addons/dist/hello.js", "utf8");
  m.addons.unshift({ id: "hello", name: "애드온 시험", version: "0.1.0", minCore: "1.9.2", hooks: false, desc: "로더 시험용", url: "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/addons/addons/dist/hello.js", sha256: crypto.createHash("sha256").update(code, "utf8").digest("hex"), size: Buffer.byteLength(code) });
  return JSON.stringify(m);
}
