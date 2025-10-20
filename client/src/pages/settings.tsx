import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Settings as SettingsIcon, Database, Mail, Shield, Bell, Palette, Globe, Save, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';


interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    adminEmail: string;
    timezone: string;
    currency: string;
    language: string;
    maintenanceMode: boolean;
  };
  tournament: {
    defaultEntryFee: number;
    maxTeamSize: number;
    registrationTimeLimit: number;
    autoStartTournaments: boolean;
    allowLateRegistration: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    adminNotifications: boolean;
    userNotifications: boolean;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    requireTwoFactor: boolean;
    allowedDomains: string[];
  };
  integrations: {
    firebase: {
      projectId: string;
      status: 'connected' | 'disconnected' | 'error';
    };
    payment: {
      provider: string;
      status: 'connected' | 'disconnected' | 'error';
    };
  };
}

const Settings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  
  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/admin/settings');
      return (await res.json()) as SystemSettings;
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ section, data }: { section: string; data: any }) => {
      const res = await apiRequest('PUT', `/admin/settings/${section}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast({
        title: 'Settings Updated',
        description: 'Your settings have been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (service: string) => {
      const res = await apiRequest('POST', `/admin/test-connection/${service}`);
      return res.json();
    },
    onSuccess: (data, service) => {
      toast({
        title: 'Connection Test',
        description: `${service} connection is working properly.`,
      });
    },
    onError: (error, service) => {
      toast({
        title: 'Connection Failed',
        description: `Failed to connect to ${service}. Please check your configuration.`,
        variant: 'destructive',
      });
    },
  });

  const handleSaveSection = (section: string, data: any) => {
    updateSettingsMutation.mutate({ section, data });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Settings | NetWin Admin</title>
        <meta name="description" content="System settings and configuration" />
      </Helmet>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <SettingsIcon className="mr-2 h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage system configuration and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="tournament">Tournament</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="mr-2 h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>
                  Basic site configuration and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      defaultValue={settings?.general?.siteName || 'NetWin Tournament'}
                      placeholder="Enter site name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      defaultValue={settings?.general?.adminEmail || ''}
                      placeholder="admin@example.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Textarea
                    id="siteDescription"
                    defaultValue={settings?.general?.siteDescription || ''}
                    placeholder="Describe your tournament platform"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue={settings?.general?.timezone || 'UTC'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="US/Eastern">US/Eastern</SelectItem>
                        <SelectItem value="US/Pacific">US/Pacific</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select defaultValue={settings?.general?.currency || 'USD'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select defaultValue={settings?.general?.language || 'en'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Maintenance Mode</Label>
                    <div className="text-sm text-muted-foreground">
                      Enable to put the site in maintenance mode
                    </div>
                  </div>
                  <Switch
                    defaultChecked={settings?.general?.maintenanceMode || false}
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSaveSection('general', settings?.general)}
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tournament Settings */}
          <TabsContent value="tournament">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SettingsIcon className="mr-2 h-5 w-5" />
                  Tournament Settings
                </CardTitle>
                <CardDescription>
                  Configure default tournament parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultEntryFee">Default Entry Fee</Label>
                    <Input
                      id="defaultEntryFee"
                      type="number"
                      defaultValue={settings?.tournament?.defaultEntryFee || 10}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxTeamSize">Maximum Team Size</Label>
                    <Input
                      id="maxTeamSize"
                      type="number"
                      defaultValue={settings?.tournament?.maxTeamSize || 4}
                      placeholder="4"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationTimeLimit">Registration Time Limit (hours)</Label>
                  <Input
                    id="registrationTimeLimit"
                    type="number"
                    defaultValue={settings?.tournament?.registrationTimeLimit || 24}
                    placeholder="24"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Auto-start Tournaments</Label>
                      <div className="text-sm text-muted-foreground">
                        Automatically start tournaments when conditions are met
                      </div>
                    </div>
                    <Switch
                      defaultChecked={settings?.tournament?.autoStartTournaments || false}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Allow Late Registration</Label>
                      <div className="text-sm text-muted-foreground">
                        Allow users to register after tournament starts
                      </div>
                    </div>
                    <Switch
                      defaultChecked={settings?.tournament?.allowLateRegistration || false}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSaveSection('tournament', settings?.tournament)}
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure notification channels and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <div className="text-sm text-muted-foreground">
                        Enable email notifications for users and admins
                      </div>
                    </div>
                    <Switch
                      defaultChecked={settings?.notifications?.emailEnabled || false}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">SMS Notifications</Label>
                      <div className="text-sm text-muted-foreground">
                        Enable SMS notifications for important updates
                      </div>
                    </div>
                    <Switch
                      defaultChecked={settings?.notifications?.smsEnabled || false}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Push Notifications</Label>
                      <div className="text-sm text-muted-foreground">
                        Enable browser push notifications
                      </div>
                    </div>
                    <Switch
                      defaultChecked={settings?.notifications?.pushEnabled || false}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Admin Notifications</Label>
                      <div className="text-sm text-muted-foreground">
                        Receive notifications for admin events
                      </div>
                    </div>
                    <Switch
                      defaultChecked={settings?.notifications?.adminNotifications || true}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">User Notifications</Label>
                      <div className="text-sm text-muted-foreground">
                        Send notifications to users for relevant events
                      </div>
                    </div>
                    <Switch
                      defaultChecked={settings?.notifications?.userNotifications || true}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSaveSection('notifications', settings?.notifications)}
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Configure security policies and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      defaultValue={settings?.security?.sessionTimeout || 60}
                      placeholder="60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      defaultValue={settings?.security?.maxLoginAttempts || 5}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowedDomains">Allowed Email Domains (comma-separated)</Label>
                  <Input
                    id="allowedDomains"
                    defaultValue={settings?.security?.allowedDomains?.join(', ') || ''}
                    placeholder="example.com, company.org"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Require Two-Factor Authentication</Label>
                    <div className="text-sm text-muted-foreground">
                      Require 2FA for admin accounts
                    </div>
                  </div>
                  <Switch
                    defaultChecked={settings?.security?.requireTwoFactor || false}
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSaveSection('security', settings?.security)}
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Integrations
                </CardTitle>
                <CardDescription>
                  Manage external service connections and integrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Firebase Integration */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">Firebase</h3>
                      <p className="text-sm text-muted-foreground">
                        Database, Authentication, and Storage
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={settings?.integrations?.firebase?.status === 'connected' ? 'default' : 'destructive'}
                      >
                        {settings?.integrations?.firebase?.status === 'connected' ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Connected
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Disconnected
                          </>
                        )}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnectionMutation.mutate('firebase')}
                        disabled={testConnectionMutation.isPending}
                      >
                        Test Connection
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firebaseProjectId">Project ID</Label>
                    <Input
                      id="firebaseProjectId"
                      defaultValue={settings?.integrations?.firebase?.projectId || ''}
                      placeholder="your-firebase-project-id"
                    />
                  </div>
                </div>

                {/* Payment Integration */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">Payment Gateway</h3>
                      <p className="text-sm text-muted-foreground">
                        Payment processing and wallet management
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={settings?.integrations?.payment?.status === 'connected' ? 'default' : 'destructive'}
                      >
                        {settings?.integrations?.payment?.status === 'connected' ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Connected
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Disconnected
                          </>
                        )}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnectionMutation.mutate('payment')}
                        disabled={testConnectionMutation.isPending}
                      >
                        Test Connection
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentProvider">Payment Provider</Label>
                    <Select defaultValue={settings?.integrations?.payment?.provider || 'stripe'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSaveSection('integrations', settings?.integrations)}
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Settings;
