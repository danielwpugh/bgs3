'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import VoteDataVisualizer from '@/components/VoteDataVisualizer';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Stats {
  totalVotes: number;
  playerCount: number;
  todayVotes: number;
  teamVotes: {
    STRONG: number;
    SMART: number;
  };
}

interface VisitorStats {
  dailyStats: Array<{
    date: string;
    uniqueVisitors: number;
  }>;
  totalUniqueVisitors: number;
  totalVisits: number;
  todayUniqueVisitors: number;
  allTimeUniqueVisitors: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitorLoading, setVisitorLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchVisitorStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchVisitorStats() {
    try {
      const res = await fetch('/api/admin/visitors?days=30');
      const data = await res.json();
      setVisitorStats(data);
    } catch (error) {
      console.error('Failed to fetch visitor stats:', error);
    } finally {
      setVisitorLoading(false);
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <p className="text-white font-semibold mb-2">{formatDate(label)}</p>
          <p className="text-sm text-blue-400">
            Unique Visitors: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <AdminLayout>
      <div>
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        {loading ? (
          <div className="text-center py-16 font-black">LOADING</div>
        ) : stats ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <h3 className="text-lg text-gray-400 mb-2">Total Players</h3>
              <p className="text-4xl font-bold text-white">{stats.playerCount}</p>
            </div>
            <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <h3 className="text-lg text-gray-400 mb-2">Total Votes</h3>
              <p className="text-4xl font-bold text-white">{stats.totalVotes}</p>
            </div>
            <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <h3 className="text-lg text-gray-400 mb-2">Today&apos;s Votes</h3>
              <p className="text-4xl font-bold text-white">{stats.todayVotes}</p>
            </div>
            <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <h3 className="text-lg text-gray-400 mb-2">Team Votes</h3>
              <div className="mt-2">
                <p className="text-lg text-white">
                  <span className="font-semibold">STRONG:</span> {stats.teamVotes?.STRONG ?? 0}
                </p>
                <p className="text-lg text-white">
                  <span className="font-semibold">SMART:</span> {stats.teamVotes?.SMART ?? 0}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-red-400">Failed to load stats</div>
        )}

        {/* Visitor Statistics Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Website Visitors</h2>
          {visitorLoading ? (
            <div className="text-center py-16">Loading visitor stats...</div>
          ) : visitorStats ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <h3 className="text-lg text-gray-400 mb-2">Today&apos;s Unique Visitors</h3>
                  <p className="text-4xl font-bold text-white">{visitorStats.todayUniqueVisitors}</p>
                </div>
                <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <h3 className="text-lg text-gray-400 mb-2">Total Unique Visitors (30 days)</h3>
                  <p className="text-4xl font-bold text-white">{visitorStats.totalUniqueVisitors}</p>
                </div>
                <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <h3 className="text-lg text-gray-400 mb-2">Total Unique Visitors (All Time)</h3>
                  <p className="text-4xl font-bold text-white">{visitorStats.allTimeUniqueVisitors}</p>
                </div>
                <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <h3 className="text-lg text-gray-400 mb-2">Total Visits (30 days)</h3>
                  <p className="text-4xl font-bold text-white">{visitorStats.totalVisits}</p>
                </div>
              </div>

              {/* Daily Visitors Chart */}
              <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <h3 className="text-xl font-bold mb-4 text-white">Unique Visitors Per Day (Last 30 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={visitorStats.dailyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      tickFormatter={formatDate}
                    />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="uniqueVisitors" fill="#03bce6" name="Unique Visitors" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-red-400">Failed to load visitor stats</div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Link
            href="/admin/players"
            className="p-6 rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            <h2 className="text-2xl font-bold mb-2 text-white">Manage Players</h2>
            <p className="text-gray-400">Create, edit, and delete players</p>
          </Link>
          <Link
            href="/admin/import"
            className="p-6 rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            <h2 className="text-2xl font-bold mb-2 text-white">CSV Import</h2>
            <p className="text-gray-400">Bulk import players from CSV</p>
          </Link>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/admin/export-analytics');
                if (!response.ok) {
                  throw new Error('Failed to export analytics');
                }
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'analytics-export.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              } catch (error) {
                console.error('Failed to export analytics:', error);
                alert('Failed to export analytics. Please try again.');
              }
            }}
            className="p-6 rounded-lg transition-opacity hover:opacity-80 text-left"
            style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            <h2 className="text-2xl font-bold mb-2 text-white">Export Analytics</h2>
            <p className="text-gray-400">Export all analytics data per day</p>
          </button>
          <Link
            href="/admin/settings"
            className="p-6 rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            <h2 className="text-2xl font-bold mb-2 text-white">Settings</h2>
            <p className="text-gray-400">Change admin password</p>
          </Link>
        </div>

        {/* Comprehensive Data Visualizer */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold mb-6">Vote Analytics & Data Visualizer</h2>
          <VoteDataVisualizer />
        </div>
      </div>
    </AdminLayout>
  );
}

