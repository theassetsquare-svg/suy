// 배포 게이트 G1~G12. 하나라도 실패하면 exit 1.
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { SITE } = require('./site');
const { PAGES } = require('./content');

const ROOT = path.join(__dirname, '..');
const B = SITE.brand;
const fails = [];
const notes = [];
const rows = [];

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// <main> 안쪽 텍스트만 추출 (스크립트/스타일 제거, 태그 제거)
function mainText(html, { dropTable = false } = {}) {
  let m = (html.match(/<main[\s\S]*?<\/main>/) || [''])[0];
  if (dropTable) m = m.replace(/<div class="fact-wrap">[\s\S]*?<\/div>/, ' ');
  return m
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const files = PAGES.map((p) => ({ p, html: read(p.file) }));
const allFiles = [
  ...PAGES.map((p) => p.file),
  'assets/style.css', 'robots.txt', 'sitemap.xml', 'llms.txt',
];

// ── G1 금지어 ──
{
  const banned = ['룸살롱', '룸싸롱', '노래방', '밤문화', '유흥', '2차'];
  const hits = [];
  for (const f of allFiles) {
    const t = read(f);
    for (const w of banned) if (t.includes(w)) hits.push(`${f}: ${w}`);
  }
  hits.length ? fails.push(`G1 금지어 발견 → ${hits.join(', ')}`) : notes.push('G1 금지어 0건 (룸살롱/룸싸롱/노래방/밤문화/유흥/2차)');
}

// ── G2 별점/평점 ──
{
  const hits = [];
  for (const f of allFiles) {
    const t = read(f);
    for (const w of ['aggregateRating', 'ratingValue', '★', 'reviewCount', 'bestRating']) if (t.includes(w)) hits.push(`${f}: ${w}`);
  }
  hits.length ? fails.push(`G2 별점·평점 요소 발견 → ${hits.join(', ')}`) : notes.push('G2 aggregateRating·ratingValue·★ 0건');
}

// ── G3 창작 수치 패턴 ──
{
  const pats = ['명이', '자리 남', '마감임박', '마감 임박', '잔여석', '방문자수'];
  const hits = [];
  for (const f of allFiles) {
    const t = read(f);
    for (const w of pats) if (t.includes(w)) hits.push(`${f}: ${w}`);
  }
  hits.length ? fails.push(`G3 창작 수치 패턴 발견 → ${hits.join(', ')}`) : notes.push('G3 창작 수치 패턴 0건');
}

// ── G4 title 중복 / 길이 ──
{
  const titles = files.map((f) => (f.html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1]);
  const dup = titles.filter((t, i) => titles.indexOf(t) !== i);
  const bad = titles.filter((t) => t.length < 20 || t.length > 30);
  if (dup.length) fails.push(`G4 title 중복 → ${[...new Set(dup)].join(' / ')}`);
  if (bad.length) fails.push(`G4 title 길이 20~30자 위반 → ${bad.map((t) => `${t}(${t.length}자)`).join(', ')}`);
  if (!dup.length && !bad.length) notes.push(`G4 title 11개 전부 고유 · 길이 ${Math.min(...titles.map((t) => t.length))}~${Math.max(...titles.map((t) => t.length))}자`);
}

// ── G5 페이지 쌍 문장 중복 (사실 표 제외) ──
{
  const sents = files.map((f) => {
    const t = mainText(f.html, { dropTable: true });
    return new Set(t.split(/(?<=[.?!。])\s+/).map((s) => s.trim()).filter((s) => s.length >= 20));
  });
  const bad = [];
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const shared = [...sents[i]].filter((s) => sents[j].has(s));
      if (shared.length >= 3) bad.push(`${files[i].p.path} ↔ ${files[j].p.path} (${shared.length}개)`);
    }
  }
  bad.length ? fails.push(`G5 페이지 쌍 문장 중복 → ${bad.join(', ')}`) : notes.push('G5 20자 이상 동일 문장 3개 이상 공유하는 페이지 쌍 없음');
}

// ── G6 본문 분량 ──
{
  const bad = [], over = [];
  for (const f of files) {
    const n = mainText(f.html).length;
    f.chars = n;
    if (n < 1800) bad.push(`${f.p.path}(${n}자)`);
    if (n > 2500) over.push(`${f.p.path}(${n}자)`);
  }
  if (bad.length) fails.push(`G6 본문 1,800자 미만 → ${bad.join(', ')}`);
  else notes.push(`G6 본문 전 페이지 1,800자 이상 (${Math.min(...files.map((f) => f.chars))}~${Math.max(...files.map((f) => f.chars))}자)`);
  if (over.length) notes.push(`G6 참고: 2,500자 초과 페이지 → ${over.join(', ')}`);
}

// ── G7 내부링크 404 ──
{
  const valid = new Set(PAGES.map((p) => SITE.href(p.path)));
  const skip = [SITE.href('/og/'), SITE.href('/assets/')];
  const bad = [];
  for (const f of files) {
    const hrefs = [...f.html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
    for (const h of hrefs) {
      if (skip.some((k) => h.startsWith(k))) continue;
      if (!valid.has(h)) bad.push(`${f.p.path} → ${h}`);
    }
  }
  bad.length ? fails.push(`G7 내부링크 404 → ${bad.join(', ')}`) : notes.push('G7 내부링크 404 0건 (각 페이지 홈 1 + 관련 2)');
}

// ── G7b 외부 링크 화이트리스트 ──
{
  const bad = [];
  for (const f of files) {
    const ext = [...f.html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
    for (const u of ext) {
      if (u === SITE.kakao) continue;
      if (u.startsWith(SITE.origin)) continue; // canonical 등 자기 도메인
      bad.push(`${f.p.path} → ${u}`);
    }
  }
  bad.length ? fails.push(`외부 링크 규칙 위반 → ${bad.join(', ')}`) : notes.push('외부 링크: 허용된 카카오 오픈채팅 1개만 존재');
}

// ── G8 필수 요소 ──
{
  const need = [
    ['google-site-verification', (h) => h.includes(`content="${SITE.gsv}"`)],
    ['naver-site-verification', (h) => h.includes(`<meta name="naver-site-verification" content="${SITE.nsv}" />`)],
    ['canonical', (h) => /<link rel="canonical" href="https:\/\/[^"]+">/.test(h)],
    ['viewport', (h) => h.includes('name="viewport"')],
    ['JSON-LD NightClub', (h) => h.includes('"@type":"NightClub"')],
    ['JSON-LD FAQPage', (h) => h.includes('"@type":"FAQPage"')],
    ['하단 고정 바', (h) => h.includes('class="fixbar"') && h.includes(SITE.kakao)],
    ['푸터 광고문의 박스', (h) => h.includes(`광고문의 카톡: ${SITE.kakaoId}`)],
    ['푸터 고지문', (h) => h.includes('공개된 웹 정보를 정리했으며 실제와 다를 수 있습니다')],
    ['푸터 확인일', (h) => h.includes(SITE.checkedDate)],
    ['og:image', (h) => h.includes('property="og:image"')],
  ];
  // 홈(/)은 독립 성공스토리 단독 페이지 → 고정 바·푸터·FAQ 스키마가 없는 것이 정상
  const homeSkip = new Set(['JSON-LD FAQPage', '하단 고정 바', '푸터 광고문의 박스', '푸터 고지문', '푸터 확인일']);
  const bad = [];
  for (const f of files) for (const [n, fn] of need) {
    if (f.p.path === '/' && homeSkip.has(n)) continue;
    if (!fn(f.html)) bad.push(`${f.p.path}: ${n}`);
  }
  if (!files[0].html.includes('"@type":"WebSite"')) bad.push('/: JSON-LD WebSite');
  bad.length ? fails.push(`G8 필수 요소 누락 → ${bad.join(', ')}`) : notes.push('G8 인증·canonical·JSON-LD·고정 바·푸터·og:image 완비 (홈은 단독 페이지 예외 5항목)');
}

// ── G10 전화번호 ──
{
  const hits = [];
  for (const f of allFiles) {
    const t = read(f);
    const m = t.match(/01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g);
    if (m) hits.push(`${f}: ${m.join(',')}`);
  }
  hits.length ? fails.push(`G10 전화번호 발견 → ${hits.join(', ')}`) : notes.push('G10 사이트 전체 010 패턴 0건');
}

// ── G11 키워드 배치 ──
{
  const bad = [];
  for (const f of files) {
    const html = f.html, p = f.p;
    const body = mainText(html);
    const n = (body.match(new RegExp(B, 'g')) || []).length;
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1];
    const desc = (html.match(/name="description" content="([^"]*)"/) || [, ''])[1];
    const h2s = [...html.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => m[1]);
    const firstSent = p.intro[0];
    const alt = (html.match(/property="og:image:alt" content="([^"]*)"/) || [, ''])[1];
    const ld = html.includes(`"name":"${B}"`);
    const sub = (body.match(/수유나이트/g) || []).length;
    const gb = (body.match(/강북/g) || []).length;
    const st = (body.match(/수유역/g) || []).length;

    const errs = [];
    if (!title.startsWith(B)) errs.push('title 맨 앞');
    if (p.path !== '/' && !firstSent.includes(B)) errs.push('첫 문단 첫 문장');
    if (!h2s.some((h) => h.includes(B))) errs.push('H2');
    if (n < 3 || n > 5) errs.push(`본문 횟수 ${n}회(3~5 아님)`);
    if (!desc.includes(B)) errs.push('description');
    if (!alt.includes(B)) errs.push('og:image:alt');
    if (!ld) errs.push('JSON-LD name');
    if (sub < 1) errs.push('보조 수유나이트 0회');
    if (gb < 1) errs.push('강북 0회');
    if (st < 1) errs.push('수유역 0회');

    // description 70~80자
    if (desc.length < 70 || desc.length > 80) errs.push(`description ${desc.length}자(70~80 아님)`);

    rows.push({ 페이지: p.path, 본문자수: f.chars, 키워드: n, 수유나이트: sub, 강북: gb, 수유역: st, desc: desc.length, G11: errs.length ? 'FAIL' : 'PASS' });
    if (errs.length) bad.push(`${p.path}: ${errs.join(' / ')}`);
  }
  bad.length ? fails.push(`G11 키워드 배치 위반 → ${bad.join(' | ')}`) : notes.push('G11 키워드 배치(위치·횟수) 전 페이지 충족');
}

// ── G9 썸네일 ──
(async () => {
  const bad = [];
  const need9 = [
    'property="og:image"', 'property="og:image:secure_url"', 'property="og:image:width" content="1200"',
    'property="og:image:height" content="1200"', 'property="og:image:type" content="image/png"',
    'property="og:image:alt"', 'name="twitter:card" content="summary"', 'name="twitter:image"', 'name="thumbnail"',
  ];
  for (const f of files) {
    const file = path.join(ROOT, 'og', `${f.p.og}.png`);
    if (!fs.existsSync(file)) { bad.push(`${f.p.path}: 썸네일 없음`); continue; }
    const st = fs.statSync(file);
    const meta = await sharp(file).metadata();
    if (meta.width !== 1200 || meta.height !== 1200) bad.push(`${f.p.path}: ${meta.width}×${meta.height}`);
    if (st.size > 300 * 1024) bad.push(`${f.p.path}: ${(st.size / 1024).toFixed(1)}KB > 300KB`);
    const imgSrc = SITE.href(`/og/${f.p.og}.png`);
    if (f.p.path !== '/') {
      if (!f.html.includes(`<img src="${imgSrc}"`)) bad.push(`${f.p.path}: 본문 img 없음`);
      const altM = f.html.match(/<img src="[^"]*\/og\/[^"]+" alt="([^"]*)"/);
      if (!altM || !altM[1].includes(B)) bad.push(`${f.p.path}: 본문 img alt에 가게이름 없음`);
    }
    for (const s of need9) if (!f.html.includes(s)) bad.push(`${f.p.path}: 메타 누락 ${s}`);
    const r = rows.find((x) => x.페이지 === f.p.path);
    if (r) { r['썸네일'] = `${meta.width}×${meta.height} / ${(st.size / 1024).toFixed(1)}KB`; r['본문img'] = f.html.includes(`<img src="${imgSrc}"`) ? 'O' : 'X'; }
  }
  bad.length ? fails.push(`G9 썸네일 → ${bad.join(', ')}`) : notes.push('G9 썸네일 11장 1200×1200·300KB 이하·본문 img·메타 9종·alt 가게이름 완비');

  // ── G12 홈 단독 스토리 페이지 불변식 ──
  {
    const h = files.find((f) => f.p.path === '/').html;
    const main = (h.match(/<main[\s\S]*?<\/main>/) || [''])[0];
    const errs = [];
    if (/<header/.test(h)) errs.push('헤더 존재');
    if (/<footer/.test(h)) errs.push('푸터 존재');
    if (/<nav/.test(h)) errs.push('내비 존재');
    if (/class="fixbar"/.test(h)) errs.push('고정 통화바 존재');
    if (/<a\s/.test(main)) errs.push('본문 링크 존재');
    if (/<img/.test(main)) errs.push('본문 이미지 존재');
    const n = mainText(h).length;
    if (n < 2000) errs.push(`본문 ${n}자 < 2,000자`);
    errs.length ? fails.push(`G12 홈 단독 스토리 위반 → ${errs.join(', ')}`)
                : notes.push(`G12 홈 단독 스토리: 헤더·내비·푸터·고정바·본문링크·이미지 0 / 본문 ${n}자`);
  }

  console.table(rows);
  console.log('\n── 통과 내역 ──');
  notes.forEach((n) => console.log('  ✔ ' + n));
  if (fails.length) {
    console.log('\n── 실패 ──');
    fails.forEach((f) => console.log('  ✘ ' + f));
    process.exit(1);
  }
  console.log('\n✅ G1~G12 전부 통과 — 배포 가능');
})();
