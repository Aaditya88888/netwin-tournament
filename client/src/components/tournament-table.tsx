import { useState } from "react";
import { Edit, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { EditTournamentDialog } from "@/components/edit-tournament-dialog";
import { ViewTournamentDialog } from "@/components/view-tournament-dialog";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Tournament } from "@shared/types";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils/date-utils";

import {Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type TournamentTableProps = {
  data: Tournament[];
  isLoading: boolean;
};

export function TournamentTable({ data, isLoading }: TournamentTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [viewingTournament, setViewingTournament] = useState<Tournament | null>(null);
  const [deletingTournament, setDeletingTournament] = useState<Tournament | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
    const handleDelete = async () => {
    if (!deletingTournament?.id) return;
    
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/tournaments/${deletingTournament.id}`);
      toast({
        title: "Tournament deleted",
        description: "The tournament has been successfully deleted.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/tournaments'] });
      setDeletingTournament(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tournament.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
    // Filter tournaments based on search query
  const filteredData = searchQuery
    ? (data || []).filter(
        (tournament) =>
          tournament.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tournament.gameType?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : (data || []);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
    const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'status-badge-upcoming';
      case 'registering':
        return 'status-badge-registering';
      case 'full':
        return 'status-badge-full';
      case 'live':
        return 'status-badge-live';
      case 'completed':
        return 'status-badge-completed';
      default:
        return '';
    }
  };
  
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="mt-3 sm:mt-0 flex space-x-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search tournaments..."
              className="bg-card pl-10 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <svg
              className="h-4 w-4 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filter
          </Button>
        </div>
      </div>
        <div className="overflow-x-auto rounded-lg border border-gray-700">
        <Table>
          <TableHeader className="bg-card/80">
            <TableRow className="border-gray-700">
              <TableHead className="table-header-cell">Tournament</TableHead>
              <TableHead className="table-header-cell">Date & Time</TableHead>
              <TableHead className="table-header-cell">Entry Fee</TableHead>
              <TableHead className="table-header-cell">Prize Pool</TableHead>
              <TableHead className="table-header-cell">Company Cut</TableHead>
              <TableHead className="table-header-cell">Players</TableHead>
              <TableHead className="table-header-cell">Status</TableHead>
              <TableHead className="table-header-cell">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((tournament) => (
              <TableRow key={tournament.id} className="border-gray-700 hover:bg-card/80">
                <TableCell className="table-cell">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-md bg-card/80 flex items-center justify-center text-2xl">
                        🎮
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-white">{tournament.title}</div>
                      <div className="text-sm text-gray-400">
                        {tournament.matchType} • {tournament.map}
                      </div>
                    </div>                  </div>
                </TableCell>                <TableCell className="table-cell">
                  <div>{formatDate(tournament.startTime, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                  <div className="text-gray-400">
                    {tournament.startTime ? (() => {
                      try {
                        const date = new Date(tournament.startTime);
                        return !isNaN(date.getTime()) 
                          ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST'
                          : 'Invalid Time';
                      } catch {
                        return 'Invalid Time';
                      }
                    })() : 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="table-cell">
                  <div className="text-sm text-gray-300">₹{tournament.entryFee}</div>
                </TableCell>
                <TableCell className="table-cell">
                  <div className="text-sm text-gray-300">₹{tournament.prizePool}</div>                </TableCell>
                <TableCell className="table-cell">
                  <div className="text-sm text-orange-400">
                    ₹{tournament.companyCommissionPercentage 
                      ? ((tournament.entryFee * tournament.maxTeams * tournament.companyCommissionPercentage) / 100).toLocaleString()
                      : ((tournament.entryFee * tournament.maxTeams * 10) / 100).toLocaleString()
                    }
                  </div>
                  <div className="text-xs text-gray-500">
                    ({tournament.companyCommissionPercentage || 10}%)
                  </div>
                </TableCell>
                <TableCell className="table-cell">
                  <div className="text-sm text-gray-300">
                    {tournament.registeredTeams || 0}/{tournament.maxTeams || 0}
                  </div>
                  <div className="w-full bg-card/80 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-secondary h-1.5 rounded-full"
                      style={{
                        width: `${((tournament.registeredTeams || 0) / (tournament.maxTeams || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                </TableCell>
                <TableCell className="table-cell">
                  <span className={`status-badge ${getStatusBadgeClass(tournament.status)}`}>
                    {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell className="table-cell">
                  <div className="flex space-x-2">                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingTournament(tournament)}
                    >
                      <Edit className="h-4 w-4 text-gray-400" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setViewingTournament(tournament)}
                    >
                      <Eye className="h-4 w-4 text-gray-400" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeletingTournament(tournament)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
              {filteredData.length === 0 && (
              <TableRow>
                <TableCell 
                  colSpan={8} 
                  className="h-24 text-center text-muted-foreground"
                >
                  No tournaments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
        {editingTournament && (
        <EditTournamentDialog
          tournament={editingTournament}
          open={!!editingTournament}
          onOpenChange={(open) => {
            if (!open) setEditingTournament(null);
          }}
        />
      )}

      {viewingTournament && (
        <ViewTournamentDialog
          tournament={viewingTournament}
          open={!!viewingTournament}
          onOpenChange={(open) => {
            if (!open) setViewingTournament(null);
          }}
        />
      )}

      <DeleteConfirmationDialog
        open={!!deletingTournament}
        onOpenChange={(open) => {
          if (!open) setDeletingTournament(null);
        }}
        onConfirm={handleDelete}
        title="Tournament"
        description={`Are you sure you want to delete "${deletingTournament?.title}"? This action cannot be undone and will remove all associated data.`}
        isLoading={isDeleting}
      />
    </>
  );
}
