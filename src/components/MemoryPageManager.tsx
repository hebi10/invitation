'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { getWeddingPagesClient, type WeddingPageInfo } from '@/utils';
import { EmptyState, FilterToolbar, StatusBadge, SummaryCards, useAdminOverlay, type SummaryCardItem } from '@/app/admin/_components';
import { useAdmin } from '@/contexts';
import { getComments, type Comment } from '@/services';
import {
  buildMemoryPageUrl,
  createMemoryPageDraftFromInvitation,
  createSelectedCommentSnapshot,
  deleteMemoryImageAsset,
  deleteMemoryPage,
  generateMemoryHeroThumbnail,
  getMemoryPageByPageSlug,
  hashMemoryAccessPassword,
  mergeInvitationGalleryImages,
  publishMemoryPage,
  sanitizeMemorySlug,
  saveMemoryPage,
  suggestCommentsFromInvitation,
  unpublishMemoryPage,
  uploadMemoryImages,
} from '@/services/memoryPageService';
import type { MemoryGalleryCategory, MemoryGalleryImage, MemoryPage } from '@/types/memoryPage';
import { DEFAULT_MEMORY_HERO_CROP } from '@/types/memoryPage';
import styles from './MemoryPageManager.module.css';

const GALLERY_CATEGORY_OPTIONS: Array<{ value: MemoryGalleryCategory; label: string }> = [
  { value: 'preWedding', label: '식전' },
  { value: 'ceremony', label: '본식' },
  { value: 'afterParty', label: '식후' },
  { value: 'snap', label: '스냅' },
  { value: 'etc', label: '기타' },
];

const VISIBILITY_OPTIONS: Array<{ value: MemoryPage['visibility']; label: string; description: string }> = [
  { value: 'private', label: '비공개', description: '관리자만 확인할 수 있습니다.' },
  { value: 'unlisted', label: '링크 전용', description: '검색 노출 없이 링크를 아는 사람만 볼 수 있습니다.' },
  { value: 'public', label: '공개', description: '추억 페이지를 외부에 공유할 수 있습니다.' },
];

type SortableType = 'gallery' | 'selectedComment' | 'timeline';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((left, right) => left.order - right.order);
}

function normalizeOrder<T extends { order: number }>(items: T[]) {
  return sortByOrder(items).map((item, index) => ({
    ...item,
    order: index,
  }));
}

function moveItemByDirection<T extends { id: string; order: number }>(items: T[], targetId: string, direction: -1 | 1) {
  const sorted = sortByOrder(items);
  const currentIndex = sorted.findIndex((item) => item.id === targetId);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sorted.length) {
    return items;
  }

  const nextItems = [...sorted];
  const [selected] = nextItems.splice(currentIndex, 1);
  nextItems.splice(nextIndex, 0, selected);
  return normalizeOrder(nextItems);
}

function moveItemByDrop<T extends { id: string; order: number }>(items: T[], activeId: string, overId: string) {
  if (activeId === overId) {
    return items;
  }

  const sorted = sortByOrder(items);
  const currentIndex = sorted.findIndex((item) => item.id === activeId);
  const nextIndex = sorted.findIndex((item) => item.id === overId);

  if (currentIndex < 0 || nextIndex < 0) {
    return items;
  }

  const nextItems = [...sorted];
  const [selected] = nextItems.splice(currentIndex, 1);
  nextItems.splice(nextIndex, 0, selected);
  return normalizeOrder(nextItems);
}

function toggleSelection(current: string[], id: string, checked: boolean) {
  if (checked) {
    return current.includes(id) ? current : [...current, id];
  }

  return current.filter((value) => value !== id);
}

function getVisibilityMeta(memoryPage: MemoryPage | null) {
  if (!memoryPage) {
    return { label: '초안', tone: 'neutral' as const };
  }

  if (!memoryPage.enabled || memoryPage.visibility === 'private') {
    return { label: '비공개', tone: 'neutral' as const };
  }

  if (memoryPage.visibility === 'unlisted') {
    return { label: '링크 전용', tone: 'warning' as const };
  }

  return { label: '공개', tone: 'success' as const };
}

function getHeroMediaStyle(memoryPage: MemoryPage | null): CSSProperties {
  if (!memoryPage) {
    return {};
  }

  const crop = memoryPage.heroImageCrop ?? DEFAULT_MEMORY_HERO_CROP;
  const focusX = clamp(crop.focusX, 0, 100);
  const focusY = clamp(crop.focusY, 0, 100);
  const zoom = clamp(crop.zoom, 1, 2.6);

  return {
    objectPosition: `${focusX}% ${focusY}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${focusX}% ${focusY}%`,
  };
}

function formatPreviewUrl(slug: string) {
  const normalized = sanitizeMemorySlug(slug);
  return normalized ? buildMemoryPageUrl(normalized) : '';
}

function createTimelineId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function MemoryPageManager() {
  const { isAdminLoggedIn } = useAdmin();
  const { confirm, showToast } = useAdminOverlay();

  const [weddingPages, setWeddingPages] = useState<WeddingPageInfo[]>([]);
  const [selectedPageSlug, setSelectedPageSlug] = useState('');
  const [draft, setDraft] = useState<MemoryPage | null>(null);
  const [sourceComments, setSourceComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exists, setExists] = useState(false);
  const [error, setError] = useState('');
  const [commentSearch, setCommentSearch] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<MemoryGalleryCategory>('ceremony');
  const [pendingPassword, setPendingPassword] = useState('');
  const [selectedSourceCommentIds, setSelectedSourceCommentIds] = useState<string[]>([]);
  const [selectedManagedCommentIds, setSelectedManagedCommentIds] = useState<string[]>([]);
  const [dragState, setDragState] = useState<{ type: SortableType; activeId: string; overId: string | null } | null>(null);

  useEffect(() => {
    const pages = getWeddingPagesClient();
    setWeddingPages(pages);

    if (pages.length > 0) {
      setSelectedPageSlug((prev) => prev || pages[0].slug);
    }
  }, []);

  useEffect(() => {
    if (!selectedPageSlug || !isAdminLoggedIn) {
      return;
    }

    let cancelled = false;

    const loadMemoryPage = async () => {
      setLoading(true);
      setError('');
      setSelectedSourceCommentIds([]);
      setSelectedManagedCommentIds([]);
      setPendingPassword('');

      try {
        const [existingMemoryPage, pageComments] = await Promise.all([getMemoryPageByPageSlug(selectedPageSlug), getComments(selectedPageSlug)]);

        if (cancelled) {
          return;
        }

        setSourceComments(pageComments);

        if (existingMemoryPage) {
          setDraft(existingMemoryPage);
          setExists(true);
        } else {
          setDraft(await createMemoryPageDraftFromInvitation(selectedPageSlug));
          setExists(false);
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError('추억 페이지 데이터를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadMemoryPage();

    return () => {
      cancelled = true;
    };
  }, [selectedPageSlug, isAdminLoggedIn]);

  const pageInfo = weddingPages.find((page) => page.slug === selectedPageSlug);
  const currentVisibility = getVisibilityMeta(draft);
  const previewPath = draft ? formatPreviewUrl(draft.slug || draft.pageSlug) : '';

  const filteredSourceComments = useMemo(() => {
    const query = commentSearch.trim().toLowerCase();

    if (!query) {
      return sourceComments;
    }

    return sourceComments.filter((comment) => `${comment.author} ${comment.message}`.toLowerCase().includes(query));
  }, [commentSearch, sourceComments]);

  const visibleSelectedCommentCount = draft?.selectedComments.filter((comment) => comment.isVisible).length ?? 0;

  const summaryItems: SummaryCardItem[] = [
    {
      id: 'memory-exists',
      label: '생성 여부',
      value: exists ? '생성됨' : '미생성',
      meta: exists ? '저장된 추억 페이지 초안이 있습니다.' : '아직 저장되지 않은 초안 상태입니다.',
      tone: exists ? 'success' : 'neutral',
    },
    {
      id: 'memory-visibility',
      label: '공개 상태',
      value: currentVisibility.label,
      meta: draft?.enabled ? '저장 후 즉시 공개 경로에서 확인할 수 있습니다.' : '관리자 미리보기만 가능한 상태입니다.',
      tone: currentVisibility.tone === 'success' ? 'success' : currentVisibility.tone === 'warning' ? 'warning' : 'neutral',
    },
    {
      id: 'memory-images',
      label: '등록 이미지',
      value: draft?.galleryImages.length ?? 0,
      meta: '대표 이미지와 갤러리에 쓰일 사진 수입니다.',
      tone: (draft?.galleryImages.length ?? 0) > 0 ? 'primary' : 'neutral',
    },
    {
      id: 'memory-comments',
      label: '공개 댓글',
      value: visibleSelectedCommentCount,
      meta: '선택 공개된 댓글만 추억 페이지에 노출됩니다.',
      tone: visibleSelectedCommentCount > 0 ? 'primary' : 'neutral',
    },
  ];

  const setDraftField = <K extends keyof MemoryPage>(field: K, value: MemoryPage[K]) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleDragStart = (type: SortableType, activeId: string) => {
    setDragState({ type, activeId, overId: activeId });
  };

  const handleDragEnter = (type: SortableType, overId: string) => {
    setDragState((prev) => {
      if (!prev || prev.type !== type) {
        return prev;
      }

      return { ...prev, overId };
    });
  };

  const handleDragEnd = () => {
    setDragState(null);
  };

  const applyDropReorder = (type: SortableType, overId: string) => {
    if (!draft || !dragState || dragState.type !== type) {
      setDragState(null);
      return;
    }

    const { activeId } = dragState;
    setDragState(null);

    if (activeId === overId) {
      return;
    }

    if (type === 'gallery') {
      setDraft({
        ...draft,
        galleryImages: moveItemByDrop(draft.galleryImages, activeId, overId),
      });
      return;
    }

    if (type === 'selectedComment') {
      setDraft({
        ...draft,
        selectedComments: moveItemByDrop(draft.selectedComments, activeId, overId),
      });
      return;
    }

    setDraft({
      ...draft,
      timelineItems: moveItemByDrop(draft.timelineItems, activeId, overId),
    });
  };

  const handleResetFromInvitation = async () => {
    if (!selectedPageSlug || !draft) {
      return;
    }

    const approved = await confirm({
      title: '청첩장 기본 정보로 다시 채울까요?',
      description: '제목, 소개 문구, 날짜, 장소, 이름 정보를 청첩장 기준으로 다시 가져옵니다.',
      confirmLabel: '다시 가져오기',
      cancelLabel: '취소',
      tone: 'danger',
    });

    if (!approved) {
      return;
    }

    const importedDraft = await createMemoryPageDraftFromInvitation(selectedPageSlug);
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            title: importedDraft.title,
            subtitle: importedDraft.subtitle,
            introMessage: importedDraft.introMessage,
            thankYouMessage: importedDraft.thankYouMessage,
            weddingDate: importedDraft.weddingDate,
            venueName: importedDraft.venueName,
            venueAddress: importedDraft.venueAddress,
            groomName: importedDraft.groomName,
            brideName: importedDraft.brideName,
            seoTitle: importedDraft.seoTitle,
            seoDescription: importedDraft.seoDescription,
          }
        : importedDraft
    );

    showToast({
      title: '청첩장 기본 정보를 다시 반영했습니다.',
      message: '기존 갤러리, 댓글, 타임라인은 유지했습니다.',
      tone: 'success',
    });
  };

  const handleImportInvitationImages = async () => {
    if (!selectedPageSlug || !draft) {
      return;
    }

    try {
      const mergedImages = await mergeInvitationGalleryImages(selectedPageSlug, draft.galleryImages);
      const nextHeroImage = draft.heroImage ?? mergedImages[0] ?? null;
      const nextThumbnail = nextHeroImage ? await generateMemoryHeroThumbnail(nextHeroImage.url, draft.heroImageCrop) : '';

      setDraft({
        ...draft,
        galleryImages: mergedImages,
        heroImage: nextHeroImage,
        heroThumbnailUrl: nextThumbnail,
      });

      showToast({
        title: '청첩장 이미지를 가져왔습니다.',
        message: '기존에 없는 원본 이미지만 갤러리에 추가했습니다.',
        tone: 'success',
      });
    } catch (importError) {
      console.error(importError);
      showToast({
        title: '이미지를 불러오지 못했습니다.',
        message: '잠시 후 다시 시도해주세요.',
        tone: 'error',
      });
    }
  };

  const handleSuggestComments = async () => {
    if (!selectedPageSlug || !draft) {
      return;
    }

    try {
      const nextComments = await suggestCommentsFromInvitation(selectedPageSlug, draft.selectedComments, 5);
      setDraft({
        ...draft,
        selectedComments: nextComments,
      });

      showToast({
        title: '추천 댓글을 추가했습니다.',
        message: '중복되지 않는 최근 댓글을 공개 목록에 담았습니다.',
        tone: 'success',
      });
    } catch (suggestError) {
      console.error(suggestError);
      showToast({
        title: '댓글을 불러오지 못했습니다.',
        message: '잠시 후 다시 시도해주세요.',
        tone: 'error',
      });
    }
  };

  const handleAddComment = (comment: Comment) => {
    if (!draft) {
      return;
    }

    if (draft.selectedComments.some((selectedComment) => selectedComment.sourceCommentId === comment.id)) {
      return;
    }

    setDraft({
      ...draft,
      selectedComments: [
        ...draft.selectedComments,
        createSelectedCommentSnapshot(comment, draft.selectedComments.length),
      ],
    });
  };

  const handleBulkAddComments = () => {
    if (!draft || selectedSourceCommentIds.length === 0) {
      return;
    }

    const existingIds = new Set(draft.selectedComments.map((comment) => comment.sourceCommentId).filter(Boolean));
    const commentsToAdd = filteredSourceComments.filter((comment) => selectedSourceCommentIds.includes(comment.id) && !existingIds.has(comment.id));

    if (commentsToAdd.length === 0) {
      showToast({
        title: '추가할 댓글이 없습니다.',
        message: '이미 선택된 댓글이거나 선택된 항목이 없습니다.',
        tone: 'info',
      });
      return;
    }

    const appendedComments = commentsToAdd.map((comment, index) => createSelectedCommentSnapshot(comment, draft.selectedComments.length + index));
    setDraft({
      ...draft,
      selectedComments: normalizeOrder([...draft.selectedComments, ...appendedComments]),
    });
    setSelectedSourceCommentIds([]);

    showToast({
      title: '선택한 댓글을 추가했습니다.',
      message: `${commentsToAdd.length}개의 댓글이 공개 후보에 들어갔습니다.`,
      tone: 'success',
    });
  };

  const handleBulkSelectedCommentVisibility = (isVisible: boolean) => {
    if (!draft || selectedManagedCommentIds.length === 0) {
      return;
    }

    setDraft({
      ...draft,
      selectedComments: draft.selectedComments.map((comment) =>
        selectedManagedCommentIds.includes(comment.id) ? { ...comment, isVisible } : comment
      ),
    });

    showToast({
      title: isVisible ? '선택 댓글을 노출 상태로 바꿨습니다.' : '선택 댓글을 숨김 상태로 바꿨습니다.',
      tone: 'success',
    });
  };

  const handleBulkRemoveSelectedComments = () => {
    if (!draft || selectedManagedCommentIds.length === 0) {
      return;
    }

    setDraft({
      ...draft,
      selectedComments: normalizeOrder(draft.selectedComments.filter((comment) => !selectedManagedCommentIds.includes(comment.id))),
    });
    setSelectedManagedCommentIds([]);

    showToast({
      title: '선택한 댓글을 목록에서 제거했습니다.',
      tone: 'success',
    });
  };

  const handleRemoveComment = (commentId: string) => {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,
      selectedComments: normalizeOrder(draft.selectedComments.filter((comment) => comment.id !== commentId)),
    });
    setSelectedManagedCommentIds((prev) => prev.filter((id) => id !== commentId));
  };

  const handleUploadImages = async () => {
    if (!draft || !selectedFiles.length) {
      return;
    }

    try {
      setUploading(true);
      const uploadedImages = await uploadMemoryImages(draft.pageSlug, selectedFiles, uploadCategory, draft.galleryImages.length);
      const nextGalleryImages = normalizeOrder([...draft.galleryImages, ...uploadedImages]);
      const nextHeroImage = draft.heroImage ?? nextGalleryImages[0] ?? null;
      const nextThumbnail = nextHeroImage ? await generateMemoryHeroThumbnail(nextHeroImage.url, draft.heroImageCrop) : '';

      setDraft({
        ...draft,
        galleryImages: nextGalleryImages,
        heroImage: nextHeroImage,
        heroThumbnailUrl: nextThumbnail,
      });
      setSelectedFiles([]);

      showToast({
        title: '추억 페이지 이미지를 업로드했습니다.',
        message: `${uploadedImages.length}개의 파일을 추가했습니다.`,
        tone: 'success',
      });
    } catch (uploadError) {
      console.error(uploadError);
      showToast({
        title: '이미지 업로드에 실패했습니다.',
        message: '잠시 후 다시 시도해주세요.',
        tone: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveGalleryImage = async (image: MemoryGalleryImage) => {
    if (!draft) {
      return;
    }

    const approved = await confirm({
      title: '이미지를 목록에서 제거할까요?',
      description: image.source === 'memory' ? '추억 페이지에 직접 업로드한 이미지는 스토리지에서도 함께 삭제됩니다.' : '청첩장 원본 이미지는 추억 페이지에서만 제거됩니다.',
      confirmLabel: '제거',
      cancelLabel: '취소',
      tone: 'danger',
    });

    if (!approved) {
      return;
    }

    try {
      await deleteMemoryImageAsset(image);

      const nextGalleryImages = normalizeOrder(draft.galleryImages.filter((galleryImage) => galleryImage.id !== image.id));
      const nextHeroImage = draft.heroImage?.id === image.id ? nextGalleryImages[0] ?? null : draft.heroImage;
      const nextThumbnail = nextHeroImage ? await generateMemoryHeroThumbnail(nextHeroImage.url, draft.heroImageCrop) : '';

      setDraft({
        ...draft,
        galleryImages: nextGalleryImages,
        heroImage: nextHeroImage,
        heroThumbnailUrl: nextThumbnail,
      });
    } catch (removeError) {
      console.error(removeError);
      showToast({
        title: '이미지를 제거하지 못했습니다.',
        message: '잠시 후 다시 시도해주세요.',
        tone: 'error',
      });
    }
  };

  const handleHeroImageChange = async (nextHeroImageId: string) => {
    if (!draft) {
      return;
    }

    const nextHeroImage = draft.galleryImages.find((image) => image.id === nextHeroImageId) ?? null;
    const nextThumbnail = nextHeroImage ? await generateMemoryHeroThumbnail(nextHeroImage.url, draft.heroImageCrop) : '';

    setDraft({
      ...draft,
      heroImage: nextHeroImage,
      heroThumbnailUrl: nextThumbnail,
    });
  };

  const handleRegenerateThumbnail = async () => {
    if (!draft?.heroImage) {
      showToast({
        title: '대표 이미지가 없습니다.',
        message: '먼저 대표 이미지를 선택해주세요.',
        tone: 'info',
      });
      return;
    }

    try {
      setSaving(true);
      const heroThumbnailUrl = await generateMemoryHeroThumbnail(draft.heroImage.url, draft.heroImageCrop);
      setDraft({
        ...draft,
        heroThumbnailUrl,
      });

      showToast({
        title: '대표 썸네일을 다시 생성했습니다.',
        message: '현재 크롭 설정이 반영됐습니다.',
        tone: 'success',
      });
    } catch (thumbnailError) {
      console.error(thumbnailError);
      showToast({
        title: '썸네일 생성에 실패했습니다.',
        message: '이미지 접근 권한을 확인해주세요.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const prepareDraftForPersist = async () => {
    if (!draft) {
      return null;
    }

    const normalizedSlug = sanitizeMemorySlug(draft.slug || draft.pageSlug) || draft.pageSlug;
    const galleryImages = normalizeOrder(draft.galleryImages);
    const selectedComments = normalizeOrder(draft.selectedComments);
    const timelineItems = normalizeOrder(
      draft.timelineItems.filter((item) => item.title.trim() || item.description.trim())
    );
    const heroImage = draft.heroImage ?? galleryImages[0] ?? null;

    let passwordHash = draft.passwordHash;
    if (draft.passwordProtected) {
      if (pendingPassword.trim()) {
        passwordHash = await hashMemoryAccessPassword(pendingPassword.trim());
      }

      if (!passwordHash) {
        throw new Error('비밀번호 보호를 사용하려면 새 비밀번호를 입력해주세요.');
      }
    } else {
      passwordHash = '';
    }

    const heroThumbnailUrl = heroImage ? await generateMemoryHeroThumbnail(heroImage.url, draft.heroImageCrop) : '';

    return {
      ...draft,
      slug: normalizedSlug,
      galleryImages,
      selectedComments,
      timelineItems,
      heroImage,
      heroThumbnailUrl,
      passwordProtected: draft.passwordProtected,
      passwordHash,
      passwordHint: draft.passwordProtected ? draft.passwordHint.trim() : '',
      seoTitle: draft.seoTitle.trim() || draft.title.trim() || `${draft.groomName} ♥ ${draft.brideName}의 결혼식 기록`,
      seoDescription: draft.seoDescription.trim() || draft.introMessage.trim(),
      heroImageCrop: {
        focusX: clamp(draft.heroImageCrop.focusX, 0, 100),
        focusY: clamp(draft.heroImageCrop.focusY, 0, 100),
        zoom: clamp(draft.heroImageCrop.zoom, 1, 2.6),
      },
    } satisfies MemoryPage;
  };

  const persistDraft = async (mode: 'save' | 'publish') => {
    if (!draft) {
      return;
    }

    try {
      setSaving(true);
      const preparedDraft = await prepareDraftForPersist();
      if (!preparedDraft) {
        return;
      }

      const savedDraft = await saveMemoryPage(preparedDraft);
      const nextDraft =
        mode === 'publish'
          ? await publishMemoryPage(savedDraft.pageSlug, savedDraft.visibility === 'private' ? 'public' : savedDraft.visibility)
          : savedDraft;

      setDraft(nextDraft);
      setExists(true);
      setPendingPassword('');

      showToast({
        title: mode === 'publish' ? '추억 페이지를 공개했습니다.' : '추억 페이지를 저장했습니다.',
        message: mode === 'publish' ? '공개 주소에서 바로 확인할 수 있습니다.' : '저장된 초안으로 미리보기를 열 수 있습니다.',
        tone: 'success',
      });
    } catch (saveError) {
      console.error(saveError);
      showToast({
        title: mode === 'publish' ? '추억 페이지 공개에 실패했습니다.' : '추억 페이지 저장에 실패했습니다.',
        message: saveError instanceof Error ? saveError.message : '입력값을 확인한 뒤 다시 시도해주세요.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!draft) {
      return;
    }

    try {
      setSaving(true);
      const unpublishedDraft = await unpublishMemoryPage(draft.pageSlug);
      setDraft(unpublishedDraft);

      showToast({
        title: '추억 페이지를 비공개로 전환했습니다.',
        message: '관리자만 미리보기를 확인할 수 있습니다.',
        tone: 'success',
      });
    } catch (unpublishError) {
      console.error(unpublishError);
      showToast({
        title: '공개 상태를 변경하지 못했습니다.',
        message: '잠시 후 다시 시도해주세요.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMemoryPage = async () => {
    if (!draft || !exists) {
      return;
    }

    const approved = await confirm({
      title: '추억 페이지를 삭제할까요?',
      description: '저장된 문서와 추억 페이지 전용 업로드 이미지가 함께 삭제됩니다.',
      confirmLabel: '삭제',
      cancelLabel: '취소',
      tone: 'danger',
    });

    if (!approved) {
      return;
    }

    try {
      setSaving(true);
      await deleteMemoryPage(draft.pageSlug);
      const initialDraft = await createMemoryPageDraftFromInvitation(draft.pageSlug);
      setDraft(initialDraft);
      setExists(false);
      setPendingPassword('');
      setSelectedManagedCommentIds([]);
      setSelectedSourceCommentIds([]);

      showToast({
        title: '추억 페이지를 삭제했습니다.',
        message: '현재 페이지는 다시 초안 상태로 돌아갔습니다.',
        tone: 'success',
      });
    } catch (deleteError) {
      console.error(deleteError);
      showToast({
        title: '추억 페이지 삭제에 실패했습니다.',
        message: '잠시 후 다시 시도해주세요.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const openPreview = () => {
    if (!draft) {
      return;
    }

    if (!exists) {
      showToast({
        title: '먼저 저장이 필요합니다.',
        message: '미리보기는 저장된 추억 페이지를 기준으로 열립니다.',
        tone: 'info',
      });
      return;
    }

    const nextPreviewPath = formatPreviewUrl(draft.slug || draft.pageSlug);
    if (!nextPreviewPath) {
      showToast({
        title: '공유 slug를 확인해주세요.',
        message: '주소에 사용할 slug가 비어 있습니다.',
        tone: 'error',
      });
      return;
    }

    window.open(nextPreviewPath, '_blank', 'noopener,noreferrer');
  };

  const handleCopyPreviewUrl = async () => {
    if (!draft) {
      return;
    }

    const nextPreviewPath = formatPreviewUrl(draft.slug || draft.pageSlug);
    if (!nextPreviewPath) {
      showToast({
        title: '공유 주소를 복사할 수 없습니다.',
        message: 'slug를 먼저 확인해주세요.',
        tone: 'error',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${nextPreviewPath}`);
      showToast({
        title: '공유 주소를 복사했습니다.',
        message: `${window.location.origin}${nextPreviewPath}`,
        tone: 'success',
      });
    } catch (copyError) {
      console.error(copyError);
      showToast({
        title: '공유 주소 복사에 실패했습니다.',
        message: '브라우저 권한을 확인해주세요.',
        tone: 'error',
      });
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.lockedState}>관리자만 추억 페이지를 관리할 수 있습니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>추억 페이지 관리</h2>
          <p className={styles.description}>결혼식 이후 사진, 댓글, 타임라인, 감사 인사를 한 화면에서 정리하고 공개 상태까지 관리합니다.</p>
        </div>
        {draft ? <StatusBadge tone={currentVisibility.tone}>{currentVisibility.label}</StatusBadge> : null}
      </div>

      <FilterToolbar
        fields={
          <label className="admin-field">
            <span className="admin-field-label">대상 청첩장</span>
            <select className="admin-select" value={selectedPageSlug} onChange={(event) => setSelectedPageSlug(event.target.value)}>
              {weddingPages.map((page) => (
                <option key={page.slug} value={page.slug}>
                  {page.displayName} ({page.slug})
                </option>
              ))}
            </select>
          </label>
        }
        actions={
          <>
            <button type="button" className="admin-button admin-button-secondary" onClick={handleResetFromInvitation} disabled={!draft || saving || loading}>
              청첩장 정보 가져오기
            </button>
            <button type="button" className="admin-button admin-button-secondary" onClick={handleCopyPreviewUrl} disabled={!draft}>
              링크 복사
            </button>
            <button type="button" className="admin-button admin-button-secondary" onClick={openPreview} disabled={!draft}>
              미리보기
            </button>
          </>
        }
        chips={
          draft
            ? [
                { id: 'memory-url', label: `공유 주소 ${previewPath || '-'}` },
                { id: 'memory-target', label: `대상 ${pageInfo?.displayName ?? draft.pageSlug}` },
                { id: 'memory-seo', label: draft.seoNoIndex ? 'SEO noindex' : 'SEO index 가능' },
              ]
            : []
        }
      />

      <SummaryCards items={summaryItems} />

      {error ? <div className={styles.errorMessage}>{error}</div> : null}

      {loading || !draft ? (
        <div className={styles.loadingState}>추억 페이지 초안을 불러오는 중입니다.</div>
      ) : (
        <>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h3 className={styles.panelTitle}>기본 정보</h3>
                <p className={styles.panelDescription}>공유 slug, 제목, 소개 문구, 감사 인사, 공개 상태, SEO, 비밀번호 보호를 한 번에 설정합니다.</p>
              </div>
              <div className={styles.panelActions}>
                {exists ? (
                  <button type="button" className="admin-button admin-button-danger" onClick={handleDeleteMemoryPage} disabled={saving}>
                    삭제
                  </button>
                ) : null}
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className="admin-field">
                <span className="admin-field-label">제목</span>
                <input className="admin-input" value={draft.title} onChange={(event) => setDraftField('title', event.target.value)} />
              </label>

              <label className="admin-field">
                <span className="admin-field-label">공유 slug</span>
                <input
                  className="admin-input"
                  value={draft.slug}
                  onChange={(event) => setDraftField('slug', sanitizeMemorySlug(event.target.value))}
                  placeholder={draft.pageSlug}
                />
              </label>

              <label className="admin-field">
                <span className="admin-field-label">공개 상태</span>
                <select className="admin-select" value={draft.visibility} onChange={(event) => setDraftField('visibility', event.target.value as MemoryPage['visibility'])}>
                  {VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span className="admin-field-label">부제</span>
                <input className="admin-input" value={draft.subtitle} onChange={(event) => setDraftField('subtitle', event.target.value)} />
              </label>

              <label className={`${styles.fullSpan} admin-field`}>
                <span className="admin-field-label">소개 문구</span>
                <textarea className="admin-textarea" value={draft.introMessage} onChange={(event) => setDraftField('introMessage', event.target.value)} rows={4} />
              </label>

              <label className={`${styles.fullSpan} admin-field`}>
                <span className="admin-field-label">감사 인사</span>
                <textarea className="admin-textarea" value={draft.thankYouMessage} onChange={(event) => setDraftField('thankYouMessage', event.target.value)} rows={4} />
              </label>

              <label className="admin-field">
                <span className="admin-field-label">예식 날짜</span>
                <input className="admin-input" value={draft.weddingDate} onChange={(event) => setDraftField('weddingDate', event.target.value)} />
              </label>

              <label className="admin-field">
                <span className="admin-field-label">신랑 이름</span>
                <input className="admin-input" value={draft.groomName} onChange={(event) => setDraftField('groomName', event.target.value)} />
              </label>

              <label className="admin-field">
                <span className="admin-field-label">신부 이름</span>
                <input className="admin-input" value={draft.brideName} onChange={(event) => setDraftField('brideName', event.target.value)} />
              </label>

              <label className="admin-field">
                <span className="admin-field-label">식장명</span>
                <input className="admin-input" value={draft.venueName} onChange={(event) => setDraftField('venueName', event.target.value)} />
              </label>

              <label className={`${styles.fullSpan} admin-field`}>
                <span className="admin-field-label">장소 주소</span>
                <input className="admin-input" value={draft.venueAddress} onChange={(event) => setDraftField('venueAddress', event.target.value)} />
              </label>
            </div>

            <div className={styles.subsectionBlock}>
              <div className={styles.subsectionHeader}>
                <div>
                  <p className={styles.subsectionTitle}>비밀번호 보호</p>
                  <p className={styles.subsectionDescription}>공개 또는 링크 전용 상태에서도 비밀번호를 아는 사람만 추억 페이지를 볼 수 있게 합니다.</p>
                </div>
                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    checked={draft.passwordProtected}
                    onChange={(event) => setDraftField('passwordProtected', event.target.checked)}
                  />
                  <span>비밀번호 보호 사용</span>
                </label>
              </div>

              <div className={styles.formGrid}>
                <label className="admin-field">
                  <span className="admin-field-label">비밀번호 힌트</span>
                  <input
                    className="admin-input"
                    value={draft.passwordHint}
                    onChange={(event) => setDraftField('passwordHint', event.target.value)}
                    disabled={!draft.passwordProtected}
                  />
                </label>

                <label className="admin-field">
                  <span className="admin-field-label">{draft.passwordHash ? '비밀번호 변경' : '새 비밀번호'}</span>
                  <input
                    className="admin-input"
                    type="password"
                    value={pendingPassword}
                    onChange={(event) => setPendingPassword(event.target.value)}
                    placeholder={draft.passwordHash ? '변경할 때만 새 비밀번호를 입력하세요.' : '4자 이상 입력하세요.'}
                    disabled={!draft.passwordProtected}
                  />
                </label>
              </div>
            </div>

            <div className={styles.subsectionBlock}>
              <div className={styles.subsectionHeader}>
                <div>
                  <p className={styles.subsectionTitle}>SEO 설정</p>
                  <p className={styles.subsectionDescription}>링크 전용, 비밀번호 보호, 비공개 상태는 자동으로 noindex 처리됩니다. 공개 페이지만 index 후보가 됩니다.</p>
                </div>
                <label className={styles.toggleRow}>
                  <input type="checkbox" checked={draft.seoNoIndex} onChange={(event) => setDraftField('seoNoIndex', event.target.checked)} />
                  <span>강제 noindex</span>
                </label>
              </div>

              <div className={styles.formGrid}>
                <label className="admin-field">
                  <span className="admin-field-label">SEO 제목</span>
                  <input className="admin-input" value={draft.seoTitle} onChange={(event) => setDraftField('seoTitle', event.target.value)} />
                </label>

                <label className="admin-field">
                  <span className="admin-field-label">SEO 설명</span>
                  <input className="admin-input" value={draft.seoDescription} onChange={(event) => setDraftField('seoDescription', event.target.value)} />
                </label>
              </div>
            </div>

            <div className={styles.subsectionBlock}>
              <div className={styles.subsectionHeader}>
                <div>
                  <p className={styles.subsectionTitle}>대표 이미지 크롭/썸네일</p>
                  <p className={styles.subsectionDescription}>대표 이미지를 고르고 초점과 확대 정도를 조정하면 공개 페이지 히어로와 추억 페이지 전용 썸네일에 같은 구도를 적용합니다.</p>
                </div>
                <button type="button" className="admin-button admin-button-secondary" onClick={handleRegenerateThumbnail} disabled={!draft.heroImage || saving}>
                  썸네일 재생성
                </button>
              </div>

              {draft.galleryImages.length > 0 ? (
                <div className={styles.heroManager}>
                  <div className={styles.heroControls}>
                    <label className="admin-field">
                      <span className="admin-field-label">대표 이미지</span>
                      <select
                        className="admin-select"
                        value={draft.heroImage?.id ?? ''}
                        onChange={(event) => void handleHeroImageChange(event.target.value)}
                      >
                        {sortByOrder(draft.galleryImages).map((image, index) => (
                          <option key={image.id} value={image.id}>
                            {index + 1}. {image.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="admin-field">
                      <span className="admin-field-label">좌우 초점 ({Math.round(draft.heroImageCrop.focusX)}%)</span>
                      <input
                        className={styles.rangeInput}
                        type="range"
                        min="0"
                        max="100"
                        value={draft.heroImageCrop.focusX}
                        onChange={(event) =>
                          setDraftField('heroImageCrop', {
                            ...draft.heroImageCrop,
                            focusX: Number(event.target.value),
                          })
                        }
                      />
                    </label>

                    <label className="admin-field">
                      <span className="admin-field-label">상하 초점 ({Math.round(draft.heroImageCrop.focusY)}%)</span>
                      <input
                        className={styles.rangeInput}
                        type="range"
                        min="0"
                        max="100"
                        value={draft.heroImageCrop.focusY}
                        onChange={(event) =>
                          setDraftField('heroImageCrop', {
                            ...draft.heroImageCrop,
                            focusY: Number(event.target.value),
                          })
                        }
                      />
                    </label>

                    <label className="admin-field">
                      <span className="admin-field-label">확대 ({draft.heroImageCrop.zoom.toFixed(2)}x)</span>
                      <input
                        className={styles.rangeInput}
                        type="range"
                        min="1"
                        max="2.6"
                        step="0.05"
                        value={draft.heroImageCrop.zoom}
                        onChange={(event) =>
                          setDraftField('heroImageCrop', {
                            ...draft.heroImageCrop,
                            zoom: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  </div>

                  <div className={styles.heroPreviewStack}>
                    <div className={styles.previewCard}>
                      <span className={styles.previewLabel}>히어로 미리보기</span>
                      <div className={styles.heroFrame}>
                        {draft.heroImage ? <img src={draft.heroImage.url} alt={draft.heroImage.name} className={styles.previewImage} style={getHeroMediaStyle(draft)} /> : null}
                      </div>
                    </div>

                    <div className={styles.previewCard}>
                      <span className={styles.previewLabel}>썸네일 미리보기</span>
                      <div className={styles.thumbFrame}>
                        {draft.heroThumbnailUrl || draft.heroImage ? (
                          <img
                            src={draft.heroThumbnailUrl || draft.heroImage?.url}
                            alt={draft.heroImage?.name ?? '대표 썸네일'}
                            className={styles.thumbnailImage}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState title="대표 이미지로 쓸 사진이 없습니다." description="갤러리에 이미지를 추가한 뒤 대표 이미지와 크롭 구도를 설정해주세요." />
              )}
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h3 className={styles.panelTitle}>사진 관리</h3>
                <p className={styles.panelDescription}>기존 청첩장 이미지 가져오기, 추억 페이지 전용 업로드, 드래그 정렬, 대표 이미지 지정, 삭제를 지원합니다.</p>
              </div>
              <div className={styles.panelActions}>
                <button type="button" className="admin-button admin-button-secondary" onClick={handleImportInvitationImages}>
                  기존 이미지 가져오기
                </button>
              </div>
            </div>

            <div className={styles.uploadRow}>
              <label className="admin-field">
                <span className="admin-field-label">업로드 카테고리</span>
                <select className="admin-select" value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value as MemoryGalleryCategory)}>
                  {GALLERY_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span className="admin-field-label">파일 선택</span>
                <input
                  className="admin-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setSelectedFiles(event.target.files ? Array.from(event.target.files) : [])}
                />
              </label>

              <button type="button" className="admin-button admin-button-primary" onClick={handleUploadImages} disabled={uploading || selectedFiles.length === 0}>
                {uploading ? '업로드 중...' : `이미지 업로드${selectedFiles.length ? ` (${selectedFiles.length})` : ''}`}
              </button>
            </div>

            {draft.galleryImages.length > 0 ? (
              <>
                <p className={styles.helperText}>카드를 드래그해서 순서를 바꾸면 공개 페이지 갤러리와 라이트박스 순서가 함께 변경됩니다.</p>
                <div className={styles.galleryGrid}>
                  {sortByOrder(draft.galleryImages).map((image, index) => {
                    const isDragging = dragState?.type === 'gallery' && dragState.activeId === image.id;
                    const isDropTarget = dragState?.type === 'gallery' && dragState.overId === image.id;

                    return (
                      <article
                        key={image.id}
                        className={`${styles.galleryCard} ${isDragging ? styles.sortableDragging : ''} ${isDropTarget ? styles.sortableDropTarget : ''}`}
                        draggable
                        onDragStart={() => handleDragStart('gallery', image.id)}
                        onDragEnter={() => handleDragEnter('gallery', image.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDragEnd={handleDragEnd}
                        onDrop={() => applyDropReorder('gallery', image.id)}
                      >
                        <div className={styles.dragHandle}>드래그로 순서 변경</div>
                        <img className={styles.galleryImage} src={image.url} alt={image.name} />
                        <div className={styles.galleryBody}>
                          <div className={styles.galleryMeta}>
                            <StatusBadge tone={image.source === 'memory' ? 'primary' : 'neutral'}>
                              {image.source === 'memory' ? '추억 업로드' : '청첩장 원본'}
                            </StatusBadge>
                            <StatusBadge tone={draft.heroImage?.id === image.id ? 'success' : 'neutral'}>
                              {draft.heroImage?.id === image.id ? '대표 이미지' : `순서 ${index + 1}`}
                            </StatusBadge>
                          </div>

                          <p className={styles.galleryName}>{image.name}</p>

                          <label className="admin-field">
                            <span className="admin-field-label">카테고리</span>
                            <select
                              className="admin-select"
                              value={image.category}
                              onChange={(event) =>
                                setDraft({
                                  ...draft,
                                  galleryImages: draft.galleryImages.map((galleryImage) =>
                                    galleryImage.id === image.id ? { ...galleryImage, category: event.target.value as MemoryGalleryCategory } : galleryImage
                                  ),
                                })
                              }
                            >
                              {GALLERY_CATEGORY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="admin-field">
                            <span className="admin-field-label">캡션</span>
                            <input
                              className="admin-input"
                              value={image.caption}
                              onChange={(event) =>
                                setDraft({
                                  ...draft,
                                  galleryImages: draft.galleryImages.map((galleryImage) =>
                                    galleryImage.id === image.id ? { ...galleryImage, caption: event.target.value } : galleryImage
                                  ),
                                })
                              }
                            />
                          </label>

                          <div className={styles.inlineActions}>
                            <button type="button" className="admin-button admin-button-secondary" onClick={() => void handleHeroImageChange(image.id)}>
                              대표 지정
                            </button>
                            <button
                              type="button"
                              className="admin-button admin-button-ghost"
                              onClick={() => setDraft({ ...draft, galleryImages: moveItemByDirection(draft.galleryImages, image.id, -1) })}
                              disabled={index === 0}
                            >
                              위로
                            </button>
                            <button
                              type="button"
                              className="admin-button admin-button-ghost"
                              onClick={() => setDraft({ ...draft, galleryImages: moveItemByDirection(draft.galleryImages, image.id, 1) })}
                              disabled={index === draft.galleryImages.length - 1}
                            >
                              아래로
                            </button>
                            <button type="button" className="admin-button admin-button-danger" onClick={() => void handleRemoveGalleryImage(image)}>
                              삭제
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyState title="등록된 이미지가 없습니다." description="기존 청첩장 이미지 가져오기 또는 새 이미지 업로드로 추억 페이지를 채워보세요." />
            )}
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h3 className={styles.panelTitle}>댓글 선택</h3>
                <p className={styles.panelDescription}>방명록 전체 자동 노출 대신, 공개할 댓글만 골라 순서와 노출 여부를 정리합니다.</p>
              </div>
              <div className={styles.panelActions}>
                <button type="button" className="admin-button admin-button-secondary" onClick={handleSuggestComments}>
                  추천 댓글 가져오기
                </button>
              </div>
            </div>

            <div className={styles.commentColumns}>
              <div className={styles.commentPanel}>
                <label className="admin-field">
                  <span className="admin-field-label">원본 댓글 검색</span>
                  <input
                    className="admin-input"
                    type="search"
                    value={commentSearch}
                    onChange={(event) => setCommentSearch(event.target.value)}
                    placeholder="작성자 또는 메시지 검색"
                  />
                </label>

                <div className={styles.selectionToolbar}>
                  <button type="button" className="admin-button admin-button-ghost" onClick={() => setSelectedSourceCommentIds(filteredSourceComments.map((comment) => comment.id))}>
                    필터 결과 전체 선택
                  </button>
                  <button type="button" className="admin-button admin-button-ghost" onClick={() => setSelectedSourceCommentIds([])}>
                    선택 해제
                  </button>
                  <button type="button" className="admin-button admin-button-secondary" onClick={handleBulkAddComments} disabled={selectedSourceCommentIds.length === 0}>
                    선택 댓글 추가
                  </button>
                </div>

                <div className={styles.commentList}>
                  {filteredSourceComments.length > 0 ? (
                    filteredSourceComments.map((comment) => {
                      const alreadySelected = draft.selectedComments.some((selectedComment) => selectedComment.sourceCommentId === comment.id);

                      return (
                        <article key={comment.id} className={styles.commentCard}>
                          <div className={styles.commentCardHeader}>
                            <label className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={selectedSourceCommentIds.includes(comment.id)}
                                onChange={(event) => setSelectedSourceCommentIds((prev) => toggleSelection(prev, comment.id, event.target.checked))}
                              />
                              <strong>{comment.author}</strong>
                            </label>
                            <StatusBadge tone="neutral">{comment.pageSlug}</StatusBadge>
                          </div>
                          <p className={styles.commentMessage}>{comment.message}</p>
                          <button type="button" className="admin-button admin-button-ghost" onClick={() => handleAddComment(comment)} disabled={alreadySelected}>
                            {alreadySelected ? '선택됨' : '공개 목록에 추가'}
                          </button>
                        </article>
                      );
                    })
                  ) : (
                    <EmptyState title="검색 조건에 맞는 댓글이 없습니다." description="검색어를 바꾸거나 추천 댓글 가져오기를 사용해보세요." />
                  )}
                </div>
              </div>

              <div className={styles.commentPanel}>
                <div className={styles.commentPanelHeader}>
                  <div>
                    <p className={styles.subsectionTitle}>선택된 댓글</p>
                    <p className={styles.subsectionDescription}>드래그로 순서를 바꾸고, 일괄 노출/숨김/제거까지 한 번에 처리할 수 있습니다.</p>
                  </div>
                </div>

                <div className={styles.selectionToolbar}>
                  <button type="button" className="admin-button admin-button-ghost" onClick={() => setSelectedManagedCommentIds(draft.selectedComments.map((comment) => comment.id))}>
                    전체 선택
                  </button>
                  <button type="button" className="admin-button admin-button-ghost" onClick={() => setSelectedManagedCommentIds([])}>
                    선택 해제
                  </button>
                  <button type="button" className="admin-button admin-button-secondary" onClick={() => handleBulkSelectedCommentVisibility(true)} disabled={selectedManagedCommentIds.length === 0}>
                    선택 노출
                  </button>
                  <button type="button" className="admin-button admin-button-secondary" onClick={() => handleBulkSelectedCommentVisibility(false)} disabled={selectedManagedCommentIds.length === 0}>
                    선택 숨김
                  </button>
                  <button type="button" className="admin-button admin-button-danger" onClick={handleBulkRemoveSelectedComments} disabled={selectedManagedCommentIds.length === 0}>
                    선택 제거
                  </button>
                </div>

                {draft.selectedComments.length > 0 ? (
                  <div className={styles.commentList}>
                    {sortByOrder(draft.selectedComments).map((comment, index) => {
                      const isDragging = dragState?.type === 'selectedComment' && dragState.activeId === comment.id;
                      const isDropTarget = dragState?.type === 'selectedComment' && dragState.overId === comment.id;

                      return (
                        <article
                          key={comment.id}
                          className={`${styles.commentCard} ${isDragging ? styles.sortableDragging : ''} ${isDropTarget ? styles.sortableDropTarget : ''}`}
                          draggable
                          onDragStart={() => handleDragStart('selectedComment', comment.id)}
                          onDragEnter={() => handleDragEnter('selectedComment', comment.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDragEnd={handleDragEnd}
                          onDrop={() => applyDropReorder('selectedComment', comment.id)}
                        >
                          <div className={styles.dragHandle}>드래그로 순서 변경</div>
                          <div className={styles.commentCardHeader}>
                            <label className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={selectedManagedCommentIds.includes(comment.id)}
                                onChange={(event) => setSelectedManagedCommentIds((prev) => toggleSelection(prev, comment.id, event.target.checked))}
                              />
                              <strong>{comment.author}</strong>
                            </label>
                            <StatusBadge tone={comment.isVisible ? 'success' : 'neutral'}>
                              {comment.isVisible ? `노출 ${index + 1}` : '숨김'}
                            </StatusBadge>
                          </div>
                          <p className={styles.commentMessage}>{comment.message}</p>
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              className="admin-button admin-button-secondary"
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  selectedComments: draft.selectedComments.map((selectedComment) =>
                                    selectedComment.id === comment.id ? { ...selectedComment, isVisible: !selectedComment.isVisible } : selectedComment
                                  ),
                                })
                              }
                            >
                              {comment.isVisible ? '숨김' : '노출'}
                            </button>
                            <button
                              type="button"
                              className="admin-button admin-button-ghost"
                              onClick={() => setDraft({ ...draft, selectedComments: moveItemByDirection(draft.selectedComments, comment.id, -1) })}
                              disabled={index === 0}
                            >
                              위로
                            </button>
                            <button
                              type="button"
                              className="admin-button admin-button-ghost"
                              onClick={() => setDraft({ ...draft, selectedComments: moveItemByDirection(draft.selectedComments, comment.id, 1) })}
                              disabled={index === draft.selectedComments.length - 1}
                            >
                              아래로
                            </button>
                            <button type="button" className="admin-button admin-button-danger" onClick={() => handleRemoveComment(comment.id)}>
                              제거
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState title="공개할 댓글이 아직 없습니다." description="원본 댓글 목록에서 공개할 메시지를 선택해 추억 페이지에 담아보세요." />
                )}
              </div>
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h3 className={styles.panelTitle}>타임라인 관리</h3>
                <p className={styles.panelDescription}>예식의 흐름을 순서 기반 기록으로 정리하고 드래그로 빠르게 재배치할 수 있습니다.</p>
              </div>
              <div className={styles.panelActions}>
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      timelineItems: [
                        ...draft.timelineItems,
                        {
                          id: createTimelineId(),
                          title: '',
                          description: '',
                          eventTime: '',
                          order: draft.timelineItems.length,
                        },
                      ],
                    })
                  }
                >
                  항목 추가
                </button>
              </div>
            </div>

            {draft.timelineItems.length > 0 ? (
              <div className={styles.timelineList}>
                {sortByOrder(draft.timelineItems).map((item, index) => {
                  const isDragging = dragState?.type === 'timeline' && dragState.activeId === item.id;
                  const isDropTarget = dragState?.type === 'timeline' && dragState.overId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`${styles.timelineItem} ${isDragging ? styles.sortableDragging : ''} ${isDropTarget ? styles.sortableDropTarget : ''}`}
                      draggable
                      onDragStart={() => handleDragStart('timeline', item.id)}
                      onDragEnter={() => handleDragEnter('timeline', item.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDragEnd={handleDragEnd}
                      onDrop={() => applyDropReorder('timeline', item.id)}
                    >
                      <div className={styles.dragHandle}>드래그로 순서 변경</div>
                      <div className={styles.timelineGrid}>
                        <label className="admin-field">
                          <span className="admin-field-label">항목 제목</span>
                          <input
                            className="admin-input"
                            value={item.title}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                timelineItems: draft.timelineItems.map((timelineItem) =>
                                  timelineItem.id === item.id ? { ...timelineItem, title: event.target.value } : timelineItem
                                ),
                              })
                            }
                          />
                        </label>

                        <label className="admin-field">
                          <span className="admin-field-label">시간</span>
                          <input
                            className="admin-input"
                            value={item.eventTime}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                timelineItems: draft.timelineItems.map((timelineItem) =>
                                  timelineItem.id === item.id ? { ...timelineItem, eventTime: event.target.value } : timelineItem
                                ),
                              })
                            }
                            placeholder="예: 12:30"
                          />
                        </label>

                        <label className={`${styles.fullSpan} admin-field`}>
                          <span className="admin-field-label">설명</span>
                          <textarea
                            className="admin-textarea"
                            value={item.description}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                timelineItems: draft.timelineItems.map((timelineItem) =>
                                  timelineItem.id === item.id ? { ...timelineItem, description: event.target.value } : timelineItem
                                ),
                              })
                            }
                            rows={3}
                          />
                        </label>
                      </div>
                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          className="admin-button admin-button-ghost"
                          onClick={() => setDraft({ ...draft, timelineItems: moveItemByDirection(draft.timelineItems, item.id, -1) })}
                          disabled={index === 0}
                        >
                          위로
                        </button>
                        <button
                          type="button"
                          className="admin-button admin-button-ghost"
                          onClick={() => setDraft({ ...draft, timelineItems: moveItemByDirection(draft.timelineItems, item.id, 1) })}
                          disabled={index === draft.timelineItems.length - 1}
                        >
                          아래로
                        </button>
                        <button
                          type="button"
                          className="admin-button admin-button-danger"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              timelineItems: normalizeOrder(draft.timelineItems.filter((timelineItem) => timelineItem.id !== item.id)),
                            })
                          }
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="등록된 타임라인이 없습니다." description="예식의 흐름을 한 줄씩 추가해 추억 페이지를 더 기록형으로 정리할 수 있습니다." />
            )}
          </section>

          <div className={styles.footerBar}>
            <div className={styles.footerMeta}>
              <span className={styles.footerLabel}>공유 주소</span>
              <strong>{previewPath || '-'}</strong>
            </div>
            <div className={styles.footerActions}>
              <button type="button" className="admin-button admin-button-secondary" onClick={openPreview} disabled={!draft}>
                미리보기
              </button>
              {draft.enabled ? (
                <button type="button" className="admin-button admin-button-ghost" onClick={handleUnpublish} disabled={saving}>
                  비공개 전환
                </button>
              ) : null}
              <button type="button" className="admin-button admin-button-primary" onClick={() => void persistDraft('save')} disabled={saving}>
                {saving ? '저장 중...' : exists ? '저장' : '초안 생성'}
              </button>
              <button type="button" className="admin-button admin-button-secondary" onClick={() => void persistDraft('publish')} disabled={saving}>
                공개
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
