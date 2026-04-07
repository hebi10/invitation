import { randomUUID } from 'node:crypto';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  type EditableImageAssetKind,
  validateEditableImageBatch,
} from '@/lib/imageUploadPolicy';
import { CLIENT_EDITOR_SESSION_COOKIE } from '@/server/clientEditorSession';
import { getAuthorizedClientEditorSession } from '@/server/clientEditorSessionAuth';
import { getServerStorageBucket } from '@/server/firebaseAdmin';

const ALLOWED_ASSET_KINDS: EditableImageAssetKind[] = ['cover', 'favicon', 'gallery'];

function sanitizeFileNameSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildStoredFileName(fileName: string, assetKind: EditableImageAssetKind) {
  const extensionIndex = fileName.lastIndexOf('.');
  const extension =
    extensionIndex >= 0 ? sanitizeFileNameSegment(fileName.slice(extensionIndex + 1)) : '';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const prefix = sanitizeFileNameSegment(assetKind) || 'image';

  return extension
    ? `${prefix}-${timestamp}-${randomSuffix}.${extension}`
    : `${prefix}-${timestamp}-${randomSuffix}`;
}

async function authorizePageSession(pageSlug: string) {
  const cookieStore = await cookies();
  return getAuthorizedClientEditorSession(
    pageSlug,
    cookieStore.get(CLIENT_EDITOR_SESSION_COOKIE)?.value
  );
}

function readAssetKind(value: FormDataEntryValue | null): EditableImageAssetKind | null {
  if (typeof value !== 'string') {
    return null;
  }

  return ALLOWED_ASSET_KINDS.includes(value as EditableImageAssetKind)
    ? (value as EditableImageAssetKind)
    : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const pageSlug = slug.trim();

  const session = await authorizePageSession(pageSlug);
  if (!session) {
    return NextResponse.json(
      { error: '이미지 업로드 권한이 없습니다. 다시 로그인해 주세요.' },
      { status: 401 }
    );
  }

  const bucket = getServerStorageBucket();
  if (!bucket) {
    return NextResponse.json(
      { error: '이미지 저장소가 준비되지 않았습니다. 관리자에게 문의해 주세요.' },
      { status: 503 }
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const assetKind = readAssetKind(formData?.get('assetKind') ?? null);

  if (!(file instanceof File) || !assetKind) {
    return NextResponse.json(
      { error: '업로드할 이미지와 자산 종류를 함께 보내 주세요.' },
      { status: 400 }
    );
  }

  const validationError = validateEditableImageBatch([file], assetKind);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const storedFileName = buildStoredFileName(file.name, assetKind);
  const imagePath = `wedding-images/${pageSlug}/${storedFileName}`;
  const downloadToken = randomUUID();

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const bucketFile = bucket.file(imagePath);

    await bucketFile.save(buffer, {
      resumable: false,
      metadata: {
        contentType: file.type || 'image/jpeg',
        metadata: {
          pageSlug,
          assetKind,
          originalFileName: file.name,
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    const encodedPath = encodeURIComponent(imagePath);
    const bucketName = bucket.name;
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    return NextResponse.json({
      name: storedFileName,
      url,
      path: imagePath,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[client-editor/images] failed to upload image', error);
    return NextResponse.json(
      { error: '이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
