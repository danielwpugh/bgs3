import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get query parameters for date range (optional)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    
    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Check if Visitor model exists by trying to access it
    // Get unique visitors per day
    let visitors: Array<{ date: Date; ipAddress: string }> = [];
    try {
      visitors = await prisma.visitor.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        ipAddress: true,
      },
      });
    } catch (modelError: any) {
      // If Visitor model doesn't exist, return empty stats
      if (modelError?.message?.includes('Unknown model') || 
          modelError?.message?.includes('does not exist') ||
          modelError?.code === 'P2001' ||
          modelError?.code === 'P2025') {
        return NextResponse.json({
          dailyStats: [],
          totalUniqueVisitors: 0,
          totalVisits: 0,
          todayUniqueVisitors: 0,
          allTimeUniqueVisitors: 0,
        });
      }
      throw modelError;
    }

    // Group by date and count unique IPs per day
    const visitorsByDate = new Map<string, number>();
    const uniqueIPs = new Set<string>();
    
    visitors.forEach((visitor) => {
      const dateStr = visitor.date.toISOString().split('T')[0];
      visitorsByDate.set(dateStr, (visitorsByDate.get(dateStr) || 0) + 1);
      uniqueIPs.add(visitor.ipAddress);
    });

    // Convert to array format for easier consumption
    const dailyStats = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      
      dailyStats.push({
        date: dateStr,
        uniqueVisitors: visitorsByDate.get(dateStr) || 0,
      });
    }

    // Calculate totals
    const totalUniqueVisitors = uniqueIPs.size; // Distinct IP addresses across the period
    const totalVisits = visitors.length; // Total visit records (each is unique IP per day)
    
    // Today's unique visitors
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const todayUniqueVisitors = visitorsByDate.get(todayStr) || 0;

    // Get all-time unique visitors count
    let allTimeVisitors: Array<{ ipAddress: string }> = [];
    try {
      allTimeVisitors = await prisma.visitor.findMany({
        select: {
          ipAddress: true,
        },
      });
    } catch (modelError: any) {
      // If Visitor model doesn't exist, use empty array
      if (modelError?.message?.includes('Unknown model') || 
          modelError?.message?.includes('does not exist') ||
          modelError?.code === 'P2001' ||
          modelError?.code === 'P2025') {
        allTimeVisitors = [];
      } else {
        throw modelError;
      }
    }
    const allTimeUniqueIPs = new Set<string>();
    allTimeVisitors.forEach((visitor) => {
      allTimeUniqueIPs.add(visitor.ipAddress);
    });
    const allTimeUniqueVisitors = allTimeUniqueIPs.size;

    return NextResponse.json({
      dailyStats,
      totalUniqueVisitors,
      totalVisits,
      todayUniqueVisitors,
      allTimeUniqueVisitors,
    });
  } catch (error: any) {
    // Handle case where Visitor model doesn't exist yet
    if (error?.message?.includes('Unknown model') || 
        error?.message?.includes('does not exist') ||
        error?.code === 'P2001' ||
        error?.code === 'P2025' ||
        error?.name === 'PrismaClientValidationError') {
      return NextResponse.json({
        dailyStats: [],
        totalUniqueVisitors: 0,
        totalVisits: 0,
        todayUniqueVisitors: 0,
        allTimeUniqueVisitors: 0,
      });
    }
    
    // Log detailed error for debugging
    console.error('Failed to fetch visitor stats:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack,
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch visitor statistics',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

