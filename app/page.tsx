 'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import { PlayerImage } from '@/components/PlayerImage';

interface Stats {
  totalVotes: number;
  playerCount: number;
  activePlayerCount?: number;
  todayVotes: number;
  topPlayersByUpvotes: Array<{
    id: number;
    slug: string;
    name: string;
    title: string | null;
    team: 'STRONG' | 'SMART' | 'OG';
    imageUrl: string | null;
    upvoteCount: number;
  }>;
  bottomPlayersByVotes: Array<{
    id: number;
    slug: string;
    name: string;
    title: string | null;
    team: 'STRONG' | 'SMART' | 'OG';
    imageUrl: string | null;
    upvoteCount: number;
  }>;
  teamVotes: {
    STRONG: number;
    SMART: number;
    OG: number;
  };
  dailyVotes: Array<{
    date: string;
    count: number;
  }>;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  function formatVotesToday(count: number) {
    if (count < 1000) return count.toLocaleString();
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(count);
  }

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/stats?top=5&days=30');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const activePlayers = stats?.activePlayerCount ?? stats?.playerCount ?? 0;
  const votesToday = stats?.todayVotes ?? 0;
  const winningTeam = (() => {
    if (!stats || !stats.teamVotes) return '—';
    const entries = Object.entries(stats.teamVotes) as Array<[string, number]>;
    if (entries.length === 0) return '—';
    const maxVotes = Math.max(...entries.map(([, v]) => v));
    const winners = entries.filter(([, v]) => v === maxVotes).map(([k]) => k);
    return winners.length === 1 ? winners[0] : 'TIED';
  })();

  return (
    <div className="min-h-screen text-fg-main">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Header + Summary */}
        <div className="flex flex-col md:items-center lg:flex-row lg:items-center lg:justify-between gap-8 md:gap-12 mb-6 md:mb-8">
          <div className="w-full lg:w-1/3 md:flex md:justify-center lg:justify-start text-center lg:text-left">
            <img
              src="/images/logo.png"
              alt="Beast Games"
              className="h-[5.75rem] md:h-[7.1875rem] object-contain mx-auto lg:mx-0"
            />
          </div>

          <div className="w-full lg:w-2/3">
            <div className="grid grid-cols-3 gap-4 md:gap-6 text-center">
              <div>
                <div className="text-[0.6rem] md:text-xs uppercase tracking-[0.15em] font-bold text-white mb-2 whitespace-nowrap">
                  Active Players
                </div>
                <div
                  className="rounded-lg px-4 py-3 md:px-6 md:py-4 min-h-[3.75rem] md:min-h-[4.5rem] flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                >
                  <div className="text-2xl md:text-4xl font-black text-white">
                    {loading ? '—' : activePlayers.toLocaleString()}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[0.6rem] md:text-xs uppercase tracking-[0.15em] font-bold text-white mb-2 whitespace-nowrap">
                  Votes Today
                </div>
                <div
                  className="rounded-lg px-4 py-3 md:px-6 md:py-4 min-h-[3.75rem] md:min-h-[4.5rem] flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                >
                  <div className="text-2xl md:text-4xl font-black text-white">
                    {loading ? '—' : formatVotesToday(votesToday)}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[0.6rem] md:text-xs uppercase tracking-[0.15em] font-bold text-white mb-2 whitespace-nowrap">
                  Winning Team
                </div>
                <div
                  className="rounded-lg px-4 py-3 md:px-6 md:py-4 min-h-[3.75rem] md:min-h-[4.5rem] flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(89, 88, 88, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                >
                  <div className="text-xl md:text-3xl font-black text-white">
                    {loading ? '—' : winningTeam}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Browse & Vote CTA */}
        <div className="mb-6 md:mb-8">
          <Link
            href="/beastdex"
            className="browse-button block w-full text-center py-2 md:py-3 text-lg md:text-2xl font-black tracking-wide uppercase text-white transition-all duration-300"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.43)',
              borderRadius: '10px',
              background: 'linear-gradient(to right, #03bce6, #e64783)',
            }}
          >
            Browse and Vote
          </Link>
        </div>

        {/* Top / Bottom 5 */}
        <div
          className="p-6 md:p-10"
          style={{
            border: '7px solid #03bce6',
            borderRadius: '16px',
            boxShadow: '0 0 20px rgba(3, 188, 230, 0.8), 0 0 40px rgba(3, 188, 230, 0.5), 0 0 60px rgba(3, 188, 230, 0.3)',
          }}
        >
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-center mb-6 text-white flex items-center justify-center gap-2 uppercase">
                Top 5 <Image src="/images/arrow-up.png" alt="Up arrow" width={24} height={24} className="inline-block" />
              </h2>
              <div className="space-y-4">
                {(stats?.topPlayersByUpvotes ?? new Array(5).fill(null)).map(
                  (player, index) => (
                    <Link
                      key={player?.id ?? index}
                      href={player ? `/players/${player.slug}` : '#'}
                      className="flex items-center h-[10rem] md:h-[12.5rem] max-[480px]:h-auto max-[480px]:flex-col max-[480px]:items-stretch rounded-lg overflow-hidden transition-all outline-none"
                      style={{
                        backgroundColor: 'rgba(215, 215, 215, 0.1)',
                        border: '2px solid rgba(215, 215, 215, 0.11)',
                      }}
                      onMouseEnter={(e) => {
                        const hoverColor = player?.team === 'STRONG' 
                          ? 'var(--accent-blue)' 
                          : player?.team === 'SMART' 
                          ? 'var(--accent-pink)' 
                          : player?.team === 'OG'
                          ? 'var(--accent-gray)'
                          : '#4b5563';
                        e.currentTarget.style.borderColor = hoverColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(215, 215, 215, 0.11)';
                      }}
                    >
                      <div className="w-32 md:w-40 max-[480px]:w-full aspect-[4/5] max-[480px]:aspect-[16/9] bg-white/[0.03] flex items-center justify-center overflow-hidden">
                        <PlayerImage
                          src={player?.imageUrl}
                          alt={player?.name ?? 'Player'}
                          className="w-full h-full object-contain"
                          placeholder={<span className="text-4xl text-gray-600">👤</span>}
                          logMissingSrc={Boolean(player)}
                          context={{
                            surface: 'home-top5',
                            playerId: player?.id,
                            slug: player?.slug,
                            name: player?.name,
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 h-full px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-4 max-[480px]:h-auto max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-2">
                        <div className="min-w-0">
                          <div className="text-2xl sm:text-3xl md:text-4xl font-black uppercase break-words leading-tight">
                            {player ? player.name : '—'}
                          </div>
                          <div
                            className="text-sm md:text-base font-black mb-4 uppercase break-words leading-tight"
                            style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                          >
                            {player?.title || 'Player'}
                          </div>
                          <div className={`inline-flex items-center px-3 py-1 text-xs md:text-sm uppercase rounded ${
                            player?.team === 'STRONG'
                              ? 'border text-white'
                              : player?.team === 'SMART'
                              ? 'border text-white'
                            : player?.team === 'OG'
                              ? 'border text-white'
                              : 'bg-gray-800 text-gray-200'
                          }`}
                          style={player?.team === 'STRONG' 
                            ? { border: '1px solid #99ECFF', backgroundColor: '#00BFEC' }
                            : player?.team === 'SMART'
                            ? { border: '1px solid #FF7AB1', backgroundColor: '#FA2F82' }
                            : player?.team === 'OG'
                            ? { border: '1px solid #D1D5DB', backgroundColor: '#4B5563' }
                            : undefined
                          }>
                            {player ? player.team : 'Team'}
                          </div>
                        </div>
                        <div className="text-right text-sm md:text-base text-white max-[480px]:w-full max-[480px]:text-left whitespace-nowrap shrink-0 flex items-center justify-end gap-2 max-[480px]:justify-start">
                          <span>{player ? player.upvoteCount.toLocaleString() : '—'}</span>
                          <FontAwesomeIcon icon={faThumbsUp} className="opacity-90" />
                        </div>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-black text-center mb-6 text-white flex items-center justify-center gap-2 uppercase">
                Bottom 5 <Image src="/images/arrow-down.png" alt="Down arrow" width={24} height={24} className="inline-block" />
              </h2>
              <div className="space-y-4">
                {(stats?.bottomPlayersByVotes ?? new Array(5).fill(null)).map(
                  (player, index) => (
                    <Link
                      key={player?.id ?? index}
                      href={player ? `/players/${player.slug}` : '#'}
                      className="flex items-center h-[10rem] md:h-[12.5rem] max-[480px]:h-auto max-[480px]:flex-col max-[480px]:items-stretch rounded-lg overflow-hidden transition-all outline-none"
                      style={{
                        backgroundColor: 'rgba(215, 215, 215, 0.1)',
                        border: '2px solid rgba(215, 215, 215, 0.11)',
                      }}
                      onMouseEnter={(e) => {
                        const hoverColor = player?.team === 'STRONG' 
                          ? 'var(--accent-blue)' 
                          : player?.team === 'SMART' 
                          ? 'var(--accent-pink)' 
                          : player?.team === 'OG'
                          ? 'var(--accent-gray)'
                          : '#4b5563';
                        e.currentTarget.style.borderColor = hoverColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(215, 215, 215, 0.11)';
                      }}
                    >
                      <div className="w-32 md:w-40 max-[480px]:w-full aspect-[4/5] max-[480px]:aspect-[16/9] bg-white/[0.03] flex items-center justify-center overflow-hidden">
                        <PlayerImage
                          src={player?.imageUrl}
                          alt={player?.name ?? 'Player'}
                          className="w-full h-full object-contain"
                          placeholder={<span className="text-4xl text-gray-600">👤</span>}
                          logMissingSrc={Boolean(player)}
                          context={{
                            surface: 'home-bottom5',
                            playerId: player?.id,
                            slug: player?.slug,
                            name: player?.name,
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 h-full px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-4 max-[480px]:h-auto max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-2">
                        <div className="min-w-0">
                          <div className="text-2xl sm:text-3xl md:text-4xl font-black uppercase break-words leading-tight">
                            {player ? player.name : '—'}
                          </div>
                          <div
                            className="text-sm md:text-base font-black mb-4 uppercase break-words leading-tight"
                            style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                          >
                            {player?.title || 'Player'}
                          </div>
                          <div className={`inline-flex items-center px-3 py-1 text-xs md:text-sm uppercase rounded ${
                            player?.team === 'STRONG'
                              ? 'border text-white'
                              : player?.team === 'SMART'
                              ? 'border text-white'
                              : player?.team === 'OG'
                              ? 'border text-white'
                              : 'bg-gray-800 text-gray-200'
                          }`}
                          style={player?.team === 'STRONG' 
                            ? { border: '1px solid #99ECFF', backgroundColor: '#00BFEC' }
                            : player?.team === 'SMART'
                            ? { border: '1px solid #FF7AB1', backgroundColor: '#FA2F82' }
                            : player?.team === 'OG'
                            ? { border: '1px solid #D1D5DB', backgroundColor: '#4B5563' }
                            : undefined
                          }>
                            {player ? player.team : 'Team'}
                          </div>
                        </div>
                        <div className="text-right text-sm md:text-base text-white max-[480px]:w-full max-[480px]:text-left whitespace-nowrap shrink-0 flex items-center justify-end gap-2 max-[480px]:justify-start">
                          <span>{player ? player.upvoteCount.toLocaleString() : '—'}</span>
                          <FontAwesomeIcon icon={faThumbsUp} className="opacity-90" />
                        </div>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

