import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOTS_TO_SCAN = ['src/app/api', 'src/server'];
const ALLOWED_PREFIXES = [
  path.normalize('src/server/firebaseAdmin.ts'),
  path.normalize('src/server/repositories/'),
];
const FORBIDDEN_PATTERNS = [
  {
    label: 'getServerFirestore',
    pattern: /\bgetServerFirestore\s*\(/,
  },
  {
    label: 'firestore collection access',
    pattern: /\.collection(?:Group)?\s*\(/,
  },
];

function isAllowedPath(filePath: string) {
  const normalized = path.normalize(filePath);
  return ALLOWED_PREFIXES.some((prefix) => {
    return normalized === prefix || normalized.startsWith(prefix);
  });
}

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

function findViolations() {
  return ROOTS_TO_SCAN.flatMap(walkFiles)
    .filter((filePath) => !isAllowedPath(filePath))
    .flatMap((filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      return FORBIDDEN_PATTERNS.flatMap(({ label, pattern }) => {
        const lines = content.split(/\r?\n/);
        return lines.flatMap((line, index) => {
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
}

const violations = findViolations();

assert.deepEqual(
  violations,
  [],
  `API/server Firestore boundary violations:\n${violations
    .map((violation) => {
      return `${violation.filePath}:${violation.line} ${violation.label} ${violation.text}`;
    })
    .join('\n')}`
);

console.log('api repository boundary checks passed');
