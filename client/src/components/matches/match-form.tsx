import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTournamentSchema } from "../../../../server/shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { queryClient } from "@/lib/queryClient";

import {Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 1. Define a plain interface for your form values
interface FormValues {
  name: string;
  description?: string;
  gameType: string;
  matchType: string;
  map: string;
  startTime: string;
  entryFee: number;
  prizePool: number;
  maxTeams: number;
  status: string;
  rules?: string;
  bannerImage?: string;
  firstPrize: number;
  perKillReward: number;
}

interface MatchFormProps {
  tournament?: Partial<FormValues> & { id?: string };
  isEditing?: boolean;
}

const MatchForm = ({ tournament, isEditing = false }: MatchFormProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // --- 2. Prepare default values ---
  // Safely parse startTime for defaultValues
  function getDefaultStartTime() {
    if (tournament?.startTime) {
      const d = new Date(tournament.startTime);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 16);
      }
    }
    // fallback: tomorrow
    return new Date(Date.now() + 86400000).toISOString().slice(0, 16);
  }

  const defaultValues: FormValues = {
    name: tournament?.name ?? "",
    description: tournament?.description ?? "",
    gameType: tournament?.gameType ?? "BGMI",
    matchType: tournament?.matchType ?? "Squad",
    map: tournament?.map ?? "Erangel",
    startTime: tournament?.startTime ?? new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    entryFee: tournament?.entryFee ?? 99,
    prizePool: tournament?.prizePool ?? 10000,
    maxTeams: tournament?.maxTeams ?? 100,
    status: tournament?.status ?? "upcoming",
    rules: tournament?.rules ?? "Standard tournament rules apply. Cheating will result in disqualification.",
    bannerImage: tournament?.bannerImage ?? "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    firstPrize: tournament?.firstPrize ?? 5000,
    perKillReward: tournament?.perKillReward ?? 50,
  };

  // --- 3. Use the flat interface for useForm ---
  const form = useForm<FormValues>({
    resolver: zodResolver(insertTournamentSchema as any), // use 'as any' to break the type chain
    defaultValues,
  });

  // --- 5. Mutation ---
  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (isEditing && tournament?.id) {
        return apiRequest("PATCH", `/tournaments/${tournament.id}`, data);
      } else {
        return apiRequest("POST", "/tournaments", data);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/tournaments'] });
      toast({
        title: isEditing ? "Tournament Updated" : "Tournament Created",
        description: `The tournament has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      navigate("/matches");
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} tournament. Please try again.`,
        variant: "destructive",
      });
    },
  });

  // --- 6. Submit handler ---
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    setIsSaving(true);

    // Safely convert startTime to ISO string
    let isoStartTime = "";
    if (data.startTime) {
      const d = new Date(data.startTime);
      if (!isNaN(d.getTime())) {
        isoStartTime = d.toISOString();
      }
    }

    mutation.mutate({
      ...data,
      startTime: isoStartTime,
      entryFee: Number(data.entryFee),
      prizePool: Number(data.prizePool),
      maxTeams: Number(data.maxTeams),
      description: data.description ?? "",
      rules: data.rules ?? "",
      bannerImage: data.bannerImage ?? "",
      firstPrize: Number(data.firstPrize),
      perKillReward: Number(data.perKillReward),
    });
  };

  // Dropdown options
  const gameTypes = ["BGMI", "PUBG Mobile"];
  const matchTypes = ["Solo", "Duo", "Squad"];
  const maps = ["Erangel", "Miramar", "Sanhok", "Vikendi", "Livik"];
  const statuses = ["upcoming", "live", "completed", "cancelled"];

  // Auto-calculate firstPrize and perKillReward when entryFee or maxTeams change
  useEffect(() => {
    const entryFee = Number(form.watch('entryFee'));
    const maxTeams = Number(form.watch('maxTeams'));
    const totalRevenue = entryFee * maxTeams;
    const prizePool = totalRevenue * 0.8; // 80% of revenue is prize pool
    const firstPrize = Math.round(prizePool * 0.4); // 40% for 1st prize
    const totalKills = maxTeams * 4 - 4; // Example: squad mode, 4 players per team
    const perKillReward = totalKills > 0 ? Math.floor((prizePool * 0.6) / totalKills) : 0;
    form.setValue('prizePool', prizePool);
    form.setValue('firstPrize', firstPrize);
    form.setValue('perKillReward', perKillReward);
  }, [form.watch('entryFee'), form.watch('maxTeams')]);

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-xl font-game">
          {isEditing ? "Edit Tournament" : "Create New Tournament"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tournament Details</h3>
              <FormField
                control={form.control}
                name={"name"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tournament name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter tournament description"
                        className="min-h-[100px]"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gameType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select game type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {gameTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="matchType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select match type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {matchTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="map"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Map</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select map" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {maps.map((map) => (
                            <SelectItem key={map} value={map}>
                              {map}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={
                            typeof field.value === "string"
                              ? (() => {
                                  const d = new Date(field.value);
                                  return !isNaN(d.getTime())
                                    ? d.toISOString().slice(0, 16)
                                    : "";
                                })()
                              : ""
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="entryFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Fee (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prizePool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prize Pool (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxTeams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Teams</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {isEditing && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="rules"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rules & Guidelines</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter tournament rules"
                        className="min-h-[100px]"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bannerImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner Image URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/banner.jpg"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a URL for the tournament banner image
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Rewards Distribution</h3>
              <p className="text-sm text-muted-foreground">
                Set the percentage of the prize pool for each position.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstPrize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Prize (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="perKillReward"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Per Kill Reward (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/matches")}
                type="button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || mutation.isPending}
              >
                {isSaving || mutation.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Update Tournament"
                  : "Create Tournament"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default MatchForm;
