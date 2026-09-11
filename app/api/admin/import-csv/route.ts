import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';
import { slugify } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('csv') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No CSV file provided' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const records = parse<Record<string, string>>(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = {
      rows: records.length,
      created: 0,
      updated: 0,
      totalPlayersAfter: 0,
      errors: [] as string[],
    };

    // Define standard Player fields that should not go into extraFields
    // Note: 'id' is handled separately for syncing, not stored as a field
    const standardFields = new Set(['id', 'playerNumber', 'name', 'slug', 'title', 'team', 'bio', 'imageUrl', 'eliminated', 'groupNumber']);

    // If a slug is not explicitly provided in the CSV, treat it as unstable and
    // DO NOT use it for syncing (to avoid silently merging distinct players).
    async function ensureUniqueSlug(desired: string): Promise<string> {
      const base = desired.trim();
      if (!base) throw new Error('Slug cannot be empty');

      // Try base, then base-2, base-3, ...
      for (let attempt = 0; attempt < 100; attempt++) {
        const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
        const existing = await prisma.player.findUnique({ where: { slug: candidate } });
        if (!existing) return candidate;
      }
      throw new Error(`Unable to generate unique slug from "${base}"`);
    }

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Parse id for reliable syncing (most reliable method)
        let id: number | null = null;
        if (row.id && row.id.toString().trim() !== '') {
          const parsed = parseInt(row.id.toString(), 10);
          if (!isNaN(parsed) && parsed > 0) {
            id = parsed;
          }
        }
        
        let playerNumber: number | null = null;
        if (row.playerNumber && row.playerNumber.toString().trim() !== '') {
          const parsed = parseInt(row.playerNumber.toString(), 10);
          if (!isNaN(parsed) && parsed > 0) {
            playerNumber = parsed;
          }
        }
        let groupNumber: number | null = null;
        if (row.groupNumber && row.groupNumber.toString().trim() !== '') {
          const parsed = parseInt(row.groupNumber.toString(), 10);
          if (!isNaN(parsed) && parsed > 0) {
            groupNumber = parsed;
          }
        }

        const slugProvided = Boolean(row.slug && row.slug.toString().trim() !== '');
        const rawSlug = slugProvided ? row.slug.toString().trim() : '';

        // Generate a slug for create paths (but do not assume it is safe for syncing).
        // Prefer embedding playerNumber to ensure uniqueness when slug is auto-generated.
        const baseGeneratedSlug = (() => {
          if (slugProvided) return rawSlug;
          if (playerNumber !== null) {
            if (row.name && row.name.toString().trim() !== '') {
              return `${slugify(row.name)}-${playerNumber}`;
            }
            return `player-${playerNumber}`;
          }
          if (row.name && row.name.toString().trim() !== '') return slugify(row.name);
          return '';
        })();

        if (!slugProvided && !baseGeneratedSlug) {
          results.errors.push(`Row ${i + 2}: Cannot create slug - both slug and name are missing`);
          continue;
        }

        const rawTeam = row.team?.toString().trim().toUpperCase();
        const team = rawTeam === 'SMART' ? 'SMART' : rawTeam === 'OG' ? 'OG' : 'STRONG';
        const eliminated = row.eliminated?.toLowerCase() === 'true';

        // Build extraFields from any columns that aren't standard fields
        const extraFields: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (!standardFields.has(key) && value && value.toString().trim() !== '') {
            extraFields[key] = value.toString().trim();
          }
        }

        const baseData: any = {
          playerNumber,
          name: row.name,
          title: row.title || null,
          team,
          bio: row.bio || null,
          imageUrl: row.imageUrl || null,
          eliminated,
          groupNumber,
        };

        // Only include extraFields if it has values, otherwise omit it
        if (Object.keys(extraFields).length > 0) {
          baseData.extraFields = extraFields;
        }

        // Sync priority: id (most reliable) > playerNumber > slug
        let existing = null;
        let wasCreated = false;

        if (id !== null && !isNaN(id)) {
          // Try to find by id first (most reliable for updates)
          existing = await prisma.player.findUnique({ where: { id } });
          if (existing) {
            const data: any = { ...baseData };
            // Only change slug if explicitly provided in the CSV.
            if (slugProvided && rawSlug !== existing.slug) {
              const conflictBySlug = await prisma.player.findUnique({ where: { slug: rawSlug } });
              if (conflictBySlug) {
                results.errors.push(`Row ${i + 2}: Cannot update player "${row.name}" - slug "${rawSlug}" is already used by "${conflictBySlug.name}"`);
                continue;
              }
              data.slug = rawSlug;
            }

            // Update existing player by id
            // Check for conflicts if playerNumber or slug is being changed
            if (playerNumber !== null && playerNumber !== existing.playerNumber) {
              const conflictByPlayerNumber = await prisma.player.findUnique({ where: { playerNumber } });
              if (conflictByPlayerNumber) {
                results.errors.push(`Row ${i + 2}: Cannot update player "${row.name}" - playerNumber ${playerNumber} is already used by "${conflictByPlayerNumber.name}"`);
                continue;
              }
            }
            await prisma.player.update({
              where: { id },
              data,
            });
            results.updated++;
          } else {
            // ID doesn't exist, check for conflicts and create new
            // Check if playerNumber is already taken
            if (playerNumber !== null) {
              const existingByPlayerNumber = await prisma.player.findUnique({ where: { playerNumber } });
              if (existingByPlayerNumber) {
                results.errors.push(`Row ${i + 2}: ID ${id} not found, but playerNumber ${playerNumber} already exists for "${existingByPlayerNumber.name}"`);
                continue;
              }
            }
            // For creates, use a unique slug.
            const desiredSlug = slugProvided ? rawSlug : baseGeneratedSlug;
            const slugForCreate = slugProvided ? desiredSlug : await ensureUniqueSlug(desiredSlug);

            const data: any = { ...baseData, slug: slugForCreate };
            // Create new player (id will be auto-generated, ignore provided id)
            await prisma.player.create({ data });
            results.created++;
            wasCreated = true;
          }
        } else if (playerNumber !== null && !isNaN(playerNumber)) {
          // Try to find by playerNumber for synchronization
          existing = await prisma.player.findUnique({ where: { playerNumber } });
          if (existing) {
            const data: any = { ...baseData };
            // Only change slug if explicitly provided in the CSV.
            if (slugProvided && rawSlug !== existing.slug) {
              const conflictBySlug = await prisma.player.findUnique({ where: { slug: rawSlug } });
              if (conflictBySlug) {
                results.errors.push(`Row ${i + 2}: Cannot update player "${row.name}" - slug "${rawSlug}" is already used by "${conflictBySlug.name}"`);
                continue;
              }
              data.slug = rawSlug;
            }

            // Update existing player by playerNumber
            // Check for slug conflict if slug is being changed
            await prisma.player.update({
              where: { playerNumber },
              data,
            });
            results.updated++;
          } else {
            // No existing by playerNumber.
            // Only allow slug-based syncing if the slug was explicitly provided in the CSV.
            if (slugProvided) {
              const existingBySlug = await prisma.player.findUnique({ where: { slug: rawSlug } });
              if (existingBySlug) {
                // If the existing record already has a different playerNumber, this is a conflict.
                if (existingBySlug.playerNumber !== null && existingBySlug.playerNumber !== playerNumber) {
                  results.errors.push(`Row ${i + 2}: Cannot sync by slug "${rawSlug}" - it already has playerNumber ${existingBySlug.playerNumber}`);
                  continue;
                }
                const data: any = { ...baseData, slug: rawSlug };
                await prisma.player.update({
                  where: { slug: rawSlug },
                  data,
                });
                results.updated++;
              } else {
                const data: any = { ...baseData, slug: rawSlug };
                await prisma.player.create({ data });
                results.created++;
                wasCreated = true;
              }
            } else {
              // Create new player with a unique generated slug to avoid accidental merges.
              const slugForCreate = await ensureUniqueSlug(baseGeneratedSlug);
              const data: any = { ...baseData, slug: slugForCreate };
              await prisma.player.create({ data });
              results.created++;
              wasCreated = true;
            }
          }
        } else {
          // Fall back to slug-based upsert
          const desiredSlug = slugProvided ? rawSlug : baseGeneratedSlug;
          const slugForLookup = desiredSlug;

          existing = await prisma.player.findUnique({ where: { slug: slugForLookup } });
          if (existing) {
            const data: any = { ...baseData };
            // Only change slug if explicitly provided and different (shouldn't really happen in slug-based path).
            if (slugProvided && rawSlug !== existing.slug) {
              const conflictBySlug = await prisma.player.findUnique({ where: { slug: rawSlug } });
              if (conflictBySlug) {
                results.errors.push(`Row ${i + 2}: Cannot update player "${row.name}" - slug "${rawSlug}" is already used by "${conflictBySlug.name}"`);
                continue;
              }
              data.slug = rawSlug;
            }

            // Check for playerNumber conflict if playerNumber is being set/changed
            if (playerNumber !== null && playerNumber !== existing.playerNumber) {
              const conflictByPlayerNumber = await prisma.player.findUnique({ where: { playerNumber } });
              if (conflictByPlayerNumber) {
                results.errors.push(`Row ${i + 2}: Cannot update player "${row.name}" - playerNumber ${playerNumber} is already used by "${conflictByPlayerNumber.name}"`);
                continue;
              }
            }
            await prisma.player.update({
              where: { slug: slugForLookup },
              data,
            });
            results.updated++;
          } else {
            // Check for playerNumber conflict before creating
            if (playerNumber !== null) {
              const conflictByPlayerNumber = await prisma.player.findUnique({ where: { playerNumber } });
              if (conflictByPlayerNumber) {
                results.errors.push(`Row ${i + 2}: Cannot create player "${row.name}" - playerNumber ${playerNumber} is already used by "${conflictByPlayerNumber.name}"`);
                continue;
              }
            }
            const slugForCreate = slugProvided ? desiredSlug : await ensureUniqueSlug(desiredSlug);
            const data: any = { ...baseData, slug: slugForCreate };
            await prisma.player.create({ data });
            results.created++;
            wasCreated = true;
          }
        }
      } catch (error) {
        results.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    results.totalPlayersAfter = await prisma.player.count();

    return NextResponse.json(results);
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

