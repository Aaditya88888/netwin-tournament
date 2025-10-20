import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import MatchForm from "@/components/matches/match-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import React from "react";


const EditMatch = () => {
  const { id } = useParams() as { id: string };
  const [, navigate] = useLocation();
  
  // Fetch tournament data
  const { data: tournament, isLoading, isError } = useQuery({
    queryKey: [`/tournaments/${id}`],
  });

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-12 w-52 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-md mb-4"></div>
        <div className="h-96 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-md"></div>
      </div>
    );
  }

  if (isError || !tournament) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-game font-bold mb-6">Tournament Not Found</h1>
        <p className="mb-4">The tournament you are trying to edit doesn't exist or has been deleted.</p>
        <Button variant="default" onClick={() => navigate("/matches")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tournaments
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Tournament | NetWin Admin</title>
        <meta name="description" content="Edit PUBG/BGMI tournament details" />
      </Helmet>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-game font-bold mb-6">Edit Tournament</h1>
        <MatchForm tournament={tournament} isEditing />
      </div>
    </>
  );
};

export default EditMatch;
