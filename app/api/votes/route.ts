import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getPacificDateKey } from '@/lib/utils';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const voteSchema = z.object({
  playerId: z.number().optional(),
  slug: z.string().optional(),
  type: z.enum(['UPVOTE', 'DOWNVOTE']).default('UPVOTE'),
}).refine((data) => data.playerId || data.slug, {
  message: 'Either playerId or slug must be provided',
});

export async function POST(request: NextRequest) {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieSameSite: 'lax' | 'none' = isProd ? 'none' : 'lax';
    const cookieSecure = isProd;

    const body = await request.json();
    const data = voteSchema.parse(body);

    const cookieStore = await cookies();
    const headerVoterIdRaw = request.headers.get('x-voter-id');
    const headerVoterId = headerVoterIdRaw && z.string().uuid().safeParse(headerVoterIdRaw).success ? headerVoterIdRaw : null;

    let voterId = cookieStore.get('voter-id')?.value ?? headerVoterId ?? undefined;
    let sessionId = cookieStore.get('vote-session')?.value ?? voterId ?? undefined;
    
    // Cookie-based voter identity (stable per-browser). No IP involved.
    if (!voterId) {
      voterId = randomUUID();
    }
    // Keep legacy cookie in sync for backwards compatibility (and older DB columns).
    if (!sessionId) {
      sessionId = voterId;
    }

    const rateLimitKey = `vote:${voterId}`;
    if (!checkRateLimit(rateLimitKey, 10, 60000)) { // 10 votes per minute
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before voting again.' },
        { status: 429 }
      );
    }

    // Global voting pause switch
    const settings = await prisma.settings.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (settings?.pauseVoting) {
      return NextResponse.json(
        { error: 'Voting is currently paused.' },
        { status: 403 }
      );
    }

    // Find player
    const player = data.playerId
      ? await prisma.player.findUnique({ where: { id: data.playerId } })
      : await prisma.player.findUnique({ where: { slug: data.slug! } });

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Check if eliminated (configurable - currently blocking)
    if (player.eliminated) {
      return NextResponse.json(
        { error: 'This player has been eliminated and can no longer receive votes.' },
        { status: 400 }
      );
    }

    // Check daily vote limit setting
    if (settings?.dailyVoteLimitEnabled) {
      // Check if this voter cookie has already voted for this player today (Pacific time)
      const dayPacific = getPacificDateKey(new Date());

      const existingVote = await prisma.vote.findFirst({
        // NOTE: The Prisma client is generated from the current schema at build/deploy time.
        // Some dev environments can temporarily show stale types after schema changes.
        where: ({
          playerId: player.id,
          voterId: voterId,
          dayPacific: dayPacific,
        } as any),
      });

      if (existingVote) {
        return NextResponse.json(
          { error: 'You have already voted for this player today. Each player can only receive one vote per day.' },
          { status: 400 }
        );
      }
    }

    // Use transaction for atomic vote creation and count update
    // This ensures data consistency and improves performance by avoiding separate COUNT queries
    const result = await prisma.$transaction(async (tx) => {
      const dayPacific = getPacificDateKey(new Date());
      // Create vote record
      let vote;
      try {
        vote = await tx.vote.create({
          data: ({
            playerId: player.id,
            type: data.type,
            sessionId: sessionId,
            voterId: voterId,
            dayPacific: dayPacific,
          } as any),
        });
      } catch (error: any) {
        // If type column doesn't exist, create vote without type
        if (error?.message?.includes('Unknown argument `type`') || 
            error?.message?.includes('Unknown arg `type`') || 
            error?.code === 'P2009' ||
            error?.name === 'PrismaClientValidationError') {
          vote = await tx.vote.create({
            data: ({
              playerId: player.id,
              sessionId: sessionId,
              voterId: voterId,
              dayPacific: dayPacific,
            } as any),
          });
        } else {
          throw error;
        }
      }

      // Atomically update vote counts in Player table
      // This is much faster than COUNT queries and ensures consistency
      const updateData: { upvoteCount?: { increment: number }, downvoteCount?: { increment: number } } = {};
      
      if (data.type === 'UPVOTE') {
        updateData.upvoteCount = { increment: 1 };
      } else {
        updateData.downvoteCount = { increment: 1 };
      }

      // Update denormalized counts atomically
      const updatedPlayer = await tx.player.update({
        where: { id: player.id },
        data: updateData,
        select: {
          // @ts-ignore - TypeScript may not recognize these fields yet
          upvoteCount: true,
          // @ts-ignore
          downvoteCount: true,
        },
      });

      return {
        vote,
        upvoteCount: (updatedPlayer as any).upvoteCount ?? 0,
        downvoteCount: (updatedPlayer as any).downvoteCount ?? 0,
      };
    });

    // Set session cookie in response
    const response = NextResponse.json({
      success: true,
      upvoteCount: result.upvoteCount,
      downvoteCount: result.downvoteCount,
      message: 'Vote recorded! You can vote for this player again tomorrow.',
      voterId,
    });

    // Set voter cookies (for normal browsing). In cross-site iframes, this may be blocked
    // unless SameSite=None; Secure, and some browsers block third-party cookies entirely.
    response.cookies.set('voter-id', voterId, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    response.cookies.set('vote-session', sessionId, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

