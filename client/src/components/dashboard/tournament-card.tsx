import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Calendar, Users } from "lucide-react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils/format";
import { Tournament } from "@/lib/firebase/models";
import React from "react";


interface TournamentCardProps {
  tournament: Tournament;
}

const TournamentCard = ({ tournament }: TournamentCardProps) => {
  return (
    <Card className="game-card rounded-lg shadow-md overflow-hidden">
      <div className="h-48 bg-card relative">        <img 
          src={tournament?.coverImage || "/default-tournament-banner.jpg"}
          alt={tournament?.title || 'Tournament'} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">          <div className="flex items-center justify-between">
            <span className={`px-2 py-1 text-white text-xs font-medium rounded-full ${
              tournament?.status === 'ongoing' 
                ? 'bg-accent' 
                : 'bg-primary'
            }`}>
              {tournament?.status ? tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1) : 'Unknown'}
            </span>
            <span className="px-2 py-1 bg-card/90 text-foreground text-xs font-medium rounded-full">
              Entry: {formatCurrency(tournament?.entryFee)}
            </span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <h3 className="text-lg font-game font-bold text-white">{tournament?.title || 'Untitled Tournament'}</h3>
          <p className="text-sm text-gray-300">Prize Pool: {formatCurrency(tournament?.prizePool)}</p>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="flex items-center text-muted-foreground">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{formatDate(tournament.startTime)}</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <Users className="h-4 w-4 mr-1" />
            <span>{tournament?.currentParticipants || 0}/{tournament?.maxTeams || tournament?.maxParticipants || 0} Teams</span>
          </div>
        </div>
        <div className="mt-2 flex space-x-2">
          <Button variant="default" className="flex-1" asChild>
            <Link href={`/matches/${tournament.id}`}>
              Details
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/matches/${tournament.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentCard;
