import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

function escapeCsvField(field: string): string {
  if (!field) return '';
  
  // If field contains comma, newline, or double quote, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  
  return field;
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
    // Get all votes, grouped by day
    const allVotes = await prisma.vote.findMany({
      select: {
        createdAt: true,
        type: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get all players for per-player export section.
    // Prefer denormalized totals (fast), but fall back gracefully for older schemas.
    let allPlayers: Array<{
      id: number;
      playerNumber: number | null;
      slug: string;
      name: string;
      team: string;
      eliminated: boolean;
      upvoteCount?: number;
      downvoteCount?: number;
    }> = [];
    let useDenormalized = false;

    try {
      allPlayers = await prisma.player.findMany({
        select: {
          id: true,
          playerNumber: true,
          slug: true,
          name: true,
          team: true,
          eliminated: true,
          // @ts-ignore - may not exist in older schemas
          upvoteCount: true,
          // @ts-ignore - may not exist in older schemas
          downvoteCount: true,
        },
        orderBy: [{ playerNumber: 'asc' }, { id: 'asc' }],
      });
      useDenormalized = true;
    } catch (error: any) {
      if (
        error?.message?.includes('Unknown argument') ||
        error?.code === 'P2009' ||
        error?.name === 'PrismaClientValidationError'
      ) {
        allPlayers = await prisma.player.findMany({
          select: {
            id: true,
            playerNumber: true,
            slug: true,
            name: true,
            team: true,
            eliminated: true,
          },
          orderBy: [{ playerNumber: 'asc' }, { id: 'asc' }],
        });
        useDenormalized = false;
      } else {
        throw error;
      }
    }

    // If denormalized totals aren't available, compute all-time totals from the Vote table.
    const computedTotalsByPlayerId = new Map<number, { upvotes: number; downvotes: number }>();
    if (!useDenormalized) {
      try {
        const grouped = await prisma.vote.groupBy({
          by: ['playerId', 'type'],
          _count: { _all: true },
        });

        for (const row of grouped) {
          const prev = computedTotalsByPlayerId.get(row.playerId) ?? { upvotes: 0, downvotes: 0 };
          if (row.type === 'UPVOTE') prev.upvotes += row._count._all;
          else if (row.type === 'DOWNVOTE') prev.downvotes += row._count._all;
          computedTotalsByPlayerId.set(row.playerId, prev);
        }
      } catch (error: any) {
        // If Vote.type doesn't exist, treat all votes as upvotes.
        if (
          error?.message?.includes('Unknown argument `type`') ||
          error?.message?.includes('Unknown arg `type`') ||
          error?.code === 'P2009' ||
          error?.name === 'PrismaClientValidationError'
        ) {
          const grouped = await prisma.vote.groupBy({
            by: ['playerId'],
            _count: { _all: true },
          });
          for (const row of grouped) {
            computedTotalsByPlayerId.set(row.playerId, { upvotes: row._count._all, downvotes: 0 });
          }
        } else {
          throw error;
        }
      }
    }

    // Get all visitors, grouped by day
    let allVisitors: Array<{ date: Date; ipAddress: string }> = [];
    try {
      const visitors = await prisma.visitor.findMany({
        select: {
          date: true,
          ipAddress: true,
        },
        orderBy: {
          date: 'asc',
        },
      });
      allVisitors = visitors;
    } catch (error: any) {
      // If Visitor model doesn't exist, continue with empty array
      if (!error?.message?.includes('Unknown model') && 
          !error?.message?.includes('does not exist') &&
          error?.code !== 'P2001' &&
          error?.code !== 'P2025') {
        throw error;
      }
    }

    // Group votes by date
    const votesByDate = new Map<string, { total: number; upvotes: number; downvotes: number }>();
    
    allVotes.forEach((vote) => {
      const dateStr = new Date(vote.createdAt).toISOString().split('T')[0];
      
      if (!votesByDate.has(dateStr)) {
        votesByDate.set(dateStr, { total: 0, upvotes: 0, downvotes: 0 });
      }
      
      const dayData = votesByDate.get(dateStr)!;
      dayData.total++;
      
      try {
        if (vote.type === 'UPVOTE') {
          dayData.upvotes++;
        } else if (vote.type === 'DOWNVOTE') {
          dayData.downvotes++;
        } else {
          // If type doesn't exist or is null, treat as upvote
          dayData.upvotes++;
        }
      } catch {
        // If type doesn't exist, treat as upvote
        dayData.upvotes++;
      }
    });

    // Group visitors by date
    const visitorsByDate = new Map<string, { uniqueVisitors: Set<string>; totalVisits: number }>();
    
    allVisitors.forEach((visitor) => {
      const dateStr = new Date(visitor.date).toISOString().split('T')[0];
      
      if (!visitorsByDate.has(dateStr)) {
        visitorsByDate.set(dateStr, { uniqueVisitors: new Set(), totalVisits: 0 });
      }
      
      const dayData = visitorsByDate.get(dateStr)!;
      dayData.uniqueVisitors.add(visitor.ipAddress);
      dayData.totalVisits++;
    });

    // Get all unique dates from both votes and visitors
    const allDates = new Set<string>();
    votesByDate.forEach((_, date) => allDates.add(date));
    visitorsByDate.forEach((_, date) => allDates.add(date));

    // Sort dates
    const sortedDates = Array.from(allDates).sort();

    // Build CSV rows
    const headers = ['Date', 'Total Votes', 'Upvotes', 'Downvotes', 'Unique Visitors', 'Total Visits'];
    const rows = sortedDates.map((dateStr) => {
      const voteData = votesByDate.get(dateStr) || { total: 0, upvotes: 0, downvotes: 0 };
      const visitorData = visitorsByDate.get(dateStr);
      const uniqueVisitors = visitorData ? visitorData.uniqueVisitors.size : 0;
      const totalVisits = visitorData ? visitorData.totalVisits : 0;

      return [
        dateStr,
        voteData.total.toString(),
        voteData.upvotes.toString(),
        voteData.downvotes.toString(),
        uniqueVisitors.toString(),
        totalVisits.toString(),
      ].join(',');
    });

    // Per-player totals section (all-time totals for every player)
    const playerHeaders = [
      'Player ID',
      'Player Number',
      'Slug',
      'Name',
      'Team',
      'Eliminated',
      'Total Upvotes',
      'Total Downvotes',
      'Net',
    ];

    const playerRows = allPlayers.map((player) => {
      const computed = computedTotalsByPlayerId.get(player.id);
      const upvotes = useDenormalized ? (player.upvoteCount ?? 0) : (computed?.upvotes ?? 0);
      const downvotes = useDenormalized ? (player.downvoteCount ?? 0) : (computed?.downvotes ?? 0);
      const net = upvotes - downvotes;

      return [
        player.id.toString(),
        player.playerNumber?.toString() ?? '',
        escapeCsvField(player.slug ?? ''),
        escapeCsvField(player.name ?? ''),
        escapeCsvField(player.team ?? ''),
        player.eliminated ? 'true' : 'false',
        upvotes.toString(),
        downvotes.toString(),
        net.toString(),
      ].join(',');
    });

    // Keep the existing daily export unchanged, then append per-player totals
    const csv = [
      headers.join(','),
      ...rows,
      '',
      ...[playerHeaders.join(','), ...playerRows],
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="analytics-export.csv"',
      },
    });
  } catch (error) {
    console.error('Analytics CSV export error:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics CSV', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}






