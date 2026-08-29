// /local/ 40페이지 생성 + sitemap.xml / llms.txt 갱신 (기존 11페이지 유지)
'use strict';

const fs = require('fs');
const path = require('path');
const { SITE } = require('../site');
const { PAGES } = require('../content');           // 기존 11페이지 (읽기 전용)
const { VENUES, HUB, GROUPS, BY_SLUG } = require('./index');

const ROOT = path.join(__dirname, '..', '..');
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FACT_LABEL = {
  road: '도로명 주소', jibun: '지번 / 행정구역', station: '가까운 역·터미널',
  building: '건물 / 층', age: '연령 기준',
};
const tagOf = (v) => {
  if (/확인 불가/.test(v)) return ['no', '확인 불가'];
  if (/출처마다 달라|엇갈림/.test(v)) return ['mix', '출처 엇갈림'];
  return ['ok', '교차확인'];
};

function head(p, { alt }) {
  const url = SITE.abs(p.path);
  const img = SITE.abs(`/og/${p.og}.png`);
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="google-site-verification" content="${SITE.gsv}">
<meta name="naver-site-verification" content="${SITE.nsv}" />
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:type" content="website">
<meta property="og:site_name" content="전국 나이트 동네 안내">
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
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230d0c0e'/%3E%3Cpath d='M16 4a8 8 0 0 0-8 8c0 6 8 16 8 16s8-10 8-16a8 8 0 0 0-8-8z' fill='%23ff2f86'/%3E%3Ccircle cx='16' cy='12' r='3' fill='%230d0c0e'/%3E%3C/svg%3E">
<link rel="alternate" type="application/rss+xml" title="${SITE.brand} 안내 RSS" href="${SITE.href('/rss.xml')}">
<link rel="stylesheet" href="${SITE.href('/assets/style.css')}">
<link rel="stylesheet" href="${SITE.href('/assets/local.css')}">`;
}

function jsonld(v) {
  const nightclub = {
    '@context': 'https://schema.org', '@type': 'NightClub',
    name: v.name, url: SITE.abs(v.path), image: SITE.abs(`/og/${v.og}.png`), description: v.desc,
  };
  const addr = { '@type': 'PostalAddress', addressCountry: 'KR' };
  if (!/확인 불가|출처마다/.test(v.facts.road)) addr.streetAddress = v.facts.road;
  if (!/확인 불가/.test(v.facts.jibun)) addr.addressLocality = v.facts.jibun;
  if (addr.streetAddress || addr.addressLocality) nightclub.address = addr;
  if (v.ad) nightclub.telephone = v.ad.phone;
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: v.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  // 검색엔진이 계층을 이해하도록 목록 → 개별 가게 경로를 명시
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '전국 나이트 동네 안내', item: SITE.abs('/area/local-1/') },
      { '@type': 'ListItem', position: 2, name: v.name, item: SITE.abs(v.path) },
    ],
  };
  return [nightclub, faq, crumbs].map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('\n');
}

function header(current) {
  return `<header class="signboard"><div class="wrap sign-in">
  <a class="sign-mark" href="${SITE.href('/area/local-1/')}"><span class="bulb" aria-hidden="true"></span>NIGHT MAP · KOREA</a>
  <span class="sign-note">공개 웹 정보 정리 · 확인일 ${SITE.checkedDate}</span>
</div></header>
<nav class="topnav" aria-label="섹션 이동"><div class="wrap"><ul>
  <li><a href="${SITE.href('/area/local-1/')}"${current === '/area/local-1/' ? ' aria-current="page"' : ''}>동네 지도 40</a></li>
  <li><a href="${SITE.href('/')}">수유샴푸나이트 안내</a></li>
</ul></div></nav>`;
}

function fixbar(v) {
  if (v && v.ad) {
    return `<a class="fixbar tel" href="tel:${v.ad.phone}">📞 ${v.name} ${v.ad.nick} ${v.ad.phone}</a>`;
  }
  return `<a class="fixbar" href="${SITE.kakao}" rel="noopener">💬 광고문의 카카오톡 ${SITE.kakaoId}</a>`;
}

function footer() {
  return `<footer><div class="wrap">
  <div class="ad-box">
    <strong>광고문의 카톡: ${SITE.kakaoId}</strong>
    <em>업소 등록·수정 문의도 같은 창구로 받습니다</em>
  </div>
  <div class="foot-note">
    <p>공개된 웹 정보를 정리했으며 실제와 다를 수 있습니다.</p>
    <p>확인일: ${SITE.checkedDate}</p>
    <p>확인되지 않은 요금·영업시간·연령 기준은 기재하지 않습니다.</p>
  </div>
</div></footer>`;
}

function venuePage(v) {
  const alt = `${v.name} ${v.topic}`;
  const img = SITE.href(`/og/${v.og}.png`);
  const rows = Object.entries(FACT_LABEL).map(([k, label]) => {
    const val = v.facts[k]; const [cls, txt] = tagOf(val);
    return `<tr><th scope="row">${esc(label)}</th><td>${esc(val)}<span class="tag ${cls}">${txt}</span></td></tr>`;
  }).join('') + `<tr><th scope="row">확인일</th><td>${SITE.checkedDate}<span class="tag ok">교차확인</span></td></tr>`;

  const near = v.links.map((s) => {
    const t = BY_SLUG[s];
    return `<li><a href="${SITE.href(t.path)}">${esc(t.name)}<span>${esc(t.area)}</span></a></li>`;
  }).join('');

  return `<!doctype html>
<html lang="ko">
<head>
${head(v, { alt })}
${jsonld(v)}
</head>
<body>
${header(v.path)}

<main class="wrap">
  <p class="local-badge">동네 한 바퀴 · ${esc(v.topic)}</p>
  <h1>${esc(v.title)}</h1>
  <div class="rule" aria-hidden="true"></div>

  <div class="lede">
${v.intro.map((s) => `    <p>${esc(s)}</p>`).join('\n')}
  </div>

  <div class="pinbox">
    <span class="pin" aria-hidden="true"></span>
    <dl>
      <dt>동네</dt><dd>${esc(v.area)}</dd>
      <dt>주제</dt><dd>${esc(v.topic)}</dd>
    </dl>
  </div>

  <div class="answer-box"><ol>${v.direct.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>

  <figure class="hero-shot">
    <img src="${img}" alt="${esc(v.name)} 동네 안내" width="1200" height="1200" style="max-width:100%;height:auto" loading="eager">
    <figcaption>동네 안내 이미지 — ${esc(v.topic)}</figcaption>
  </figure>

  <div class="fact-wrap"><table class="facts"><caption>공개 웹 정보 교차 확인표</caption><tbody>${rows}</tbody></table></div>

  <div class="street" aria-hidden="true"></div>

${v.sections.map((s) => `  <section><h2>${esc(s.h)}</h2>${s.p.map((t) => `<p>${esc(t)}</p>`).join('')}</section>`).join('\n')}

  <div class="final">
    <h2>${esc(v.answerH)}</h2>
${v.answerP.map((t) => `    <p>${esc(t)}</p>`).join('\n')}
  </div>

  <div class="act">
    <p>${esc(v.cta)}</p>
    <div class="copy-row">
      <button type="button" class="copy" data-copy="${esc(v.facts.road)}">도로명 주소 복사</button>
      <button type="button" class="copy alt" data-copy="${esc(v.facts.jibun)}">지번 복사</button>
      <span class="copy-msg" role="status" aria-live="polite"></span>
    </div>
  </div>

  <div class="faq">
    <h2>자주 묻는 질문</h2>
${v.faq.map((f) => `    <details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n')}
  </div>

  <p class="oneline">${esc(v.oneline)}</p>

  <div class="near">
    <h2>이웃 동네 보기</h2>
    <ul>
      <li><a href="${SITE.href('/area/local-1/')}">전국 나이트 동네 지도 40<span>40개 동네를 지역별로 묶은 목록</span></a></li>
${near}
    </ul>
  </div>
</main>

${footer()}
${fixbar(v)}
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

function hubPage() {
  const alt = '전국 나이트 동네 지도 40';
  const img = SITE.href(`/og/${HUB.og}.png`);
  const groups = GROUPS.map((g) => {
    const items = g.items.map((it) => {
      if (typeof it === 'object' && it.home) {
        return `<li><a class="home" href="${SITE.href('/')}">${esc(it.name)}<em>${esc(it.area)} · 이 사이트 홈</em></a></li>`;
      }
      const v = BY_SLUG[it];
      return `<li><a href="${SITE.href(v.path)}">${esc(v.name)}<em>${esc(v.area)}</em></a></li>`;
    }).join('\n');
    return `  <section class="region">
    <h2>${esc(g.region)} <span class="region-count">${g.items.length}곳</span></h2>
    <ul class="pinlist">
${items}
    </ul>
  </section>`;
  }).join('\n');

  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: HUB.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const listLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: HUB.title, url: SITE.abs(HUB.path), description: HUB.desc, inLanguage: 'ko-KR',
    image: SITE.abs(`/og/${HUB.og}.png`),
  };

  return `<!doctype html>
<html lang="ko">
<head>
${head({ ...HUB, path: '/area/local-1/' }, { alt })}
<script type="application/ld+json">${JSON.stringify(listLd)}</script>
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
</head>
<body>
${header('/area/local-1/')}

<main class="wrap">
  <p class="local-badge">동네 한 바퀴 · 전국 40</p>
  <h1>${esc(HUB.title)}</h1>
  <div class="rule" aria-hidden="true"></div>

  <div class="lede">
${HUB.intro.map((s) => `    <p>${esc(s)}</p>`).join('\n')}
  </div>

  <div class="answer-box"><ol>${HUB.direct.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>

  <figure class="hero-shot">
    <img src="${img}" alt="전국 나이트 동네 지도 40 안내" width="1200" height="1200" style="max-width:100%;height:auto" loading="eager">
    <figcaption>동네 안내 이미지 — 전국 40개 동네</figcaption>
  </figure>

  <div class="street" aria-hidden="true"></div>

${HUB.notes.map((s) => `  <section><h2>${esc(s.h)}</h2>${s.p.map((t) => `<p>${esc(t)}</p>`).join('')}</section>`).join('\n')}

${groups}

  <div class="faq">
    <h2>자주 묻는 질문</h2>
${HUB.faq.map((f) => `    <details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n')}
  </div>

  <p class="oneline">${esc(HUB.oneline)}</p>
</main>

${footer()}
${fixbar(null)}
</body>
</html>
`;
}

// ── 출력 ─────────────────────────────────────────────
for (const v of VENUES) {
  const out = path.join(ROOT, v.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, venuePage(v), 'utf8');
}
fs.writeFileSync(path.join(ROOT, HUB.file), hubPage(), 'utf8');

// sitemap.xml — 기존 11 + 신규 40
const all = [
  ...PAGES.map((p) => ({ path: p.path, pri: p.path === '/' ? '1.0' : '0.8' })),
  { path: '/area/local-1/', pri: '0.9' },
  ...VENUES.map((v) => ({ path: v.path, pri: '0.7' })),
];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  all.map((u) => `  <url>\n    <loc>${SITE.abs(u.path)}</loc>\n    <lastmod>${SITE.updatedISO}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`).join('\n') +
  `\n</urlset>\n`, 'utf8');

// llms.txt — 기존 11 + 신규 40
const B = SITE.brand;
fs.writeFileSync(path.join(ROOT, 'llms.txt'),
`# ${B}

> ${B} 전문 안내 사이트입니다. 서울특별시 강북구 도봉로 308(번동 449-1), 4호선 수유(강북구청)역 4번 출구 인근에 위치한 ${B}의 위치·방문 정보를 공개된 웹 정보만 교차 확인해 정리했습니다. 확인되지 않은 요금·영업시간·평점은 싣지 않습니다.
> /local/ 섹션에는 전국 나이트 40곳을 "그 동네의 상권·지형지물" 기준으로 정리한 안내가 있습니다.

## 수유샴푸나이트 (11)

${PAGES.map((p) => `- [${p.title}](${SITE.abs(p.path)}): ${p.desc}`).join('\n')}

## 전국 나이트 동네 안내 (40)

- [${HUB.title}](${SITE.abs(HUB.path)}): ${HUB.desc}
${VENUES.map((v) => `- [${v.title}](${SITE.abs(v.path)}): ${v.desc}`).join('\n')}

## 참고

- 확인일: ${SITE.checkedDate}
- 문의: 카카오톡 오픈채팅 ${SITE.kakaoId}
- 확인 불가 항목: 요금, 영업시간, 좌석 규모, 연령 분포
- 출처가 엇갈리는 항목은 "출처마다 달라 방문 전 확인 권장"으로 표기합니다.
`, 'utf8');

console.log(`빌드 완료: /local/ HTML ${VENUES.length + 1}개 + sitemap.xml(${all.length} URL) + llms.txt`);
