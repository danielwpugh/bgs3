import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePlayerImageUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Try to use denormalized vote counts first (much faster)
    let players;
    try {
      players = await prisma.player.findMany({
        select: {
          id: true,
          playerNumber: true,
          slug: true,
          name: true,
          title: true,
          team: true,
          bio: true,
          imageUrl: true,
          eliminated: true,
          // @ts-ignore - groupNumber may not be in types until Prisma client is regenerated
          groupNumber: true,
          extraFields: true,
          // @ts-ignore - These fields may not exist until migration is run
          upvoteCount: true,
          // @ts-ignore
          downvoteCount: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      });

      // Map to include vote counts and resolve image URLs
      const playersWithVoteCounts = await Promise.all(
        players.map(async (player: any) => {
          const resolvedImageUrl = await resolvePlayerImageUrl(player.playerNumber, player.imageUrl);
          return {
            ...player,
            imageUrl: resolvedImageUrl,
            upvoteCount: player.upvoteCount ?? 0,
            downvoteCount: player.downvoteCount ?? 0,
          };
        })
      );

      return NextResponse.json(
        { players: playersWithVoteCounts },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      );
    } catch (error: any) {
      // If denormalized columns don't exist yet, fall back to COUNT queries
      if (error?.message?.includes('Unknown argument') || 
          error?.code === 'P2009' ||
          error?.name === 'PrismaClientValidationError') {
        // Fallback: Get players without denormalized counts
        const allPlayers = await prisma.player.findMany({
          include: {
            _count: {
              select: { votes: true },
            },
          },
          orderBy: { name: 'asc' },
        });

        // Calculate vote counts using COUNT queries
        const playersWithVoteCounts = await Promise.all(
          allPlayers.map(async (player) => {
            let upvoteCount = 0;
            let downvoteCount = 0;
            
            try {
              upvoteCount = await prisma.vote.count({
                where: { playerId: player.id, type: 'UPVOTE' },
              });
              downvoteCount = await prisma.vote.count({
                where: { playerId: player.id, type: 'DOWNVOTE' },
              });
            } catch (countError: any) {
              // If type column doesn't exist, treat all votes as upvotes
              if (countError?.message?.includes('Unknown argument `type`') || 
                  countError?.message?.includes('Unknown arg `type`') || 
                  countError?.code === 'P2009' ||
                  countError?.name === 'PrismaClientValidationError') {
                const totalVotes = player._count.votes;
                upvoteCount = totalVotes;
                downvoteCount = 0;
              } else {
                throw countError;
              }
            }
            
            // Resolve image URL - check for {playerNumber}.png first, then fallback to stored imageUrl
            const resolvedImageUrl = await resolvePlayerImageUrl(player.playerNumber, player.imageUrl);
            
            return {
              id: player.id,
              playerNumber: player.playerNumber,
              slug: player.slug,
              name: player.name,
              title: player.title,
              team: player.team,
              bio: player.bio,
              imageUrl: resolvedImageUrl,
              eliminated: player.eliminated,
              // @ts-ignore - groupNumber may not be in types
              groupNumber: (player as any).groupNumber,
              extraFields: player.extraFields,
              createdAt: player.createdAt,
              updatedAt: player.updatedAt,
              upvoteCount,
              downvoteCount,
            };
          })
        );

        return NextResponse.json(
          { players: playersWithVoteCounts },
          {
            headers: {
              'Cache-Control': 'no-store, max-age=0',
            },
          }
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Get players error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}

