import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/dashboard/stats-card";
import TournamentCard from "@/components/dashboard/tournament-card";
import RecentResults from "@/components/dashboard/recent-results";
import UserActivity from "@/components/dashboard/user-activity";
import RevenueChart from "@/components/dashboard/revenue-chart";
import { Tournament } from "@/lib/firebase/models";
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


export const DashboardOverview = () => {
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/stats/dashboard'],
  });
  const { data: tournaments, isLoading: isLoadingTournaments } = useQuery<Tournament[]>({
    queryKey: ['/tournaments'],
  });

  const activeTournaments = (tournaments || []).filter((t: Tournament) => t.status === 'live' || t.status === 'upcoming').slice(0, 3);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-game font-bold text-foreground">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Overview of your tournament platform</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <Button asChild>
              <Link href="/tournaments">
                <Plus className="h-4 w-4 mr-2" />
                Create Tournament
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/announcements">
                <Megaphone className="h-4 w-4 mr-2" />
                Send Announcement
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Stats overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Active Tournaments"
          value={isLoadingStats ? "..." : (stats as any)?.activeTournaments || 0}
          icon="trophy"
          change={33.7}
          trend="up"
        />
        
        <StatsCard 
          title="Registered Users"
          value={isLoadingStats ? "..." : (stats as any)?.registeredUsers || 0}
          icon="users"
          change={12.4}
          trend="up"
        />
        
        <StatsCard 
          title="Total Revenue"
          value={isLoadingStats ? "..." : (stats as any)?.totalRevenue || 0}
          icon="currency"
          change={21.3}
          trend="up"
          isCurrency
        />
        
        <StatsCard 
          title="Pending KYC"
          value={isLoadingStats ? "..." : (stats as any)?.pendingKyc || 0}
          icon="verification"
          change={0}
          trend="warning"
        />
      </div>
      
      {/* Upcoming & Active Tournaments */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-game font-bold text-foreground">Upcoming & Active Tournaments</h2>
          <Link href="/matches" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center">
            View all 
            <span className="ml-1">→</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoadingTournaments ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-96 bg-card animate-pulse rounded-lg"></div>
            ))          ) : (
            activeTournaments.map((tournament: Tournament) => (
              <TournamentCard 
                key={tournament.id} 
                tournament={tournament} 
              />
            ))
          )}
        </div>
      </div>
      
      {/* Recent Results & Revenue */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <RecentResults />
        </div>
        
        <div className="md:col-span-1">
          <RevenueChart />
        </div>
      </div>
      
      {/* Users Overview */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <UserActivity />
        </div>
        
        <div className="lg:col-span-3">
          <div className="game-card rounded-lg shadow-md">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-game font-bold text-foreground">Recent User Activity</h2>
              <Link href="/users" className="text-sm text-primary hover:text-primary/80">View all users</Link>
            </div>
            <div className="p-0">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Activity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 bg-primary">
                          <AvatarFallback>RS</AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-foreground">Rahul Sharma</div>
                          <div className="text-xs text-muted-foreground">ID: #45981</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">Registered for tournament</div>
                      <div className="text-xs text-muted-foreground">BGMI Pro League - Squad</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-500">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      Mumbai, India
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href="/users/2" className="text-primary hover:text-primary/80">View</Link>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 bg-secondary">
                          <AvatarFallback>AP</AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-foreground">Anjali Patel</div>
                          <div className="text-xs text-muted-foreground">ID: #32145</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">Submitted KYC documents</div>
                      <div className="text-xs text-muted-foreground">Awaiting verification</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-500/20 text-yellow-500">
                        Pending KYC
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      Delhi, India
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href="/users/3" className="text-primary hover:text-primary/80">View</Link>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 bg-accent">
                          <AvatarFallback>VK</AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-foreground">Vikram Kumar</div>
                          <div className="text-xs text-muted-foreground">ID: #78932</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">Won tournament</div>
                      <div className="text-xs text-muted-foreground">BGMI Solo Challenge</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-500">
                        Verified
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      Bangalore, India
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href="/users/4" className="text-primary hover:text-primary/80">View</Link>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 bg-destructive">
                          <AvatarFallback>SM</AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-foreground">Sachin Mehta</div>
                          <div className="text-xs text-muted-foreground">ID: #23564</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">Reported for conduct</div>
                      <div className="text-xs text-muted-foreground">Multiple reports</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-500/20 text-red-500">
                        Flagged
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      Hyderabad, India
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href="/users/5" className="text-primary hover:text-primary/80">View</Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default DashboardOverview;
