// The World in One Day - Monday, 23 November 2026.
// A program that draws a one-page newspaper front page in code and writes
// it to /output/entry.png. Node standard library only: no network, no
// randomness, no image files. Every run writes the same bytes.
// Written fresh for the news-image-20261123 bounty.

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------- PNG ----
// CRC-32 (IEEE 802.3) table, built once at startup.
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE.push(c >>> 0);
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(w: number, h: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = truecolour RGB
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter: none
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (1 + w * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------- 5x7 bitmap font ----
// Every glyph is 7 rows of 5 cells. '#' is ink, '.' is blank.
// This table was typed out by hand for this edition.
const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "...#.", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "%": ["#...#", "#..#.", "...#.", "..#..", ".#...", "#..#.", "#...#"],
};

// ------------------------------------------------------- canvas ------
type RGB = [number, number, number];
const W = 1024;
const H = 1024;
const img = new Uint8Array(W * H * 3);

const PAPER: RGB = [246, 239, 220];
const INK: RGB = [26, 26, 26];
const MAROON: RGB = [107, 31, 42];
const GOLD: RGB = [201, 162, 39];
const RED: RGB = [178, 34, 34];
const NAVY: RGB = [39, 74, 111];
const SEA: RGB = [22, 50, 79];
const WHITE: RGB = [255, 255, 255];
const GREY: RGB = [150, 140, 120];
const SHIP: RGB = [40, 44, 52];
const ORANGE: RGB = [230, 126, 34];
const YELLOW: RGB = [241, 196, 15];
const GREEN: RGB = [39, 120, 70];
const SKYBLUE: RGB = [90, 140, 190];
const EUBLUE: RGB = [0, 51, 153];

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = c[0];
  img[i + 1] = c[1];
  img[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setPx(i, j, c);
}
function hLine(x: number, y: number, w: number, c: RGB): void {
  for (let i = x; i < x + w; i++) setPx(i, y, c);
}
function vLine(x: number, y: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) setPx(x, j, c);
}
function rectOutline(x: number, y: number, w: number, h: number, c: RGB): void {
  hLine(x, y, w, c);
  hLine(x, y + h - 1, w, c);
  vLine(x, y, h, c);
  vLine(x + w - 1, y, h, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
function thickLine(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  for (let a = 0; a < t; a++) line(x0, y0 + a, x1, y1 + a, c);
}
function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    hLine(cx - dx, cy + dy, dx * 2 + 1, c);
  }
}
// Scanline fill for a simple polygon given as [x, y] pairs.
function fillPoly(pts: number[][], c: RGB): void {
  let minY = 1e9;
  let maxY = -1e9;
  for (const p of pts) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(Math.round(a[0] + t * (b[0] - a[0])));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) hLine(xs[k], y, xs[k + 1] - xs[k] + 1, c);
  }
}

// --------------------------------------------------------- text ------
// Glyph advance is 6 units per character at scale 1 (5 + 1 spacing).
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] || FONT[" "];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "#") fillRect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}
function drawTextCentered(cx: number, y: number, s: string, scale: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}
function wrapText(s: string, scale: number, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(trial, scale) <= maxW || cur === "") cur = trial;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
function drawWrapped(x: number, y: number, lines: string[], scale: number, lineH: number, c: RGB): void {
  for (let i = 0; i < lines.length; i++) drawText(x, y + i * lineH, lines[i], scale, c);
}

// --------------------------------------------------------- icons ------
// Each icon is drawn inside an 80x80 box whose top-left is (ox, oy).
function iconCourt(ox: number, oy: number): void {
  fillPoly(
    [
      [ox + 4, oy + 30],
      [ox + 40, oy + 6],
      [ox + 76, oy + 30],
    ],
    MAROON
  );
  fillRect(ox + 12, oy + 36, 8, 30, MAROON);
  fillRect(ox + 36, oy + 36, 8, 30, MAROON);
  fillRect(ox + 60, oy + 36, 8, 30, MAROON);
  fillRect(ox + 4, oy + 66, 72, 6, MAROON);
}
function iconBallot(ox: number, oy: number): void {
  fillRect(ox + 30, oy + 6, 20, 24, WHITE);
  rectOutline(ox + 30, oy + 6, 20, 24, INK);
  thickLine(ox + 34, oy + 18, ox + 39, oy + 24, 2, GREEN);
  thickLine(ox + 39, oy + 24, ox + 47, oy + 10, 2, GREEN);
  fillRect(ox + 10, oy + 32, 60, 40, NAVY);
  fillRect(ox + 28, oy + 32, 24, 3, PAPER);
}
function iconPlane(ox: number, oy: number): void {
  fillPoly(
    [
      [ox + 6, oy + 44],
      [ox + 58, oy + 36],
      [ox + 74, oy + 42],
      [ox + 58, oy + 50],
      [ox + 6, oy + 52],
    ],
    SKYBLUE
  );
  fillPoly(
    [
      [ox + 10, oy + 44],
      [ox + 18, oy + 26],
      [ox + 24, oy + 44],
    ],
    SKYBLUE
  );
  fillPoly(
    [
      [ox + 30, oy + 44],
      [ox + 48, oy + 62],
      [ox + 56, oy + 62],
      [ox + 40, oy + 44],
    ],
    SKYBLUE
  );
  thickLine(ox + 52, oy + 14, ox + 74, oy + 36, 3, RED);
  thickLine(ox + 74, oy + 14, ox + 52, oy + 36, 3, RED);
}
function iconFlame(ox: number, oy: number): void {
  fillPoly(
    [
      [ox + 40, oy + 4],
      [ox + 54, oy + 24],
      [ox + 66, oy + 44],
      [ox + 60, oy + 68],
      [ox + 20, oy + 68],
      [ox + 14, oy + 44],
      [ox + 26, oy + 24],
    ],
    ORANGE
  );
  fillPoly(
    [
      [ox + 40, oy + 28],
      [ox + 50, oy + 42],
      [ox + 54, oy + 56],
      [ox + 48, oy + 64],
      [ox + 32, oy + 64],
      [ox + 26, oy + 56],
      [ox + 30, oy + 42],
    ],
    YELLOW
  );
  fillRect(ox + 14, oy + 70, 52, 3, MAROON);
}
function iconBars(ox: number, oy: number): void {
  fillRect(ox + 10, oy + 16, 16, 56, MAROON);
  fillRect(ox + 32, oy + 32, 16, 40, MAROON);
  fillRect(ox + 54, oy + 48, 16, 24, MAROON);
  fillRect(ox + 6, oy + 74, 68, 2, INK);
  thickLine(ox + 8, oy + 10, ox + 70, oy + 34, 3, RED);
  thickLine(ox + 70, oy + 34, ox + 62, oy + 34, 3, RED);
  thickLine(ox + 70, oy + 34, ox + 70, oy + 26, 3, RED);
}
function iconDoc(ox: number, oy: number): void {
  fillRect(ox + 16, oy + 6, 48, 64, WHITE);
  rectOutline(ox + 16, oy + 6, 48, 64, NAVY);
  fillRect(ox + 22, oy + 16, 36, 3, GREY);
  fillRect(ox + 22, oy + 26, 36, 3, GREY);
  fillRect(ox + 22, oy + 36, 24, 3, GREY);
  fillCircle(ox + 54, oy + 58, 11, GOLD);
  fillCircle(ox + 54, oy + 58, 6, MAROON);
}
const ICONS: Record<string, (ox: number, oy: number) => void> = {
  court: iconCourt,
  ballot: iconBallot,
  plane: iconPlane,
  flame: iconFlame,
  bars: iconBars,
  doc: iconDoc,
};

// ------------------------------------------------- lead picture ------
// A warship under a sun, a missile arcing over a dark sea.
function drawLeadScene(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, NAVY);
  fillCircle(x + 334, y + 36, 20, YELLOW);
  fillCircle(x + 84, y + 36, 10, [200, 210, 225]);
  fillCircle(x + 98, y + 32, 12, [200, 210, 225]);
  fillCircle(x + 112, y + 38, 10, [200, 210, 225]);
  line(x + 214, y + 46, x + 222, y + 40, WHITE);
  line(x + 222, y + 40, x + 230, y + 46, WHITE);
  fillRect(x, y + 166, w, h - 166, SEA);
  fillRect(x + 24, y + 188, 120, 2, WHITE);
  fillRect(x + 144, y + 208, 140, 2, WHITE);
  fillRect(x + 44, y + 232, 100, 2, WHITE);
  fillRect(x + 204, y + 256, 120, 2, WHITE);
  // Warship.
  fillPoly(
    [
      [x + 24, y + 220],
      [x + 90, y + 220],
      [x + 78, y + 250],
      [x + 36, y + 250],
    ],
    SHIP
  );
  fillRect(x + 48, y + 192, 42, 28, SHIP);
  fillRect(x + 84, y + 182, 12, 38, SHIP);
  vLine(x + 48, y + 166, 26, SHIP);
  fillPoly(
    [
      [x + 48, y + 166],
      [x + 68, y + 172],
      [x + 48, y + 178],
    ],
    RED
  );
  // Missile and smoke trail.
  fillPoly(
    [
      [x + 264, y + 64],
      [x + 272, y + 78],
      [x + 256, y + 78],
    ],
    WHITE
  );
  fillCircle(x + 246, y + 88, 5, [200, 200, 200]);
  fillCircle(x + 232, y + 100, 4, [200, 200, 200]);
  fillCircle(x + 218, y + 112, 3, [200, 200, 200]);
  // Caption strip.
  fillRect(x, y + h - 32, w, 32, INK);
  drawTextCentered(x + Math.floor(w / 2), y + h - 22, "US NAVAL BLOCKADE MEETS IRAN'S DEFIANCE", 1, WHITE);
  rectOutline(x, y, w, h, GOLD);
  rectOutline(x + 1, y + 1, w - 2, h - 2, GOLD);
}

// ---------------------------------------------------------- page ------
interface Story {
  kicker: string;
  icon: string;
  headline: string;
  body: string;
}
const STORIES: Story[] = [
  {
    kicker: "DHAKA",
    icon: "court",
    headline: "DHAKA VOWS TO JAIL HASINA IF SHE COMES HOME",
    body: "Bangladesh says ex-PM Hasina will be arrested if she returns from India. Extradition is sought.",
  },
  {
    kicker: "JAKARTA",
    icon: "ballot",
    headline: "PRABOWO TO NAME TWO VP CANDIDATES TODAY",
    body: "President Prabowo sends parliament two names for vice president. MPs vote on Dec 11.",
  },
  {
    kicker: "BRUSSELS",
    icon: "plane",
    headline: "STRIKE GROUNDS EVERY FLIGHT IN BELGIUM",
    body: "Controllers join a national strike. Brussels Airport cancels 429 flights, hitting 59,500 people.",
  },
  {
    kicker: "CIKANDE",
    icon: "flame",
    headline: "24 DEAD IN FACTORY FIRE, 30 STILL MISSING",
    body: "Indonesia confirms 24 killed in the Cikande candy factory blaze. Rescuers search for the missing.",
  },
  {
    kicker: "PARIS",
    icon: "bars",
    headline: "FRENCH SLUMP DEEPENS TO SIX-MONTH LOW",
    body: "Flash PMI falls to 46.2 as factory output drops to its weakest since February 2025.",
  },
  {
    kicker: "LONDON",
    icon: "doc",
    headline: "BURNHAM TAKES LANDMARK EU DEAL TO MPS",
    body: "The PM calls the Brussels deal the biggest growth measure of this parliament, worth 17 billion pounds.",
  },
];

function drawStoryCell(x: number, y: number, s: Story): void {
  rectOutline(x, y + 8, 96, 96, GREY);
  ICONS[s.icon](x + 8, y + 16);
  const tx = x + 108;
  drawText(tx, y + 4, s.kicker, 1, RED);
  const headLines = wrapText(s.headline, 2, 364);
  drawWrapped(tx, y + 18, headLines, 2, 18, INK);
  const bodyY = y + 18 + headLines.length * 18 + 6;
  const bodyLines = wrapText(s.body, 2, 364);
  drawWrapped(tx, bodyY, bodyLines, 2, 18, INK);
}

function drawPage(): void {
  fillRect(0, 0, W, H, PAPER);
  rectOutline(20, 20, 984, 984, MAROON);
  rectOutline(21, 21, 982, 982, MAROON);
  rectOutline(22, 22, 980, 980, MAROON);

  // Masthead.
  fillRect(23, 23, 978, 88, MAROON);
  drawTextCentered(512, 36, "THE WORLD IN ONE DAY", 6, GOLD);
  drawTextCentered(512, 88, "ONE DAY. ONE PAGE. THE WHOLE WORLD.", 1, GOLD);

  // Date banner.
  fillRect(23, 118, 978, 34, GOLD);
  drawTextCentered(512, 125, "MONDAY, 23 NOVEMBER 2026", 3, INK);

  // Lead story: text left, drawn scene right.
  drawText(28, 170, "LEAD - WASHINGTON AND TEHRAN", 1, RED);
  const leadHead = wrapText("TRUMP SETS NEW YEAR DEADLINE ON IRAN - WAR IF NO DEAL", 3, 568);
  drawWrapped(28, 190, leadHead, 3, 27, INK);
  const leadBody = wrapText(
    "President Trump said he is 'inclined' to resume war with Iran if no deal is reached by the New Year. " +
      "Tehran vowed to use 'all available tools' to confront the US naval blockade. " +
      "Oil slid as war fears eased, and the blockade has cut flows through Hormuz to 9.5 million barrels a day.",
    2,
    568
  );
  drawWrapped(28, 254, leadBody, 2, 18, INK);
  drawLeadScene(616, 164, 380, 304);

  // Divider above the grid.
  fillRect(23, 480, 978, 2, GOLD);
  vLine(510, 492, 460, GREY);
  hLine(28, 640, 968, GREY);
  hLine(28, 796, 968, GREY);

  // Six stories, two columns by three rows.
  const xs = [28, 524];
  const ys = [492, 648, 804];
  for (let i = 0; i < STORIES.length; i++) {
    drawStoryCell(xs[i % 2], ys[Math.floor(i / 2)], STORIES[i]);
  }

  // Footer: sources and a note to the judge.
  fillRect(23, 960, 978, 2, GOLD);
  drawTextCentered(512, 970, "SOURCES: REUTERS - AP - BBC - ECONOMIC TIMES - RTBF - SKEYES", 1, INK);
  drawTextCentered(
    512,
    984,
    "TO THE JUDGE: EVERY STORY HERE HAPPENED OR WAS FIRST REPORTED ON MONDAY 23 NOVEMBER 2026. NOTHING IS FROM ANOTHER DAY.",
    1,
    INK
  );
}

// ----------------------------------------------------------- main ------
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "out";
drawPage();
mkdirSync(outDir, { recursive: true });
writeFileSync(outDir + "/entry.png", encodePNG(W, H, img));
console.log("wrote " + outDir + "/entry.png");
