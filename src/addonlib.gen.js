// 자동 생성(node tools/build-addons.mjs) — 고치지 마세요. 애드온이 쓰는 코어 모듈을 이름으로 넘겨 준다.
import * as m0 from "./data/addcharacter.js";
import * as m1 from "./data/cellar.js";
import * as m2 from "./data/dbcache.js";
import * as m3 from "./data/genstate.js";
import * as m4 from "./data/memorybutton.js";
import * as m5 from "./data/memorystore.js";
import * as m6 from "./data/memoryswitches.js";
import * as m7 from "./data/modelhub.js";
import * as m8 from "./data/modules.js";
import * as m9 from "./data/personabuilder.js";
import * as m10 from "./data/personaroulette.js";
import * as m11 from "./data/plugins.js";
import * as m12 from "./data/pot/llm-client.js";
import * as m13 from "./data/themes.js";
import * as m14 from "./data/usernames.js";
import * as m15 from "./dev/aibuild/duskdesign.js";
import * as m16 from "./dev/aibuild/preset-format.js";
import * as m17 from "./dev/aibuild/util.js";
import * as m18 from "./engine/affhud.js";
import * as m19 from "./engine/card/grade.js";
import * as m20 from "./engine/card/memories.js";
import * as m21 from "./engine/card/prompt.js";
import * as m22 from "./engine/card/tags.js";
import * as m23 from "./engine/character.js";
import * as m24 from "./engine/chatkey.js";
import * as m25 from "./engine/chattext.js";
import * as m26 from "./engine/collective.js";
import * as m27 from "./engine/defaultfollow.js";
import * as m28 from "./engine/embed.js";
import * as m29 from "./engine/gauge.js";
import * as m30 from "./engine/lorelog.js";
import * as m31 from "./engine/lorerules.js";
import * as m32 from "./engine/match.js";
import * as m33 from "./engine/memoryemo.js";
import * as m34 from "./engine/memorygrade.js";
import * as m35 from "./engine/memoryhuman.js";
import * as m36 from "./engine/memoryinject.js";
import * as m37 from "./engine/memoryinner.js";
import * as m38 from "./engine/memorykeys.js";
import * as m39 from "./engine/memorylines.js";
import * as m40 from "./engine/memoryplus.js";
import * as m41 from "./engine/memoryprompt.js";
import * as m42 from "./engine/memoryreconcile.js";
import * as m43 from "./engine/memoryswitch.js";
import * as m44 from "./engine/memorytrust.js";
import * as m45 from "./engine/memoryusage.js";
import * as m46 from "./engine/merge.js";
import * as m47 from "./engine/modelcfg.js";
import * as m48 from "./engine/pot/cycle-tracking.js";
import * as m49 from "./engine/pot/model-options.js";
import * as m50 from "./engine/pot/pdf-reference.js";
import * as m51 from "./engine/pot/token-usage.js";
import * as m52 from "./engine/regress.js";
import * as m53 from "./engine/runai.js";
import * as m54 from "./engine/safety.js";
import * as m55 from "./engine/skillcfg.js";
import * as m56 from "./engine/skillhook.js";
import * as m57 from "./engine/storytime.js";
import * as m58 from "./engine/trackpreset.js";
import * as m59 from "./engine/util.js";
import * as m60 from "./engine/webhook.js";
import * as m61 from "./ui/aifix.js";
import * as m62 from "./ui/assets.js";
import * as m63 from "./ui/codeedit.js";
import * as m64 from "./ui/dom.js";
import * as m65 from "./ui/icons.js";
import * as m66 from "./ui/kit.js";
import * as m67 from "./ui/screens/memory/common.js";
import * as m68 from "./ui/screens/memory/hypamodal.js";
import * as m69 from "./ui/screens/memory/setup.js";
import * as m70 from "./ui/screens/memory/skills.js";
import * as m71 from "./ui/screens/memory/username.js";
import * as m72 from "./ui/screens/promptstab.js";
import * as m73 from "./ui/screentours.js";
import * as m74 from "./ui/tour.js";
import * as m75 from "./ui/undo.js";
import * as m76 from "./vendor/fflate.js";
export const LIB = {
  "src/data/addcharacter.js": m0,
  "src/data/cellar.js": m1,
  "src/data/dbcache.js": m2,
  "src/data/genstate.js": m3,
  "src/data/memorybutton.js": m4,
  "src/data/memorystore.js": m5,
  "src/data/memoryswitches.js": m6,
  "src/data/modelhub.js": m7,
  "src/data/modules.js": m8,
  "src/data/personabuilder.js": m9,
  "src/data/personaroulette.js": m10,
  "src/data/plugins.js": m11,
  "src/data/pot/llm-client.js": m12,
  "src/data/themes.js": m13,
  "src/data/usernames.js": m14,
  "src/dev/aibuild/duskdesign.js": m15,
  "src/dev/aibuild/preset-format.js": m16,
  "src/dev/aibuild/util.js": m17,
  "src/engine/affhud.js": m18,
  "src/engine/card/grade.js": m19,
  "src/engine/card/memories.js": m20,
  "src/engine/card/prompt.js": m21,
  "src/engine/card/tags.js": m22,
  "src/engine/character.js": m23,
  "src/engine/chatkey.js": m24,
  "src/engine/chattext.js": m25,
  "src/engine/collective.js": m26,
  "src/engine/defaultfollow.js": m27,
  "src/engine/embed.js": m28,
  "src/engine/gauge.js": m29,
  "src/engine/lorelog.js": m30,
  "src/engine/lorerules.js": m31,
  "src/engine/match.js": m32,
  "src/engine/memoryemo.js": m33,
  "src/engine/memorygrade.js": m34,
  "src/engine/memoryhuman.js": m35,
  "src/engine/memoryinject.js": m36,
  "src/engine/memoryinner.js": m37,
  "src/engine/memorykeys.js": m38,
  "src/engine/memorylines.js": m39,
  "src/engine/memoryplus.js": m40,
  "src/engine/memoryprompt.js": m41,
  "src/engine/memoryreconcile.js": m42,
  "src/engine/memoryswitch.js": m43,
  "src/engine/memorytrust.js": m44,
  "src/engine/memoryusage.js": m45,
  "src/engine/merge.js": m46,
  "src/engine/modelcfg.js": m47,
  "src/engine/pot/cycle-tracking.js": m48,
  "src/engine/pot/model-options.js": m49,
  "src/engine/pot/pdf-reference.js": m50,
  "src/engine/pot/token-usage.js": m51,
  "src/engine/regress.js": m52,
  "src/engine/runai.js": m53,
  "src/engine/safety.js": m54,
  "src/engine/skillcfg.js": m55,
  "src/engine/skillhook.js": m56,
  "src/engine/storytime.js": m57,
  "src/engine/trackpreset.js": m58,
  "src/engine/util.js": m59,
  "src/engine/webhook.js": m60,
  "src/ui/aifix.js": m61,
  "src/ui/assets.js": m62,
  "src/ui/codeedit.js": m63,
  "src/ui/dom.js": m64,
  "src/ui/icons.js": m65,
  "src/ui/kit.js": m66,
  "src/ui/screens/memory/common.js": m67,
  "src/ui/screens/memory/hypamodal.js": m68,
  "src/ui/screens/memory/setup.js": m69,
  "src/ui/screens/memory/skills.js": m70,
  "src/ui/screens/memory/username.js": m71,
  "src/ui/screens/promptstab.js": m72,
  "src/ui/screentours.js": m73,
  "src/ui/tour.js": m74,
  "src/ui/undo.js": m75,
  "src/vendor/fflate.js": m76
};
