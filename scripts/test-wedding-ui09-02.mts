import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/app/_components/public-invitations/wedding/WeddingBase.module.css', 'utf8');
const component = readFileSync('src/components/sections/Guestbook/GuestbookThemed.tsx', 'utf8');
const start = css.indexOf('/* UI-09-02 —');
assert.ok(start > 0, 'Missing UI-09-02 styling scope');
const styles = css.slice(start);
const themes = ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional'];
for (const theme of themes) {
  const prefix = `.page[data-design='${theme}'] [data-wedding-section='guestbook']`;
  assert.ok(styles.includes(`${prefix} .commentsGrid`), `${theme}: list spacing`);
  assert.ok(styles.includes(`${prefix} .commentItem`), `${theme}: card surface`);
  assert.ok(styles.includes(`${prefix} .commentMessage`), `${theme}: message typography`);
}
for (const role of ['--paper', '--paper-soft', '--ink', '--muted', '--accent', '--line']) {
  assert.ok(css.includes(role), 'Must inherit existing wedding palette token: ' + role);
}
assert.ok(styles.includes('background: var(--paper)'), 'neutral card surfaces');
assert.ok(styles.includes('background: var(--paper-soft)'), 'warm card surfaces');
assert.ok(styles.includes('border: 1px solid var(--line)'), 'palette borders');
assert.ok(styles.includes('color: var(--accent)'), 'natural theme accent');
assert.ok(!/box-shadow\s*:|linear-gradient\s*\(|radial-gradient\s*\(/.test(styles),
  'Do not introduce shadows or gradients to message cards');
assert.match(styles, /@media \(max-width: 359px\)/);
assert.match(component, /getCommentsPage\(/, 'Keep existing pagination fetch');
assert.match(component, /addComment\(/, 'Keep existing guestbook submission');
assert.match(component, /formatDate\(comment\.createdAt\)/);
console.log('UI-09-02: five distinct token-driven guestbook cards and data flow verified');
