// 에셋 제작 애드온 e2e용: 앱 시험 묶음 + 애드온 + 가짜 NAI 응답(zip)을 만들 fflate
import "./app.entry.js";
import * as sdstudio from "../../addons/sdstudio/index.js";
import { zipSync } from "../../src/vendor/fflate.js";
window.__sd = sdstudio;
window.__zipSync = zipSync;
