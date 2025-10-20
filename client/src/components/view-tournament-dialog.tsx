import React from "react";
import { Trophy, Calendar, DollarSign, Users, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tournament } from "@shared/types";
import { TournamentManagement } from "./tournament-management";
import { formatDate } from "@/lib/utils/date-utils";
import AdminPrizeDistributionSection from "./admin-prize-distribution-section";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ViewTournamentDialogProps = {
  tournament: Tournament | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ViewTournamentDialog({ tournament, open, onOpenChange }: ViewTournamentDialogProps) {
  if (!tournament) return null;

  const formatTournamentDate = (dateStr: Date | string) => {
    return formatDate(dateStr, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'upcoming': return 'secondary';
      case 'registering': return 'default';
      case 'full': return 'outline';
      case 'live': return 'destructive';
      case 'completed': return 'secondary';
      default: return 'outline';
    }
  };

  const calculateTotalRevenue = () => {
    return (tournament.entryFee || 0) * (tournament.maxTeams || 0);
  };

  const calculateCompanyCommission = () => {
    const totalRevenue = calculateTotalRevenue();
    return totalRevenue * ((tournament.companyCommissionPercentage || 10) / 100);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <Trophy className="mr-2 h-6 w-6 text-primary" />
            {tournament.title}
          </DialogTitle>
          <DialogDescription>
            Tournament details, configuration, and management
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="management">Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6 mt-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Trophy className="mr-2 h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Country</label>
                    <p className="text-foreground">{tournament.country || <span className="italic text-muted-foreground">Not specified</span>}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Game Type</label>
                    <p className="text-foreground">{tournament.gameType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Match Type</label>
                    <p className="text-foreground">{tournament.matchType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Map</label>
                    <p className="text-foreground flex items-center">
                      <MapPin className="mr-1 h-4 w-4" />
                      {tournament.map}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div>
                      <Badge variant={getStatusBadgeVariant(tournament.status)}>
                        {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Start Time</label>
                    <p className="text-foreground flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      {tournament.startTime ? formatTournamentDate(tournament.startTime) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Players</label>
                    <p className="text-foreground flex items-center">
                      <Users className="mr-1 h-4 w-4" />
                      {tournament.currentRegistrations || 0} / {tournament.maxPlayers}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Entry Fee</p>
                  <p className="text-2xl font-bold text-foreground">₹{tournament.entryFee}</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Prize Pool</p>
                  <p className="text-2xl font-bold text-green-600">₹{tournament.prizePool?.toLocaleString()}</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">₹{calculateTotalRevenue().toLocaleString()}</p>
                </div>
              </div>
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Prize Distribution</p>
                  <AdminPrizeDistributionSection
                    tournament={tournament}
                    onSave={players => {
                      // TODO: Implement save logic (e.g., save to Firestore or backend)
                      console.log("Saved players:", players);
                    }}
                    onDistribute={players => {
                      // TODO: Implement distribution logic (e.g., call backend API to distribute prizes)
                      console.log("Distribute prizes to:", players);
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Company Details</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Commission (10%)</span>
                      <span className="text-orange-500">₹{calculateCompanyCommission().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Per Kill Reward</span>
                      <span>₹{tournament.killReward}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Room Details */}
          {(tournament.roomId || tournament.roomPassword) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Room Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tournament.roomId && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Room ID</p>
                      <p className="text-xl font-mono font-bold text-foreground">{tournament.roomId}</p>
                    </div>
                  )}
                  {tournament.roomPassword && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Room Password</p>
                      <p className="text-xl font-mono font-bold text-foreground">{tournament.roomPassword}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description & Rules */}
          {(tournament.description || tournament.rules) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tournament Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tournament.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-foreground whitespace-pre-wrap">{tournament.description}</p>
                  </div>
                )}
                {tournament.rules && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Rules</label>
                    <p className="text-foreground whitespace-pre-wrap">{tournament.rules}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Banner Image */}
          {tournament.bannerImage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tournament Banner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                  <img
                    src={tournament.bannerImage}
                    alt="Tournament Banner"
                    className="object-cover w-full h-full"
                  />
                </div>
              </CardContent>
            </Card>          )}
          </TabsContent>          <TabsContent value="management" className="space-y-6 mt-6">
            <TournamentManagement tournamentId={tournament.id.toString()} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
