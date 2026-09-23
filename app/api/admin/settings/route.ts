import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get or create settings (singleton pattern)
    // Use most recently updated row to avoid "flip-flopping" if multiple rows exist.
    let settings = await prisma.settings.findFirst({ orderBy: { updatedAt: 'desc' } });
    
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          backgroundImageUrl: null,
          logoUrl: null,
          frontendPasswordEnabled: false,
          frontendPassword: null,
          dailyVoteLimitEnabled: true,
          pauseVoting: false,
        },
      });
    }

    // Don't return the password hash in the response
    const { frontendPassword: _, ...settingsResponse } = settings;
    const res = NextResponse.json({ settings: { ...settingsResponse, dailyVoteLimitEnabled: true } });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    const res = NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      backgroundImageUrl,
      logoUrl,
      frontendPasswordEnabled,
      frontendPassword,
      dailyVoteLimitEnabled,
      pauseVoting,
    } = body;

    if (dailyVoteLimitEnabled === false) {
      return NextResponse.json(
        { error: 'The daily vote limit is required and cannot be disabled.' },
        { status: 400 }
      );
    }

    // Use the most recently updated settings row.
    let settings = await prisma.settings.findFirst({ orderBy: { updatedAt: 'desc' } });

    // Prepare update data
    const updateData: any = { dailyVoteLimitEnabled: true };
    
    if (backgroundImageUrl !== undefined) {
      updateData.backgroundImageUrl = backgroundImageUrl || null;
    }
    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl || null;
    }
    if (frontendPasswordEnabled !== undefined) {
      updateData.frontendPasswordEnabled = frontendPasswordEnabled;
      // If disabling, clear the password
      if (!frontendPasswordEnabled) {
        updateData.frontendPassword = null;
      }
    }
    if (frontendPassword !== undefined && frontendPassword !== null && frontendPassword !== '') {
      // Hash the password before storing
      updateData.frontendPassword = await hashPassword(frontendPassword);
      // If setting a password, enable the feature
      updateData.frontendPasswordEnabled = true;
    }
    if (pauseVoting !== undefined) {
      updateData.pauseVoting = pauseVoting;
    }
    
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          backgroundImageUrl: backgroundImageUrl || null,
          logoUrl: logoUrl || null,
          frontendPasswordEnabled: frontendPasswordEnabled || false,
          frontendPassword: frontendPassword && frontendPassword !== '' 
            ? await hashPassword(frontendPassword) 
            : null,
          dailyVoteLimitEnabled: true,
          pauseVoting: pauseVoting || false,
        },
      });
    } else {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    // Don't return the password hash in the response
    const { frontendPassword: _, ...settingsResponse } = settings;

    const res = NextResponse.json({ settings: { ...settingsResponse, dailyVoteLimitEnabled: true } });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('Failed to update settings:', error);
    const res = NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

