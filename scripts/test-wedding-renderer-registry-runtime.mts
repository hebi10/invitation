import assert from 'node:assert/strict';
import { register } from 'node:module';

register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);

const { WEDDING_THEME_CLOSING_DEFINITIONS } = await import(
  '../src/app/_components/weddingPageRenderers.tsx'
);
const { getWeddingThemeRenderer } = await import(
  '../src/app/_components/themeRenderers/registry.ts'
);

const weddingClosingProps = {
  state: {
    isLoading: false,
    imagesLoading: false,
    pageConfig: {
      groomName: '도영',
      brideName: '해비',
    },
  },
  options: { theme: 'gyeol' },
} as never;

for (const definition of WEDDING_THEME_CLOSING_DEFINITIONS) {
  const registryRenderer = getWeddingThemeRenderer(definition.key);
  assert.equal(
    typeof registryRenderer,
    'function',
    `${definition.key} should resolve its production wedding renderer`
  );

  const tree = registryRenderer({
    ...weddingClosingProps,
    options: { theme: definition.key },
  } as never) as {
    type: unknown;
    props: {
      children: Array<{ type: unknown; props: Record<string, unknown> }>;
      'data-theme': string;
      'data-wedding-closing-canvas': boolean;
    };
  };
  const closingSlot = tree.props.children.at(-1);

  assert.equal(
    tree.type,
    'div',
    `${definition.key} should keep the Page and closing in one bounded canvas`
  );
  assert.equal(
    tree.props['data-wedding-closing-canvas'],
    true,
    `${definition.key} should expose the shared closing canvas contract`
  );
  assert.equal(
    tree.props['data-theme'],
    definition.key,
    `${definition.key} should pass its registry theme identifier to the closing canvas`
  );
  assert.equal(
    tree.props.children.length,
    2,
    `${definition.key} should render its Page followed by exactly one closing`
  );
  assert.ok(closingSlot, `${definition.key} should render a final closing slot`);
  assert.equal(
    typeof closingSlot.type,
    'function',
    `${definition.key} closing should be a shared component`
  );

  const closingMarkup = (closingSlot.type as (props: Record<string, unknown>) => {
    props: Record<string, unknown>;
  })(closingSlot.props);
  assert.equal(
    closingMarkup.props['data-wedding-closing'],
    true,
    `${definition.key} should render the shared WeddingClosing footer`
  );
  assert.equal(
    closingMarkup.props['data-theme'],
    definition.key,
    `${definition.key} should render the matching closing variant`
  );
}

console.log('production wedding renderer closing checks passed');
