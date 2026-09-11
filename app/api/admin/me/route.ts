import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({ user: session });
}

