import { NextResponse } from 'next/server';

import { verifyAdminRequest, AdminApiAuthError } from '@/server/adminApiAuth';
import { GENERIC_SERVER_ERROR_MESSAGE, toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import { grantAdminCustomerWalletCredit } from '@/server/customerWalletServerService';

type WalletGrantRequestBody = {
  action?: unknown;
  uid?: unknown;
  kind?: unknown;
  tier?: unknown;
  quantity?: unknown;
  note?: unknown;
};

function readTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readQuantity(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
  }

  return 0;
}

export async function POST(request: Request) {
  try {
    const adminToken = await verifyAdminRequest(request);
    const body = (await request.json().catch(() => null)) as WalletGrantRequestBody | null;
    const action = readTrimmedString(body?.action);
    const ownerUid = readTrimmedString(body?.uid);
    const kind = readTrimmedString(body?.kind);
    const tier = readTrimmedString(body?.tier);
    const quantity = readQuantity(body?.quantity);
    const note = readTrimmedString(body?.note);

    if (action !== 'grant') {
      return NextResponse.json(
        { error: '지원하지 않는 지갑 요청입니다.' },
        { status: 400 }
      );
    }

    if (!ownerUid) {
      return NextResponse.json(
        { error: '지급할 고객 계정을 먼저 선택해 주세요.' },
        { status: 400 }
      );
    }

    if (kind !== 'pageCreation' && kind !== 'operationTicket') {
      return NextResponse.json(
        { error: '지급할 이용권 종류를 다시 확인해 주세요.' },
        { status: 400 }
      );
    }

    if (
      kind === 'pageCreation' &&
      tier !== 'standard' &&
      tier !== 'deluxe' &&
      tier !== 'premium'
    ) {
      return NextResponse.json(
        { error: '제작권 지급에는 서비스 등급이 필요합니다.' },
        { status: 400 }
      );
    }
    const normalizedTier =
      tier === 'standard' || tier === 'deluxe' || tier === 'premium' ? tier : null;

    const wallet = await grantAdminCustomerWalletCredit({
      ownerUid,
      adminUid: adminToken.uid,
      kind,
      tier: kind === 'pageCreation' ? normalizedTier : null,
      quantity,
      note,
    });

    return NextResponse.json({
      success: true,
      wallet,
    });
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/admin/customers/wallet] failed to update customer wallet', error);
    return NextResponse.json({ error: GENERIC_SERVER_ERROR_MESSAGE }, { status: 500 });
  }
}
