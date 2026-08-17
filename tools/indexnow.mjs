#!/usr/bin/env node
// 네이버 IndexNow 제출: sitemap.xml 의 전체 URL 을 청크 단위로 POST 하고 응답을 그대로 기록한다.
// 사용: node tools/indexnow.mjs            (전량 제출)
//       node tools/indexnow.mjs --dry      (제출 없이 대상만 출력)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const HOST = 'suy-e7e.pages.dev';
const ORIGIN = `https://${HOST}`;
const KEY = '67dcc6a390692f4972b76917f6836a33';
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;
const ENDPOINT = 'https://searchadvisor.naver.com/indexnow';
const CHUNK = 100;

const MEANING = {
  200: '접수',
  202: '접수(검증 대기)',
  400: '요청 형식 오류',
  403: '키 검증 실패',
  422: 'URL 이 host 와 불일치',
  429: '너무 잦은 요청',
};

const sitemapUrls = () =>
  [...fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

async function verifyKey() {
  const res = await fetch(KEY_LOCATION, { cache: 'no-store' });
  const body = (await res.text()).trim();
  return { status: res.status, ok: res.status === 200 && body === KEY, body: body.slice(0, 64) };
}

async function submit(urlList) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });
  return { status: res.status, text: (await res.text()).slice(0, 300).trim() };
}

const urls = sitemapUrls();
const bad = urls.filter((u) => !u.startsWith(`${ORIGIN}/`));
const lines = [];
const say = (s) => { console.log(s); lines.push(s); };

say(`[IndexNow] host=${HOST} / 대상 ${urls.length}건 / 키파일 ${KEY_LOCATION}`);
if (bad.length) say(`⚠ host 불일치 URL ${bad.length}건: ${bad.slice(0, 3).join(', ')}`);

const key = await verifyKey();
say(`키파일 라이브: HTTP ${key.status} / 내용일치 ${key.ok ? 'O' : `X (${key.body})`}`);
if (!key.ok) { say('→ 키 검증 실패. 제출 중단.'); process.exit(1); }

if (process.argv.includes('--dry')) { say('--dry: 제출하지 않고 종료'); process.exit(0); }

let accepted = 0;
for (let i = 0; i < urls.length; i += CHUNK) {
  const part = urls.slice(i, i + CHUNK);
  const r = await submit(part);
  const meaning = MEANING[r.status] ?? '알 수 없는 응답';
  if (r.status === 200 || r.status === 202) accepted += part.length;
  say(`청크 ${i / CHUNK + 1} (${part.length}건) → HTTP ${r.status} ${meaning}${r.text ? ` | ${r.text}` : ''}`);
  if (i + CHUNK < urls.length) await new Promise((r) => setTimeout(r, 1000));
}
say(`접수된 URL ${accepted}/${urls.length}건`);
say('※ IndexNow 는 "색인 요청"이지 "노출 보장"이 아니다.');

const out = path.join(ROOT, 'reports');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'indexnow-latest.md'), `# IndexNow 제출 기록\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`, 'utf8');
console.log(`\n리포트: reports/indexnow-latest.md`);
