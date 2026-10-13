import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

type Element = { type: string | ((props: Record<string, unknown>) => unknown); props: Record<string, unknown> };
const jsx = (type: Element['type'], props: Element['props']) => ({ type, props });
const moduleExports: { default?: (props: Record<string, unknown>) => unknown } = {};
const source = ts.transpileModule(readFileSync('src/app/admin/_components/AdminCommentsTab.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
runInNewContext(source, { exports: moduleExports, require(name: string) {
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
  if (name.endsWith('.css')) return { default: new Proxy({}, { get: (_target, key) => String(key) }) };
  if (name === '.') return {
    FilterToolbar: (props: Record<string, unknown>) => [props.fields, props.actions],
    AdminQueryState: () => null, EmptyState: () => null, Pagination: () => null,
  };
  if (name === './adminPageUtils') return { COMMENT_AGE_LABELS: { all: '전체' }, COMMENTS_PER_PAGE: 10, formatDateTime: () => '날짜' };
  if (name === './AdminStaleQueryNotice') return { default: () => null };
  throw new Error(`Unexpected dependency: ${name}`);
} });

function buttons(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(buttons);
  if (!node || typeof node !== 'object') return [];
  const element = node as Element;
  if (typeof element.type === 'function') return buttons(element.type(element.props));
  return [...(element.type === 'button' ? [element] : []), ...buttons(element.props?.children)];
}
const comments = ['one', 'two'].map((id) => ({ id, collectionName: 'events/event/comments', pageSlug: 'event', author: id, message: '축하합니다', createdAt: new Date() }));
const props = {
  commentsLoading: false, commentsRefreshing: false, commentsError: null,
  comments, filteredComments: comments, currentComments: comments, currentPage: 1, totalPages: 1,
  commentSearch: '', selectedPageSlug: 'all', commentAgeFilter: 'all', isEventFilterActive: false,
  chips: [], commentPageOptions: [], mobileReadOnly: false,
  onRefresh() {}, onRetryComments() {}, onQueryChange() {}, onDeleteComment() {},
};
const pendingButtons = buttons(moduleExports.default!({ ...props, deletingCommentToken: 'events/event/comments:one' }));
const deleteButtons = pendingButtons.filter((button) => String(button.props.className).includes('admin-button-danger'));
assert.equal(deleteButtons.length, 4, 'desktop and compact comment actions must both be covered');
assert.ok(deleteButtons.every((button) => button.props.disabled === true), 'all comment delete actions must lock while one deletion is pending');
assert.equal(deleteButtons.filter((button) => button.props.children === '삭제 중').length, 2, 'the active comment must show progress in both layouts');
const idleButtons = buttons(moduleExports.default!({ ...props, deletingCommentToken: null }));
assert.ok(idleButtons.filter((button) => String(button.props.className).includes('admin-button-danger')).every((button) => !button.props.disabled), 'actions must become available when the request settles');
const mobileButtons = buttons(moduleExports.default!({ ...props, deletingCommentToken: null, mobileReadOnly: true }));
assert.ok(!mobileButtons.some((button) => String(button.props.className).includes('admin-button-danger')), 'mobile read-only policy must be preserved');
console.log('Admin comment deletion progress and duplicate-action locks passed');
