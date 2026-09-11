import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get settings (singleton pattern)
    // Use most recently updated row to avoid "flip-flopping" if multiple rows exist.
    let settings = await prisma.settings.findFirst({ orderBy: { updatedAt: 'desc' } });
    
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          backgroundImageUrl: null,
          logoUrl: null,
        },
      });
    }

    const res = NextResponse.json({ 
      backgroundImageUrl: settings.backgroundImageUrl,
      logoUrl: settings.logoUrl,
      updatedAt: settings.updatedAt,
    });
    // Avoid serving stale settings through any intermediate caches
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    const res = NextResponse.json(
      { backgroundImageUrl: null, logoUrl: null },
      { status: 200 } // Return empty settings instead of error
    );
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

