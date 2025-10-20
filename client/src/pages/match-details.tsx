import { useParams } from "wouter";
import { Helmet } from "react-helmet";
import MatchDetail from "@/components/matches/match-detail";
import React from "react";


const MatchDetails = () => {
  const { id } = useParams() as { id: string };
  
  return (
    <>
      <Helmet>
        <title>Tournament Details | NetWin Admin</title>
        <meta name="description" content="View and manage PUBG/BGMI tournament details" />
      </Helmet>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <MatchDetail tournamentId={id || ""} />
      </div>
    </>
  );
};

export default MatchDetails;
