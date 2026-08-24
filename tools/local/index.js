// /local/ 섹션 데이터 통합 + 허브
'use strict';

const VENUES = [
  ...require('./venues-1'),
  ...require('./venues-2'),
  ...require('./venues-3'),
  ...require('./venues-4'),
  ...require('./venues-5'),
];

const HUB = {
  slug: 'hub',
  path: '/local-1/',
  og: 'hub',
  name: '전국 나이트 동네 지도 40',
  title: '전국 나이트 동네 지도 40',
  topic: '전국 동네 지도',
  desc: '전국 나이트 40곳을 가게가 아니라 그 동네 기준으로 묶은 지도입니다. 내 동네의 밤은 어디로 모일까요?',
  intro: [
    '가게 이름을 먼저 외우면 길을 잃고, 동네를 먼저 알면 길이 보입니다.',
    '이 페이지는 전국 40개 좌표를 상호가 아니라 그 좌표가 서 있는 동네 기준으로 묶어 둔 목록입니다.',
    '각 페이지는 상권과 지형지물, 그 거리에서 밤이 흐르는 방향을 다룹니다.',
    '확인된 사실만 적었고, 확인되지 않은 항목은 비워 두었습니다.',
  ],
  direct: [
    '전국 40개 동네를 지역별로 묶어 한 페이지에 정리했습니다.',
    '각 항목은 교차 확인된 동네 정보만 표기했습니다.',
    '요금·영업시간·연령 기준은 어느 페이지에서도 단정하지 않습니다.',
  ],
  notes: [
    { h: '이 목록을 읽는 순서', p: [
      '먼저 자기 동네가 속한 지역 묶음을 찾으십시오. 지역 안에서는 행정구역과 생활권이 가까운 순서로 늘어놓았습니다.',
      '항목을 열면 그 동네의 상권 구조와 지형지물, 그리고 밤이 흐르는 방향이 나옵니다. 가게 소개보다 동네 해설이 먼저 나옵니다.',
    ]},
    { h: '왜 확인 불가가 이렇게 많을까?', p: [
      '오래된 상권일수록 공개 자료가 적습니다. 광고 페이지는 넘쳐나지만 교차 확인이 되는 기록은 드뭅니다.',
      '한쪽 출처만 보고 주소를 적으면 그 순간 오정보가 됩니다. 그래서 확인되지 않은 칸은 비워 두는 쪽을 택했습니다.',
    ]},
    { h: '지역마다 밤의 모양이 다른 이유', p: [
      '어떤 도시는 중심이 하나로 압축돼 있고 어떤 도시는 여러 곳으로 흩어져 있습니다. 그 차이가 저녁 동선을 통째로 바꿉니다.',
      '계획도시는 선을 따라, 구도심은 골목을 따라 밤이 퍼집니다. 40개 글이 서로 다른 이유가 여기에 있습니다.',
    ]},
  ],
  oneline: '가게보다 동네를 먼저 알면 밤이 훨씬 쉬워집니다.',
  faq: [
    { q: '이 목록은 무엇을 기준으로 묶었나요?', a: '행정구역과 생활권을 기준으로 묶었습니다. 상호의 인지도나 규모 순서가 아닙니다.' },
    { q: '주소가 비어 있는 항목은 왜 그런가요?', a: '공개 자료로 교차 확인되지 않은 항목이기 때문입니다. 근거 없는 주소는 적지 않습니다.' },
    { q: '수유샴푸나이트는 왜 목록에서 홈으로 가나요?', a: '이 사이트의 본 주제라 별도 안내 페이지가 이미 마련되어 있기 때문입니다.' },
  ],
};

// 허브 목록 그룹 (수유샴푸나이트는 홈으로 링크)
const GROUPS = [
  { region: '서울', items: [
    { home: true, name: '수유샴푸나이트', area: '강북구 번동 · 도봉로' },
    'sillim-grandprix', 'sangbong-hankookkwan', 'cheongdam', 'bulgwang-hobak',
    'doksan-gukbinkwan', 'dapsimni-miracle', 'gangseo-hobak', 'yeongdeungpo-terminal',
    'nowon-hobak', 'gildong-chance',
  ]},
  { region: '경기·인천', items: [
    'suwon-chancedome', 'suwon-korea', 'ansan-hit', 'ilsan-shampoo', 'paju-skydome',
    'guri-hobak', 'uijeongbu-hankookkwan', 'uijeongbu-baekakkwan', 'osan-hobak',
    'indeokwon-gukbinkwan', 'seongnam-shampoo', 'bucheon-gorae', 'pyeongtaek-hobak',
    'incheon-arabian',
  ]},
  { region: '충청', items: [
    'daejeon-seven', 'daejeon-one', 'cheonan-stardome', 'cheonan-korea',
    'cheongju-hobak', 'seosan-hobak',
  ]},
  { region: '영남', items: [
    'busan-asiad', 'ulsan-champion', 'ulsan-newworld', 'changwon-lulurala',
    'daegu-hobak', 'gumi-hobak',
  ]},
  { region: '호남·제주', items: [
    'gwangju-sangmu', 'gwangju-cheomdan', 'jeju-night',
  ]},
];

// 목록 표기용 동네 라벨
const AREA = {
  'sillim-grandprix': '관악구 신림동 · 신림사거리',
  'sangbong-hankookkwan': '중랑구 상봉동 · 망우로',
  'cheongdam': '강남구 청담동 · 영동대로',
  'bulgwang-hobak': '은평구 불광동 · 통일로',
  'doksan-gukbinkwan': '금천구 독산동 · 범안로',
  'dapsimni-miracle': '동대문구 답십리 일원',
  'gangseo-hobak': '강서구 화곡동 · 화곡로',
  'yeongdeungpo-terminal': '영등포구 영등포동3가 · 영중로',
  'nowon-hobak': '노원구 상계동 · 노해로',
  'gildong-chance': '강동구 길동 · 천호대로',
  'suwon-chancedome': '수원 권선구 권선동 · 권선로',
  'suwon-korea': '수원 팔달구 인계동 · 경수대로',
  'ansan-hit': '안산 상록구 본오동 · 상록수로',
  'ilsan-shampoo': '고양 일산동구 마두동 · 중앙로',
  'paju-skydome': '파주 야당동 · 소리천로',
  'guri-hobak': '구리 수택동 · 돌다리',
  'uijeongbu-hankookkwan': '의정부 의정부동 · 태평로99번길',
  'uijeongbu-baekakkwan': '의정부 의정부동 · 태평로',
  'osan-hobak': '오산 원동 · 성호대로',
  'indeokwon-gukbinkwan': '안양 동안구 관양동 · 흥안대로',
  'seongnam-shampoo': '성남 중원구 성남동 · 광명로',
  'bucheon-gorae': '부천 원미구 일원',
  'pyeongtaek-hobak': '평택 평택동 · 중앙로',
  'incheon-arabian': '인천 계양구 · 도두리로',
  'daejeon-seven': '대전 서구 둔산동 일원',
  'daejeon-one': '대전 원도심 (구·동 표기 엇갈림)',
  'cheonan-stardome': '천안 서북구 (동 표기 엇갈림)',
  'cheonan-korea': '천안 서북구 쌍용동 · 차돌들길',
  'cheongju-hobak': '청주 상당구 성안길 일원',
  'seosan-hobak': '서산 읍내동 · 읍내1로',
  'busan-asiad': '부산 동래구 온천동 · 온천장로107번길',
  'ulsan-champion': '울산 남구 삼산동 · 정동로',
  'ulsan-newworld': '울산 남구 삼산동 · 삼산로',
  'changwon-lulurala': '창원 성산구 상남동 · 마디미로43번길',
  'daegu-hobak': '대구 북구 관음동 · 칠곡중앙대로',
  'gumi-hobak': '구미 원평동 일원',
  'gwangju-sangmu': '광주 서구 치평동 · 상무번영로',
  'gwangju-cheomdan': '광주 광산구 월계동 · 첨단지구',
  'jeju-night': '제주 제주시 연동 일원',
};

const EXTRA = require('./venues-extra');

/* ★ 2026-08-24 — 실제 배포된 폴더 이름을 찾아 쓴다.
 *
 * 왜 필요한가
 *   주소교체로 페이지 폴더가 바뀌었다(busan-asiad → busan-asiad-1).
 *   철자가 다른 것도 있다(데이터 changwon-lulurala / 폴더 changwon-lululala-1).
 *   그런데 여기서는 데이터 슬러그로 경로를 만들고 있어서
 *     · build.js 는 **옛 주소 폴더를 새로 만들어 폐기한 주소를 되살리고**
 *     · check.js 는 파일을 못 찾아 아예 죽고
 *     · build-og.js 는 사이트가 안 쓰는 이름으로 썸네일을 만들었다.
 *   페이지 안의 가게이름으로 실제 폴더를 찾아 짝지어 둔다.
 *   폴더를 못 찾으면 예전처럼 데이터 슬러그를 쓴다(새로 만드는 페이지).
 */
const fsFolder = require('fs');
const pathFolder = require('path');
const LOCAL_DIR = pathFolder.join(__dirname, '..', '..', 'local');
const FOLDER_BY_NAME = {};
/* 페이지가 실제로 부르는 썸네일 파일 이름. 페이지마다 붙은 꼬리가 달라서
   (local-cheongdam-1-1.png 처럼) 규칙으로 만들면 어긋난다. 페이지에서 읽는다. */
const OG_BY_NAME = {};
(() => {
  let names = [];
  try { names = fsFolder.readdirSync(LOCAL_DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); }
  catch { return; }
  for (const dir of names) {
    let html = '';
    try { html = fsFolder.readFileSync(pathFolder.join(LOCAL_DIR, dir, 'index.html'), 'utf8'); } catch { continue; }
    const name = (html.match(/"@type":"NightClub","name":"([^"]+)"/) || [])[1];
    if (!name || FOLDER_BY_NAME[name]) continue;
    FOLDER_BY_NAME[name] = dir;
    const og = (html.match(/og\/(local-[a-z0-9-]+)\.png/) || [])[1];
    if (og) OG_BY_NAME[name] = og;
  }
})();

for (const v of VENUES) {
  if (EXTRA[v.slug]) v.sections.push(EXTRA[v.slug]);
  const dir = FOLDER_BY_NAME[v.name] || v.slug;   // 배포된 폴더가 있으면 그것을 쓴다
  v.dir = dir;
  v.path = `/local/${dir}/`;
  v.file = `local/${dir}/index.html`;
  v.og = OG_BY_NAME[v.name] || `local-${dir}`;   // 페이지가 부르는 이름 그대로
  v.area = AREA[v.slug];
}
/* ★ 허브도 주소교체로 /local/ → /local-1/ 로 옮겨졌다(2026-08-24 확인).
   실제로 있는 쪽을 쓴다. */
HUB.dir = fsFolder.existsSync(pathFolder.join(__dirname, '..', '..', 'local-1', 'index.html')) ? 'local-1' : 'local';
HUB.file = `${HUB.dir}/index.html`;
HUB.og = 'local-hub';

const BY_SLUG = Object.fromEntries(VENUES.map((v) => [v.slug, v]));

module.exports = { VENUES, HUB, GROUPS, BY_SLUG, AREA };
