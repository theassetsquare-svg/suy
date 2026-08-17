// 11페이지 HTML + sitemap.xml + robots.txt + llms.txt 생성
'use strict';

const fs = require('fs');
const path = require('path');
const { SITE, FACT_ROWS } = require('./site');
const { PAGES } = require('./content');

const ROOT = path.join(__dirname, '..');
const B = SITE.brand;

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TAG = { confirmed: ['ok', '교차확인'], conflict: ['mix', '출처 엇갈림'], unknown: ['no', '확인 불가'] };

function head(p) {
  const url = SITE.abs(p.path);
  const img = SITE.abs(`/og/${p.og}.png`);
  const alt = `${B} ${p.topic}`;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="google-site-verification" content="${SITE.gsv}">
<meta name="naver-site-verification" content="${SITE.nsv}" />
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${B} 안내">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:secure_url" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="${esc(alt)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.desc)}">
<meta name="twitter:image" content="${img}">
<meta name="thumbnail" content="${img}">
<link rel="image_src" href="${img}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230d0c0e'/%3E%3Crect x='5' y='5' width='22' height='22' fill='none' stroke='%23ff6b1f' stroke-width='3'/%3E%3Crect x='13' y='13' width='6' height='6' fill='%23ff2f86'/%3E%3C/svg%3E">
<link rel="stylesheet" href="${SITE.href('/assets/style.css')}">`;
}

function jsonld(p) {
  const url = SITE.abs(p.path);
  const nightclub = {
    '@context': 'https://schema.org',
    '@type': 'NightClub',
    name: B,
    url,
    image: SITE.abs(`/og/${p.og}.png`),
    description: p.desc,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'KR',
      addressRegion: '서울특별시',
      addressLocality: '강북구',
      streetAddress: '도봉로 308 (번동)',
    },
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: p.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const blocks = [nightclub, faq];
  if (p.path === '/') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: `${B} 전문 안내`,
      url: SITE.abs('/'),
      inLanguage: 'ko-KR',
      description: `${B} 위치와 방문 정보를 공개 웹 정보만으로 정리한 안내 사이트`,
    });
  }
  return blocks
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b, null, 0)}</script>`)
    .join('\n');
}

function nav(current) {
  const items = PAGES.map((p) => {
    const label = p.path === '/' ? '홈' : p.topic;
    const cur = p.path === current ? ' aria-current="page"' : '';
    return `<li><a href="${SITE.href(p.path)}"${cur}>${esc(label)}</a></li>`;
  }).join('');
  return `<nav class="topnav" aria-label="페이지 목록"><div class="wrap"><ul>${items}</ul></div></nav>`;
}

function factTable() {
  const rows = FACT_ROWS.map((r) => {
    const [cls, txt] = TAG[r.status];
    return `<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.value)}<span class="tag ${cls}">${txt}</span></td></tr>`;
  }).join('');
  return `<div class="fact-wrap"><table class="facts"><caption>공개 웹 정보 교차 확인표</caption><tbody>${rows}</tbody></table></div>`;
}

function page(p) {
  const img = SITE.href(`/og/${p.og}.png`);
  const alt = `${B} ${p.topic}`;

  const lede = p.intro.map((s) => `<p>${esc(s)}</p>`).join('\n');
  const direct = p.direct.map((s) => `<li>${esc(s)}</li>`).join('');
  const secs = p.sections
    .map((s) => `<section><h2>${esc(s.h)}</h2>${s.p.map((t) => `<p>${esc(t)}</p>`).join('')}</section>`)
    .join('\n');
  const faq = p.faq
    .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
    .join('\n');
  const links = [['/', '안내 홈으로 돌아가기'], ...p.links]
    .filter((l) => l[0] !== p.path)
    .map(([href, label]) => {
      const t = PAGES.find((x) => x.path === href);
      return `<li><a href="${SITE.href(href)}">${esc(label)}<span>${esc(t ? t.ogSub : '')}</span></a></li>`;
    })
    .join('');

  return `<!doctype html>
<html lang="ko">
<head>
${head(p)}
${jsonld(p)}
</head>
<body>
<header class="signboard"><div class="wrap sign-in">
  <a class="sign-mark" href="${SITE.href('/')}"><span class="bulb" aria-hidden="true"></span>SUYU SHAMPOO NIGHT</a>
  <span class="sign-note">공개 웹 정보 정리 · 확인일 ${SITE.checkedDate}</span>
</div></header>
${nav(p.path)}

<main class="wrap">
  <h1>${esc(p.title)}</h1>
  <div class="rule" aria-hidden="true"></div>

  <div class="lede">
${lede}
  </div>

  <div class="answer-box"><ol>${direct}</ol></div>

  <figure class="hero-shot">
    <img src="${img}" alt="${esc(alt)}" width="1200" height="1200" style="max-width:100%;height:auto" loading="eager">
    <figcaption>안내 이미지 — ${esc(p.ogSub)}</figcaption>
  </figure>

${factTable()}

${secs}

  <div class="final">
    <h2>${esc(p.answerH)}</h2>
${p.answerP.map((t) => `    <p>${esc(t)}</p>`).join('\n')}
  </div>

  <div class="act">
    <p>${esc(p.cta)}</p>
    <div class="copy-row">
      <button type="button" class="copy" data-copy="서울특별시 강북구 도봉로 308">도로명 주소 복사</button>
      <button type="button" class="copy alt" data-copy="서울특별시 강북구 번동 449-1">지번 주소 복사</button>
      <span class="copy-msg" role="status" aria-live="polite"></span>
    </div>
  </div>

  <div class="faq">
    <h2>자주 묻는 질문</h2>
${faq}
  </div>

  <p class="oneline">${esc(p.oneline)}</p>

  <div class="more">
    <h2>이어서 읽기</h2>
    <ul>${links}</ul>
  </div>
</main>

<footer><div class="wrap">
  <div class="ad-box">
    <strong>광고문의 카톡: ${SITE.kakaoId}</strong>
    <em>문의는 카카오톡 오픈채팅 한 곳으로만 받습니다</em>
  </div>
  <div class="foot-note">
    <p>공개된 웹 정보를 정리했으며 실제와 다를 수 있습니다.</p>
    <p>확인일: ${SITE.checkedDate}</p>
    <p>본 페이지는 요금·영업시간 등 확인되지 않은 정보를 임의로 기재하지 않습니다.</p>
  </div>
</div></footer>

<a class="fixbar" href="${SITE.kakao}" rel="noopener">💬 광고문의 카카오톡 ${SITE.kakaoId}</a>

<script>
document.querySelectorAll('button.copy').forEach(function(b){
  b.addEventListener('click', function(){
    var t = b.getAttribute('data-copy');
    var msg = b.parentNode.querySelector('.copy-msg');
    var done = function(){ msg.textContent = '복사됨: ' + t; setTimeout(function(){ msg.textContent=''; }, 2600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, function(){ msg.textContent = t; });
    } else {
      var ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch(e){ msg.textContent = t; }
      document.body.removeChild(ta);
    }
  });
});
</script>
</body>
</html>
`;
}

// ── 출력 ──────────────────────────────────────────────
for (const p of PAGES) {
  const out = path.join(ROOT, p.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, page(p), 'utf8');
}

// sitemap.xml
const urls = PAGES.map((p) => `  <url>
    <loc>${SITE.abs(p.path)}</loc>
    <lastmod>${SITE.checkedISO}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p.path === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n');
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, 'utf8');

// robots.txt
fs.writeFileSync(path.join(ROOT, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nUser-agent: Yeti\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nSitemap: ${SITE.abs('/sitemap.xml')}\n`, 'utf8');

// llms.txt
const list = PAGES.map((p) => `- [${p.title}](${SITE.abs(p.path)}): ${p.desc}`).join('\n');
fs.writeFileSync(path.join(ROOT, 'llms.txt'),
  `# ${B}\n\n> ${B} 전문 안내 사이트입니다. 서울특별시 강북구 도봉로 308(번동 449-1), 4호선 수유(강북구청)역 4번 출구 인근에 위치한 ${B}의 위치·방문 정보를 공개된 웹 정보만 교차 확인해 정리했습니다. 확인되지 않은 요금·영업시간·평점은 싣지 않습니다.\n\n## 페이지 (11)\n\n${list}\n\n## 참고\n\n- 확인일: ${SITE.checkedDate}\n- 문의: 카카오톡 오픈채팅 ${SITE.kakaoId}\n- 확인 불가 항목: 요금, 영업시간, 좌석 규모, 연령 분포\n- 출처 엇갈림 항목: 주차 운영 방식\n`, 'utf8');

console.log(`빌드 완료: HTML ${PAGES.length}개 + sitemap.xml + robots.txt + llms.txt`);
