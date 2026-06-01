import { NextResponse } from 'next/server';

import {
  isGuestbookCommentVisibleToPublic,
  readGuestbookCommentDate,
} from '@/lib/guestbookComments';
import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import { firestoreEventCommentRepository } from '@/server/repositories/eventCommentRepository';
import { resolveStoredEventBySlug } from '@/server/repositories/eventRepository';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const GUESTBOOK_COMMENT_RATE_LIMIT = {
  limit: 5,
  windowMs: 10 * 60 * 1000,
} as const;
const AUTHOR_MAX_LENGTH = 20;
const MESSAGE_MAX_LENGTH = 500;
const FORBIDDEN_COMMENT_PATTERNS = [
  /https?:\/\//i,
  /\bwww\./i,
  /[a-z0-9.-]+\.(com|net|org|info|biz|xyz|top|site|shop)\b/i,
  /바카라|카지노|토토|도박|슬롯|대출|성인|야동|광고|홍보/i,
];

type GuestbookCommentRequestBody = {
  pageSlug?: unknown;
  author?: unknown;
  message?: unknown;
};

function normalizeCommentDate(value: unknown) {
  const date = readGuestbookCommentDate(value);
  return date ? date.toISOString() : new Date(0).toISOString();
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function validateCommentInput(body: GuestbookCommentRequestBody | null) {
  const pageSlug = normalizeInvitationPageSlugInput(
    typeof body?.pageSlug === 'string' ? body.pageSlug : ''
  );
  const author = normalizeText(body?.author);
  const message = normalizeText(body?.message);

  if (!pageSlug) {
    return { error: '청첩장 주소를 확인해 주세요.', status: 400 } as const;
  }

  if (!author || !message) {
    return { error: '이름과 메시지를 입력해 주세요.', status: 400 } as const;
  }

  if (author.length > AUTHOR_MAX_LENGTH) {
    return { error: '이름은 20자 이하로 입력해 주세요.', status: 400 } as const;
  }

  if (message.length > MESSAGE_MAX_LENGTH) {
    return { error: '메시지는 500자 이하로 입력해 주세요.', status: 400 } as const;
  }

  if (/(.)\1{9,}/u.test(`${author} ${message}`)) {
    return { error: '반복 문자가 너무 많습니다.', status: 400 } as const;
  }

  if (FORBIDDEN_COMMENT_PATTERNS.some((pattern) => pattern.test(message))) {
    return { error: '등록할 수 없는 메시지입니다.', status: 400 } as const;
  }

  return { pageSlug, author, message } as const;
}

function isEventPublic(
  summary: NonNullable<Awaited<ReturnType<typeof resolveStoredEventBySlug>>>['summary']
) {
  if (summary.visibility?.published !== true) {
    return false;
  }

  const displayStartAt = summary.visibility.displayStartAt ?? null;
  const displayEndAt = summary.visibility.displayEndAt ?? null;
  const now = new Date();

  if (displayStartAt && now < displayStartAt) {
    return false;
  }

  if (displayEndAt && now > displayEndAt) {
    return false;
  }

  return true;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageSlug = normalizeInvitationPageSlugInput(searchParams.get('pageSlug') ?? '');

  if (!pageSlug) {
    return NextResponse.json(
      { error: '청첩장 주소를 확인해 주세요.' },
      { status: 400 }
    );
  }

  if (!firestoreEventCommentRepository.isAvailable()) {
    return NextResponse.json(
      { error: '방명록 저장소를 사용할 수 없습니다.' },
      { status: 503 }
    );
  }

  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return NextResponse.json(
      { error: '청첩장을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  if (!isEventPublic(resolvedEvent.summary)) {
    return NextResponse.json(
      { error: '현재 방명록을 조회할 수 없는 청첩장입니다.' },
      { status: 403 }
    );
  }

  try {
    const comments = (await firestoreEventCommentRepository.listByPageSlug(pageSlug))
      .filter((comment) => isGuestbookCommentVisibleToPublic(comment.data))
      .map((comment) => ({
        id: comment.id,
        author: typeof comment.data.author === 'string' ? comment.data.author : '',
        message: typeof comment.data.message === 'string' ? comment.data.message : '',
        pageSlug: comment.pageSlug,
        createdAt: normalizeCommentDate(comment.data.createdAt),
      }));

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error('[guestbook/comments] failed to list comments', error);
    return NextResponse.json(
      { error: '방명록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as GuestbookCommentRequestBody | null;
  const validatedInput = validateCommentInput(body);

  if ('error' in validatedInput) {
    return NextResponse.json(
      { error: validatedInput.error },
      { status: validatedInput.status }
    );
  }

  const rateLimitResult = await applyScopedRateLimit({
    request,
    scope: 'public-guestbook-comment-create',
    keyParts: [validatedInput.pageSlug],
    ...GUESTBOOK_COMMENT_RATE_LIMIT,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: '방명록 등록 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  if (!firestoreEventCommentRepository.isAvailable()) {
    return NextResponse.json(
      { error: '방명록 저장소를 사용할 수 없습니다.' },
      { status: 503 }
    );
  }

  const resolvedEvent = await resolveStoredEventBySlug(validatedInput.pageSlug);
  if (!resolvedEvent) {
    return NextResponse.json(
      { error: '청첩장을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  if (!isEventPublic(resolvedEvent.summary)) {
    return NextResponse.json(
      { error: '현재 방명록을 작성할 수 없는 청첩장입니다.' },
      { status: 403 }
    );
  }

  try {
    const createdComment = await firestoreEventCommentRepository.createByPageSlug(
      validatedInput.pageSlug,
      {
        author: validatedInput.author,
        message: validatedInput.message,
        status: 'public',
      }
    );

    return NextResponse.json(
      {
        success: true,
        commentId: createdComment.id,
      },
      {
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error('[guestbook/comments] failed to create comment', error);
    return NextResponse.json(
      { error: '방명록을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
