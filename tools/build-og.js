// 1200×1200 썸네일 생성 — 한글 TTF/OTF를 opentype.js로 path 변환 후 sharp 렌더
// (시스템 폰트 의존 없음 = 한글 깨짐 원천 차단)
'use strict';

const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const sharp = require('sharp');
const { SITE } = require('./site');
const { PAGES } = require('./content');

const ROOT = path.join(__dirname, '..');
const FONT_PATH = path.join(__dirname, 'fonts', 'Pretendard-Bold.otf');
const OUT_DIR = path.join(ROOT, 'og');
const W = 1200, H = 1200;

const buf = fs.readFileSync(FONT_PATH);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 지정 폭에 맞춰 폰트 크기 자동 축소
function fitSize(text, maxWidth, startSize) {
  let s = startSize;
  while (s > 8 && font.getAdvanceWidth(text, s) > maxWidth) s -= 1;
  return s;
}

// 중앙 정렬 path
function centeredPath(text, size, cy, fill, extra = '') {
  const w = font.getAdvanceWidth(text, size);
  const x = (W - w) / 2;
  const p = font.getPath(text, x, cy, size);
  return `<path d="${p.toPathData(2)}" fill="${fill}"${extra}/>`;
}

function bulbs() {
  const out = [];
  const inset = 66, step = 63, r = 6;
  for (let x = inset; x <= W - inset; x += step) {
    const on = ((x / step) | 0) % 2 === 0;
    const c = on ? '#ff6b1f' : '#ff2f86';
    const o = on ? 0.95 : 0.6;
    out.push(`<circle cx="${x}" cy="${inset}" r="${r}" fill="${c}" opacity="${o}"/>`);
    out.push(`<circle cx="${x}" cy="${H - inset}" r="${r}" fill="${c}" opacity="${o}"/>`);
  }
  for (let y = inset + step; y <= H - inset - step; y += step) {
    const on = ((y / step) | 0) % 2 === 0;
    const c = on ? '#ff2f86' : '#ff6b1f';
    out.push(`<circle cx="${inset}" cy="${y}" r="${r}" fill="${c}" opacity="0.8"/>`);
    out.push(`<circle cx="${W - inset}" cy="${y}" r="${r}" fill="${c}" opacity="0.8"/>`);
  }
  return out.join('');
}

function buildSvg(page) {
  const brand = SITE.brand;                      // 수유샴푸나이트
  const sub = page.ogSub;                        // 페이지별 부제
  const foot = `광고문의 카카오톡 ${SITE.kakaoId}`;

  const brandSize = fitSize(brand, 1000, 190);
  const subSize = fitSize(sub, 940, 62);
  const footSize = fitSize(foot, 760, 38);
  const kickerSize = fitSize('SUYU · GANGBUK', 420, 34);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#151016"/><stop offset="0.55" stop-color="#0d0c0e"/><stop offset="1" stop-color="#120d12"/>
  </linearGradient>
  <radialGradient id="glowO" cx="50%" cy="34%" r="58%">
    <stop offset="0" stop-color="#ff6b1f" stop-opacity="0.30"/><stop offset="1" stop-color="#ff6b1f" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowP" cx="82%" cy="86%" r="52%">
    <stop offset="0" stop-color="#ff2f86" stop-opacity="0.26"/><stop offset="1" stop-color="#ff2f86" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ff6b1f"/><stop offset="1" stop-color="#ff2f86"/>
  </linearGradient>
  <pattern id="scan" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(115)">
    <rect width="10" height="10" fill="none"/><rect width="1.4" height="10" fill="#ffffff" opacity="0.028"/>
  </pattern>
  <filter id="soft" x="-25%" y="-25%" width="150%" height="150%">
    <feGaussianBlur stdDeviation="16"/>
  </filter>
</defs>

<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#glowO)"/>
<rect width="${W}" height="${H}" fill="url(#glowP)"/>
<rect width="${W}" height="${H}" fill="url(#scan)"/>

<!-- 레트로 간판 이중 테두리 -->
<rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="#ff6b1f" stroke-width="6" opacity="0.92"/>
<rect x="92" y="92" width="${W - 184}" height="${H - 184}" fill="none" stroke="#ff2f86" stroke-width="2.5" opacity="0.62"/>
${bulbs()}

<!-- 상단 키커 -->
<rect x="${(W - 470) / 2}" y="212" width="470" height="66" fill="none" stroke="#ffb020" stroke-width="3" opacity="0.85"/>
${centeredPath('SUYU · GANGBUK', kickerSize, 258, '#ffb020')}

<!-- 브랜드 (초대형) -->
${centeredPath(brand, brandSize, 520, '#ff8a3d', ' opacity="0.55" filter="url(#soft)"')}
${centeredPath(brand, brandSize, 520, '#ffffff')}

<!-- 네온 바 -->
<rect x="${(W - 700) / 2}" y="588" width="700" height="9" fill="url(#bar)"/>

<!-- 부제 -->
${centeredPath(sub, subSize, 712, '#ff2f86', ' opacity="0.5" filter="url(#soft)"')}
${centeredPath(sub, subSize, 712, '#ffd9c2')}

<!-- 하단 안내 -->
<rect x="${(W - 820) / 2}" y="960" width="820" height="96" fill="#17121a" stroke="#ff6b1f" stroke-width="3"/>
${centeredPath(foot, footSize, 1022, '#ffb020')}

<!-- 사선 액센트 -->
<rect x="118" y="836" width="180" height="7" fill="#ff6b1f" opacity="0.8"/>
<rect x="${W - 298}" y="836" width="180" height="7" fill="#ff2f86" opacity="0.8"/>
<!-- ${esc(page.slug)} -->
</svg>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = [];
  for (const page of PAGES) {
    const svg = buildSvg(page);
    const out = path.join(OUT_DIR, `${page.og}.png`);
    let img = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 }).toBuffer();
    if (img.length > 300 * 1024) {
      img = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: 72, colors: 128, effort: 10 }).toBuffer();
    }
    fs.writeFileSync(out, img);
    const meta = await sharp(out).metadata();
    report.push({ file: `og/${page.og}.png`, w: meta.width, h: meta.height, kb: +(img.length / 1024).toFixed(1) });
  }
  console.table(report);
  const bad = report.filter((r) => r.w !== 1200 || r.h !== 1200 || r.kb > 300);
  if (bad.length) { console.error('썸네일 규격 위반:', bad); process.exit(1); }
  console.log(`썸네일 ${report.length}장 생성 완료 (전부 1200×1200, 300KB 이하)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
