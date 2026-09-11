import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Delete votes and reset denormalized vote counts atomically.
    const [votesDeleted, playersUpdated] = await prisma.$transaction([
      prisma.vote.deleteMany({}),
      prisma.player.updateMany({
        data: {
          upvoteCount: 0,
          downvoteCount: 0,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      deleted: {
        votes: votesDeleted.count,
      },
      updated: {
        players: playersUpdated.count,
      },
      message: 'All votes have been deleted and vote totals have been reset.',
    });
  } catch (error) {
    console.error('Delete all votes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}











