import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPacificDateKey } from '@/lib/utils';
import { z } from 'zod';

const addVotesSchema = z.object({
  amount: z.number().int().positive().max(5000),
  type: z.enum(['UPVOTE', 'DOWNVOTE']).default('UPVOTE'),
  reason: z.string().max(200).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const id = parseInt(params.id, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid player ID' }, { status: 400 });
    }

    const body = await request.json();
    const { amount, type, reason } = addVotesSchema.parse(body);

    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const dayPacific = getPacificDateKey(new Date());
    const voterId = `admin:${session.id}`;
    const sessionId = voterId;

    const result = await prisma.$transaction(async (tx) => {
      // Create vote records so totals/analytics stay consistent.
      // NOTE: This can be large; we cap amount in schema.
      const votesData = Array.from({ length: amount }, () => ({
        playerId: id,
        type,
        voterId,
        sessionId,
        dayPacific,
        metadata: {
          source: 'admin',
          adminUserId: session.id,
          adminUsername: session.username,
          reason: reason ?? null,
        },
      }));

      await tx.vote.createMany({ data: votesData as any });

      const updateData: any =
        type === 'UPVOTE'
          ? { upvoteCount: { increment: amount } }
          : { downvoteCount: { increment: amount } };

      const updatedPlayer = await tx.player.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          // @ts-ignore
          upvoteCount: true,
          // @ts-ignore
          downvoteCount: true,
        },
      });

      return updatedPlayer as any;
    });

    return NextResponse.json({
      success: true,
      player: {
        id: result.id,
        upvoteCount: result.upvoteCount ?? 0,
        downvoteCount: result.downvoteCount ?? 0,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Add votes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}








