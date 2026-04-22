import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOTS_TO_SCAN = ['src/app/api', 'src/server', 'src/services'];
const EXTRA_FILES_TO_SCAN = ['scripts/seed-invitation-pages.mjs'];
const FORBIDDEN_PATTERNS = [
  {
    label: 'legacy invitation config collection',
    pattern: /\binvitation-page-configs\b/,
  },
  {
    label: 'legacy invitation registry collection',
    pattern: /\binvitation-page-registry\b/,
  },
  {
    label: 'legacy display period collection',
    pattern: /\bdisplay-periods\b/,
  },
  {
    label: 'legacy client password collection',
    pattern: /\bclient-passwords\b/,
  },
  {
    label: 'legacy guestbook collection',
    pattern: /\bguestbooks\b/,
  },
  {
    label: 'legacy ticket balance collection',
    pattern: /\bpage-ticket-balances\b/,
  },
  {
    label: 'legacy mobile billing fulfillment collection',
    pattern: /\bmobile-billing-fulfillments\b/,
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

function findViolations() {
  const files = [
    ...ROOTS_TO_SCAN.flatMap(walkFiles),
    ...EXTRA_FILES_TO_SCAN.filter((filePath) => fs.existsSync(filePath)),
  ];

  return files.flatMap((filePath) => {
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
}

const violations = findViolations();

assert.deepEqual(
  violations,
  [],
  `event write path legacy collection violations:\n${violations
    .map((violation) => {
      return `${violation.filePath}:${violation.line} ${violation.label} ${violation.text}`;
    })
    .join('\n')}`
);

console.log('event write path checks passed');
