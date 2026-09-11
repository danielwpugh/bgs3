import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePlayerImageUrl } from '@/lib/utils';

// This route is inherently dynamic (depends on request URL/query + live DB data)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topN = parseInt(searchParams.get('top') || '10');
    const days = parseInt(searchParams.get('days') || '30');

    // Total votes
    const totalVotes = await prisma.vote.count();

    // Get all players with denormalized vote counts (much faster than COUNT queries)
    // Note: If columns don't exist yet, we'll fall back to COUNT queries below
    const allPlayers = await prisma.player.findMany({
      select: {
        id: true,
        playerNumber: true,
        slug: true,
        name: true,
        title: true,
        team: true,
        eliminated: true,
        imageUrl: true,
      },
    });

    // Calculate vote counts - try denormalized first, fallback to COUNT queries
    const playersWithVotes = await Promise.all(
      allPlayers.map(async (player) => {
        let upvoteCount = 0;
        let downvoteCount = 0;
        
        try {
          // Try to use denormalized counts if they exist
          const playerWithCounts = await prisma.player.findUnique({
            where: { id: player.id },
            select: {
              // @ts-ignore - These fields may not exist in Prisma types until migration is run
              upvoteCount: true,
              // @ts-ignore
              downvoteCount: true,
            },
          });
          
          if (playerWithCounts) {
            // @ts-ignore
            upvoteCount = playerWithCounts.upvoteCount ?? 0;
            // @ts-ignore
            downvoteCount = playerWithCounts.downvoteCount ?? 0;
          }
        } catch (error: any) {
          // If denormalized columns don't exist, use COUNT queries
          if (error?.message?.includes('Unknown argument') || 
              error?.code === 'P2009' ||
              error?.name === 'PrismaClientValidationError') {
            try {
              upvoteCount = await prisma.vote.count({
                where: { playerId: player.id, type: 'UPVOTE' },
              });
              downvoteCount = await prisma.vote.count({
                where: { playerId: player.id, type: 'DOWNVOTE' },
              });
            } catch (countError: any) {
              if (countError?.message?.includes('Unknown argument `type`')) {
                const totalVotes = await prisma.vote.count({
                  where: { playerId: player.id },
                });
                upvoteCount = totalVotes;
                downvoteCount = 0;
              }
            }
          }
        }
        
        return {
          ...player,
          upvoteCount,
          downvoteCount,
        };
      })
    );

    // Exclude eliminated players from leaderboard slices
    const eligiblePlayers = playersWithVotes.filter((p) => !p.eliminated);

    // Player counts
    const playerCount = allPlayers.length;
    const activePlayerCount = eligiblePlayers.length;

    // Top N by upvotes
    const topPlayersByUpvotes = [...eligiblePlayers]
      .sort((a, b) => b.upvoteCount - a.upvoteCount)
      .slice(0, topN);

    // Bottom N by votes (least upvotes)
    const bottomPlayersByVotes = [...eligiblePlayers]
      .sort((a, b) => a.upvoteCount - b.upvoteCount)
      .slice(0, topN);

    // Votes per team - count UPVOTES ONLY
    let strongVotes = 0;
    let smartVotes = 0;
    let ogVotes = 0;

    try {
      // Use denormalized upvote counts for team totals (much faster)
      // @ts-ignore - This field may not exist in Prisma types until migration is run
      const teamTotals = await prisma.player.groupBy({
        by: ['team'],
        _sum: {
          // @ts-ignore
          upvoteCount: true,
        },
      });

      teamTotals.forEach((team) => {
        // @ts-ignore
        const totalUpvotes = (team._sum?.upvoteCount ?? 0) as number;
        if (team.team === 'STRONG') {
          strongVotes = totalUpvotes;
        } else if (team.team === 'SMART') {
          smartVotes = totalUpvotes;
        } else if (team.team === 'OG') {
          ogVotes = totalUpvotes;
        }
      });
    } catch (error: any) {
      // Fallback if denormalized columns don't exist yet
      if (
        error?.message?.includes('Unknown argument') ||
        error?.code === 'P2009' ||
        error?.name === 'PrismaClientValidationError'
      ) {
        try {
          // Group UPVOTES by playerId, then map to teams
          const upvotesPerPlayer = await prisma.vote.groupBy({
            by: ['playerId'],
            where: { type: 'UPVOTE' },
            _count: true,
          });

          const teamStats = await Promise.all(
            upvotesPerPlayer.map(async (v) => {
              const player = await prisma.player.findUnique({
                where: { id: v.playerId },
                select: { team: true },
              });
              return {
                team: player?.team || 'UNKNOWN',
                count: v._count,
              };
            })
          );

          strongVotes = teamStats
            .filter((s) => s.team === 'STRONG')
            .reduce((sum, s) => sum + s.count, 0);
          smartVotes = teamStats
            .filter((s) => s.team === 'SMART')
            .reduce((sum, s) => sum + s.count, 0);
          ogVotes = teamStats
            .filter((s) => s.team === 'OG')
            .reduce((sum, s) => sum + s.count, 0);
        } catch (fallbackError: any) {
          // If the Vote table doesn't have a `type` column, we can't isolate upvotes;
          // fallback = treat all votes as upvotes.
          if (fallbackError?.message?.includes('Unknown argument `type`')) {
            try {
              const votesPerPlayer = await prisma.vote.groupBy({
                by: ['playerId'],
                _count: true,
              });

              const teamStats = await Promise.all(
                votesPerPlayer.map(async (v) => {
                  const player = await prisma.player.findUnique({
                    where: { id: v.playerId },
                    select: { team: true },
                  });
                  return {
                    team: player?.team || 'UNKNOWN',
                    count: v._count,
                  };
                })
              );

              strongVotes = teamStats
                .filter((s) => s.team === 'STRONG')
                .reduce((sum, s) => sum + s.count, 0);
              smartVotes = teamStats
                .filter((s) => s.team === 'SMART')
                .reduce((sum, s) => sum + s.count, 0);
              ogVotes = teamStats
                .filter((s) => s.team === 'OG')
                .reduce((sum, s) => sum + s.count, 0);
            } catch (innerFallbackError) {
              console.error('Error calculating team upvotes (fallback):', innerFallbackError);
              strongVotes = 0;
              smartVotes = 0;
              ogVotes = 0;
            }
          } else {
            console.error('Error calculating team upvotes (fallback):', fallbackError);
            strongVotes = 0;
            smartVotes = 0;
            ogVotes = 0;
          }
        }
      } else {
        console.error('Error calculating team upvotes:', error);
        strongVotes = 0;
        smartVotes = 0;
        ogVotes = 0;
      }
    }

    // Votes per day (last N days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all votes in the date range
    const votes = await prisma.vote.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by day
    const dailyStats: Record<string, number> = {};
    votes.forEach((v) => {
      const date = new Date(v.createdAt).toISOString().split('T')[0];
      dailyStats[date] = (dailyStats[date] || 0) + 1;
    });

    // Fill in missing days with 0
    const dailyArray = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyArray.push({
        date: dateStr,
        count: dailyStats[dateStr] || 0,
      });
    }

    // Today's votes
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayVotes = await prisma.vote.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });

    // Resolve image URLs for top players
    const topPlayersWithResolvedImages = await Promise.all(
      topPlayersByUpvotes.map(async (p) => {
        const resolvedImageUrl = await resolvePlayerImageUrl(p.playerNumber, p.imageUrl);
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          title: p.title,
          team: p.team,
          imageUrl: resolvedImageUrl,
          upvoteCount: p.upvoteCount,
        };
      })
    );

    const bottomPlayersWithResolvedImages = await Promise.all(
      bottomPlayersByVotes.map(async (p) => {
        const resolvedImageUrl = await resolvePlayerImageUrl(p.playerNumber, p.imageUrl);
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          title: p.title,
          team: p.team,
          imageUrl: resolvedImageUrl,
          upvoteCount: p.upvoteCount,
        };
      })
    );

    return NextResponse.json({
      totalVotes,
      playerCount,
      activePlayerCount,
      todayVotes,
      topPlayersByUpvotes: topPlayersWithResolvedImages,
      bottomPlayersByVotes: bottomPlayersWithResolvedImages,
      teamVotes: {
        STRONG: strongVotes,
        SMART: smartVotes,
        OG: ogVotes,
      },
      dailyVotes: dailyArray,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

