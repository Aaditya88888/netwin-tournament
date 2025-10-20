import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Play, Square, RefreshCw, Clock, Users, AlertTriangle, CheckCircle, Send, GamepadIcon, Crown } from 'lucide-react';
import { formatDate } from '@/lib/utils/date-utils';

import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  TournamentManagementService, 
  type TournamentStatusInfo 
} from '@/lib/services/tournament-management.service';

interface TournamentManagementProps {
  tournamentId: string;
  onStatusChange?: () => void;
}

export function TournamentManagement({ tournamentId, onStatusChange }: TournamentManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch tournament status
  const { 
    data: statusInfo, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['tournament-status', tournamentId],
    queryFn: () => TournamentManagementService.getTournamentStatus(tournamentId),
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!tournamentId
  });

  // Start tournament mutation
  const startTournamentMutation = useMutation({
    mutationFn: () => TournamentManagementService.startTournament(tournamentId),
    onSuccess: (data) => {
      toast({
        title: "Tournament Started",
        description: data.message,
      });
      refetch();
      onStatusChange?.();
      queryClient.invalidateQueries({ queryKey: ['/tournaments'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete tournament mutation
  const completeTournamentMutation = useMutation({
    mutationFn: () => TournamentManagementService.completeTournament(tournamentId),
    onSuccess: (data) => {
      toast({
        title: "Tournament Completed",
        description: data.message,
      });
      refetch();
      onStatusChange?.();
      queryClient.invalidateQueries({ queryKey: ['/tournaments'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check statuses mutation
  const checkStatusesMutation = useMutation({
    mutationFn: () => TournamentManagementService.checkTournamentStatuses(),
    onSuccess: (data) => {
      toast({
        title: "Status Check Complete",
        description: data.message,
      });
      refetch();
      onStatusChange?.();
      queryClient.invalidateQueries({ queryKey: ['/tournaments'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading Tournament Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Error Loading Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {error.message}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!statusInfo) {
    return null;
  }

  const recommendations = TournamentManagementService.getSchedulingRecommendations(statusInfo);
  const canStart = TournamentManagementService.canStartTournament(statusInfo);
  const canComplete = TournamentManagementService.canCompleteTournament(statusInfo);

  return (
    <div className="space-y-6">
      {/* Tournament Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Tournament Management
            <Badge variant={TournamentManagementService.getStatusBadgeColor(statusInfo.tournament.status)}>
              {statusInfo.tournament.status.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage tournament lifecycle and send notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {statusInfo.tournament.status}
              </div>
              <div className="text-sm text-muted-foreground">Current Status</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {statusInfo.registrations}
              </div>
              <div className="text-sm text-muted-foreground">Registered Teams</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {statusInfo.scheduling.timeUntilStart > 0 
                  ? TournamentManagementService.formatTimeUntilStart(statusInfo.scheduling.timeUntilStart)
                  : 'Started'
                }
              </div>
              <div className="text-sm text-muted-foreground">Time to Start</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {statusInfo.tournament.hasRoomCredentials ? '✓' : '✗'}
              </div>
              <div className="text-sm text-muted-foreground">Room Ready</div>
            </div>
          </div>

          {/* Schedule Information */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Scheduled Start:</span>
                <br />
                {formatDate(statusInfo.tournament.startTime, { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div>
                <span className="font-medium">Current Time:</span>
                <br />
                {formatDate(statusInfo.scheduling.currentTime, { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Recommendations:</div>
              <ul className="list-disc list-inside space-y-1">
                {recommendations.map((rec, index) => (
                  <li key={index} className="text-sm">{rec}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Actions</CardTitle>
          <CardDescription>
            Manually control tournament status and notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {/* Start Tournament */}
            <Button
              onClick={() => startTournamentMutation.mutate()}
              disabled={!canStart || startTournamentMutation.isPending}
              className="flex items-center"
            >
              {startTournamentMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Tournament
            </Button>

            {/* Complete Tournament */}
            <Button
              variant="outline"
              onClick={() => completeTournamentMutation.mutate()}
              disabled={!canComplete || completeTournamentMutation.isPending}
              className="flex items-center"
            >
              {completeTournamentMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              Complete Tournament
            </Button>

            {/* Check All Statuses */}
            <Button
              variant="secondary"
              onClick={() => checkStatusesMutation.mutate()}
              disabled={checkStatusesMutation.isPending}
              className="flex items-center"
            >
              {checkStatusesMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Check All Statuses
            </Button>

            {/* Refresh Status */}
            <Button
              variant="ghost"
              onClick={() => refetch()}
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Status Help */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• <strong>Start Tournament:</strong> Manually start the tournament and send room credentials</p>
            <p>• <strong>Complete Tournament:</strong> Mark tournament as finished and notify participants</p>
            <p>• <strong>Check All Statuses:</strong> Run the automatic status checker for all tournaments</p>
          </div>
        </CardContent>
      </Card>

      {/* Players/Teams List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Registered Players/Teams ({statusInfo.registrations})
          </CardTitle>
          <CardDescription>
            View all registered participants with their game IDs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusInfo.players && statusInfo.players.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player/Team</TableHead>
                  <TableHead>Game ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusInfo.players.map((player: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{player.userName || <span className='italic text-gray-400'>No name</span>}</span>
                        <span className="text-sm text-muted-foreground">{player.teamName || <span className='italic text-gray-400'>No team</span>}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <GamepadIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="font-mono">{player.gameId || <span className='italic text-gray-400'>Not provided</span>}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {player.isTeamLeader && (
                          <Crown className="h-4 w-4 mr-1 text-yellow-500" />
                        )}
                        <span>{player.isTeamLeader ? 'Team Leader' : 'Team Member'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={player.paymentStatus === 'completed' ? 'default' : 'secondary'}
                      >
                        {player.paymentStatus || <span className='italic text-gray-400'>Unknown</span>}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mr-2" />
              No players registered yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Panel */}
      <TournamentNotificationPanel tournamentId={tournamentId} />
    </div>
  );
}

// Notification Panel Component
function TournamentNotificationPanel({ tournamentId }: { tournamentId: string }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const { toast } = useToast();

  const sendNotificationMutation = useMutation({
    mutationFn: () => TournamentManagementService.sendTournamentNotification(
      tournamentId, 
      title, 
      message, 
      priority
    ),
    onSuccess: (data) => {
      toast({
        title: "Notification Sent",
        description: data.message,
      });
      setTitle('');
      setMessage('');
      setPriority('normal');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Send className="h-4 w-4 mr-2" />
          Send Tournament Notification
        </CardTitle>
        <CardDescription>
          Send custom notifications to all registered participants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            className="w-full mt-1 px-3 py-2 border border-input rounded-md text-gray-800 bg-white placeholder-gray-400"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Notification message"
            rows={4}
            className="w-full mt-1 px-3 py-2 border border-input rounded-md text-gray-800 bg-white placeholder-gray-400"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high')}
            className="w-full mt-1 px-3 py-2 border border-input rounded-md text-gray-800 bg-white"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>

        <Button
          onClick={() => sendNotificationMutation.mutate()}
          disabled={!title || !message || sendNotificationMutation.isPending}
          className="w-full"
        >
          {sendNotificationMutation.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Notification
        </Button>
      </CardContent>
    </Card>
  );
}
