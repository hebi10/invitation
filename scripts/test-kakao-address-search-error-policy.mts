import assert from 'node:assert/strict';
import fs from 'node:fs';

const routeSource = fs.readFileSync(
  'src/app/api/kakao/local/address-search/route.ts',
  'utf8'
);
const serviceSource = fs.readFileSync('src/services/kakaoLocalService.ts', 'utf8');

assert.equal(
  routeSource.includes("status: 503"),
  true,
  'missing Kakao REST API key should be reported as service unavailable'
);
assert.equal(
  routeSource.includes("status: 502"),
  true,
  'network-level Kakao address search failures should be reported as bad gateway'
);
assert.equal(
  serviceSource.includes("const KAKAO_REST_API_ERROR_KEYWORD = 'Kakao Local REST API'"),
  true,
  'client service should keep the Kakao REST API keyword used for browser SDK fallback'
);
assert.equal(
  serviceSource.includes("'주소 검색에 실패했습니다.'"),
  true,
  'client service should keep a readable Korean fallback error message'
);

console.log('kakao address search error policy checks passed');
