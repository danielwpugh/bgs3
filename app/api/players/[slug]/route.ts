import { NextRequest, NextResponse } from 'next/server';
import { publicAuthError } from '@/lib/public-auth';
import { prisma } from '@/lib/prisma';
import { resolvePlayerImageUrl } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const denied = await publicAuthError(request); if (denied) return denied;
    // Use denormalized vote counts for performance
    const player = await prisma.player.findUnique({
      where: { slug: (await params).slug },

    });

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Use denormalized counts
    const upvoteCount = (player as any).upvoteCount ?? 0;
    const downvoteCount = (player as any).downvoteCount ?? 0;

    // Resolve image URL - check for {playerNumber}.png first, then fallback to stored imageUrl
    const resolvedImageUrl = await resolvePlayerImageUrl(player.playerNumber, player.imageUrl);

    return NextResponse.json({ 
      player: {
        ...player,
        groupNumber: undefined,
        imageUrl: resolvedImageUrl,
      },
      upvoteCount,
      downvoteCount,
    });
  } catch (error) {
    console.error('Get player error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

