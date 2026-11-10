// 모듈 호환 시험 데이터 — 실제 봇·모듈 세 종류(헌터물 화이트리스트형, 대학 assetlist 확인형, 정규식 없는 봇)의
// 이미지 관련 구조만 줄여 옮겼다(이름·패턴 모양만, 본문·그림 없음).
const em = ["angry", "smile", "blushing shyly", "default", "crying with eyes open"];
const many = (who, list = em) => list.map((e) => [`${who} ${e}`, `assets/${who}-${e}.png`, "png"]);

// 1) 헌터물: <img="이름 감정"> 그리기 + 응답 수정 때 알려진 이름 외 <img="…">를 지우는 화이트리스트 + 개행 정리
export const hunterBot = {
  name: "Alternate Hunters", chaId: "hunter",
  triggerscript: [{ comment: "", type: "output", conditions: [], effect: [{ type: "triggerlua", code: "onOutput = async(function(id) end)" }] }],
  additionalAssets: [...many("Kang Min-hyuk"), ...many("Min Chae-rin"), ["Male", "assets/m.png", "png"], ["Female", "assets/f.png", "png"]],
  customscript: [
    { comment: "에셋 커맨드 개행", in: String.raw`\s*(<img=".*?"\>)\s*`, out: "\n\n$1\n\n", type: "editoutput", ableFlag: false },
    { comment: "에셋 찐빠 수정6", in: String.raw`<img="(?!(?:(?:Kang Min-hyuk|Min Chae-rin) (?:angry|smile|blushing shyly|default|crying with eyes (?:closed|open)))|(?:Female|Male))[^"]+">`, out: "", type: "editoutput", ableFlag: false },
    { comment: "1", in: `<img="(.*?)">`, out: "<style>.image-container{width:100%}</style>\n{{#if {{greater_equal::{{chat_index}}::{{? {{lastmessageid}}-5}}}}}}\n<div class=\"image-container\" style=\"background-image: url('{{raw::$1}}');\"></div>\n{{/if}}\n", type: "editdisplay", ableFlag: false },
    { comment: "상태창 출력 제거", in: String.raw`(?:^|\r?\n)(?:☆|★)\s*\[Date:[^\r\n]*\](?=\r?\n|$)`, out: "{{#if {{equal::{{getvar::status_type}}::1}}}}\n$&\n{{/if}}\n", type: "editoutput", ableFlag: false }
  ],
  globalNote: `## Image Command Instructions\n- Use an Image command. Example: \`<img="{{Character Image Command}}">\`\n#### Image Command Example:\n- <img="Min Chae-rin aroused">\n- <img="Ha Wol-young full-face blush">`
};

// 2) 대학: <img src=이름_키워드> + 표시 때 {{assetlist}}에 '이름.png'가 있는지 확인하고 그린다(모듈 에셋은 목록에 없음)
export const univBot = {
  name: "Cheongwon Univ.", chaId: "univ",
  additionalAssets: ["angry", "smiling", "kiss", "blushing shyly"].flatMap((e) => ["hayeon", "jiyoon"].map((n) => [`${n}_${e}.png`, `assets/${n}_${e}.png`, "png"])),
  customscript: [],
  module: { id: "univ-mod", name: "Cheongwon Univ. Module", assets: [], regex: [
    { comment: "👰ASSET", in: "<img src=(.*?)>", type: "editdisplay", ableFlag: false, out: `{{#if {{greater_equal::{{chat_index}}::{{? {{lastmessageid}}-5}}}}}}
    {{settempvar::asset_name_input_RPF::{{trim::$1}}}}
    {{settempvar::asset_name_to_find_RPF::{{gettempvar::asset_name_input_RPF}}.png}}
    {{settempvar::asset_is_found_RPF::0}}
    {{#each {{assetlist}} an_asset_RPF}}
        {{#if {{equal::{{slot::an_asset_RPF}}::{{gettempvar::asset_name_to_find_RPF}}}}}}
            {{settempvar::asset_is_found_RPF::1}}
        {{/if}}
    {{/each}}
    {{#if {{equal::{{gettempvar::asset_is_found_RPF}}::1}} }}
        <div class="image-container" style="background-image: url('{{raw::{{gettempvar::asset_name_to_find_RPF}}}}');" tabindex="0"></div>
    {{/if}}
    {{#if {{equal::{{gettempvar::asset_is_found_RPF}}::0}} }}
        <div style="color:grey">(이미지: '{{gettempvar::asset_name_input_RPF}}' 없음)</div>
    {{/if}}
{{/if}}` },
    { comment: "🚫NO ASSET REQUEST", in: "<img src=(.*?)>", type: "editprocess", ableFlag: false, out: "{{#if {{greater_equal::{{chat_index}}::{{? {{lastmessageid}}-5}}}}}}\n$&\n{{/if}}\n" },
    { comment: "🚫 NO [...] 2", in: String.raw`\[([a-zA-Z]+):\s*([^\]]*)\s*\]`, type: "editdisplay", ableFlag: false, out: "" }
  ], lorebook: [], trigger: [] },
  globalNote: "- Format: `<img src=character's name_keyword>`\n- Example: `<img src=hayeon_blushing shyly>`\n- Only these names are permitted: jiyoon, hayeon."
};

// 3) 정규식이 하나도 없는 봇
export const plainBot = { name: "Plain", chaId: "plain", additionalAssets: [["cover", "assets/cover.png", "png"]], customscript: [], globalNote: "" };

// 모듈 A: 인물·표정 이미지만(정규식 없음) — 공백 구분
export const hunterExtra = { id: "mha", name: "더 많은 헌터들", regex: [], trigger: [], lorebook: [{ key: "류해연, Ryu Hae-yeon", comment: "류해연", content: "..." }],
  assets: [...many("Ryu Hae-yeon"), ...many("Park In-joon"), ...many("Kang Chae-ho", ["angry", "smile", "default"]), ...many("Kang Min-hyuk", ["angry"])] };
// 모듈 B: 자기 인물 카드를 스스로 그리는 정규식이 있음
export const selfModule = { id: "obang", name: "오방융합", trigger: [{ type: "start", effect: [{ type: "triggerlua", code: "function onOutput(id) end" }] }], lorebook: [],
  assets: [["Ernest Melville", "assets/em.png", "png"], ["deep_cq", "assets/dcq.png", "png"]],
  regex: [{ comment: "카드", in: String.raw`<img\s*=\s*"(Ernest Melville)"\s*/?>`, out: `<div class="obang-card"><img class="obang-card-img" src="{{raw::$1}}" alt="$1"></div>`, type: "editdisplay", ableFlag: true, flag: "g<order 10>" }] };
// 대학용 확장 모듈: 밑줄 구분
export const univExtra = { id: "univ-plus", name: "새 학생들", regex: [], trigger: [], lorebook: [],
  assets: ["angry", "smiling", "kiss"].flatMap((e) => ["minji", "sora"].map((n) => [`${n}_${e}.png`, `assets/${n}_${e}.png`, "png"])) };
