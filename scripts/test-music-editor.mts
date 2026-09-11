import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as music from '../src/lib/musicLibrary.ts';
import { mergeInvitationPageSeed } from '../src/lib/invitationPagePersistence.ts';
import { getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';

const tracks = music.INVITATION_MUSIC_LIBRARY.flatMap(category => category.tracks);
assert.equal(tracks.length, 18);
assert.equal(new Set(tracks.map(track => track.storagePath)).size, 18);
assert.ok(tracks.every(track => /^music\/0[1-6]-[^/]+\/[^/]+\.mp3$/.test(track.storagePath)));
for (const track of tracks) {
  const saved = mergeInvitationPageSeed(getRequiredWeddingPageBySlug('kim-taehyun-choi-yuna'), {
    musicEnabled: true, musicVolume: 0.2, musicCategoryId: track.categoryId,
    musicTrackId: track.id, musicStoragePath: track.storagePath, musicUrl: '',
  });
  assert.equal(saved?.musicStoragePath, track.storagePath, 'Save normalization preserves each selected track');
  assert.equal(saved?.musicVolume, 0.2);
  assert.equal(saved?.musicEnabled, true);
}

const source = ts.transpileModule(readFileSync(new URL('../src/app/page-wizard/steps/MusicStep.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
type Tree = { type: string; props: { children?: Tree | Tree[]; ref?: { current: unknown }; type?: string; onChange?: (event: object) => void } };
const draft = { musicEnabled: true, musicVolume: 0.35, musicUrl: '/preview.mp3', musicCategoryId: '', musicTrackId: '', musicStoragePath: '' };
function renderPreview() {
  const effects: Array<() => void> = [];
  const exports: Record<string, (props: object) => Tree> = {};
  const jsx = (type: string, props: object) => ({ type, props });
  runInNewContext(source, { exports, require(id: string) {
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === 'react') return { useState: (value: unknown) => [value, () => {}], useRef: () => ({ current: null }), useEffect: (effect: () => void) => effects.push(effect) };
    if (id.includes('musicLibrary')) return music;
    if (id.includes('pageWizardShared')) return { renderFieldMeta: () => null };
    return { default: {} };
  } });
  const tree = exports.default({ formState: draft, updateForm: (update: (form: typeof draft) => void) => update(draft), musicPreviewState: 'ready' });
  const nodes: Tree[] = [];
  const visit = (node: Tree | Tree[] | undefined) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object') return;
    nodes.push(node);
    visit(node.props?.children);
  };
  visit(tree);
  const audio = { volume: 1 };
  const player = nodes.find(node => node.type === 'audio');
  if (player?.props.ref) player.props.ref.current = audio;
  effects.forEach(effect => effect());
  return { audio, nodes };
}
for (const volume of [0.35, 0, 1]) {
  draft.musicVolume = volume;
  assert.equal(renderPreview().audio.volume, volume, 'Preview uses the configured volume, including mute');
}
const checkbox = renderPreview().nodes.find(node => node.type === 'input' && node.props.type === 'checkbox')!;
checkbox.props.onChange!({ target: { checked: true } });
assert.ok(music.findInvitationMusicTrackById(draft.musicTrackId), 'Enabling an empty selection chooses an available track');
console.log('Music editor volume, defaults and persistence checks passed');
