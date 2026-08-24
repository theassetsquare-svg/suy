// 모든 검사 결과를 복사 가능한 마크다운 파일로 저장한다.
// 터미널에서 복사가 어려울 때 reports/latest.md 를 편집기로 열어 그대로 복사하면 된다.
'use strict';
const fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const ROOT=path.join(__dirname,'..');
const OUT=path.join(ROOT,'reports');
fs.mkdirSync(OUT,{recursive:true});
const run=(c)=>{try{return execSync(c,{cwd:ROOT,maxBuffer:1<<26,stdio:['ignore','pipe','pipe']}).toString();}
                catch(e){return (e.stdout?e.stdout.toString():'')+(e.stderr?e.stderr.toString():'');}};
const stamp=run("git log -1 --format='%h %ad' --date=format:'%Y-%m-%d %H:%M'").trim();
const parts=[];
parts.push('# 검사 리포트\n');
parts.push(`- 커밋: ${stamp}`);
parts.push(`- 도메인: https://d.nolcool.com`);
parts.push(`- 생성: 이 파일은 \`node tools/report.js\` 로 언제든 다시 만들 수 있습니다.\n`);
const jobs=[
  ['기존 11페이지 게이트 (G1~G11)','node tools/check.js'],
  ['/local/ 40페이지 게이트 (G1~G12)','node tools/local/check.js'],
  ['썸네일 노출 게이트 (G9+)','node tools/thumbs-gate.js'],
];
for(const [title,cmd] of jobs){
  parts.push(`\n## ${title}\n`);
  parts.push('```');
  parts.push(run(cmd).trimEnd());
  parts.push('```');
}
parts.push('\n## 파일 현황\n');
parts.push('```');
parts.push('HTML 페이지: '+run('find . -name "*.html" -not -path "./node_modules/*" -not -path "./.git/*" | wc -l').trim());
parts.push('썸네일 PNG: '+run('ls og/*.png | wc -l').trim());
parts.push('sitemap URL: '+run('grep -c "<loc>" sitemap.xml').trim());
parts.push('llms.txt 항목: '+run('grep -c "^- \\[" llms.txt').trim());
parts.push('```');
const f=path.join(OUT,'latest.md');
fs.writeFileSync(f,parts.join('\n')+'\n','utf8');
console.log('리포트 저장 →',path.relative(ROOT,f));
console.log('편집기에서 열기:  code reports/latest.md');
