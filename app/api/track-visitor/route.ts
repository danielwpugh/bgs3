import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    let ipAddress = forwarded
      ? forwarded.split(',')[0].trim()
      : request.headers.get('x-real-ip') || 'unknown';

    // In development, allow localhost IPs to be tracked (for testing)
    // In production, skip unknown IPs but allow localhost to be tracked as 'localhost'
    if (ipAddress === 'unknown') {
      if (process.env.NODE_ENV === 'development') {
        // Use a development identifier for unknown IPs
        ipAddress = 'dev-unknown';
      } else {
        return NextResponse.json({ success: true, skipped: true });
      }
    } else if (ipAddress === '127.0.0.1' || ipAddress.startsWith('::1')) {
      // Track localhost as 'localhost' for consistency
      ipAddress = 'localhost';
    }

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Track unique visitors per day
    // The unique constraint on [ipAddress, date] ensures we only count each IP once per day
    const result = await prisma.visitor.createMany({
      data: [{ ipAddress, date: today }],
      skipDuplicates: true,
    });

    if (result.count === 0) {
      return NextResponse.json({ success: true, alreadyTracked: true });
    }

    return NextResponse.json({ success: true, created: true });
  } catch (error: any) {
    // Handle Prisma errors gracefully
    // If the Visitor model doesn't exist yet (before migration), just skip
    if (error?.message?.includes('Unknown model') || 
        error?.message?.includes('does not exist')) {
      return NextResponse.json({ success: true, skipped: true });
    }
    
    console.error('Failed to track visitor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track visitor' },
      { status: 500 }
    );
  }
}

// Also support GET for easier client-side calls
export async function GET(request: NextRequest) {
  return POST(request);
}












