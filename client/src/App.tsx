import { Route, Switch, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import PrivateRoute from "@/components/auth/PrivateRoute";
import AdminLogin from "@/pages/auth/AdminLogin";
import ResetPassword from "@/pages/auth/reset-password";
import ForgotPassword from "@/pages/auth/forgot-password";
import NotFound from "@/pages/not-found";
import MainLayout from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import Tournaments from "@/pages/tournaments";
import TournamentDetail from "@/pages/tournament-detail";
import SupportTickets from "@/pages/support-tickets";
import Matches from "@/pages/matches";
import MatchDetails from "@/pages/match-details";
import CreateMatch from "@/pages/create-match";
import EditMatch from "@/pages/edit-match";
import Users from "@/pages/users";
import UserDetails from "@/pages/user-details";
import UserTransactions from "@/pages/users/transactions";
import UserMatches from "@/pages/users/matches";
import CreateUser from "@/pages/user-create";
import KYC from "@/pages/kyc";
import Announcements from "@/pages/announcements";
import WalletTransactions from "@/pages/wallet-transactions";
import AllTransactions from "@/pages/transactions";
import Finance from "@/pages/finance";
import ManagementPage from "@/pages/management";
import { Helmet } from "react-helmet";
import React from "react";


const AppRoutes = () => {
  const { user, loading } = useAdminAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  return (
    <Switch>
      <Route path="/">
        {() => (user ? <Redirect to="/dashboard" /> : <Redirect to="/admin/login" />)}
      </Route>
      <Route path="/admin/login">
        {() => (user ? <Redirect to="/dashboard" /> : <AdminLogin />)}
      </Route>
      <Route path="/auth/login">
        {() => (user ? <Redirect to="/dashboard" /> : <AdminLogin />)}
      </Route>
      <Route path="/auth/reset-password">
        <ResetPassword />
      </Route>
      <Route path="/auth/forgot-password">
        <ForgotPassword />
      </Route>
      <PrivateRoute path="/dashboard">
        <MainLayout>
          <Dashboard />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/tournaments/:id">
        <MainLayout>
          <TournamentDetail />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/tournaments">
        <MainLayout>
          <Tournaments />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/support-tickets">
        <MainLayout>
          <SupportTickets />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/matches">
        <MainLayout>
          <Matches />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/matches/create">
        <MainLayout>
          <CreateMatch />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/matches/:id/edit">
        <MainLayout>
          <EditMatch />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/matches/:id">
        <MainLayout>
          <MatchDetails />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/users">
        <MainLayout>
          <Users />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/users/create">
        <MainLayout>
          <CreateUser />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/users/:id/transactions">
        <MainLayout>
          <UserTransactions />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/users/:id/matches">
        <MainLayout>
          <UserMatches />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/users/:id">
        <MainLayout>
          <UserDetails />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/kyc">
        <MainLayout>
          <KYC />
        </MainLayout>      </PrivateRoute>
      <PrivateRoute path="/announcements">
        <MainLayout>
          <Announcements />
        </MainLayout>
      </PrivateRoute>      <PrivateRoute path="/finance">
        <MainLayout>
          <Finance />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/wallet-transactions">
        <MainLayout>
          <WalletTransactions />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/transactions">
        <MainLayout>
          <AllTransactions />
        </MainLayout>
      </PrivateRoute>
      <PrivateRoute path="/management">
        <MainLayout>
          <ManagementPage />
        </MainLayout>
      </PrivateRoute>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
};


// Add favicon and meta using react-helmet
const App = () => (
  <>
    <Helmet>
      <link rel="icon" type="image/png" href="/netwin-logo.png" />
      <meta property="og:image" content="/netwin-logo.png" />
      <meta name="theme-color" content="#d4af37" />
    </Helmet>
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </AdminAuthProvider>
    </QueryClientProvider>
  </>
);

export default App;
