// rss.xml 생성 — 네이버 서치어드바이저 RSS 제출용 (전 페이지 수집 경로 추가)
'use strict';
const fs = require('fs');
const path = require('path');
const { SITE } = require('./site');
const { PAGES } = require('./content');
const { VENUES, HUB } = require('./local/index');

const ROOT = path.join(__dirname, '..');
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pub = new Date(`${SITE.updatedISO}T09:00:00+09:00`).toUTCString();

const items = [
  ...PAGES.map((p) => ({ title: p.title, desc: p.desc, path: p.path })),
  { title: HUB.title, desc: HUB.desc, path: HUB.path },
  ...VENUES.map((v) => ({ title: v.title, desc: v.desc, path: v.path })),
].map((it) => `  <item>
    <title>${esc(it.title)}</title>
    <link>${SITE.abs(it.path)}</link>
    <guid isPermaLink="true">${SITE.abs(it.path)}</guid>
    <description>${esc(it.desc)}</description>
    <pubDate>${pub}</pubDate>
  </item>`).join('\n');

fs.writeFileSync(path.join(ROOT, 'rss.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(SITE.brand)} 안내</title>
  <link>${SITE.abs('/')}</link>
  <atom:link href="${SITE.abs('/rss.xml')}" rel="self" type="application/rss+xml" />
  <description>${esc(SITE.brand)} 위치·방문 정보와 전국 나이트 동네 안내를 공개 웹 정보만 교차 확인해 정리한 사이트입니다.</description>
  <language>ko</language>
  <lastBuildDate>${pub}</lastBuildDate>
${items}
</channel>
</rss>
`, 'utf8');
console.log(`rss.xml 생성 완료: ${PAGES.length + 1 + VENUES.length}개 항목`);
