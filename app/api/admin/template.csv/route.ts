import { NextResponse } from 'next/server';

export async function GET() {
  // Template matches export format: id,playerNumber,name,slug,title,team,bio,eliminated,imageUrl,groupNumber
  // Note: id is optional for new records (leave empty), but required for updating existing records
  // When exporting, the id column will be included for reliable syncing
  const csv = `id,playerNumber,name,slug,title,team,bio,eliminated,imageUrl,groupNumber
,1,John Doe,john-doe,The Strategist,SMART,Master of puzzles and challenges.,false,,
,2,Jane Smith,jane-smith,The Warrior,STRONG,Unstoppable force in physical challenges.,false,,
`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="players-template.csv"',
    },
  });
}

