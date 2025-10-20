import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Trophy, Target, Users, DollarSign, Eye, ImageIcon } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Player {
  id: string;
  userId: string;
  username: string;
  email: string;
  teamName?: string;
  registrationId: string;
  kills: number;
  position: number;
  screenshot?: string;
  resultSubmitted: boolean;
  killReward: number;
  placementReward: number;
  totalReward: number;
  rewardDistributed: boolean;
}

interface TournamentResultsProps {
  tournamentId: string;
  onClose: () => void;
}

const TournamentResults: React.FC<TournamentResultsProps> = ({ tournamentId, onClose }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();

  // Tournament reward settings
  const killReward = 10; // ₹10 per kill
  const firstPlacePrize = 1000; // ₹1000 for 1st place
  const secondPlacePrize = 500; // ₹500 for 2nd place

  useEffect(() => {
    fetchTournamentResults();
  }, [tournamentId]);

  const fetchTournamentResults = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('GET', `/tournaments/${tournamentId}/results-management`);
      const data = await response.json();
      
      if (data.success) {
        setTournament(data.tournament);
        // Calculate rewards for each player
        const playersWithRewards = data.players.map((player: Player) => ({
          ...player,
          killReward: player.kills * killReward,
          placementReward: player.position === 1 ? firstPlacePrize : player.position === 2 ? secondPlacePrize : 0,
          totalReward: (player.kills * killReward) + (player.position === 1 ? firstPlacePrize : player.position === 2 ? secondPlacePrize : 0)
        }));
        setPlayers(playersWithRewards);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch tournament results",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tournament results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePlayerData = (playerId: string, field: 'kills' | 'position', value: number) => {
    setPlayers(prev => prev.map(player => {
      if (player.id === playerId) {
        const updatedPlayer = { ...player, [field]: value };
        // Recalculate rewards
        updatedPlayer.killReward = updatedPlayer.kills * killReward;
        updatedPlayer.placementReward = updatedPlayer.position === 1 ? firstPlacePrize : updatedPlayer.position === 2 ? secondPlacePrize : 0;
        updatedPlayer.totalReward = updatedPlayer.killReward + updatedPlayer.placementReward;
        return updatedPlayer;
      }
      return player;
    }));
  };

  const distributeRewards = async () => {
    try {
      setDistributing(true);
      
      const response = await apiRequest('POST', `/tournaments/${tournamentId}/distribute-rewards`, {
        players: players.map(player => ({
          userId: player.userId,
          registrationId: player.registrationId,
          kills: player.kills,
          position: player.position,
          killReward: player.killReward,
          placementReward: player.placementReward,
          totalReward: player.totalReward
        }))
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Rewards distributed successfully! Total: ₹${data.totalDistributed}`,
        });
        
        // Mark all players as reward distributed
        setPlayers(prev => prev.map(player => ({ ...player, rewardDistributed: true })));
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to distribute rewards",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error distributing rewards:', error);
      toast({
        title: "Error",
        description: "Failed to distribute rewards",
        variant: "destructive",
      });
    } finally {
      setDistributing(false);
    }
  };

  const totalRewards = players.reduce((sum, player) => sum + player.totalReward, 0);
  const playersWithResults = players.filter(p => p.resultSubmitted);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading tournament results...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tournament Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {tournament?.title || 'Tournament Results'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Total Registered</p>
              <p className="text-2xl font-bold text-blue-700">{players.length}</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <Target className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Results Submitted</p>
              <p className="text-2xl font-bold text-green-700">{playersWithResults.length}</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <Users className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No Results</p>
              <p className="text-2xl font-bold text-red-700">{players.length - playersWithResults.length}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Total Rewards</p>
              <p className="text-2xl font-bold text-purple-700">₹{totalRewards}</p>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
              <Trophy className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Tournament Status</p>
              <Badge className="mt-2">{tournament?.status || 'Unknown'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Player Results & Reward Distribution</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Showing all registered players. Players without submitted results are highlighted and can have their data manually entered.
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Kills</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Screenshot</TableHead>
                  <TableHead>Kill Reward</TableHead>
                  <TableHead>Place Reward</TableHead>
                  <TableHead>Total Reward</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => (
                  <TableRow key={player.id} className={!player.resultSubmitted ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{player.username}</p>
                          <p className="text-sm text-muted-foreground">{player.email}</p>
                        </div>
                        {!player.resultSubmitted && (
                          <Badge variant="outline" className="text-xs">
                            No Result
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{player.teamName || 'Solo'}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={player.kills}
                        onChange={(e) => updatePlayerData(player.id, 'kills', parseInt(e.target.value) || 0)}
                        className="w-20"
                        min="0"
                        placeholder={!player.resultSubmitted ? "0" : ""}
                        disabled={!player.resultSubmitted && player.kills === 0}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={player.position || ''}
                        placeholder={!player.resultSubmitted ? "No position" : "Position"}
                        onChange={(e) => updatePlayerData(player.id, 'position', parseInt(e.target.value) || 0)}
                        className="w-20"
                        min="1"
                        disabled={!player.resultSubmitted && !player.position}
                      />
                    </TableCell>
                    <TableCell>
                      {player.screenshot ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedImage(player.screenshot!)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {!player.resultSubmitted ? 'Not submitted' : 'No screenshot'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>₹{player.killReward}</TableCell>
                    <TableCell>₹{player.placementReward}</TableCell>
                    <TableCell className="font-bold">₹{player.totalReward}</TableCell>
                    <TableCell>
                      {player.rewardDistributed ? (
                        <Badge variant="secondary">Distributed</Badge>
                      ) : player.resultSubmitted ? (
                        <Badge>Ready</Badge>
                      ) : (
                        <Badge variant="outline">No Result</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <Separator className="my-4" />

          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Reward Structure: 1st Place: ₹{firstPlacePrize} | 2nd Place: ₹{secondPlacePrize} | Per Kill: ₹{killReward}
              </p>
              <p className="font-medium">Total Rewards to Distribute: ₹{totalRewards}</p>
            </div>
            <Button
              onClick={distributeRewards}
              disabled={distributing || players.every(p => p.rewardDistributed)}
              className="bg-green-600 hover:bg-green-700"
            >
              {distributing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Distribute All Rewards
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Screenshot Viewer Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Match Screenshot</DialogTitle>
            <DialogDescription>
              Player submitted match result screenshot
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="flex justify-center">
              <img 
                src={selectedImage} 
                alt="Match screenshot" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedImage(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentResults;