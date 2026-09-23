import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePlayerImageUrl } from '@/lib/utils';
import { publicAuthError } from '@/lib/public-auth';
import { shortCache } from '@/lib/short-cache';
const dailyCache = shortCache<Array<{date:string;count:bigint}>>(5000);
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const started = performance.now();
  try {
    const denied = await publicAuthError(request); if (denied) return denied;
    const topN = Number(request.nextUrl.searchParams.get('top') || '10');
    const days = Number(request.nextUrl.searchParams.get('days') || '30');
    if (!Number.isInteger(topN) || topN < 1 || topN > 200 || !Number.isInteger(days) || days < 1 || days > 90) return NextResponse.json({error:'top must be 1–200; days must be 1–90'}, {status:400});
    const today = new Date(); today.setUTCHours(0,0,0,0);
    const start = new Date(today); start.setUTCDate(start.getUTCDate() - days + 1);
    // Work scales with players and daily buckets, not the number of votes returned to Node.
    const [players, daily] = await Promise.all([
      prisma.player.findMany({select:{id:true,slug:true,name:true,title:true,team:true,extraFields:true,playerNumber:true,imageUrl:true,eliminated:true,upvoteCount:true,downvoteCount:true}}),
      dailyCache(start.toISOString(), () => prisma.$queryRaw<Array<{date:string; count:bigint}>>`SELECT ("createdAt"::date)::text AS date, count(*) AS count FROM "Vote" WHERE "createdAt" >= ${start} GROUP BY "createdAt"::date ORDER BY "createdAt"::date`),
    ]);
    const eligible = players.filter(p => !p.eliminated);
    const teamVotes = {STRONG:0,SMART:0,OG:0};
    let totalVotes = 0;
    for (const p of players) { totalVotes += p.upvoteCount + p.downvoteCount; teamVotes[p.team] += p.upvoteCount; }
    const resolve = async (p: typeof players[number]) => ({id:p.id,slug:p.slug,name:p.name,title:p.title,team:p.team,extraFields:p.extraFields,imageUrl:await resolvePlayerImageUrl(p.playerNumber,p.imageUrl),upvoteCount:p.upvoteCount});
    const [topPlayersByUpvotes,bottomPlayersByVotes] = await Promise.all([
      Promise.all([...eligible].sort((a,b) => b.upvoteCount-a.upvoteCount || a.id-b.id).slice(0,topN).map(resolve)),
      Promise.all([...eligible].sort((a,b) => a.upvoteCount-b.upvoteCount || a.id-b.id).slice(0,topN).map(resolve)),
    ]);
    const counts = new Map(daily.map(d => [d.date,Number(d.count)]));
    const dailyVotes = Array.from({length:days},(_,i) => { const date = new Date(start); date.setUTCDate(date.getUTCDate()+i); const key = date.toISOString().slice(0,10); return {date:key,count:counts.get(key)||0}; });
    return NextResponse.json({totalVotes,playerCount:players.length,activePlayerCount:eligible.length,todayVotes:counts.get(today.toISOString().slice(0,10))||0,topPlayersByUpvotes,bottomPlayersByVotes,teamVotes,dailyVotes}, {headers:{'Cache-Control':'no-store','Server-Timing':`app;dur=${(performance.now()-started).toFixed(1)}`}});
  } catch (error) {console.error('Stats error:',error); return NextResponse.json({error:'Unable to load statistics'}, {status:503});}
}
