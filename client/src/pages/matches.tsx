import { Helmet } from "react-helmet";
import MatchList from "@/components/matches/match-list";
import React from "react";


const Matches = () => {
  return (
    <>
      <Helmet>
        <title>Tournament Matches | NetWin Admin</title>
        <meta name="description" content="Manage PUBG/BGMI tournament matches" />
      </Helmet>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <MatchList />
      </div>
    </>
  );
};

export default Matches;
