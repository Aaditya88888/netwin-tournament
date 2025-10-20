import { Helmet } from "react-helmet";
import UserCreate from "@/components/users/user-create";
import React from "react";


const CreateUser = () => {
  return (
    <>
      <Helmet>
        <title>Create User | NetWin Admin</title>
        <meta name="description" content="Create a new user account" />
      </Helmet>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <UserCreate />
      </div>
    </>
  );
};

export default CreateUser;
