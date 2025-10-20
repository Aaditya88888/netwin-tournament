import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tournament } from "@shared/types";
import { TournamentManagementService } from '@/lib/services/tournament-management.service';
import { apiRequest } from '@/lib/queryClient';


interface PlayerInput {
  id: string;
  registrationId: string; // Add this field for PATCH
  name: string;
  gameId: string;
  position: number | '';
  kills: number | '';
  reward?: number;
  transactions?: any[]; // Add transactions field
}

interface Props {
  tournament: Tournament;
  onSave: (players: PlayerInput[]) => void;
  onDistribute: (players: PlayerInput[]) => void;
}

const AdminPrizeDistributionSection: React.FC<Props> = ({ tournament, onSave, onDistribute }) => {
  // Fetch players using the same logic as Management section
  const { data: statusInfo, isLoading, refetch } = useQuery({
    queryKey: ["tournament-status", String(tournament.id)],
    queryFn: () => TournamentManagementService.getTournamentStatus(String(tournament.id)),
    enabled: !!tournament.id,
  });

  // Fetch registration docs for this tournament (for registrationId)
  const { data: registrations, isLoading: isLoadingRegistrations } = useQuery({
    queryKey: ["tournament-registrations", String(tournament.id)],
    queryFn: async () => {
      const res = await apiRequest('GET', `/tournaments/${tournament.id}/registrations`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tournament.id,
  });

  // Save mutation for updating Firestore
  const saveMutation = useMutation({
    mutationFn: async (players: PlayerInput[]) => {
      // PATCH each registration with new kills, position, reward using apiRequest with auth
      const results = await Promise.all(players.map(async player => {
        try {
          console.log('PATCH /api/registration/' + player.registrationId, {
            kills: player.kills,
            position: player.position,
            totalPrizeEarned: player.reward ?? 0
          });
          
          const res = await apiRequest('PATCH', `/registration/${player.registrationId}`, {
            kills: player.kills,
            position: player.position,
            totalPrizeEarned: player.reward ?? 0
          });
          
          const data = await res.json();
          console.log('PATCH response', player.registrationId, data);
          if (!res.ok) throw new Error(data.message || 'Failed to update');
          return data;
        } catch (err) {
          console.error('PATCH error', player.registrationId, err);
          throw err;
        }
      }));
      return results;
    },
    onSuccess: () => refetch(),
    onError: (error) => {
      console.error('Save mutation error:', error);
      alert('Failed to save prize distribution. See console for details.');
    },
  });

  // Map statusInfo.players to player inputs, using existing values if present
  const [players, setPlayers] = useState<PlayerInput[]>([]);
  React.useEffect(() => {
    if (statusInfo && Array.isArray(statusInfo.players)) {
      // Debug: log both sources
      console.log('PrizeDistribution DEBUG statusInfo.players:', statusInfo.players);
      console.log('PrizeDistribution DEBUG registrations:', registrations);
      setPlayers(
        statusInfo.players.map((player: any, idx: number) => {
          // The statusInfo.players already contains registrationId from the backend
          let registrationId = player.registrationId?.toString() || '';
          
          // If registrationId is not available in statusInfo, try to find it from registrations
          if (!registrationId && Array.isArray(registrations)) {
            const reg = registrations.find((r: any) =>
              (r.userId?.toString() === player.userId?.toString() && r.tournamentId === tournament.id)
            );
            if (reg) {
              registrationId = reg.registrationId?.toString() || reg.id?.toString() || '';
            }
          }
          
          return {
            registrationId,
            id: registrationId || player.userId?.toString() || player.teamName || `player-${idx}`,
            name: player.teamName || player.userName || player.name || `Player ${player.userId}`,
            gameId: player.gameId || '',
            position: typeof player.position === 'number' ? player.position : '',
            kills: typeof player.kills === 'number' ? player.kills : '',
            reward: typeof player.totalPrizeEarned === 'number' ? player.totalPrizeEarned : 0,
          };
        })
      );
    }
  }, [statusInfo, registrations, tournament.id]);

  const [calculated, setCalculated] = useState(false);
  const [search, setSearch] = useState('');

  const handleInput = (idx: number, field: 'position' | 'kills', value: string) => {
    setPlayers(players => players.map((p, i) =>
      i === idx ? { ...p, [field]: value === '' ? '' : Math.max(0, Number(value)) } : p
    ));
    setCalculated(false);
  };

  const calculateRewards = () => {
    const firstPlacePlayers = players.filter(p => p.position === 1);
    const perFirstPrize = firstPlacePlayers.length > 0 ? (tournament.prizePool || 0) * 0.4 / firstPlacePlayers.length : 0;
    const perKillReward = tournament.killReward || 0;
    setPlayers(players => players.map(p => ({
      ...p,
      reward:
        (p.position === 1 ? perFirstPrize : 0) +
        (typeof p.kills === 'number' && p.kills > 0 ? p.kills * perKillReward : 0),
    })));
    setCalculated(true);
  };

  const handleSave = () => {
    // Warn if any player is missing registrationId
    const missing = players.filter(p => !p.registrationId);
    if (missing.length > 0) {
      alert('Some players are missing registration IDs and cannot be saved.');
      return;
    }
    saveMutation.mutate(players);
    onSave(players);
  };

  const handleDistribute = () => {
    // Optionally, you can call a backend endpoint to trigger prize distribution
    onDistribute(players);
  };

  // Filter players by search (by name or gameId)
  const filteredPlayers = players.filter(player => {
    const searchLower = search.toLowerCase();
    return (
      player.name.toLowerCase().includes(searchLower) ||
      player.gameId.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) return <div>Loading players...</div>;
  if (!Array.isArray(statusInfo?.players) || statusInfo.players.length === 0) return <div>No players joined.</div>;

  return (
    <div>
      <div className="flex items-center mb-2 gap-2">
        <input
          type="text"
          placeholder="Search by player name or game ID..."
          className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs sm:text-sm">
          <thead>
            <tr className="bg-primary/10">
              <th className="p-2">Player</th>
              <th className="p-2">Game ID</th>
              <th className="p-2">Position</th>
              <th className="p-2">Kills</th>
              <th className="p-2">Reward</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player, idx) => (
              <tr key={player.id} className="border-b border-gray-700">
                <td className="p-2">{player.name}</td>
                <td className="p-2 font-mono text-xs">{player.gameId}</td>
                <td className="p-2">
                  <input
                    type="number"
                    min={1}
                    className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1"
                    value={player.position}
                    onChange={e => handleInput(idx, 'position', e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min={0}
                    className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1"
                    value={player.kills}
                    onChange={e => handleInput(idx, 'kills', e.target.value)}
                  />
                </td>
                <td className="p-2 font-semibold">
                  {calculated ? `₹${player.reward?.toFixed(2)}` : (player.reward ? `₹${player.reward?.toFixed(2)}` : '-')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-2 justify-end">
        <Button onClick={calculateRewards} variant="default">
          Calculate Rewards
        </Button>
        <Button onClick={handleSave} variant="secondary" disabled={saveMutation.status === 'pending'}>
          {saveMutation.status === 'pending' ? 'Saving...' : 'Save'}
        </Button>
        <Button onClick={handleDistribute} variant="destructive">
          Distribute Prizes
        </Button>
      </div>
    </div>
  );
};

export default AdminPrizeDistributionSection;
