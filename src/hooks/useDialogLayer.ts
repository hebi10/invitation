'use client';

import { useEffect, useRef, type RefObject } from 'react';

type Layer = { element: HTMLElement; close: () => void; blocked: () => boolean };
const layers: Layer[] = [];
let previousOverflow = '';
const hiddenSiblings = new Map<HTMLElement, boolean>();

function updateBackground() {
  hiddenSiblings.forEach((inert, element) => { element.inert = inert; });
  hiddenSiblings.clear();
  let current: HTMLElement | null = layers.at(-1)?.element ?? null;
  while (current && current !== document.body) {
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) break;
    for (const sibling of parent.children) {
      if (sibling !== current && sibling instanceof HTMLElement && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) {
        hiddenSiblings.set(sibling, sibling.inert);
        sibling.inert = true;
      }
    }
    current = parent;
  }
}

function controls(element: HTMLElement) {
  return [...element.querySelectorAll<HTMLElement>(
    'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])'
  )].filter((item) => item.tabIndex >= 0 && !item.closest('[hidden], [inert]') && item.getClientRects().length > 0);
}

function onKeyDown(event: KeyboardEvent) {
  const layer = layers.at(-1);
  if (!layer) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!layer.blocked()) layer.close();
  } else if (event.key === 'Tab') {
    const items = controls(layer.element);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (!items.length) {
      event.preventDefault();
      layer.element.focus();
    } else if (event.shiftKey && index <= 0) {
      event.preventDefault();
      items.at(-1)?.focus();
    } else if (!event.shiftKey && (index < 0 || index === items.length - 1)) {
      event.preventDefault();
      items[0].focus();
    }
  }
}

function onFocus(event: FocusEvent) {
  const layer = layers.at(-1);
  if (layer && event.target instanceof Node && !layer.element.contains(event.target)) {
    (controls(layer.element)[0] ?? layer.element).focus();
  }
}

/** One keyboard/scroll owner, including dialogs rendered through different portals. */
export function useDialogLayer(
  ref: RefObject<HTMLElement | null>,
  options: { open: boolean; onClose: () => void; blocked?: boolean },
) {
  const latest = useRef(options);
  latest.current = options;
  useEffect(() => {
    const element = ref.current;
    if (!options.open || !element) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousTabIndex = element.getAttribute('tabindex');
    element.tabIndex = -1;
    const layer: Layer = { element, close: () => latest.current.onClose(), blocked: () => !!latest.current.blocked };
    if (!layers.length) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('focusin', onFocus);
    }
    layers.push(layer);
    updateBackground();
    const frame = requestAnimationFrame(() => {
      if (layers.at(-1) !== layer) return;
      (element.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? controls(element)[0] ?? element).focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      const index = layers.indexOf(layer);
      const wasTop = index === layers.length - 1;
      if (index >= 0) layers.splice(index, 1);
      updateBackground();
      if (previousTabIndex === null) element.removeAttribute('tabindex');
      else element.setAttribute('tabindex', previousTabIndex);
      if (!layers.length) {
        document.body.style.overflow = previousOverflow;
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('focusin', onFocus);
      }
      if (wasTop && previousFocus?.isConnected) previousFocus.focus();
    };
  }, [options.open, ref]);
}
