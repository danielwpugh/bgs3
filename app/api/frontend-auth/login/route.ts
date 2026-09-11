import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import jwt from 'jsonwebtoken';

import { jwtSecret } from '@/lib/secret';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Get settings to check if front-end password is enabled
    const settings = await prisma.settings.findFirst({ orderBy: { updatedAt: 'desc' } });
    
    if (!settings || !settings.frontendPasswordEnabled || !settings.frontendPassword) {
      return NextResponse.json(
        { error: 'Front-end password protection is not enabled' },
        { status: 400 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, settings.frontendPassword);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Create a session token (different from admin token)
    const token = jwt.sign(
      { type: 'frontend-auth' },
      jwtSecret(),
      { expiresIn: '30d' } // Longer session for front-end
    );

    const response = NextResponse.json({ success: true, token });
    response.cookies.set('frontend-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/', // Ensure cookie is available for all paths
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Failed to verify front-end password:', error);
    return NextResponse.json(
      { error: 'Failed to verify password' },
      { status: 500 }
    );
  }
}

