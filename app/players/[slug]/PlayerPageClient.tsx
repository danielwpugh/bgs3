'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsUp, faCaretLeft } from '@fortawesome/free-solid-svg-icons';
import { PlayerImage } from '@/components/PlayerImage';
import { getTeamTheme } from '@/lib/teamTheme';

export interface PlayerClientShape {
  id: number;
  playerNumber: number | null;
  slug: string;
  name: string;
  title: string | null;
  team: 'STRONG' | 'SMART' | 'OG';
  bio: string | null;
  imageUrl: string | null;
  eliminated: boolean;
  extraFields?: {
    linkLabel?: string;
    linkUrl?: string;
    [key: string]: any;
  } | null;
}

export default function PlayerPageClient({
  initialPlayer,
  initialUpvoteCount,
}: {
  initialPlayer: PlayerClientShape;
  initialUpvoteCount: number;
}) {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : undefined;

  const [player, setPlayer] = useState<PlayerClientShape>(initialPlayer);
  const [upvoteCount, setUpvoteCount] = useState(initialUpvoteCount);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const voterIdStorageKey = 'beastgames_voter_id';

  const isViewingSamePlayer = useMemo(() => {
    return !!slug && slug === initialPlayer.slug;
  }, [slug, initialPlayer.slug]);

  useEffect(() => {
    // If client-side navigation ever reuses the component with a different slug,
    // refresh from the API to keep behavior consistent.
    if (!slug) return;
    if (isViewingSamePlayer) return;
    void fetchPlayer(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function fetchPlayer(nextSlug: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${nextSlug}`);
      if (!res.ok) throw new Error('Player not found');
      const data = await res.json();
      setPlayer(data.player);
      setUpvoteCount(data.upvoteCount || 0);
    } catch (e) {
      console.error('Failed to fetch player:', e);
      setError('Player not found');
    } finally {
      setLoading(false);
    }
  }

  function formatVoteCount(count: number): string {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }

  function formatPlayerNumber(p: PlayerClientShape): string {
    const num = p.playerNumber ?? p.id;
    return num.toString().padStart(3, '0');
  }

  async function handleVote(voteType: 'UPVOTE') {
    if (!player || voting) return;

    setVoting(true);
    setError(null);
    setSuccess(false);
    setSuccessMessage(null);

    try {
      const storedVoterId =
        typeof window !== 'undefined' ? window.localStorage.getItem(voterIdStorageKey) : null;

      const res = await fetch('/api/votes', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(storedVoterId ? { 'x-voter-id': storedVoterId } : {}),
        },
        body: JSON.stringify({ slug: player.slug, type: voteType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to vote');

      if (data?.voterId && typeof window !== 'undefined') {
        window.localStorage.setItem(voterIdStorageKey, String(data.voterId));
      }

      setUpvoteCount(data.upvoteCount);
      setSuccess(true);
      setSuccessMessage(data.message || 'Vote recorded!');
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to vote');
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen text-fg-main flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (!player) return null;

  const playerNumber = formatPlayerNumber(player);
  const voteCount = formatVoteCount(upvoteCount);
  const theme = getTeamTheme(player.team);
  const accentColor = theme.accentVar;
  const accentGlow = theme.hoverGlow;

  return (
    <div className="min-h-screen text-fg-main">
      <div className="container mx-auto px-4 py-8">
        <Link href="/beastdex" className="text-white hover:underline mb-4 inline-block flex items-center">
          <FontAwesomeIcon icon={faCaretLeft} className="mr-1" /> Back to Beastdex
        </Link>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {/* Left Panel - Player Card */}
            <div className={`relative ${player.eliminated ? 'eliminated' : ''}`}>
              <div
                className="relative rounded-lg overflow-hidden"
                style={{
                  backgroundColor: player.team === 'OG' ? '#111827' : '#0a1a2e',
                  border: '2px solid',
                  borderColor: accentColor,
                  boxShadow: accentGlow,
                }}
              >
                {/* Player Image */}
                <div className="relative w-full aspect-[4/5]">
                  <PlayerImage
                    src={player.imageUrl}
                    alt={player.name}
                    className="w-full h-full object-contain"
                    placeholder={
                      <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center relative">
                        <span className="text-8xl mb-4">👤</span>
                      </div>
                    }
                    context={{
                      surface: 'player-detail',
                      playerId: player.id,
                      slug: player.slug,
                      name: player.name,
                      team: player.team,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Panel - Details */}
            <div
              className="p-8 md:p-12 flex flex-col justify-start rounded-[10px]"
              style={{
                backgroundColor: 'rgba(21, 21, 21, 0.6)',
              }}
            >
              {/* Name */}
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 uppercase">
                {player.name}
              </h1>

              {/* Title */}
              {player.title && (
                <p
                  className="text-xl md:text-2xl font-bold mb-6 uppercase"
                  style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  {player.title}
                </p>
              )}

              {/* Team Badge */}
              <div className="mb-8">
                <span
                  className={`inline-block px-4 py-2 rounded font-bold text-lg uppercase ${
                    player.team === 'STRONG'
                      ? 'bg-accent-blue text-white'
                      : player.team === 'SMART'
                      ? 'bg-accent-pink text-white'
                      : 'bg-accent-gray text-white'
                  }`}
                >
                  {player.team}
                </span>
              </div>

              {/* Vote Count */}
              <div className="flex items-center gap-6 text-gray-300 mb-8">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faThumbsUp} className="text-2xl" />
                  <span className="text-2xl font-semibold">{voteCount}</span>
                </div>
              </div>

              {/* Bio */}
              {player.bio && (
                <div className="mb-6">
                  <p className="text-gray-300 leading-relaxed">{player.bio}</p>
                </div>
              )}

              {/* Extra Link */}
              {player.extraFields?.linkLabel && player.extraFields?.linkUrl && (
                <div className="mb-6">
                  <a
                    href={
                      player.extraFields.linkUrl.startsWith('http')
                        ? player.extraFields.linkUrl
                        : `https://${player.extraFields.linkUrl}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`hover:underline text-lg ${
                      player.team === 'STRONG'
                        ? 'text-accent-blue'
                        : player.team === 'SMART'
                        ? 'text-accent-pink'
                        : 'text-accent-gray'
                    }`}
                  >
                    {player.extraFields.linkUrl}
                  </a>
                </div>
              )}

              {/* Vote Buttons */}
              {!player.eliminated && (
                <div className="mt-auto pt-8">
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => handleVote('UPVOTE')}
                      disabled={voting}
                      className="disabled:opacity-50 disabled:cursor-not-allowed uppercase border transition-colors px-6 py-3 font-semibold"
                      style={{
                        background: 'rgba(255, 255, 255, 0.14)',
                        borderColor: 'rgba(255, 255, 255, 0.24)',
                        borderRadius: '7px',
                        color: 'white',
                      }}
                      onMouseEnter={(e) => {
                        if (!voting) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.24)';
                      }}
                    >
                      {voting ? 'VOTING...' : 'UPVOTE'}
                    </button>
                  </div>
                  {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
                  {success && (
                    <p className="mt-2 text-green-400 text-sm">{successMessage || 'Vote recorded!'}</p>
                  )}
                </div>
              )}

              {player.eliminated && (
                <div className="mt-auto pt-8">
                  <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <p className="text-gray-400">
                      This player has been eliminated and can no longer receive votes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



