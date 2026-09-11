import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const id = parseInt((await params).id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid player ID' },
        { status: 400 }
      );
    }

    const player = await prisma.player.findUnique({
      where: { id },
    });

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.player.update({
      where: { id },
      data: {
        eliminated: !player.eliminated,
      },
    });

    return NextResponse.json({ player: updated });
  } catch (error) {
    console.error('Toggle eliminated error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

