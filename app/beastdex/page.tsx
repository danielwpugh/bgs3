'use client';

import { apiFetch, assetUrl } from '@/lib/public-client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Player } from '@prisma/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretLeft, faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import { PlayerImage } from '@/components/PlayerImage';
import { CountryBadge } from '@/components/CountryBadge';

interface PlayerWithVotes extends Player {
  _count: { votes: number };
  upvoteCount: number;
  downvoteCount: number;
}

export default function BeastdexPage() {
  const [players, setPlayers] = useState<PlayerWithVotes[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerWithVotes[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [eliminatedFilter, setEliminatedFilter] = useState<'ALL' | 'ACTIVE' | 'ELIMINATED'>('ALL');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'playerNumber'>('name-asc');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    filterAndSortPlayers();
  }, [players, searchQuery, eliminatedFilter, sortBy]);

  async function fetchPlayers() {
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/players');
      if (!res.ok) {
        throw new Error(`Failed to fetch players: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      if (data.players && Array.isArray(data.players)) {
        setPlayers(data.players);
      } else {
        console.warn('Unexpected data format:', data);
        setPlayers([]);
      }
    } catch (error) {
      setError('Unable to load players. Please try again.');
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }

  function isEliminated(p: Partial<PlayerWithVotes> | null | undefined): boolean {
    // Defensive coercion: if eliminated is ever serialized oddly (string/number),
    // keep behavior stable for the UI and filters.
    const v: any = p?.eliminated;
    if (v === true) return true;
    if (v === false || v === null || v === undefined) return false;
    if (typeof v === 'string') {
      const s = v.toLowerCase().trim();
      if (s === 'true' || s === 't' || s === '1') return true;
      if (s === 'false' || s === 'f' || s === '0') return false;
      return false;
    }
    if (typeof v === 'number') return v === 1;
    return Boolean(v);
  }

  function filterAndSortPlayers() {
    let filtered = [...players];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.trim().toLowerCase();
      const digitQuery = q.replace(/[^\d]/g, ''); // supports "#10", "010", etc.
      const digitQueryValue = digitQuery ? Number.parseInt(digitQuery, 10) : null;

      filtered = filtered.filter((p) => {
        const nameMatch = (p.name ?? '').toLowerCase().includes(q);

        // If the user typed any digits, also match on playerNumber.
        if (!digitQuery) return nameMatch;

        const pn = p.playerNumber;
        if (pn === null || pn === undefined) return nameMatch;

        // Exact numeric match (so searching "1" finds player 1, without matching 10/11/etc).
        const exactNumberMatch =
          digitQueryValue !== null && Number.isFinite(digitQueryValue) && pn === digitQueryValue;

        // Also allow padded/partial matching for multi-digit queries (e.g. "01" or "001").
        const pnStr = String(pn);
        const pnPadded3 = pnStr.padStart(3, '0');
        const partialNumberMatch = digitQuery.length >= 2 && pnPadded3.includes(digitQuery);

        return nameMatch || exactNumberMatch || partialNumberMatch;
      });
    }

    // Eliminated filter
    if (eliminatedFilter === 'ACTIVE') {
      filtered = filtered.filter((p) => !isEliminated(p));
    } else if (eliminatedFilter === 'ELIMINATED') {
      filtered = filtered.filter((p) => isEliminated(p));
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name ?? '').localeCompare(b.name ?? '');
      if (sortBy === 'name-desc') return (b.name ?? '').localeCompare(a.name ?? '');

      if (sortBy === 'playerNumber') {
        // Sort by player number, with null values at the end
        if (a.playerNumber === null && b.playerNumber === null) return 0;
        if (a.playerNumber === null) return 1;
        if (b.playerNumber === null) return -1;
        return (a.playerNumber || 0) - (b.playerNumber || 0);
      }
      return 0;
    });

    setFilteredPlayers(filtered);
  }

  if (loading) {
    return (
      <div className="min-h-screen text-fg-main flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg-main">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-white hover:underline mb-4 inline-block flex items-center">
            <FontAwesomeIcon icon={faCaretLeft} className="mr-1" /> Back to Home
          </Link>
          <h1 className="text-5xl font-black mb-8 uppercase">Beastdex</h1>
        </div>

        {error && <p role="alert">{error} <button onClick={fetchPlayers}>Retry</button></p>}
        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-y-4">
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
            />


            <select
              value={eliminatedFilter}
              onChange={(e) => setEliminatedFilter(e.target.value as 'ALL' | 'ACTIVE' | 'ELIMINATED')}
              className="select-white-arrow pl-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
            >
              <option value="ALL">All Players</option>
              <option value="ACTIVE">Active Only</option>
              <option value="ELIMINATED">Eliminated Only</option>
            </select>

            <div className="inline-flex items-center gap-2">
              <label
                htmlFor="sortBy"
                className="text-xs uppercase tracking-[0.15em] font-black text-gray-300"
              >
                Sort By
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="select-white-arrow pl-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="playerNumber">Player Number</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-6 text-gray-400">
          Showing {filteredPlayers.length} of {players.length} players
        </div>

        {/* Player Grid */}
        <div className="grid grid-cols-3 min-[420px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3 xl:gap-6">
          {filteredPlayers.map((player) => (
            <Link
              key={player.id}
              href={`/players/${player.slug}`}
              className="card-hover card-hover-blue rounded-lg overflow-hidden border-2 border-accent-blue xl:border-transparent xl:hover:border-accent-blue bg-black/20"
            >
              <div className="relative w-full aspect-[4/5] bg-black/20">
                <PlayerImage
                  src={player.imageUrl}
                  alt={player.name}
                  className={`w-full h-full object-contain ${isEliminated(player) ? 'eliminated-image' : ''}`}
                  placeholder={
                    <div className="w-full h-full flex items-center justify-center">
                      <span className={`text-4xl ${isEliminated(player) ? 'eliminated-image' : ''}`}>👤</span>
                    </div>
                  }
                  context={{
                    surface: 'beastdex-grid',
                    playerId: player.id,
                    slug: player.slug,
                    name: player.name,
                    team: player.team,
                  }}
                />
                {isEliminated(player) && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <img
                      src={assetUrl("/images/x-overlay.webp")}
                      alt="Eliminated"
                      className="w-[80%] h-[80%] object-contain"
                    />
                  </div>
                )}
              </div>
              {/* Hide metadata on smaller breakpoints to keep tiles compact */}
              <div className="hidden xl:block px-4 py-2">
                <h3 className="text-xl font-black mb-0 uppercase">{player.name}</h3>
                {player.title && (
                  <p className="text-sm text-gray-400 mb-2 font-black uppercase">{player.title}</p>
                )}
                <div className="flex items-center justify-between mb-2">
                  <CountryBadge extraFields={player.extraFields} />
                  <span className="text-sm text-gray-400">
                    <span className="inline-flex items-center gap-3 tabular-nums">
                      <span className="inline-flex items-center gap-1" aria-label={`${player.upvoteCount} upvotes`}>
                        <FontAwesomeIcon icon={faThumbsUp} className="text-current" />
                        <span>{player.upvoteCount}</span>
                      </span>
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredPlayers.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            {players.length === 0 
              ? 'No players found. Please check if players exist in the database.'
              : 'No players found matching your filters.'}
          </div>
        )}
      </div>
    </div>
  );
}

