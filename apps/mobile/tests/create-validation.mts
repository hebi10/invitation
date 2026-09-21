import assert from 'node:assert/strict';

import { buildCreateValidationRules, buildSuggestedCreateSlugBase } from '../src/features/create/shared';

const names = {
  groomKoreanName: '김신랑',
  brideKoreanName: '이신부',
  groomEnglishName: '',
  brideEnglishName: '',
  pageIdentifier: buildSuggestedCreateSlugBase('', '', 'abc123'),
  selectedTheme: null,
};

assert.equal(names.pageIdentifier, 'wedding-abc123', '영문 이름 없이도 안정적인 추천 주소가 있어야 합니다.');
assert.ok(buildCreateValidationRules(names).every((rule) => rule.passed), '영문 이름은 선택 입력이어야 합니다.');
assert.equal(buildCreateValidationRules({ ...names, groomKoreanName: '' }).filter((rule) => !rule.passed).length, 1,
  '공개 청첩장에 필요한 한글 이름은 계속 검증해야 합니다.');
assert.equal(buildCreateValidationRules({ ...names, pageIdentifier: '' }).filter((rule) => !rule.passed).length, 1,
  '선택 입력 변경이 청첩장 주소 검증을 약화하면 안 됩니다.');

console.log('mobile create validation tests passed');
