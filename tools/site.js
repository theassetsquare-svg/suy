// 수유샴푸나이트 안내 사이트 — 사이트 상수 및 확인된 사실 베이스
'use strict';

const SITE = {
  // 실제 라이브 도메인. Cloudflare Pages 연결 후에는 이 한 줄만 바꾸고 `npm run build` 재실행.
  origin: 'https://theassetsquare-svg.github.io',
  brand: '수유샴푸나이트',
  kakao: 'https://open.kakao.com/o/sBesta12',
  kakaoId: 'besta12',
  gsv: 'HJjm7MRxykCQ7d_9L7glaTeeaWrmJIzAKY0BcNcfm88',
  checkedDate: '2026년 8월 17일',
  checkedISO: '2026-08-17',
};

// 웹 교차검증 결과. status: confirmed(2개 이상 출처 일치) / conflict(엇갈림) / unknown(확인 불가)
const FACTS = {
  jibun: { label: '지번 주소', value: '서울특별시 강북구 번동 449-1', status: 'confirmed' },
  road: { label: '도로명 주소', value: '서울특별시 강북구 도봉로 308 (번동)', status: 'confirmed' },
  building: { label: '건물', value: '북한산스카이빌딩 (고층 복합건물)', status: 'confirmed' },
  station: { label: '가까운 역·출구', value: '4호선 수유(강북구청)역 4번 출구', status: 'confirmed' },
  landmark: { label: '주변 지형지물', value: '수유사거리 · 대한병원(도봉로 301) 길 건너편', status: 'confirmed' },
  age: { label: '연령대', value: '공개 정보로 확인 불가', status: 'unknown' },
  parking: { label: '주차', value: '출처마다 달라 방문 전 확인 권장', status: 'conflict' },
  hours: { label: '영업시간 · 요금', value: '공개 정보로 확인 불가', status: 'unknown' },
};

// 전 페이지 공통 사실 표 (셀 값 중복 허용)
const FACT_ROWS = [
  FACTS.jibun, FACTS.road, FACTS.building, FACTS.station,
  FACTS.landmark, FACTS.age, FACTS.parking, FACTS.hours,
  { label: '확인일', value: SITE.checkedDate, status: 'confirmed' },
];

module.exports = { SITE, FACTS, FACT_ROWS };
