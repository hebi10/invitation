import type { InvitationPage } from '@/types/invitationPage';
import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';
import type { Comment } from '@/services/commentService';
import { getComments } from '@/services/commentService';
import type { UploadedImage } from '@/services/imageService';
import { getPageImages } from '@/services/imageService';
import { getInvitationPageBySlug } from '@/services/invitationPageService';
import type {
  MemoryGalleryCategory,
  MemoryGalleryImage,
  MemoryHeroImageCrop,
  MemoryPage,
  MemoryPageVisibility,
  MemorySelectedComment,
  MemoryTimelineItem,
} from '@/types/memoryPage';
import { DEFAULT_MEMORY_HERO_CROP } from '@/types/memoryPage';
import { optimizeUploadImage } from '@/utils/imageCompression';

type FirestoreModules = {
  collection: any;
  deleteDoc: any;
  doc: any;
  getDoc: any;
  getDocs: any;
  setDoc: any;
};

type StorageModules = {
  deleteObject: any;
  getDownloadURL: any;
  ref: any;
  uploadBytes: any;
};

const COLLECTION_NAME = 'memory-pages';

let firestoreModules: FirestoreModules | null = null;
let storageModules: StorageModules | null = null;

const mockMemoryPages = new Map<string, MemoryPage>();

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toDate(value: unknown, fallback = new Date()) {
  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
}

function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((left, right) => left.order - right.order);
}

function normalizeHeroCrop(crop?: Partial<MemoryHeroImageCrop> | null): MemoryHeroImageCrop {
  return {
    focusX: clamp(Number(crop?.focusX ?? DEFAULT_MEMORY_HERO_CROP.focusX), 0, 100),
    focusY: clamp(Number(crop?.focusY ?? DEFAULT_MEMORY_HERO_CROP.focusY), 0, 100),
    zoom: clamp(Number(crop?.zoom ?? DEFAULT_MEMORY_HERO_CROP.zoom), 1, 2.6),
  };
}

function normalizeGalleryImage(image: Partial<MemoryGalleryImage>, index: number): MemoryGalleryImage {
  return {
    id: image.id ?? createId('memory-image'),
    name: image.name ?? `memory-image-${index + 1}`,
    url: image.url ?? '',
    path: image.path ?? '',
    source: image.source ?? 'memory',
    category: image.category ?? 'etc',
    caption: image.caption ?? '',
    order: image.order ?? index,
  };
}

function normalizeSelectedComment(comment: Partial<MemorySelectedComment>, index: number): MemorySelectedComment {
  return {
    id: comment.id ?? createId('memory-comment'),
    sourceCommentId: comment.sourceCommentId,
    author: comment.author ?? '',
    message: comment.message ?? '',
    createdAt: toDate(comment.createdAt),
    isVisible: comment.isVisible ?? true,
    order: comment.order ?? index,
  };
}

function normalizeTimelineItem(item: Partial<MemoryTimelineItem>, index: number): MemoryTimelineItem {
  return {
    id: item.id ?? createId('memory-timeline'),
    title: item.title ?? '',
    description: item.description ?? '',
    eventTime: item.eventTime ?? '',
    order: item.order ?? index,
  };
}

function syncHeroImage(memoryPage: MemoryPage): MemoryGalleryImage | null {
  if (!memoryPage.galleryImages.length) {
    return null;
  }

  if (!memoryPage.heroImage) {
    return sortByOrder(memoryPage.galleryImages)[0];
  }

  return (
    memoryPage.galleryImages.find((image) => image.id === memoryPage.heroImage?.id) ??
    sortByOrder(memoryPage.galleryImages)[0]
  );
}

function buildDefaultSeoTitle(page: Pick<MemoryPage, 'title' | 'groomName' | 'brideName'>) {
  return page.title || `${page.groomName} ♥ ${page.brideName}의 결혼식 기록`;
}

function buildDefaultSeoDescription(
  page: Pick<MemoryPage, 'introMessage' | 'weddingDate' | 'venueName'>
) {
  if (page.introMessage.trim()) {
    return page.introMessage.trim();
  }

  return `${page.weddingDate} ${page.venueName}에서 함께한 하루를 사진과 기록으로 다시 담아둔 추억 페이지입니다.`;
}

function normalizeMemoryPage(pageSlug: string, data: Partial<MemoryPage>): MemoryPage {
  const galleryImages = sortByOrder((data.galleryImages ?? []).map(normalizeGalleryImage));
  const selectedComments = sortByOrder(
    (data.selectedComments ?? []).map(normalizeSelectedComment)
  );
  const timelineItems = sortByOrder((data.timelineItems ?? []).map(normalizeTimelineItem));

  const normalized: MemoryPage = {
    pageSlug,
    enabled: data.enabled ?? false,
    visibility: data.visibility ?? 'private',
    title: data.title ?? '',
    subtitle: data.subtitle ?? '',
    introMessage: data.introMessage ?? '',
    thankYouMessage: data.thankYouMessage ?? '',
    heroImage: data.heroImage ? normalizeGalleryImage(data.heroImage, 0) : null,
    heroImageCrop: normalizeHeroCrop(data.heroImageCrop),
    heroThumbnailUrl: data.heroThumbnailUrl ?? '',
    weddingDate: data.weddingDate ?? '',
    venueName: data.venueName ?? '',
    venueAddress: data.venueAddress ?? '',
    groomName: data.groomName ?? '',
    brideName: data.brideName ?? '',
    galleryImages,
    selectedComments,
    timelineItems,
    seoTitle: data.seoTitle ?? '',
    seoDescription: data.seoDescription ?? '',
    seoNoIndex: data.seoNoIndex ?? false,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };

  normalized.heroImage = syncHeroImage(normalized);
  normalized.heroThumbnailUrl = normalized.heroThumbnailUrl || normalized.heroImage?.url || '';
  normalized.seoTitle = normalized.seoTitle.trim() || buildDefaultSeoTitle(normalized);
  normalized.seoDescription =
    normalized.seoDescription.trim() || buildDefaultSeoDescription(normalized);

  return normalized;
}

async function ensureFirestoreModules() {
  if (!USE_FIREBASE) {
    return null;
  }

  const { db } = await ensureFirebaseInit();
  if (!db) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  if (!firestoreModules) {
    const firestore = await import('firebase/firestore');
    firestoreModules = {
      collection: firestore.collection,
      deleteDoc: firestore.deleteDoc,
      doc: firestore.doc,
      getDoc: firestore.getDoc,
      getDocs: firestore.getDocs,
      setDoc: firestore.setDoc,
    };
  }

  return { db, modules: firestoreModules };
}

async function ensureStorageModules() {
  if (!USE_FIREBASE) {
    return null;
  }

  const { storage } = await ensureFirebaseInit();
  if (!storage) {
    throw new Error('Storage가 초기화되지 않았습니다.');
  }

  if (!storageModules) {
    const storageLib = await import('firebase/storage');
    storageModules = {
      deleteObject: storageLib.deleteObject,
      getDownloadURL: storageLib.getDownloadURL,
      ref: storageLib.ref,
      uploadBytes: storageLib.uploadBytes,
    };
  }

  return { storage, modules: storageModules };
}

function buildInvitationGalleryImages(images: UploadedImage[]): MemoryGalleryImage[] {
  return [...images]
    .sort((left, right) => left.uploadedAt.getTime() - right.uploadedAt.getTime())
    .map((image, index) => ({
      id: createId('memory-gallery'),
      name: image.name,
      url: image.url,
      path: image.path,
      source: 'invitation' as const,
      category: image.name.toLowerCase().includes('snap') ? 'snap' : 'ceremony',
      caption: '',
      order: index,
    }));
}

function buildDefaultTimeline(page: InvitationPage): MemoryTimelineItem[] {
  const ceremonyTime = page.pageData?.ceremonyTime ?? '';
  const venueName = page.pageData?.venueName ?? page.venue;

  return [
    {
      id: createId('timeline'),
      title: '예식 시작',
      description: `${venueName}에서 두 사람의 결혼식이 진행된 순간을 기록합니다.`,
      eventTime: ceremonyTime,
      order: 0,
    },
    {
      id: createId('timeline'),
      title: '사진 촬영',
      description: '가족과 하객분들이 함께한 장면을 사진으로 남겼습니다.',
      eventTime: '',
      order: 1,
    },
    {
      id: createId('timeline'),
      title: '감사 인사',
      description: '함께해주신 분들께 감사의 마음을 전한 시간을 정리합니다.',
      eventTime: '',
      order: 2,
    },
  ];
}

function commentToSelectedComment(comment: Comment, order: number): MemorySelectedComment {
  return {
    id: createId('memory-comment'),
    sourceCommentId: comment.id,
    author: comment.author,
    message: comment.message,
    createdAt: comment.createdAt,
    isVisible: true,
    order,
  };
}

async function loadImageElement(imageUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageUrl;
  });
}

export function buildMemoryPageUrl(pageSlug: string) {
  return `/memory/${pageSlug}/`;
}

export async function generateMemoryHeroThumbnail(
  imageUrl: string,
  crop: MemoryHeroImageCrop,
  size = 360
): Promise<string> {
  if (!imageUrl || typeof window === 'undefined' || typeof document === 'undefined') {
    return imageUrl;
  }

  try {
    const image = await loadImageElement(imageUrl);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      return imageUrl;
    }

    canvas.width = size;
    canvas.height = size;

    const safeZoom = clamp(crop.zoom, 1, 2.6);
    const sourceWidth = image.naturalWidth / safeZoom;
    const sourceHeight = image.naturalHeight / safeZoom;
    const centerX = (clamp(crop.focusX, 0, 100) / 100) * image.naturalWidth;
    const centerY = (clamp(crop.focusY, 0, 100) / 100) * image.naturalHeight;
    const sourceX = clamp(
      centerX - sourceWidth / 2,
      0,
      Math.max(0, image.naturalWidth - sourceWidth)
    );
    const sourceY = clamp(
      centerY - sourceHeight / 2,
      0,
      Math.max(0, image.naturalHeight - sourceHeight)
    );

    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.84);
  } catch (error) {
    console.warn('Failed to generate memory hero thumbnail.', error);
    return imageUrl;
  }
}

export async function createMemoryPageDraftFromInvitation(
  pageSlug: string
): Promise<MemoryPage> {
  const page = await getInvitationPageBySlug(pageSlug);
  if (!page) {
    throw new Error('청첩장 데이터를 찾을 수 없습니다.');
  }

  const invitationImages = buildInvitationGalleryImages(await getPageImages(pageSlug));
  const now = new Date();

  return normalizeMemoryPage(pageSlug, {
    pageSlug,
    enabled: false,
    visibility: 'private',
    title: `${page.groomName} ♥ ${page.brideName}의 결혼식 기록`,
    subtitle: '함께해주신 마음을 천천히 다시 꺼내보는 추억 페이지입니다.',
    introMessage:
      page.pageData?.greetingMessage ?? '결혼식 하루를 사진과 짧은 기록으로 다시 정리했습니다.',
    thankYouMessage: '함께해주신 모든 분들께 진심으로 감사드립니다.',
    heroImage: invitationImages[0] ?? null,
    heroImageCrop: DEFAULT_MEMORY_HERO_CROP,
    heroThumbnailUrl: invitationImages[0]?.url ?? '',
    weddingDate: page.date,
    venueName: page.pageData?.venueName ?? page.venue,
    venueAddress: page.pageData?.ceremonyAddress ?? page.venue,
    groomName: page.groomName,
    brideName: page.brideName,
    galleryImages: invitationImages,
    selectedComments: [],
    timelineItems: buildDefaultTimeline(page),
    seoTitle: `${page.groomName} ♥ ${page.brideName}의 결혼식 기록`,
    seoDescription: `${page.date} ${page.venue}에서 함께한 결혼식의 순간을 사진과 메시지로 다시 담은 추억 페이지입니다.`,
    seoNoIndex: false,
    createdAt: now,
    updatedAt: now,
  });
}

export async function mergeInvitationGalleryImages(
  pageSlug: string,
  currentImages: MemoryGalleryImage[]
): Promise<MemoryGalleryImage[]> {
  const importedImages = buildInvitationGalleryImages(await getPageImages(pageSlug));
  const existingKeys = new Set(
    currentImages.map((image) => `${image.source}:${image.path || image.url}`)
  );
  const nextOrderStart = currentImages.length;

  const merged = importedImages
    .filter((image) => !existingKeys.has(`${image.source}:${image.path || image.url}`))
    .map((image, index) => ({
      ...image,
      order: nextOrderStart + index,
    }));

  return sortByOrder([...currentImages, ...merged]);
}

export async function suggestCommentsFromInvitation(
  pageSlug: string,
  existingComments: MemorySelectedComment[],
  limit = 3
): Promise<MemorySelectedComment[]> {
  const sourceComments = await getComments(pageSlug);
  const existingIds = new Set(
    existingComments.map((comment) => comment.sourceCommentId).filter(Boolean)
  );

  const nextComments = sourceComments
    .filter((comment) => !existingIds.has(comment.id))
    .slice(0, limit)
    .map((comment, index) =>
      commentToSelectedComment(comment, existingComments.length + index)
    );

  return sortByOrder([...existingComments, ...nextComments]);
}

export async function getMemoryPageByPageSlug(pageSlug: string): Promise<MemoryPage | null> {
  if (!USE_FIREBASE) {
    return mockMemoryPages.get(pageSlug) ?? null;
  }

  const firebase = await ensureFirestoreModules();
  if (!firebase) {
    return null;
  }

  const snapshot = await firebase.modules.getDoc(
    firebase.modules.doc(firebase.db, COLLECTION_NAME, pageSlug)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeMemoryPage(pageSlug, snapshot.data());
}

export async function getMemoryPageBySlug(pageSlug: string): Promise<MemoryPage | null> {
  return getMemoryPageByPageSlug(pageSlug);
}

export async function getAllMemoryPages(): Promise<MemoryPage[]> {
  if (!USE_FIREBASE) {
    return [...mockMemoryPages.values()].sort(
      (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()
    );
  }

  const firebase = await ensureFirestoreModules();
  if (!firebase) {
    return [];
  }

  const snapshot = await firebase.modules.getDocs(
    firebase.modules.collection(firebase.db, COLLECTION_NAME)
  );

  return snapshot.docs
    .map((docSnapshot: { id: string; data: () => Partial<MemoryPage> }) =>
      normalizeMemoryPage(docSnapshot.id, docSnapshot.data())
    )
    .sort((left: MemoryPage, right: MemoryPage) => right.updatedAt.getTime() - left.updatedAt.getTime());
}

export async function saveMemoryPage(memoryPage: MemoryPage): Promise<MemoryPage> {
  const normalized = normalizeMemoryPage(memoryPage.pageSlug, {
    ...memoryPage,
    heroImage: memoryPage.heroImage ?? memoryPage.galleryImages[0] ?? null,
    heroThumbnailUrl: memoryPage.heroThumbnailUrl || memoryPage.heroImage?.url || '',
    updatedAt: new Date(),
  });

  if (!USE_FIREBASE) {
    mockMemoryPages.set(normalized.pageSlug, normalized);
    return normalized;
  }

  const firebase = await ensureFirestoreModules();
  if (!firebase) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  await firebase.modules.setDoc(
    firebase.modules.doc(firebase.db, COLLECTION_NAME, normalized.pageSlug),
    normalized
  );

  return normalized;
}

export async function publishMemoryPage(
  pageSlug: string,
  visibility: MemoryPageVisibility = 'public'
): Promise<MemoryPage> {
  const existing = await getMemoryPageByPageSlug(pageSlug);
  if (!existing) {
    throw new Error('추억 페이지 초안이 없습니다.');
  }

  return saveMemoryPage({
    ...existing,
    enabled: true,
    visibility,
  });
}

export async function unpublishMemoryPage(pageSlug: string): Promise<MemoryPage> {
  const existing = await getMemoryPageByPageSlug(pageSlug);
  if (!existing) {
    throw new Error('추억 페이지 초안이 없습니다.');
  }

  return saveMemoryPage({
    ...existing,
    enabled: false,
    visibility: 'private',
  });
}

export async function uploadMemoryImages(
  pageSlug: string,
  files: File[],
  category: MemoryGalleryCategory,
  orderStart: number
): Promise<MemoryGalleryImage[]> {
  if (!files.length) {
    return [];
  }

  if (!USE_FIREBASE) {
    return files.map((file, index) => ({
      id: createId('memory-upload'),
      name: file.name,
      url: `/images/${file.name}`,
      path: `memory-images/${pageSlug}/${file.name}`,
      source: 'memory',
      category,
      caption: '',
      order: orderStart + index,
    }));
  }

  const storageState = await ensureStorageModules();
  if (!storageState) {
    throw new Error('Storage가 초기화되지 않았습니다.');
  }

  return Promise.all(
    files.map(async (file, index) => {
      const optimizedFile = await optimizeUploadImage(file, {
        maxWidth: 2200,
        maxHeight: 2200,
        quality: 0.82,
      });
      const safeFileName = optimizedFile.name.replace(/\s+/g, '-');
      const path = `memory-images/${pageSlug}/${Date.now()}-${index}-${safeFileName}`;
      const storageRef = storageState.modules.ref(storageState.storage, path);
      const snapshot = await storageState.modules.uploadBytes(storageRef, optimizedFile);
      const url = await storageState.modules.getDownloadURL(snapshot.ref);

      return {
        id: createId('memory-upload'),
        name: optimizedFile.name,
        url,
        path,
        source: 'memory' as const,
        category,
        caption: '',
        order: orderStart + index,
      };
    })
  );
}

export async function deleteMemoryImageAsset(image: MemoryGalleryImage): Promise<void> {
  if (image.source !== 'memory' || !image.path || !USE_FIREBASE) {
    return;
  }

  const storageState = await ensureStorageModules();
  if (!storageState) {
    return;
  }

  await storageState.modules.deleteObject(
    storageState.modules.ref(storageState.storage, image.path)
  );
}

export async function deleteMemoryPage(pageSlug: string): Promise<void> {
  const existing = await getMemoryPageByPageSlug(pageSlug);
  if (!existing) {
    return;
  }

  await Promise.all(existing.galleryImages.map((image) => deleteMemoryImageAsset(image)));

  if (!USE_FIREBASE) {
    mockMemoryPages.delete(pageSlug);
    return;
  }

  const firebase = await ensureFirestoreModules();
  if (!firebase) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  await firebase.modules.deleteDoc(
    firebase.modules.doc(firebase.db, COLLECTION_NAME, pageSlug)
  );
}

export function createSelectedCommentSnapshot(
  comment: Comment,
  order: number
): MemorySelectedComment {
  return commentToSelectedComment(comment, order);
}
