import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const players = await prisma.player.findMany({
      orderBy: { playerNumber: 'asc' },
    });

    if (players.length === 0) {
      return new NextResponse('id,playerNumber,name,slug,title,team,bio,eliminated,imageUrl,groupNumber,country\n', {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="players-export.csv"',
        },
      });
    }

    // Collect all unique extra field keys across all players
    const extraFieldKeys = new Set<string>(['country']);
    players.forEach(player => {
      if (player.extraFields && typeof player.extraFields === 'object') {
        Object.keys(player.extraFields).forEach(key => extraFieldKeys.add(key));
      }
    });

    // Build CSV header - id first for reliable syncing, then standard fields, then extra fields
    const standardColumns = ['id', 'playerNumber', 'name', 'slug', 'title', 'team', 'bio', 'eliminated', 'imageUrl', 'groupNumber'];
    const extraColumns = Array.from(extraFieldKeys).sort();
    const headers = [...standardColumns, ...extraColumns];

    // Build CSV rows
    const rows = players.map(player => {
      const extraFields = (player.extraFields && typeof player.extraFields === 'object') 
        ? player.extraFields as Record<string, any>
        : {};

      const row = [
        player.id.toString(), // Internal ID for reliable syncing
        player.playerNumber?.toString() || '',
        escapeCsvField(player.name),
        player.slug,
        escapeCsvField(player.title || ''),
        player.team,
        escapeCsvField(player.bio || ''),
        player.eliminated.toString(),
        player.imageUrl || '',
        player.groupNumber?.toString() || '',
        ...extraColumns.map(key => escapeCsvField(extraFields[key]?.toString() || ''))
      ];

      return row.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="players-export.csv"',
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'Failed to export CSV', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function escapeCsvField(field: string): string {
  if (!field) return '';
  
  // If field contains comma, newline, or double quote, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  
  return field;
}


