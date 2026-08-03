import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    return statSync(fullPath).isDirectory()
      ? listFiles(fullPath)
      : /\.(?:ts|tsx)$/.test(entry)
        ? [fullPath]
        : [];
  });
}

const files = listFiles(sourceRoot);
const relative = (file: string) => path.relative(root, file).replace(/\\/g, '/');
const read = (file: string) => readFileSync(file, 'utf8');

const collectionLiteralOwners = files
  .filter((file) => /['"]demoExperiences['"]/.test(read(file)))
  .map(relative);
assert.deepEqual(collectionLiteralOwners, [
  'src/server/repositories/demoExperienceRepository.ts',
]);

const demoServerFiles = files.filter((file) => {
  const name = relative(file);
  return (
    name === 'src/server/demoExperienceService.ts' ||
    name.startsWith('src/app/api/experience/')
  );
});
for (const file of demoServerFiles) {
  assert.doesNotMatch(
    read(file),
    /from\s+['"]@\/server\/repositories\/(?!demoExperienceRepository)/,
    `${relative(file)} must not import a production repository`
  );
}

const productionApiFiles = files.filter((file) => {
  const name = relative(file);
  return name.startsWith('src/app/api/admin/') || name.startsWith('src/app/api/customer/');
});
for (const file of productionApiFiles) {
  assert.doesNotMatch(read(file), /demoExperienceRepository/);
}

const experienceUiFiles = files.filter((file) =>
  relative(file).startsWith('src/app/experience/')
);
for (const file of experienceUiFiles) {
  const source = read(file);
  assert.doesNotMatch(source, /['"]\/api\/(?:admin|customer)(?:\/|['"])/);
  assert.doesNotMatch(source, /firebase(?:Auth|Token)|getIdToken/);
}

console.log('demo experience architecture boundary checks passed');
