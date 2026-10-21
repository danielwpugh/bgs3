 'use client';

import { apiFetch, assetUrl } from '@/lib/public-client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import { CountryBadge } from '@/components/CountryBadge';
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
    extraFields?: { country?: string } | null;
    upvoteCount: number;
  }>;
  bottomPlayersByVotes: Array<{
    id: number;
    slug: string;
    name: string;
    title: string | null;
    team: 'STRONG' | 'SMART' | 'OG';
    imageUrl: string | null;
    extraFields?: { country?: string } | null;
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/stats?top=5&days=30');
      if (!res.ok) throw new Error('Unable to load statistics. Please try again.');
      const data = await res.json();
      if (!Array.isArray(data.topPlayersByUpvotes) || !data.teamVotes) throw new Error('Unexpected API response');
      setStats(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load statistics');
    } finally {
      setLoading(false);
    }
  }

  const activePlayers = stats?.activePlayerCount ?? stats?.playerCount ?? 0;
  const votesToday = stats?.todayVotes ?? 0;

  return (
    <div className="min-h-screen text-fg-main">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {error && <p role="alert">{error} <button onClick={fetchStats}>Retry</button></p>}
        {/* Header + Summary */}
        <div className="flex flex-col md:items-center lg:flex-row lg:items-center lg:justify-between gap-8 md:gap-12 mb-10 md:mb-14">
          <div className="w-full lg:w-1/3 md:flex md:justify-center lg:justify-start text-center lg:text-left">
            <img
              src={assetUrl("/images/logo.webp")}
              alt="Beast Games"
              width={502}
              height={226}
              className="h-[5.75rem] md:h-[7.1875rem] w-auto max-w-full object-contain mx-auto lg:mx-0"
            />
          </div>

          <div className="w-full lg:w-2/3">
            <div className="grid grid-cols-2 gap-4 md:gap-6 text-center">
              <div>
                <div className="text-[0.6rem] md:text-xs uppercase tracking-[0.15em] font-bold text-white mb-2 whitespace-nowrap">
                  Active Players
                </div>
                <div
                  className="rounded-lg px-4 py-3 md:px-6 md:py-4 min-h-[3.75rem] md:min-h-[4.5rem] flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                >
                  <div className="text-2xl md:text-4xl font-black text-white">
                    {loading || error ? '—' : activePlayers.toLocaleString()}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[0.6rem] md:text-xs uppercase tracking-[0.15em] font-bold text-white mb-2 whitespace-nowrap">
                  Votes Today
                </div>
                <div
                  className="rounded-lg px-4 py-3 md:px-6 md:py-4 min-h-[3.75rem] md:min-h-[4.5rem] flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                >
                  <div className="text-2xl md:text-4xl font-black text-white">
                    {loading || error ? '—' : votesToday.toLocaleString()}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Browse & Vote CTA */}
        <div className="mb-12 md:mb-16">
          <Link
            href="/beastdex"
            className="browse-button block w-full text-center py-2 md:py-3 text-lg md:text-2xl font-black tracking-wide uppercase text-white transition-all duration-300"
            style={{
              border: '1px solid #00b4d5',
              borderRadius: '10px',
              background: '#00b4d5',
            }}
          >
            Browse and Vote
          </Link>
        </div>

        {/* Top / Bottom 5 */}
        <div className="px-0 md:px-4">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-center mb-6 text-white flex items-center justify-center gap-2 uppercase">
                Top 5 <Image src={assetUrl("/images/arrow-up.webp")} alt="Up arrow" width={24} height={24} className="inline-block" />
              </h2>
              <div className="space-y-5">
                {(stats?.topPlayersByUpvotes ?? new Array(5).fill(null)).map(
                  (player, index) => (
                    <Link
                      key={player?.id ?? index}
                      href={player ? `/players/${player.slug}` : '#'}
                      className="dashboard-player-card flex items-stretch h-[10rem] md:h-[12.5rem] rounded-md overflow-hidden p-1"
                    >
                      <div className="w-28 sm:w-32 md:w-[9.5rem] shrink-0 h-full bg-white/[0.03] flex items-center justify-center overflow-hidden rounded-sm">
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
                      <div className="flex-1 min-w-0 h-full px-3 py-3 md:px-7 md:py-5 flex flex-col justify-between gap-2">
                        <div className="min-w-0">
                          <CountryBadge extraFields={player?.extraFields} className="mb-2 text-xs sm:text-sm md:text-base" />
                          <div className="text-xl sm:text-3xl md:text-4xl font-black uppercase break-words leading-tight">
                            {player ? player.name : '—'}
                          </div>
                          <div
                            className="text-xs sm:text-sm md:text-base font-black uppercase break-words leading-tight"
                            style={{ color: '#898a8d' }}
                          >
                            {player?.title || 'Player'}
                          </div>

                        </div>
                        <div className="text-right text-sm md:text-base text-white/65 whitespace-nowrap shrink-0 flex items-center justify-end gap-1">
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
                Bottom 5 <Image src={assetUrl("/images/arrow-down.webp")} alt="Down arrow" width={24} height={24} className="inline-block" />
              </h2>
              <div className="space-y-5">
                {(stats?.bottomPlayersByVotes ?? new Array(5).fill(null)).map(
                  (player, index) => (
                    <Link
                      key={player?.id ?? index}
                      href={player ? `/players/${player.slug}` : '#'}
                      className="dashboard-player-card flex items-stretch h-[10rem] md:h-[12.5rem] rounded-md overflow-hidden p-1"
                    >
                      <div className="w-28 sm:w-32 md:w-[9.5rem] shrink-0 h-full bg-white/[0.03] flex items-center justify-center overflow-hidden rounded-sm">
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
                      <div className="flex-1 min-w-0 h-full px-3 py-3 md:px-7 md:py-5 flex flex-col justify-between gap-2">
                        <div className="min-w-0">
                          <CountryBadge extraFields={player?.extraFields} className="mb-2 text-xs sm:text-sm md:text-base" />
                          <div className="text-xl sm:text-3xl md:text-4xl font-black uppercase break-words leading-tight">
                            {player ? player.name : '—'}
                          </div>
                          <div
                            className="text-xs sm:text-sm md:text-base font-black uppercase break-words leading-tight"
                            style={{ color: '#898a8d' }}
                          >
                            {player?.title || 'Player'}
                          </div>

                        </div>
                        <div className="text-right text-sm md:text-base text-white/65 whitespace-nowrap shrink-0 flex items-center justify-end gap-1">
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

