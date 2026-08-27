import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const poster = read('src/app/_components/public-invitations/shared/InvitationPoster.tsx');
assert.match(poster, /export function InvitationPoster/);
assert.match(poster, /dateLabel/);
assert.doesNotMatch(poster, /준비 중|이미지 없음/);

const actionCss = read('src/app/_components/public-invitations/shared/InvitationActionLink.module.css');
assert.match(actionCss, /min-height:\s*44px/);
assert.match(actionCss, /:focus-visible/);

console.log('public invitation visual-world checks passed');
