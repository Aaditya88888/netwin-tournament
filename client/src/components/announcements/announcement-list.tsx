import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tournament } from "@shared/types";
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";
import { Megaphone, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import AnnouncementForm from "@/components/announcements/announcement-form";
import { Notification } from "@shared/schema";

import {Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const AnnouncementList = () => {
  const [filter, setFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<any>(null);
  const [viewAnnouncement, setViewAnnouncement] = useState<any>(null);
  
  const { toast } = useToast();
    // Fetch announcements
  const { data: announcements, isLoading } = useQuery<Notification[]>({
    queryKey: ['/announcements'],
  });
  
  // Fetch tournaments for reference
  const { data: tournaments } = useQuery<Tournament[]>({
    queryKey: ['/tournaments'],
  });

  // Mutation for toggling active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      return apiRequest("PATCH", `/announcements/${id}`, { isActive });
    },
    onSuccess: async () => {
      toast({
        title: "Status Updated",
        description: "Announcement status has been updated successfully.",
      });
      
      // Refresh announcements
      await queryClient.invalidateQueries({ queryKey: ['/announcements'] });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update announcement status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting announcement
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/announcements/${id}`);
    },
    onSuccess: async () => {
      toast({
        title: "Announcement Deleted",
        description: "The announcement has been deleted successfully.",
      });
      
      // Refresh announcements
      await queryClient.invalidateQueries({ queryKey: ['/announcements'] });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to delete announcement. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle toggle active status
  const handleToggleActive = (id: string | number, currentValue: boolean) => {
    toggleActiveMutation.mutate({ id: Number(id), isActive: !currentValue });
  };

  // Handle delete announcement
  const handleDelete = (id: string | number) => {
    deleteMutation.mutate(Number(id));
  };

  // Find tournament name by id
  const getTournamentName = (tournamentId: string | number) => {
    const tournament = (tournaments || []).find((t: Tournament) => t.id === String(tournamentId));
    return tournament ? tournament.title : "Unknown Tournament";
  };

  // Filter announcements based on type
  const filteredAnnouncements = (announcements || []).filter((announcement: Notification) => {
    if (filter === "all") return true;
    return announcement.type === filter;
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-game">Announcements</CardTitle>
              <CardDescription>
                Create and manage announcements for the platform
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Megaphone className="mr-2 h-4 w-4" />
              Create Announcement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Select
              value={filter}
              onValueChange={setFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="tournament">Tournament</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-card animate-pulse rounded-md"></div>
              ))}
            </div>
          ) : !filteredAnnouncements || filteredAnnouncements.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No announcements found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsCreateOpen(true)}
              >
                <Megaphone className="mr-2 h-4 w-4" />
                Create Your First Announcement
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnnouncements?.map((announcement: Notification) => (
                    <TableRow key={announcement.id}>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {announcement.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          announcement.type === "general" ? "bg-primary/20 text-primary" :
                          announcement.type === "tournament" ? "bg-secondary/20 text-secondary" :
                          "bg-yellow-500/20 text-yellow-500"
                        }>
                          {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                          {announcement.tournamentId && (
                            <span className="ml-1">({getTournamentName(announcement.tournamentId)})</span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDateTime(announcement.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={announcement.isActive}
                          onCheckedChange={() => handleToggleActive(announcement.id, announcement.isActive)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setViewAnnouncement(announcement)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditAnnouncement(announcement)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this announcement? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(announcement.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Create Announcement Form */}
      <AnnouncementForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      
      {/* Edit Announcement Form */}
      {editAnnouncement && (
        <AnnouncementForm
          isOpen={!!editAnnouncement}
          onClose={() => setEditAnnouncement(null)}
          announcement={editAnnouncement}
          isEditing
        />
      )}
      
      {/* View Announcement Modal */}
      <AlertDialog 
        open={!!viewAnnouncement} 
        onOpenChange={(open) => !open && setViewAnnouncement(null)}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{viewAnnouncement?.title}</AlertDialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={
                viewAnnouncement?.type === "general" ? "bg-primary/20 text-primary" :
                viewAnnouncement?.type === "tournament" ? "bg-secondary/20 text-secondary" :
                "bg-yellow-500/20 text-yellow-500"
              }>
                {viewAnnouncement?.type?.charAt(0).toUpperCase() + viewAnnouncement?.type?.slice(1)}
              </Badge>
              {viewAnnouncement?.isActive ? (
                <Badge variant="outline" className="bg-green-500/20 text-green-500">Active</Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-500/20 text-gray-500">Inactive</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Created: {viewAnnouncement && formatDateTime(viewAnnouncement.createdAt)}
              </span>
            </div>
          </AlertDialogHeader>
          
          <div className="py-4 whitespace-pre-wrap">
            {viewAnnouncement?.message}
          </div>
          
          {viewAnnouncement?.tournamentId && (
            <div className="text-sm text-muted-foreground mt-2">
              Related Tournament: {getTournamentName(viewAnnouncement.tournamentId)}
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                setEditAnnouncement(viewAnnouncement);
                setViewAnnouncement(null);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AnnouncementList;
