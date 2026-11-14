// 자동 생성(node tools/build-addons.mjs) — 고치지 마세요. 애드온이 쓰는 코어 모듈을 이름으로 넘겨 준다.
import * as m0 from "./data/addcharacter.js";
import * as m1 from "./data/addons.js";
import * as m2 from "./data/addonscope.js";
import * as m3 from "./data/addonsdk.js";
import * as m4 from "./data/assetfix.js";
import * as m5 from "./data/assetfolders.js";
import * as m6 from "./data/cellar.js";
import * as m7 from "./data/cellarbackup.js";
import * as m8 from "./data/cellarlatest.js";
import * as m9 from "./data/cellarplugins.js";
import * as m10 from "./data/cellarupdate.js";
import * as m11 from "./data/charorder.js";
import * as m12 from "./data/chatmenu.js";
import * as m13 from "./data/dbcache.js";
import * as m14 from "./data/fairplay.js";
import * as m15 from "./data/genstate.js";
import * as m16 from "./data/hookbus.js";
import * as m17 from "./data/hostgate.js";
import * as m18 from "./data/imgtagfix.js";
import * as m19 from "./data/interopSnippet.js";
import * as m20 from "./data/lorelog.js";
import * as m21 from "./data/lorerules.js";
import * as m22 from "./data/memorybutton.js";
import * as m23 from "./data/memorystore.js";
import * as m24 from "./data/modelhub.js";
import * as m25 from "./data/modules.js";
import * as m26 from "./data/persona.js";
import * as m27 from "./data/personabuilder.js";
import * as m28 from "./data/personaroulette.js";
import * as m29 from "./data/plugins.js";
import * as m30 from "./data/pot/copilot-client.js";
import * as m31 from "./data/pot/llm-client.js";
import * as m32 from "./data/pot/local-keys.js";
import * as m33 from "./data/pot/provider-errors.js";
import * as m34 from "./data/pot/vertex-client.js";
import * as m35 from "./data/presets.js";
import * as m36 from "./data/replacerorder.js";
import * as m37 from "./data/service.js";
import * as m38 from "./data/sizemeter.js";
import * as m39 from "./data/skillguide.js";
import * as m40 from "./data/skillstore.js";
import * as m41 from "./data/storytime.js";
import * as m42 from "./data/themes.js";
import * as m43 from "./data/turninfo.js";
import * as m44 from "./data/usernames.js";
import * as m45 from "./data/webtools.js";
import * as m46 from "./data/workshop.js";
import * as m47 from "./data/workshoppatch.js";
import * as m48 from "./dev/aibuild/duskdesign.js";
import * as m49 from "./dev/aibuild/lorerefine.js";
import * as m50 from "./dev/aibuild/preset-format.js";
import * as m51 from "./dev/aibuild/regextest.js";
import * as m52 from "./dev/aibuild/util.js";
import * as m53 from "./engine/addonguide.js";
import * as m54 from "./engine/addons.js";
import * as m55 from "./engine/affhud.js";
import * as m56 from "./engine/affprompts.js";
import * as m57 from "./engine/airesponse.js";
import * as m58 from "./engine/aistop.js";
import * as m59 from "./engine/assetfix.js";
import * as m60 from "./engine/auxlog.js";
import * as m61 from "./engine/card/defaulttags.js";
import * as m62 from "./engine/card/grade.js";
import * as m63 from "./engine/card/memories.js";
import * as m64 from "./engine/card/prompt.js";
import * as m65 from "./engine/card/tags.js";
import * as m66 from "./engine/character.js";
import * as m67 from "./engine/chatkey.js";
import * as m68 from "./engine/chattext.js";
import * as m69 from "./engine/cocoamigrate.js";
import * as m70 from "./engine/collective.js";
import * as m71 from "./engine/customprompt.js";
import * as m72 from "./engine/defaultfollow.js";
import * as m73 from "./engine/devcheck.js";
import * as m74 from "./engine/devfile.js";
import * as m75 from "./engine/discover.js";
import * as m76 from "./engine/embed.js";
import * as m77 from "./engine/export.js";
import * as m78 from "./engine/fairplay.js";
import * as m79 from "./engine/featurefind.js";
import * as m80 from "./engine/firstrun.js";
import * as m81 from "./engine/formats/bytes.js";
import * as m82 from "./engine/formats/card.js";
import * as m83 from "./engine/formats/index.js";
import * as m84 from "./engine/formats/png.js";
import * as m85 from "./engine/formats/risum.js";
import * as m86 from "./engine/formats/zip.js";
import * as m87 from "./engine/gauge.js";
import * as m88 from "./engine/greetings.js";
import * as m89 from "./engine/hash.js";
import * as m90 from "./engine/image.js";
import * as m91 from "./engine/imghint.js";
import * as m92 from "./engine/imgtagfix.js";
import * as m93 from "./engine/impact.js";
import * as m94 from "./engine/index.js";
import * as m95 from "./engine/issuehelp.js";
import * as m96 from "./engine/loredusk.js";
import * as m97 from "./engine/lorelist.js";
import * as m98 from "./engine/lorelog.js";
import * as m99 from "./engine/lorerules.js";
import * as m100 from "./engine/match.js";
import * as m101 from "./engine/memoryemo.js";
import * as m102 from "./engine/memorygrade.js";
import * as m103 from "./engine/memoryhuman.js";
import * as m104 from "./engine/memoryinject.js";
import * as m105 from "./engine/memoryinner.js";
import * as m106 from "./engine/memorykeys.js";
import * as m107 from "./engine/memorylines.js";
import * as m108 from "./engine/memoryplus.js";
import * as m109 from "./engine/memoryprompt.js";
import * as m110 from "./engine/memoryreconcile.js";
import * as m111 from "./engine/memoryswitch.js";
import * as m112 from "./engine/memorytrust.js";
import * as m113 from "./engine/memoryusage.js";
import * as m114 from "./engine/merge.js";
import * as m115 from "./engine/merge3.js";
import * as m116 from "./engine/modelcfg.js";
import * as m117 from "./engine/module.js";
import * as m118 from "./engine/patch.js";
import * as m119 from "./engine/pot/cycle-tracking.js";
import * as m120 from "./engine/pot/model-options.js";
import * as m121 from "./engine/pot/pdf-reference.js";
import * as m122 from "./engine/pot/token-usage.js";
import * as m123 from "./engine/promptimport.js";
import * as m124 from "./engine/regexview.js";
import * as m125 from "./engine/regress.js";
import * as m126 from "./engine/rpack.js";
import * as m127 from "./engine/runai.js";
import * as m128 from "./engine/safety.js";
import * as m129 from "./engine/sizemeter.js";
import * as m130 from "./engine/skillcfg.js";
import * as m131 from "./engine/skillchat.js";
import * as m132 from "./engine/skillhook.js";
import * as m133 from "./engine/skills.js";
import * as m134 from "./engine/store.js";
import * as m135 from "./engine/storytime.js";
import * as m136 from "./engine/tideplan.js";
import * as m137 from "./engine/tidestore.js";
import * as m138 from "./engine/trackpreset.js";
import * as m139 from "./engine/turninfo.js";
import * as m140 from "./engine/upload.js";
import * as m141 from "./engine/util.js";
import * as m142 from "./engine/vars.js";
import * as m143 from "./engine/webhook.js";
import * as m144 from "./engine/websearch.js";
import * as m145 from "./engine/workshop.js";
import * as m146 from "./engine/zipwrite.js";
import * as m147 from "./tide/characterMerge/characters.ts";
import * as m148 from "./tide/characterMerge/collide.ts";
import * as m149 from "./tide/characterMerge/composite.ts";
import * as m150 from "./tide/characterMerge/floatingUI.ts";
import * as m151 from "./tide/characterMerge/imageSystem.ts";
import * as m152 from "./tide/characterMerge/importPlan.ts";
import * as m153 from "./tide/characterMerge/license.ts";
import * as m154 from "./tide/characterMerge/luaBundle.ts";
import * as m155 from "./tide/characterMerge/mediaLabels.ts";
import * as m156 from "./tide/characterMerge/moduleSource.ts";
import * as m157 from "./tide/characterMerge/names.ts";
import * as m158 from "./tide/characterMerge/partialUpdate.ts";
import * as m159 from "./tide/characterMerge/parts.ts";
import * as m160 from "./tide/characterMerge/plan.ts";
import * as m161 from "./tide/characterMerge/provenance.ts";
import * as m162 from "./tide/characterMerge/rewrite.ts";
import * as m163 from "./tide/characterMerge/roles.ts";
import * as m164 from "./tide/characterMerge/selfCheck.ts";
import * as m165 from "./tide/characterMerge/sourceImages.ts";
import * as m166 from "./tide/characterMerge/wordDiff.ts";
import * as m167 from "./tide/characterUpdate.ts";
import * as m168 from "./tide/characterUpdateGreetings.ts";
import * as m169 from "./tide/characterUpdateMerge.ts";
import * as m170 from "./tide/characterUpdateOnboarding.ts";
import * as m171 from "./tide/characterUpdateTargets.ts";
import * as m172 from "./tide/plugin/detach.ts";
import * as m173 from "./tide/plugin/merge.ts";
import * as m174 from "./ui/aifix.js";
import * as m175 from "./ui/aistopbtn.js";
import * as m176 from "./ui/app.js";
import * as m177 from "./ui/assets.js";
import * as m178 from "./ui/cbs.js";
import * as m179 from "./ui/codeedit.js";
import * as m180 from "./ui/color.js";
import * as m181 from "./ui/dicedetail.js";
import * as m182 from "./ui/discovercard.js";
import * as m183 from "./ui/dom.js";
import * as m184 from "./ui/entrypicker.js";
import * as m185 from "./ui/ext.js";
import * as m186 from "./ui/glasscss.js";
import * as m187 from "./ui/glassthemes.js";
import * as m188 from "./ui/homegrid.js";
import * as m189 from "./ui/hostupdate.js";
import * as m190 from "./ui/icons.js";
import * as m191 from "./ui/kit.js";
import * as m192 from "./ui/legacy.js";
import * as m193 from "./ui/lookparts.js";
import * as m194 from "./ui/mascot-data.js";
import * as m195 from "./ui/mascot.js";
import * as m196 from "./ui/multiselect.js";
import * as m197 from "./ui/navcss.js";
import * as m198 from "./ui/onboarding.js";
import * as m199 from "./ui/prefs.js";
import * as m200 from "./ui/probpick.js";
import * as m201 from "./ui/quickset.js";
import * as m202 from "./ui/screens/about.js";
import * as m203 from "./ui/screens/addonmaker.js";
import * as m204 from "./ui/screens/addonsui.js";
import * as m205 from "./ui/screens/assetdupes.js";
import * as m206 from "./ui/screens/assetfix.js";
import * as m207 from "./ui/screens/assetmgr.js";
import * as m208 from "./ui/screens/characters.js";
import * as m209 from "./ui/screens/chareditor.js";
import * as m210 from "./ui/screens/cocoa.js";
import * as m211 from "./ui/screens/dev.js";
import * as m212 from "./ui/screens/devaff.js";
import * as m213 from "./ui/screens/devtools.js";
import * as m214 from "./ui/screens/editor.js";
import * as m215 from "./ui/screens/featurefind.js";
import * as m216 from "./ui/screens/greetings.js";
import * as m217 from "./ui/screens/history.js";
import * as m218 from "./ui/screens/home.js";
import * as m219 from "./ui/screens/homegridcss.js";
import * as m220 from "./ui/screens/homegridui.js";
import * as m221 from "./ui/screens/homestate.js";
import * as m222 from "./ui/screens/infocard.js";
import * as m223 from "./ui/screens/loredusk.js";
import * as m224 from "./ui/screens/lorelog.js";
import * as m225 from "./ui/screens/memhubcss.js";
import * as m226 from "./ui/screens/memory/chatload.js";
import * as m227 from "./ui/screens/memory/common.js";
import * as m228 from "./ui/screens/memory/hypamodal.js";
import * as m229 from "./ui/screens/memory/setup.js";
import * as m230 from "./ui/screens/memory/skillchat.js";
import * as m231 from "./ui/screens/memory/skills.js";
import * as m232 from "./ui/screens/memory/username.js";
import * as m233 from "./ui/screens/modlinks.js";
import * as m234 from "./ui/screens/modules.js";
import * as m235 from "./ui/screens/newbot.js";
import * as m236 from "./ui/screens/patchui.js";
import * as m237 from "./ui/screens/placeholder.js";
import * as m238 from "./ui/screens/presets.js";
import * as m239 from "./ui/screens/promptstab.js";
import * as m240 from "./ui/screens/provider/css.js";
import * as m241 from "./ui/screens/relmap/css.js";
import * as m242 from "./ui/screens/roulettepop.js";
import * as m243 from "./ui/screens/sectionhome.js";
import * as m244 from "./ui/screens/settings.js";
import * as m245 from "./ui/screens/settingstab.js";
import * as m246 from "./ui/screens/sizemeter.js";
import * as m247 from "./ui/screens/sizemeter/css.js";
import * as m248 from "./ui/screens/tools.js";
import * as m249 from "./ui/screens/updsettings.js";
import * as m250 from "./ui/screens/workshoplink.js";
import * as m251 from "./ui/screentours.js";
import * as m252 from "./ui/scrollguard.js";
import * as m253 from "./ui/sortable.js";
import * as m254 from "./ui/staleguard.js";
import * as m255 from "./ui/styles.js";
import * as m256 from "./ui/tabs.js";
import * as m257 from "./ui/theme.js";
import * as m258 from "./ui/themekit.js";
import * as m259 from "./ui/toast.js";
import * as m260 from "./ui/tooltip.js";
import * as m261 from "./ui/tour.js";
import * as m262 from "./ui/undo.js";
import * as m263 from "./ui/watch.js";
import * as m264 from "./ui/whatsnew.js";
import * as m265 from "./vendor/fflate-full.js";
import * as m266 from "./vendor/fflate.js";
import * as m267 from "./vendor/msgpackr.js";
import * as m268 from "./vendor/noble.js";
import * as m269 from "./vendor/re2js.js";
export const LIB = {
  "src/data/addcharacter.js": m0,
  "src/data/addons.js": m1,
  "src/data/addonscope.js": m2,
  "src/data/addonsdk.js": m3,
  "src/data/assetfix.js": m4,
  "src/data/assetfolders.js": m5,
  "src/data/cellar.js": m6,
  "src/data/cellarbackup.js": m7,
  "src/data/cellarlatest.js": m8,
  "src/data/cellarplugins.js": m9,
  "src/data/cellarupdate.js": m10,
  "src/data/charorder.js": m11,
  "src/data/chatmenu.js": m12,
  "src/data/dbcache.js": m13,
  "src/data/fairplay.js": m14,
  "src/data/genstate.js": m15,
  "src/data/hookbus.js": m16,
  "src/data/hostgate.js": m17,
  "src/data/imgtagfix.js": m18,
  "src/data/interopSnippet.js": m19,
  "src/data/lorelog.js": m20,
  "src/data/lorerules.js": m21,
  "src/data/memorybutton.js": m22,
  "src/data/memorystore.js": m23,
  "src/data/modelhub.js": m24,
  "src/data/modules.js": m25,
  "src/data/persona.js": m26,
  "src/data/personabuilder.js": m27,
  "src/data/personaroulette.js": m28,
  "src/data/plugins.js": m29,
  "src/data/pot/copilot-client.js": m30,
  "src/data/pot/llm-client.js": m31,
  "src/data/pot/local-keys.js": m32,
  "src/data/pot/provider-errors.js": m33,
  "src/data/pot/vertex-client.js": m34,
  "src/data/presets.js": m35,
  "src/data/replacerorder.js": m36,
  "src/data/service.js": m37,
  "src/data/sizemeter.js": m38,
  "src/data/skillguide.js": m39,
  "src/data/skillstore.js": m40,
  "src/data/storytime.js": m41,
  "src/data/themes.js": m42,
  "src/data/turninfo.js": m43,
  "src/data/usernames.js": m44,
  "src/data/webtools.js": m45,
  "src/data/workshop.js": m46,
  "src/data/workshoppatch.js": m47,
  "src/dev/aibuild/duskdesign.js": m48,
  "src/dev/aibuild/lorerefine.js": m49,
  "src/dev/aibuild/preset-format.js": m50,
  "src/dev/aibuild/regextest.js": m51,
  "src/dev/aibuild/util.js": m52,
  "src/engine/addonguide.js": m53,
  "src/engine/addons.js": m54,
  "src/engine/affhud.js": m55,
  "src/engine/affprompts.js": m56,
  "src/engine/airesponse.js": m57,
  "src/engine/aistop.js": m58,
  "src/engine/assetfix.js": m59,
  "src/engine/auxlog.js": m60,
  "src/engine/card/defaulttags.js": m61,
  "src/engine/card/grade.js": m62,
  "src/engine/card/memories.js": m63,
  "src/engine/card/prompt.js": m64,
  "src/engine/card/tags.js": m65,
  "src/engine/character.js": m66,
  "src/engine/chatkey.js": m67,
  "src/engine/chattext.js": m68,
  "src/engine/cocoamigrate.js": m69,
  "src/engine/collective.js": m70,
  "src/engine/customprompt.js": m71,
  "src/engine/defaultfollow.js": m72,
  "src/engine/devcheck.js": m73,
  "src/engine/devfile.js": m74,
  "src/engine/discover.js": m75,
  "src/engine/embed.js": m76,
  "src/engine/export.js": m77,
  "src/engine/fairplay.js": m78,
  "src/engine/featurefind.js": m79,
  "src/engine/firstrun.js": m80,
  "src/engine/formats/bytes.js": m81,
  "src/engine/formats/card.js": m82,
  "src/engine/formats/index.js": m83,
  "src/engine/formats/png.js": m84,
  "src/engine/formats/risum.js": m85,
  "src/engine/formats/zip.js": m86,
  "src/engine/gauge.js": m87,
  "src/engine/greetings.js": m88,
  "src/engine/hash.js": m89,
  "src/engine/image.js": m90,
  "src/engine/imghint.js": m91,
  "src/engine/imgtagfix.js": m92,
  "src/engine/impact.js": m93,
  "src/engine/index.js": m94,
  "src/engine/issuehelp.js": m95,
  "src/engine/loredusk.js": m96,
  "src/engine/lorelist.js": m97,
  "src/engine/lorelog.js": m98,
  "src/engine/lorerules.js": m99,
  "src/engine/match.js": m100,
  "src/engine/memoryemo.js": m101,
  "src/engine/memorygrade.js": m102,
  "src/engine/memoryhuman.js": m103,
  "src/engine/memoryinject.js": m104,
  "src/engine/memoryinner.js": m105,
  "src/engine/memorykeys.js": m106,
  "src/engine/memorylines.js": m107,
  "src/engine/memoryplus.js": m108,
  "src/engine/memoryprompt.js": m109,
  "src/engine/memoryreconcile.js": m110,
  "src/engine/memoryswitch.js": m111,
  "src/engine/memorytrust.js": m112,
  "src/engine/memoryusage.js": m113,
  "src/engine/merge.js": m114,
  "src/engine/merge3.js": m115,
  "src/engine/modelcfg.js": m116,
  "src/engine/module.js": m117,
  "src/engine/patch.js": m118,
  "src/engine/pot/cycle-tracking.js": m119,
  "src/engine/pot/model-options.js": m120,
  "src/engine/pot/pdf-reference.js": m121,
  "src/engine/pot/token-usage.js": m122,
  "src/engine/promptimport.js": m123,
  "src/engine/regexview.js": m124,
  "src/engine/regress.js": m125,
  "src/engine/rpack.js": m126,
  "src/engine/runai.js": m127,
  "src/engine/safety.js": m128,
  "src/engine/sizemeter.js": m129,
  "src/engine/skillcfg.js": m130,
  "src/engine/skillchat.js": m131,
  "src/engine/skillhook.js": m132,
  "src/engine/skills.js": m133,
  "src/engine/store.js": m134,
  "src/engine/storytime.js": m135,
  "src/engine/tideplan.js": m136,
  "src/engine/tidestore.js": m137,
  "src/engine/trackpreset.js": m138,
  "src/engine/turninfo.js": m139,
  "src/engine/upload.js": m140,
  "src/engine/util.js": m141,
  "src/engine/vars.js": m142,
  "src/engine/webhook.js": m143,
  "src/engine/websearch.js": m144,
  "src/engine/workshop.js": m145,
  "src/engine/zipwrite.js": m146,
  "src/tide/characterMerge/characters.ts": m147,
  "src/tide/characterMerge/collide.ts": m148,
  "src/tide/characterMerge/composite.ts": m149,
  "src/tide/characterMerge/floatingUI.ts": m150,
  "src/tide/characterMerge/imageSystem.ts": m151,
  "src/tide/characterMerge/importPlan.ts": m152,
  "src/tide/characterMerge/license.ts": m153,
  "src/tide/characterMerge/luaBundle.ts": m154,
  "src/tide/characterMerge/mediaLabels.ts": m155,
  "src/tide/characterMerge/moduleSource.ts": m156,
  "src/tide/characterMerge/names.ts": m157,
  "src/tide/characterMerge/partialUpdate.ts": m158,
  "src/tide/characterMerge/parts.ts": m159,
  "src/tide/characterMerge/plan.ts": m160,
  "src/tide/characterMerge/provenance.ts": m161,
  "src/tide/characterMerge/rewrite.ts": m162,
  "src/tide/characterMerge/roles.ts": m163,
  "src/tide/characterMerge/selfCheck.ts": m164,
  "src/tide/characterMerge/sourceImages.ts": m165,
  "src/tide/characterMerge/wordDiff.ts": m166,
  "src/tide/characterUpdate.ts": m167,
  "src/tide/characterUpdateGreetings.ts": m168,
  "src/tide/characterUpdateMerge.ts": m169,
  "src/tide/characterUpdateOnboarding.ts": m170,
  "src/tide/characterUpdateTargets.ts": m171,
  "src/tide/plugin/detach.ts": m172,
  "src/tide/plugin/merge.ts": m173,
  "src/ui/aifix.js": m174,
  "src/ui/aistopbtn.js": m175,
  "src/ui/app.js": m176,
  "src/ui/assets.js": m177,
  "src/ui/cbs.js": m178,
  "src/ui/codeedit.js": m179,
  "src/ui/color.js": m180,
  "src/ui/dicedetail.js": m181,
  "src/ui/discovercard.js": m182,
  "src/ui/dom.js": m183,
  "src/ui/entrypicker.js": m184,
  "src/ui/ext.js": m185,
  "src/ui/glasscss.js": m186,
  "src/ui/glassthemes.js": m187,
  "src/ui/homegrid.js": m188,
  "src/ui/hostupdate.js": m189,
  "src/ui/icons.js": m190,
  "src/ui/kit.js": m191,
  "src/ui/legacy.js": m192,
  "src/ui/lookparts.js": m193,
  "src/ui/mascot-data.js": m194,
  "src/ui/mascot.js": m195,
  "src/ui/multiselect.js": m196,
  "src/ui/navcss.js": m197,
  "src/ui/onboarding.js": m198,
  "src/ui/prefs.js": m199,
  "src/ui/probpick.js": m200,
  "src/ui/quickset.js": m201,
  "src/ui/screens/about.js": m202,
  "src/ui/screens/addonmaker.js": m203,
  "src/ui/screens/addonsui.js": m204,
  "src/ui/screens/assetdupes.js": m205,
  "src/ui/screens/assetfix.js": m206,
  "src/ui/screens/assetmgr.js": m207,
  "src/ui/screens/characters.js": m208,
  "src/ui/screens/chareditor.js": m209,
  "src/ui/screens/cocoa.js": m210,
  "src/ui/screens/dev.js": m211,
  "src/ui/screens/devaff.js": m212,
  "src/ui/screens/devtools.js": m213,
  "src/ui/screens/editor.js": m214,
  "src/ui/screens/featurefind.js": m215,
  "src/ui/screens/greetings.js": m216,
  "src/ui/screens/history.js": m217,
  "src/ui/screens/home.js": m218,
  "src/ui/screens/homegridcss.js": m219,
  "src/ui/screens/homegridui.js": m220,
  "src/ui/screens/homestate.js": m221,
  "src/ui/screens/infocard.js": m222,
  "src/ui/screens/loredusk.js": m223,
  "src/ui/screens/lorelog.js": m224,
  "src/ui/screens/memhubcss.js": m225,
  "src/ui/screens/memory/chatload.js": m226,
  "src/ui/screens/memory/common.js": m227,
  "src/ui/screens/memory/hypamodal.js": m228,
  "src/ui/screens/memory/setup.js": m229,
  "src/ui/screens/memory/skillchat.js": m230,
  "src/ui/screens/memory/skills.js": m231,
  "src/ui/screens/memory/username.js": m232,
  "src/ui/screens/modlinks.js": m233,
  "src/ui/screens/modules.js": m234,
  "src/ui/screens/newbot.js": m235,
  "src/ui/screens/patchui.js": m236,
  "src/ui/screens/placeholder.js": m237,
  "src/ui/screens/presets.js": m238,
  "src/ui/screens/promptstab.js": m239,
  "src/ui/screens/provider/css.js": m240,
  "src/ui/screens/relmap/css.js": m241,
  "src/ui/screens/roulettepop.js": m242,
  "src/ui/screens/sectionhome.js": m243,
  "src/ui/screens/settings.js": m244,
  "src/ui/screens/settingstab.js": m245,
  "src/ui/screens/sizemeter.js": m246,
  "src/ui/screens/sizemeter/css.js": m247,
  "src/ui/screens/tools.js": m248,
  "src/ui/screens/updsettings.js": m249,
  "src/ui/screens/workshoplink.js": m250,
  "src/ui/screentours.js": m251,
  "src/ui/scrollguard.js": m252,
  "src/ui/sortable.js": m253,
  "src/ui/staleguard.js": m254,
  "src/ui/styles.js": m255,
  "src/ui/tabs.js": m256,
  "src/ui/theme.js": m257,
  "src/ui/themekit.js": m258,
  "src/ui/toast.js": m259,
  "src/ui/tooltip.js": m260,
  "src/ui/tour.js": m261,
  "src/ui/undo.js": m262,
  "src/ui/watch.js": m263,
  "src/ui/whatsnew.js": m264,
  "src/vendor/fflate-full.js": m265,
  "src/vendor/fflate.js": m266,
  "src/vendor/msgpackr.js": m267,
  "src/vendor/noble.js": m268,
  "src/vendor/re2js.js": m269
};
