import { Helmet } from "react-helmet";
import MatchForm from "@/components/matches/match-form";
import React from "react";


const CreateMatch = () => {
  return (
    <>
      <Helmet>
        <title>Create Tournament | NetWin Admin</title>
        <meta name="description" content="Create a new PUBG/BGMI tournament" />
      </Helmet>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-game font-bold mb-6">Create New Tournament</h1>
        <MatchForm />
      </div>
    </>
  );
};

export default CreateMatch;
