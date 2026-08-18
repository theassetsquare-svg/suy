// G9+ 썸네일 노출 조건 게이트 — 전 HTML 페이지 대상
'use strict';
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const {SITE}=require('./site');
const ROOT=path.join(__dirname,'..');
function walk(d,acc=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){
  if(['node_modules','.git','tools','og','assets'].includes(e.name))continue;
  const p=path.join(d,e.name);
  if(e.isDirectory())walk(p,acc); else if(e.name.endsWith('.html'))acc.push(path.relative(ROOT,p));
}return acc;}
const META=[
 ['og:image', h=>/property="og:image" content="https:\/\/[^"]+\.png"/.test(h)],
 ['og:image:secure_url', h=>/property="og:image:secure_url" content="https:\/\/[^"]+\.png"/.test(h)],
 ['og:image:width=1200', h=>h.includes('property="og:image:width" content="1200"')],
 ['og:image:height=1200', h=>h.includes('property="og:image:height" content="1200"')],
 ['og:image:type=image/png', h=>h.includes('property="og:image:type" content="image/png"')],
 ['og:image:alt', h=>/property="og:image:alt" content="[^"]+"/.test(h)],
 ['twitter:card=summary', h=>h.includes('name="twitter:card" content="summary"')],
 ['twitter:image', h=>/name="twitter:image" content="https:\/\/[^"]+\.png"/.test(h)],
 ['thumbnail', h=>/name="thumbnail" content="https:\/\/[^"]+\.png"/.test(h)],
];
(async()=>{
const files=walk(ROOT).sort();
const fails=[]; const rows=[];
for(const f of files){
  const h=fs.readFileSync(path.join(ROOT,f),'utf8');
  const errs=[];
  const ogM=h.match(/property="og:image" content="([^"]+)"/);
  const imM=h.match(/<img src="([^"]*\/og\/[^"]+)"[^>]*>/);
  const ogFile=ogM?ogM[1].split('/').pop():null;
  const imFile=imM?imM[1].split('/').pop():null;
  const isHome = f === 'index.html';   // 홈은 글만 노출하는 단독 스토리 페이지
  // ① 본문 img 존재 (홈 예외)
  if(!imM && !isHome) errs.push('본문 img 없음');
  // ② og:image = 본문 img 동일 파일
  if(ogFile&&imFile&&ogFile!==imFile) errs.push('og:image≠본문img');
  // ③ 메타 9종
  for(const [n,fn] of META) if(!fn(h)) errs.push('메타 '+n);
  // ④⑤ PNG 규격/용량
  let kb=0,dim='';
  if(ogFile&&fs.existsSync(path.join(ROOT,'og',ogFile))){
    const st=fs.statSync(path.join(ROOT,'og',ogFile)); kb=+(st.size/1024).toFixed(1);
    const m=await sharp(path.join(ROOT,'og',ogFile)).metadata(); dim=m.width+'×'+m.height;
    if(m.width!==1200||m.height!==1200) errs.push('PNG '+dim);
    if(kb>300) errs.push('PNG '+kb+'KB');
  } else errs.push('PNG 파일 없음');
  // ⑥ alt 에 가게이름
  const alt=imM?(imM[0].match(/alt="([^"]*)"/)||[,''])[1]:'';
  const nameM=h.match(/"@type":"NightClub","name":"([^"]+)"/);
  const name=nameM?nameM[1]:null;
  if(!isHome){
    if(name&&!alt.includes(name)) errs.push('img alt 가게이름 없음');
    if(!name&&!alt) errs.push('img alt 비어있음');
  }
  // 추가: 절대 URL / img 속성
  if(imM&&!/width="1200"/.test(imM[0])) errs.push('img width 속성');
  if(imM&&!/height="1200"/.test(imM[0])) errs.push('img height 속성');
  if(imM&&!/loading="eager"/.test(imM[0])) errs.push('img loading=eager');
  rows.push({페이지:'/'+f.replace(/index\.html$/,''),썸네일:ogFile||'—','본문img':imM?'O':'X','메타9종':errs.filter(e=>e.startsWith('메타')).length?'X':'O',용량:kb+'KB',규격:dim,판정:errs.length?'FAIL':'PASS'});
  if(errs.length) fails.push(f+' → '+errs.join(', '));
}
// robots 점검
const rb=fs.readFileSync(path.join(ROOT,'robots.txt'),'utf8');
if(/^\s*Disallow:\s*\S/m.test(rb)) fails.push('robots.txt: Disallow 존재');
if(/noimageindex|nosnippet|noindex/i.test(rb)) fails.push('robots.txt: 색인 차단 지시어');
for(const f of files){ const h=fs.readFileSync(path.join(ROOT,f),'utf8');
  if(/content="[^"]*noimageindex/i.test(h)) fails.push(f+': meta noimageindex'); }
console.table(rows.slice(0,6));
console.log('… 총 '+rows.length+'페이지 검사 (표는 앞 6행만 표시)');
console.log('PASS:',rows.filter(r=>r.판정==='PASS').length,'/ FAIL:',rows.filter(r=>r.판정==='FAIL').length);
console.log('robots.txt Disallow 0건, noimageindex 0건:', !fails.some(x=>x.includes('robots')||x.includes('noimageindex')));
if(fails.length){console.log('\n실패:\n'+fails.join('\n'));process.exit(1);}
console.log('\n✅ G9+ 전 항목 통과 (①본문img ②og=본문 동일 ③메타9종 ④1200×1200 ⑤300KB이하 ⑥alt 가게이름)');
})();
