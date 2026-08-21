// 네이버 IndexNow 등록: sitemap.xml 의 전체 URL 을 일괄 제출
const fs = require('fs');
const path = require('path');

const HOST = 'satt-bhj.pages.dev';
const ORIGIN = `https://${HOST}`;
const KEY = '67dcc6a390692f4972b76917f6836a33';
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;
const ENDPOINT = 'https://searchadvisor.naver.com/indexnow';

function sitemapUrls() {
  const xml = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function bulk(urlList) {
  const body = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  return { status: res.status, text: (await res.text()).slice(0, 300) };
}

async function single(url) {
  const q = `${ENDPOINT}?url=${encodeURIComponent(url)}&key=${KEY}&keyLocation=${encodeURIComponent(KEY_LOCATION)}`;
  const res = await fetch(q);
  return { url, status: res.status };
}

(async () => {
  const urls = sitemapUrls();
  console.log(`제출 대상 ${urls.length}건 / 키파일 ${KEY_LOCATION}`);

  const b = await bulk(urls);
  console.log(`\n[일괄 POST] ${ENDPOINT} -> HTTP ${b.status}`);
  if (b.text.trim()) console.log(`응답본문: ${b.text}`);

  // 일괄이 거부되면 건별 GET 으로 폴백
  if (b.status !== 200 && b.status !== 202) {
    console.log('\n일괄 실패 → 건별 GET 폴백');
    const results = [];
    for (const u of urls) {
      results.push(await single(u));
      await new Promise((r) => setTimeout(r, 150));
    }
    const ok = results.filter((r) => r.status === 200 || r.status === 202).length;
    console.log(`건별 성공 ${ok}/${results.length}`);
    results.filter((r) => r.status !== 200 && r.status !== 202).forEach((r) => console.log(`  실패 ${r.status} ${r.url}`));
  }
})();
