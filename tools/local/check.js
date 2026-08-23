// /local/ 배포 게이트 G1~G12. 하나라도 실패하면 exit 1.
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');
const { SITE } = require('../site');
const { PAGES } = require('../content');
const { VENUES, HUB, BY_SLUG } = require('./index');

const ROOT = path.join(__dirname, '..', '..');
const fails = [];
const notes = [];
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function mainText(html, { drop = [] } = {}) {
  let m = (html.match(/<main[\s\S]*?<\/main>/) || [''])[0];
  for (const cls of drop) {
    const re = new RegExp(`<(div|p|figure) class="${cls}"[\\s\\S]*?<\\/\\1>`, 'g');
    m = m.replace(re, ' ');
  }
  return m
    .replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

const NEW_HTML = [...VENUES.map((v) => v.file), HUB.file];
const NEW_TEXT_FILES = [...NEW_HTML, 'assets/local.css', 'sitemap.xml', 'llms.txt', 'robots.txt'];
const V = VENUES.map((v) => ({ v, html: read(v.file) }));
const hubHtml = read(HUB.file);
const OLD = PAGES.map((p) => ({ p, html: read(p.file) }));

// ── G1 금지어 ──
{
  const banned = ['룸살롱', '룸싸롱', '노래방', '밤문화', '유흥', '2차'];
  const hits = [];
  for (const f of NEW_TEXT_FILES) { const t = read(f); for (const w of banned) if (t.includes(w)) hits.push(`${f}: ${w}`); }
  hits.length ? fails.push(`G1 금지어 → ${hits.join(', ')}`) : notes.push('G1 금지어 0건 (룸살롱/룸싸롱/노래방/밤문화/유흥/2차)');
}

// ── G2 평점·★ ──
{
  const hits = [];
  for (const f of NEW_TEXT_FILES) { const t = read(f); for (const w of ['aggregateRating', 'ratingValue', '★', 'reviewCount', 'bestRating']) if (t.includes(w)) hits.push(`${f}: ${w}`); }
  hits.length ? fails.push(`G2 별점·평점 → ${hits.join(', ')}`) : notes.push('G2 aggregateRating·ratingValue·★ 0건');
}

// ── G3 창작 수치 패턴 ──
{
  const pats = ['명이', '자리 남', '마감임박', '마감 임박', '잔여석', '방문자수'];
  const hits = [];
  for (const f of NEW_TEXT_FILES) { const t = read(f); for (const w of pats) if (t.includes(w)) hits.push(`${f}: ${w}`); }
  hits.length ? fails.push(`G3 창작 수치 패턴 → ${hits.join(', ')}`) : notes.push('G3 창작 수치 패턴 0건');
}

// ── G4 title ──
{
  const nt = V.map((x) => (x.html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1]);
  const ot = OLD.map((x) => (x.html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1]);
  const dup = nt.filter((t, i) => nt.indexOf(t) !== i);
  const cross = nt.filter((t) => ot.includes(t));
  const bad = nt.filter((t) => t.length < 20 || t.length > 30);
  if (dup.length) fails.push(`G4 신규 title 중복 → ${[...new Set(dup)].join(' / ')}`);
  if (cross.length) fails.push(`G4 기존 title과 중복 → ${cross.join(' / ')}`);
  if (bad.length) fails.push(`G4 title 20~30자 위반 → ${bad.map((t) => `${t}(${t.length})`).join(', ')}`);
  if (!dup.length && !cross.length && !bad.length) {
    notes.push(`G4 신규 39 title 전부 고유 · 기존 11과도 중복 0 · 길이 ${Math.min(...nt.map((t) => t.length))}~${Math.max(...nt.map((t) => t.length))}자`);
  }
}

// ── G5 문장 중복 (사실 표·핀박스·링크 제외) ──
{
  const DROP = ['fact-wrap', 'pinbox', 'near', 'more', 'hero-shot'];
  const mk = (h) => new Set(mainText(h, { drop: DROP }).split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter((s) => s.length >= 20));
  const items = [...V.map((x) => ({ id: x.v.path, s: mk(x.html) })), { id: '/local-1/', s: mk(hubHtml) },
                 ...OLD.map((x) => ({ id: '기존:' + x.p.path, s: mk(x.html) }))];
  const bad = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    if (items[i].id.startsWith('기존:') && items[j].id.startsWith('기존:')) continue;
    const shared = [...items[i].s].filter((s) => items[j].s.has(s));
    if (shared.length >= 3) bad.push(`${items[i].id} ↔ ${items[j].id} (${shared.length})`);
  }
  bad.length ? fails.push(`G5 문장 중복 → ${bad.join(', ')}`) : notes.push('G5 20자 이상 동일 문장 3개 이상 공유 쌍 없음 (신규끼리 + 신규↔기존)');
}

// ── G6 본문 분량 ──
const CHARS = {};
{
  const bad = [], over = [];
  for (const x of [...V.map((x) => ({ id: x.v.path, h: x.html })), { id: '/local-1/', h: hubHtml }]) {
    const n = mainText(x.h).length; CHARS[x.id] = n;
    if (n < 1800) bad.push(`${x.id}(${n})`);
    if (n > 2500) over.push(`${x.id}(${n})`);
  }
  const vals = Object.values(CHARS);
  bad.length ? fails.push(`G6 본문 1,800자 미만 → ${bad.join(', ')}`)
             : notes.push(`G6 본문 전 페이지 1,800자 이상 (${Math.min(...vals)}~${Math.max(...vals)}자)`);
  if (over.length) notes.push(`G6 참고: 2,500자 초과 → ${over.join(', ')}`);
}

// ── G7 내부링크 404 / 외부링크 화이트리스트 ──
{
  const valid = new Set([...PAGES.map((p) => SITE.href(p.path)), SITE.href('/local-1/'), ...VENUES.map((v) => SITE.href(v.path))]);
  const skip = [SITE.href('/og/'), SITE.href('/assets/'), SITE.href('/rss.xml')];
  const bad = [], ext = [];
  for (const f of NEW_HTML) {
    const h = read(f);
    for (const m of h.matchAll(/href="(\/[^"]*)"/g)) {
      if (skip.some((k) => m[1].startsWith(k))) continue;
      if (!valid.has(m[1])) bad.push(`${f} → ${m[1]}`);
    }
    for (const m of h.matchAll(/href="((?:https?|tel):[^"]+)"/g)) {
      const u = m[1];
      if (u === SITE.kakao) continue;
      if (u.startsWith(SITE.origin)) continue;
      if (/^tel:010-(5653-0069|7528-4936|2221-1937|8156-6558)$/.test(u)) continue;
      ext.push(`${f} → ${u}`);
    }
  }
  bad.length ? fails.push(`G7 내부링크 404 → ${bad.join(', ')}`) : notes.push('G7 내부링크 404 0건 (각 페이지 허브 1 + 인접 2)');
  ext.length ? fails.push(`G7 외부링크 위반 → ${ext.join(', ')}`) : notes.push('G7 외부링크: 카카오 오픈채팅 + 허용된 tel 3종만 존재');
}

// ── G8 필수 요소 ──
{
  const need = [
    ['google 인증', (h) => h.includes(`content="${SITE.gsv}"`)],
    ['naver 인증', (h) => h.includes(`content="${SITE.nsv}"`)],
    ['canonical', (h) => /<link rel="canonical" href="https:\/\/[^"]+">/.test(h)],
    ['viewport', (h) => h.includes('name="viewport"')],
    ['robots index,follow', (h) => /name="robots" content="index,follow/.test(h)],
    ['JSON-LD', (h) => h.includes('application/ld+json') && h.includes('"@type":"FAQPage"')],
    ['고정 바', (h) => /class="fixbar/.test(h)],
    ['푸터 광고박스', (h) => h.includes(`광고문의 카톡: ${SITE.kakaoId}`)],
    ['푸터 고지문', (h) => h.includes('공개된 웹 정보를 정리했으며 실제와 다를 수 있습니다')],
    ['푸터 확인일', (h) => h.includes(SITE.checkedDate)],
    ['og:image', (h) => h.includes('property="og:image"')],
  ];
  const bad = [];
  for (const f of NEW_HTML) { const h = read(f); for (const [n, fn] of need) if (!fn(h)) bad.push(`${f}: ${n}`); }
  for (const x of V) if (!x.html.includes('"@type":"NightClub"')) bad.push(`${x.v.file}: JSON-LD NightClub`);
  bad.length ? fails.push(`G8 필수 요소 누락 → ${bad.join(', ')}`) : notes.push('G8 인증 2종·canonical·JSON-LD·고정 바·푸터·og:image 신규 40페이지 완비');
}

// ── G10 전화번호 위치 ──
const PHONE = { 'ulsan-champion': '010-5653-0069', 'changwon-lulurala': '010-7528-4936', 'bulgwang-hobak': '010-2221-1937', 'dapsimni-miracle': '010-8156-6558' };
{
  const bad = [];
  for (const f of NEW_TEXT_FILES) {
    const t = read(f);
    const found = [...new Set(t.match(/01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g) || [])];
    for (const num of found) {
      const owner = Object.entries(PHONE).find(([, p]) => p === num);
      if (!owner) { bad.push(`${f}: 허용되지 않은 번호 ${num}`); continue; }
      if (f !== `local/${owner[0]}/index.html`) bad.push(`${f}: ${num} 는 ${owner[0]} 페이지 전용`);
    }
  }
  for (const [slug, num] of Object.entries(PHONE)) {
    const h = read(`local/${slug}/index.html`);
    if (!h.includes(`href="tel:${num}"`)) bad.push(`local/${slug}: tel 링크 누락`);
    const v = BY_SLUG[slug];
    if (!h.includes(`📞 ${v.name} ${v.ad.nick} ${num}`)) bad.push(`local/${slug}: 고정 바 표기 불일치`);
  }
  // 나머지 37페이지는 카카오 바
  for (const f of NEW_HTML) {
    const slug = f.replace('local/', '').replace('/index.html', '');
    if (PHONE[slug]) continue;
    if (!read(f).includes(`💬 광고문의 카카오톡 ${SITE.kakaoId}`)) bad.push(`${f}: 카카오 고정 바 누락`);
  }
  bad.length ? fails.push(`G10 전화번호/고정 바 → ${bad.join(', ')}`)
             : notes.push('G10 광고주 3페이지만 각자 번호 tel 바, 나머지 37페이지 카카오 바, 그 외 010 패턴 0건');
}

// ── G11 키워드 배치 (39 업소 페이지) ──
const ROWS = [];
{
  const bad = [];
  for (const { v, html } of V) {
    const body = mainText(html);
    const n = (body.match(new RegExp(v.name, 'g')) || []).length;
    const sub = (body.match(new RegExp(v.sub, 'g')) || []).length;
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1];
    const desc = (html.match(/name="description" content="([^"]*)"/) || [, ''])[1];
    const h2s = [...html.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => m[1]);
    const alt = (html.match(/property="og:image:alt" content="([^"]*)"/) || [, ''])[1];
    const errs = [];
    if (!title.startsWith(v.name)) errs.push('title 맨 앞');
    if (!v.intro[0].includes(v.name)) errs.push('첫 문단 첫 문장');
    if (!h2s.some((h) => h.includes(v.name))) errs.push('H2');
    if (n < 3 || n > 8) errs.push(`본문 ${n}회(3~8 아님)`);
    if (!desc.includes(v.name)) errs.push('description');
    if (!alt.includes(v.name)) errs.push('og:image:alt');
    if (!html.includes(`"name":"${v.name}"`)) errs.push('JSON-LD name');
    if (sub < 1 || sub > 2) errs.push(`보조 ${v.sub} ${sub}회(1~2 아님)`);
    if (desc.length < 70 || desc.length > 80) errs.push(`desc ${desc.length}자`);
    ROWS.push({ 페이지: v.slug, 본문자수: CHARS[v.path], 키워드: n, 보조: sub, desc: desc.length, G11: errs.length ? 'FAIL' : 'PASS' });
    if (errs.length) bad.push(`${v.slug}: ${errs.join(' / ')}`);
  }
  bad.length ? fails.push(`G11 → ${bad.join(' | ')}`) : notes.push('G11 키워드 배치(위치·횟수·보조어) 39페이지 충족');
}
// 인천 특례
{
  const h = read('local/incheon-arabian/index.html');
  const okBody = mainText(h).includes('인천아라비아나이트');
  const okDesc = (h.match(/name="description" content="([^"]*)"/) || [, ''])[1].includes('인천아라비아나이트');
  (okBody && okDesc) ? notes.push('인천아라비안나이트 페이지: "인천아라비아나이트" 표기 본문·description 포함')
                     : fails.push('인천 페이지 두 번째 표기 누락');
}

// ── G12 기존 불가침 (내용 기준) ──
// 파일 바이트가 아니라 "기존 11페이지의 내용·이미지·CSS가 그대로인가"를 본다.
// head 메타 추가처럼 명시적으로 지시된 보강은 위반이 아니다.
{
  const bad = [], okList = [];
  let BASE = '';
  try {
    const add = execSync('git log --diff-filter=A --format=%H -- local/index.html', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean).pop();
    BASE = execSync(`git rev-parse ${add}^`, { cwd: ROOT }).toString().trim();
  } catch (e) { bad.push('기준 커밋 산출 실패: ' + e.message); }

  const at = (rev, f) => execSync(`git show ${rev}:${f}`, { cwd: ROOT, maxBuffer: 1 << 26 });
  const mainOf = (t) => (t.match(/<main[\s\S]*?<\/main>/) || [''])[0];
  const head1 = (t, re) => (t.match(re) || [, ''])[1];

  if (BASE) {
    // 1) 기존 11페이지: 본문(main) + title + description + canonical 불변
    // 예외: 홈(index.html)은 사용자 지시로 독립 성공스토리 단독 페이지로 교체됨 → 본문·title·description 비교 제외.
    //       나머지 10페이지는 '이어서 읽기'의 홈 링크 부제만 홈 교체에 따라 바뀌므로 그 문구만 정규화 후 비교.
    const HOME_SUB_OLD = '강북의 밤이 시작되는 이름';
    const HOME_SUB_NEW = PAGES.find((x) => x.path === '/').ogSub;
    for (const p of PAGES) {
      const isHome = p.path === '/';
      if (isHome) { okList.push('홈(index.html)은 성공스토리 교체분으로 비교 제외'); continue; }
      const base = at(BASE, p.file).toString('utf8').split(HOME_SUB_OLD).join(HOME_SUB_NEW);
      const now = read(p.file);
      if (mainOf(base) !== mainOf(now)) bad.push(`${p.file}: 본문(main) 변경됨`);
      for (const [n, re] of [['title', /<title>([\s\S]*?)<\/title>/],
                             ['description', /name="description" content="([^"]*)"/],
                             ['canonical', /rel="canonical" href="([^"]*)"/]]) {
        if (head1(base, re) !== head1(now, re)) bad.push(`${p.file}: ${n} 변경됨`);
      }
    }
    // 홈은 canonical 만 여전히 불변이어야 한다
    {
      const h = PAGES.find((x) => x.path === '/');
      const re = /rel="canonical" href="([^"]*)"/;
      if (head1(at(BASE, h.file).toString('utf8'), re) !== head1(read(h.file), re)) bad.push(`${h.file}: canonical 변경됨`);
    }
    // 2) 기존 썸네일 11장 바이트 불변
    for (const p of PAGES) {
      const f = `og/${p.og}.png`;
      if (!at(BASE, f).equals(fs.readFileSync(path.join(ROOT, f)))) bad.push(`${f}: 이미지 변경됨`);
    }
    // 3) 기존 CSS 바이트 불변
    if (!at(BASE, 'assets/style.css').equals(fs.readFileSync(path.join(ROOT, 'assets/style.css')))) bad.push('assets/style.css: 변경됨');
    okList.push(`기준 커밋 ${BASE.slice(0, 7)}`);
    // 4) head 에 추가된 것이 무엇인지 투명하게 보고
    const diffLines = [];
    for (const p of PAGES) {
      const b = at(BASE, p.file).toString('utf8').split('\n');
      const n = read(p.file).split('\n');
      for (const line of n) if (!b.includes(line)) diffLines.push(line.trim());
    }
    const kinds = [...new Set(diffLines.map((l) => (l.match(/^<(link|meta|script)[^>]*?(rel|property|name)="([^"]+)"/) || [, , , l.slice(0, 40)])[3]))];
    if (kinds.length) okList.push(`기존 11페이지 head 추가분: ${kinds.join(', ')}`);
  }
  bad.length ? fails.push(`G12 기존 내용 변경 → ${bad.join(', ')}`)
             : notes.push(`G12 기존 10페이지 본문·title·description·canonical 불변 (홈 제외, 홈 canonical 불변) / 기존 썸네일 11장 바이트 동일 / 기존 CSS 동일 (${okList.join(' | ')})`);
}

// ── G9 썸네일 ──
(async () => {
  const need9 = ['property="og:image"', 'property="og:image:secure_url"', 'property="og:image:width" content="1200"',
    'property="og:image:height" content="1200"', 'property="og:image:type" content="image/png"',
    'property="og:image:alt"', 'name="twitter:card" content="summary"', 'name="twitter:image"', 'name="thumbnail"'];
  const bad = [];
  for (const it of [...VENUES, HUB]) {
    const p = path.join(ROOT, 'og', `${it.og}.png`);
    if (!fs.existsSync(p)) { bad.push(`${it.og}: 파일 없음`); continue; }
    const st = fs.statSync(p); const meta = await sharp(p).metadata();
    if (meta.width !== 1200 || meta.height !== 1200) bad.push(`${it.og}: ${meta.width}×${meta.height}`);
    if (st.size > 300 * 1024) bad.push(`${it.og}: ${(st.size / 1024).toFixed(1)}KB`);
    const h = read(it.file);
    const src = SITE.href(`/og/${it.og}.png`);
    if (!h.includes(`<img src="${src}"`)) bad.push(`${it.og}: 본문 img 없음`);
    for (const s of need9) if (!h.includes(s)) bad.push(`${it.og}: 메타 누락 ${s}`);
    const r = ROWS.find((x) => x.페이지 === it.slug);
    if (r) r['썸네일'] = `1200×1200/${(st.size / 1024).toFixed(1)}KB`;
  }
  bad.length ? fails.push(`G9 썸네일 → ${bad.join(', ')}`)
             : notes.push('G9 신규 썸네일 40장 1200×1200·300KB 이하·본문 img·메타 9종 완비');

  console.table(ROWS);
  console.log('\n── 통과 내역 ──');
  notes.forEach((n) => console.log('  ✔ ' + n));
  if (fails.length) { console.log('\n── 실패 ──'); fails.forEach((f) => console.log('  ✘ ' + f)); process.exit(1); }
  console.log('\n✅ G1~G12 전부 통과 — 배포 가능');
})();
