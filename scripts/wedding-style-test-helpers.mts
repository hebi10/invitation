import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// These themes compose CSS module class maps in Page.tsx, rather than importing
// CSS text. Verify that composition before inspecting the shared declarations.
export function readWeddingStyles(cssPath: string) {
  const absolutePath = path.resolve(process.cwd(), cssPath);
  const ownCss = readFileSync(absolutePath, 'utf8');
  if (path.basename(absolutePath) === 'WeddingBase.module.css') return ownCss;
  const page = readFileSync(path.join(path.dirname(absolutePath), 'Page.tsx'), 'utf8');
  const baseImport = page.match(/import (\w+) from ['"](\.\.\/gyeol\/styles\.module\.css)['"]/);
  if (!baseImport) return ownCss;

  const baseName = baseImport[1];
  const themeName = page.match(/import (\w+) from ['"]\.\/styles\.module\.css['"]/)?.[1];
  assert.ok(themeName, 'The theme must retain its own CSS module');
  assert.match(page, new RegExp(`\\.\\.\\.${baseName}\\b`), 'The shared class map must be included');
  assert.match(page, new RegExp(`\\.\\.\\.${themeName}\\b`), 'The theme class map must be included');
  assert.match(page, new RegExp(`\\$\\{${baseName}\\.page\\}`), 'The root must retain the shared page class');
  assert.match(page, new RegExp(`\\$\\{${themeName}\\.page\\}`), 'The root must retain the theme palette class');
  assert.match(page, /className=\{styles\.page\}/, 'The composed root class must be rendered');
  return `${readFileSync(path.resolve(path.dirname(absolutePath), baseImport[2]), 'utf8')}\n${ownCss}`;
}

export function lastHexToken(css: string, token: string) {
  return [...css.matchAll(new RegExp(`--${token}:\\s*(#[0-9a-f]{6})`, 'gi'))].at(-1)?.[1];
}
