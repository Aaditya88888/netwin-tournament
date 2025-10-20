import React, { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Settings, Trophy, Users, DollarSign, Activity } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { TournamentManagement } from "@/components/tournament-management";
import { TournamentResults } from "@/components/tournament-results";
import AdminPrizeDistributionSection from "@/components/admin-prize-distribution-section";
import { PrizeDistribution } from "@/components/prize-distribution";
import { formatDate, formatCurrency } from "@/lib/utils";


interface Tournament {
  id: string;
  title: string;
  description?: string;
  gameType: string;
  matchType: string;
  map: string;
  status: string;
  startTime: string;
  endTime?: string;
  actualStartTime?: string;
  completedAt?: string;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  minPlayers: number;
  currentRegistrations: number;
  roomId?: string;
  roomPassword?: string;
  createdAt: string;
  updatedAt: string;
  country?: string; // Add country field
}

export default function TournamentDetail() {
  const { id } = useParams() as { id: string };
  const tournamentId = id;
  const [activeTab, setActiveTab] = useState("overview");

  const {
    data: tournament,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/tournaments/${tournamentId}`);
      return response.json();
    },
    enabled: !!tournamentId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading tournament details...</div>
      </div>
    );
  }

  if (error || !tournament?.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">Failed to load tournament details.</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const tournamentData: Tournament = tournament.data;

  // @ts-expect-error: status may be string, but we trust the value
  const status: import("../../shared/schema").TournamentStatus = tournament.status as any;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "registration_open":
        return "bg-green-100 text-green-800";
      case "registration_closed":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-orange-100 text-orange-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <Helmet>
        <title>{tournamentData.title} - Tournament Detail | Netwin Admin</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/tournaments">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tournaments
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{tournamentData.title}</h1>
              <p className="text-gray-600 mt-1">
                {tournamentData.gameType} • {tournamentData.matchType} • {tournamentData.map}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(tournamentData.status)}>
            {tournamentData.status.replace("_", " ").toUpperCase()}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Players</p>
                  <p className="text-lg font-semibold">
                    {tournamentData.currentRegistrations}/{tournamentData.maxPlayers}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Entry Fee</p>
                  <p className="text-lg font-semibold">₹{tournamentData.entryFee}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Prize Pool</p>
                  <p className="text-lg font-semibold">₹{tournamentData.prizePool}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold capitalize">
                    {tournamentData.status.replace("_", " ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="management">Management</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="prizes">Prize Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tournament Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Description</Label>
                    <p className="mt-1">{tournamentData.description || "No description available"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Country</Label>
                      <p className="mt-1 font-medium">{tournamentData.country || <span className="italic text-gray-400">Not specified</span>}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Game Type</Label>
                      <p className="mt-1 font-medium">{tournamentData.gameType}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Match Type</Label>
                      <p className="mt-1 font-medium">{tournamentData.matchType}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Map</Label>
                      <p className="mt-1 font-medium">{tournamentData.map}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Min Players</Label>
                      <p className="mt-1 font-medium">{tournamentData.minPlayers ?? <span className='italic text-gray-400'>Not set</span>}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Max Players</Label>
                      <p className="mt-1 font-medium">{tournamentData.maxPlayers ?? <span className='italic text-gray-400'>Not set</span>}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Schedule & Room Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Schedule & Room Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Scheduled Start</Label>
                    <p className="mt-1 font-medium">{formatDate(tournamentData.startTime)}</p>
                  </div>
                  {tournamentData.endTime && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Scheduled End</Label>
                      <p className="mt-1 font-medium">{formatDate(tournamentData.endTime)}</p>
                    </div>
                  )}
                  {tournamentData.actualStartTime && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Actual Start</Label>
                      <p className="mt-1 font-medium">{formatDate(tournamentData.actualStartTime)}</p>
                    </div>
                  )}
                  {tournamentData.completedAt && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Completed At</Label>
                      <p className="mt-1 font-medium">{formatDate(tournamentData.completedAt)}</p>
                    </div>
                  )}
                  {tournamentData.roomId && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Room ID</Label>
                        <p className="mt-1 font-mono text-sm bg-gray-100 text-gray-800 p-2 rounded">
                          {tournamentData.roomId}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Room Password</Label>
                        <p className="mt-1 font-mono text-sm bg-gray-100 text-gray-800 p-2 rounded">
                          {tournamentData.roomPassword || "Not set"}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Registration Info */}
            <Card>
              <CardHeader>
                <CardTitle>Registration Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {tournamentData.currentRegistrations ?? <span className='italic text-gray-400'>0</span>}
                    </div>
                    <div className="text-sm text-gray-600">Current Registrations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {tournamentData.maxPlayers ?? <span className='italic text-gray-400'>Not set</span>}
                    </div>
                    <div className="text-sm text-gray-600">Max Players</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      ₹{tournamentData.entryFee ?? <span className='italic text-gray-400'>0</span>}
                    </div>
                    <div className="text-sm text-gray-600">Entry Fee</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      ₹{tournamentData.prizePool ?? <span className='italic text-gray-400'>0</span>}
                    </div>
                    <div className="text-sm text-gray-600">Prize Pool</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="management">
            <TournamentManagement tournamentId={tournamentId!} />
          </TabsContent>

          <TabsContent value="results">
            <TournamentResults tournamentId={tournamentId!} />
          </TabsContent>

          <TabsContent value="prizes">
            <PrizeDistribution tournamentId={tournamentId!} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
