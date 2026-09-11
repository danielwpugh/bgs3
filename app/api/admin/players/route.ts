import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { z } from 'zod';

const playerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  playerNumber: z.number().int().positive().nullable().optional(),
  title: z.string().nullable().optional(),
  team: z.enum(['STRONG', 'SMART', 'OG']),
  bio: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  eliminated: z.boolean().default(false),
  groupNumber: z.number().int().positive().nullable().optional(),
  extraFields: z.record(z.any()).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Use denormalized vote counts for performance (no COUNT queries needed)
  const players = await prisma.player.findMany({
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
      // @ts-ignore - groupNumber may not be in types
      groupNumber: true,
      extraFields: true,
      // @ts-ignore - TypeScript may not recognize these fields yet
      upvoteCount: true,
      // @ts-ignore
      downvoteCount: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { votes: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Map to include vote counts
  const playersWithVoteCounts = players.map((player: any) => ({
    ...player,
    voteCount: player._count.votes,
    upvoteCount: player.upvoteCount ?? 0,
    downvoteCount: player.downvoteCount ?? 0,
  }));

  return NextResponse.json({
    players: playersWithVoteCounts,
  });
}

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
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    const data = playerSchema.parse(body);
    console.log('Parsed data:', JSON.stringify(data, null, 2));
    
    const slug = data.slug || slugify(data.name);
    console.log('Generated slug:', slug);
    
    // Check if slug already exists
    const existing = await prisma.player.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A player with this slug already exists' },
        { status: 400 }
      );
    }

    // Check if playerNumber is provided and already exists
    if (data.playerNumber !== null && data.playerNumber !== undefined) {
      const existingByNumber = await prisma.player.findUnique({
        where: { playerNumber: data.playerNumber },
      });
      if (existingByNumber) {
        return NextResponse.json(
          { error: 'A player with this player number already exists' },
          { status: 400 }
        );
      }
    }

    const createData: any = {
      name: data.name,
      slug,
      playerNumber: data.playerNumber ?? null,
      title: data.title,
      team: data.team,
      bio: data.bio,
      imageUrl: data.imageUrl,
      eliminated: data.eliminated,
      // @ts-ignore - groupNumber may not be in types
      groupNumber: data.groupNumber ?? null,
    };

    // Only include extraFields if it has values
    if (data.extraFields && Object.keys(data.extraFields).length > 0) {
      createData.extraFields = data.extraFields;
    }

    const player = await prisma.player.create({
      data: createData,
    });

    return NextResponse.json({ player }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error:', error.errors);
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Create player error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

