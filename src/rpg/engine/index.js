// Dusk Saga 엔진 공개 창구
export { STATS, SL, TERRAIN, MT, MTL, WT, CONDS, OBJ, MAXLV, K, unK, clamp, copy, dist, fresh, log, objText, GUNS, COVER, SIDE, TN, foe, gunOf, utags, idOf, arm, CAT } from "./rules.js";
export { normSkill, llmSkill, fitLevel, normUnit, normWeapon, importModule, PRE, presetUnit, ensureBase } from "./normalize.js";
export { alive, terr, uterr, unitAt, reach, pathTo, stops, threat, danger, standable, wr, ammo, canShoot, coverFrom, living, est, pairBonus, syncRears } from "./board.js";
export { forecast, options, healAmount, actAttack, actHeal, actWait, actSeize, canSeize, outcome, travel, actWatch, actReload, actItem, actGive, actPair, actSwitch, actDrop } from "./combat.js";
export { allDone, endTurn, loadEncounter, spawn, unspawn } from "./phase.js";
export { runTeam } from "./ai.js";
export { planGrowth, applyGrowth, regen, expRate, reqLevel, rescale } from "./growth.js";
export { context, storyNote, digest } from "./digest.js";
export { mapOf, loadMap, endReplay, snapshot, restart, mark, pulse, pulseMax, pulseReset, retro, rename } from "./saves.js";
export { MAPS } from "./maps.js";
export { XCOM_PROMPT, rosterText, skillText, GEN_PROMPT, LATER_PROMPT, GROWTH_PROMPT, REGEN_PROMPT, sheetText } from "./prompts.js";
export { demo } from "./demo.js";
export { migrateSave } from "./migrate.js";
