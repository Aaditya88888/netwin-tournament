import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SearchIcon, Plus, Calculator, X } from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import React from "react";
import { Input } from "@/components/ui/input";
import { Tournament, Match, MatchResult } from "@/lib/firebase/models";

import {Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Match result form schema
const matchResultSchema = z.object({
  matchId: z.number(),
  results: z.array(
    z.object({
      id: z.union([z.number(), z.string()]).optional(),
      teamId: z.number().optional(),
      teamName: z.string(),
      rank: z.number(),
      kills: z.number(),
      survivalTime: z.string(),
      totalPoints: z.number(),
      prize: z.number(),
      isRewarded: z.boolean().default(false),
    })
  ),
});

type MatchResultFormValues = z.infer<typeof matchResultSchema>;

type ResultScreenshot = {
  id: number;
  url: string;
  alt: string;
};

type MatchResultDialogProps = {
  match: Tournament;
  results?: MatchResult[];
  screenshots?: ResultScreenshot[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MatchResultDialog({
  match,
  results = [],
  screenshots = [],
  open,
  onOpenChange,
}: MatchResultDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  // Initialize results if they don't exist
  const initialResults = results.length
    ? results
    : [
        { teamId: 1, teamName: "Team Dominator", rank: 1, kills: 12, survivalTime: "31:45", totalPoints: 32, prize: 5000, isRewarded: false },
        { teamId: 2, teamName: "Savage Squad", rank: 2, kills: 8, survivalTime: "28:12", totalPoints: 26, prize: 3000, isRewarded: false },
        { teamId: 3, teamName: "Elite Warriors", rank: 3, kills: 10, survivalTime: "25:50", totalPoints: 22, prize: 1500, isRewarded: false },
      ];
  const form = useForm<MatchResultFormValues>({
    resolver: zodResolver(matchResultSchema),
    defaultValues: {
      matchId: Number(match.id),
      results: initialResults,
    },
  });

  // Add an empty team row
  const addTeamRow = () => {
    const results = form.getValues("results");
    const newTeamRank = results.length + 1;
    
    form.setValue("results", [
      ...results,
      {
        teamId: newTeamRank,
        teamName: `Team ${newTeamRank}`,
        rank: newTeamRank,
        kills: 0,
        survivalTime: "00:00",
        totalPoints: 0,
        prize: 0,
        isRewarded: false,
      },
    ]);
  };
  // Calculate points based on kills and rank
  const calculatePoints = () => {
    const results = form.getValues("results");
    
    // Points system: 
    // Placement points: 1st = 20, 2nd = 14, 3rd = 10, 4th = 7, 5th = 5, 6-10 = 2, 11-15 = 1
    // Kill points: 1 point per kill
    const updatedResults = results.map((result) => {
      let placementPoints = 0;
      
      if (result.rank === 1) placementPoints = 20;
      else if (result.rank === 2) placementPoints = 14;
      else if (result.rank === 3) placementPoints = 10;
      else if (result.rank === 4) placementPoints = 7;
      else if (result.rank === 5) placementPoints = 5;
      else if (result.rank >= 6 && result.rank <= 10) placementPoints = 2;
      else if (result.rank >= 11 && result.rank <= 15) placementPoints = 1;
      
      const totalPoints = placementPoints + result.kills;
      
      return {
        ...result,
        totalPoints,
      };
    });
    
    form.setValue("results", updatedResults);
  };

  // Calculate prizes based on placement and kill rewards
  const calculatePrizes = () => {
    const results = form.getValues("results");
    const prizePool = match.prizePool || 0;
    const killReward = match.killReward || 0;
    const rewardsDistribution = match.rewardsDistribution || [];

    const updatedResults = results.map((result) => {
      // Calculate placement prize based on position and percentage
      let placementPrize = 0;
      const rewardForPosition = rewardsDistribution.find(r => r.position === result.rank);
      if (rewardForPosition) {
        placementPrize = (prizePool * rewardForPosition.percentage) / 100;
      }

      // Calculate kill prize
      const killPrize = result.kills * killReward;

      // Total prize is placement prize + kill prize
      const totalPrize = placementPrize + killPrize;

      return {
        ...result,
        prize: Math.round(totalPrize),
      };
    });

    form.setValue("results", updatedResults);
  };

  const saveResultsMutation = useMutation({
    mutationFn: async (values: MatchResultFormValues) => {
      // First update match status to 'completed'
      await apiRequest("PATCH", `/matches/${match.id}`, {
        resultSubmitted: true,
        resultVerified: true,
        verifiedBy: 1, // Admin ID
        verifiedAt: new Date().toISOString(),
        status: "completed",
      });
      
      // Then save each result
      const savePromises = values.results.map(result => {        if (result.id) {
          // Update existing result
          return apiRequest("PATCH", `/match-results/${result.id}`, result);
        } else {
          // Create new result
          return apiRequest("POST", "/match-results", {
            ...result,
            matchId: values.matchId
          });
        }
      });
      
      await Promise.all(savePromises);
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Results saved",
        description: "Match results have been saved and rewards distributed.",
      });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['/matches'] });
      queryClient.invalidateQueries({ queryKey: [`/matches/${match.id}/results`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to save results",
        description: error.message || "There was an error saving the match results.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: MatchResultFormValues) => {
    saveResultsMutation.mutate(values);
  };

  // Mock screenshots for demonstration
  const demoScreenshots = [
    {
      id: 1,
      url: "https://pixabay.com/get/g66ffdd4809c5802a0c39406e80dc1bb4e461221b4bbc629cadb4f8010bd763fe2df764ed2ce970c4d17214be95419901f51c09e2df4b0acb187e34196f8861dd_1280.jpg",
      alt: "Match Result Screenshot 1"
    },
    {
      id: 2,
      url: "https://pixabay.com/get/gf7cfa540a1729897b85aa95f76ff72a1101bd040f7fd35ca91a5abfb4a82d8e4c92efd2be85575228d533a305dcbb1fc1c3ce6351e2a6cbfe527ecec7bc0e602_1280.jpg",
      alt: "Match Result Screenshot 2"
    },
    {
      id: 3,
      url: "https://pixabay.com/get/gbefc7e9cf0cf7d490829c96f3d5b2862bcab9cac68383f560202bfd227b81a8bd7bece577473a42e9295ac17ecf5a257becac6a68fc4be597a14a1038a656af5_1280.jpg",
      alt: "Match Result Screenshot 3"
    },
    {
      id: 4,
      url: "https://pixabay.com/get/g7b32acdd8e4b29f0a51fcf4dd94e13a0c4efe1aa4ddf5a3fd2db28b29aee097fec23695bf69a7c04ed75afe0a9d2d9db63c1c3bc16db3ac0cc03a01b9193c40d_1280.jpg",
      alt: "Match Result Screenshot 4"
    }
  ];

  const allScreenshots = screenshots.length ? screenshots : demoScreenshots;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium flex items-center">
            Manage Match Results
          </DialogTitle>
          <DialogDescription>
            Verify and input the results for this match.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{match.title || match.id} - Tournament</h2>
              <p className="text-sm text-gray-400">
                Status: {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
              </p>
            </div>
            <span className={`status-badge ${match.status === 'ongoing' ? 'status-badge-live' : 'status-badge-completed'}`}>
              {match.status === 'ongoing' ? (
                <>
                  <span className="mr-1">●</span> Live
                </>
              ) : (
                'Completed'
              )}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Result Screenshots</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {allScreenshots.map((screenshot) => (
              <div key={screenshot.id} className="relative group">
                <img
                  src={screenshot.url}
                  alt={screenshot.alt}
                  className="w-full h-32 object-cover rounded-md cursor-pointer"
                  onClick={() => setSelectedScreenshot(screenshot.url)}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 flex items-center justify-center transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="p-1.5 bg-card rounded-full text-white opacity-0 group-hover:opacity-100"
                    onClick={() => setSelectedScreenshot(screenshot.url)}
                  >
                    <SearchIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit as any)}>
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Enter Results</h4>
            <div className="bg-card/80 rounded-lg p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="w-16">Kills</TableHead>
                      <TableHead className="w-24">Survival Time</TableHead>
                      <TableHead className="w-24">Total Points</TableHead>
                      <TableHead className="w-24">Prize (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.watch("results").map((result, index) => (
                      <TableRow key={index} className="border-gray-700">
                        <TableCell>
                          <Input
                            type="number"
                            className="w-12 bg-card/80 text-center"
                            value={result.rank}
                            onChange={(e) => {
                              const updatedResults = [...form.getValues("results")];
                              updatedResults[index].rank = parseInt(e.target.value);
                              form.setValue("results", updatedResults);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">                            <div className="flex -space-x-1 overflow-hidden mr-2">
                              {/* Mock player images */}
                              <div className="h-6 w-6 rounded-full bg-primary text-xs flex items-center justify-center">P1</div>
                              <div className="h-6 w-6 rounded-full bg-secondary text-xs flex items-center justify-center">P2</div>
                              <div className="h-6 w-6 rounded-full bg-accent text-xs flex items-center justify-center">P3</div>
                              <div className="h-6 w-6 rounded-full bg-destructive text-xs flex items-center justify-center">P4</div>
                            </div>
                            <Input
                              className="bg-card/80"
                              value={result.teamName}
                              onChange={(e) => {
                                const updatedResults = [...form.getValues("results")];
                                updatedResults[index].teamName = e.target.value;
                                form.setValue("results", updatedResults);
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-16 bg-card/80 text-center"
                            value={result.kills}
                            onChange={(e) => {
                              const updatedResults = [...form.getValues("results")];
                              updatedResults[index].kills = parseInt(e.target.value);
                              form.setValue("results", updatedResults);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="w-20 bg-card/80 text-center"
                            value={result.survivalTime}
                            onChange={(e) => {
                              const updatedResults = [...form.getValues("results")];
                              updatedResults[index].survivalTime = e.target.value;
                              form.setValue("results", updatedResults);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-white text-center">
                          {result.totalPoints}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20 bg-card/80 text-center text-accent"
                            value={result.prize}
                            onChange={(e) => {
                              const updatedResults = [...form.getValues("results")];
                              updatedResults[index].prize = parseInt(e.target.value);
                              form.setValue("results", updatedResults);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTeamRow}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Team
                </Button>                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={calculatePoints}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Auto-Calculate Points
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={calculatePrizes}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Auto-Calculate Prizes
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Save Draft
            </Button>
            <Button 
              type="submit" 
              disabled={saveResultsMutation.isPending}
            >
              {saveResultsMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                "Finalize & Distribute Rewards"
              )}
            </Button>
          </DialogFooter>
        </form>

        {selectedScreenshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={() => setSelectedScreenshot(null)}>
            <div className="max-w-4xl max-h-screen p-2" onClick={(e) => e.stopPropagation()}>
              <img src={selectedScreenshot} alt="Screenshot fullview" className="max-w-full max-h-[90vh] object-contain" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white"
                onClick={() => setSelectedScreenshot(null)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
