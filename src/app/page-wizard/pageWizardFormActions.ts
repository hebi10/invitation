import type { EventTypeKey } from '@/lib/eventTypes';
import type { InvitationPageSeed } from '@/types/invitationPage';
import {
  createEmptyAccount, createEmptyGuideItem,
  type AccountKind, type GuideKind, type ParentRole, type PersonRole,
} from './pageWizardEditorUtils';
import {
  applyWizardDateInputToConfig, applyWizardTimeInputToConfig,
  composeDescription, composeDisplayName, composeGreetingAuthor, hasText,
} from './pageWizardData';
import { composeAutoGreetingMessage, shouldSyncDerivedText } from './pageWizardClientUtils';

// Keep form mutations independent of loading, persistence and preview state.
export function createWizardFormActions({ eventType, updateForm }: {
  eventType: EventTypeKey;
  updateForm: (updater: (draft: InvitationPageSeed) => void) => void;
}) {
  const handlePersonNameChange = (role: PersonRole, value: string) => {
    updateForm((draft) => {
      const previousGroomName = draft.couple.groom.name;
      const previousBrideName = draft.couple.bride.name;
      const previousDisplayName = composeDisplayName(previousGroomName, previousBrideName);
      const previousDescription = composeDescription(previousGroomName, previousBrideName);
      const previousGreetingMessage = composeAutoGreetingMessage(
        previousGroomName,
        previousBrideName
      );
      const previousGreetingAuthor = composeGreetingAuthor(
        previousGroomName,
        previousBrideName
      );

      draft.couple[role].name = value;

      if (role === 'groom') {
        draft.groomName = value;
      } else {
        draft.brideName = value;
      }

      const nextGroomName = role === 'groom' ? value : previousGroomName;
      const nextBrideName = role === 'bride' ? value : previousBrideName;

      if (shouldSyncDerivedText(draft.displayName, previousDisplayName)) {
        draft.displayName = composeDisplayName(nextGroomName, nextBrideName);
      }

      if (shouldSyncDerivedText(draft.description, previousDescription)) {
        draft.description = composeDescription(nextGroomName, nextBrideName);
      }

      if (draft.pageData) {
        if (
          shouldSyncDerivedText(
            draft.pageData.greetingMessage ?? '',
            previousGreetingMessage
          )
        ) {
          draft.pageData.greetingMessage = composeAutoGreetingMessage(
            nextGroomName,
            nextBrideName
          );
        }

        if (
          shouldSyncDerivedText(
            draft.pageData.greetingAuthor ?? '',
            previousGreetingAuthor
          )
        ) {
          draft.pageData.greetingAuthor = composeGreetingAuthor(
            nextGroomName,
            nextBrideName
          );
        }
      }
    });
  };

  const handlePersonFieldChange = (
    role: PersonRole,
    field: 'name' | 'order' | 'phone',
    value: string
  ) => {
    if (field === 'name') {
      handlePersonNameChange(role, value);
      return;
    }

    updateForm((draft) => {
      draft.couple[role][field] = value;
      if (draft.pageData?.[role]) {
        draft.pageData[role][field] = value;
      }
    });
  };

  const handleSlugPrimaryKoreanNameChange = (value: string) => {
      if (eventType === 'first-birthday') {
        updateForm((draft) => {
          draft.displayName = value;
          draft.groomName = '';
          draft.brideName = '';
          draft.metadata.title = value;
          draft.description =
            draft.description.trim() || `${value.trim() || '아기'}의 첫 번째 생일잔치에 초대합니다.`;
          draft.metadata.description =
            draft.metadata.description.trim() || draft.description;
          draft.metadata.openGraph.title = value;
          draft.metadata.openGraph.description =
            draft.metadata.openGraph.description.trim() || draft.description;
          draft.metadata.twitter.title = value;
          draft.metadata.twitter.description =
            draft.metadata.twitter.description.trim() || draft.description;
          if (draft.pageData) {
            draft.pageData.greetingAuthor = '아빠 · 엄마';
          }
        });
        return;
      }

      if (eventType !== 'general-event') {
        if (eventType === 'opening') {
          updateForm((draft) => {
            draft.groomName = value;
            draft.couple.groom.name = value;
            draft.displayName = value;
            draft.description =
              draft.description.trim() || `${value.trim() || '새 매장'} 개업 소식에 초대합니다.`;
            draft.metadata.title = value;
            draft.metadata.description =
              draft.metadata.description.trim() || draft.description;
            draft.metadata.openGraph.title = value;
            draft.metadata.openGraph.description =
              draft.metadata.openGraph.description.trim() || draft.description;
            draft.metadata.twitter.title = value;
            draft.metadata.twitter.description =
              draft.metadata.twitter.description.trim() || draft.description;
            if (draft.pageData) {
              draft.pageData.greetingAuthor = value;
              draft.pageData.venueName = value;
            }
          });
          return;
        }

        handlePersonFieldChange('groom', 'name', value);
        if (eventType === 'birthday') {
          updateForm((draft) => {
            draft.groomName = value;
            draft.brideName = '';
            draft.couple.bride.name = '';
            draft.displayName = value;
            draft.description =
              draft.description.trim() || `${value.trim() || '생일 주인공'}님의 생일 자리에 초대합니다.`;
            draft.metadata.title = value;
            draft.metadata.description =
              draft.metadata.description.trim() || draft.description;
            draft.metadata.openGraph.title = value;
            draft.metadata.openGraph.description =
              draft.metadata.openGraph.description.trim() || draft.description;
            draft.metadata.twitter.title = value;
            draft.metadata.twitter.description =
              draft.metadata.twitter.description.trim() || draft.description;
            if (draft.pageData) {
              draft.pageData.greetingAuthor = value;
            }
          });
        }
        return;
      }

    updateForm((draft) => {
      draft.groomName = value;
      draft.couple.groom.name = value;
      draft.displayName = value;
      draft.description =
        draft.description.trim() || `${value.trim() || '행사'}에 초대합니다.`;
      draft.metadata.title = value;
      draft.metadata.description =
        draft.metadata.description.trim() || draft.description;
      draft.metadata.openGraph.title = value;
      draft.metadata.openGraph.description =
        draft.metadata.openGraph.description.trim() || draft.description;
      draft.metadata.twitter.title = value;
      draft.metadata.twitter.description =
        draft.metadata.twitter.description.trim() || draft.description;
    });
  };

  const handleParentFieldChange = (
    role: PersonRole,
    parentRole: ParentRole,
    field: 'relation' | 'name' | 'phone',
    value: string
  ) => {
    updateForm((draft) => {
      const parent = draft.couple[role][parentRole];
      if (!parent) {
        return;
      }

      parent[field] = value;
      if (draft.pageData?.[role]?.[parentRole]) {
        draft.pageData[role][parentRole][field] = value;
      }
    });
  };

  /* Handlers: Date/Time */

  const handleDateInputChange = (value: string) => {
    updateForm((draft) => {
      applyWizardDateInputToConfig(draft, value);
    });
  };

  const handleTimeInputChange = (value: string) => {
    updateForm((draft) => {
      applyWizardTimeInputToConfig(draft, value);
    });
  };

  /* Handlers: Guide/Account */

  const handleGuideAdd = (kind: GuideKind) => {
    updateForm((draft) => {
      const items = draft.pageData?.[kind];
      if (!items || items.length >= 3) {
        return;
      }

      items.push(createEmptyGuideItem());
    });
  };

  const handleGuideRemove = (kind: GuideKind, index: number) => {
    updateForm((draft) => {
      draft.pageData?.[kind]?.splice(index, 1);
    });
  };

  const handleGuideChange = (
    kind: GuideKind,
    index: number,
    field: 'title' | 'content',
    value: string
  ) => {
    updateForm((draft) => {
      const item = draft.pageData?.[kind]?.[index];
      if (!item) {
        return;
      }

      item[field] = value;
    });
  };

  const handleGuideTemplateApply = (kind: GuideKind, label: string, content: string) => {
    updateForm((draft) => {
      const items = draft.pageData?.[kind];
      if (!items) {
        return;
      }

      const emptyIndex = items.findIndex(
        (item) => !hasText(item.title) && !hasText(item.content)
      );
      const targetIndex = emptyIndex >= 0 ? emptyIndex : items.length;

      if (targetIndex >= 3) {
        return;
      }

      if (!items[targetIndex]) {
        items.push(createEmptyGuideItem());
      }

      items[targetIndex].title = label;
      items[targetIndex].content = content;
    });
  };

  const handleAccountAdd = (kind: AccountKind) => {
    updateForm((draft) => {
      const accounts = draft.pageData?.giftInfo?.[kind];
      if (!accounts || accounts.length >= 3) {
        return;
      }

      accounts.push(createEmptyAccount());
    });
  };

  const handleAccountRemove = (kind: AccountKind, index: number) => {
    updateForm((draft) => {
      draft.pageData?.giftInfo?.[kind]?.splice(index, 1);
    });
  };

  const handleAccountChange = (
    kind: AccountKind,
    index: number,
    field: 'bank' | 'accountNumber' | 'accountHolder',
    value: string
  ) => {
    updateForm((draft) => {
      const account = draft.pageData?.giftInfo?.[kind]?.[index];
      if (!account) {
        return;
      }

      account[field] = value;
    });
  };

  return {
    handlePersonFieldChange, handleSlugPrimaryKoreanNameChange, handleParentFieldChange,
    handleDateInputChange, handleTimeInputChange,
    handleGuideAdd, handleGuideRemove, handleGuideChange, handleGuideTemplateApply,
    handleAccountAdd, handleAccountRemove, handleAccountChange,
  };
}
