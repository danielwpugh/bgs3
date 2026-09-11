import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const bulkActionSchema = z.object({
  playerIds: z.array(z.number()).min(1),
  action: z.enum(['delete', 'setEliminated', 'setGroupNumber']),
  eliminated: z.boolean().optional(), // Only required for setEliminated action
  groupNumber: z.number().int().positive().nullable().optional(), // Only required for setGroupNumber action
});

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const data = bulkActionSchema.parse(body);

    if (data.action === 'delete') {
      const [votesDeleted, playersDeleted] = await prisma.$transaction([
        prisma.vote.deleteMany({
          where: { playerId: { in: data.playerIds } },
        }),
        prisma.player.deleteMany({
          where: { id: { in: data.playerIds } },
        }),
      ]);

      return NextResponse.json({
        success: true,
        deleted: {
          votes: votesDeleted.count,
          players: playersDeleted.count,
        },
      });
    } else if (data.action === 'setEliminated') {
      if (data.eliminated === undefined) {
        return NextResponse.json(
          { error: 'eliminated field is required for setEliminated action' },
          { status: 400 }
        );
      }

      await prisma.player.updateMany({
        where: {
          id: { in: data.playerIds },
        },
        data: {
          eliminated: data.eliminated,
        },
      });

      return NextResponse.json({
        success: true,
        updated: data.playerIds.length,
      });
    } else if (data.action === 'setGroupNumber') {
      if (data.groupNumber === undefined) {
        return NextResponse.json(
          { error: 'groupNumber field is required for setGroupNumber action (use null to clear)' },
          { status: 400 }
        );
      }

      await prisma.player.updateMany({
        where: {
          id: { in: data.playerIds },
        },
        // @ts-ignore - groupNumber may not be in Prisma types until client regenerated
        data: {
          groupNumber: data.groupNumber,
        },
      });

      return NextResponse.json({
        success: true,
        updated: data.playerIds.length,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

