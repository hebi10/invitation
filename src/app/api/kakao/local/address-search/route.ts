import { NextResponse } from 'next/server';

import {
  applyRateLimit,
  buildRateLimitHeaders,
  readRequestClientKey,
} from '@/server/requestRateLimit';

type KakaoAddressRecord = {
  address_name?: unknown;
  x?: unknown;
  y?: unknown;
};

type KakaoAddressDocument = KakaoAddressRecord & {
  road_address?: KakaoAddressRecord | null;
  address?: KakaoAddressRecord | null;
};

const MAX_QUERY_LENGTH = 120;
const ADDRESS_SEARCH_RATE_LIMIT = {
  limit: 20,
  windowMs: 60 * 1000,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function getKakaoRestApiKey() {
  return process.env.KAKAO_REST_API_KEY?.trim() || '';
}

function normalizePrimaryDocument(document: unknown) {
  if (!isRecord(document)) {
    return null;
  }

  const typedDocument = document as KakaoAddressDocument;
  const roadAddress = isRecord(typedDocument.road_address)
    ? typedDocument.road_address
    : null;
  const address = isRecord(typedDocument.address)
    ? typedDocument.address
    : null;

  const addressName =
    readString(roadAddress?.address_name) ||
    readString(address?.address_name) ||
    readString(typedDocument.address_name);
  const latitude = readNumber(roadAddress?.y ?? address?.y ?? typedDocument.y);
  const longitude = readNumber(roadAddress?.x ?? address?.x ?? typedDocument.x);

  if (!addressName || latitude === null || longitude === null) {
    return null;
  }

  return {
    addressName,
    latitude,
    longitude,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim() ?? '';

  if (!query) {
    return NextResponse.json(
      { error: '검색할 주소를 먼저 입력해 주세요.' },
      { status: 400 }
    );
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: '검색 주소는 120자 이하로 입력해 주세요.' },
      { status: 400 }
    );
  }

  const rateLimitResult = await applyRateLimit({
    key: `kakao-local-address-search:${readRequestClientKey(request)}`,
    ...ADDRESS_SEARCH_RATE_LIMIT,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: '주소 검색 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
      },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const restApiKey = getKakaoRestApiKey();
  if (!restApiKey) {
    return NextResponse.json(
      { error: 'Kakao Local REST API 키가 설정되지 않았습니다.' },
      {
        status: 500,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const params = new URLSearchParams({
    query,
    analyze_type: 'similar',
    size: '5',
  });

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?${params.toString()}`,
      {
        headers: {
          Authorization: `KakaoAK ${restApiKey}`,
        },
        cache: 'no-store',
      }
    );

    const payload = (await response.json().catch(() => null)) as
      | {
          documents?: unknown[];
        }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        { error: '카카오 주소 검색에 실패했습니다.' },
        {
          status: response.status,
          headers: buildRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const primaryDocument = normalizePrimaryDocument(payload?.documents?.[0]);
    if (!primaryDocument) {
      return NextResponse.json(
        { error: '입력한 주소에 해당하는 좌표를 찾지 못했습니다.' },
        {
          status: 404,
          headers: buildRateLimitHeaders(rateLimitResult),
        }
      );
    }

    return NextResponse.json(
      {
        query,
        addressName: primaryDocument.addressName,
        latitude: primaryDocument.latitude,
        longitude: primaryDocument.longitude,
      },
      {
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error('[kakao/local/address-search] failed to search address', error);
    return NextResponse.json(
      {
        error:
          '카카오 주소 검색 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      },
      {
        status: 500,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }
}
