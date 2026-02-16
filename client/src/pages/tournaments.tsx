// import React, { useState, useEffect } from "react";
// import { Helmet } from "react-helmet";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { useLocation } from "wouter";
// import { apiRequest, queryClient } from "@/lib/queryClient";
// import { useToast } from "@/hooks/use-toast";
// import { useAuditLogger } from "@/lib/audit-logger";
// import {
//   ErrorBoundary,
//   ErrorState,
//   LoadingState,
//   EmptyState,
// } from "@/components/ui/error-boundary";
// import {
//   ConfirmationDialog,
//   useConfirmationDialog,
// } from "@/components/ui/confirmation-dialog";
// import {
//   HelpTooltip,
//   FieldHelpTooltip,
//   ActionHelpTooltip,
// } from "@/components/ui/help-tooltip";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import {
//   Sheet,
//   SheetContent,
//   SheetDescription,
//   SheetHeader,
//   SheetTitle,
// } from "@/components/ui/sheet";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Separator } from "@/components/ui/separator";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Progress } from "@/components/ui/progress";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from "@/components/ui/alert-dialog";
// import {
//   Trophy,
//   Plus,
//   RefreshCw,
//   Search,
//   Filter,
//   Download,
//   Upload,
//   MoreHorizontal,
//   Eye,
//   Edit,
//   Copy,
//   Trash,
//   Trash2,
//   Play,
//   Pause,
//   StopCircle,
//   Users,
//   Calendar,
//   MapPin,
//   Clock,
//   DollarSign,
//   Target,
//   Award,
//   TrendingUp,
//   Activity,
//   Settings,
//   Loader2,
//   FileText,
//   BarChart3,
//   AlertCircle,
//   Check,
//   CheckCircle,
//   X,
//   Gamepad2,
//   Zap,
// } from "lucide-react";
// import { format, addDays, isAfter, isBefore, parseISO } from "date-fns";
// import { formatCurrency } from "@/lib/utils";
// import { CreateTournamentDialog } from "@/components/create-tournament-dialog";
// import { EditTournamentDialog } from "@/components/edit-tournament-dialog";
// import { ViewTournamentDialog } from "@/components/view-tournament-dialog";

// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import GeminiImageAnalyze from "@/components/GeminiImageAnalyze";

// // Safe date formatting utility to handle invalid dates
// const safeFormat = (
//   dateValue: any,
//   formatStr: string,
//   fallback: string = "N/A",
// ) => {
//   if (!dateValue) return fallback;
//   try {
//     // Handle various date formats and validate before formatting
//     const date = new Date(dateValue); // Check if date is valid (not NaN)
//     if (isNaN(date.getTime())) return fallback;
//     return format(date, formatStr);
//   } catch (error) {
//     console.error("Error formatting date:", error, "Date value:", dateValue);
//     return fallback;
//   }
// };

// interface Tournament {
//   id: string;
//   title: string;
//   name: string;
//   description: string;
//   game: string;
//   format: string;
//   gameType: string;
//   gameMode: string;
//   matchType?: string;
//   status: "upcoming" | "ongoing" | "completed" | "cancelled" | "live" | "draft";
//   prizePool: number;
//   entryFee: number;
//   maxParticipants: number;
//   currentParticipants: number;
//   startTime: string;
//   endDate: string;
//   registrationDeadline: string;
//   rules: string;
//   organizer: string;
//   location?: string;
//   isOnline: boolean;
//   country?: string; // Added country property for currency support
//   createdAt: string;
//   updatedAt: string;
//   brackets?: any[];
//   matches?: any[];
//   winners?: {
//     first?: string;
//     second?: string;
//     third?: string;
//   };
//   analytics?: {
//     registrations: number;
//     completionRate: number;
//     averageScore: number;
//     topPerformers: any[];
//   };
// }

// interface TournamentFilters {
//   status: string;
//   game: string;
//   format: string;
//   dateRange: string;
//   prizeMin: string;
//   prizeMax: string;
//   sortBy: string;
//   sortOrder: "asc" | "desc";
// }

// interface TournamentStats {
//   totalTournaments: number;
//   activeTournaments: number;
//   completedTournaments: number;
//   totalPrizePool: number;
//   totalParticipants: number;
//   averageParticipants: number;
//   completionRate: number;
//   popularGame: string;
// }

// const Tournaments = () => {
//   const [, setLocation] = useLocation();
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedTournaments, setSelectedTournaments] = useState<string[]>([]);
//   const [showFilters, setShowFilters] = useState(false);
//   const [selectedTournament, setSelectedTournament] =
//     useState<Tournament | null>(null);
//   const [showTournamentDetails, setShowTournamentDetails] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [showCreateDialog, setShowCreateDialog] = useState(false);
//   const [showEditDialog, setShowEditDialog] = useState(false);
//   const [showViewDialog, setShowViewDialog] = useState(false);
//   const [showConfirmDialog, setShowConfirmDialog] = useState(false);
//   const [openResultPopup, setOpenResultPopup] = useState(false);
//   const [selectedTournamentId, setSelectedTournamentId] = useState<
//     string | null
//   >(null);

//   const [confirmAction, setConfirmAction] = useState<{
//     title: string;
//     description: string;
//     action: () => void;
//     variant?: "default" | "destructive";
//   } | null>(null);
//   const [filters, setFilters] = useState<TournamentFilters>({
//     status: "all",
//     game: "all",
//     format: "all",
//     dateRange: "all",
//     prizeMin: "",
//     prizeMax: "",
//     sortBy: "startTime",
//     sortOrder: "desc",
//   });

//   const { toast } = useToast();
//   const { logTournamentAction, logSystemAction } = useAuditLogger();
//   const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();
//   const queryClient = useQueryClient(); // --- Real-time updates: Tournament List Query (Refreshes every 15s) ---

//   const {
//     data: tournaments = [],
//     isLoading,
//     refetch,
//   } = useQuery<Tournament[]>({
//     queryKey: ["tournaments", filters, searchQuery],
//     queryFn: async () => {
//       const params = new URLSearchParams();
//       if (searchQuery) params.append("search", searchQuery);
//       Object.entries(filters).forEach(([key, value]) => {
//         if (value && value !== "all") params.append(key, value);
//       });

//       const response = await apiRequest("GET", `/tournaments?${params}`);
//       return response.json();
//     },
//     staleTime: 30000,
//     refetchInterval: 15000, // Auto-refresh every 15 seconds for live list updates
//   }); // --- Real-time updates: Tournament Statistics Query (Refreshes every 15s) ---

//   const { data: stats, refetch: refetchStats } = useQuery<TournamentStats>({
//     queryKey: ["tournamentStats"],
//     queryFn: async () => {
//       const response = await apiRequest("GET", "/admin/tournaments/stats");
//       return response.json();
//     },
//     staleTime: 30000, // Less aggressive stale time for stats
//     refetchInterval: 15000, // Auto-refresh every 15 seconds for live stats updates
//   }); // Refetch queries on specific success actions
//   const onSuccessRefetch = () => {
//     refetch();
//     refetchStats();
//   }; // Tournament Mutations (used to force an update on user action)
//   const updateStatusMutation = useMutation({
//     mutationFn: async ({
//       tournamentId,
//       endpoint,
//       method,
//       data,
//     }: {
//       tournamentId: string;
//       endpoint: string;
//       method: "PATCH" | "POST";
//       data?: any;
//     }) => {
//       return apiRequest(method, endpoint, data);
//     },
//     onSuccess: () => onSuccessRefetch(),
//     onError: (error) => {
//       console.error("Mutation error:", error);
//       toast({
//         title: "Error",
//         description: "Failed to update tournament status.",
//         variant: "destructive",
//       });
//     },
//   });
//   const deleteMutation = useMutation({
//     mutationFn: async (tournamentId: string) => {
//       return apiRequest("DELETE", `/tournaments/${tournamentId}`);
//     },
//     onSuccess: () => onSuccessRefetch(),
//     onError: () => {
//       toast({
//         title: "Error",
//         description: "Failed to delete tournament.",
//         variant: "destructive",
//       });
//     },
//   });
//   const bulkDeleteMutation = useMutation({
//     mutationFn: async (tournamentIds: string[]) => {
//       // Use Promise.all to delete each tournament individually as a bulk endpoint isn't available
//       return Promise.all(
//         tournamentIds.map((tournamentId) =>
//           apiRequest("DELETE", `/tournaments/${tournamentId}`),
//         ),
//       );
//     },
//     onSuccess: () => onSuccessRefetch(),
//     onError: () => {
//       toast({
//         title: "Error",
//         description: "Failed to delete tournaments. Please try again.",
//         variant: "destructive",
//       });
//     },
//   });

//   const duplicateMutation = useMutation({
//     mutationFn: async (duplicateData: Partial<Tournament>) => {
//       return apiRequest("POST", "/admin/tournaments", duplicateData);
//     },
//     onSuccess: () => onSuccessRefetch(),
//     onError: () => {
//       toast({
//         title: "Error",
//         description: "Failed to duplicate tournament.",
//         variant: "destructive",
//       });
//     },
//   });

//   const generateMatchesMutation = useMutation({
//     mutationFn: async (tournamentId: string) => {
//       return apiRequest(
//         "POST",
//         `/tournaments/${tournamentId}/generate-matches`,
//         {},
//       );
//     },
//     onSuccess: () => onSuccessRefetch(),
//     onError: () => {
//       toast({
//         title: "Error",
//         description: "Failed to generate tournament matches.",
//         variant: "destructive",
//       });
//     },
//   });

//   const distributePrizesMutation = useMutation({
//     mutationFn: async (tournamentId: string) => {
//       return apiRequest(
//         "POST",
//         `/tournaments/${tournamentId}/distribute-prizes`,
//         {},
//       );
//     },
//     onSuccess: () => onSuccessRefetch(),
//     onError: () => {
//       toast({
//         title: "Error",
//         description: "Failed to distribute tournament prizes.",
//         variant: "destructive",
//       });
//     },
//   }); // Filter tournaments based on search (Client-side filtering for search on top of server-side filtering)

//   // const filteredTournaments = tournaments.filter((tournament: Tournament) => {
//   //   if (searchQuery) {
//   //     const searchLower = searchQuery.toLowerCase();
//   //     const matchesSearch =
//   //       tournament.title?.toLowerCase().includes(searchLower) ||
//   //       tournament.description?.toLowerCase().includes(searchLower) ||
//   //       tournament.game?.toLowerCase().includes(searchLower) ||
//   //       tournament.organizer?.toLowerCase().includes(searchLower);
//   //     if (!matchesSearch) return false;
//   //   }
//   //   return true;
//   // }); // Handle tournament status change

//   const filteredTournaments = tournaments
//     .filter((t: Tournament) => {
//       // Search filter – unchanged
//       if (searchQuery) {
//         const q = searchQuery.toLowerCase();
//         return (
//           t.name?.toLowerCase().includes(q) || // using 'name' instead of 'title'
//           t.description?.toLowerCase().includes(q) ||
//           t.organizer?.toLowerCase().includes(q)
//         );
//       }
//       return true;
//     })

//     // Main filters – using correct database field names + case-insensitive
//     .filter((t: Tournament) => {
//       // Status
//       if (filters.status !== "all") {
//         if ((t.status || "").toLowerCase() !== filters.status.toLowerCase()) {
//           return false;
//         }
//       }

//       // Game → use gameType (database field)
//       if (filters.game !== "all") {
//         const dbGame = (t.gameType || "").trim().toLowerCase();
//         const selectedGame = filters.game.toLowerCase();
//         if (dbGame !== selectedGame) {
//           return false;
//         }
//       }

//       // Format → use gameMode (most consistent in your example)
//       if (filters.format !== "all") {
//         const dbFormat = (t.gameMode || t.matchType || "").trim().toLowerCase();
//         const selectedFormat = filters.format.toLowerCase();
//         if (dbFormat !== selectedFormat) {
//           return false;
//         }
//       }

//       // Prize range
//       const prize = Number(t.prizePool) || 0;
//       if (filters.prizeMin !== "" && prize < Number(filters.prizeMin)) {
//         return false;
//       }
//       if (filters.prizeMax !== "" && prize > Number(filters.prizeMax)) {
//         return false;
//       }

//       return true;
//     })

//     // Sorting – improved a bit
//     .sort((a, b) => {
//       let valA: any = a[filters.sortBy as keyof Tournament];
//       let valB: any = b[filters.sortBy as keyof Tournament];

//       if (filters.sortBy === "startTime") {
//         valA = new Date(valA).getTime();
//         valB = new Date(valB).getTime();
//       }

//       // Better numeric sort
//       if (typeof valA === "number" && typeof valB === "number") {
//         return filters.sortOrder === "asc" ? valA - valB : valB - valA;
//       }

//       if (valA < valB) return filters.sortOrder === "asc" ? -1 : 1;
//       if (valA > valB) return filters.sortOrder === "asc" ? 1 : -1;
//       return 0;
//     });

//   const handleStatusChange = (
//     tournamentId: string,
//     status: string,
//     tournamentName?: string,
//   ) => {
//     const criticalStatuses = ["cancelled", "completed"];
//     const tournament = tournaments.find((t) => t.id === tournamentId);
//     if (criticalStatuses.includes(status)) {
//       showConfirmation({
//         title: `${status === "cancelled" ? "Cancel" : "Complete"} Tournament`,
//         description: `Are you sure you want to mark "${tournamentName || tournament?.title || "this tournament"}" as ${status}? This will affect all participants and cannot be easily undone.`,
//         variant: status === "cancelled" ? "destructive" : "default",
//         confirmText: `${status.charAt(0).toUpperCase() + status.slice(1)} Tournament`,
//         onConfirm: () =>
//           updateTournamentStatus(tournamentId, status, tournamentName),
//       });
//     } else {
//       updateTournamentStatus(tournamentId, status, tournamentName);
//     }
//   };

//   const updateTournamentStatus = async (
//     tournamentId: string,
//     status: string,
//     tournamentName?: string,
//   ) => {
//     try {
//       let endpoint = "";
//       let method: "PATCH" | "POST" = "POST";
//       let data: any = {};
//       switch (status) {
//         case "ongoing":
//         case "live":
//           endpoint = `/tournaments/${tournamentId}/start`;
//           break;
//         case "completed":
//           endpoint = `/tournaments/${tournamentId}/end`;
//           break;
//         case "cancelled":
//           endpoint = `/tournaments/${tournamentId}/cancel`;
//           break;
//         default: // For other statuses, use the generic patch endpoint
//           endpoint = `/tournaments/${tournamentId}`;
//           method = "PATCH";
//           data = { status };
//       }
//       await updateStatusMutation.mutateAsync({
//         tournamentId,
//         endpoint,
//         method,
//         data,
//       }); // Log the status change
//       await logTournamentAction(`status_change_${status}`, tournamentId, {
//         oldStatus: tournaments.find((t) => t.id === tournamentId)?.status,
//         newStatus: status,
//         tournamentName,
//       });

//       toast({
//         title: "Status Updated",
//         description: `Tournament status changed to ${status}.`,
//       });
//     } catch (error) {
//       // Error handled by mutation onError
//     }
//   }; // Handle tournament deletion

//   const handleDeleteTournament = (
//     tournamentId: string,
//     tournamentName?: string,
//   ) => {
//     showConfirmation({
//       title: "Delete Tournament",
//       description: `Are you sure you want to permanently delete "${tournamentName || "this tournament"}"? This will remove all associated data including participants, matches, and analytics. This action cannot be undone.`,
//       variant: "destructive",
//       confirmText: "Delete Tournament",
//       onConfirm: async () => {
//         try {
//           setIsProcessing(true);
//           await deleteMutation.mutateAsync(tournamentId); // Log the deletion
//           await logTournamentAction("delete_tournament", tournamentId, {
//             tournamentName,
//             reason: "admin_deletion",
//           });

//           toast({
//             title: "Tournament Deleted",
//             description: "Tournament has been permanently deleted.",
//           });
//         } catch (error) {
//           // Error handled by mutation onError
//         } finally {
//           setIsProcessing(false);
//         }
//       },
//     });
//   }; // Handle tournament editing

//   const handleEditTournament = (tournament: Tournament) => {
//     setSelectedTournament(tournament);
//     setShowEditDialog(true); // Log the action
//     logTournamentAction("edit_attempt", tournament.id, {
//       tournamentName: tournament.title,
//     });
//   }; // Handle tournament viewing

//   const handleViewTournament = (tournament: Tournament) => {
//     setSelectedTournament(tournament);
//     setShowViewDialog(true);
//   }; // Handle tournament duplication

//   const handleDuplicateTournament = async (tournament: Tournament) => {
//     try {
//       const duplicateData = {
//         ...tournament,
//         title: `${tournament.title} (Copy)`,
//         status: "draft" as const,
//         startTime: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"),
//         endDate: format(addDays(new Date(), 8), "yyyy-MM-dd'T'HH:mm"),
//         registrationDeadline: format(
//           addDays(new Date(), 6),
//           "yyyy-MM-dd'T'HH:mm",
//         ),
//         currentParticipants: 0,
//       }; // Remove fields that shouldn't be copied
//       const { id, createdAt, updatedAt, ...cleanDuplicateData } = duplicateData;

//       await duplicateMutation.mutateAsync(cleanDuplicateData);
//       toast({
//         title: "Tournament Duplicated",
//         description: "Tournament has been duplicated successfully.",
//       });
//     } catch (error) {
//       // Error handled by mutation onError
//     }
//   }; // Handle generate matches

//   const handleGenerateMatches = (
//     tournamentId: string,
//     tournamentName?: string,
//   ) => {
//     showConfirmation({
//       title: "Generate Matches",
//       description: `Generate matches for "${tournamentName || "this tournament"}"? This will create matches based on registered participants.`,
//       confirmText: "Generate Matches",
//       onConfirm: async () => {
//         try {
//           await generateMatchesMutation.mutateAsync(tournamentId);
//           toast({
//             title: "Matches Generated",
//             description: "Tournament matches have been generated successfully.",
//           });
//         } catch (error) {
//           // Error handled by mutation onError
//         }
//       },
//     });
//   }; // Handle distribute prizes

//   const handleDistributePrizes = (
//     tournamentId: string,
//     tournamentName?: string,
//   ) => {
//     showConfirmation({
//       title: "Distribute Prizes",
//       description: `Distribute prizes for "${tournamentName || "this tournament"}"? This will award prizes to winners and update their wallet balances.`,
//       confirmText: "Distribute Prizes",
//       onConfirm: async () => {
//         try {
//           await distributePrizesMutation.mutateAsync(tournamentId);
//           toast({
//             title: "Prizes Distributed",
//             description:
//               "Tournament prizes have been distributed successfully.",
//           });
//         } catch (error) {
//           // Error handled by mutation onError
//         }
//       },
//     });
//   }; // Export tournaments data

//   const handleExport = async (format: "csv" | "excel") => {
//     try {
//       const params = new URLSearchParams();
//       params.append("format", format);
//       if (selectedTournaments.length > 0) {
//         params.append("tournamentIds", selectedTournaments.join(","));
//       }

//       const response = await apiRequest(
//         "GET",
//         `/admin/tournaments/export?${params}`,
//       );
//       const blob = await response.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = `tournaments_export_${format}.${format === "csv" ? "csv" : "xlsx"}`;
//       document.body.appendChild(a);
//       a.click();
//       window.URL.revokeObjectURL(url);
//       document.body.removeChild(a); // Log the export action

//       await logSystemAction("export_tournaments_data", {
//         format,
//         selectedTournamentsCount: selectedTournaments.length,
//         totalTournaments: filteredTournaments.length,
//         filters,
//       });

//       toast({
//         title: "Export Successful",
//         description: `Tournaments data exported as ${format.toUpperCase()}.`,
//       });
//     } catch (error) {
//       toast({
//         title: "Export Failed",
//         description: "Failed to export tournaments data.",
//         variant: "destructive",
//       });
//     }
//   }; // Handle bulk status change

//   const handleBulkStatusChange = async (status: string) => {
//     try {
//       // Using mutate for a cleaner API integration, even if it's currently a PATCH endpoint per tournament.
//       await Promise.all(
//         selectedTournaments.map((tournamentId) =>
//           updateStatusMutation.mutateAsync({
//             tournamentId,
//             endpoint: `/tournaments/${tournamentId}`,
//             method: "PATCH",
//             data: { status },
//           }),
//         ),
//       );
//       toast({
//         title: "Status Updated",
//         description: `${selectedTournaments.length} tournaments have been updated to ${status}.`,
//       });
//       setSelectedTournaments([]);
//       onSuccessRefetch(); // Force refetch after bulk action
//     } catch (error) {
//       console.error("Error updating bulk status:", error);
//       toast({
//         title: "Error",
//         description: "Failed to update tournament status. Please try again.",
//         variant: "destructive",
//       });
//     }
//   }; // Handle bulk delete

//   const handleBulkDelete = async () => {
//     try {
//       await bulkDeleteMutation.mutateAsync(selectedTournaments);
//       toast({
//         title: "Tournaments Deleted",
//         description: `${selectedTournaments.length} tournaments have been deleted successfully.`,
//       });
//       setSelectedTournaments([]);
//       onSuccessRefetch(); // Force refetch after bulk action
//     } catch (error) {
//       console.error("Error deleting tournaments:", error);
//       toast({
//         title: "Error",
//         description: "Failed to delete tournaments. Please try again.",
//         variant: "destructive",
//       });
//     }
//   };

//   const getStatusIcon = (status: string) => {
//     switch (status) {
//       case "ongoing":
//       case "live":
//         return <Zap className="h-4 w-4 text-green-500" />;
//       case "upcoming":
//         return <Clock className="h-4 w-4 text-blue-500" />;
//       case "completed":
//         return <CheckCircle className="h-4 w-4 text-green-500" />;
//       case "cancelled":
//         return <X className="h-4 w-4 text-red-500" />;
//       case "draft":
//       default:
//         return <FileText className="h-4 w-4 text-gray-500" />;
//     }
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case "ongoing":
//       case "live":
//         return "bg-green-500 hover:bg-green-600";
//       case "upcoming":
//         return "bg-blue-500 hover:bg-blue-600";
//       case "completed":
//         return "bg-gray-500 hover:bg-gray-600";
//       case "cancelled":
//         return "bg-red-500 hover:bg-red-600";
//       case "draft":
//       default:
//         return "bg-gray-400 hover:bg-gray-500";
//     }
//   }; // Helper function to get currency info based on country

//   const getCurrencyInfo = (countryName: string | undefined) => {
//     const countryToCurrency: Record<
//       string,
//       { currency: string; symbol: string }
//     > = {
//       India: { currency: "INR", symbol: "₹" },
//       Nigeria: { currency: "NGN", symbol: "₦" },
//       "United States": { currency: "USD", symbol: "$" },
//       USA: { currency: "USD", symbol: "$" }, // Handle legacy USA entries
//     };
//     return (
//       countryToCurrency[countryName || ""] || { currency: "INR", symbol: "₹" }
//     );
//   }; // Helper function to format currency based on tournament country

//   const formatTournamentCurrency = (amount: number, country?: string) => {
//     const currencyInfo = getCurrencyInfo(country);
//     return formatCurrency(amount, currencyInfo.currency);
//   };

//   return (
//     <ErrorBoundary>
//            {" "}
//       <Helmet>
//                 <title>Tournament Management | NetWin Admin</title>       {" "}
//         <meta
//           name="description"
//           content="Comprehensive tournament management and analytics"
//         />
//              {" "}
//       </Helmet>
//            {" "}
//       <div className="p-6 space-y-6">
//                 {/* Header */}       {" "}
//         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//                    {" "}
//           <div>
//                        {" "}
//             <div className="flex items-center gap-2">
//                            {" "}
//               <h1 className="text-3xl font-bold flex items-center gap-2">
//                                 <Trophy className="h-8 w-8 text-primary" />
//                     Tournament Management              {" "}
//               </h1>
//                            {" "}
//               <HelpTooltip
//                 content="Create, manage, and monitor tournaments with real-time analytics. Track participants, prize pools, and tournament progression."
//                 variant="info"
//               />
//                          {" "}
//             </div>
//                        {" "}
//             <p className="text-muted-foreground">
//                             Create, manage, and monitor all tournaments with
//               real-time analytics            {" "}
//             </p>
//                      {" "}
//           </div>
//                    {" "}
//           <div className="flex gap-2">
//                        {" "}
//             <ActionHelpTooltip content="Refresh tournament data and statistics">
//                            {" "}
//               <Button
//                 variant="outline"
//                 onClick={onSuccessRefetch}
//                 disabled={isLoading}
//               >
//                                {" "}
//                 <RefreshCw
//                   className={
//                     isLoading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"
//                   }
//                 />
//                                 Refresh              {" "}
//               </Button>
//                          {" "}
//             </ActionHelpTooltip>
//                        {" "}
//             <DropdownMenu>
//                            {" "}
//               <DropdownMenuTrigger>
//                                {" "}
//                 <Button variant="outline">
//                                     <Download className="h-4 w-4 mr-2" />
//                     Export                {" "}
//                 </Button>
//                              {" "}
//               </DropdownMenuTrigger>
//                            {" "}
//               <DropdownMenuContent>
//                                {" "}
//                 <DropdownMenuItem onClick={() => handleExport("csv")}>
//                                     Export as CSV                {" "}
//                 </DropdownMenuItem>
//                                {" "}
//                 <DropdownMenuItem onClick={() => handleExport("excel")}>
//                                     Export as Excel                {" "}
//                 </DropdownMenuItem>
//                              {" "}
//               </DropdownMenuContent>{" "}
//                                      {" "}
//             </DropdownMenu>{" "}
//                                    {" "}
//             <Button onClick={() => setShowCreateDialog(true)}>
//                             <Plus className="h-4 w-4 mr-2" />
//               Create Tournament            {" "}
//             </Button>
//                      {" "}
//           </div>
//                  {" "}
//         </div>
//                {" "}
//         {/* Statistics Cards - Dynamic Update via refetchInterval on stats query */}
//                {" "}
//         {stats ? (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//                        {" "}
//             <Card>
//                            {" "}
//               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                                {" "}
//                 <CardTitle className="text-sm font-medium">
//                   Total Tournaments
//                 </CardTitle>
//                                {" "}
//                 <Trophy className="h-4 w-4 text-muted-foreground" /> {" "}
//               </CardHeader>
//                            {" "}
//               <CardContent>
//                                {" "}
//                 <div className="text-2xl font-bold">
//                   {stats.totalTournaments}
//                 </div>
//                                {" "}
//                 <p className="text-xs text-muted-foreground">
//                                     **{stats.activeTournaments}** currently
//                   active                {" "}
//                 </p>
//                              {" "}
//               </CardContent>
//                          {" "}
//             </Card>
//                        {" "}
//             <Card>
//                            {" "}
//               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                                {" "}
//                 <CardTitle className="text-sm font-medium">
//                   Total Prize Pool
//                 </CardTitle>
//                                {" "}
//                 <DollarSign className="h-4 w-4 text-muted-foreground" />
//                  {" "}
//               </CardHeader>
//                            {" "}
//               <CardContent>
//                                {" "}
//                 <div className="text-2xl font-bold">
//                   {formatCurrency(stats.totalPrizePool)}
//                 </div>
//                                {" "}
//                 <p className="text-xs text-muted-foreground">
//                                     Across all tournaments (Global Currency)
//                          {" "}
//                 </p>
//                              {" "}
//               </CardContent>
//                          {" "}
//             </Card>
//                        {" "}
//             <Card>
//                            {" "}
//               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                                {" "}
//                 <CardTitle className="text-sm font-medium">
//                   Total Participants
//                 </CardTitle>
//                                {" "}
//                 <Users className="h-4 w-4 text-muted-foreground" /> {" "}
//               </CardHeader>
//                            {" "}
//               <CardContent>
//                                {" "}
//                 <div className="text-2xl font-bold">
//                   {stats.totalParticipants}
//                 </div>
//                                {" "}
//                 <p className="text-xs text-muted-foreground">
//                                     Avg: **{stats.averageParticipants}** per
//                   tournament                {" "}
//                 </p>
//                              {" "}
//               </CardContent>
//                          {" "}
//             </Card>
//                        {" "}
//             <Card>
//                            {" "}
//               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                                {" "}
//                 <CardTitle className="text-sm font-medium">
//                   Completion Rate
//                 </CardTitle>
//                                {" "}
//                 <BarChart3 className="h-4 w-4 text-muted-foreground" />   {" "}
//               </CardHeader>
//                            {" "}
//               <CardContent>
//                                {" "}
//                 <div className="text-2xl font-bold">
//                   {stats.completionRate}%
//                 </div>
//                                {" "}
//                 <p className="text-xs text-muted-foreground">
//                                     Most popular: **{stats.popularGame}**
//                      {" "}
//                 </p>
//                              {" "}
//               </CardContent>
//                          {" "}
//             </Card>
//                      {" "}
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//                        {" "}
//             {Array.from({ length: 4 }).map((_, i) => (
//               <Card key={i} className="animate-pulse">
//                                {" "}
//                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                                    {" "}
//                   <div className="h-4 bg-gray-200 rounded w-1/2"></div>       {" "}
//                   <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
//                      {" "}
//                 </CardHeader>
//                                {" "}
//                 <CardContent>
//                                    {" "}
//                   <div className="h-8 bg-gray-300 rounded w-3/4 mb-2"></div>
//                            {" "}
//                   <div className="h-3 bg-gray-200 rounded w-1/3"></div>
//                    {" "}
//                 </CardContent>
//                              {" "}
//               </Card>
//             ))}
//                      {" "}
//           </div>
//         )}
//                 {/* Search and Filters */}       {" "}
//         <Card>
//                    {" "}
//           <CardContent className="pt-6">
//                        {" "}
//             <div className="flex flex-col md:flex-row gap-4">
//                            {" "}
//               <div className="flex-1 relative">
//                                {" "}
//                 <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
//                                {" "}
//                 <Input
//                   placeholder="Search tournaments by title, game, or organizer..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="pl-10"
//                 />
//                              {" "}
//               </div>
//                            {" "}
//               <div className="flex gap-2">
//                                {" "}
//                 <Button
//                   variant="outline"
//                   onClick={() => setShowFilters(!showFilters)}
//                 >
//                                     <Filter className="h-4 w-4 mr-2" />
//                   Filters                {" "}
//                 </Button>{" "}
//                                                {" "}
//                 {selectedTournaments.length > 0 && (
//                   <DropdownMenu>
//                                        {" "}
//                     <DropdownMenuTrigger>
//                                            {" "}
//                       <Button variant="outline">
//                                                 Bulk Actions (
//                         {selectedTournaments.length})                      {" "}
//                       </Button>
//                                          {" "}
//                     </DropdownMenuTrigger>
//                                        {" "}
//                     <DropdownMenuContent align="end">
//                                            {" "}
//                       <DropdownMenuItem
//                         onClick={() =>
//                           showConfirmation({
//                             title: "Change Status",
//                             description: `Change status of ${selectedTournaments.length} selected tournaments to Upcoming?`,
//                             confirmText: "Change Status",
//                             onConfirm: () => handleBulkStatusChange("upcoming"),
//                           })
//                         }
//                       >
//                                                {" "}
//                         <Play className="h-4 w-4 mr-2" />
//                         Mark as Upcoming                      {" "}
//                       </DropdownMenuItem>
//                                            {" "}
//                       <DropdownMenuItem
//                         onClick={() =>
//                           showConfirmation({
//                             title: "Change Status",
//                             description: `Change status of ${selectedTournaments.length} selected tournaments to Ongoing/Live?`,
//                             confirmText: "Change Status",
//                             onConfirm: () => handleBulkStatusChange("live"),
//                           })
//                         }
//                       >
//                                                 <Zap className="h-4 w-4 mr-2" />
//                                                 Mark as Live  {" "}
//                       </DropdownMenuItem>
//                                            {" "}
//                       <DropdownMenuItem
//                         onClick={() =>
//                           showConfirmation({
//                             title: "Change Status",
//                             description: `Mark ${selectedTournaments.length} selected tournaments as Completed?`,
//                             confirmText: "Change Status",
//                             onConfirm: () =>
//                               handleBulkStatusChange("completed"),
//                           })
//                         }
//                       >
//                                                {" "}
//                         <Check className="h-4 w-4 mr-2" />  Mark as Completed
//                                            {" "}
//                       </DropdownMenuItem>
//                                             <DropdownMenuSeparator />         {" "}
//                       <DropdownMenuItem
//                         onClick={() =>
//                           showConfirmation({
//                             title: "Delete Tournaments",
//                             description: `Are you sure you want to permanently delete ${selectedTournaments.length} tournaments? This action cannot be undone.`,
//                             variant: "destructive",
//                             confirmText: "Delete",
//                             onConfirm: handleBulkDelete,
//                           })
//                         }
//                         className="text-red-600"
//                       >
//                                                {" "}
//                         <Trash2 className="h-4 w-4 mr-2" />  Delete Selected
//                                          {" "}
//                       </DropdownMenuItem>
//                                          {" "}
//                     </DropdownMenuContent>
//                                      {" "}
//                   </DropdownMenu>
//                 )}
//                              {" "}
//               </div>
//                          {" "}
//             </div>
//                         {/* Advanced Filters */}           {" "}
//             {showFilters && (
//               <div className="mt-4 pt-4 border-t space-y-4">
//                                {" "}
//                 <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
//                                    {" "}
//                   <div>
//                                         <Label>Status</Label>                   {" "}
//                     <Select
//                       value={filters.status}
//                       onValueChange={(value) =>
//                         setFilters({ ...filters, status: value })
//                       }
//                     >
//                                            {" "}
//                       <SelectTrigger>
//                                                 <SelectValue />   {" "}
//                       </SelectTrigger>
//                                            {" "}
//                       <SelectContent>
//                                                {" "}
//                         <SelectItem value="all">All</SelectItem>       {" "}
//                         <SelectItem value="upcoming">Upcoming</SelectItem>
//                                    {" "}
//                         <SelectItem value="ongoing">Ongoing</SelectItem>
//                                {" "}
//                         <SelectItem value="completed">Completed</SelectItem>
//                                        {" "}
//                         <SelectItem value="cancelled">Cancelled</SelectItem>
//                                        {" "}
//                         <SelectItem value="draft">Draft</SelectItem>
//                          {" "}
//                       </SelectContent>
//                                          {" "}
//                     </Select>
//                                      {" "}
//                   </div>
//                                    {" "}
//                   <div>
//                                         <Label>Game</Label>                   {" "}
//                     <Select
//                       value={filters.game}
//                       onValueChange={(value) =>
//                         setFilters({ ...filters, game: value })
//                       }
//                     >
//                                            {" "}
//                       <SelectTrigger>
//                                                 <SelectValue />   {" "}
//                       </SelectTrigger>
//                                            {" "}
//                       <SelectContent>
//                                                {" "}
//                         <SelectItem value="all">All Games</SelectItem>
//                             <SelectItem value="pubg">PUBG Mobile</SelectItem>
//                                     <SelectItem value="bgmi">BGMI</SelectItem>
//                                 <SelectItem value="codm">COD Mobile</SelectItem>
//                                        {" "}
//                         <SelectItem value="freefire">Free Fire</SelectItem>
//                                  {" "}
//                       </SelectContent>
//                                          {" "}
//                     </Select>
//                                      {" "}
//                   </div>
//                                    {" "}
//                   <div>
//                                         <Label>Format</Label>                   {" "}
//                     <Select
//                       value={filters.format}
//                       onValueChange={(value) =>
//                         setFilters({ ...filters, format: value })
//                       }
//                     >
//                                            {" "}
//                       <SelectTrigger>
//                                                 <SelectValue />   {" "}
//                       </SelectTrigger>
//                                            {" "}
//                       <SelectContent>
//                                                {" "}
//                         <SelectItem value="all">All Formats</SelectItem>
//                                 <SelectItem value="solo">Solo</SelectItem>
//                             <SelectItem value="duo">Duo</SelectItem>
//                               <SelectItem value="squad">Squad</SelectItem>
//                               <SelectItem value="team">Team</SelectItem>
//                                    {" "}
//                       </SelectContent>
//                                          {" "}
//                     </Select>
//                                      {" "}
//                   </div>
//                                    {" "}
//                   <div>
//                                         <Label>Min Prize</Label>   {" "}
//                     <Input
//                       type="number"
//                       placeholder="0"
//                       value={filters.prizeMin}
//                       onChange={(e) =>
//                         setFilters({ ...filters, prizeMin: e.target.value })
//                       }
//                     />
//                                      {" "}
//                   </div>
//                                    {" "}
//                   <div>
//                                         <Label>Max Prize</Label>   {" "}
//                     <Input
//                       type="number"
//                       placeholder="∞"
//                       value={filters.prizeMax}
//                       onChange={(e) =>
//                         setFilters({ ...filters, prizeMax: e.target.value })
//                       }
//                     />
//                                      {" "}
//                   </div>
//                                    {" "}
//                   <div>
//                                         <Label>Sort By</Label> {" "}
//                     <Select
//                       value={filters.sortBy}
//                       onValueChange={(value) =>
//                         setFilters({ ...filters, sortBy: value })
//                       }
//                     >
//                                            {" "}
//                       <SelectTrigger>
//                                                 <SelectValue />   {" "}
//                       </SelectTrigger>{" "}
//                                                                  {" "}
//                       <SelectContent>
//                                                {" "}
//                         <SelectItem value="startTime">Start Date</SelectItem>
//                                        {" "}
//                         <SelectItem value="prizePool">Prize Pool</SelectItem>
//                                        {" "}
//                         <SelectItem value="participants">
//                           Participants
//                         </SelectItem>
//                                                {" "}
//                         <SelectItem value="createdAt">Created Date</SelectItem>
//                                          {" "}
//                       </SelectContent>
//                                          {" "}
//                     </Select>
//                                      {" "}
//                   </div>
//                                  {" "}
//                 </div>
//                              {" "}
//               </div>
//             )}
//                      {" "}
//           </CardContent>
//                  {" "}
//         </Card>{" "}
//                                 {/* Tournaments Table */}       {" "}
//         <Card>
//                    {" "}
//           <CardContent className="pt-6">
//                        {" "}
//             {isLoading ? (
//               <LoadingState message="Loading tournaments..." />
//             ) : tournaments.length === 0 ? (
//               <EmptyState
//                 title="No tournaments found"
//                 description="Create your first tournament to get started."
//                 action={
//                   <Button onClick={() => setShowCreateDialog(true)}>
//                                         <Plus className="h-4 w-4 mr-2" />
//                         Create Your First Tournament  {" "}
//                   </Button>
//                 }
//                 icon={<Trophy className="h-8 w-8" />}
//               />
//             ) : (
//               <>
//                                {" "}
//                 <div className="rounded-md border">
//                                    {" "}
//                   <Table>
//                                        {" "}
//                     <TableHeader>
//                                            {" "}
//                       <TableRow>
//                                                {" "}
//                         <TableHead className="w-12">
//                                                    {" "}
//                           <Checkbox
//                             checked={
//                               selectedTournaments.length ===
//                                 filteredTournaments.length &&
//                               filteredTournaments.length > 0
//                             }
//                             onCheckedChange={(checked) => {
//                               if (checked) {
//                                 setSelectedTournaments(
//                                   filteredTournaments.map((t) => t.id),
//                                 );
//                               } else {
//                                 setSelectedTournaments([]);
//                               }
//                             }}
//                           />
//                                                  {" "}
//                         </TableHead>
//                                                {" "}
//                         <TableHead>Tournament</TableHead>                       {" "}
//                         <TableHead>Game</TableHead>                       {" "}
//                         <TableHead>Prize Pool</TableHead>                       {" "}
//                         <TableHead>Participants</TableHead> {" "}
//                         <TableHead>Status</TableHead>                       {" "}
//                         <TableHead>Start Date</TableHead>                       {" "}
//                         <TableHead>Actions</TableHead>                     {" "}
//                       </TableRow>
//                                          {" "}
//                     </TableHeader>
//                                        {" "}
//                     <TableBody>
//                                            {" "}
//                       {filteredTournaments.map((tournament) => (
//                         <TableRow key={tournament.id}>
//                                                    {" "}
//                           <TableCell>
//                                                        {" "}
//                             <Checkbox
//                               checked={selectedTournaments.includes(
//                                 tournament.id,
//                               )}
//                               onCheckedChange={(checked) => {
//                                 if (checked) {
//                                   setSelectedTournaments([
//                                     ...selectedTournaments,
//                                     tournament.id,
//                                   ]);
//                                 } else {
//                                   setSelectedTournaments(
//                                     selectedTournaments.filter(
//                                       (id) => id !== tournament.id,
//                                     ),
//                                   );
//                                 }
//                               }}
//                             />
//                                                      {" "}
//                           </TableCell>
//                                                    {" "}
//                           <TableCell>
//                                                        {" "}
//                             <div>
//                                                            {" "}
//                               <p className="font-medium">{tournament.name}</p>
//                                                        {" "}
//                               <p className="text-sm text-muted-foreground">
//                                 {tournament.format}
//                               </p>
//                                                          {" "}
//                             </div>
//                                                      {" "}
//                           </TableCell>
//                                                    {" "}
//                           <TableCell>
//                             {" "}
//                                {" "}
//                             <div className="flex items-center gap-2">
//                                                            {" "}
//                               <Gamepad2 className="h-4 w-4 text-muted-foreground" />
//                                                             {tournament.game}
//                                                  {" "}
//                             </div>
//                                                      {" "}
//                           </TableCell>
//                                                    {" "}
//                           <TableCell>
//                                                        {" "}
//                             <div>
//                                                            {" "}
//                               <p className="font-medium">
//                                 {formatTournamentCurrency(
//                                   tournament.prizePool,
//                                   tournament.country,
//                                 )}
//                               </p>
//                                                            {" "}
//                               <p className="text-sm text-muted-foreground">
//                                 Entry:{" "}
//                                 {formatTournamentCurrency(
//                                   tournament.entryFee,
//                                   tournament.country,
//                                 )}
//                               </p>
//                                                          {" "}
//                             </div>
//                                                      {" "}
//                           </TableCell>
//                                                    {" "}
//                           <TableCell>
//                                                        {" "}
//                             <div>
//                                                            {" "}
//                               <p className="font-medium">
//                                 {tournament.currentParticipants}/
//                                 {tournament.maxParticipants}
//                               </p>
//                                                            {" "}
//                               <Progress
//                                 value={
//                                   (tournament.currentParticipants /
//                                     tournament.maxParticipants) *
//                                   100
//                                 }
//                                 className="w-16 h-2"
//                               />
//                                                          {" "}
//                             </div>
//                                                      {" "}
//                           </TableCell>
//                                                    {" "}
//                           <TableCell>
//                                                        {" "}
//                             <div className="flex items-center gap-2">
//                                                            {" "}
//                               {getStatusIcon(tournament.status)}             {" "}
//                               <Badge
//                                 className={getStatusColor(tournament.status)}
//                               >
//                                                                {" "}
//                                 {tournament.status.charAt(0).toUpperCase() +
//                                   tournament.status.slice(1)}
//                                                              {" "}
//                               </Badge>
//                                                          {" "}
//                             </div>{" "}
//                              {" "}
//                           </TableCell>{" "}
//                                                                              {" "}
//                           <TableCell>
//                                                        {" "}
//                             <p className="text-sm">
//                               {safeFormat(tournament.startTime, "MMM dd, yyyy")}
//                             </p>
//                                                        {" "}
//                             <p className="text-xs text-muted-foreground">
//                               {safeFormat(tournament.startTime, "HH:mm", "")}
//                             </p>
//                                                      {" "}
//                           </TableCell>
//                                                    {" "}
//                           <TableCell>
//                                                        {" "}
//                             <DropdownMenu>
//                                                            {" "}
//                               <DropdownMenuTrigger>
//                                                                {" "}
//                                 <Button variant="ghost" size="sm">
//                                                                    {" "}
//                                   <MoreHorizontal className="h-4 w-4" />
//                                                  {" "}
//                                 </Button>
//                                                              {" "}
//                               </DropdownMenuTrigger>
//                                                            {" "}
//                               <DropdownMenuContent align="end">
//                                                                {" "}
//                                 <DropdownMenuLabel>Actions</DropdownMenuLabel>
//                                                            {" "}
//                                 <DropdownMenuSeparator />       {" "}
//                                 <DropdownMenuItem
//                                   onClick={() => {
//                                     // Using a temporary direct state update for the sheet open flow
//                                     setSelectedTournament(tournament);
//                                     setShowTournamentDetails(true); // Optionally navigate for a persistent URL
//                                     // setLocation(`/tournaments/${tournament.id}`);
//                                   }}
//                                 >
//                                                                    {" "}
//                                   <Eye className="h-4 w-4 mr-2" />
//                                         View Details                  {" "}
//                                 </DropdownMenuItem>{" "}
//                                                {" "}
//                                 <DropdownMenuItem
//                                   onClick={() =>
//                                     handleEditTournament(tournament)
//                                   }
//                                 >
//                                                                    {" "}
//                                   <Edit className="h-4 w-4 mr-2" />
//                                         Edit Tournament
//                                    {" "}
//                                 </DropdownMenuItem>
//                                                                {" "}
//                                 <DropdownMenuItem
//                                   onClick={() =>
//                                     handleDuplicateTournament(tournament)
//                                   }
//                                 >
//                                                                    {" "}
//                                   <Copy className="h-4 w-4 mr-2" />
//                                         Duplicate                {" "}
//                                 </DropdownMenuItem>
//                                                                {" "}
//                                 <DropdownMenuSeparator />       {" "}
//                                 {/* Dynamic Status Actions */}
//                                    {" "}
//                                 {(tournament.status === "draft" ||
//                                   tournament.status === "cancelled") && (
//                                   <DropdownMenuItem
//                                     onClick={() =>
//                                       handleStatusChange(
//                                         tournament.id,
//                                         "upcoming",
//                                         tournament.title,
//                                       )
//                                     }
//                                   >
//                                                                        {" "}
//                                     <Play className="h-4 w-4 mr-2" />
//                                                 Publish / Reopen
//                                                  {" "}
//                                   </DropdownMenuItem>
//                                 )}
//                                                                {" "}
//                                 {tournament.status === "upcoming" && (
//                                   <DropdownMenuItem
//                                     onClick={() =>
//                                       handleStatusChange(
//                                         tournament.id,
//                                         "live",
//                                         tournament.title,
//                                       )
//                                     }
//                                   >
//                                                                        {" "}
//                                     <Zap className="h-4 w-4 mr-2" />
//                                                 Start Tournament
//                                                  {" "}
//                                   </DropdownMenuItem>
//                                 )}
//                                                                {" "}
//                                 {(tournament.status === "live" ||
//                                   tournament.status === "ongoing") && (
//                                   <DropdownMenuItem
//                                     onClick={() =>
//                                       handleStatusChange(
//                                         tournament.id,
//                                         "completed",
//                                         tournament.title,
//                                       )
//                                     }
//                                   >
//                                                                        {" "}
//                                     <StopCircle className="h-4 w-4 mr-2" />
//                                                             End Tournament
//                                                                {" "}
//                                   </DropdownMenuItem>
//                                 )}
//                                                                {" "}
//                                 {/* Match Generation and Prize Distribution should be available for specific statuses */}
//                                                                {" "}
//                                 {(tournament.status === "live" ||
//                                   tournament.status === "upcoming") && (
//                                   <DropdownMenuItem
//                                     onClick={() =>
//                                       handleGenerateMatches(
//                                         tournament.id,
//                                         tournament.title,
//                                       )
//                                     }
//                                   >
//                                                                        {" "}
//                                     <Gamepad2 className="h-4 w-4 mr-2" />
//                                                         Generate Matches
//                                                              {" "}
//                                   </DropdownMenuItem>
//                                 )}
//                                                                {" "}
//                                 {tournament.status === "completed" && (
//                                   <DropdownMenuItem
//                                     onSelect={(e) => {
//                                       e.preventDefault(); // stops dropdown from closing
//                                       setSelectedTournamentId(tournament.id); // 🔥 STORE THE ID
//                                       setOpenResultPopup(true);
//                                     }}
//                                   >
//                                     <Award className="h-4 w-4 mr-2" />
//                                     Submit Result
//                                   </DropdownMenuItem>
//                                 )}
//                                 <Dialog
//                                   open={openResultPopup}
//                                   onOpenChange={setOpenResultPopup}
//                                 >
//                                   <DialogContent className="sm:max-w-lg">
//                                     <DialogHeader>
//                                       <DialogTitle>
//                                         Upload Leaderboard Image
//                                       </DialogTitle>
//                                     </DialogHeader>

//                                     {/* content later */}
//                                     <GeminiImageAnalyze
//                                       tournamentId={selectedTournamentId}
//                                     />
//                                   </DialogContent>
//                                 </Dialog>
//                                                                {" "}
//                                 {tournament.status === "completed" && (
//                                   <DropdownMenuItem
//                                     onClick={() =>
//                                       handleDistributePrizes(
//                                         tournament.id,
//                                         tournament.title,
//                                       )
//                                     }
//                                   >
//                                                                        {" "}
//                                     <Award className="h-4 w-4 mr-2" />
//                                                     Distribute Prizes
//                                                            {" "}
//                                   </DropdownMenuItem>
//                                 )}
//                                                                {" "}
//                                 <DropdownMenuSeparator />       {" "}
//                                 <DropdownMenuItem
//                                   onClick={() =>
//                                     handleStatusChange(
//                                       tournament.id,
//                                       "cancelled",
//                                       tournament.title,
//                                     )
//                                   }
//                                   className="text-red-600"
//                                 >
//                                                                    {" "}
//                                   <X className="h-4 w-4 mr-2" />
//                                     Cancel          {" "}
//                                 </DropdownMenuItem>
//                                                                {" "}
//                                 <DropdownMenuSeparator />       {" "}
//                                 <DropdownMenuItem
//                                   onClick={() =>
//                                     handleDeleteTournament(
//                                       tournament.id,
//                                       tournament.title,
//                                     )
//                                   }
//                                   className="text-red-600"
//                                 >
//                                                                    {" "}
//                                   <Trash2 className="h-4 w-4 mr-2" />
//                                             Delete              {" "}
//                                 </DropdownMenuItem>
//                                                              {" "}
//                               </DropdownMenuContent>
//                                                          {" "}
//                             </DropdownMenu>
//                                                      {" "}
//                           </TableCell>
//                                                  {" "}
//                         </TableRow>
//                       ))}
//                                          {" "}
//                     </TableBody>
//                                      {" "}
//                   </Table>
//                                  {" "}
//                 </div>
//                                {" "}
//                 {filteredTournaments.length === 0 && (
//                   <div className="text-center py-10">
//                                        {" "}
//                     <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
//                                        {" "}
//                     <h3 className="text-lg font-medium">
//                       No tournaments found
//                     </h3>
//                                        {" "}
//                     <p className="text-muted-foreground">
//                       Try adjusting your search or filters.
//                     </p>
//                                        {" "}
//                     <Button
//                       className="mt-4"
//                       onClick={() => setShowCreateDialog(true)}
//                     >
//                                             <Plus className="h-4 w-4 mr-2" />
//                                     Create Your First Tournament        {" "}
//                     </Button>
//                                      {" "}
//                   </div>
//                 )}
//                              {" "}
//               </>
//             )}
//                      {" "}
//           </CardContent>
//                  {" "}
//         </Card>{" "}
//                                {" "}
//         {/* Tournament Details Sheet (Kept for completeness, though ViewDialog is available) */}
//                {" "}
//         <Sheet
//           key="tournament-details"
//           open={showTournamentDetails}
//           onOpenChange={setShowTournamentDetails}
//         >
//                    {" "}
//           <SheetContent
//             side="right"
//             className="w-full max-w-2xl overflow-y-auto"
//           >
//                        {" "}
//             <SheetHeader>
//                             <SheetTitle>Tournament Details</SheetTitle>   {" "}
//               <SheetDescription>
//                                 Complete tournament information and management
//                 options              {" "}
//               </SheetDescription>
//                          {" "}
//             </SheetHeader>
//                        {" "}
//             {selectedTournament && (
//               <div className="mt-6 space-y-6">
//                                 {/* Tournament Header */}               {" "}
//                 <div className="space-y-4">
//                                    {" "}
//                   <div className="flex items-center justify-between">
//                                        {" "}
//                     <h3 className="text-xl font-semibold">
//                       {selectedTournament.title}
//                     </h3>
//                                        {" "}
//                     <Badge
//                       className={getStatusColor(selectedTournament.status)}
//                     >
//                                            {" "}
//                       {selectedTournament.status.charAt(0).toUpperCase() +
//                         selectedTournament.status.slice(1)}
//                                          {" "}
//                     </Badge>
//                                      {" "}
//                   </div>
//                                    {" "}
//                   <p className="text-muted-foreground">
//                     {selectedTournament.description}
//                   </p>
//                                  {" "}
//                 </div>
//                                {" "}
//                 <Tabs defaultValue="overview" className="w-full">
//                                    {" "}
//                   <TabsList className="grid w-full grid-cols-4">
//                                        {" "}
//                     <TabsTrigger value="overview">Overview</TabsTrigger>
//                        {" "}
//                     <TabsTrigger value="participants">Participants</TabsTrigger>
//                                        {" "}
//                     <TabsTrigger value="brackets">Brackets</TabsTrigger>
//                         <TabsTrigger value="analytics">Analytics</TabsTrigger>
//                              {" "}
//                   </TabsList>
//                                    {" "}
//                   <TabsContent value="overview" className="space-y-4">
//                                        {" "}
//                     <Card>
//                                            {" "}
//                       <CardHeader>
//                                                {" "}
//                         <CardTitle className="text-lg">
//                           Tournament Information
//                         </CardTitle>
//                                              {" "}
//                       </CardHeader>
//                                            {" "}
//                       <CardContent className="space-y-3">
//                                                {" "}
//                         <div className="grid grid-cols-2 gap-4">
//                                                    {" "}
//                           <div>
//                                                        {" "}
//                             <p className="text-sm text-muted-foreground">
//                               Game
//                             </p>
//                                                        {" "}
//                             <p className="font-medium">
//                               {selectedTournament.game}
//                             </p>
//                                                      {" "}
//                           </div>
//                                                    {" "}
//                           <div>
//                                                        {" "}
//                             <p className="text-sm text-muted-foreground">
//                               Format
//                             </p>
//                                                        {" "}
//                             <p className="font-medium">
//                               {selectedTournament.format}
//                             </p>
//                                                      {" "}
//                           </div>
//                                                    {" "}
//                           <div>
//                                                        {" "}
//                             <p className="text-sm text-muted-foreground">
//                               Prize Pool
//                             </p>
//                                                        {" "}
//                             <p className="font-medium">
//                               {formatTournamentCurrency(
//                                 selectedTournament.prizePool,
//                                 selectedTournament.country,
//                               )}
//                             </p>
//                                                      {" "}
//                           </div>
//                                                    {" "}
//                           <div>
//                                                        {" "}
//                             <p className="text-sm text-muted-foreground">
//                               Entry Fee
//                             </p>
//                                                        {" "}
//                             <p className="font-medium">
//                               {formatTournamentCurrency(
//                                 selectedTournament.entryFee,
//                                 selectedTournament.country,
//                               )}
//                             </p>
//                                                      {" "}
//                           </div>
//                                                    {" "}
//                           <div>
//                                                        {" "}
//                             <p className="text-sm text-muted-foreground">
//                               Participants
//                             </p>
//                                                        {" "}
//                             <p className="font-medium">
//                               {selectedTournament.currentParticipants}/
//                               {selectedTournament.maxParticipants}
//                             </p>
//                                                      {" "}
//                           </div>
//                                                    {" "}
//                           <div>
//                                                        {" "}
//                             <p className="text-sm text-muted-foreground">
//                               Organizer
//                             </p>
//                                                        {" "}
//                             <p className="font-medium">
//                               {selectedTournament.organizer}
//                             </p>
//                                                      {" "}
//                           </div>
//                                                  {" "}
//                         </div>
//                                              {" "}
//                       </CardContent>
//                                          {" "}
//                     </Card>
//                                        {" "}
//                     <Card>
//                                            {" "}
//                       <CardHeader>
//                                                {" "}
//                         <CardTitle className="text-lg">Schedule</CardTitle>
//                                  {" "}
//                       </CardHeader>
//                                            {" "}
//                       <CardContent className="space-y-3">
//                                                {" "}
//                         <div>
//                                                    {" "}
//                           <p className="text-sm text-muted-foreground">
//                             Registration Deadline
//                           </p>
//                                                    {" "}
//                           <p className="font-medium">
//                             {safeFormat(
//                               selectedTournament.registrationDeadline,
//                               "MMM dd, yyyy HH:mm",
//                             )}
//                           </p>
//                                                  {" "}
//                         </div>
//                                                {" "}
//                         <div>
//                                                    {" "}
//                           <p className="text-sm text-muted-foreground">
//                             Start Date
//                           </p>
//                                                    {" "}
//                           <p className="font-medium">
//                             {safeFormat(
//                               selectedTournament.startTime,
//                               "MMM dd, yyyy HH:mm",
//                             )}
//                           </p>
//                                                  {" "}
//                         </div>
//                                                {" "}
//                         <div>
//                                                    {" "}
//                           <p className="text-sm text-muted-foreground">
//                             End Date
//                           </p>
//                                                    {" "}
//                           <p className="font-medium">
//                             {safeFormat(
//                               selectedTournament.endDate,
//                               "MMM dd, yyyy HH:mm",
//                             )}
//                           </p>
//                                                  {" "}
//                         </div>
//                                                {" "}
//                         <div>
//                                                    {" "}
//                           <p className="text-sm text-muted-foreground">Type</p>
//                                                {" "}
//                           <p className="font-medium">
//                             {selectedTournament.isOnline ? "Online" : "Offline"}
//                           </p>
//                                                  {" "}
//                         </div>
//                                                {" "}
//                         {selectedTournament.location && (
//                           <div>
//                                                        {" "}
//                             <p className="text-sm text-muted-foreground">
//                               Location
//                             </p>
//                                                        {" "}
//                             <p className="font-medium">
//                               {selectedTournament.location}
//                             </p>
//                                                      {" "}
//                           </div>
//                         )}
//                                              {" "}
//                       </CardContent>
//                                          {" "}
//                     </Card>
//                                      {" "}
//                   </TabsContent>
//                                    {" "}
//                   <TabsContent value="participants">
//                                        {" "}
//                     <Card>
//                                            {" "}
//                       <CardHeader>
//                                                {" "}
//                         <CardTitle className="text-lg">
//                           Registered Participants
//                         </CardTitle>
//                                              {" "}
//                       </CardHeader>
//                                            {" "}
//                       <CardContent>
//                                                {" "}
//                         <p className="text-muted-foreground">
//                           Participant management interface will be displayed
//                           here.
//                         </p>
//                                              {" "}
//                       </CardContent>
//                                          {" "}
//                     </Card>
//                                      {" "}
//                   </TabsContent>
//                                    {" "}
//                   <TabsContent value="brackets">
//                                        {" "}
//                     <Card>
//                                            {" "}
//                       <CardHeader>
//                                                {" "}
//                         <CardTitle className="text-lg">
//                           Tournament Brackets
//                         </CardTitle>
//                                              {" "}
//                       </CardHeader>
//                                            {" "}
//                       <CardContent>
//                                                {" "}
//                         <p className="text-muted-foreground">
//                           Bracket management and match scheduling interface will
//                           be displayed here.
//                         </p>
//                                              {" "}
//                       </CardContent>
//                                          {" "}
//                     </Card>
//                                      {" "}
//                   </TabsContent>
//                                    {" "}
//                   <TabsContent value="analytics">
//                                        {" "}
//                     <Card>
//                                            {" "}
//                       <CardHeader>
//                                                {" "}
//                         <CardTitle className="text-lg">
//                           Tournament Analytics
//                         </CardTitle>
//                                              {" "}
//                       </CardHeader>
//                                            {" "}
//                       <CardContent>
//                                                {" "}
//                         {selectedTournament.analytics ? (
//                           <div className="space-y-4">
//                                                        {" "}
//                             <div className="grid grid-cols-2 gap-4">
//                                                            {" "}
//                               <div>
//                                                                {" "}
//                                 <p className="text-sm text-muted-foreground">
//                                   Registrations
//                                 </p>
//                                                                {" "}
//                                 <p className="text-2xl font-bold">
//                                   {selectedTournament.analytics.registrations}
//                                 </p>
//                                                              {" "}
//                               </div>
//                                                            {" "}
//                               <div>
//                                                                {" "}
//                                 <p className="text-sm text-muted-foreground">
//                                   Completion Rate
//                                 </p>
//                                                                {" "}
//                                 <p className="text-2xl font-bold">
//                                   {selectedTournament.analytics.completionRate}%
//                                 </p>
//                                                              {" "}
//                               </div>
//                                                          {" "}
//                             </div>
//                                                      {" "}
//                           </div>
//                         ) : (
//                           <p className="text-muted-foreground">
//                             Analytics data will be available once the tournament
//                             begins.
//                           </p>
//                         )}
//                                              {" "}
//                       </CardContent>
//                                          {" "}
//                     </Card>
//                                      {" "}
//                   </TabsContent>
//                                  {" "}
//                 </Tabs>
//                              {" "}
//               </div>
//             )}
//                      {" "}
//           </SheetContent>
//                  {" "}
//         </Sheet>
//              {" "}
//       </div>{" "}
//                  {" "}
//       {/* Confirmation Dialog - Note: useConfirmationDialog already provides a centralized dialog, so this standalone AlertDialog seems redundant but is kept to maintain the original structure's redundancy if intended */}
//            {" "}
//       <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
//                {" "}
//         <AlertDialogContent>
//                    {" "}
//           <AlertDialogHeader>
//                        {" "}
//             <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle> {" "}
//             <AlertDialogDescription>
//                             {confirmAction?.description}           {" "}
//             </AlertDialogDescription>
//                      {" "}
//           </AlertDialogHeader>
//                    {" "}
//           <AlertDialogFooter>
//                         <AlertDialogCancel>Cancel</AlertDialogCancel>           {" "}
//             <AlertDialogAction
//               onClick={() => {
//                 confirmAction?.action();
//                 setShowConfirmDialog(false);
//               }}
//               className={
//                 confirmAction?.variant === "destructive"
//                   ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
//                   : ""
//               }
//             >
//                             Confirm            {" "}
//             </AlertDialogAction>
//                      {" "}
//           </AlertDialogFooter>
//                  {" "}
//         </AlertDialogContent>
//              {" "}
//       </AlertDialog>
//                   {/* Create Tournament Dialog */}     {" "}
//       <CreateTournamentDialog
//         open={showCreateDialog}
//         onOpenChange={(open) => {
//           setShowCreateDialog(open);
//           if (!open) onSuccessRefetch(); // Refetch after closing successful creation dialog
//         }}
//       />
//                   {/* Edit Tournament Dialog */}     {" "}
//       {selectedTournament && (
//         <EditTournamentDialog
//           open={showEditDialog}
//           onOpenChange={(open) => {
//             setShowEditDialog(open);
//             if (!open) onSuccessRefetch(); // Refetch after closing successful edit dialog
//           }}
//           tournament={selectedTournament as any}
//         />
//       )}
//             {/* View Tournament Dialog */}     {" "}
//       {selectedTournament && (
//         <ViewTournamentDialog
//           open={showViewDialog}
//           onOpenChange={setShowViewDialog}
//           tournament={selectedTournament as any}
//         />
//       )}
//                   {/* Confirmation Dialog from hook */}
//             <ConfirmationDialog />   {" "}
//     </ErrorBoundary>
//   );
// };

// export default Tournaments;

// *****************************************************************

import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuditLogger } from "@/lib/audit-logger";
import {
  ErrorBoundary,
  ErrorState,
  LoadingState,
  EmptyState,
} from "@/components/ui/error-boundary";
import {
  ConfirmationDialog,
  useConfirmationDialog,
} from "@/components/ui/confirmation-dialog";
import {
  HelpTooltip,
  FieldHelpTooltip,
  ActionHelpTooltip,
} from "@/components/ui/help-tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import {
  Trophy,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Trash,
  Trash2,
  Play,
  Pause,
  StopCircle,
  Users,
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Target,
  Award,
  TrendingUp,
  Activity,
  Settings,
  Loader2,
  FileText,
  BarChart3,
  AlertCircle,
  Check,
  CheckCircle,
  X,
  Gamepad2,
  Zap,
} from "lucide-react";
import { format, addDays, isAfter, isBefore, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { CreateTournamentDialog } from "@/components/create-tournament-dialog";
import { EditTournamentDialog } from "@/components/edit-tournament-dialog";
import { ViewTournamentDialog } from "@/components/view-tournament-dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GeminiImageAnalyze from "@/components/GeminiImageAnalyze";

// Safe date formatting utility to handle invalid dates
const safeFormat = (
  dateValue: any,
  formatStr: string,
  fallback: string = "N/A",
) => {
  if (!dateValue) return fallback;
  try {
    // Handle various date formats and validate before formatting
    const date = new Date(dateValue); // Check if date is valid (not NaN)
    if (isNaN(date.getTime())) return fallback;
    return format(date, formatStr);
  } catch (error) {
    console.error("Error formatting date:", error, "Date value:", dateValue);
    return fallback;
  }
};

interface Tournament {
  id: string;
  title: string;
  name: string;
  description: string;
  game: string;
  format: string;
  gameType: string;
  gameMode: string;
  matchType?: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled" | "live" | "draft";
  prizePool: number;
  entryFee: number;
  maxParticipants: number;
  currentParticipants: number;
  startTime: string;
  endDate: string;
  registrationDeadline: string;
  rules: string;
  organizer: string;
  location?: string;
  isOnline: boolean;
  country?: string; // Added country property for currency support
  createdAt: string;
  updatedAt: string;
  brackets?: any[];
  matches?: any[];
  winners?: {
    first?: string;
    second?: string;
    third?: string;
  };
  analytics?: {
    registrations: number;
    completionRate: number;
    averageScore: number;
    topPerformers: any[];
  };
}

interface TournamentFilters {
  status: string;
  game: string;
  format: string;
  dateRange: string;
  prizeMin: string;
  prizeMax: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface TournamentStats {
  totalTournaments: number;
  activeTournaments: number;
  completedTournaments: number;
  totalPrizePool: number;
  totalParticipants: number;
  averageParticipants: number;
  completionRate: number;
  popularGame: string;
}

const Tournaments = () => {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTournaments, setSelectedTournaments] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [showTournamentDetails, setShowTournamentDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [openResultPopup, setOpenResultPopup] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<
    string | null
  >(null);

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    action: () => void;
    variant?: "default" | "destructive";
  } | null>(null);
  const [filters, setFilters] = useState<TournamentFilters>({
    status: "all",
    game: "all",
    format: "all",
    dateRange: "all",
    prizeMin: "",
    prizeMax: "",
    sortBy: "startTime",
    sortOrder: "desc",
  });

  const { toast } = useToast();
  const { logTournamentAction, logSystemAction } = useAuditLogger();
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();
  const queryClient = useQueryClient(); // --- Real-time updates: Tournament List Query (Refreshes every 15s) ---

  const {
    data: tournaments = [],
    isLoading,
    refetch,
  } = useQuery<Tournament[]>({
    queryKey: ["tournaments", filters, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.append(key, value);
      });

      const response = await apiRequest("GET", `/tournaments?${params}`);
      return response.json();
    },
    staleTime: 30000,
    refetchInterval: 15000, // Auto-refresh every 15 seconds for live list updates
  }); // --- Real-time updates: Tournament Statistics Query (Refreshes every 15s) ---

  const { data: stats, refetch: refetchStats } = useQuery<TournamentStats>({
    queryKey: ["tournamentStats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/admin/tournaments/stats");
      return response.json();
    },
    staleTime: 30000, // Less aggressive stale time for stats
    refetchInterval: 15000, // Auto-refresh every 15 seconds for live stats updates
  }); // Refetch queries on specific success actions
  const onSuccessRefetch = () => {
    refetch();
    refetchStats();
  }; // Tournament Mutations (used to force an update on user action)
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      tournamentId,
      endpoint,
      method,
      data,
    }: {
      tournamentId: string;
      endpoint: string;
      method: "PATCH" | "POST";
      data?: any;
    }) => {
      return apiRequest(method, endpoint, data);
    },
    onSuccess: () => onSuccessRefetch(),
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: "Failed to update tournament status.",
        variant: "destructive",
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      return apiRequest("DELETE", `/tournaments/${tournamentId}`);
    },
    onSuccess: () => onSuccessRefetch(),
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tournament.",
        variant: "destructive",
      });
    },
  });
  const bulkDeleteMutation = useMutation({
    mutationFn: async (tournamentIds: string[]) => {
      // Use Promise.all to delete each tournament individually as a bulk endpoint isn't available
      return Promise.all(
        tournamentIds.map((tournamentId) =>
          apiRequest("DELETE", `/tournaments/${tournamentId}`),
        ),
      );
    },
    onSuccess: () => onSuccessRefetch(),
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tournaments. Please try again.",
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (duplicateData: Partial<Tournament>) => {
      return apiRequest("POST", "/admin/tournaments", duplicateData);
    },
    onSuccess: () => onSuccessRefetch(),
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate tournament.",
        variant: "destructive",
      });
    },
  });

  const generateMatchesMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      return apiRequest(
        "POST",
        `/tournaments/${tournamentId}/generate-matches`,
        {},
      );
    },
    onSuccess: () => onSuccessRefetch(),
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate tournament matches.",
        variant: "destructive",
      });
    },
  });

  const distributePrizesMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      return apiRequest(
        "POST",
        `/tournaments/${tournamentId}/distribute-prizes`,
        {},
      );
    },
    onSuccess: () => onSuccessRefetch(),
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to distribute tournament prizes.",
        variant: "destructive",
      });
    },
  }); // Filter tournaments based on search (Client-side filtering for search on top of server-side filtering)

  // const filteredTournaments = tournaments.filter((tournament: Tournament) => {
  //   if (searchQuery) {
  //     const searchLower = searchQuery.toLowerCase();
  //     const matchesSearch =
  //       tournament.title?.toLowerCase().includes(searchLower) ||
  //       tournament.description?.toLowerCase().includes(searchLower) ||
  //       tournament.game?.toLowerCase().includes(searchLower) ||
  //       tournament.organizer?.toLowerCase().includes(searchLower);
  //     if (!matchesSearch) return false;
  //   }
  //   return true;
  // }); // Handle tournament status change

  const filteredTournaments = tournaments
    .filter((t: Tournament) => {
      // Search filter – unchanged
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.name?.toLowerCase().includes(q) || // using 'name' instead of 'title'
          t.description?.toLowerCase().includes(q) ||
          t.organizer?.toLowerCase().includes(q)
        );
      }
      return true;
    })

    // Main filters – using correct database field names + case-insensitive
    .filter((t: Tournament) => {
      // Status
      if (filters.status !== "all") {
        if ((t.status || "").toLowerCase() !== filters.status.toLowerCase()) {
          return false;
        }
      }

      // Game → use gameType (database field)
      if (filters.game !== "all") {
        const dbGame = (t.gameType || "").trim().toLowerCase();
        const selectedGame = filters.game.toLowerCase();
        if (dbGame !== selectedGame) {
          return false;
        }
      }

      // Format → use gameMode (most consistent in your example)
      if (filters.format !== "all") {
        const dbFormat = (t.gameMode || t.matchType || "").trim().toLowerCase();
        const selectedFormat = filters.format.toLowerCase();
        if (dbFormat !== selectedFormat) {
          return false;
        }
      }

      // Prize range
      const prize = Number(t.prizePool) || 0;
      if (filters.prizeMin !== "" && prize < Number(filters.prizeMin)) {
        return false;
      }
      if (filters.prizeMax !== "" && prize > Number(filters.prizeMax)) {
        return false;
      }

      return true;
    })

    // Sorting – improved a bit
    .sort((a, b) => {
      let valA: any = a[filters.sortBy as keyof Tournament];
      let valB: any = b[filters.sortBy as keyof Tournament];

      if (filters.sortBy === "startTime") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      // Better numeric sort
      if (typeof valA === "number" && typeof valB === "number") {
        return filters.sortOrder === "asc" ? valA - valB : valB - valA;
      }

      if (valA < valB) return filters.sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return filters.sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const handleStatusChange = (
    tournamentId: string,
    status: string,
    tournamentName?: string,
  ) => {
    const criticalStatuses = ["cancelled", "completed"];
    const tournament = tournaments.find((t) => t.id === tournamentId);
    if (criticalStatuses.includes(status)) {
      showConfirmation({
        title: `${status === "cancelled" ? "Cancel" : "Complete"} Tournament`,
        description: `Are you sure you want to mark "${tournamentName || tournament?.title || "this tournament"}" as ${status}? This will affect all participants and cannot be easily undone.`,
        variant: status === "cancelled" ? "destructive" : "default",
        confirmText: `${status.charAt(0).toUpperCase() + status.slice(1)} Tournament`,
        onConfirm: () =>
          updateTournamentStatus(tournamentId, status, tournamentName),
      });
    } else {
      updateTournamentStatus(tournamentId, status, tournamentName);
    }
  };

  const updateTournamentStatus = async (
    tournamentId: string,
    status: string,
    tournamentName?: string,
  ) => {
    try {
      let endpoint = "";
      let method: "PATCH" | "POST" = "POST";
      let data: any = {};
      switch (status) {
        case "ongoing":
        case "live":
          endpoint = `/tournaments/${tournamentId}/start`;
          break;
        case "completed":
          endpoint = `/tournaments/${tournamentId}/end`;
          break;
        case "cancelled":
          endpoint = `/tournaments/${tournamentId}/cancel`;
          break;
        default: // For other statuses, use the generic patch endpoint
          endpoint = `/tournaments/${tournamentId}`;
          method = "PATCH";
          data = { status };
      }
      await updateStatusMutation.mutateAsync({
        tournamentId,
        endpoint,
        method,
        data,
      }); // Log the status change
      await logTournamentAction(`status_change_${status}`, tournamentId, {
        oldStatus: tournaments.find((t) => t.id === tournamentId)?.status,
        newStatus: status,
        tournamentName,
      });

      toast({
        title: "Status Updated",
        description: `Tournament status changed to ${status}.`,
      });
    } catch (error) {
      // Error handled by mutation onError
    }
  }; // Handle tournament deletion

  const handleDeleteTournament = (
    tournamentId: string,
    tournamentName?: string,
  ) => {
    showConfirmation({
      title: "Delete Tournament",
      description: `Are you sure you want to permanently delete "${tournamentName || "this tournament"}"? This will remove all associated data including participants, matches, and analytics. This action cannot be undone.`,
      variant: "destructive",
      confirmText: "Delete Tournament",
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await deleteMutation.mutateAsync(tournamentId); // Log the deletion
          await logTournamentAction("delete_tournament", tournamentId, {
            tournamentName,
            reason: "admin_deletion",
          });

          toast({
            title: "Tournament Deleted",
            description: "Tournament has been permanently deleted.",
          });
        } catch (error) {
          // Error handled by mutation onError
        } finally {
          setIsProcessing(false);
        }
      },
    });
  }; // Handle tournament editing

  const handleEditTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setShowEditDialog(true); // Log the action
    logTournamentAction("edit_attempt", tournament.id, {
      tournamentName: tournament.title,
    });
  }; // Handle tournament viewing

  const handleViewTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setShowViewDialog(true);
  }; // Handle tournament duplication

  const handleDuplicateTournament = async (tournament: Tournament) => {
    try {
      const duplicateData = {
        ...tournament,
        title: `${tournament.title} (Copy)`,
        status: "draft" as const,
        startTime: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"),
        endDate: format(addDays(new Date(), 8), "yyyy-MM-dd'T'HH:mm"),
        registrationDeadline: format(
          addDays(new Date(), 6),
          "yyyy-MM-dd'T'HH:mm",
        ),
        currentParticipants: 0,
      }; // Remove fields that shouldn't be copied
      const { id, createdAt, updatedAt, ...cleanDuplicateData } = duplicateData;

      await duplicateMutation.mutateAsync(cleanDuplicateData);
      toast({
        title: "Tournament Duplicated",
        description: "Tournament has been duplicated successfully.",
      });
    } catch (error) {
      // Error handled by mutation onError
    }
  }; // Handle generate matches

  const handleGenerateMatches = (
    tournamentId: string,
    tournamentName?: string,
  ) => {
    showConfirmation({
      title: "Generate Matches",
      description: `Generate matches for "${tournamentName || "this tournament"}"? This will create matches based on registered participants.`,
      confirmText: "Generate Matches",
      onConfirm: async () => {
        try {
          await generateMatchesMutation.mutateAsync(tournamentId);
          toast({
            title: "Matches Generated",
            description: "Tournament matches have been generated successfully.",
          });
        } catch (error) {
          // Error handled by mutation onError
        }
      },
    });
  }; // Handle distribute prizes

  const handleDistributePrizes = (
    tournamentId: string,
    tournamentName?: string,
  ) => {
    showConfirmation({
      title: "Distribute Prizes",
      description: `Distribute prizes for "${tournamentName || "this tournament"}"? This will award prizes to winners and update their wallet balances.`,
      confirmText: "Distribute Prizes",
      onConfirm: async () => {
        try {
          await distributePrizesMutation.mutateAsync(tournamentId);
          toast({
            title: "Prizes Distributed",
            description:
              "Tournament prizes have been distributed successfully.",
          });
        } catch (error) {
          // Error handled by mutation onError
        }
      },
    });
  }; // Export tournaments data

  const handleExport = async (format: "csv" | "excel") => {
    try {
      const params = new URLSearchParams();
      params.append("format", format);
      if (selectedTournaments.length > 0) {
        params.append("tournamentIds", selectedTournaments.join(","));
      }

      const response = await apiRequest(
        "GET",
        `/admin/tournaments/export?${params}`,
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tournaments_export_${format}.${format === "csv" ? "csv" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a); // Log the export action

      await logSystemAction("export_tournaments_data", {
        format,
        selectedTournamentsCount: selectedTournaments.length,
        totalTournaments: filteredTournaments.length,
        filters,
      });

      toast({
        title: "Export Successful",
        description: `Tournaments data exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export tournaments data.",
        variant: "destructive",
      });
    }
  }; // Handle bulk status change

  const handleBulkStatusChange = async (status: string) => {
    try {
      // Using mutate for a cleaner API integration, even if it's currently a PATCH endpoint per tournament.
      await Promise.all(
        selectedTournaments.map((tournamentId) =>
          updateStatusMutation.mutateAsync({
            tournamentId,
            endpoint: `/tournaments/${tournamentId}`,
            method: "PATCH",
            data: { status },
          }),
        ),
      );
      toast({
        title: "Status Updated",
        description: `${selectedTournaments.length} tournaments have been updated to ${status}.`,
      });
      setSelectedTournaments([]);
      onSuccessRefetch(); // Force refetch after bulk action
    } catch (error) {
      console.error("Error updating bulk status:", error);
      toast({
        title: "Error",
        description: "Failed to update tournament status. Please try again.",
        variant: "destructive",
      });
    }
  }; // Handle bulk delete

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteMutation.mutateAsync(selectedTournaments);
      toast({
        title: "Tournaments Deleted",
        description: `${selectedTournaments.length} tournaments have been deleted successfully.`,
      });
      setSelectedTournaments([]);
      onSuccessRefetch(); // Force refetch after bulk action
    } catch (error) {
      console.error("Error deleting tournaments:", error);
      toast({
        title: "Error",
        description: "Failed to delete tournaments. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ongoing":
      case "live":
        return <Zap className="h-4 w-4 text-green-500" />;
      case "upcoming":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "cancelled":
        return <X className="h-4 w-4 text-red-500" />;
      case "draft":
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
      case "live":
        return "bg-green-500 hover:bg-green-600";
      case "upcoming":
        return "bg-blue-500 hover:bg-blue-600";
      case "completed":
        return "bg-gray-500 hover:bg-gray-600";
      case "cancelled":
        return "bg-red-500 hover:bg-red-600";
      case "draft":
      default:
        return "bg-gray-400 hover:bg-gray-500";
    }
  }; // Helper function to get currency info based on country

  const getCurrencyInfo = (countryName: string | undefined) => {
    const countryToCurrency: Record<
      string,
      { currency: string; symbol: string }
    > = {
      India: { currency: "INR", symbol: "₹" },
      Nigeria: { currency: "NGN", symbol: "₦" },
      "United States": { currency: "USD", symbol: "$" },
      USA: { currency: "USD", symbol: "$" }, // Handle legacy USA entries
    };
    return (
      countryToCurrency[countryName || ""] || { currency: "INR", symbol: "₹" }
    );
  }; // Helper function to format currency based on tournament country

  const formatTournamentCurrency = (amount: number, country?: string) => {
    const currencyInfo = getCurrencyInfo(country);
    return formatCurrency(amount, currencyInfo.currency);
  };

  return (
    <ErrorBoundary>
           {" "}
      <Helmet>
                <title>Tournament Management | NetWin Admin</title>       {" "}
        <meta
          name="description"
          content="Comprehensive tournament management and analytics"
        />
             {" "}
      </Helmet>
           {" "}
      <div className="p-6 space-y-6">
                {/* Header */}       {" "}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                   {" "}
          <div>
                       {" "}
            <div className="flex items-center gap-2">
                           {" "}
              <h1 className="text-3xl font-bold flex items-center gap-2">
                                <Trophy className="h-8 w-8 text-primary" />     
                    Tournament Management              {" "}
              </h1>
                           {" "}
              <HelpTooltip
                content="Create, manage, and monitor tournaments with real-time analytics. Track participants, prize pools, and tournament progression."
                variant="info"
              />
                         {" "}
            </div>
                       {" "}
            <p className="text-muted-foreground">
                            Create, manage, and monitor all tournaments with
              real-time analytics            {" "}
            </p>
                     {" "}
          </div>
                   {" "}
          <div className="flex gap-2">
                       {" "}
            <ActionHelpTooltip content="Refresh tournament data and statistics">
                           {" "}
              <Button
                variant="outline"
                onClick={onSuccessRefetch}
                disabled={isLoading}
              >
                               {" "}
                <RefreshCw
                  className={
                    isLoading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"
                  }
                />
                                Refresh              {" "}
              </Button>
                         {" "}
            </ActionHelpTooltip>
                       {" "}
            <DropdownMenu>
                           {" "}
              <DropdownMenuTrigger>
                               {" "}
                <Button variant="outline">
                                    <Download className="h-4 w-4 mr-2" />       
                    Export                {" "}
                </Button>
                             {" "}
              </DropdownMenuTrigger>
                           {" "}
              <DropdownMenuContent>
                               {" "}
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                                    Export as CSV                {" "}
                </DropdownMenuItem>
                               {" "}
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                                    Export as Excel                {" "}
                </DropdownMenuItem>
                             {" "}
              </DropdownMenuContent>{" "}
                                     {" "}
            </DropdownMenu>{" "}
                                   {" "}
            <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
              Create Tournament            {" "}
            </Button>
                     {" "}
          </div>
                 {" "}
        </div>
               {" "}
        {/* Statistics Cards - Dynamic Update via refetchInterval on stats query */}
               {" "}
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                       {" "}
            <Card>
                           {" "}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                               {" "}
                <CardTitle className="text-sm font-medium">
                  Total Tournaments
                </CardTitle>
                               {" "}
                <Trophy className="h-4 w-4 text-muted-foreground" /> {" "}
              </CardHeader>
                           {" "}
              <CardContent>
                               {" "}
                <div className="text-2xl font-bold">
                  {stats.totalTournaments}
                </div>
                               {" "}
                <p className="text-xs text-muted-foreground">
                                    **{stats.activeTournaments}** currently
                  active                {" "}
                </p>
                             {" "}
              </CardContent>
                         {" "}
            </Card>
                       {" "}
            <Card>
                           {" "}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                               {" "}
                <CardTitle className="text-sm font-medium">
                  Total Prize Pool
                </CardTitle>
                               {" "}
                <DollarSign className="h-4 w-4 text-muted-foreground" />   
                 {" "}
              </CardHeader>
                           {" "}
              <CardContent>
                               {" "}
                <div className="text-2xl font-bold">
                  {/* {formatCurrency(stats.totalPrizePool)} */}
                  {formatCurrency(stats?.totalPrizePool ?? 0)}
                </div>
                               {" "}
                <p className="text-xs text-muted-foreground">
                                    Across all tournaments (Global Currency)    
                         {" "}
                </p>
                             {" "}
              </CardContent>
                         {" "}
            </Card>
                       {" "}
            <Card>
                           {" "}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                               {" "}
                <CardTitle className="text-sm font-medium">
                  Total Participants
                </CardTitle>
                               {" "}
                <Users className="h-4 w-4 text-muted-foreground" /> {" "}
              </CardHeader>
                           {" "}
              <CardContent>
                               {" "}
                <div className="text-2xl font-bold">
                  {stats.totalParticipants}
                </div>
                               {" "}
                <p className="text-xs text-muted-foreground">
                                    Avg: **{stats.averageParticipants}** per
                  tournament                {" "}
                </p>
                             {" "}
              </CardContent>
                         {" "}
            </Card>
                       {" "}
            <Card>
                           {" "}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                               {" "}
                <CardTitle className="text-sm font-medium">
                  Completion Rate
                </CardTitle>
                               {" "}
                <BarChart3 className="h-4 w-4 text-muted-foreground" />   {" "}
              </CardHeader>
                           {" "}
              <CardContent>
                               {" "}
                <div className="text-2xl font-bold">
                  {stats.completionRate}%
                </div>
                               {" "}
                <p className="text-xs text-muted-foreground">
                                    Most popular: **{stats.popularGame}**      
                     {" "}
                </p>
                             {" "}
              </CardContent>
                         {" "}
            </Card>
                     {" "}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                       {" "}
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                               {" "}
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                   {" "}
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>       {" "}
                  <div className="h-4 w-4 bg-gray-200 rounded-full"></div>     
                     {" "}
                </CardHeader>
                               {" "}
                <CardContent>
                                   {" "}
                  <div className="h-8 bg-gray-300 rounded w-3/4 mb-2"></div>   
                           {" "}
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>   
                   {" "}
                </CardContent>
                             {" "}
              </Card>
            ))}
                     {" "}
          </div>
        )}
                {/* Search and Filters */}       {" "}
        <Card>
                   {" "}
          <CardContent className="pt-6">
                       {" "}
            <div className="flex flex-col md:flex-row gap-4">
                           {" "}
              <div className="flex-1 relative">
                               {" "}
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                               {" "}
                <Input
                  placeholder="Search tournaments by title, game, or organizer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                             {" "}
              </div>
                           {" "}
              <div className="flex gap-2">
                               {" "}
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                                    <Filter className="h-4 w-4 mr-2" />       
                  Filters                {" "}
                </Button>{" "}
                                               {" "}
                {selectedTournaments.length > 0 && (
                  <DropdownMenu>
                                       {" "}
                    <DropdownMenuTrigger>
                                           {" "}
                      <Button variant="outline">
                                                Bulk Actions (
                        {selectedTournaments.length})                      {" "}
                      </Button>
                                         {" "}
                    </DropdownMenuTrigger>
                                       {" "}
                    <DropdownMenuContent align="end">
                                           {" "}
                      <DropdownMenuItem
                        onClick={() =>
                          showConfirmation({
                            title: "Change Status",
                            description: `Change status of ${selectedTournaments.length} selected tournaments to Upcoming?`,
                            confirmText: "Change Status",
                            onConfirm: () => handleBulkStatusChange("upcoming"),
                          })
                        }
                      >
                                               {" "}
                        <Play className="h-4 w-4 mr-2" />
                        Mark as Upcoming                      {" "}
                      </DropdownMenuItem>
                                           {" "}
                      <DropdownMenuItem
                        onClick={() =>
                          showConfirmation({
                            title: "Change Status",
                            description: `Change status of ${selectedTournaments.length} selected tournaments to Ongoing/Live?`,
                            confirmText: "Change Status",
                            onConfirm: () => handleBulkStatusChange("live"),
                          })
                        }
                      >
                                                <Zap className="h-4 w-4 mr-2" />
                                                Mark as Live  {" "}
                      </DropdownMenuItem>
                                           {" "}
                      <DropdownMenuItem
                        onClick={() =>
                          showConfirmation({
                            title: "Change Status",
                            description: `Mark ${selectedTournaments.length} selected tournaments as Completed?`,
                            confirmText: "Change Status",
                            onConfirm: () =>
                              handleBulkStatusChange("completed"),
                          })
                        }
                      >
                                               {" "}
                        <Check className="h-4 w-4 mr-2" />  Mark as Completed  
                                           {" "}
                      </DropdownMenuItem>
                                            <DropdownMenuSeparator />         {" "}
                      <DropdownMenuItem
                        onClick={() =>
                          showConfirmation({
                            title: "Delete Tournaments",
                            description: `Are you sure you want to permanently delete ${selectedTournaments.length} tournaments? This action cannot be undone.`,
                            variant: "destructive",
                            confirmText: "Delete",
                            onConfirm: handleBulkDelete,
                          })
                        }
                        className="text-red-600"
                      >
                                               {" "}
                        <Trash2 className="h-4 w-4 mr-2" />  Delete Selected    
                                         {" "}
                      </DropdownMenuItem>
                                         {" "}
                    </DropdownMenuContent>
                                     {" "}
                  </DropdownMenu>
                )}
                             {" "}
              </div>
                         {" "}
            </div>
                        {/* Advanced Filters */}           {" "}
            {showFilters && (
              <div className="mt-4 pt-4 border-t space-y-4">
                               {" "}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                   {" "}
                  <div>
                                        <Label>Status</Label>                   {" "}
                    <Select
                      value={filters.status}
                      onValueChange={(value) =>
                        setFilters({ ...filters, status: value })
                      }
                    >
                                           {" "}
                      <SelectTrigger>
                                                <SelectValue />   {" "}
                      </SelectTrigger>
                                           {" "}
                      <SelectContent>
                                               {" "}
                        <SelectItem value="all">All</SelectItem>       {" "}
                        <SelectItem value="upcoming">Upcoming</SelectItem>     
                                   {" "}
                        <SelectItem value="ongoing">Ongoing</SelectItem>       
                               {" "}
                        <SelectItem value="completed">Completed</SelectItem>   
                                       {" "}
                        <SelectItem value="cancelled">Cancelled</SelectItem>   
                                       {" "}
                        <SelectItem value="draft">Draft</SelectItem>       
                         {" "}
                      </SelectContent>
                                         {" "}
                    </Select>
                                     {" "}
                  </div>
                                   {" "}
                  <div>
                                        <Label>Game</Label>                   {" "}
                    <Select
                      value={filters.game}
                      onValueChange={(value) =>
                        setFilters({ ...filters, game: value })
                      }
                    >
                                           {" "}
                      <SelectTrigger>
                                                <SelectValue />   {" "}
                      </SelectTrigger>
                                           {" "}
                      <SelectContent>
                                               {" "}
                        <SelectItem value="all">All Games</SelectItem>         
                            <SelectItem value="pubg">PUBG Mobile</SelectItem>   
                                    <SelectItem value="bgmi">BGMI</SelectItem> 
                                <SelectItem value="codm">COD Mobile</SelectItem>
                                       {" "}
                        <SelectItem value="freefire">Free Fire</SelectItem>     
                                 {" "}
                      </SelectContent>
                                         {" "}
                    </Select>
                                     {" "}
                  </div>
                                   {" "}
                  <div>
                                        <Label>Format</Label>                   {" "}
                    <Select
                      value={filters.format}
                      onValueChange={(value) =>
                        setFilters({ ...filters, format: value })
                      }
                    >
                                           {" "}
                      <SelectTrigger>
                                                <SelectValue />   {" "}
                      </SelectTrigger>
                                           {" "}
                      <SelectContent>
                                               {" "}
                        <SelectItem value="all">All Formats</SelectItem>       
                                <SelectItem value="solo">Solo</SelectItem>     
                            <SelectItem value="duo">Duo</SelectItem>           
                              <SelectItem value="squad">Squad</SelectItem>     
                              <SelectItem value="team">Team</SelectItem>       
                                   {" "}
                      </SelectContent>
                                         {" "}
                    </Select>
                                     {" "}
                  </div>
                                   {" "}
                  <div>
                                        <Label>Min Prize</Label>   {" "}
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.prizeMin}
                      onChange={(e) =>
                        setFilters({ ...filters, prizeMin: e.target.value })
                      }
                    />
                                     {" "}
                  </div>
                                   {" "}
                  <div>
                                        <Label>Max Prize</Label>   {" "}
                    <Input
                      type="number"
                      placeholder="∞"
                      value={filters.prizeMax}
                      onChange={(e) =>
                        setFilters({ ...filters, prizeMax: e.target.value })
                      }
                    />
                                     {" "}
                  </div>
                                   {" "}
                  <div>
                                        <Label>Sort By</Label> {" "}
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value) =>
                        setFilters({ ...filters, sortBy: value })
                      }
                    >
                                           {" "}
                      <SelectTrigger>
                                                <SelectValue />   {" "}
                      </SelectTrigger>{" "}
                                                                 {" "}
                      <SelectContent>
                                               {" "}
                        <SelectItem value="startTime">Start Date</SelectItem>   
                                       {" "}
                        <SelectItem value="prizePool">Prize Pool</SelectItem>   
                                       {" "}
                        <SelectItem value="participants">
                          Participants
                        </SelectItem>
                                               {" "}
                        <SelectItem value="createdAt">Created Date</SelectItem> 
                                         {" "}
                      </SelectContent>
                                         {" "}
                    </Select>
                                     {" "}
                  </div>
                                 {" "}
                </div>
                             {" "}
              </div>
            )}
                     {" "}
          </CardContent>
                 {" "}
        </Card>{" "}
                                {/* Tournaments Table */}       {" "}
        <Card>
                   {" "}
          <CardContent className="pt-6">
                       {" "}
            {isLoading ? (
              <LoadingState message="Loading tournaments..." />
            ) : tournaments.length === 0 ? (
              <EmptyState
                title="No tournaments found"
                description="Create your first tournament to get started."
                action={
                  <Button onClick={() => setShowCreateDialog(true)}>
                                        <Plus className="h-4 w-4 mr-2" />       
                        Create Your First Tournament  {" "}
                  </Button>
                }
                icon={<Trophy className="h-8 w-8" />}
              />
            ) : (
              <>
                               {" "}
                <div className="rounded-md border">
                                   {" "}
                  <Table>
                                       {" "}
                    <TableHeader>
                                           {" "}
                      <TableRow>
                                               {" "}
                        <TableHead className="w-12">
                                                   {" "}
                          <Checkbox
                            checked={
                              selectedTournaments.length ===
                                filteredTournaments.length &&
                              filteredTournaments.length > 0
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTournaments(
                                  filteredTournaments.map((t) => t.id),
                                );
                              } else {
                                setSelectedTournaments([]);
                              }
                            }}
                          />
                                                 {" "}
                        </TableHead>
                                               {" "}
                        <TableHead className="w-[200px]">Tournament</TableHead>
                        <TableHead className="w-[140px]">Game</TableHead>
                        <TableHead className="w-[180px]">Prize Pool</TableHead>
                        <TableHead className="w-[160px]">
                          Participants
                        </TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead className="w-[160px]">Start Date</TableHead>
                        <TableHead className="w-[120px] text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                                         {" "}
                    </TableHeader>
                                       {" "}
                    <TableBody>
                                           {" "}
                      {filteredTournaments.map((tournament) => (
                        <TableRow key={tournament.id}>
                                                   {" "}
                          <TableCell>
                                                       {" "}
                            <Checkbox
                              checked={selectedTournaments.includes(
                                tournament.id,
                              )}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTournaments([
                                    ...selectedTournaments,
                                    tournament.id,
                                  ]);
                                } else {
                                  setSelectedTournaments(
                                    selectedTournaments.filter(
                                      (id) => id !== tournament.id,
                                    ),
                                  );
                                }
                              }}
                            />
                                                     {" "}
                          </TableCell>
                                                   {" "}
                          <TableCell>
                                                       {" "}
                            <div>
                                                           {" "}
                              <p className="font-medium">{tournament.name}</p> 
                                                       {" "}
                              <p className="text-sm text-muted-foreground">
                                {tournament.format}
                              </p>
                                                         {" "}
                            </div>
                                                     {" "}
                          </TableCell>
                                                   {" "}
                          <TableCell>
                            {" "}
                               {" "}
                            <div className="flex items-center gap-2">
                                                           {" "}
                              <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                                                            {tournament.game}   
                                                 {" "}
                            </div>
                                                     {" "}
                          </TableCell>
                                                   {" "}
                          <TableCell>
                                                       {" "}
                            <div>
                                                           {" "}
                              <p className="font-medium">
                                {formatTournamentCurrency(
                                  tournament.prizePool,
                                  tournament.country,
                                )}
                              </p>
                                                           {" "}
                              <p className="text-sm text-muted-foreground">
                                Entry:{" "}
                                {formatTournamentCurrency(
                                  tournament.entryFee,
                                  tournament.country,
                                )}
                              </p>
                                                         {" "}
                            </div>
                                                     {" "}
                          </TableCell>
                                                   {" "}
                          <TableCell>
                                                       {" "}
                            <div>
                                                           {" "}
                              <p className="font-medium">
                                {tournament.currentParticipants}/
                                {tournament.maxParticipants}
                              </p>
                                                           {" "}
                              <Progress
                                value={
                                  (tournament.currentParticipants /
                                    tournament.maxParticipants) *
                                  100
                                }
                                className="w-16 h-2"
                              />
                                                         {" "}
                            </div>
                                                     {" "}
                          </TableCell>
                                                   {" "}
                          <TableCell>
                                                       {" "}
                            <div className="flex items-center gap-2">
                                                           {" "}
                              {getStatusIcon(tournament.status)}             {" "}
                              <Badge
                                className={getStatusColor(tournament.status)}
                              >
                                                               {" "}
                                {tournament.status.charAt(0).toUpperCase() +
                                  tournament.status.slice(1)}
                                                             {" "}
                              </Badge>
                                                         {" "}
                            </div>{" "}
                             {" "}
                          </TableCell>{" "}
                                                                             {" "}
                          <TableCell>
                                                       {" "}
                            <p className="text-sm">
                              {safeFormat(tournament.startTime, "MMM dd, yyyy")}
                            </p>
                                                       {" "}
                            <p className="text-xs text-muted-foreground">
                              {safeFormat(tournament.startTime, "HH:mm", "")}
                            </p>
                                                     {" "}
                          </TableCell>
                                                   {" "}
                          <TableCell>
                                                       {" "}
                            <DropdownMenu>
                                                           {" "}
                              <DropdownMenuTrigger>
                                                               {" "}
                                <Button variant="ghost" size="sm">
                                                                   {" "}
                                  <MoreHorizontal className="h-4 w-4" />       
                                                 {" "}
                                </Button>
                                                             {" "}
                              </DropdownMenuTrigger>
                                                           {" "}
                              <DropdownMenuContent align="end">
                                                               {" "}
                                <DropdownMenuLabel>Actions</DropdownMenuLabel> 
                                                           {" "}
                                <DropdownMenuSeparator />       {" "}
                                <DropdownMenuItem
                                  onClick={() => {
                                    // Using a temporary direct state update for the sheet open flow
                                    setSelectedTournament(tournament);
                                    setShowTournamentDetails(true); // Optionally navigate for a persistent URL
                                    // setLocation(`/tournaments/${tournament.id}`);
                                  }}
                                >
                                                                   {" "}
                                  <Eye className="h-4 w-4 mr-2" />             
                                        View Details                  {" "}
                                </DropdownMenuItem>{" "}
                                               {" "}
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleEditTournament(tournament)
                                  }
                                >
                                                                   {" "}
                                  <Edit className="h-4 w-4 mr-2" />             
                                        Edit Tournament                    
                                   {" "}
                                </DropdownMenuItem>
                                                               {" "}
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDuplicateTournament(tournament)
                                  }
                                >
                                                                   {" "}
                                  <Copy className="h-4 w-4 mr-2" />             
                                        Duplicate                {" "}
                                </DropdownMenuItem>
                                                               {" "}
                                <DropdownMenuSeparator />       {" "}
                                {/* Dynamic Status Actions */}                 
                                   {" "}
                                {(tournament.status === "draft" ||
                                  tournament.status === "cancelled") && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(
                                        tournament.id,
                                        "upcoming",
                                        tournament.title,
                                      )
                                    }
                                  >
                                                                       {" "}
                                    <Play className="h-4 w-4 mr-2" />           
                                                Publish / Reopen                
                                                 {" "}
                                  </DropdownMenuItem>
                                )}
                                                               {" "}
                                {tournament.status === "upcoming" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(
                                        tournament.id,
                                        "live",
                                        tournament.title,
                                      )
                                    }
                                  >
                                                                       {" "}
                                    <Zap className="h-4 w-4 mr-2" />           
                                                Start Tournament                
                                                 {" "}
                                  </DropdownMenuItem>
                                )}
                                                               {" "}
                                {(tournament.status === "live" ||
                                  tournament.status === "ongoing") && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(
                                        tournament.id,
                                        "completed",
                                        tournament.title,
                                      )
                                    }
                                  >
                                                                       {" "}
                                    <StopCircle className="h-4 w-4 mr-2" />     
                                                            End Tournament      
                                                               {" "}
                                  </DropdownMenuItem>
                                )}
                                                               {" "}
                                {/* Match Generation and Prize Distribution should be available for specific statuses */}
                                                               {" "}
                                {(tournament.status === "live" ||
                                  tournament.status === "upcoming") && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleGenerateMatches(
                                        tournament.id,
                                        tournament.title,
                                      )
                                    }
                                  >
                                                                       {" "}
                                    <Gamepad2 className="h-4 w-4 mr-2" />       
                                                        Generate Matches        
                                                             {" "}
                                  </DropdownMenuItem>
                                )}
                                                               {" "}
                                {tournament.status === "completed" && (
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault(); // stops dropdown from closing
                                      setSelectedTournamentId(tournament.id); // 🔥 STORE THE ID
                                      setOpenResultPopup(true);
                                    }}
                                  >
                                    <Award className="h-4 w-4 mr-2" />
                                    Submit Result
                                  </DropdownMenuItem>
                                )}
                                <Dialog
                                  open={openResultPopup}
                                  onOpenChange={setOpenResultPopup}
                                >
                                  <DialogContent className="sm:max-w-lg">
                                    <DialogHeader>
                                      <DialogTitle>
                                        Upload Leaderboard Image
                                      </DialogTitle>
                                    </DialogHeader>

                                    {/* content later */}
                                    <GeminiImageAnalyze
                                      tournamentId={selectedTournamentId}
                                    />
                                  </DialogContent>
                                </Dialog>
                                                               {" "}
                                {tournament.status === "completed" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDistributePrizes(
                                        tournament.id,
                                        tournament.title,
                                      )
                                    }
                                  >
                                                                       {" "}
                                    <Award className="h-4 w-4 mr-2" />         
                                                    Distribute Prizes          
                                                           {" "}
                                  </DropdownMenuItem>
                                )}
                                                               {" "}
                                <DropdownMenuSeparator />       {" "}
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(
                                      tournament.id,
                                      "cancelled",
                                      tournament.title,
                                    )
                                  }
                                  className="text-red-600"
                                >
                                                                   {" "}
                                  <X className="h-4 w-4 mr-2" />               
                                    Cancel          {" "}
                                </DropdownMenuItem>
                                                               {" "}
                                <DropdownMenuSeparator />       {" "}
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDeleteTournament(
                                      tournament.id,
                                      tournament.title,
                                    )
                                  }
                                  className="text-red-600"
                                >
                                                                   {" "}
                                  <Trash2 className="h-4 w-4 mr-2" />           
                                            Delete              {" "}
                                </DropdownMenuItem>
                                                             {" "}
                              </DropdownMenuContent>
                                                         {" "}
                            </DropdownMenu>
                                                     {" "}
                          </TableCell>
                                                 {" "}
                        </TableRow>
                      ))}
                                         {" "}
                    </TableBody>
                                     {" "}
                  </Table>
                                 {" "}
                </div>
                               {" "}
                {filteredTournaments.length === 0 && (
                  <div className="text-center py-10">
                                       {" "}
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                       {" "}
                    <h3 className="text-lg font-medium">
                      No tournaments found
                    </h3>
                                       {" "}
                    <p className="text-muted-foreground">
                      Try adjusting your search or filters.
                    </p>
                                       {" "}
                    <Button
                      className="mt-4"
                      onClick={() => setShowCreateDialog(true)}
                    >
                                            <Plus className="h-4 w-4 mr-2" />   
                                    Create Your First Tournament        {" "}
                    </Button>
                                     {" "}
                  </div>
                )}
                             {" "}
              </>
            )}
                     {" "}
          </CardContent>
                 {" "}
        </Card>{" "}
                               {" "}
        {/* Tournament Details Sheet (Kept for completeness, though ViewDialog is available) */}
               {" "}
        <Sheet
          key="tournament-details"
          open={showTournamentDetails}
          onOpenChange={setShowTournamentDetails}
        >
                   {" "}
          <SheetContent
            side="right"
            className="w-full max-w-2xl overflow-y-auto"
          >
                       {" "}
            <SheetHeader>
                            <SheetTitle>Tournament Details</SheetTitle>   {" "}
              <SheetDescription>
                                Complete tournament information and management
                options              {" "}
              </SheetDescription>
                         {" "}
            </SheetHeader>
                       {" "}
            {selectedTournament && (
              <div className="mt-6 space-y-6">
                                {/* Tournament Header */}               {" "}
                <div className="space-y-4">
                                   {" "}
                  <div className="flex items-center justify-between">
                                       {" "}
                    <h3 className="text-xl font-semibold">
                      {selectedTournament.title}
                    </h3>
                                       {" "}
                    <Badge
                      className={getStatusColor(selectedTournament.status)}
                    >
                                           {" "}
                      {selectedTournament.status.charAt(0).toUpperCase() +
                        selectedTournament.status.slice(1)}
                                         {" "}
                    </Badge>
                                     {" "}
                  </div>
                                   {" "}
                  <p className="text-muted-foreground">
                    {selectedTournament.description}
                  </p>
                                 {" "}
                </div>
                               {" "}
                <Tabs defaultValue="overview" className="w-full">
                                   {" "}
                  <TabsList className="grid w-full grid-cols-4">
                                       {" "}
                    <TabsTrigger value="overview">Overview</TabsTrigger>       
                       {" "}
                    <TabsTrigger value="participants">Participants</TabsTrigger>
                                       {" "}
                    <TabsTrigger value="brackets">Brackets</TabsTrigger>       
                        <TabsTrigger value="analytics">Analytics</TabsTrigger> 
                             {" "}
                  </TabsList>
                                   {" "}
                  <TabsContent value="overview" className="space-y-4">
                                       {" "}
                    <Card>
                                           {" "}
                      <CardHeader>
                                               {" "}
                        <CardTitle className="text-lg">
                          Tournament Information
                        </CardTitle>
                                             {" "}
                      </CardHeader>
                                           {" "}
                      <CardContent className="space-y-3">
                                               {" "}
                        <div className="grid grid-cols-2 gap-4">
                                                   {" "}
                          <div>
                                                       {" "}
                            <p className="text-sm text-muted-foreground">
                              Game
                            </p>
                                                       {" "}
                            <p className="font-medium">
                              {selectedTournament.game}
                            </p>
                                                     {" "}
                          </div>
                                                   {" "}
                          <div>
                                                       {" "}
                            <p className="text-sm text-muted-foreground">
                              Format
                            </p>
                                                       {" "}
                            <p className="font-medium">
                              {selectedTournament.format}
                            </p>
                                                     {" "}
                          </div>
                                                   {" "}
                          <div>
                                                       {" "}
                            <p className="text-sm text-muted-foreground">
                              Prize Pool
                            </p>
                                                       {" "}
                            <p className="font-medium">
                              {formatTournamentCurrency(
                                selectedTournament.prizePool,
                                selectedTournament.country,
                              )}
                            </p>
                                                     {" "}
                          </div>
                                                   {" "}
                          <div>
                                                       {" "}
                            <p className="text-sm text-muted-foreground">
                              Entry Fee
                            </p>
                                                       {" "}
                            <p className="font-medium">
                              {formatTournamentCurrency(
                                selectedTournament.entryFee,
                                selectedTournament.country,
                              )}
                            </p>
                                                     {" "}
                          </div>
                                                   {" "}
                          <div>
                                                       {" "}
                            <p className="text-sm text-muted-foreground">
                              Participants
                            </p>
                                                       {" "}
                            <p className="font-medium">
                              {selectedTournament.currentParticipants}/
                              {selectedTournament.maxParticipants}
                            </p>
                                                     {" "}
                          </div>
                                                   {" "}
                          <div>
                                                       {" "}
                            <p className="text-sm text-muted-foreground">
                              Organizer
                            </p>
                                                       {" "}
                            <p className="font-medium">
                              {selectedTournament.organizer}
                            </p>
                                                     {" "}
                          </div>
                                                 {" "}
                        </div>
                                             {" "}
                      </CardContent>
                                         {" "}
                    </Card>
                                       {" "}
                    <Card>
                                           {" "}
                      <CardHeader>
                                               {" "}
                        <CardTitle className="text-lg">Schedule</CardTitle>     
                                 {" "}
                      </CardHeader>
                                           {" "}
                      <CardContent className="space-y-3">
                                               {" "}
                        <div>
                                                   {" "}
                          <p className="text-sm text-muted-foreground">
                            Registration Deadline
                          </p>
                                                   {" "}
                          <p className="font-medium">
                            {safeFormat(
                              selectedTournament.registrationDeadline,
                              "MMM dd, yyyy HH:mm",
                            )}
                          </p>
                                                 {" "}
                        </div>
                                               {" "}
                        <div>
                                                   {" "}
                          <p className="text-sm text-muted-foreground">
                            Start Date
                          </p>
                                                   {" "}
                          <p className="font-medium">
                            {safeFormat(
                              selectedTournament.startTime,
                              "MMM dd, yyyy HH:mm",
                            )}
                          </p>
                                                 {" "}
                        </div>
                                               {" "}
                        <div>
                                                   {" "}
                          <p className="text-sm text-muted-foreground">
                            End Date
                          </p>
                                                   {" "}
                          <p className="font-medium">
                            {safeFormat(
                              selectedTournament.endDate,
                              "MMM dd, yyyy HH:mm",
                            )}
                          </p>
                                                 {" "}
                        </div>
                                               {" "}
                        <div>
                                                   {" "}
                          <p className="text-sm text-muted-foreground">Type</p> 
                                               {" "}
                          <p className="font-medium">
                            {selectedTournament.isOnline ? "Online" : "Offline"}
                          </p>
                                                 {" "}
                        </div>
                                               {" "}
                        {selectedTournament.location && (
                          <div>
                                                       {" "}
                            <p className="text-sm text-muted-foreground">
                              Location
                            </p>
                                                       {" "}
                            <p className="font-medium">
                              {selectedTournament.location}
                            </p>
                                                     {" "}
                          </div>
                        )}
                                             {" "}
                      </CardContent>
                                         {" "}
                    </Card>
                                     {" "}
                  </TabsContent>
                                   {" "}
                  <TabsContent value="participants">
                                       {" "}
                    <Card>
                                           {" "}
                      <CardHeader>
                                               {" "}
                        <CardTitle className="text-lg">
                          Registered Participants
                        </CardTitle>
                                             {" "}
                      </CardHeader>
                                           {" "}
                      <CardContent>
                                               {" "}
                        <p className="text-muted-foreground">
                          Participant management interface will be displayed
                          here.
                        </p>
                                             {" "}
                      </CardContent>
                                         {" "}
                    </Card>
                                     {" "}
                  </TabsContent>
                                   {" "}
                  <TabsContent value="brackets">
                                       {" "}
                    <Card>
                                           {" "}
                      <CardHeader>
                                               {" "}
                        <CardTitle className="text-lg">
                          Tournament Brackets
                        </CardTitle>
                                             {" "}
                      </CardHeader>
                                           {" "}
                      <CardContent>
                                               {" "}
                        <p className="text-muted-foreground">
                          Bracket management and match scheduling interface will
                          be displayed here.
                        </p>
                                             {" "}
                      </CardContent>
                                         {" "}
                    </Card>
                                     {" "}
                  </TabsContent>
                                   {" "}
                  <TabsContent value="analytics">
                                       {" "}
                    <Card>
                                           {" "}
                      <CardHeader>
                                               {" "}
                        <CardTitle className="text-lg">
                          Tournament Analytics
                        </CardTitle>
                                             {" "}
                      </CardHeader>
                                           {" "}
                      <CardContent>
                                               {" "}
                        {selectedTournament.analytics ? (
                          <div className="space-y-4">
                                                       {" "}
                            <div className="grid grid-cols-2 gap-4">
                                                           {" "}
                              <div>
                                                               {" "}
                                <p className="text-sm text-muted-foreground">
                                  Registrations
                                </p>
                                                               {" "}
                                <p className="text-2xl font-bold">
                                  {selectedTournament.analytics.registrations}
                                </p>
                                                             {" "}
                              </div>
                                                           {" "}
                              <div>
                                                               {" "}
                                <p className="text-sm text-muted-foreground">
                                  Completion Rate
                                </p>
                                                               {" "}
                                <p className="text-2xl font-bold">
                                  {selectedTournament.analytics.completionRate}%
                                </p>
                                                             {" "}
                              </div>
                                                         {" "}
                            </div>
                                                     {" "}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">
                            Analytics data will be available once the tournament
                            begins.
                          </p>
                        )}
                                             {" "}
                      </CardContent>
                                         {" "}
                    </Card>
                                     {" "}
                  </TabsContent>
                                 {" "}
                </Tabs>
                             {" "}
              </div>
            )}
                     {" "}
          </SheetContent>
                 {" "}
        </Sheet>
             {" "}
      </div>{" "}
                 {" "}
      {/* Confirmation Dialog - Note: useConfirmationDialog already provides a centralized dialog, so this standalone AlertDialog seems redundant but is kept to maintain the original structure's redundancy if intended */}
           {" "}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
               {" "}
        <AlertDialogContent>
                   {" "}
          <AlertDialogHeader>
                       {" "}
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle> {" "}
            <AlertDialogDescription>
                            {confirmAction?.description}           {" "}
            </AlertDialogDescription>
                     {" "}
          </AlertDialogHeader>
                   {" "}
          <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>           {" "}
            <AlertDialogAction
              onClick={() => {
                confirmAction?.action();
                setShowConfirmDialog(false);
              }}
              className={
                confirmAction?.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
                            Confirm            {" "}
            </AlertDialogAction>
                     {" "}
          </AlertDialogFooter>
                 {" "}
        </AlertDialogContent>
             {" "}
      </AlertDialog>
                  {/* Create Tournament Dialog */}     {" "}
      <CreateTournamentDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) onSuccessRefetch(); // Refetch after closing successful creation dialog
        }}
      />
                  {/* Edit Tournament Dialog */}     {" "}
      {selectedTournament && (
        <EditTournamentDialog
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) onSuccessRefetch(); // Refetch after closing successful edit dialog
          }}
          tournament={selectedTournament as any}
        />
      )}
            {/* View Tournament Dialog */}     {" "}
      {selectedTournament && (
        <ViewTournamentDialog
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
          tournament={selectedTournament as any}
        />
      )}
                  {/* Confirmation Dialog from hook */}
            <ConfirmationDialog />   {" "}
    </ErrorBoundary>
  );
};

export default Tournaments;
