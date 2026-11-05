import { avatar } from "../../src/ui/screens/memory/common.js";
import { setUserName } from "../../src/ui/screens/memory/username.js";
window.av = (n) => { const e = avatar(n, "B"); document.body.append(e); return e; };
window.setUserName = setUserName;
