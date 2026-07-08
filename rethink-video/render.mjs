import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = resolve(import.meta.dirname);
const framesDir = join(root, "frames");
const output = join(root, "rethink-animation.mp4");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const width = 1920;
const height = 1080;
const fps = 60;
const duration = 6;
const totalFrames = fps * duration;

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.goto(`${pathToFileURL(join(root, "index.html")).href}?render=1`);

for (let i = 0; i < totalFrames; i++) {
  const t = i / fps;
  await page.evaluate((time) => window.__RETHINK_ANIMATION__.setAtTime(time), t);
  const framePath = join(framesDir, `frame_${String(i).padStart(5, "0")}.png`);
  await page.screenshot({ path: framePath, clip: { x: 0, y: 0, width, height } });
  if (i % 60 === 0) console.log(`Rendered frame ${i}/${totalFrames}`);
}

await browser.close();

if (existsSync(output)) {
  await rm(output);
}

await run("ffmpeg", [
  "-y",
  "-framerate",
  String(fps),
  "-i",
  join(framesDir, "frame_%05d.png"),
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  "-crf",
  "18",
  output,
]);

console.log(`Video written to ${output}`);
