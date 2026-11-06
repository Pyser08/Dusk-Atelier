// 자동 생성(node tools/build-addons.mjs) — 고치지 마세요. 애드온이 쓰는 코어 모듈을 이름으로 넘겨 준다.
import * as m0 from "./data/addcharacter.js";
import * as m1 from "./data/addons.js";
import * as m2 from "./data/assetfix.js";
import * as m3 from "./data/assetfolders.js";
import * as m4 from "./data/cellar.js";
import * as m5 from "./data/cellarbackup.js";
import * as m6 from "./data/cellarlatest.js";
import * as m7 from "./data/cellarplugins.js";
import * as m8 from "./data/cellarupdate.js";
import * as m9 from "./data/charorder.js";
import * as m10 from "./data/chatmenu.js";
import * as m11 from "./data/dbcache.js";
import * as m12 from "./data/fairplay.js";
import * as m13 from "./data/genstate.js";
import * as m14 from "./data/hookbus.js";
import * as m15 from "./data/imgtagfix.js";
import * as m16 from "./data/interopSnippet.js";
import * as m17 from "./data/lorelog.js";
import * as m18 from "./data/lorerules.js";
import * as m19 from "./data/memorybutton.js";
import * as m20 from "./data/memorystore.js";
import * as m21 from "./data/memoryswitches.js";
import * as m22 from "./data/modelhub.js";
import * as m23 from "./data/modules.js";
import * as m24 from "./data/persona.js";
import * as m25 from "./data/personabuilder.js";
import * as m26 from "./data/personaroulette.js";
import * as m27 from "./data/plugins.js";
import * as m28 from "./data/pot/copilot-client.js";
import * as m29 from "./data/pot/llm-client.js";
import * as m30 from "./data/pot/local-keys.js";
import * as m31 from "./data/pot/provider-errors.js";
import * as m32 from "./data/pot/vertex-client.js";
import * as m33 from "./data/presets.js";
import * as m34 from "./data/provider/gemcache.js";
import * as m35 from "./data/provider/index.js";
import * as m36 from "./data/provider/keyvault.js";
import * as m37 from "./data/provider/models.js";
import * as m38 from "./data/provider/register.js";
import * as m39 from "./data/provider/risutools.js";
import * as m40 from "./data/provider/runner.js";
import * as m41 from "./data/provider/store.js";
import * as m42 from "./data/provider/toolexec.js";
import * as m43 from "./data/provider/transport.js";
import * as m44 from "./data/service.js";
import * as m45 from "./data/sizemeter.js";
import * as m46 from "./data/skillguide.js";
import * as m47 from "./data/skillstore.js";
import * as m48 from "./data/storytime.js";
import * as m49 from "./data/themes.js";
import * as m50 from "./data/turninfo.js";
import * as m51 from "./data/usernames.js";
import * as m52 from "./data/webtools.js";
import * as m53 from "./data/workshop.js";
import * as m54 from "./data/workshoppatch.js";
import * as m55 from "./dev/aibuild/duskdesign.js";
import * as m56 from "./dev/aibuild/lorerefine.js";
import * as m57 from "./dev/aibuild/preset-format.js";
import * as m58 from "./dev/aibuild/regextest.js";
import * as m59 from "./dev/aibuild/util.js";
import * as m60 from "./engine/addons.js";
import * as m61 from "./engine/affhud.js";
import * as m62 from "./engine/affprompts.js";
import * as m63 from "./engine/airesponse.js";
import * as m64 from "./engine/assetfix.js";
import * as m65 from "./engine/card/defaulttags.js";
import * as m66 from "./engine/card/grade.js";
import * as m67 from "./engine/card/memories.js";
import * as m68 from "./engine/card/prompt.js";
import * as m69 from "./engine/card/tags.js";
import * as m70 from "./engine/character.js";
import * as m71 from "./engine/chatkey.js";
import * as m72 from "./engine/chattext.js";
import * as m73 from "./engine/cocoamigrate.js";
import * as m74 from "./engine/collective.js";
import * as m75 from "./engine/customprompt.js";
import * as m76 from "./engine/defaultfollow.js";
import * as m77 from "./engine/devcheck.js";
import * as m78 from "./engine/devfile.js";
import * as m79 from "./engine/discover.js";
import * as m80 from "./engine/embed.js";
import * as m81 from "./engine/export.js";
import * as m82 from "./engine/fairplay.js";
import * as m83 from "./engine/firstrun.js";
import * as m84 from "./engine/formats/bytes.js";
import * as m85 from "./engine/formats/card.js";
import * as m86 from "./engine/formats/index.js";
import * as m87 from "./engine/formats/png.js";
import * as m88 from "./engine/formats/risum.js";
import * as m89 from "./engine/formats/zip.js";
import * as m90 from "./engine/gauge.js";
import * as m91 from "./engine/greetings.js";
import * as m92 from "./engine/hash.js";
import * as m93 from "./engine/image.js";
import * as m94 from "./engine/imghint.js";
import * as m95 from "./engine/imgtagfix.js";
import * as m96 from "./engine/impact.js";
import * as m97 from "./engine/index.js";
import * as m98 from "./engine/issuehelp.js";
import * as m99 from "./engine/loredusk.js";
import * as m100 from "./engine/lorelist.js";
import * as m101 from "./engine/lorelog.js";
import * as m102 from "./engine/lorerules.js";
import * as m103 from "./engine/match.js";
import * as m104 from "./engine/memoryemo.js";
import * as m105 from "./engine/memorygrade.js";
import * as m106 from "./engine/memoryhuman.js";
import * as m107 from "./engine/memoryinject.js";
import * as m108 from "./engine/memoryinner.js";
import * as m109 from "./engine/memorykeys.js";
import * as m110 from "./engine/memorylines.js";
import * as m111 from "./engine/memoryplus.js";
import * as m112 from "./engine/memoryprompt.js";
import * as m113 from "./engine/memoryreconcile.js";
import * as m114 from "./engine/memoryswitch.js";
import * as m115 from "./engine/memorytrust.js";
import * as m116 from "./engine/memoryusage.js";
import * as m117 from "./engine/merge.js";
import * as m118 from "./engine/merge3.js";
import * as m119 from "./engine/modelcfg.js";
import * as m120 from "./engine/module.js";
import * as m121 from "./engine/patch.js";
import * as m122 from "./engine/pot/cycle-tracking.js";
import * as m123 from "./engine/pot/model-options.js";
import * as m124 from "./engine/pot/pdf-reference.js";
import * as m125 from "./engine/pot/token-usage.js";
import * as m126 from "./engine/promptimport.js";
import * as m127 from "./engine/provider/build.js";
import * as m128 from "./engine/provider/catalog.js";
import * as m129 from "./engine/provider/chain.js";
import * as m130 from "./engine/provider/cost.js";
import * as m131 from "./engine/provider/keypool.js";
import * as m132 from "./engine/provider/messages.js";
import * as m133 from "./engine/provider/presets.js";
import * as m134 from "./engine/provider/profile.js";
import * as m135 from "./engine/provider/repeat.js";
import * as m136 from "./engine/provider/sse.js";
import * as m137 from "./engine/provider/tools.js";
import * as m138 from "./engine/provider/transforms.js";
import * as m139 from "./engine/provider/translate.js";
import * as m140 from "./engine/regexview.js";
import * as m141 from "./engine/regress.js";
import * as m142 from "./engine/rpack.js";
import * as m143 from "./engine/runai.js";
import * as m144 from "./engine/safety.js";
import * as m145 from "./engine/sizemeter.js";
import * as m146 from "./engine/skillcfg.js";
import * as m147 from "./engine/skillchat.js";
import * as m148 from "./engine/skillhook.js";
import * as m149 from "./engine/skills.js";
import * as m150 from "./engine/store.js";
import * as m151 from "./engine/storytime.js";
import * as m152 from "./engine/tideplan.js";
import * as m153 from "./engine/tidestore.js";
import * as m154 from "./engine/trackpreset.js";
import * as m155 from "./engine/turninfo.js";
import * as m156 from "./engine/upload.js";
import * as m157 from "./engine/util.js";
import * as m158 from "./engine/vars.js";
import * as m159 from "./engine/webhook.js";
import * as m160 from "./engine/websearch.js";
import * as m161 from "./engine/workshop.js";
import * as m162 from "./engine/zipwrite.js";
import * as m163 from "./tide/characterMerge/characters.ts";
import * as m164 from "./tide/characterMerge/collide.ts";
import * as m165 from "./tide/characterMerge/composite.ts";
import * as m166 from "./tide/characterMerge/floatingUI.ts";
import * as m167 from "./tide/characterMerge/imageSystem.ts";
import * as m168 from "./tide/characterMerge/importPlan.ts";
import * as m169 from "./tide/characterMerge/license.ts";
import * as m170 from "./tide/characterMerge/luaBundle.ts";
import * as m171 from "./tide/characterMerge/mediaLabels.ts";
import * as m172 from "./tide/characterMerge/moduleSource.ts";
import * as m173 from "./tide/characterMerge/names.ts";
import * as m174 from "./tide/characterMerge/partialUpdate.ts";
import * as m175 from "./tide/characterMerge/parts.ts";
import * as m176 from "./tide/characterMerge/plan.ts";
import * as m177 from "./tide/characterMerge/provenance.ts";
import * as m178 from "./tide/characterMerge/rewrite.ts";
import * as m179 from "./tide/characterMerge/roles.ts";
import * as m180 from "./tide/characterMerge/selfCheck.ts";
import * as m181 from "./tide/characterMerge/sourceImages.ts";
import * as m182 from "./tide/characterMerge/wordDiff.ts";
import * as m183 from "./tide/characterUpdate.ts";
import * as m184 from "./tide/characterUpdateGreetings.ts";
import * as m185 from "./tide/characterUpdateMerge.ts";
import * as m186 from "./tide/characterUpdateOnboarding.ts";
import * as m187 from "./tide/characterUpdateTargets.ts";
import * as m188 from "./tide/plugin/detach.ts";
import * as m189 from "./tide/plugin/merge.ts";
import * as m190 from "./ui/aifix.js";
import * as m191 from "./ui/app.js";
import * as m192 from "./ui/assets.js";
import * as m193 from "./ui/cbs.js";
import * as m194 from "./ui/codeedit.js";
import * as m195 from "./ui/color.js";
import * as m196 from "./ui/dicedetail.js";
import * as m197 from "./ui/discovercard.js";
import * as m198 from "./ui/dom.js";
import * as m199 from "./ui/entrypicker.js";
import * as m200 from "./ui/ext.js";
import * as m201 from "./ui/hostupdate.js";
import * as m202 from "./ui/icons.js";
import * as m203 from "./ui/kit.js";
import * as m204 from "./ui/legacy.js";
import * as m205 from "./ui/lookparts.js";
import * as m206 from "./ui/mascot-data.js";
import * as m207 from "./ui/mascot.js";
import * as m208 from "./ui/multiselect.js";
import * as m209 from "./ui/onboarding.js";
import * as m210 from "./ui/prefs.js";
import * as m211 from "./ui/probpick.js";
import * as m212 from "./ui/quickset.js";
import * as m213 from "./ui/screens/about.js";
import * as m214 from "./ui/screens/addonsui.js";
import * as m215 from "./ui/screens/assetdupes.js";
import * as m216 from "./ui/screens/assetfix.js";
import * as m217 from "./ui/screens/assetmgr.js";
import * as m218 from "./ui/screens/characters.js";
import * as m219 from "./ui/screens/chareditor.js";
import * as m220 from "./ui/screens/cocoa.js";
import * as m221 from "./ui/screens/dev.js";
import * as m222 from "./ui/screens/devaff.js";
import * as m223 from "./ui/screens/devtools.js";
import * as m224 from "./ui/screens/editor.js";
import * as m225 from "./ui/screens/greetings.js";
import * as m226 from "./ui/screens/history.js";
import * as m227 from "./ui/screens/home.js";
import * as m228 from "./ui/screens/homestate.js";
import * as m229 from "./ui/screens/infocard.js";
import * as m230 from "./ui/screens/loredusk.js";
import * as m231 from "./ui/screens/lorelog.js";
import * as m232 from "./ui/screens/memory/chatload.js";
import * as m233 from "./ui/screens/memory/common.js";
import * as m234 from "./ui/screens/memory/hypamodal.js";
import * as m235 from "./ui/screens/memory/setup.js";
import * as m236 from "./ui/screens/memory/skillchat.js";
import * as m237 from "./ui/screens/memory/skills.js";
import * as m238 from "./ui/screens/memory/username.js";
import * as m239 from "./ui/screens/modlinks.js";
import * as m240 from "./ui/screens/modules.js";
import * as m241 from "./ui/screens/newbot.js";
import * as m242 from "./ui/screens/patchui.js";
import * as m243 from "./ui/screens/placeholder.js";
import * as m244 from "./ui/screens/presets.js";
import * as m245 from "./ui/screens/promptstab.js";
import * as m246 from "./ui/screens/provider.js";
import * as m247 from "./ui/screens/provider/css.js";
import * as m248 from "./ui/screens/provider/more.js";
import * as m249 from "./ui/screens/provider/ui.js";
import * as m250 from "./ui/screens/relmap/css.js";
import * as m251 from "./ui/screens/roulettepop.js";
import * as m252 from "./ui/screens/sectionhome.js";
import * as m253 from "./ui/screens/settings.js";
import * as m254 from "./ui/screens/settingstab.js";
import * as m255 from "./ui/screens/sizemeter.js";
import * as m256 from "./ui/screens/sizemeter/css.js";
import * as m257 from "./ui/screens/tools.js";
import * as m258 from "./ui/screens/updsettings.js";
import * as m259 from "./ui/screens/workshoplink.js";
import * as m260 from "./ui/screentours.js";
import * as m261 from "./ui/scrollguard.js";
import * as m262 from "./ui/sortable.js";
import * as m263 from "./ui/staleguard.js";
import * as m264 from "./ui/styles.js";
import * as m265 from "./ui/tabs.js";
import * as m266 from "./ui/theme.js";
import * as m267 from "./ui/themekit.js";
import * as m268 from "./ui/toast.js";
import * as m269 from "./ui/tooltip.js";
import * as m270 from "./ui/tour.js";
import * as m271 from "./ui/undo.js";
import * as m272 from "./ui/watch.js";
import * as m273 from "./ui/whatsnew.js";
import * as m274 from "./vendor/fflate-full.js";
import * as m275 from "./vendor/fflate.js";
import * as m276 from "./vendor/msgpackr.js";
import * as m277 from "./vendor/noble.js";
import * as m278 from "./vendor/re2js.js";
export const LIB = {
  "src/data/addcharacter.js": m0,
  "src/data/addons.js": m1,
  "src/data/assetfix.js": m2,
  "src/data/assetfolders.js": m3,
  "src/data/cellar.js": m4,
  "src/data/cellarbackup.js": m5,
  "src/data/cellarlatest.js": m6,
  "src/data/cellarplugins.js": m7,
  "src/data/cellarupdate.js": m8,
  "src/data/charorder.js": m9,
  "src/data/chatmenu.js": m10,
  "src/data/dbcache.js": m11,
  "src/data/fairplay.js": m12,
  "src/data/genstate.js": m13,
  "src/data/hookbus.js": m14,
  "src/data/imgtagfix.js": m15,
  "src/data/interopSnippet.js": m16,
  "src/data/lorelog.js": m17,
  "src/data/lorerules.js": m18,
  "src/data/memorybutton.js": m19,
  "src/data/memorystore.js": m20,
  "src/data/memoryswitches.js": m21,
  "src/data/modelhub.js": m22,
  "src/data/modules.js": m23,
  "src/data/persona.js": m24,
  "src/data/personabuilder.js": m25,
  "src/data/personaroulette.js": m26,
  "src/data/plugins.js": m27,
  "src/data/pot/copilot-client.js": m28,
  "src/data/pot/llm-client.js": m29,
  "src/data/pot/local-keys.js": m30,
  "src/data/pot/provider-errors.js": m31,
  "src/data/pot/vertex-client.js": m32,
  "src/data/presets.js": m33,
  "src/data/provider/gemcache.js": m34,
  "src/data/provider/index.js": m35,
  "src/data/provider/keyvault.js": m36,
  "src/data/provider/models.js": m37,
  "src/data/provider/register.js": m38,
  "src/data/provider/risutools.js": m39,
  "src/data/provider/runner.js": m40,
  "src/data/provider/store.js": m41,
  "src/data/provider/toolexec.js": m42,
  "src/data/provider/transport.js": m43,
  "src/data/service.js": m44,
  "src/data/sizemeter.js": m45,
  "src/data/skillguide.js": m46,
  "src/data/skillstore.js": m47,
  "src/data/storytime.js": m48,
  "src/data/themes.js": m49,
  "src/data/turninfo.js": m50,
  "src/data/usernames.js": m51,
  "src/data/webtools.js": m52,
  "src/data/workshop.js": m53,
  "src/data/workshoppatch.js": m54,
  "src/dev/aibuild/duskdesign.js": m55,
  "src/dev/aibuild/lorerefine.js": m56,
  "src/dev/aibuild/preset-format.js": m57,
  "src/dev/aibuild/regextest.js": m58,
  "src/dev/aibuild/util.js": m59,
  "src/engine/addons.js": m60,
  "src/engine/affhud.js": m61,
  "src/engine/affprompts.js": m62,
  "src/engine/airesponse.js": m63,
  "src/engine/assetfix.js": m64,
  "src/engine/card/defaulttags.js": m65,
  "src/engine/card/grade.js": m66,
  "src/engine/card/memories.js": m67,
  "src/engine/card/prompt.js": m68,
  "src/engine/card/tags.js": m69,
  "src/engine/character.js": m70,
  "src/engine/chatkey.js": m71,
  "src/engine/chattext.js": m72,
  "src/engine/cocoamigrate.js": m73,
  "src/engine/collective.js": m74,
  "src/engine/customprompt.js": m75,
  "src/engine/defaultfollow.js": m76,
  "src/engine/devcheck.js": m77,
  "src/engine/devfile.js": m78,
  "src/engine/discover.js": m79,
  "src/engine/embed.js": m80,
  "src/engine/export.js": m81,
  "src/engine/fairplay.js": m82,
  "src/engine/firstrun.js": m83,
  "src/engine/formats/bytes.js": m84,
  "src/engine/formats/card.js": m85,
  "src/engine/formats/index.js": m86,
  "src/engine/formats/png.js": m87,
  "src/engine/formats/risum.js": m88,
  "src/engine/formats/zip.js": m89,
  "src/engine/gauge.js": m90,
  "src/engine/greetings.js": m91,
  "src/engine/hash.js": m92,
  "src/engine/image.js": m93,
  "src/engine/imghint.js": m94,
  "src/engine/imgtagfix.js": m95,
  "src/engine/impact.js": m96,
  "src/engine/index.js": m97,
  "src/engine/issuehelp.js": m98,
  "src/engine/loredusk.js": m99,
  "src/engine/lorelist.js": m100,
  "src/engine/lorelog.js": m101,
  "src/engine/lorerules.js": m102,
  "src/engine/match.js": m103,
  "src/engine/memoryemo.js": m104,
  "src/engine/memorygrade.js": m105,
  "src/engine/memoryhuman.js": m106,
  "src/engine/memoryinject.js": m107,
  "src/engine/memoryinner.js": m108,
  "src/engine/memorykeys.js": m109,
  "src/engine/memorylines.js": m110,
  "src/engine/memoryplus.js": m111,
  "src/engine/memoryprompt.js": m112,
  "src/engine/memoryreconcile.js": m113,
  "src/engine/memoryswitch.js": m114,
  "src/engine/memorytrust.js": m115,
  "src/engine/memoryusage.js": m116,
  "src/engine/merge.js": m117,
  "src/engine/merge3.js": m118,
  "src/engine/modelcfg.js": m119,
  "src/engine/module.js": m120,
  "src/engine/patch.js": m121,
  "src/engine/pot/cycle-tracking.js": m122,
  "src/engine/pot/model-options.js": m123,
  "src/engine/pot/pdf-reference.js": m124,
  "src/engine/pot/token-usage.js": m125,
  "src/engine/promptimport.js": m126,
  "src/engine/provider/build.js": m127,
  "src/engine/provider/catalog.js": m128,
  "src/engine/provider/chain.js": m129,
  "src/engine/provider/cost.js": m130,
  "src/engine/provider/keypool.js": m131,
  "src/engine/provider/messages.js": m132,
  "src/engine/provider/presets.js": m133,
  "src/engine/provider/profile.js": m134,
  "src/engine/provider/repeat.js": m135,
  "src/engine/provider/sse.js": m136,
  "src/engine/provider/tools.js": m137,
  "src/engine/provider/transforms.js": m138,
  "src/engine/provider/translate.js": m139,
  "src/engine/regexview.js": m140,
  "src/engine/regress.js": m141,
  "src/engine/rpack.js": m142,
  "src/engine/runai.js": m143,
  "src/engine/safety.js": m144,
  "src/engine/sizemeter.js": m145,
  "src/engine/skillcfg.js": m146,
  "src/engine/skillchat.js": m147,
  "src/engine/skillhook.js": m148,
  "src/engine/skills.js": m149,
  "src/engine/store.js": m150,
  "src/engine/storytime.js": m151,
  "src/engine/tideplan.js": m152,
  "src/engine/tidestore.js": m153,
  "src/engine/trackpreset.js": m154,
  "src/engine/turninfo.js": m155,
  "src/engine/upload.js": m156,
  "src/engine/util.js": m157,
  "src/engine/vars.js": m158,
  "src/engine/webhook.js": m159,
  "src/engine/websearch.js": m160,
  "src/engine/workshop.js": m161,
  "src/engine/zipwrite.js": m162,
  "src/tide/characterMerge/characters.ts": m163,
  "src/tide/characterMerge/collide.ts": m164,
  "src/tide/characterMerge/composite.ts": m165,
  "src/tide/characterMerge/floatingUI.ts": m166,
  "src/tide/characterMerge/imageSystem.ts": m167,
  "src/tide/characterMerge/importPlan.ts": m168,
  "src/tide/characterMerge/license.ts": m169,
  "src/tide/characterMerge/luaBundle.ts": m170,
  "src/tide/characterMerge/mediaLabels.ts": m171,
  "src/tide/characterMerge/moduleSource.ts": m172,
  "src/tide/characterMerge/names.ts": m173,
  "src/tide/characterMerge/partialUpdate.ts": m174,
  "src/tide/characterMerge/parts.ts": m175,
  "src/tide/characterMerge/plan.ts": m176,
  "src/tide/characterMerge/provenance.ts": m177,
  "src/tide/characterMerge/rewrite.ts": m178,
  "src/tide/characterMerge/roles.ts": m179,
  "src/tide/characterMerge/selfCheck.ts": m180,
  "src/tide/characterMerge/sourceImages.ts": m181,
  "src/tide/characterMerge/wordDiff.ts": m182,
  "src/tide/characterUpdate.ts": m183,
  "src/tide/characterUpdateGreetings.ts": m184,
  "src/tide/characterUpdateMerge.ts": m185,
  "src/tide/characterUpdateOnboarding.ts": m186,
  "src/tide/characterUpdateTargets.ts": m187,
  "src/tide/plugin/detach.ts": m188,
  "src/tide/plugin/merge.ts": m189,
  "src/ui/aifix.js": m190,
  "src/ui/app.js": m191,
  "src/ui/assets.js": m192,
  "src/ui/cbs.js": m193,
  "src/ui/codeedit.js": m194,
  "src/ui/color.js": m195,
  "src/ui/dicedetail.js": m196,
  "src/ui/discovercard.js": m197,
  "src/ui/dom.js": m198,
  "src/ui/entrypicker.js": m199,
  "src/ui/ext.js": m200,
  "src/ui/hostupdate.js": m201,
  "src/ui/icons.js": m202,
  "src/ui/kit.js": m203,
  "src/ui/legacy.js": m204,
  "src/ui/lookparts.js": m205,
  "src/ui/mascot-data.js": m206,
  "src/ui/mascot.js": m207,
  "src/ui/multiselect.js": m208,
  "src/ui/onboarding.js": m209,
  "src/ui/prefs.js": m210,
  "src/ui/probpick.js": m211,
  "src/ui/quickset.js": m212,
  "src/ui/screens/about.js": m213,
  "src/ui/screens/addonsui.js": m214,
  "src/ui/screens/assetdupes.js": m215,
  "src/ui/screens/assetfix.js": m216,
  "src/ui/screens/assetmgr.js": m217,
  "src/ui/screens/characters.js": m218,
  "src/ui/screens/chareditor.js": m219,
  "src/ui/screens/cocoa.js": m220,
  "src/ui/screens/dev.js": m221,
  "src/ui/screens/devaff.js": m222,
  "src/ui/screens/devtools.js": m223,
  "src/ui/screens/editor.js": m224,
  "src/ui/screens/greetings.js": m225,
  "src/ui/screens/history.js": m226,
  "src/ui/screens/home.js": m227,
  "src/ui/screens/homestate.js": m228,
  "src/ui/screens/infocard.js": m229,
  "src/ui/screens/loredusk.js": m230,
  "src/ui/screens/lorelog.js": m231,
  "src/ui/screens/memory/chatload.js": m232,
  "src/ui/screens/memory/common.js": m233,
  "src/ui/screens/memory/hypamodal.js": m234,
  "src/ui/screens/memory/setup.js": m235,
  "src/ui/screens/memory/skillchat.js": m236,
  "src/ui/screens/memory/skills.js": m237,
  "src/ui/screens/memory/username.js": m238,
  "src/ui/screens/modlinks.js": m239,
  "src/ui/screens/modules.js": m240,
  "src/ui/screens/newbot.js": m241,
  "src/ui/screens/patchui.js": m242,
  "src/ui/screens/placeholder.js": m243,
  "src/ui/screens/presets.js": m244,
  "src/ui/screens/promptstab.js": m245,
  "src/ui/screens/provider.js": m246,
  "src/ui/screens/provider/css.js": m247,
  "src/ui/screens/provider/more.js": m248,
  "src/ui/screens/provider/ui.js": m249,
  "src/ui/screens/relmap/css.js": m250,
  "src/ui/screens/roulettepop.js": m251,
  "src/ui/screens/sectionhome.js": m252,
  "src/ui/screens/settings.js": m253,
  "src/ui/screens/settingstab.js": m254,
  "src/ui/screens/sizemeter.js": m255,
  "src/ui/screens/sizemeter/css.js": m256,
  "src/ui/screens/tools.js": m257,
  "src/ui/screens/updsettings.js": m258,
  "src/ui/screens/workshoplink.js": m259,
  "src/ui/screentours.js": m260,
  "src/ui/scrollguard.js": m261,
  "src/ui/sortable.js": m262,
  "src/ui/staleguard.js": m263,
  "src/ui/styles.js": m264,
  "src/ui/tabs.js": m265,
  "src/ui/theme.js": m266,
  "src/ui/themekit.js": m267,
  "src/ui/toast.js": m268,
  "src/ui/tooltip.js": m269,
  "src/ui/tour.js": m270,
  "src/ui/undo.js": m271,
  "src/ui/watch.js": m272,
  "src/ui/whatsnew.js": m273,
  "src/vendor/fflate-full.js": m274,
  "src/vendor/fflate.js": m275,
  "src/vendor/msgpackr.js": m276,
  "src/vendor/noble.js": m277,
  "src/vendor/re2js.js": m278
};
