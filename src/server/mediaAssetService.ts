import 'server-only';

import { collectMediaUsageReferences, getMediaAssetPaths, getMediaAssetUsage, groupMediaAssetFiles, type MediaAssetFile } from '@/lib/mediaAssets';
import { getServerStorageBucket } from './firebaseAdmin';
import { getServerEditableInvitationPageConfig } from './invitationPageServerService';
import { firestoreEventRepository } from './repositories/eventRepository';
import { memoryPageMetadataRepository } from './repositories/memoryPageMetadataRepository';

export class MediaAssetError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'MediaAssetError';
  }
}

interface MediaAssetDependencies {
  loadConfig?: (slug: string) => Promise<{ config: unknown } | null>;
  loadMemory?: (slug: string) => Promise<unknown>;
  storage?: {
    listFiles: (slug: string) => Promise<MediaAssetFile[]>;
    deleteFile: (path: string) => Promise<unknown>;
  };
}

function requireSafePageSlug(slug: string) {
  const normalized = slug.trim();
  if (!normalized || /[\\/\u0000]/.test(normalized) || normalized === '.' || normalized === '..') {
    throw new MediaAssetError(400, '올바른 페이지 주소가 필요합니다.');
  }
  return normalized;
}

export async function getServerMediaUsageReferences(slug: string, dependencies: MediaAssetDependencies = {}) {
  const pageSlug = requireSafePageSlug(slug);
  if ((!dependencies.loadConfig || !dependencies.loadMemory) && !firestoreEventRepository.isAvailable()) {
    throw new MediaAssetError(503, '저장된 이미지 사용 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  const [editable, memory] = await Promise.all([
    (dependencies.loadConfig ?? getServerEditableInvitationPageConfig)(pageSlug),
    (dependencies.loadMemory ?? memoryPageMetadataRepository.findBySlug)(pageSlug),
  ]);
  if (!editable) throw new MediaAssetError(404, '초대장 사용 정보를 찾지 못했습니다. 페이지를 확인해 주세요.');
  return collectMediaUsageReferences(editable.config, memory);
}

function getMediaStorage() {
  const bucket = getServerStorageBucket();
  if (!bucket) throw new MediaAssetError(503, '이미지 저장소를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  return {
    async listFiles(slug: string): Promise<MediaAssetFile[]> {
      const prefix = `wedding-images/${slug}/`;
      const [files] = await bucket.getFiles({ prefix });
      return Promise.all(files.filter((file) => !file.name.slice(prefix.length).includes('/')).map(async (file) => {
        const [metadata] = await file.getMetadata();
        const createdAt = metadata.timeCreated ? new Date(metadata.timeCreated) : null;
        return {
          name: file.name.slice(prefix.length), path: file.name, url: '',
          uploadedAt: createdAt && Number.isFinite(createdAt.getTime()) ? createdAt : null,
          variant: typeof metadata.metadata?.variant === 'string' ? metadata.metadata.variant : undefined,
        };
      }));
    },
    deleteFile: (path: string) => bucket.file(path).delete({ ignoreNotFound: true }),
  };
}

export async function deleteServerMediaAsset(slug: string, imagePath: string, dependencies: MediaAssetDependencies = {}) {
  const pageSlug = requireSafePageSlug(slug);
  const prefix = `wedding-images/${pageSlug}/`;
  const path = typeof imagePath === 'string' ? imagePath.trim() : '';
  const name = path.slice(prefix.length);
  if (!path.startsWith(prefix) || !name || /[\\/\u0000]/.test(name) || name === '.' || name === '..') {
    throw new MediaAssetError(400, '이 페이지의 이미지 경로만 삭제할 수 있습니다.');
  }
  const storage = dependencies.storage ?? getMediaStorage();
  const assets = groupMediaAssetFiles(await storage.listFiles(pageSlug));
  const asset = assets.find((candidate) => getMediaAssetPaths(candidate).includes(path));
  if (!asset) throw new MediaAssetError(404, '삭제할 이미지를 찾지 못했습니다. 목록을 새로고침해 주세요.');

  // 삭제 직전에 저장된 참조를 확인하며 조회 실패 시 삭제하지 않습니다.
  const references = await getServerMediaUsageReferences(pageSlug, dependencies);
  const usage = getMediaAssetUsage(asset, references);
  if (usage.length) {
    throw new MediaAssetError(409, `사용 중인 이미지는 삭제할 수 없습니다 (${usage.join(', ')}). 편집 화면에서 먼저 교체하고 저장해 주세요.`);
  }
  const paths = getMediaAssetPaths(asset);
  await Promise.all(paths.map((assetPath) => storage.deleteFile(assetPath)));
  return { deletedPaths: paths };
}
