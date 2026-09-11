import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    // Check actual required columns, not just database connectivity.
    await prisma.player.findFirst({select:{id:true,upvoteCount:true,downvoteCount:true}});
    await prisma.settings.findFirst({select:{pauseVoting:true,frontendPasswordEnabled:true}});
    return NextResponse.json({status:'ok',apiVersion:1,release:process.env.RELEASE_ID || 'local'}, {headers:{'Cache-Control':'no-store'}});
  } catch {return NextResponse.json({status:'unavailable',apiVersion:1}, {status:503});}
}
