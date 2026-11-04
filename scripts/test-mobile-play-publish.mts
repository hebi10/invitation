import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const result = spawnSync('python3', ['scripts/test_publish_mobile_play.py', '-v'], { stdio: 'inherit', shell: false });
assert.ifError(result.error);
assert.equal(result.status, 0, 'Google Play 게시 정책 및 HTTP 처리 검증이 실패했습니다.');
