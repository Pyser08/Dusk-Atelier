// 시험용 애드온 자리: 2.0.0부터 편집기 AI 창·룰렛은 'aibuild' 애드온 svc가 있을 때만 보인다 → 시험 입구에서 같은 svc를 채워 준다
import * as controller from "../../src/dev/aibuild/controller.js";
import * as bridge from "../../src/dev/aibuild/bridge.js";
import * as aitab from "../../src/ui/screens/aitab.js";
import { openAiPopup, loadPopupGeom } from "../../src/ui/screens/aibuild.js";
const svc = { load: async () => [controller, bridge], aitab: async () => aitab, openAiPopup, loadPopupGeom, botDefaults: null };
export const aibuildExt = { get: (kind, id) => (kind === "svc" && id === "aibuild" ? svc : null), render: () => [], add: () => () => {} };
