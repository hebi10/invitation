import assert from 'node:assert/strict';
import { readEditorRows, updateEditorCell, removeEditorRow, appendEditorRow, validateEditorRows } from '../src/features/manage/editorDelimitedRows';

const original = '국민은행|123-456|김신랑\n신한은행||박신부';
assert.deepEqual(readEditorRows(original, 3), [['국민은행', '123-456', '김신랑'], ['신한은행', '', '박신부']]);
assert.equal(updateEditorCell(original, 1, 1, '987-654', 3), '국민은행|123-456|김신랑\n신한은행|987-654|박신부');
assert.deepEqual(readEditorRows('교통|지하철 | 버스', 2), [['교통', '지하철 | 버스']]);
assert.equal(appendEditorRow('', 3), '||');
assert.equal(appendEditorRow('a|b|c\nd|e|f\ng|h|i', 3), 'a|b|c\nd|e|f\ng|h|i');
assert.equal(removeEditorRow(original, 0), '신한은행||박신부');
assert.equal(updateEditorCell('||', 0, 0, '은행\n이름|추가', 3), '은행 이름 추가||');
assert.equal(removeEditorRow('||', 0), '');
assert.equal(updateEditorCell('국민|123|', 0, 2, '김|영', 3), '국민|123|김 영', '계좌 예금주는 저장 시 잘리는 구분 문자를 입력 단계에서 정규화해야 합니다.');
assert.equal(updateEditorCell('교통|', 0, 1, '지하철 | 버스', 2), '교통|지하철 | 버스', '안내 내용의 구분 문자는 보존해야 합니다.');
assert.equal(validateEditorRows('||', 3), null);
assert.equal(validateEditorRows('국민|123|김신랑', 3), null);
assert.equal(validateEditorRows('국민||김신랑', 3), 1, '미완성 계좌를 저장 과정에서 조용히 버리면 안 됩니다.');
assert.equal(validateEditorRows('교통|지하철\n주차|', 2), 2);
console.log('모바일 계좌·안내 입력행 변환 검증 통과');
