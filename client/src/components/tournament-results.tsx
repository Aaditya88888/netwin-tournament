import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Image, CheckCircle, X, Eye, Trophy, Target, Users, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TournamentRegistration {
  id: string;
  registrationId: string;
  userId: string;
  displayName: string;
  teamName: string;
  gameId: string;
  registeredAt: string;
  status: string;
  kills: number;
  position: number | null;
  points: number;
  totalPrizeEarned: number;
  resultImageUrl: string | null;
  resultSubmitted: boolean;
  resultSubmittedAt: string | null;
  resultVerified: boolean;
  resultVerifiedAt: string | null;
  verifiedBy?: string;
  verificationNotes?: string;
}

interface TournamentResultsProps {
  tournamentId: string;
}

export function TournamentResults({ tournamentId }: TournamentResultsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRegistration, setSelectedRegistration] = useState<TournamentRegistration | null>(null);
  const [verificationDialog, setVerificationDialog] = useState(false);
  const [imagePreviewDialog, setImagePreviewDialog] = useState(false);
  const [verificationData, setVerificationData] = useState({
    notes: '',
    kills: 0,
    position: null as number | null
  });

  // Fetch tournament registrations with results
  const { 
    data: registrations, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['tournament-registrations', tournamentId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/tournaments/${tournamentId}/registrations`);
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!tournamentId
  });

  // Verify result mutation
  const verifyResultMutation = useMutation({
    mutationFn: async ({ registrationId, data }: { registrationId: string; data: any }) => {
      const response = await apiRequest('PATCH', `/tournaments/${tournamentId}/registrations/${registrationId}/verify`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tournament result updated successfully",
      });
      refetch();
      setVerificationDialog(false);
      setSelectedRegistration(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update result",
        variant: "destructive",
      });
    },
  });

  const handleSaveResult = () => {
    if (!selectedRegistration) return;

    verifyResultMutation.mutate({
      registrationId: selectedRegistration.registrationId,
      data: {
        notes: verificationData.notes,
        kills: verificationData.kills,
        position: verificationData.position
      }
    });
  };

  const openVerificationDialog = (registration: TournamentRegistration) => {
    setSelectedRegistration(registration);
    setVerificationData({
      notes: registration.verificationNotes || '',
      kills: registration.kills || 0,
      position: registration.position
    });
    setVerificationDialog(true);
  };

  const openImagePreview = (registration: TournamentRegistration) => {
    setSelectedRegistration(registration);
    setImagePreviewDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading tournament results...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load tournament results</p>
            <Button onClick={() => refetch()} className="mt-2">Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const submittedResults = registrations?.filter((reg: TournamentRegistration) => reg.resultSubmitted) || [];
  const pendingResults = submittedResults.filter((reg: TournamentRegistration) => !reg.resultVerified);
  const verifiedResults = submittedResults.filter((reg: TournamentRegistration) => reg.resultVerified);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Registrations</p>
                <p className="text-lg font-semibold">{registrations?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Results Submitted</p>
                <p className="text-lg font-semibold">{submittedResults.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Pending Verification</p>
                <p className="text-lg font-semibold">{pendingResults.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Verified Results</p>
                <p className="text-lg font-semibold">{verifiedResults.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Results
          </CardTitle>
          <CardDescription>
            Review and verify submitted tournament results with screenshots
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submittedResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No results submitted yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Game ID</TableHead>
                  <TableHead>Kills</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Screenshot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submittedResults.map((registration: TournamentRegistration) => (
                  <TableRow key={registration.registrationId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{registration.displayName}</div>
                        <div className="text-sm text-gray-500">{registration.teamName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{registration.gameId}</Badge>
                    </TableCell>
                    <TableCell>{registration.kills || 0}</TableCell>
                    <TableCell>
                      {registration.position ? `#${registration.position}` : 'N/A'}
                    </TableCell>
                    <TableCell>{registration.points || 0}</TableCell>
                    <TableCell>
                      {registration.resultImageUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openImagePreview(registration)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      ) : (
                        <span className="text-gray-400">No image</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={registration.resultVerified ? "default" : "secondary"}
                      >
                        {registration.resultVerified ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {registration.resultSubmittedAt 
                        ? formatDate(registration.resultSubmittedAt)
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openVerificationDialog(registration)}
                      >
                        {registration.resultVerified ? 'Edit Result' : 'Review & Verify'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      <Dialog open={verificationDialog} onOpenChange={setVerificationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Tournament Result
            </DialogTitle>
            <DialogDescription>
              Edit the result data for {selectedRegistration?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Editable result data */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-blue-900">Tournament Result Data</h4>
                <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                  Editable until prizes are distributed
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="kills" className="text-blue-700">Kills</Label>
                  <Input
                    id="kills"
                    type="number"
                    min="0"
                    value={verificationData.kills}
                    onChange={(e) => setVerificationData(prev => ({
                      ...prev,
                      kills: parseInt(e.target.value) || 0
                    }))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="position" className="text-blue-700">Position</Label>
                  <Input
                    id="position"
                    type="number"
                    min="1"
                    placeholder="Final position"
                    value={verificationData.position || ''}
                    onChange={(e) => setVerificationData(prev => ({
                      ...prev,
                      position: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes about the result..."
                value={verificationData.notes}
                onChange={(e) => setVerificationData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerificationDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveResult}
              disabled={verifyResultMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {verifyResultMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewDialog} onOpenChange={setImagePreviewDialog}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Result Screenshot</DialogTitle>
            <DialogDescription>
              Screenshot submitted by {selectedRegistration?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            {selectedRegistration?.resultImageUrl ? (
              <img
                src={selectedRegistration.resultImageUrl}
                alt="Tournament Result Screenshot"
                className="max-w-full max-h-96 object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-image.png';
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
                <Image className="h-12 w-12 text-gray-400" />
                <span className="ml-2 text-gray-500">No image available</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setImagePreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
