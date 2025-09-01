import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Edit2, 
  Trash2, 
  Search,
  Eye,
  MoreHorizontal,
  UserX
} from 'lucide-react';
import { useUserManagementApi } from '../hooks/useUserManagementApi';
import { OnboardedUser, AllUsersResponse } from '../services/userManagementApi';
import { useAuthStore } from '@/store/authStore';
import { DeactivateUserDialog } from './DeactivateUserDialog';

export const OnboardedUsers: React.FC = () => {
  const { getAllUsers, deactivateUser } = useUserManagementApi();
  const authStore = useAuthStore.getState();
  const hospitalId = authStore.getHospitalId();
  const currentUserId = authStore.getUserId();
  
  const { data: allUsersResponse, isLoading, error } = getAllUsers(hospitalId || '');
  const users = allUsersResponse?.users || [];
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Deactivate user states
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    fullName: string;
    email: string;
  } | null>(null);
  
  // Get unique roles for filter (using employeeID as role for now since roleName is not in the new API)
  const uniqueRoles = Array.from(new Set(users.map(user => user.employeeID || 'Unknown')));

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.mobileNumber.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || (user.employeeID || 'Unknown') === roleFilter;
    const matchesStatus = statusFilter === 'all' || (user.isActive ? 'active' : 'inactive') === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'admindoctor':
        return 'bg-purple-100 text-purple-800';
      case 'doctor':
        return 'bg-blue-100 text-blue-800';
      case 'nurse':
        return 'bg-green-100 text-green-800';
      case 'receptionist':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle deactivate user
  const handleDeactivateUser = (user: { userId: string; fullName: string; email: string }) => {
    setSelectedUser(user);
    setShowDeactivateDialog(true);
  };

  const confirmDeactivateUser = async () => {
    if (!selectedUser || !hospitalId || !currentUserId) return;

    try {
      await deactivateUser.mutateAsync({
        hospitalId,
        userId: selectedUser.userId,
        performedByUserId: currentUserId,
      });
      
      setShowDeactivateDialog(false);
      setSelectedUser(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading onboarded users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600">Error loading onboarded users</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

            {/* Users Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'No onboarded users yet'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredUsers.map(user => (
            <Card key={user.userId} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header with Avatar and Status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        user.isActive 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate">{user.fullName}</h3>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className={`w-3 h-3 rounded-full ${
                      user.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">Phone:</span>
                      <span>{user.mobileNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">ID:</span>
                      <span>{user.employeeID || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getRoleColor(user.employeeID || 'Unknown')}`}
                    >
                      {user.employeeID || 'Unknown'}
                    </Badge>
                    <Badge 
                      variant={user.isActive ? 'default' : 'secondary'}
                      className={`text-xs ${getStatusColor(user.isActive ? 'active' : 'inactive')}`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {user.isPrimary && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        Primary
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-orange-50 hover:text-orange-600"
                        title="Edit User"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {user.isActive && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeactivateUser({
                            userId: user.userId,
                            fullName: user.fullName,
                            email: user.email
                          })}
                          className={`h-7 w-7 p-0 ${
                            user.userId === currentUserId 
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'hover:bg-red-50 hover:text-red-600'
                          }`}
                          title={user.userId === currentUserId ? "Cannot deactivate yourself" : "Deactivate User"}
                          disabled={user.userId === currentUserId}
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 hover:bg-gray-50"
                      title="More Options"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
       </div>

       {/* Deactivate User Dialog */}
       <DeactivateUserDialog
         isOpen={showDeactivateDialog}
         onClose={() => {
           setShowDeactivateDialog(false);
           setSelectedUser(null);
         }}
         onConfirm={confirmDeactivateUser}
         userName={selectedUser?.fullName || ''}
         userEmail={selectedUser?.email || ''}
         isPending={deactivateUser.isPending}
       />
     </div>
   );
 };

