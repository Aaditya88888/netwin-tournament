import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, getInitials, getStatusColor } from "@/lib/utils";
import { getKYCDocumentURLs } from "@/lib/firebase/storage";
import { Eye, Check, X, ThumbsUp, ThumbsDown, ZoomIn, Loader2 } from 'lucide-react';

import {Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Custom interface for KYC users that matches the actual API response structure
interface KycUser {
  id: string; // Firebase UID is a string
  name: string;
  email: string;
  phone?: string;
  walletBalance: number;
  isVerified: boolean;
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  kycDocuments?: {
    idProof?: string;
    addressProof?: string;
    selfie?: string;
  };
  status: 'active' | 'inactive' | 'banned';
  location?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

const KycVerification = () => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [documentURLs, setDocumentURLs] = useState<{[userId: string]: any}>({});
  const [loadingDocuments, setLoadingDocuments] = useState<{[userId: string]: boolean}>({});
  const { toast } = useToast();  // Helper function to generate safe keys for user items
  const getUserKey = (user: KycUser, index: number) => {
    return user.id && user.id.trim() !== '' ? `user-${user.id}` : `user-fallback-${index}`;
  };
  // Function to convert Firebase Storage URLs to downloadable URLs
  const convertDocumentURLs = async (user: KycUser) => {
    if (!user.kycDocuments) return;
    
    // If we already have URLs for this user and they're not loading, don't convert again
    if (documentURLs[user.id] && !loadingDocuments[user.id]) return;
    
    setLoadingDocuments(prev => ({ ...prev, [user.id]: true }));
    
    try {
      // Check if the URLs are already in https:// format or gs:// format
      const needsConversion = {
        idProof: !user.kycDocuments.idProof?.startsWith('https://'),
        addressProof: !user.kycDocuments.addressProof?.startsWith('https://'),
        selfie: !user.kycDocuments.selfie?.startsWith('https://')
      };
      
      // If all URLs are already in https:// format, just use them directly
      if (!needsConversion.idProof && !needsConversion.addressProof && !needsConversion.selfie) {
        setDocumentURLs(prev => ({ 
          ...prev, 
          [user.id]: {
            idProof: user.kycDocuments?.idProof || null,
            addressProof: user.kycDocuments?.addressProof || null,
            selfie: user.kycDocuments?.selfie || null
          } 
        }));
        return;
      }
      
      // Otherwise, convert using the getKYCDocumentURLs function
      const urls = await getKYCDocumentURLs(user.kycDocuments);
      if (urls) {
        setDocumentURLs(prev => ({ ...prev, [user.id]: urls }));
      }
    } catch (error) {
      console.error('Failed to convert document URLs for user:', user.id, error);
      toast({
        title: "Document Error",
        description: "Failed to load KYC documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingDocuments(prev => ({ ...prev, [user.id]: false }));
    }
  };

  // Convert URLs when a user is selected for document review
  useEffect(() => {
    if (selectedUser && selectedUser.kycDocuments) {
      convertDocumentURLs(selectedUser);
    }
  }, [selectedUser]);
  
  // Fetch pending KYC users
  const { data: pendingUsers, isLoading: isLoadingPending } = useQuery({
    queryKey: ['/users/kyc/pending'],
  });
  
  // Fetch all users to filter for verified/rejected
  const { data: allUsers, isLoading: isLoadingAllUsers } = useQuery({
    queryKey: ['/users'],
  });
  // Mutation for updating KYC status
  const mutation = useMutation({
    mutationFn: async ({ userId, approved }: { userId: string, approved: boolean }) => {
      return apiRequest("PATCH", `/users/${userId}`, { 
        kycStatus: approved ? "APPROVED" : "REJECTED",
        isVerified: approved
      });
    },
    onSuccess: async () => {
      toast({
        title: "KYC Status Updated",
        description: "The user's KYC status has been successfully updated.",
      });
      
      // Close modal
      setSelectedUser(null);
      
      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['/users/kyc/pending'] });
      await queryClient.invalidateQueries({ queryKey: ['/users'] });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Update Failed",
        description: "Failed to update KYC status. Please try again.",
        variant: "destructive",
      });
    },
  });
  const handleKycVerification = (userId: string, approved: boolean) => {
    // Safety check to ensure userId is valid
    if (!userId || userId.trim() === '') {
      toast({
        title: "Invalid User",
        description: "Cannot update KYC status: Invalid user ID.",
        variant: "destructive",
      });
      return;
    }
    
    mutation.mutate({ userId, approved });
  };  // Filter verified and rejected users
  const verifiedUsers = (allUsers as KycUser[])?.filter((user: KycUser) => 
    user.kycStatus === "APPROVED" && user.id && user.id.trim() !== ""
  ) || [];
  const rejectedUsers = (allUsers as KycUser[])?.filter((user: KycUser) => 
    user.kycStatus === "REJECTED" && user.id && user.id.trim() !== ""
  ) || [];

  // Filter pending users to ensure they have valid IDs
  const validPendingUsers = (pendingUsers as KycUser[])?.filter((user: KycUser) => 
    user.kycStatus === "PENDING" && user.id && user.id.trim() !== ""
  ) || [];
  // Helper to display KYC document list
  const renderKycDocuments = (user: any) => {
    if (!user.kycDocuments) return <p className="text-muted-foreground">No documents available</p>;
    
    const showDocument = (type: string, label: string) => {
      // Get document URL based on type
      let documentUrl = '';
      switch (type) {
        case 'idProof':
          documentUrl = user.kycDocuments.idProof || '';
          break;
        case 'addressProof':
          documentUrl = user.kycDocuments.addressProof || '';
          break;
        case 'selfie':
          documentUrl = user.kycDocuments.selfie || '';
          break;
      }
      
      if (!documentUrl) return null;
      
      const handleClickDocument = async () => {
        try {
          // Check if we already have a converted URL
          if (documentURLs[user.id]?.[type]) {
            setEnlargedImage(documentURLs[user.id][type]);
            return;
          }
          
          // Otherwise convert the document URL
          await convertDocumentURLs(user);
          if (documentURLs[user.id]?.[type]) {
            setEnlargedImage(documentURLs[user.id][type]);
          }
        } catch (error) {
          console.error('Failed to show document:', error);
          toast({
            title: "Failed to load document",
            description: "Could not load the document image. Please try again.",
            variant: "destructive",
          });
        }
      };
      
      return (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-auto py-2"
          onClick={handleClickDocument}
        >
          <Eye className="h-3 w-3 mr-2" />
          {label}
        </Button>
      );
    };
    
    return (
      <div className="grid grid-cols-2 gap-2 mt-2">
        {showDocument('idProof', 'ID Proof')}
        {showDocument('addressProof', 'Address Proof')}
        {showDocument('selfie', 'Selfie')}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-game font-bold mb-2">KYC Verification</h1>
        <p className="text-muted-foreground">Review and verify user KYC documents</p>
      </div>
      
      <Tabs defaultValue="pending">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3">
          <TabsTrigger value="pending">Pending ({validPendingUsers.length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({verifiedUsers.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedUsers.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Verifications</CardTitle>
              <CardDescription>
                Users who have submitted KYC documents and are waiting for verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPending ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-card animate-pulse rounded-md"></div>
                  ))}
                </div>              ) : !validPendingUsers || validPendingUsers.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No pending KYC verifications</p>
                </div>
              ) : (                <div className="space-y-4">
                  {validPendingUsers.map((user: KycUser, index: number) => (
                    <div key={getUserKey(user, index)} className="p-4 border border-border rounded-md">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarFallback>
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{user.name}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {user.email}
                              </p>
                              <Badge className={getStatusColor("pending")}>
                                Pending
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                Submitted: {formatDateTime(user.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review Documents
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon"
                            onClick={() => handleKycVerification(user.id, false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="default"
                            size="icon"
                            onClick={() => handleKycVerification(user.id, true)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="verified">
          <Card>
            <CardHeader>
              <CardTitle>Verified Users</CardTitle>
              <CardDescription>
                Users who have completed the KYC verification process
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAllUsers ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-card animate-pulse rounded-md"></div>
                  ))}
                </div>
              ) : verifiedUsers.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No verified users</p>
                </div>
              ) : (                <div className="space-y-4">
                  {verifiedUsers.map((user: KycUser, index: number) => (
                    <div key={getUserKey(user, index)} className="p-4 border border-border rounded-md">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarFallback>
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{user.name}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {user.email}
                              </p>
                              <Badge className={getStatusColor("verified")}>
                                Verified
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button asChild variant="outline">
                          <Link href={`/users/${user.id}`}>
                            View Profile
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Verifications</CardTitle>
              <CardDescription>
                Users whose KYC verification was rejected
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAllUsers ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-card animate-pulse rounded-md"></div>
                  ))}
                </div>
              ) : rejectedUsers.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No rejected verifications</p>
                </div>
              ) : (                <div className="space-y-4">
                  {rejectedUsers.map((user: KycUser, index: number) => (
                    <div key={getUserKey(user, index)} className="p-4 border border-border rounded-md">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarFallback>
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{user.name}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {user.email}
                              </p>
                              <Badge className={getStatusColor("rejected")}>
                                Rejected
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Documents
                          </Button>
                          <Button 
                            variant="default"
                            onClick={() => handleKycVerification(user.id, true)}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* KYC Document review dialog */}
      <Dialog 
        open={!!selectedUser} 
        onOpenChange={(open) => !open && setSelectedUser(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>KYC Document Review</DialogTitle>
            <DialogDescription>
              Review the submitted KYC documents for verification
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 my-2">
              <div className="flex items-center mb-4">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarFallback>
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
                <div className="space-y-4">
                {loadingDocuments[selectedUser.id] ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <p className="text-muted-foreground">Converting document URLs...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Use converted URLs if available, otherwise show loading or original URLs */}
                    {((documentURLs[selectedUser.id]?.idProof) || selectedUser.kycDocuments?.idProof) && (
                      <Card>
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-sm">ID Proof</CardTitle>
                        </CardHeader>
                        <CardContent className="py-3 px-4">
                          <div className="h-40 bg-card-foreground/5 rounded-md overflow-hidden relative group cursor-pointer" 
                               onClick={() => setEnlargedImage(documentURLs[selectedUser.id]?.idProof || selectedUser.kycDocuments?.idProof)}>
                            <img
                              src={documentURLs[selectedUser.id]?.idProof || selectedUser.kycDocuments?.idProof}
                              alt="ID Proof Document"
                              className="w-full h-full object-cover rounded-md transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                                if (sibling) sibling.style.display = 'flex';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="h-6 w-6 text-white" />
                            </div>
                            <div className="h-full w-full flex items-center justify-center bg-muted" style={{ display: 'none' }}>
                              <p className="text-sm text-muted-foreground">Failed to load image</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {((documentURLs[selectedUser.id]?.addressProof) || selectedUser.kycDocuments?.addressProof) && (
                      <Card>
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-sm">Address Proof</CardTitle>
                        </CardHeader>
                        <CardContent className="py-3 px-4">
                          <div className="h-40 bg-card-foreground/5 rounded-md overflow-hidden relative group cursor-pointer" 
                               onClick={() => setEnlargedImage(documentURLs[selectedUser.id]?.addressProof || selectedUser.kycDocuments?.addressProof)}>
                            <img
                              src={documentURLs[selectedUser.id]?.addressProof || selectedUser.kycDocuments?.addressProof}
                              alt="Address Proof Document"
                              className="w-full h-full object-cover rounded-md transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                                if (sibling) sibling.style.display = 'flex';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="h-6 w-6 text-white" />
                            </div>
                            <div className="h-full w-full flex items-center justify-center bg-muted" style={{ display: 'none' }}>
                              <p className="text-sm text-muted-foreground">Failed to load image</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {((documentURLs[selectedUser.id]?.selfie) || selectedUser.kycDocuments?.selfie) && (
                      <Card>
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-sm">Selfie</CardTitle>
                        </CardHeader>
                        <CardContent className="py-3 px-4">
                          <div className="h-40 bg-card-foreground/5 rounded-md overflow-hidden relative group cursor-pointer" 
                               onClick={() => setEnlargedImage(documentURLs[selectedUser.id]?.selfie || selectedUser.kycDocuments?.selfie)}>
                            <img
                              src={documentURLs[selectedUser.id]?.selfie || selectedUser.kycDocuments?.selfie}
                              alt="User Selfie"
                              className="w-full h-full object-cover rounded-md transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                                if (sibling) sibling.style.display = 'flex';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="h-6 w-6 text-white" />
                            </div>
                            <div className="h-full w-full flex items-center justify-center bg-muted" style={{ display: 'none' }}>
                              <p className="text-sm text-muted-foreground">Failed to load image</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Show message if no documents */}
                    {!selectedUser.kycDocuments?.idProof && !selectedUser.kycDocuments?.addressProof && !selectedUser.kycDocuments?.selfie && (
                      <div className="col-span-full text-center py-8">
                        <p className="text-muted-foreground">No KYC documents have been uploaded by this user.</p>
                      </div>
                    )}
                  </div>
                )}
                  <Card className="mt-4">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm">User Details</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3 px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Full Name</p>
                        <p className="text-muted-foreground">{selectedUser.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-muted-foreground">{selectedUser.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-muted-foreground">{selectedUser.phone || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-muted-foreground">{selectedUser.location || "Not provided"}</p>
                      </div>
                      
                      {/* KYC Document Type and Number */}
                      {selectedUser.documentType && (
                        <div>
                          <p className="text-sm font-medium">Document Type</p>
                          <p className="text-muted-foreground uppercase">{selectedUser.documentType || "Not provided"}</p>
                        </div>
                      )}
                      
                      {selectedUser.documentNumber && (
                        <div>
                          <p className="text-sm font-medium">Document Number</p>
                          <p className="text-muted-foreground">{selectedUser.documentNumber || "Not provided"}</p>
                        </div>
                      )}
                      
                      {/* KYC Submission Date */}
                      {selectedUser.createdAt && (
                        <div>
                          <p className="text-sm font-medium">Submission Date</p>
                          <p className="text-muted-foreground">
                            {typeof selectedUser.createdAt === 'string' 
                              ? new Date(selectedUser.createdAt).toLocaleString() 
                              : selectedUser.createdAt instanceof Date 
                                ? selectedUser.createdAt.toLocaleString()
                                : "Unknown date"
                            }
                          </p>
                        </div>
                      )}
                      
                      {/* Current KYC Status */}
                      <div>
                        <p className="text-sm font-medium">KYC Status</p>
                        <p className="text-muted-foreground">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            selectedUser.kycStatus === 'APPROVED' 
                              ? 'bg-green-500/20 text-green-500' 
                              : selectedUser.kycStatus === 'REJECTED'
                                ? 'bg-red-500/20 text-red-500'
                                : 'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {selectedUser.kycStatus?.charAt(0).toUpperCase() + selectedUser.kycStatus?.slice(1) || "Unknown"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="destructive"
              onClick={() => handleKycVerification(selectedUser.id, false)}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Reject Verification
            </Button>
            <Button 
              variant="default"
              onClick={() => handleKycVerification(selectedUser.id, true)}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Approve Verification
            </Button>          </DialogFooter>
        </DialogContent>
      </Dialog>      {/* Enlarged Image Modal */}
      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-4xl bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
            {enlargedImage && (
              <DialogDescription>
                {enlargedImage.startsWith('https://firebasestorage.googleapis.com') ? 
                  'Firebase Storage Document' : 
                  'Document Image'}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex justify-center">
            {enlargedImage && (
              <div className="relative w-full">
                <img
                  src={enlargedImage}
                  alt="Enlarged document"
                  className="max-w-full max-h-[70vh] object-contain rounded-md mx-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                    if (sibling) sibling.style.display = 'block';
                    
                    // If the URL is a Firebase Storage URL that starts with gs://, try to convert it
                    if (enlargedImage.startsWith('gs://') && selectedUser) {
                      convertDocumentURLs(selectedUser);
                    }
                  }}
                />
                <div style={{ display: 'none' }} className="text-center py-8">
                  <p className="text-muted-foreground">Failed to load document image.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => {
                      // Open the URL in a new tab as a fallback
                      window.open(enlargedImage, '_blank');
                    }}
                  >
                    Open in New Tab
                  </Button>
                  {enlargedImage && (
                    <p className="text-xs text-muted-foreground mt-2">
                      URL: {enlargedImage.substring(0, 60)}
                      {enlargedImage.length > 60 ? '...' : ''}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KycVerification;
