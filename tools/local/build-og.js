// /local/ 썸네일 40장 생성 (1200×1200 PNG, /og/local-{슬러그}.png)
// 한글 TTF/OTF → opentype.js path 변환 → sharp 렌더 (시스템 폰트 의존 없음)
'use strict';

const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const sharp = require('sharp');
const { SITE } = require('../site');
const { VENUES, HUB } = require('./index');

const ROOT = path.join(__dirname, '..', '..');
const FONT_PATH = path.join(__dirname, '..', 'fonts', 'Pretendard-Bold.otf');
const OUT_DIR = path.join(ROOT, 'og');
const W = 1200, H = 1200;

const buf = fs.readFileSync(FONT_PATH);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

function fit(text, maxWidth, startSize) {
  let s = startSize;
  while (s > 8 && font.getAdvanceWidth(text, s) > maxWidth) s -= 1;
  return s;
}
function line(text, size, baseline, fill, extra = '') {
  const w = font.getAdvanceWidth(text, size);
  const p = font.getPath(text, (W - w) / 2, baseline, size);
  return `<path d="${p.toPathData(2)}" fill="${fill}"${extra}/>`;
}

// 지도 핀 (회전 마름모 + 원)
function pin(cx, cy, r, color, opacity = 1) {
  return `<g opacity="${opacity}" transform="translate(${cx} ${cy}) rotate(-45)">
  <path d="M ${-r} ${-r} A ${r} ${r} 0 1 1 ${r} ${r} L ${-r} ${r} Z" fill="${color}"/>
  <circle cx="0" cy="0" r="${r * 0.36}" fill="#0d0c0e"/></g>`;
}

// 거리 라인 (점선 도로)
function roads() {
  const out = [];
  for (const y of [176, 1024]) {
    out.push(`<rect x="70" y="${y}" width="1060" height="3" fill="#4a3f4a"/>`);
    out.push(`<rect x="70" y="${y}" width="1060" height="3" fill="url(#dash)"/>`);
  }
  out.push(`<rect x="70" y="176" width="3" height="848" fill="#2e2830"/>`);
  out.push(`<rect x="1127" y="176" width="3" height="848" fill="#2e2830"/>`);
  return out.join('');
}

function svgFor(item) {
  const isAd = !!item.ad;
  const name = item.name;
  const nameSize = fit(name, 900, 76);

  let mid;
  if (isAd) {
    const nickSize = fit(item.ad.nick, 620, 168);
    const telSize = fit(item.ad.phone, 1030, 168);
    mid = `
${line(item.ad.nick, nickSize, 560, '#ff8a3d', ' opacity="0.5" filter="url(#soft)"')}
${line(item.ad.nick, nickSize, 560, '#ffffff')}
<rect x="${(W - 760) / 2}" y="612" width="760" height="8" fill="url(#bar)"/>
${line(item.ad.phone, telSize, 810, '#ff2f86', ' opacity="0.55" filter="url(#soft)"')}
${line(item.ad.phone, telSize, 810, '#ffd9c2')}
${line('전화문의', fit('전화문의', 300, 46), 906, '#ffb020')}`;
  } else {
    const bigSize = fit('광고문의', 1000, 240);
    mid = `
${line('광고문의', bigSize, 620, '#ff8a3d', ' opacity="0.5" filter="url(#soft)"')}
${line('광고문의', bigSize, 620, '#ffffff')}
<rect x="${(W - 760) / 2}" y="676" width="760" height="8" fill="url(#bar)"/>
${line('카카오톡 ' + SITE.kakaoId, fit('카카오톡 ' + SITE.kakaoId, 900, 96), 800, '#ff2f86', ' opacity="0.5" filter="url(#soft)"')}
${line('카카오톡 ' + SITE.kakaoId, fit('카카오톡 ' + SITE.kakaoId, 900, 96), 800, '#ffd9c2')}
${line('24시간 문의', fit('24시간 문의', 340, 46), 900, '#ffb020')}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#16101a"/><stop offset="0.5" stop-color="#0d0c0e"/><stop offset="1" stop-color="#140e12"/>
  </linearGradient>
  <radialGradient id="g1" cx="50%" cy="30%" r="60%">
    <stop offset="0" stop-color="#ff6b1f" stop-opacity="0.28"/><stop offset="1" stop-color="#ff6b1f" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="g2" cx="18%" cy="88%" r="55%">
    <stop offset="0" stop-color="#ff2f86" stop-opacity="0.24"/><stop offset="1" stop-color="#ff2f86" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ff6b1f"/><stop offset="1" stop-color="#ff2f86"/>
  </linearGradient>
  <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
    <rect width="60" height="60" fill="none"/>
    <rect width="60" height="1" fill="#ffffff" opacity="0.035"/>
    <rect width="1" height="60" fill="#ffffff" opacity="0.035"/>
  </pattern>
  <pattern id="dash" width="44" height="3" patternUnits="userSpaceOnUse">
    <rect width="22" height="3" fill="#ffb020" opacity="0.75"/>
  </pattern>
  <filter id="soft" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="15"/></filter>
</defs>

<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#grid)"/>
<rect width="${W}" height="${H}" fill="url(#g1)"/>
<rect width="${W}" height="${H}" fill="url(#g2)"/>
<rect x="34" y="34" width="${W - 68}" height="${H - 68}" fill="none" stroke="#ff6b1f" stroke-width="5" opacity="0.9"/>
${roads()}
${pin(150, 120, 30, '#ff2f86', 0.95)}
${pin(1050, 1080, 24, '#ffb020', 0.9)}
${pin(1062, 118, 16, '#ff6b1f', 0.8)}
${pin(140, 1082, 16, '#ff6b1f', 0.8)}

${line(name, nameSize, 300, '#ffb020')}
${mid}
</svg>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const items = [...VENUES, HUB];
  const report = [];
  for (const it of items) {
    const svg = svgFor(it);
    const out = path.join(OUT_DIR, `${it.og}.png`);
    let img = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 }).toBuffer();
    if (img.length > 300 * 1024) {
      img = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: 70, colors: 128, effort: 10 }).toBuffer();
    }
    fs.writeFileSync(out, img);
    const meta = await sharp(out).metadata();
    report.push({ file: `og/${it.og}.png`, w: meta.width, h: meta.height, kb: +(img.length / 1024).toFixed(1), ad: it.ad ? it.ad.nick : '' });
  }
  const bad = report.filter((r) => r.w !== 1200 || r.h !== 1200 || r.kb > 300);
  console.log(`생성 ${report.length}장 | 최대 ${Math.max(...report.map((r) => r.kb))}KB | 규격 위반 ${bad.length}건`);
  if (bad.length) { console.error(bad); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
