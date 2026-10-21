import { NextResponse } from 'next/server';

export async function GET() {
  // Template matches export format: id,playerNumber,name,slug,title,team,bio,eliminated,imageUrl,groupNumber,country
  // Note: id is optional for new records (leave empty), or use playerNumber/slug to match existing records
  // When exporting, the id column will be included for reliable syncing
  const csv = `id,playerNumber,name,slug,title,team,bio,eliminated,imageUrl,groupNumber,country
,1,John Doe,john-doe,The Strategist,,Master of puzzles and challenges.,false,,1,Australia
,2,Jane Smith,jane-smith,The Warrior,,Unstoppable force in physical challenges.,false,,2,France
`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="players-template.csv"',
    },
  });
}

