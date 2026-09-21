import assert from 'node:assert/strict';
import { buildCreateValidationRules } from '../src/features/create/shared';

const rules = buildCreateValidationRules({
  groomKoreanName: '신랑',
  brideKoreanName: '신부',
  groomEnglishName: 'Groom',
  brideEnglishName: 'Bride',
  pageIdentifier: 'wedding-test',
  selectedTheme: null,
});

assert.equal(rules.every((rule) => rule.passed), true,
  '웨딩 청첩장은 디자인 선택 없이 생성할 수 있어야 합니다.');
assert.equal(buildCreateValidationRules({
  groomKoreanName: '', brideKoreanName: '신부', groomEnglishName: 'Groom',
  brideEnglishName: 'Bride', pageIdentifier: 'wedding-test', selectedTheme: null,
}).find((rule) => rule.label === '신랑 한글 이름')?.passed, false,
  '기본 정보 필수 검증은 유지해야 합니다.');

console.log('mobile wedding design access tests passed');
