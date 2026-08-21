// 라이브 확인: sitemap.xml 의 모든 URL 을 실제로 받아서 상태/메타를 검사
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://satt-bhj.pages.dev';
const NAVER_KEY = '67dcc6a390692f4972b76917f6836a33';

function sitemapUrls() {
  const xml = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function probe(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const html = res.ok ? await res.text() : '';
    return {
      url,
      status: res.status,
      ms: Date.now() - started,
      bytes: html.length,
      naver: /naver-site-verification/.test(html),
      canonical: (html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/) || [])[1] || '',
      title: (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '',
      ogImage: (html.match(/property="og:image"[^>]+content="([^"]+)"/) || [])[1] || '',
    };
  } catch (e) {
    return { url, status: 0, ms: Date.now() - started, error: e.message };
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

(async () => {
  const urls = sitemapUrls();
  const extra = [`${ORIGIN}/robots.txt`, `${ORIGIN}/sitemap.xml`, `${ORIGIN}/llms.txt`, `${ORIGIN}/${NAVER_KEY}.txt`];
  const results = await mapLimit([...urls, ...extra], 8, probe);

  const pages = results.slice(0, urls.length);
  const infra = results.slice(urls.length);

  const bad = results.filter((r) => r.status !== 200);
  const noNaver = pages.filter((r) => !r.naver);
  const badCanon = pages.filter((r) => r.canonical !== r.url);
  const noOg = pages.filter((r) => !r.ogImage);

  console.log(`총 ${urls.length} 페이지 + 인프라 ${infra.length}개 확인`);
  console.log(`200 OK        : ${results.filter((r) => r.status === 200).length}/${results.length}`);
  console.log(`네이버 인증메타: ${pages.length - noNaver.length}/${pages.length}`);
  console.log(`canonical 자기참조: ${pages.length - badCanon.length}/${pages.length}`);
  console.log(`og:image      : ${pages.length - noOg.length}/${pages.length}`);
  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  console.log(`응답속도 중앙값 ${times[Math.floor(times.length / 2)]}ms / 최대 ${times[times.length - 1]}ms`);

  if (bad.length) console.log('\n[실패]', bad.map((r) => `${r.status} ${r.url}`).join('\n'));
  if (noNaver.length) console.log('\n[인증메타 없음]', noNaver.map((r) => r.url).join('\n'));
  if (badCanon.length) console.log('\n[canonical 불일치]', badCanon.map((r) => `${r.url} -> ${r.canonical}`).join('\n'));

  fs.writeFileSync(
    path.join(__dirname, '..', 'reports', 'live-check.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('\n원본: reports/live-check.json');
})();
