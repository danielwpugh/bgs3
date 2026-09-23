'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import { COUNTRIES } from '@/lib/country';
import type { BeastTeam } from '@/lib/teamTheme';

interface Player {
  id: number;
  playerNumber?: number | null;
  slug: string;
  name: string;
  title: string | null;
  team: BeastTeam;
  bio: string | null;
  imageUrl: string | null;
  eliminated: boolean;
  groupNumber: number | null;
  voteCount: number;
  upvoteCount: number;
  downvoteCount?: number;
  extraFields?: Record<string, any> | null;
}

type SortField =
  | 'name'
  | 'team'
  | 'groupNumber'
  | 'upvoteCount'
  | 'voteCount'
  | 'eliminated';
type SortDirection = 'asc' | 'desc';

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [groupToSelect, setGroupToSelect] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    playerNumber: '' as string,
    title: '',
    team: 'STRONG' as BeastTeam,
    bio: '',
    imageUrl: '',
    eliminated: false,
    groupNumber: '' as string,
    country: '',
    linkLabel: '',
    linkUrl: '',
    extraFields: {} as Record<string, any>,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [votesToAdd, setVotesToAdd] = useState<string>('');
  const [addingVotes, setAddingVotes] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers(): Promise<Player[]> {
    try {
      const res = await fetch('/api/admin/players');
      const data = await res.json();
      const nextPlayers = (data.players || []) as Player[];
      setPlayers(nextPlayers);
      return nextPlayers;
    } catch (error) {
      console.error('Failed to fetch players:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(player: Player) {
    setEditingPlayer(player);
    setVotesToAdd('');
    const extraFields = player.extraFields || {};
    setFormData({
      name: player.name,
      slug: player.slug,
      playerNumber:
        player.playerNumber === null || player.playerNumber === undefined ? '' : String(player.playerNumber),
      title: player.title || '',
      team: player.team,
      bio: player.bio || '',
      imageUrl: player.imageUrl || '',
      eliminated: player.eliminated,
      groupNumber: player.groupNumber === null || player.groupNumber === undefined ? '' : String(player.groupNumber),
      country: typeof extraFields.country === 'string' ? extraFields.country : '',
      linkLabel: extraFields.linkLabel || '',
      linkUrl: extraFields.linkUrl || '',
      extraFields: { ...extraFields },
    });
    setShowForm(true);
  }

  function handleNew() {
    setEditingPlayer(null);
    setVotesToAdd('');
    setFormData({
      name: '',
      slug: '',
      playerNumber: '',
      title: '',
      team: 'STRONG',
      bio: '',
      imageUrl: '',
      eliminated: false,
      groupNumber: '',
      country: '',
      linkLabel: '',
      linkUrl: '',
      extraFields: {},
    });
    setShowForm(true);
  }

  async function handleAddVotes() {
    if (!editingPlayer) return;

    const trimmed = votesToAdd.trim();
    if (!trimmed) {
      alert('Enter a number of upvotes to add.');
      return;
    }
    const amount = parseInt(trimmed, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Upvotes to add must be a positive integer.');
      return;
    }
    if (amount > 5000) {
      alert('For safety, the max per action is 5000. Split into smaller chunks.');
      return;
    }

    setAddingVotes(true);
    try {
      const res = await fetch(`/api/admin/players/${editingPlayer.id}/add-votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, type: 'UPVOTE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add votes');

      setVotesToAdd('');
      const nextPlayers = await fetchPlayers();
      const updated = nextPlayers.find((p) => p.id === editingPlayer.id);
      if (updated) setEditingPlayer(updated);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add votes');
    } finally {
      setAddingVotes(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFormData((prev) => ({ ...prev, imageUrl: data.imageUrl }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Validate required fields
      if (!formData.name || !formData.name.trim()) {
        alert('Name is required');
        return;
      }
      if (!formData.team) {
        alert('Team is required');
        return;
      }

      console.log('Form data before submission:', JSON.stringify(formData, null, 2));

      // Double-check required fields
      const name = formData.name?.trim();
      const team = formData.team;
      
      if (!name) {
        alert('Name is required');
        return;
      }
      if (!team || (team !== 'STRONG' && team !== 'SMART' && team !== 'OG')) {
        alert('Team must be STRONG, SMART, or OG');
        return;
      }

      const url = editingPlayer
        ? `/api/admin/players/${editingPlayer.id}`
        : '/api/admin/players';
      const method = editingPlayer ? 'PUT' : 'POST';

      // Build payload with required fields first
      const payload: any = {
        name: name,
        team: team,
        eliminated: formData.eliminated ?? false,
      };

      // playerNumber: allow empty => null, otherwise positive int
      const trimmedPlayerNumber = formData.playerNumber?.trim();
      if (!trimmedPlayerNumber) {
        payload.playerNumber = null;
      } else {
        const parsedPlayerNumber = parseInt(trimmedPlayerNumber, 10);
        if (!Number.isFinite(parsedPlayerNumber) || parsedPlayerNumber <= 0) {
          alert('Player Number must be a positive integer (or blank to clear)');
          return;
        }
        payload.playerNumber = parsedPlayerNumber;
      }

      // groupNumber: allow empty => null, otherwise positive int
      const trimmedGroup = formData.groupNumber?.trim();
      if (!trimmedGroup) {
        payload.groupNumber = null;
      } else {
        const parsedGroup = parseInt(trimmedGroup, 10);
        if (!Number.isFinite(parsedGroup) || parsedGroup <= 0) {
          alert('Group Number must be a positive integer (or blank to clear)');
          return;
        }
        payload.groupNumber = parsedGroup;
      }
      
      // Only include slug if it has a value
      const trimmedSlug = formData.slug?.trim();
      if (trimmedSlug) {
        payload.slug = trimmedSlug;
      }
      
      // Send null for empty optional fields
      payload.title = formData.title?.trim() || null;
      payload.bio = formData.bio?.trim() || null;
      payload.imageUrl = formData.imageUrl?.trim() || null;
      
      // Preserve arbitrary extra fields while editing country and links.
      const extraFields: Record<string, any> = { ...formData.extraFields, country: formData.country.trim() };
      if (formData.linkLabel?.trim() || formData.linkUrl?.trim()) {
        extraFields.linkLabel = formData.linkLabel?.trim() || '';
        extraFields.linkUrl = formData.linkUrl?.trim() || '';
      }
      
      // Only include extraFields if it has values
      if (Object.keys(extraFields).length > 0) {
        payload.extraFields = extraFields;
      }

      // Final validation before sending
      if (!payload.name || !payload.team) {
        console.error('Payload missing required fields:', payload);
        alert('Error: Missing required fields. Please check the form.');
        return;
      }

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save player');

      setShowForm(false);
      fetchPlayers();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save player');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this player? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/players/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete player');

      fetchPlayers();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete player');
    }
  }

  function handleSelectPlayer(id: number) {
    setSelectedPlayerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function handleSelectAll() {
    if (selectedPlayerIds.size === players.length) {
      setSelectedPlayerIds(new Set());
    } else {
      setSelectedPlayerIds(new Set(players.map((p) => p.id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedPlayerIds.size === 0) {
      alert('Please select at least one player');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedPlayerIds.size} player(s)? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/players/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerIds: Array.from(selectedPlayerIds),
          action: 'delete',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete players');
      }

      setSelectedPlayerIds(new Set());
      fetchPlayers();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete players');
    }
  }

  async function handleBulkSetEliminated(eliminated: boolean) {
    if (selectedPlayerIds.size === 0) {
      alert('Please select at least one player');
      return;
    }

    const action = eliminated ? 'set as eliminated' : 'set as not eliminated';
    if (!confirm(`Are you sure you want to ${action} for ${selectedPlayerIds.size} player(s)?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/players/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerIds: Array.from(selectedPlayerIds),
          action: 'setEliminated',
          eliminated,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update players');

      setSelectedPlayerIds(new Set());
      fetchPlayers();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update players');
    }
  }

  async function handleToggleEliminated(player: Player) {
    const id = player.id;
    // Optimistic UI
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, eliminated: !p.eliminated } : p))
    );

    try {
      const res = await fetch(`/api/admin/players/${id}/toggle-eliminated`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle eliminated');

      // Replace with canonical server response (in case anything else changes)
      if (data?.player?.id === id) {
        setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...data.player } : p)));
      }
    } catch (error) {
      // Revert on failure
      setPlayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, eliminated: player.eliminated } : p))
      );
      alert(error instanceof Error ? error.message : 'Failed to toggle eliminated');
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function handleSelectGroup(groupNumber: number) {
    const ids = players.filter((p) => p.groupNumber === groupNumber).map((p) => p.id);
    if (ids.length === 0) {
      alert(`No players found in group ${groupNumber}`);
      return;
    }
    setSelectedPlayerIds(new Set(ids));
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPlayers = players.filter((p) => {
    // Text query
    if (!normalizedQuery) return true;
    const haystack = [
      p.name,
      p.slug,
      p.title ?? '',
      p.team,
      p.bio ?? '',
      typeof p.playerNumber === 'number' ? String(p.playerNumber) : '',
      typeof p.groupNumber === 'number' ? String(p.groupNumber) : '',
      String(p.id),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'team':
        aValue = a.team;
        bValue = b.team;
        break;
      case 'groupNumber':
        // sort nulls last in asc, first in desc
        aValue = a.groupNumber === null ? Number.POSITIVE_INFINITY : a.groupNumber;
        bValue = b.groupNumber === null ? Number.POSITIVE_INFINITY : b.groupNumber;
        break;
      case 'upvoteCount':
        aValue = a.upvoteCount;
        bValue = b.upvoteCount;
        break;
      case 'voteCount':
        aValue = a.voteCount;
        bValue = b.voteCount;
        break;
      case 'eliminated':
        aValue = a.eliminated ? 1 : 0;
        bValue = b.eliminated ? 1 : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const uniqueGroupNumbers = Array.from(
    new Set(players.map((p) => p.groupNumber).filter((g): g is number => typeof g === 'number'))
  ).sort((a, b) => a - b);

  const allVisibleSelected =
    sortedPlayers.length > 0 && sortedPlayers.every((p) => selectedPlayerIds.has(p.id));

  function handleSelectAllVisible() {
    if (sortedPlayers.length === 0) return;

    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        // Deselect only visible rows
        sortedPlayers.forEach((p) => next.delete(p.id));
      } else {
        // Select all visible rows
        sortedPlayers.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Manage Players</h1>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-3 py-2">
              <span className="text-sm text-gray-300 whitespace-nowrap">Search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name"
                className="w-48 px-2 py-1 rounded bg-gray-900 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
              />
              <button
                onClick={() => {
                  setSearchQuery('');
                }}
                className="px-3 py-1 rounded bg-gray-700 text-white hover:opacity-80"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-3 py-2">
              <span className="text-sm text-gray-300 whitespace-nowrap">Group</span>
              <select
                value={groupToSelect}
                onChange={(e) => setGroupToSelect(e.target.value)}
                className="px-2 py-1 rounded bg-gray-900 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
              >
                <option value="">--</option>
                {uniqueGroupNumbers.map((g) => (
                  <option key={g} value={String(g)}>
                    {g}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const trimmed = groupToSelect.trim();
                  if (!trimmed) return;
                  const parsed = parseInt(trimmed, 10);
                  if (!Number.isFinite(parsed) || parsed <= 0) return;
                  handleSelectGroup(parsed);
                }}
                className="px-3 py-1 rounded bg-accent-blue text-bg-main hover:opacity-80"
                title="Select all players in this group"
              >
                Select
              </button>
              <button
                onClick={() => {
                  setGroupToSelect('');
                  setSelectedPlayerIds(new Set());
                }}
                className="px-3 py-1 rounded bg-gray-700 text-white hover:opacity-80"
                title="Clear group selection and selected players"
              >
                Clear
              </button>
            </div>

            {selectedPlayerIds.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkSetEliminated(true)}
                  className="px-4 py-2 rounded bg-yellow-600 text-white hover:opacity-80"
                >
                  Set Eliminated ({selectedPlayerIds.size})
                </button>
                <button
                  onClick={() => handleBulkSetEliminated(false)}
                  className="px-4 py-2 rounded bg-green-600 text-white hover:opacity-80"
                >
                  Set Not Eliminated ({selectedPlayerIds.size})
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:opacity-80"
                >
                  Delete ({selectedPlayerIds.size})
                </button>
              </div>
            )}
            <button onClick={handleNew} className="btn-primary">
              + New Player
            </button>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border-2 border-accent-blue rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">
                {editingPlayer ? 'Edit Player' : 'New Player'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="Auto-generated from name"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Player Number</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.playerNumber}
                    onChange={(e) => setFormData({ ...formData, playerNumber: e.target.value })}
                    placeholder="(optional)"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave blank to clear.</p>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="player-country" className="block mb-2 text-sm font-medium">Country</label>
                  <input
                    id="player-country"
                    list="country-options"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g. Australia or AU"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                  />
                  <datalist id="country-options">
                    {COUNTRIES.map(({ code, name }) => <option key={code} value={name} />)}
                  </datalist>
                  <p className="text-xs text-gray-400 mt-1">Country name or two-letter code. Leave blank to hide.</p>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Team *</label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value as BeastTeam })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                  >
                    <option value="STRONG">STRONG</option>
                    <option value="SMART">SMART</option>
                    <option value="OG">OG</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Group Number</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.groupNumber}
                    onChange={(e) => setFormData({ ...formData, groupNumber: e.target.value })}
                    placeholder="(optional)"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave blank to clear.</p>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Image</label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                    />
                    {uploadingImage && <span className="text-gray-400">Uploading...</span>}
                  </div>
                  {formData.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      <p className="text-sm text-gray-400 mt-1">{formData.imageUrl}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.eliminated}
                      onChange={(e) => setFormData({ ...formData, eliminated: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span>Eliminated</span>
                  </label>
                </div>
                {editingPlayer && (
                  <div className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <div className="text-sm text-gray-300">Votes</div>
                        <div className="text-xs text-gray-400">
                          Upvotes: <span className="text-white">{editingPlayer.upvoteCount}</span>
                          {' • '}
                          Total votes: <span className="text-white">{editingPlayer.voteCount}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                      <div className="flex-1">
                        <label className="block mb-2 text-sm font-medium">Add upvotes</label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={votesToAdd}
                          onChange={(e) => setVotesToAdd(e.target.value)}
                          placeholder="e.g., 10"
                          className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          This creates vote records and updates the player&apos;s upvote count.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddVotes}
                        disabled={addingVotes}
                        className="px-4 py-2 rounded bg-accent-blue text-bg-main hover:opacity-80 disabled:opacity-50"
                        title="Add upvotes to this player"
                      >
                        {addingVotes ? 'Adding...' : 'Add Upvotes'}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block mb-2 text-sm font-medium">Link Label</label>
                  <input
                    type="text"
                    value={formData.linkLabel}
                    onChange={(e) => setFormData({ ...formData, linkLabel: e.target.value })}
                    placeholder="e.g., Instagram"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Link URL</label>
                  <input
                    type="text"
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                    placeholder="e.g., instagram.com/mrbeast"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                  />
                </div>
                <div className="flex gap-4">
                  <button type="submit" className="btn-primary flex-1">
                    {editingPlayer ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-700">
                  <th className="text-left p-4 w-12">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleSelectAllVisible}
                      className="w-4 h-4"
                    />
                  </th>
                  <th 
                    className="text-left p-4 cursor-pointer hover:bg-gray-800 select-none"
                    onClick={() => handleSort('name')}
                  >
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left p-4 cursor-pointer hover:bg-gray-800 select-none"
                    onClick={() => handleSort('team')}
                  >
                    Team {sortField === 'team' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left p-4 cursor-pointer hover:bg-gray-800 select-none"
                    onClick={() => handleSort('groupNumber')}
                  >
                    Group {sortField === 'groupNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left p-4 cursor-pointer hover:bg-gray-800 select-none"
                    onClick={() => handleSort('upvoteCount')}
                  >
                    Upvotes {sortField === 'upvoteCount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left p-4 cursor-pointer hover:bg-gray-800 select-none"
                    onClick={() => handleSort('voteCount')}
                  >
                    Total Votes {sortField === 'voteCount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left p-4 cursor-pointer hover:bg-gray-800 select-none"
                    onClick={() => handleSort('eliminated')}
                  >
                    Eliminated {sortField === 'eliminated' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player) => (
                  <tr key={player.id} className="border-b border-gray-800">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedPlayerIds.has(player.id)}
                        onChange={() => handleSelectPlayer(player.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/players/${player.slug}`}
                        className="text-accent-blue hover:underline"
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          player.team === 'STRONG'
                            ? 'bg-accent-blue text-bg-main'
                            : player.team === 'SMART'
                            ? 'bg-accent-pink text-bg-main'
                            : 'bg-accent-gray text-bg-main'
                        }`}
                      >
                        {player.team}
                      </span>
                    </td>
                    <td className="p-4">{player.groupNumber ?? '-'}</td>
                    <td className="p-4">{player.upvoteCount}</td>
                    <td className="p-4">{player.voteCount}</td>
                    <td className="p-4">
                      <span className={player.eliminated ? 'text-red-400' : 'text-green-400'}>
                        {player.eliminated ? 'Eliminated' : 'Not Eliminated'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleEliminated(player)}
                          className={`px-3 py-1 rounded text-white hover:opacity-80 ${
                            player.eliminated ? 'bg-green-700' : 'bg-yellow-700'
                          }`}
                          title={player.eliminated ? 'Mark as not eliminated' : 'Mark as eliminated'}
                        >
                          {player.eliminated ? 'Restore' : 'Eliminate'}
                        </button>
                        <button
                          onClick={() => handleEdit(player)}
                          className="px-3 py-1 rounded bg-accent-blue text-bg-main hover:opacity-80"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(player.id)}
                          className="px-3 py-1 rounded bg-red-600 text-white hover:opacity-80"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedPlayers.length === 0 && (
                  <tr>
                    <td className="p-6 text-gray-400" colSpan={8}>
                      No players match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

