import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// 종은 ctx·hub보다 먼저 만들어진다: 만들 때 ctx를 읽으면 앱이 켜지지 않고(ReferenceError), hub는 나중에 붙여야 한다
test("종은 ctx를 만들 때 읽지 않고, hub는 만든 뒤 붙인다", () => {
  const app = readFileSync(new URL("../src/ui/app.js", import.meta.url), "utf8"), main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  assert.match(app, /reportBell\(\(\) => ctx\)/);
  assert.match(app, /reportBell: bell,/);
  assert.ok(main.indexOf("reportBell?.attach(hub)") > main.indexOf("app.ctx.hub = hub"));
});
