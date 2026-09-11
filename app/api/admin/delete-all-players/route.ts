import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Do this atomically so we never end up in a "votes deleted but players still exist"
    // partial state (or vice-versa).
    const [votesDeleted, playersDeleted] = await prisma.$transaction([
      prisma.vote.deleteMany({}),
      prisma.player.deleteMany({}),
    ]);

    return NextResponse.json({ 
      success: true,
      deleted: {
        votes: votesDeleted.count,
        players: playersDeleted.count,
      },
      message: 'All player data and stats have been deleted successfully',
    });
  } catch (error) {
    console.error('Delete all players error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






