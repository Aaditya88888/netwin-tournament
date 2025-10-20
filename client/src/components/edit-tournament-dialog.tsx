import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Calendar, Trophy, Calculator, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Separator } from "@/components/ui/separator";
import { usePrizeDistribution } from "@/hooks/usePrizeDistribution";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Country options for selection with currency info
const COUNTRIES = [
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦' },
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$' },
];

// Helper function to get currency symbol for a country
const getCurrencyInfo = (countryName: string) => {
  const country = COUNTRIES.find(c => c.name === countryName);
  return country ? { currency: country.currency, symbol: country.symbol } : { currency: 'INR', symbol: '₹' };
};
const GAME_OPTIONS = [
  { value: 'BGMI', label: 'BGMI', country: 'India' },
  { value: 'PUBG Mobile', label: 'PUBG Mobile', country: 'all' },
  { value: 'Free Fire', label: 'Free Fire', country: 'all' },
  { value: 'COD Mobile', label: 'COD Mobile', country: 'all' },
];
const MAP_OPTIONS = {
  'BGMI': [
    { value: 'Erangel', label: 'Erangel' },
    { value: 'Miramar', label: 'Miramar' },
    { value: 'Sanhok', label: 'Sanhok' },
    { value: 'Vikendi', label: 'Vikendi' },
    { value: 'Livik', label: 'Livik' },
  ],
  'PUBG Mobile': [
    { value: 'Erangel', label: 'Erangel' },
    { value: 'Miramar', label: 'Miramar' },
    { value: 'Sanhok', label: 'Sanhok' },
    { value: 'Vikendi', label: 'Vikendi' },
    { value: 'Livik', label: 'Livik' },
  ],
  'Free Fire': [
    { value: 'Bermuda', label: 'Bermuda' },
    { value: 'Kalahari', label: 'Kalahari' },
    { value: 'Purgatory', label: 'Purgatory' },
    { value: 'Alpine', label: 'Alpine' },
    { value: 'NeXTerra', label: 'NeXTerra' },
  ],
  'COD Mobile': [
    { value: 'Isolated', label: 'Isolated' },
    { value: 'Blackout', label: 'Blackout' },
    { value: 'Alcatraz', label: 'Alcatraz' },
    { value: 'Rebirth', label: 'Rebirth' },
  ],
};
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  gameType: z.string().min(1, "Game type is required"),
  matchType: z.string().min(1, "Match type is required"),
  map: z.string().min(1, "Map is required"),
  startTime: z.date(),
  entryFee: z.number().min(0, "Entry fee must be 0 or greater"),
  totalPlayers: z.number().min(1, "Must have at least 1 player"),
  status: z.string().default("upcoming"),
  description: z.string().optional(),
  rules: z.string().optional(),
  bannerImage: z.string().optional(),
  roomId: z.string().optional(),
  roomPassword: z.string().optional(),
  companyCommissionPercentage: z.number().min(0).max(100, "Commission must be between 0-100%"),
  firstPrizePercentage: z.number().min(0, "1st Prize must be 0 or greater"),
  perKillRewardPercentage: z.number().optional(),
  tierOneReward: z.number().min(0, "Per Kill Reward must be 0 or greater"),
  country: z.string().min(1, 'Country is required'),
});

type FormValues = z.infer<typeof formSchema>;

type EditTournamentDialogProps = {
  tournament: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditTournamentDialog({ tournament, open, onOpenChange }: EditTournamentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [autoMode, setAutoMode] = useState({ firstPrize: true, perKillReward: true });
  const [currentCurrency, setCurrentCurrency] = useState('INR');
  const [currentCurrencySymbol, setCurrentCurrencySymbol] = useState('₹');
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: tournament?.title || "",
      gameType: tournament?.gameType || "BGMI",
      matchType: tournament?.matchType || "Squad",
      map: tournament?.map || "Erangel",
      startTime: tournament?.startTime ? new Date(tournament.startTime) : new Date(),
      entryFee: tournament?.entryFee || 10,
      totalPlayers: tournament?.totalPlayers || 100,
      description: tournament?.description || "",
      bannerImage: tournament?.bannerImage || "",
      status: tournament?.status || "upcoming",
      rules: tournament?.rules || "",
      roomId: tournament?.roomId || "",
      roomPassword: tournament?.roomPassword || "",
      companyCommissionPercentage: tournament?.companyCommissionPercentage || 10,
      firstPrizePercentage: tournament?.firstPrizePercentage || 0,
      tierOneReward: tournament?.tierOneReward || 0,
      country: tournament?.country || 'India',
    },
  });
  
  // Reset form values when tournament prop changes
  useEffect(() => {
    if (tournament && open) {
      form.reset({
        title: tournament.title || "",
        gameType: tournament.gameType || "BGMI",
        matchType: tournament.matchType || "Squad",
        map: tournament.map || "Erangel",
        startTime: tournament.startTime ? new Date(tournament.startTime) : new Date(),
        entryFee: tournament.entryFee || 10,
        totalPlayers: tournament.totalPlayers || 100,
        description: tournament.description || "",
        bannerImage: tournament.bannerImage || "",
        status: tournament.status || "upcoming",
        rules: tournament.rules || "",
        roomId: tournament.roomId || "",
        roomPassword: tournament.roomPassword || "",
        companyCommissionPercentage: tournament.companyCommissionPercentage || 10,
        firstPrizePercentage: tournament.firstPrizePercentage || 0,
        tierOneReward: tournament.tierOneReward || 0,
        country: tournament.country || 'India',
      });
      
      // Initialize currency based on tournament country
      const countryName = tournament.country || 'India';
      const currencyInfo = getCurrencyInfo(countryName);
      setCurrentCurrency(currencyInfo.currency);
      setCurrentCurrencySymbol(currencyInfo.symbol);
      
      // Reset auto mode
      setAutoMode({ firstPrize: true, perKillReward: true });
    }
  }, [tournament, open, form]);
  
  // Update currency when country changes in the form
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'country' && value.country) {
        const currencyInfo = getCurrencyInfo(value.country);
        setCurrentCurrency(currencyInfo.currency);
        setCurrentCurrencySymbol(currencyInfo.symbol);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);
  
  const watchedValues = form.watch();
  const { entryFee, totalPlayers, companyCommissionPercentage, firstPrizePercentage, matchType, tierOneReward } = watchedValues;
  const calculations = usePrizeDistribution({
    entryFee,
    totalPlayers,
    companyCommissionPercentage,
    firstPrize: firstPrizePercentage,
    perKillReward: tierOneReward,
    matchType,
  });
  useEffect(() => {
    const _entryFee = form.getValues('entryFee') || 0;
    const _totalPlayers = form.getValues('totalPlayers') || 0;
    const _matchType = form.getValues('matchType') || 'Squad';
    const _commissionPercentage = form.getValues('companyCommissionPercentage') || 0;
    const totalRevenue = _entryFee * _totalPlayers;
    const companyCommission = totalRevenue * (_commissionPercentage / 100);
    const prizePool = totalRevenue - companyCommission;
    const numKills = (function(players, matchType) {
      switch ((matchType || '').toLowerCase()) {
        case 'solo': return Math.max(players - 1, 0);
        case 'duo': return Math.max(players - 2, 0);
        case 'squad': return Math.max(players - 4, 0);
        default: return Math.max(players - 1, 0);
      }
    })(_totalPlayers, _matchType);
    const firstPrize = Math.round(prizePool * 0.4);
    const killRewardPool = prizePool - firstPrize;
    const perKillReward = numKills > 0 ? +(killRewardPool / numKills).toFixed(2) : 0;
    if (autoMode.firstPrize) {
      form.setValue('firstPrizePercentage', firstPrize, { shouldValidate: true });
    }
    if (autoMode.perKillReward) {
      form.setValue('tierOneReward', perKillReward, { shouldValidate: true });
    }
  }, [form.watch('entryFee'), form.watch('totalPlayers'), form.watch('matchType'), form.watch('companyCommissionPercentage'), autoMode, form]);
  const handleFirstPrizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoMode((prev) => ({ ...prev, firstPrize: false }));
    form.setValue('firstPrizePercentage', parseFloat(e.target.value) || 0, { shouldValidate: true });
  };
  const handlePerKillRewardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoMode((prev) => ({ ...prev, perKillReward: false }));
    form.setValue('tierOneReward', parseFloat(e.target.value) || 0, { shouldValidate: true });
  };
  const updateTournamentMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const tournamentData = {
        ...values,
        startTime: values.startTime.toISOString(),
        prizePool: calculations.prizePool,
        rewardsDistribution: [
          { position: 1, amount: values.firstPrizePercentage },
        ],
        perKillReward: values.tierOneReward,
      };
      const response = await apiRequest("PATCH", `/tournaments/${tournament.id}`, tournamentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tournament updated",
        description: "The tournament has been updated successfully.",
      });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update tournament",
        description: error.message || "There was an error updating the tournament.",
        variant: "destructive",
      });
    },
  });
  function onSubmit(values: FormValues) {
    updateTournamentMutation.mutate(values);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-primary" />
            Edit Tournament
          </DialogTitle>
          <DialogDescription>
            Update the tournament details. Scroll down to see calendar and prize distribution.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* All form fields at the top remain the same as create dialog */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-x-4 gap-y-6">
              {/* Country Selection - compact */}
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Select onValueChange={value => {
                          const newCurrency = getCurrencyInfo(value);
                          
                          // Update currency state for UI labels
                          setCurrentCurrency(newCurrency.currency);
                          setCurrentCurrencySymbol(newCurrency.symbol);
                          
                          // Update form value
                          field.onChange(value);
                          
                          // Reset gameType if not available for selected country
                          const allowedGames = GAME_OPTIONS.filter(g => g.country === value || g.country === 'all');
                          if (!allowedGames.some(g => g.value === form.getValues('gameType'))) {
                            form.setValue('gameType', allowedGames[0]?.value || '');
                          }
                          // Reset map as well
                          const mapsList = MAP_OPTIONS[allowedGames[0]?.value] || [];
                          form.setValue('map', mapsList[0]?.value || '');
                          
                          // Show currency change toast
                          toast({
                            title: "Country updated",
                            description: `Currency changed to ${newCurrency.currency} (${newCurrency.symbol})`,
                          });
                        }} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map(c => (
                              <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Tournament Name */}
              <div className="sm:col-span-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. BGMI Pro League Season 3" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Game Type */}
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="gameType"
                  render={({ field }) => {
                    const allowedGames = GAME_OPTIONS.filter(g => g.country === form.getValues('country') || g.country === 'all');
                    return (
                      <FormItem>
                        <FormLabel>Game</FormLabel>
                        <FormControl>
                          <Select onValueChange={value => {
                            field.onChange(value);
                            const maps = MAP_OPTIONS[value] || [];
                            form.setValue('map', maps[0]?.value || '');
                          }} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select game" />
                            </SelectTrigger>
                            <SelectContent>
                              {allowedGames.map(g => (
                                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              {/* Match Type */}
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="matchType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Type</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                          }} 
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select match type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Solo">Solo (1 player per team)</SelectItem>
                            <SelectItem value="Duo">Duo (2 players per team)</SelectItem>
                            <SelectItem value="Squad">Squad (4 players per team)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Map - now dynamic by game */}
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="map"
                  render={({ field }) => {
                    const maps = MAP_OPTIONS[form.getValues('gameType')] || [];
                    return (
                      <FormItem>
                        <FormLabel>Map</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select map" />
                            </SelectTrigger>
                            <SelectContent>
                              {maps.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              {/* Start Time */}
              <div className="sm:col-span-3 flex flex-col justify-center">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="h-full flex flex-col justify-center">
                      <FormLabel className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        Start Date & Time
                      </FormLabel>
                      <FormControl>
                        <DateTimePicker
                          selected={field.value}
                          onChange={(date: Date) => field.onChange(date)}
                          minDate={new Date()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Status */}
              <div className="sm:col-span-2 flex flex-col justify-end">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="h-full flex flex-col justify-end">
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="registering">Registering</SelectItem>
                            <SelectItem value="full">Full</SelectItem>
                            <SelectItem value="live">Live</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Room ID */}
              <div className="sm:col-span-3">
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. 123456" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Room Password */}
              <div className="sm:col-span-3">
                <FormField
                  control={form.control}
                  name="roomPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Password</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. password123" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Max Players */}
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="totalPlayers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Players</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          placeholder="e.g. 100"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Entry Fee */}
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="entryFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Fee ({currentCurrencySymbol})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g. 10"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium flex items-center">
                  <Calculator className="mr-2 h-5 w-5 text-primary" />
                  Prize & Kill Reward Configuration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Auto-calculated values are suggestions. You can override them, ensuring the total distributed amount does not exceed the prize pool.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <FormField
                    control={form.control}
                    name="firstPrizePercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>1st Prize ({currentCurrencySymbol})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="e.g. 1000"
                            {...field}
                            value={field.value ?? 0}
                            onChange={handleFirstPrizeChange}
                          />
                        </FormControl>
                        {autoMode.firstPrize && (
                          <p className="text-xs text-muted-foreground">Auto: 40% of prize pool</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="sm:col-span-1">
                  <FormField
                    control={form.control}
                    name="tierOneReward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Per Kill Reward ({currentCurrencySymbol})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g. 10"
                            {...field}
                            value={field.value ?? 0}
                            onChange={handlePerKillRewardChange}
                          />
                        </FormControl>
                        {autoMode.perKillReward && (
                          <p className="text-xs text-muted-foreground">Auto: Remainder / kills</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="sm:col-span-1 flex flex-col justify-center">
                  <div className="p-3 bg-background rounded-lg border text-center">
                    <p className="text-sm text-muted-foreground">Total Kills (est.)</p>
                    <p className="text-lg font-semibold">{calculations.totalKills}</p>
                  </div>
                </div>
              </div>
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Prize Distribution Preview
                  </CardTitle>
                  <CardDescription>
                    Total Distributed cannot exceed the Prize Pool.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Prize Pool</p>
                    <p className="text-xl font-semibold text-green-600">{currentCurrencySymbol}{calculations.prizePool.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">1st Prize</p>
                    <p className="text-xl font-semibold text-yellow-600">{currentCurrencySymbol}{calculations.firstPrize.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Kill Reward</p>
                    <p className="text-xl font-semibold text-red-500">{currentCurrencySymbol}{calculations.totalKillReward.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Distributed</p>
                    <p className={`text-xl font-semibold ${calculations.isDistributionWithinBudget ? 'text-blue-600' : 'text-red-600'}`}>{currentCurrencySymbol}{calculations.totalPrizeDistribution.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                </CardContent>
              </Card>
              {!calculations.isDistributionWithinBudget && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Total Distributed exceeds the Prize Pool of {currentCurrencySymbol}{calculations.prizePool.toLocaleString()}. Please lower the prize amounts.
                  </p>
                </div>
              )}
            </div>
            <Separator />
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Tournament Details</h3>
                <p className="text-sm text-muted-foreground">
                  Additional information about the tournament.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6">
                <div className="sm:col-span-6">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tournament description..." 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="sm:col-span-6">
                  <FormField
                    control={form.control}
                    name="rules"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tournament Rules</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter tournament rules and regulations..." 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="sm:col-span-6">
                  <FormField
                    control={form.control}
                    name="bannerImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tournament Banner URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Banner image URL" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="default"
                disabled={
                  !form.formState.isValid || 
                  !calculations.isDistributionWithinBudget ||
                  updateTournamentMutation.isPending
                }
              >
                {updateTournamentMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  "Update Tournament"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
