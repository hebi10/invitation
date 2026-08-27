import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const publicInvitationIndexPaths = [
  'src/app/_components/public-invitations/wedding/index.ts',
  'src/app/_components/public-invitations/first-birthday/index.ts',
  'src/app/_components/public-invitations/birthday/index.ts',
  'src/app/_components/public-invitations/opening/index.ts',
  'src/app/_components/public-invitations/general-event/index.ts',
] as const;

for (const indexPath of publicInvitationIndexPaths) {
  assert.equal(existsSync(indexPath), true, `${indexPath} must exist`);
}

const weddingRegistry = read('src/app/_components/themeRenderers/registry.ts');
assert.match(
  weddingRegistry,
  /from ['"]\.\.\/public-invitations\/wedding['"];/,
  'wedding renderer registry must import pages from public-invitations/wedding'
);

const birthdayRegistry = read(
  'src/app/_components/birthday/themeRenderers/registry.ts'
);
assert.match(
  birthdayRegistry,
  /from ['"]\.\.\/\.\.\/public-invitations\/birthday['"];/,
  'birthday renderer registry must import pages from public-invitations/birthday'
);

const poster = read('src/app/_components/public-invitations/shared/InvitationPoster.tsx');
assert.match(poster, /export function InvitationPoster/);
assert.match(poster, /dateLabel/);
assert.doesNotMatch(poster, /준비 중|이미지 없음/);

const actionCss = read('src/app/_components/public-invitations/shared/InvitationActionLink.module.css');
assert.match(actionCss, /min-height:\s*44px/);
assert.match(actionCss, /min-width:\s*44px/);
assert.match(actionCss, /:focus-visible/);

console.log('public invitation visual-world checks passed');
