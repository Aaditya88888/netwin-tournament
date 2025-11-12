import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
// **Firebase Imports (Uncomment when integrating SDK)**
// import { collection, addDoc, Timestamp } from "firebase/firestore";
// import { db } from "@/lib/firebase"; // Your initialized Firestore instance
import { Calendar, Trophy, Users, DollarSign, Percent, Info, MapPin, Calculator, RefreshCcw, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient"; // Keep temporarily, replace with Firebase SDK
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker"; // Ensure this component exists
import { DEFAULT_TOURNAMENT_RULES } from '@/types'; // Ensure this constant exists

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
  FormDescription,
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
import { Label } from "@/components/ui/label";

// --- Data Structures & Constants ---
const GAME_TYPES = ['BGMI', 'PUBG Mobile', 'Free Fire', 'COD Mobile'];
const MATCH_TYPES = ['SOLO', 'DUO', 'SQUAD', 'TRIO', 'CUSTOM']; // Use uppercase like Kotlin
const MAPS: Record<string, string[]> = {
  'BGMI': ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Livik'],
  'PUBG Mobile': ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Livik'],
  'Free Fire': ['Bermuda', 'Kalahari', 'Purgatory', 'Alpine', 'NeXTerra'],
  'COD Mobile': ['Isolated', 'Blackout', 'Alcatraz'],
};
const COUNTRIES = [
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦' },
  // Add more as needed
];

const getCurrencyInfo = (countryName: string) => {
  const country = COUNTRIES.find(c => c.name === countryName);
  return country ?? { code: 'IN', name: 'India', currency: 'INR', symbol: '₹' }; // Default to India
};

const getTeamSize = (matchType: string): number => {
    switch (matchType?.toUpperCase()) {
      case 'SOLO': return 1;
      case 'DUO': return 2;
      case 'TRIO': return 3;
      case 'SQUAD': return 4;
      case 'CUSTOM': return 4; // Default for custom, adjust if needed
      default: return 4; // Default to SQUAD
    }
};

// Adjusted estimation: total players * 1.1 (average player kill count in a battle royale is often low, but this is a rough estimate)
const getEstimatedTotalKills = (teams: number, matchType: string) => {
    const teamSize = getTeamSize(matchType);
    const totalPlayers = teams * teamSize;
    // Estimate: 70% of players get 1 kill, plus 5 kills for the winner. Max 100 players, max 100 kills.
    // A simpler, safer estimate: Total players * 0.8
    return Math.max(Math.round(totalPlayers * 0.8), 1); // Ensure at least 1 kill for calculation
};


// --- Updated Zod Schema (Aligned with Android Model) ---
const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"), // Renamed from title
  gameType: z.string().min(1, "Game type is required"),
  matchType: z.string().min(1, "Match type is required"),
  map: z.string().min(1, "Map is required"),
  startTime: z.date({ required_error: "Start date/time required." }).min(new Date(), "Start time must be future."),
  entryFee: z.number().min(0, "Entry fee cannot be negative."),
  maxTeams: z.number().int().min(1, "Max teams must be at least 1."), // Renamed, must be > 0
  status: z.enum(["upcoming", "draft"]).default("upcoming"),
  description: z.string().optional(),
  rules: z.string().optional(), // Textarea input, split later
  bannerImage: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  roomId: z.string().optional(),
  roomPassword: z.string().optional(),
  // --- Prize fields restored (amount, not percentage) ---
  killReward: z.number().min(0, "Kill reward cannot be negative.").default(0), // Renamed, amount
  firstPrize: z.number().min(0, "1st Prize cannot be negative.").default(0), // Amount (Kept as minimum incentive)
  country: z.string().min(1, 'Country is required.'),
  // --- Added Date Fields ---
  registrationStartTime: z.date({ required_error: "Registration start time required." }),
  registrationEndTime: z.date({ required_error: "Registration end time required." }),
  endDate: z.date({ required_error: "End date/time required." }), // Use 'endDate' or 'completedAt' consistently
  companyCommissionPercentage: z.number().min(0).max(100).default(10),

// Refined date checks
}).refine(data => data.registrationStartTime < data.registrationEndTime, {
    message: "Reg Start must be before Reg End", path: ["registrationStartTime"],
}).refine(data => data.registrationEndTime < data.startTime, {
    message: "Reg End must be before Tourney Start", path: ["registrationEndTime"],
}).refine(data => data.startTime < data.endDate, {
    message: "Tourney Start must be before Tourney End", path: ["startTime"],
});

type FormValues = z.infer<typeof formSchema>;

// --- Component Props ---
interface CreateTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTournamentCreated?: () => void;
}

// --- Component ---
export function CreateTournamentDialog({ open, onOpenChange, onTournamentCreated }: CreateTournamentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  // --- State for manual prize edits restored ---
  const [killRewardManuallySet, setKillRewardManuallySet] = useState(false);
  const [firstPrizeManuallySet, setFirstPrizeManuallySet] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    // Updated Default Values
    defaultValues: {
      name: "", gameType: "BGMI", matchType: "SQUAD", map: "Erangel",
      startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      registrationStartTime: new Date(), // Now
      registrationEndTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // Start + 2 hours
      entryFee: 10, maxTeams: 25, status: "upcoming", description: "",
      rules: DEFAULT_TOURNAMENT_RULES, bannerImage: "", roomId: "", roomPassword: "",
      killReward: 0, firstPrize: 0, country: 'India', companyCommissionPercentage: 10,
    },
  });

  const watchedValues = form.watch();
  // Destructure updated/renamed fields
  const { entryFee, maxTeams, companyCommissionPercentage, matchType, firstPrize, killReward } = watchedValues;

  // --- Prize Calculation Logic (UPDATED: 90% to Kills, 10% to 1st Prize) ---
  const calculations = useMemo(() => {
    const _entryFee = entryFee ?? 0;
    const _maxTeams = maxTeams ?? 0; // Use maxTeams
    const _commissionPercentage = companyCommissionPercentage ?? 0;
    const _matchType = matchType ?? 'SQUAD';
    
    // Constants for the suggested split
    const FIRST_PRIZE_PERCENTAGE = 0.10; // 10% for the winner (as minimum incentive)
    const KILL_REWARD_PERCENTAGE = 0.90; // 90% dedicated to kills

    const _teamSize = getTeamSize(_matchType);
    const _totalPlayers = _maxTeams * _teamSize;

    const totalRevenue = _entryFee * _totalPlayers;
    const companyCommission = totalRevenue * (_commissionPercentage / 100);
    const prizePool = Math.max(0, totalRevenue - companyCommission);
    const estimatedTotalKills = getEstimatedTotalKills(_maxTeams, _matchType); // Use maxTeams

    // Get current form values (manual or auto)
    const _firstPrize = firstPrize ?? 0; // Use firstPrize (amount)
    const _killReward = killReward ?? 0; // Use killReward (amount)

    const totalKillRewardCost = _killReward * estimatedTotalKills;
    const totalPrizeDistribution = _firstPrize + totalKillRewardCost;
    const isDistributionWithinBudget = totalPrizeDistribution <= prizePool + 0.01;

    // Calculate SUGGESTED values based on the NEW 10/90 split for auto-fill
    const suggestedFirstPrize = Math.round(prizePool * FIRST_PRIZE_PERCENTAGE);
    const remainingForKills = Math.max(0, prizePool - suggestedFirstPrize);
    
    const suggestedKillReward = estimatedTotalKills > 0 
        ? parseFloat((remainingForKills / estimatedTotalKills).toFixed(2)) 
        : 0;

    return {
      prizePool,
      estimatedTotalKills,
      totalKillRewardCost, // Cost based on current killReward
      totalPrizeDistribution, // Total based on current firstPrize + killRewardCost
      isDistributionWithinBudget,
      // Include suggestions for auto-fill logic
      suggestedFirstPrize,
      suggestedKillReward,
    };
  }, [entryFee, maxTeams, companyCommissionPercentage, matchType, firstPrize, killReward]); // Include all relevant watched values


  // --- Restored useEffect for Auto-Calculation (using updated field names) ---
  useEffect(() => {
    // Only auto-update if corresponding flag is true
    if (!firstPrizeManuallySet) {
      form.setValue('firstPrize', calculations.suggestedFirstPrize, { shouldValidate: true });
    }
    if (!killRewardManuallySet) {
      form.setValue('killReward', calculations.suggestedKillReward, { shouldValidate: true });
    }
  }, [ // Depend on calculated suggestions and manual flags
      calculations.suggestedFirstPrize,
      calculations.suggestedKillReward,
      form, // form instance
      firstPrizeManuallySet,
      killRewardManuallySet
  ]);

  // --- Other Effects (Currency, Map Reset, Form Reset) ---
  useEffect(() => { /* ... currency update ... */
     if (watchedValues.country) {
      setCurrencySymbol(getCurrencyInfo(watchedValues.country).symbol);
     }
  }, [watchedValues.country]);

  useEffect(() => { /* ... map reset ... */
     const selectedGame = watchedValues.gameType;
     if (selectedGame) {
       const availableMaps = MAPS[selectedGame] || [];
       if (!availableMaps.includes(form.getValues('map'))) {
         form.setValue('map', availableMaps[0] || '', { shouldValidate: true });
       }
     }
  }, [watchedValues.gameType, form]);

  useEffect(() => { /* ... form reset ... */
       if (open) {
          form.reset();
          setFirstPrizeManuallySet(false); // Reset flags on open
          setKillRewardManuallySet(false);
          setCurrencySymbol(getCurrencyInfo(form.getValues('country')).symbol);
       }
  }, [open, form]);


  // --- Event Handlers for Manual Prize Input ---
  const handleFirstPrizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstPrizeManuallySet(true); // Flag manual edit
    form.setValue('firstPrize', parseFloat(e.target.value) || 0, { shouldValidate: true });
  };
  const handleKillRewardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKillRewardManuallySet(true); // Flag manual edit
    form.setValue('killReward', parseFloat(e.target.value) || 0, { shouldValidate: true });
  };
  // Reset Button Handler
  const handleRecalculatePrizes = () => {
        setFirstPrizeManuallySet(false); // Re-enable auto mode
        setKillRewardManuallySet(false);
        // Trigger the useEffect to recalculate by changing a dependency briefly
        form.setValue('companyCommissionPercentage', form.getValues('companyCommissionPercentage'));
        toast({ title: "Prizes Reset", description: "Prizes recalculated based on current settings (10% Win / 90% Kills).", variant: "default" });
  };

  // --- Mutation (Aligned with Android Model) ---
  const createTournamentMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // **Prepare data for Firestore**
      const dataToSave = {
        name: values.name, // Use name
        description: values.description || "",
        gameType: values.gameType,
        matchType: values.matchType,
        map: values.map,
        startTime: values.startTime.getTime(), // Milliseconds
        registrationStartTime: values.registrationStartTime.getTime(), // Milliseconds
        registrationEndTime: values.registrationEndTime.getTime(), // Milliseconds
        completedAt: values.endDate.getTime(), // Use completedAt (Milliseconds)
        entryFee: values.entryFee,
        prizePool: calculations.prizePool, // Send calculated value
        maxTeams: values.maxTeams, // Use maxTeams
        registeredTeams: 0,
        status: values.status,
        rules: values.rules ? values.rules.split('\n').filter(line => line.trim() !== '') : [], // Split string to array
        bannerImage: values.bannerImage || null,
        killReward: values.killReward ?? 0, // Send kill reward amount
        // Structure rewardsDistribution based on firstPrize amount
        rewardsDistribution: values.firstPrize > 0 ? [{ position: 1, amount: values.firstPrize }] : [],
        roomId: values.roomId || null,
        roomPassword: values.roomPassword || null,
        country: values.country,
        createdAt: Date.now(), // Client-side timestamp (Firestore server timestamp preferred)
        actualStartTime: null,
      };

      console.log('Submitting data for creation:', dataToSave);

      // --- !!! REPLACE THIS with Firebase SDK call !!! ---
      const response = await apiRequest("POST", "/tournaments", dataToSave);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `Failed to create tournament (${response.status})`);
      }
      return response.json();
      // --- End Replace ---

      /*
      // --- Example using Firebase SDK v9 (Modular) ---
      import { collection, addDoc, Timestamp } from "firebase/firestore";
      import { db } from "@/lib/firebase"; // Your initialized Firestore instance

       const dataWithFbTimestamps = {
           ...dataToSave,
           startTime: Timestamp.fromMillis(dataToSave.startTime),
           registrationStartTime: Timestamp.fromMillis(dataToSave.registrationStartTime),
           registrationEndTime: Timestamp.fromMillis(dataToSave.registrationEndTime),
           completedAt: Timestamp.fromMillis(dataToSave.completedAt),
           createdAt: Timestamp.now(), // Use server timestamp
           // Ensure rewardsDistribution maps correctly
           rewardsDistribution: dataToSave.rewardsDistribution.map(r => ({ position: r.position, amount: r.amount })),
       };
       const docRef = await addDoc(collection(db, "tournaments"), dataWithFbTimestamps);
       return { id: docRef.id, ...dataToSave }; // Simulate return
      */
    },
    onSuccess: (data) => {
      toast({ title: "Tournament Created", description: `"${data.name}" is ready.` });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      onTournamentCreated?.();
    },
    onError: (error) => {
      console.error("Mutation Error:", error);
      toast({ title: "Creation Failed", description: (error as Error)?.message || "Could not create tournament.", variant: "destructive" });
    },
  });

  function onSubmit(values: FormValues) {
    console.log("Form validated:", values);
    // Use the budget check from calculations
    if (!calculations.isDistributionWithinBudget) {
        toast({ title: "Prize Error", description: "Total distributed prize (1st + Kill Rewards) exceeds calculated prize pool.", variant: "destructive"});
        return;
    }
    createTournamentMutation.mutate(values);
  }

  // --- Render ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2"><Trophy /> Create New Tournament</DialogTitle>
          <DialogDescription>Configure details. Fields * required. Prize distribution auto-calculated (heavily favoring kills) but can be overridden.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto px-6 pt-4 pb-6 max-h-[calc(90vh-140px)]">

            {/* --- Section 1: Basic Info (Fields updated: name, country etc.) --- */}
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Name *</FormLabel><FormControl><Input placeholder="e.g., Sunday Showdown" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="country" render={({ field }) => ( <FormItem><FormLabel>Country *</FormLabel><Select onValueChange={value => { setCurrencySymbol(getCurrencyInfo(value).symbol); field.onChange(value); }} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{COUNTRIES.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="gameType" render={({ field }) => ( <FormItem><FormLabel>Game *</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('map', MAPS[value]?.[0] || ''); }} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{GAME_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="matchType" render={({ field }) => ( <FormItem><FormLabel>Match Type *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{MATCH_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="map" render={({ field }) => ( <FormItem><FormLabel>Map *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedValues.gameType}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{(MAPS[watchedValues.gameType] || []).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem className="md:col-span-3"><FormLabel>Description</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="bannerImage" render={({ field }) => ( <FormItem className="md:col-span-3"><FormLabel>Banner Image URL</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
              </CardContent>
            </Card>

            {/* --- Section 2: Schedule & Registration (Fields added) --- */}
            <Card>
                 <CardHeader><CardTitle>Schedule & Registration</CardTitle></CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FormField control={form.control} name="registrationStartTime" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Reg Starts *</FormLabel><FormControl><DateTimePicker selected={field.value} onChange={field.onChange} maxDate={watchedValues.registrationEndTime} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="registrationEndTime" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Reg Ends *</FormLabel><FormControl><DateTimePicker selected={field.value} onChange={field.onChange} minDate={watchedValues.registrationStartTime} maxDate={watchedValues.startTime} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Tourney Starts *</FormLabel><FormControl><DateTimePicker selected={field.value} onChange={field.onChange} minDate={watchedValues.registrationEndTime} maxDate={watchedValues.endDate} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="endDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Tourney Ends *</FormLabel><FormControl><DateTimePicker selected={field.value} onChange={field.onChange} minDate={watchedValues.startTime} /></FormControl><FormMessage /></FormItem> )} />
                 </CardContent>
            </Card>

            {/* --- Section 3: Entry, Prize & Rewards (Restored Structure) --- */}
            <Card>
              <CardHeader>
                <CardTitle>Entry, Prize & Kill Rewards 💥</CardTitle>
                <div className="flex justify-between items-center">
                    <CardDescription>Focus is on Kill Rewards. Prizes auto-calculated (10% Win / 90% Kills).</CardDescription>
                    {/* Restored Recalculate Button */}
                    <Button type="button" variant="outline" size="sm" onClick={handleRecalculatePrizes}><RefreshCcw className="mr-2 h-4 w-4" /> Reset Prizes</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* Max Teams */}
                    <FormField control={form.control} name="maxTeams" render={({ field }) => ( <FormItem><FormLabel>Max Teams *</FormLabel><FormControl><Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem> )} />
                    {/* Entry Fee */}
                    <FormField control={form.control} name="entryFee" render={({ field }) => ( <FormItem><FormLabel>Entry Fee ({currencySymbol}) *</FormLabel><FormControl><Input type="number" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem> )} />
                    {/* Commission */}
                    <FormField control={form.control} name="companyCommissionPercentage" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1">Commission <Info size={14}/></FormLabel><FormControl><div className="flex items-center gap-1"><Input type="number" min="0" max="100" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="flex-1"/><span className="text-muted-foreground">%</span></div></FormControl><FormMessage /></FormItem> )} />
                    {/* Calculated Prize Pool */}
                    <div className="p-3 bg-muted rounded-md border text-center"><Label className="text-xs text-muted-foreground">Calc. Prize Pool</Label><p className="text-lg font-semibold text-primary">{currencySymbol}{calculations.prizePool.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
                 </div>

                 {/* Restored Prize Inputs with Manual Override */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start pt-4 border-t">
                    {/* 1st Prize */}
                    <FormField control={form.control} name="firstPrize" render={({ field }) => (
                        <FormItem>
                            <FormLabel>1st Prize (Winner Incentive - {currencySymbol})</FormLabel>
                            <div className="flex gap-2 items-center">
                                <FormControl><Input type="number" min="0" placeholder="Auto (10%)" {...field} value={field.value ?? 0} onChange={handleFirstPrizeChange} /></FormControl>
                                {firstPrizeManuallySet && <Button type="button" variant="ghost" size="sm" onClick={() => setFirstPrizeManuallySet(false)} title="Reset to auto">Reset</Button>}
                            </div>
                            <FormDescription>{firstPrizeManuallySet ? 'Manual value' : 'Auto (Est. 10% Pool)'}</FormDescription>
                            <FormMessage />
                        </FormItem>
                     )} />
                    {/* Kill Reward */}
                     <FormField control={form.control} name="killReward" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Kill Reward per Kill ({currencySymbol})</FormLabel>
                            <div className="flex gap-2 items-center">
                                <FormControl><Input type="number" min="0" step="0.01" placeholder="Auto (90%)" {...field} value={field.value ?? 0} onChange={handleKillRewardChange} /></FormControl>
                                {killRewardManuallySet && <Button type="button" variant="ghost" size="sm" onClick={() => setKillRewardManuallySet(false)} title="Reset to auto">Reset</Button>}
                            </div>
                            <FormDescription>{killRewardManuallySet ? 'Manual value' : 'Auto (Est. 90% Pool / Kills)'}</FormDescription>
                            <FormMessage />
                        </FormItem>
                     )} />
                    {/* Estimated Kills */}
                     <div className="p-3 bg-muted rounded-md border text-center mt-6"><Label className="text-xs text-muted-foreground">Est. Total Kills</Label><p className="text-lg font-semibold">{calculations.estimatedTotalKills}</p></div>
                 </div>

                 {/* Prize Distribution Preview */}
                  <Card className="bg-muted/50 mt-4">
                     <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DollarSign />Prize Distribution Preview</CardTitle></CardHeader>
                     <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                         <div><Label className="text-xs">Prize Pool</Label><p className="font-semibold text-primary">{currencySymbol}{calculations.prizePool.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
                         <div><Label className="text-xs">Winner Incentive</Label><p className="font-semibold">{currencySymbol}{(watchedValues.firstPrize ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
                         <div><Label className="text-xs">Total Kill Rewards</Label><p className="font-semibold">{currencySymbol}{calculations.totalKillRewardCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
                         <div><Label className="text-xs">Total Distributed</Label><p className={`font-semibold ${calculations.isDistributionWithinBudget ? 'text-green-600' : 'text-red-600'}`}>{currencySymbol}{calculations.totalPrizeDistribution.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
                     </CardContent>
                     {!calculations.isDistributionWithinBudget && (
                         <p className="px-6 pb-4 text-xs text-destructive font-medium">⚠️ Total distributed exceeds prize pool! Reduce Kill Reward or Winner Incentive.</p>
                     )}
                 </Card>
              </CardContent>
            </Card>

             {/* --- Section 4: Advanced & Rules --- */}
             <Card>
                 <CardHeader><CardTitle>Advanced Settings & Rules</CardTitle></CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="roomId" render={({ field }) => ( <FormItem><FormLabel>Room ID</FormLabel><FormControl><Input placeholder="(Optional)" {...field} value={field.value ?? ""} /></FormControl><FormDescription>Can add later.</FormDescription><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="roomPassword" render={({ field }) => ( <FormItem><FormLabel>Room Password</FormLabel><FormControl><Input placeholder="(Optional)" {...field} value={field.value ?? ""} /></FormControl><FormDescription>Can add later.</FormDescription><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="rules" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Rules</FormLabel><FormControl><Textarea placeholder="Enter rules, one per line..." {...field} value={field.value ?? ""} rows={6} /></FormControl><FormDescription>Each line saved as separate rule.</FormDescription><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Initial Status *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="upcoming">Upcoming (Visible)</SelectItem><SelectItem value="draft">Draft (Hidden)</SelectItem></SelectContent></Select><FormDescription>Initial visibility.</FormDescription><FormMessage /></FormItem> )} />
                 </CardContent>
             </Card>

            {/* --- Footer --- */}
            <DialogFooter className="sticky bottom-0 bg-card p-4 border-t mt-auto -mx-6 -mb-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                type="submit"
                // --- Restored Button Disable Logic ---
                disabled={!form.formState.isValid || !calculations.isDistributionWithinBudget || createTournamentMutation.isPending}
              >
                {createTournamentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Tournament
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}