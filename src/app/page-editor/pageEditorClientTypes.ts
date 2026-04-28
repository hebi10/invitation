import type { NoticeTone } from './pageEditorUtils';

export type NoticeState = { tone: NoticeTone; message: string } | null;
export type SaveState = 'idle' | 'autosaving' | 'saving' | 'saved' | 'error' | 'publishing';
export type WorkspaceView = 'form' | 'preview';
export type PageEditorUploadFieldKind = 'wedding' | 'favicon' | 'gallery';
