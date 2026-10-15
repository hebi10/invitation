import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

interface Element {
  type: string;
  props: {
    children?: unknown;
    onClick?: () => Promise<void>;
    role?: string;
    'aria-label'?: string;
  };
}

function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object') return [];
  const element = node as Element;
  return [element, ...elements(element.props?.children)];
}

const source = ts.transpileModule(
  readFileSync(new URL('../src/components/sections/GiftInfo/GiftInfoThemed.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }
).outputText;
const states: unknown[] = [];
const timers: Array<() => void> = [];
let stateIndex = 0;
let clipboardAvailable = false;
let clipboardText = '';
const exports: Record<string, (props: object) => unknown> = {};
const jsx = (type: string, props: object) => ({ type, props });
runInNewContext(source, {
  exports,
  window: { setTimeout: (callback: () => void) => { timers.push(callback); } },
  require(id: string) {
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === 'react') return {
      useState(initial: unknown) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value: unknown) => {
          states[index] = typeof value === 'function' ? value(states[index]) : value;
        }];
      },
    };
    if (id === '@/utils') return {
      async copyTextToClipboard(text: string) {
        if (!clipboardAvailable) return false;
        clipboardText = text;
        return true;
      },
    };
    throw new Error(`Unexpected module: ${id}`);
  },
});

function render() {
  stateIndex = 0;
  return elements(exports.default({
    groomAccounts: [{ bank: '테스트은행', accountNumber: '123-456-789', accountHolder: '신랑' }],
    brideAccounts: [{ bank: '축하은행', accountNumber: '987-654-321', accountHolder: '신부' }],
    title: '마음 전하실 곳', groomSectionTitle: '신랑측', brideSectionTitle: '신부측',
    copyLabel: '계좌번호 복사', styles: {}, collapsibleAccounts: true,
  }));
}
const copyFor = (label: string) => render().find(element => element.props['aria-label'] === label)!;
await copyFor('신랑 계좌번호 복사').props.onClick!();
const failed = render();
const status = failed.find(element => element.props.role === 'status');
assert.ok(status, 'Clipboard failure must explain how the guest can still copy the account');
assert.match(String(status.props.children), /직접 복사/);
assert.ok(failed.some(element => element.type === 'span' && element.props.children === '123-456-789'), 'The account remains readable and selectable after a failed copy');
assert.equal(failed.filter(element => element.props.role === 'status').length, 1, 'Failure feedback belongs only to the attempted account');
assert.ok(copyFor('신랑 계좌번호 복사'), 'A failed copy must not display a successful copy label');

clipboardAvailable = true;
await copyFor('신랑 계좌번호 복사').props.onClick!();
assert.equal(clipboardText, '테스트은행 123-456-789', 'Successful copy keeps the existing bank and account payload');
assert.ok(copyFor('신랑 복사 완료'));
assert.equal(render().filter(element => element.props.role === 'status').length, 0, 'A successful retry clears failure feedback');
timers.forEach(callback => callback());
assert.ok(copyFor('신랑 계좌번호 복사'), 'The copy button returns to its original label after feedback expires');
console.log('Gift account copy feedback checks passed');
