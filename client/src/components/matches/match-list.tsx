import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import { Tournament } from "@shared/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MatchList = () => {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
    const { data: tournaments, isLoading, isError } = useQuery<Tournament[]>({
    queryKey: ['/tournaments'],
  });
  const filteredTournaments = (tournaments || []).filter((tournament: Tournament) => {
    // Apply status filter
    if (filter !== "all" && tournament.status !== filter) {
      return false;
    }
    
    // Apply search filter (if any)
    if (searchQuery && !tournament.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const handleDelete = async (tournamentId: string) => {
    if (!tournamentId) {
      toast({
        title: "Error",
        description: "Invalid tournament ID.",
        variant: "destructive",
      });
      return;
    }
    try {
      await apiRequest("DELETE", `/tournaments/${tournamentId}`);
      toast({
        title: "Tournament Deleted",
        description: "The tournament has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/tournaments'] });
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast({
        title: "Error",
        description: "Failed to delete the tournament. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get initial character from game type for avatar
  const getGameInitial = (gameType: string) => {
    return gameType.charAt(0);
  };

  // Determine status badge styles
  const getStatusBadge = (status: string) => {
    const statusClass = getStatusColor(status);
    
    return (
      <Badge className={statusClass}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <p className="text-destructive text-lg">Failed to load tournaments</p>
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/tournaments'] })}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-game">Tournament Matches</CardTitle>
            <CardDescription>
              Create, manage, and view all tournament matches
            </CardDescription>
          </div>          <Button asChild>
            <Link href="/matches/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Match
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tournaments..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={filter}
            onValueChange={setFilter}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Status</SelectLabel>
                <SelectItem value="all">All Tournaments</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-card animate-pulse rounded-md"></div>
            ))}
          </div>
        ) : filteredTournaments?.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No tournaments found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Tournament</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry Fee</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>              <TableBody>
                {(filteredTournaments || []).map((tournament: Tournament) => (
                  <TableRow key={tournament.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 bg-primary">
                          <AvatarFallback className="font-game">
                            {getGameInitial(tournament.gameType)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <p className="font-medium">{tournament.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {tournament.gameType} - {tournament.matchType} - {tournament.map}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDateTime(tournament.startTime)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(tournament.entryFee)}
                    </TableCell>
                    <TableCell>
                      {tournament.registeredTeams}/{tournament.maxTeams}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(tournament.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/matches/${tournament.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/matches/${tournament.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{tournament.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>                              <AlertDialogAction 
                                onClick={() => tournament.id && handleDelete(tournament.id.toString())}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchList;
