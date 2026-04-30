import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = process.cwd();

function tryResolvePath(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.mjs'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith('node:')) {
    return defaultResolve(specifier, context, defaultResolve);
  }

  if (specifier === 'server-only') {
    return {
      url: 'data:text/javascript,export {}',
      shortCircuit: true,
    };
  }

  if (specifier.startsWith('@/')) {
    const resolved = tryResolvePath(path.join(projectRoot, 'src', specifier.slice(2)));
    if (resolved) {
      return {
        url: pathToFileURL(resolved).href,
        shortCircuit: true,
      };
    }
  }

  const isRelativeLike =
    specifier.startsWith('./') ||
    specifier.startsWith('../') ||
    specifier.startsWith('/');

  if (isRelativeLike && !path.extname(specifier)) {
    const parentDirectory =
      context.parentURL && context.parentURL.startsWith('file:')
        ? path.dirname(fileURLToPath(context.parentURL))
        : projectRoot;
    const basePath = specifier.startsWith('/')
      ? path.join(projectRoot, specifier.slice(1))
      : path.resolve(parentDirectory, specifier);
    const resolved = tryResolvePath(basePath);

    if (resolved) {
      return {
        url: pathToFileURL(resolved).href,
        shortCircuit: true,
      };
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}
