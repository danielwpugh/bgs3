import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { jwtSecret } from './secret';
export async function publicAuthError(request: NextRequest) {
  const settings = await prisma.settings.findFirst({orderBy:{updatedAt:'desc'}});
  if (!settings?.frontendPasswordEnabled) return null;
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || request.cookies.get('frontend-token')?.value;
  try {
    const payload = jwt.verify(token || '', jwtSecret());
    if (typeof payload === 'object' && payload.type === 'frontend-auth') return null;
  } catch {}
  return NextResponse.json({error:'Preview password required'}, {status:401,headers:{'Cache-Control':'no-store'}});
}
