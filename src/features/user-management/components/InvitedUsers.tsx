import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Eye,
  RefreshCw,
  MoreHorizontal,
  UserPlus,
  AlertCircle,
  Calendar,
  Phone,
  AtSign,
  Send,
  Ban
} from 'lucide-react';
import { useUserManagementApi } from '../hooks/useUserManagementApi';
import { InvitedUser } from '../services/userManagementApi';
import { useAuthStore } from '@/store/authStore';

interface InvitedUsersProps {
  initialScope?: 'Pending' | 'Accepted' | 'Revoked' | 'ALL';
}

export const InvitedUsers: React.FC<InvitedUsersProps> = ({ initialScope = 'ALL' }) => {
  const authStore = useAuthStore.getState();
  const hospitalId = authStore.getHospitalId();
  const currentUserId = authStore.getUserId();
  
  // Scope state for filtering
  const [activeScope, setActiveScope] = useState<'Pending' | 'Accepted' | 'Revoked' | 'ALL'>(initialScope);
  
  // Action states
  const [selectedInvitation, setSelectedInvitation] = useState<InvitedUser | null>(null);
  const [actionType, setActionType] = useState<'resend' | 'revoke' | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [processingInvitations, setProcessingInvitations] = useState<Set<string>>(new Set());
  
  const { getInvitedUsers, manageInvitation } = useUserManagementApi();
  
  // Get all data once and filter on frontend for consistent behavior
  const { data: response, isLoading, error } = getInvitedUsers(hospitalId || '', 'ALL');
  
  // Extract all invitations from response
  const allUsers = response?.invitations || [];
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Helper function to check if invitation is expired
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };
  
  // Get unique roles for filter
  const uniqueRoles = Array.from(new Set(allUsers.map(user => user.roleName)));

  // Filter users based on active scope and other filters
  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.recipientMobile.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || user.roleName === roleFilter;
    
    // Apply scope filtering
    let matchesScope = true;
    if (activeScope !== 'ALL') {
      if (activeScope === 'Revoked') {
        // Include both explicitly revoked and expired invitations
        matchesScope = user.status.toLowerCase() === 'revoked' || 
                      (user.status.toLowerCase() === 'pending' && isExpired(user.expiresAt));
      } else {
        matchesScope = user.status.toLowerCase() === activeScope.toLowerCase();
      }
    }
    
    return matchesSearch && matchesRole && matchesScope;
  });

  // Calculate counts for each status from all data
  const getStatusCount = (status: string) => {
    if (status === 'ALL') {
      return allUsers.length;
    }
    
    if (status === 'Revoked') {
      // Include both explicitly revoked and expired invitations
      return allUsers.filter(user => 
        user.status.toLowerCase() === 'revoked' || 
        (user.status.toLowerCase() === 'pending' && isExpired(user.expiresAt))
      ).length;
    }
    
    return allUsers.filter(user => user.status.toLowerCase() === status.toLowerCase()).length;
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'admindoctor':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'doctor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'nurse':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'receptionist':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'accepted':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'revoked':
      case 'expired':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'revoked':
      case 'expired':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get display status - API should return the correct status
  const getDisplayStatus = (status: string) => {
    return status;
  };

  // Check if a specific invitation is being processed
  const isProcessing = (invitationId: string) => {
    return processingInvitations.has(invitationId);
  };

  // Handle action confirmation
  const handleActionConfirm = async () => {
    if (!selectedInvitation || !actionType || !currentUserId) return;

    // Add to processing set
    setProcessingInvitations(prev => new Set(prev).add(selectedInvitation.invitationId));

    try {
      await manageInvitation.mutateAsync({
        invitationId: selectedInvitation.invitationId,
        scope: actionType,
        performedByUserId: currentUserId,
      });
      
      // Reset states
      setSelectedInvitation(null);
      setActionType(null);
      setShowConfirmDialog(false);
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Error managing invitation:', error);
    } finally {
      // Remove from processing set
      setProcessingInvitations(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedInvitation.invitationId);
        return newSet;
      });
    }
  };

  // Handle action initiation
  const handleAction = (invitation: InvitedUser, action: 'resend' | 'revoke') => {
    setSelectedInvitation(invitation);
    setActionType(action);
    setShowConfirmDialog(true);
  };

  if (!hospitalId) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Hospital ID Not Found</h3>
            <p className="text-muted-foreground">Please log in again to access user management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading invited users...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Scope Tabs */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Tabs value={activeScope} onValueChange={(value) => setActiveScope(value as 'Pending' | 'Accepted' | 'Revoked' | 'ALL')}>
            <TabsList className="grid w-full grid-cols-4 h-auto p-2 bg-muted/30 gap-2">
              <TabsTrigger 
                value="ALL" 
                className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:border-2 data-[state=active]:border-primary/20 data-[state=active]:scale-105 transition-all duration-200 hover:bg-muted/50 rounded-lg"
              >
                <span className="font-medium">All</span>
                <Badge variant={activeScope === 'ALL' ? 'default' : 'secondary'} className="text-xs">
                  {allUsers.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="Pending" 
                className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:border-2 data-[state=active]:border-yellow-200 data-[state=active]:scale-105 transition-all duration-200 hover:bg-muted/50 rounded-lg"
              >
                <span className="font-medium">Pending</span>
                <Badge variant={activeScope === 'Pending' ? 'default' : 'secondary'} className="text-xs">
                  {getStatusCount('pending')}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="Accepted" 
                className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:border-2 data-[state=active]:border-green-200 data-[state=active]:scale-105 transition-all duration-200 hover:bg-muted/50 rounded-lg"
              >
                <span className="font-medium">Accepted</span>
                <Badge variant={activeScope === 'Accepted' ? 'default' : 'secondary'} className="text-xs">
                  {getStatusCount('accepted')}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="Revoked" 
                className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:border-2 data-[state=active]:border-red-200 data-[state=active]:scale-105 transition-all duration-200 hover:bg-muted/50 rounded-lg"
              >
                <span className="font-medium">Revoked</span>
                <Badge variant={activeScope === 'Revoked' ? 'default' : 'secondary'} className="text-xs">
                  {getStatusCount('revoked')}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Enhanced Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search invitations by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px] h-11">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Users List */}
      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No invitations found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {searchTerm || roleFilter !== 'all' 
                  ? 'Try adjusting your search or filters to find what you\'re looking for.'
                  : `No ${activeScope.toLowerCase()} invitations found in the system.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map(user => (
            <Card key={user.invitationId} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserPlus className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg truncate">{user.recipientName}</h3>
                        <Badge className={`${getStatusColor(user.status)} border`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(user.status)}
                            <span className="capitalize">{getDisplayStatus(user.status)}</span>
                          </div>
                        </Badge>

                      </div>
                      
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AtSign className="h-3 w-3" />
                          <span className="truncate">{user.recipientEmail}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{user.recipientMobile}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Badge className={`${getRoleColor(user.roleName)} border`}>
                          {user.roleName}
                        </Badge>
                        
                        {/* Action Availability Indicators */}
                        {user.status.toLowerCase() !== 'accepted' && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            <Send className="h-2 w-2 mr-1" />
                            Can Resend
                          </Badge>
                        )}
                        {user.status.toLowerCase() !== 'revoked' && (
                          <Badge variant="outline" className="text-red-600 border-red-200">
                            <Ban className="h-2 w-2 mr-1" />
                            Can Revoke
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                    <div className="text-left sm:text-right space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Created: {formatDate(user.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Expires: {formatDate(user.expiresAt)}</span>
                      </div>
                      {user.acceptedAt && (
                        <div className="flex items-center gap-2 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          <span>Accepted: {formatDate(user.acceptedAt)}</span>
                        </div>
                      )}
                      {user.revokedAt && (
                        <div className="flex items-center gap-2 text-xs text-red-600">
                          <XCircle className="h-3 w-3" />
                          <span>Revoked: {formatDate(user.revokedAt)}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Section */}
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      {/* Action Buttons */}
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                        </Button>
                        
                        {/* Visible Action Buttons */}
                        {user.status.toLowerCase() !== 'accepted' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAction(user, 'resend')}
                            disabled={manageInvitation.isPending || isProcessing(user.invitationId)}
                            className="h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                          >
                            {isProcessing(user.invitationId) ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                            ) : (
                              <Send className="h-3 w-3 mr-1" />
                            )}
                            {isProcessing(user.invitationId) ? 'Sending...' : 'Resend'}
                          </Button>
                        )}
                        
                        {user.status.toLowerCase() !== 'revoked' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAction(user, 'revoke')}
                            disabled={manageInvitation.isPending || isProcessing(user.invitationId)}
                            className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                          >
                            {isProcessing(user.invitationId) ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                            ) : (
                              <Ban className="h-3 w-3 mr-1" />
                            )}
                            {isProcessing(user.invitationId) ? 'Revoking...' : 'Revoke'}
                          </Button>
                        )}
                        
                        {/* Additional Actions Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="h-4 w-4 mr-2" />
                              View Timeline
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-orange-600 focus:text-orange-600">
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Refresh Status
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Action Status Indicator */}
                      {isProcessing(user.invitationId) && (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                          <span>Processing action...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'resend' ? 'Resend Invitation Email' : 'Revoke Invitation Access'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'resend' ? (
                <>
                  Are you sure you want to resend the invitation email to{' '}
                  <span className="font-semibold">{selectedInvitation?.recipientName}</span>?
                  <br />
                  <span className="text-sm text-muted-foreground">
                    A new invitation email will be sent to {selectedInvitation?.recipientEmail}
                  </span>
                </>
              ) : (
                <>
                  Are you sure you want to revoke the invitation for{' '}
                  <span className="font-semibold">{selectedInvitation?.recipientName}</span>?
                  <br />
                  <span className="text-sm text-muted-foreground">
                    This action cannot be undone and will prevent the user from completing registration.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleActionConfirm}
              disabled={manageInvitation.isPending || isProcessing(selectedInvitation?.invitationId || '')}
              className={actionType === 'revoke' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {manageInvitation.isPending || isProcessing(selectedInvitation?.invitationId || '') ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {actionType === 'resend' ? 'Sending...' : 'Revoking...'}
                </>
              ) : (
                actionType === 'resend' ? 'Resend Email' : 'Revoke Access'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

