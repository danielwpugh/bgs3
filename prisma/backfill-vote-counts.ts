/**
 * Migration script to backfill vote counts in Player table
 * 
 * This script calculates and updates the denormalized upvoteCount and downvoteCount
 * columns for all players based on existing votes in the database.
 * 
 * Run with: npx tsx prisma/backfill-vote-counts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillVoteCounts() {
  console.log('Starting vote count backfill...');

  try {
    // Get all players
    const players = await prisma.player.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    console.log(`Found ${players.length} players to process`);

    let processed = 0;
    let errors = 0;

    // Process each player
    for (const player of players) {
      try {
        // Count votes by type
        let upvoteCount = 0;
        let downvoteCount = 0;

        try {
          // Try to count by type (if type column exists)
          upvoteCount = await prisma.vote.count({
            where: { playerId: player.id, type: 'UPVOTE' },
          });
          downvoteCount = await prisma.vote.count({
            where: { playerId: player.id, type: 'DOWNVOTE' },
          });
        } catch (error: any) {
          // If type column doesn't exist, count all votes as upvotes
          if (
            error?.message?.includes('Unknown argument `type`') ||
            error?.message?.includes('Unknown arg `type`') ||
            error?.code === 'P2009' ||
            error?.name === 'PrismaClientValidationError'
          ) {
            const totalVotes = await prisma.vote.count({
              where: { playerId: player.id },
            });
            upvoteCount = totalVotes;
            downvoteCount = 0;
          } else {
            throw error;
          }
        }

        // Update player with vote counts
        try {
          await prisma.player.update({
            where: { id: player.id },
            data: {
              upvoteCount,
              downvoteCount,
            },
          });
          processed++;
          if (processed % 10 === 0) {
            console.log(`Processed ${processed}/${players.length} players...`);
          }
        } catch (error: any) {
          // If denormalized columns don't exist yet, skip (migration not run)
          if (
            error?.message?.includes('Unknown argument') ||
            error?.code === 'P2009' ||
            error?.name === 'PrismaClientValidationError'
          ) {
            console.warn(
              `Warning: Denormalized columns (upvoteCount, downvoteCount) don't exist yet. ` +
              `Please run the database migration first: npm run db:migrate`
            );
            return;
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error(`Error processing player ${player.id} (${player.name}):`, error);
        errors++;
      }
    }

    console.log(`\nBackfill complete!`);
    console.log(`- Processed: ${processed} players`);
    console.log(`- Errors: ${errors} players`);

    // Verify the results
    const totalUpvotes = await prisma.player.aggregate({
      _sum: {
        upvoteCount: true,
      },
    });
    const totalDownvotes = await prisma.player.aggregate({
      _sum: {
        downvoteCount: true,
      },
    });
    const actualVoteCount = await prisma.vote.count();

    console.log(`\nVerification:`);
    console.log(`- Sum of upvoteCount: ${totalUpvotes._sum.upvoteCount ?? 0}`);
    console.log(`- Sum of downvoteCount: ${totalDownvotes._sum.downvoteCount ?? 0}`);
    console.log(`- Total votes in Vote table: ${actualVoteCount}`);
    console.log(
      `- Expected total: ${(totalUpvotes._sum.upvoteCount ?? 0) + (totalDownvotes._sum.downvoteCount ?? 0)}`
    );
  } catch (error) {
    console.error('Fatal error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillVoteCounts()
  .then(() => {
    console.log('\nBackfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nBackfill script failed:', error);
    process.exit(1);
  });




















