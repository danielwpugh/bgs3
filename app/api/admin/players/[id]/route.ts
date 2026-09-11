import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { z } from 'zod';

const playerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  playerNumber: z.number().int().positive().nullable().optional(),
  title: z.string().optional().nullable(),
  team: z.enum(['STRONG', 'SMART', 'OG']),
  bio: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  eliminated: z.boolean().default(false),
  groupNumber: z.number().int().positive().nullable().optional(),
  extraFields: z.record(z.any()).optional().nullable(),
});

export async function PUT(
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

    const body = await request.json();
    const data = playerSchema.parse(body);
    
    const slug = data.slug || slugify(data.name);
    
    // Check if slug is taken by another player
    const existing = await prisma.player.findUnique({
      where: { slug },
    });

    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: 'A player with this slug already exists' },
        { status: 400 }
      );
    }

    // Check if playerNumber is provided and already exists for another player
    if (data.playerNumber !== null && data.playerNumber !== undefined) {
      const existingByNumber = await prisma.player.findUnique({
        where: { playerNumber: data.playerNumber },
      });
      if (existingByNumber && existingByNumber.id !== id) {
        return NextResponse.json(
          { error: 'A player with this player number already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data, conditionally including extraFields
    const updateData: any = {
      name: data.name,
      slug,
      playerNumber: data.playerNumber ?? null,
      title: data.title ?? null,
      team: data.team,
      bio: data.bio ?? null,
      imageUrl: data.imageUrl ?? null,
      eliminated: data.eliminated,
      groupNumber: data.groupNumber ?? null,
    };

    // Only include extraFields if it has values (omit if empty/null)
    if (data.extraFields && Object.keys(data.extraFields).length > 0) {
      updateData.extraFields = data.extraFields;
    }

    const player = await prisma.player.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ player });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    console.error('Update player error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Delete dependent votes first, then the player, atomically.
    const [votesDeleted] = await prisma.$transaction([
      prisma.vote.deleteMany({ where: { playerId: id } }),
      prisma.player.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      success: true,
      deleted: {
        votes: votesDeleted.count,
        player: 1,
      },
    });
  } catch (error) {
    console.error('Delete player error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

