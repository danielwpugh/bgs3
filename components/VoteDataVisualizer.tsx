'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PlayerImage } from '@/components/PlayerImage';

interface AnalyticsData {
  summary: {
    allTime: { total: number; upvotes: number; downvotes: number };
    thisWeek: { total: number; upvotes: number; downvotes: number };
    today: { total: number; upvotes: number; downvotes: number };
  };
  hourlyBreakdown: Array<{ hour: number; upvotes: number; downvotes: number; total: number }>;
  dailyBreakdown: Array<{ date: string; upvotes: number; downvotes: number; total: number }>;
  topPlayers: {
    byUpvotes: {
      allTime: PlayerStats[];
      thisWeek: PlayerStats[];
      today: PlayerStats[];
    };
    byDownvotes: {
      allTime: PlayerStats[];
      thisWeek: PlayerStats[];
      today: PlayerStats[];
    };
    byNet: {
      allTime: PlayerStats[];
      thisWeek: PlayerStats[];
      today: PlayerStats[];
    };
  };
}

interface PlayerStats {
  id: number;
  slug: string;
  name: string;
  title: string | null;
  team: 'STRONG' | 'SMART' | 'OG';
  imageUrl: string | null;
  eliminated: boolean;
  allTime: { upvotes: number; downvotes: number; net: number };
  thisWeek: { upvotes: number; downvotes: number; net: number };
  today: { upvotes: number; downvotes: number; net: number };
}

type TimePeriod = 'today' | 'thisWeek' | 'allTime';
type ViewType = 'byUpvotes' | 'byDownvotes' | 'byNet';

export default function VoteDataVisualizer() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('allTime');
  const [viewType, setViewType] = useState<ViewType>('byUpvotes');

  useEffect(() => {
    fetchAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAnalytics() {
    try {
      const res = await fetch('/api/admin/analytics');
      
      // Check if response is ok
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Analytics API error:', res.status, errorData.error || 'Unknown error');
        setData(null);
        setLoading(false);
        return;
      }
      
      const analyticsData = await res.json();
      
      // Check if the response has an error or is missing required fields
      if (analyticsData.error || !analyticsData.summary) {
        console.error('Analytics API error:', analyticsData.error || 'Missing summary data');
        setData(null);
        setLoading(false);
        return;
      }
      
      // Ensure all required summary fields exist
      if (!analyticsData.summary.today || !analyticsData.summary.thisWeek || !analyticsData.summary.allTime) {
        console.error('Analytics data missing required fields:', analyticsData);
        setData(null);
        setLoading(false);
        return;
      }
      
      setData(analyticsData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-xl text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-red-400">
        Failed to load analytics data
      </div>
    );
  }

  const getCurrentPlayers = () => {
    if (!data?.topPlayers) return [];
    return data.topPlayers[viewType]?.[timePeriod] || [];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getSummaryForPeriod = () => {
    if (!data?.summary) return { total: 0, upvotes: 0, downvotes: 0 };
    return data.summary[timePeriod] || { total: 0, upvotes: 0, downvotes: 0 };
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <h3 className="text-lg text-gray-400 mb-2">Today</h3>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">{data.summary?.today?.total ?? 0}</p>
            <p className="text-sm text-gray-400">
              <span className="text-green-400">↑ {data.summary?.today?.upvotes ?? 0}</span>
              {' / '}
              <span className="text-red-400">↓ {data.summary?.today?.downvotes ?? 0}</span>
            </p>
          </div>
        </div>
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <h3 className="text-lg text-gray-400 mb-2">This Week</h3>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">{data.summary?.thisWeek?.total ?? 0}</p>
            <p className="text-sm text-gray-400">
              <span className="text-green-400">↑ {data.summary?.thisWeek?.upvotes ?? 0}</span>
              {' / '}
              <span className="text-red-400">↓ {data.summary?.thisWeek?.downvotes ?? 0}</span>
            </p>
          </div>
        </div>
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <h3 className="text-lg text-gray-400 mb-2">All Time</h3>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">{data.summary?.allTime?.total ?? 0}</p>
            <p className="text-sm text-gray-400">
              <span className="text-green-400">↑ {data.summary?.allTime?.upvotes ?? 0}</span>
              {' / '}
              <span className="text-red-400">↓ {data.summary?.allTime?.downvotes ?? 0}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Hourly Breakdown (Today) */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <h3 className="text-xl font-bold mb-4 text-white">Votes by Hour (Today)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.hourlyBreakdown || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="hour" 
                stroke="#9CA3AF"
                tickFormatter={(value) => `${value}:00`}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="upvotes" fill="#10b981" name="Upvotes" />
              <Bar dataKey="downvotes" fill="#ef4444" name="Downvotes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Breakdown (This Week) */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <h3 className="text-xl font-bold mb-4 text-white">Votes by Day (This Week)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.dailyBreakdown || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                tickFormatter={formatDate}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="upvotes" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Upvotes"
                dot={{ fill: '#10b981', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="downvotes" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Downvotes"
                dot={{ fill: '#ef4444', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#03bce6" 
                strokeWidth={2}
                name="Total"
                dot={{ fill: '#03bce6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          <span className="text-gray-400 font-semibold">Time Period:</span>
          {(['today', 'thisWeek', 'allTime'] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-4 py-2 rounded-lg transition-opacity ${
                timePeriod === period
                  ? 'text-white font-bold opacity-100'
                  : 'text-gray-300 hover:opacity-80'
              }`}
              style={timePeriod === period 
                ? { backgroundColor: 'rgba(89, 88, 88, 0.5)', border: '1px solid rgba(255, 255, 255, 0.3)' }
                : { backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }
              }
            >
              {period === 'today' ? 'Today' : period === 'thisWeek' ? 'This Week' : 'All Time'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <span className="text-gray-400 font-semibold">View:</span>
          {(['byUpvotes', 'byDownvotes', 'byNet'] as ViewType[]).map((view) => (
            <button
              key={view}
              onClick={() => setViewType(view)}
              className={`px-4 py-2 rounded-lg transition-opacity ${
                viewType === view
                  ? 'text-white font-bold opacity-100'
                  : 'text-gray-300 hover:opacity-80'
              }`}
              style={viewType === view 
                ? { backgroundColor: 'rgba(89, 88, 88, 0.5)', border: '1px solid rgba(255, 255, 255, 0.3)' }
                : { backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }
              }
            >
              {view === 'byUpvotes' ? 'Top Upvotes' : view === 'byDownvotes' ? 'Top Downvotes' : 'Net Score'}
            </button>
          ))}
        </div>
      </div>

      {/* Top Players Lists */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Players */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <h3 className="text-2xl font-bold mb-4 text-white">
            Top Players ({timePeriod === 'today' ? 'Today' : timePeriod === 'thisWeek' ? 'This Week' : 'All Time'})
          </h3>
          <div className="space-y-3">
            {getCurrentPlayers().slice(0, 10).map((player, index) => {
              const stats = player[timePeriod];
              const value = viewType === 'byUpvotes' 
                ? stats.upvotes 
                : viewType === 'byDownvotes' 
                ? stats.downvotes 
                : stats.net;
              
              return (
                <div
                  key={player.id}
                  className={`p-4 rounded-lg ${player.eliminated ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: 'rgba(89, 88, 88, 0.2)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-gray-400 w-8">#{index + 1}</div>
                      {player.imageUrl && (
                        <PlayerImage
                          src={player.imageUrl}
                          alt={player.name}
                          className="w-12 rounded object-cover"
                          style={{ borderRadius: '4px', aspectRatio: '0.8' }}
                          logMissingSrc={false}
                          context={{
                            surface: 'admin-analytics-top-players',
                            playerId: player.id,
                            name: player.name,
                          }}
                        />
                      )}
                      <div>
                        <div className="font-bold text-white">{player.name}</div>
                        {player.title && (
                          <div className="text-sm text-gray-400">{player.title}</div>
                        )}
                        <div className="text-xs mt-1">
                          <span className="text-gray-300">
                            {player.team}
                          </span>
                          {player.eliminated && (
                            <span className="ml-2 text-red-400">ELIMINATED</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        viewType === 'byUpvotes' ? 'text-green-400' :
                        viewType === 'byDownvotes' ? 'text-red-400' :
                        value >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {value > 0 ? '+' : ''}{value}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {viewType === 'byUpvotes' && `↑ ${stats.upvotes} / ↓ ${stats.downvotes}`}
                        {viewType === 'byDownvotes' && `↑ ${stats.upvotes} / ↓ ${stats.downvotes}`}
                        {viewType === 'byNet' && `Net: ${stats.net}`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {getCurrentPlayers().length === 0 && (
              <div className="text-center py-8 text-gray-400">No players found</div>
            )}
          </div>
        </div>

        {/* Bottom Players (inverted view) */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <h3 className="text-2xl font-bold mb-4 text-white">
            Bottom Players ({timePeriod === 'today' ? 'Today' : timePeriod === 'thisWeek' ? 'This Week' : 'All Time'})
          </h3>
          <div className="space-y-3">
            {[...getCurrentPlayers()].reverse().slice(0, 10).map((player, index) => {
              const stats = player[timePeriod];
              const value = viewType === 'byUpvotes' 
                ? stats.upvotes 
                : viewType === 'byDownvotes' 
                ? stats.downvotes 
                : stats.net;
              const reverseIndex = getCurrentPlayers().length - index;
              
              return (
                <div
                  key={player.id}
                  className={`p-4 rounded-lg ${player.eliminated ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: 'rgba(89, 88, 88, 0.2)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-gray-400 w-8">#{reverseIndex}</div>
                      {player.imageUrl && (
                        <PlayerImage
                          src={player.imageUrl}
                          alt={player.name}
                          className="w-12 rounded object-cover"
                          style={{ borderRadius: '4px', aspectRatio: '0.8' }}
                          logMissingSrc={false}
                          context={{
                            surface: 'admin-analytics-bottom-players',
                            playerId: player.id,
                            name: player.name,
                          }}
                        />
                      )}
                      <div>
                        <div className="font-bold text-white">{player.name}</div>
                        {player.title && (
                          <div className="text-sm text-gray-400">{player.title}</div>
                        )}
                        <div className="text-xs mt-1">
                          <span className="text-gray-300">
                            {player.team}
                          </span>
                          {player.eliminated && (
                            <span className="ml-2 text-red-400">ELIMINATED</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        viewType === 'byUpvotes' ? 'text-green-400' :
                        viewType === 'byDownvotes' ? 'text-red-400' :
                        value >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {value > 0 ? '+' : ''}{value}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {viewType === 'byUpvotes' && `↑ ${stats.upvotes} / ↓ ${stats.downvotes}`}
                        {viewType === 'byDownvotes' && `↑ ${stats.upvotes} / ↓ ${stats.downvotes}`}
                        {viewType === 'byNet' && `Net: ${stats.net}`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {getCurrentPlayers().length === 0 && (
              <div className="text-center py-8 text-gray-400">No players found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

