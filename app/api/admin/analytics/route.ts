import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { resolvePlayerImageUrl } from '@/lib/utils';

// Helper function to safely count votes by type
async function countVotesByType(playerId: number, type: 'UPVOTE' | 'DOWNVOTE', startDate?: Date) {
  try {
    const where: any = { playerId, type };
    if (startDate) {
      where.createdAt = { gte: startDate };
    }
    return await prisma.vote.count({ where });
  } catch (error: any) {
    // If type column doesn't exist, handle gracefully
    if (error?.message?.includes('Unknown argument `type`') || 
        error?.message?.includes('Unknown arg `type`') || 
        error?.code === 'P2009' ||
        error?.name === 'PrismaClientValidationError') {
      const where: any = { playerId };
      if (startDate) {
        where.createdAt = { gte: startDate };
      }
      const total = await prisma.vote.count({ where });
      return type === 'UPVOTE' ? total : 0;
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Calculate date ranges
    const now = new Date();
    
    // Today (start of day)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    // This week (start of week, Monday)
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    // Get all players - try to use denormalized vote counts first, fallback to COUNT queries
    let allPlayers: any[];
    let useDenormalized = false;
    
    try {
      // Try to get players with denormalized counts
      allPlayers = await prisma.player.findMany({
        select: {
          id: true,
          playerNumber: true,
          slug: true,
          name: true,
          title: true,
          team: true,
          imageUrl: true,
          eliminated: true,
          // @ts-ignore - These fields may not exist until migration is run
          upvoteCount: true,
          // @ts-ignore
          downvoteCount: true,
        },
      });
      useDenormalized = true;
    } catch (error: any) {
      // If denormalized columns don't exist, get players without them
      if (error?.message?.includes('Unknown argument') || 
          error?.code === 'P2009' ||
          error?.name === 'PrismaClientValidationError') {
        allPlayers = await prisma.player.findMany({
          select: {
            id: true,
            playerNumber: true,
            slug: true,
            name: true,
            title: true,
            team: true,
            imageUrl: true,
            eliminated: true,
          },
        });
        useDenormalized = false;
      } else {
        throw error;
      }
    }

    // Calculate vote statistics for each player across all time periods
    // Use denormalized counts for all-time if available (much faster), COUNT queries only for time-filtered stats
    const playersWithStats = await Promise.all(
      allPlayers.map(async (player: any) => {
        // All time - use denormalized counts if available, otherwise COUNT queries
        let allTimeUpvotes = 0;
        let allTimeDownvotes = 0;
        
        if (useDenormalized) {
          allTimeUpvotes = player.upvoteCount ?? 0;
          allTimeDownvotes = player.downvoteCount ?? 0;
        } else {
          // Fallback to COUNT queries
          allTimeUpvotes = await countVotesByType(player.id, 'UPVOTE');
          allTimeDownvotes = await countVotesByType(player.id, 'DOWNVOTE');
        }
        
        // This week - still need COUNT queries for time-filtered data
        const weekUpvotes = await countVotesByType(player.id, 'UPVOTE', weekStart);
        const weekDownvotes = await countVotesByType(player.id, 'DOWNVOTE', weekStart);
        
        // Today - still need COUNT queries for time-filtered data
        const todayUpvotes = await countVotesByType(player.id, 'UPVOTE', todayStart);
        const todayDownvotes = await countVotesByType(player.id, 'DOWNVOTE', todayStart);

        // Resolve image URL - check for {playerNumber}.png first, then fallback to stored imageUrl
        const resolvedImageUrl = await resolvePlayerImageUrl(player.playerNumber, player.imageUrl);

        return {
          ...player,
          imageUrl: resolvedImageUrl,
          allTime: {
            upvotes: allTimeUpvotes,
            downvotes: allTimeDownvotes,
            net: allTimeUpvotes - allTimeDownvotes,
          },
          thisWeek: {
            upvotes: weekUpvotes,
            downvotes: weekDownvotes,
            net: weekUpvotes - weekDownvotes,
          },
          today: {
            upvotes: todayUpvotes,
            downvotes: todayDownvotes,
            net: todayUpvotes - todayDownvotes,
          },
        };
      })
    );

    // Get vote counts by time period
    const getVoteCounts = async (startDate?: Date) => {
      try {
        const where: any = startDate ? { createdAt: { gte: startDate } } : {};
        const total = await prisma.vote.count({ where });
        
        let upvotes = 0;
        let downvotes = 0;
        try {
          upvotes = await prisma.vote.count({ 
            where: { ...where, type: 'UPVOTE' } 
          });
          downvotes = await prisma.vote.count({ 
            where: { ...where, type: 'DOWNVOTE' } 
          });
        } catch (error: any) {
          if (error?.message?.includes('Unknown argument `type`') || 
              error?.message?.includes('Unknown arg `type`') || 
              error?.code === 'P2009') {
            upvotes = total;
            downvotes = 0;
          } else {
            throw error;
          }
        }
        
        return { total, upvotes, downvotes };
      } catch (error) {
        console.error('Error getting vote counts:', error);
        return { total: 0, upvotes: 0, downvotes: 0 };
      }
    };

    const allTimeVotes = await getVoteCounts();
    const weekVotes = await getVoteCounts(weekStart);
    const todayVotes = await getVoteCounts(todayStart);

    // Get hourly breakdown for today
    const hourlyBreakdown: Record<number, { upvotes: number; downvotes: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyBreakdown[i] = { upvotes: 0, downvotes: 0 };
    }

    try {
      const todayVotesData = await prisma.vote.findMany({
        where: {
          createdAt: { gte: todayStart },
        },
        select: {
          createdAt: true,
          type: true,
        },
      });

      todayVotesData.forEach((vote) => {
        const hour = new Date(vote.createdAt).getHours();
        try {
          if (vote.type === 'UPVOTE') {
            hourlyBreakdown[hour].upvotes++;
          } else if (vote.type === 'DOWNVOTE') {
            hourlyBreakdown[hour].downvotes++;
          }
        } catch {
          // If type doesn't exist, treat as upvote
          hourlyBreakdown[hour].upvotes++;
        }
      });
    } catch (error) {
      console.error('Error getting hourly breakdown:', error);
    }

    // Get daily breakdown for this week
    const getVoteCountsForDateRange = async (startDate: Date, endDate: Date) => {
      try {
        const where: any = { 
          createdAt: { 
            gte: startDate,
            lte: endDate,
          } 
        };
        const total = await prisma.vote.count({ where });
        
        let upvotes = 0;
        let downvotes = 0;
        try {
          upvotes = await prisma.vote.count({ 
            where: { ...where, type: 'UPVOTE' } 
          });
          downvotes = await prisma.vote.count({ 
            where: { ...where, type: 'DOWNVOTE' } 
          });
        } catch (error: any) {
          if (error?.message?.includes('Unknown argument `type`') || 
              error?.message?.includes('Unknown arg `type`') || 
              error?.code === 'P2009') {
            upvotes = total;
            downvotes = 0;
          } else {
            throw error;
          }
        }
        
        return { total, upvotes, downvotes };
      } catch (error) {
        console.error('Error getting vote counts for date range:', error);
        return { total: 0, upvotes: 0, downvotes: 0 };
      }
    };

    const dailyBreakdown: Array<{ date: string; upvotes: number; downvotes: number; total: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayVotes = await getVoteCountsForDateRange(dayStart, dayEnd);
      dailyBreakdown.push({
        date: date.toISOString().split('T')[0],
        upvotes: dayVotes.upvotes,
        downvotes: dayVotes.downvotes,
        total: dayVotes.total,
      });
    }

    // Top players by upvotes (all time, week, today)
    const topByUpvotesAllTime = [...playersWithStats]
      .sort((a, b) => b.allTime.upvotes - a.allTime.upvotes)
      .slice(0, 10);
    
    const topByUpvotesWeek = [...playersWithStats]
      .sort((a, b) => b.thisWeek.upvotes - a.thisWeek.upvotes)
      .slice(0, 10);
    
    const topByUpvotesToday = [...playersWithStats]
      .sort((a, b) => b.today.upvotes - a.today.upvotes)
      .slice(0, 10);

    // Top players by downvotes (all time, week, today)
    const topByDownvotesAllTime = [...playersWithStats]
      .sort((a, b) => b.allTime.downvotes - a.allTime.downvotes)
      .slice(0, 10);
    
    const topByDownvotesWeek = [...playersWithStats]
      .sort((a, b) => b.thisWeek.downvotes - a.thisWeek.downvotes)
      .slice(0, 10);
    
    const topByDownvotesToday = [...playersWithStats]
      .sort((a, b) => b.today.downvotes - a.today.downvotes)
      .slice(0, 10);

    // Top players by net score (all time, week, today)
    const topByNetAllTime = [...playersWithStats]
      .sort((a, b) => b.allTime.net - a.allTime.net)
      .slice(0, 10);
    
    const topByNetWeek = [...playersWithStats]
      .sort((a, b) => b.thisWeek.net - a.thisWeek.net)
      .slice(0, 10);
    
    const topByNetToday = [...playersWithStats]
      .sort((a, b) => b.today.net - a.today.net)
      .slice(0, 10);

    return NextResponse.json({
      summary: {
        allTime: allTimeVotes,
        thisWeek: weekVotes,
        today: todayVotes,
      },
      hourlyBreakdown: Object.entries(hourlyBreakdown).map(([hour, data]) => ({
        hour: parseInt(hour),
        ...data,
        total: data.upvotes + data.downvotes,
      })),
      dailyBreakdown,
      topPlayers: {
        byUpvotes: {
          allTime: topByUpvotesAllTime,
          thisWeek: topByUpvotesWeek,
          today: topByUpvotesToday,
        },
        byDownvotes: {
          allTime: topByDownvotesAllTime,
          thisWeek: topByDownvotesWeek,
          today: topByDownvotesToday,
        },
        byNet: {
          allTime: topByNetAllTime,
          thisWeek: topByNetWeek,
          today: topByNetToday,
        },
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

