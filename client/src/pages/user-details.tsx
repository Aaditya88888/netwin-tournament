import { useParams } from "wouter";
import { Helmet } from "react-helmet";
import UserDetail from "@/components/users/user-detail";
import React from "react";


const UserDetails = () => {
  const { id } = useParams() as { id: string };
  
  return (
    <>
      <Helmet>
        <title>User Profile | NetWin Admin</title>
        <meta name="description" content="View and manage user profile details" />
      </Helmet>      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <UserDetail />
      </div>
    </>
  );
};

export default UserDetails;
