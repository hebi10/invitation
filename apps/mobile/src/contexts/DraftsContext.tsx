import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getStoredJson, setStoredJson } from '../lib/storage';
import type { CreateDraftItem } from '../types/mobileInvitation';

const DRAFT_STORAGE_KEY = 'mobile-invitation:drafts';

type StoredDraftItem = CreateDraftItem & {
  password?: string;
};

type CreateDraftInput = Omit<CreateDraftItem, 'id' | 'createdAt' | 'status'>;

type DraftsContextValue = {
  drafts: CreateDraftItem[];
  isReady: boolean;
  saveDraft: (
    input: CreateDraftInput,
    options?: {
      draftId?: string;
    }
  ) => Promise<string>;
  removeDraft: (draftId: string) => Promise<void>;
};

const DraftsContext = createContext<DraftsContextValue | null>(null);

function sanitizeStoredDraft(draft: StoredDraftItem): CreateDraftItem {
  return {
    id: draft.id,
    createdAt: draft.createdAt,
    servicePlan: draft.servicePlan,
    theme: draft.theme,
    pageIdentifier: draft.pageIdentifier,
    groomName: draft.groomName,
    brideName: draft.brideName,
    groomEnglishName:
      'groomEnglishName' in draft && typeof draft.groomEnglishName === 'string'
        ? draft.groomEnglishName
        : '',
    brideEnglishName:
      'brideEnglishName' in draft && typeof draft.brideEnglishName === 'string'
        ? draft.brideEnglishName
        : '',
    weddingDate: draft.weddingDate,
    venue: draft.venue,
    estimatedPrice: draft.estimatedPrice,
    ticketCount: draft.ticketCount,
    notes: draft.notes,
    status: 'draft',
  };
}

export function DraftsProvider({ children }: PropsWithChildren) {
  const [drafts, setDrafts] = useState<CreateDraftItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (hasRestoredRef.current) {
      return;
    }

    hasRestoredRef.current = true;
    let mounted = true;

    const restore = async () => {
      const stored = await getStoredJson<StoredDraftItem[]>(DRAFT_STORAGE_KEY, []);

      if (!mounted) {
        return;
      }

      const sanitized = stored.map(sanitizeStoredDraft);
      const shouldRewrite = stored.some((draft) =>
        Object.prototype.hasOwnProperty.call(draft, 'password')
      );

      setDrafts(sanitized);

      if (shouldRewrite) {
        await setStoredJson(DRAFT_STORAGE_KEY, sanitized);
      }

      if (mounted) {
        setIsReady(true);
      }
    };

    void restore();

    return () => {
      mounted = false;
    };
  }, []);

  const saveDraft = useCallback(
    async (
      input: CreateDraftInput,
      options: {
        draftId?: string;
      } = {}
    ) => {
      const existingDraft = options.draftId
        ? drafts.find((draft) => draft.id === options.draftId)
        : null;

      const nextDraft: CreateDraftItem = existingDraft
        ? {
            ...existingDraft,
            ...input,
            status: 'draft',
          }
        : {
            ...input,
            id: `draft-${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: 'draft',
          };

      const otherDrafts = existingDraft
        ? drafts.filter((draft) => draft.id !== existingDraft.id)
        : drafts;
      const nextDrafts = [nextDraft, ...otherDrafts].slice(0, 12);
      await setStoredJson(DRAFT_STORAGE_KEY, nextDrafts);
      setDrafts(nextDrafts);
      return nextDraft.id;
    },
    [drafts]
  );

  const removeDraft = useCallback(
    async (draftId: string) => {
      const nextDrafts = drafts.filter((draft) => draft.id !== draftId);
      await setStoredJson(DRAFT_STORAGE_KEY, nextDrafts);
      setDrafts(nextDrafts);
    },
    [drafts]
  );

  const value = useMemo<DraftsContextValue>(
    () => ({
      drafts,
      isReady,
      saveDraft,
      removeDraft,
    }),
    [drafts, isReady, removeDraft, saveDraft]
  );

  return <DraftsContext.Provider value={value}>{children}</DraftsContext.Provider>;
}

export function useDrafts() {
  const context = useContext(DraftsContext);
  if (!context) {
    throw new Error('useDrafts must be used within DraftsProvider.');
  }
  return context;
}
