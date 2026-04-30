import { NextResponse } from 'next/server';

import { verifyAdminRequest, AdminApiAuthError } from '@/server/adminApiAuth';
import { GENERIC_SERVER_ERROR_MESSAGE, toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import {
  deleteAdminCustomerAccount,
  listAdminCustomerAccountsSnapshot,
} from '@/server/adminCustomerAccountsService';

type DeleteCustomerAccountRequestBody = {
  uid?: unknown;
  confirm?: unknown;
};

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request);
    const snapshot = await listAdminCustomerAccountsSnapshot();

    return NextResponse.json({
      success: true,
      ...snapshot,
    });
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/admin/customers/accounts] failed to list customer accounts', error);
    return NextResponse.json(
      { error: '고객 계정 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const adminToken = await verifyAdminRequest(request);
    const body = (await request.json().catch(() => null)) as
      | DeleteCustomerAccountRequestBody
      | null;
    const uid = typeof body?.uid === 'string' ? body.uid.trim() : '';
    const confirm = body?.confirm === true;

    if (!uid) {
      return NextResponse.json(
        { error: '탈퇴 처리할 고객 계정을 먼저 선택해 주세요.' },
        { status: 400 }
      );
    }

    if (!confirm) {
      return NextResponse.json(
        { error: '탈퇴 처리를 확인한 뒤 다시 요청해 주세요.' },
        { status: 400 }
      );
    }

    const result = await deleteAdminCustomerAccount({
      uid,
      requestedByUid: adminToken.uid,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/admin/customers/accounts] failed to delete customer account', error);
    return NextResponse.json({ error: GENERIC_SERVER_ERROR_MESSAGE }, { status: 500 });
  }
}
