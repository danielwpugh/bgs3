import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Check if front-end password protection is enabled
    const settings = await prisma.settings.findFirst({ orderBy: { updatedAt: 'desc' } });
    
    if (!settings || !settings.frontendPasswordEnabled) {
      return NextResponse.json(
        {
          enabled: false,
          authenticated: true,
        },
        {
          headers: {
            // Never cache auth decisions; they depend on cookies.
            'Cache-Control': 'no-store, max-age=0',
            Pragma: 'no-cache',
            Vary: 'Cookie',
          },
        }
      );
    }

    // Check if user has a valid token
    const token = request.cookies.get('frontend-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        {
          enabled: true,
          authenticated: false,
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            Pragma: 'no-cache',
            Vary: 'Cookie',
          },
        }
      );
    }

    try {
      jwt.verify(token, JWT_SECRET);
      return NextResponse.json(
        {
          enabled: true,
          authenticated: true,
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            Pragma: 'no-cache',
            Vary: 'Cookie',
          },
        }
      );
    } catch {
      return NextResponse.json(
        {
          enabled: true,
          authenticated: false,
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            Pragma: 'no-cache',
            Vary: 'Cookie',
          },
        }
      );
    }
  } catch (error) {
    console.error('Failed to verify front-end auth:', error);
    // Return a stable shape so the client can make a safe decision.
    // In production, the client fails closed (treats this as enabled + not authenticated).
    return NextResponse.json(
      { enabled: true, authenticated: false, error: 'Failed to verify authentication' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          Pragma: 'no-cache',
          Vary: 'Cookie',
        },
      }
    );
  }
}




