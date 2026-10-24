import { execSync } from "child_process";
import { existsSync } from "fs";

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = "http://localhost:3010/ui";
const out390 = "C:\\Projetos\\CatedraFut\\web\\screenshots\\ui-390-full.png";
const out1440 = "C:\\Projetos\\CatedraFut\\web\\screenshots\\ui-1440-viewport.png";

// 390px full-page (tall height)
execSync(`"${chrome}" --headless=new --no-sandbox --disable-gpu --run-all-compositor-stages-before-draw "--screenshot=${out390}" "--window-size=390,6000" --hide-scrollbars "${url}"`, { stdio: "inherit" });
console.log("390:", existsSync(out390));

// 1440px viewport
execSync(`"${chrome}" --headless=new --no-sandbox --disable-gpu --run-all-compositor-stages-before-draw "--screenshot=${out1440}" "--window-size=1440,6000" --hide-scrollbars "${url}"`, { stdio: "inherit" });
console.log("1440:", existsSync(out1440));
