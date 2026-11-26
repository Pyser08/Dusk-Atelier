// 미리보기: 몬스터 무리별 방어구 견본(직업군을 바꿔 가며)
import { createPreview } from "./bag3d.js";
import * as E from "../../src/rpg/engine/index.js";
const LIST = [["화룡", "heavy", "dragonr", "fire"], ["회색 늑대", "brawler", "wolf", ""], ["거대 거미", "light", "chitin", "poison"], ["괴조", "robe", "bird", "wind"], ["집게 괴물", "heavy", "aqua", "water"], ["해골 전사", "light", "undead", "dark"], ["수정 정령", "robe", "spiritc", "arcane"], ["트렌트", "robe", "treant", "plant"], ["경비 로봇", "tactical", "machine", "thunder"], ["임프", "light", "demon", "fire"], ["불곰", "heavy", "bear", ""], ["돌 골렘", "heavy", "golem", "earth"]];
const g = document.getElementById("g");
LIST.forEach(([mon, grp, pal, elem], i) => {
  const d = { armor: {}, sex: i % 2 ? "f" : "m" }; for (const s of Object.keys(E.SLOTS)) d.armor[s] = E.makeArmor(grp, s, { src: mon, name: mon + "의 소재", grade: i % 3 === 0 ? "전설" : "희귀", elem, pal });
  const cell = document.createElement("div"); cell.className = "c"; cell.innerHTML = `<div class=v></div><b>${mon} · ${E.GROUPS[grp].n}</b>`; g.append(cell);
  const p = createPreview(), lk = E.armorLook(d); p.mount(cell.querySelector(".v")); p.set({ outfit: lk.outfit, dye: lk.dye, hair: [0xd8d8e0, 0x24222a, 0xe0c060, 0xa83a2a][i % 4], sex: d.sex, w: ["sword", "claw", "dagger", "tome", "lance", "sword", "staff", "staff", "sword", "dagger", "axe", "axe"][i] });
});
