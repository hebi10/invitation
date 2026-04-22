import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_TO_SCAN = path.normalize('src/services');
const ALLOWED_PREFIX = path.normalize('src/services/repositories/');
const FORBIDDEN_PATTERNS = [
  {
    label: 'dynamic firestore import',
    pattern: /import\s*\(\s*['"]firebase\/firestore['"]\s*\)/,
  },
  {
    label: 'static firestore import',
    pattern: /from\s+['"]firebase\/firestore['"]/,
  },
  {
    label: 'legacy collection name',
    pattern:
      /\b(invitation-page-configs|invitation-page-registry|display-periods|client-passwords|admin-users|memory-pages)\b/,
  },
  {
    label: 'guestbook path literal',
    pattern: /guestbooks\/.+\/comments/,
  },
];

function walkFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }

    return /\.(?:ts|tsx|mts|mjs|js|jsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

function isRepositoryPath(filePath: string) {
  const normalized = path.normalize(filePath);
  return normalized.startsWith(ALLOWED_PREFIX);
}

const violations = walkFiles(ROOT_TO_SCAN)
  .filter((filePath) => !isRepositoryPath(filePath))
  .flatMap((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split(/\r?\n/).flatMap((line, index) => {
      return FORBIDDEN_PATTERNS.flatMap(({ label, pattern }) => {
        return pattern.test(line)
          ? [
              {
                filePath,
                line: index + 1,
                label,
                text: line.trim(),
              },
            ]
          : [];
      });
    });
  });

assert.deepEqual(
  violations,
  [],
  `service repository boundary violations:\n${violations
    .map((violation) => {
      return `${violation.filePath}:${violation.line} ${violation.label} ${violation.text}`;
    })
    .join('\n')}`
);

console.log('service repository boundary checks passed');
