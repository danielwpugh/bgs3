import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePlayerImageUrl } from '@/lib/utils';
import { publicAuthError } from '@/lib/public-auth';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const started = performance.now();
  try {
    const denied = await publicAuthError(request); if (denied) return denied;
    const rows = await prisma.player.findMany({select:{id:true,playerNumber:true,slug:true,name:true,title:true,team:true,bio:true,imageUrl:true,eliminated:true,extraFields:true,upvoteCount:true,downvoteCount:true,createdAt:true,updatedAt:true},orderBy:{name:'asc'}});
    const players = await Promise.all(rows.map(async player => ({...player,imageUrl:await resolvePlayerImageUrl(player.playerNumber,player.imageUrl)})));
    return NextResponse.json({players}, {headers:{'Cache-Control':'no-store','Server-Timing':`app;dur=${(performance.now()-started).toFixed(1)}`}});
  } catch (error) { console.error('Players error:',error); return NextResponse.json({error:'Unable to load players'}, {status:503}); }
}
