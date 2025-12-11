  // ...validation helpers removed...
  import React, { useState } from 'react';
  import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, 
  Search,
  Eye,
  MoreHorizontal,
  UserX,
  Mail,
  Phone,
  Shield,
  Key
} from 'lucide-react';
import { useUserManagementApi } from '../hooks/useUserManagementApi';
import { AllUsersResponse } from '../services/userManagementApi';
import { useAuthStore } from '@/store/authStore';
import { DeactivateUserDialog } from './DeactivateUserDialog';

export const OnboardedUsers: React.FC = () => {
  const { t } = useTranslation();
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

  // View user details state
  const [viewUser, setViewUser] = useState<AllUsersResponse['users'][number] | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const getPrimaryRoleName = (user: AllUsersResponse['users'][number]) =>
    user.roles?.[0]?.roleName || t('userManagement.onboardedUsers.unknownRole');

  const getUserStatus = (statusId: number) => (statusId === 1 ? 'active' : 'inactive');
  const isUserActive = (user: AllUsersResponse['users'][number]) => getUserStatus(user.usersStatusId) === 'active';

  // Get unique roles for filter
  const uniqueRoles = Array.from(new Set(users.map((user) => getPrimaryRoleName(user))));

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.mobileNumber.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || getPrimaryRoleName(user) === roleFilter;
    const matchesStatus = statusFilter === 'all' || getUserStatus(user.usersStatusId) === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (roleName?: string) => {
    switch ((roleName || 'unknown').toLowerCase()) {
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
        <div className="text-muted-foreground">{t('userManagement.onboardedUsers.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600">{t('userManagement.onboardedUsers.error')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
            <div className="flex-1">
              <div className="relative flex flex-col">
                <label className="block text-sm font-medium mb-1">{t('userManagement.onboardedUsers.searchLabel')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={t('userManagement.onboardedUsers.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="w-full md:w-[200px] flex flex-col">
              <label className="block text-sm font-medium mb-1">{t('userManagement.onboardedUsers.roleLabel')}</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('userManagement.onboardedUsers.rolePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('userManagement.onboardedUsers.allRoles')}</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[200px] flex flex-col">
              <label className="block text-sm font-medium mb-1">{t('userManagement.onboardedUsers.statusLabel')}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('userManagement.onboardedUsers.statusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('userManagement.onboardedUsers.status.all')}</SelectItem>
                  <SelectItem value="active">{t('userManagement.onboardedUsers.status.active')}</SelectItem>
                  <SelectItem value="inactive">{t('userManagement.onboardedUsers.status.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                <h3 className="text-lg font-semibold mb-2">{t('userManagement.onboardedUsers.emptyTitle')}</h3>
                <p className="text-muted-foreground">
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                    ? t('userManagement.onboardedUsers.emptyFilters')
                    : t('userManagement.onboardedUsers.emptyDefault')
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredUsers.map(user => {
            return (
              <Card key={user.userId} className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header with Avatar and Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isUserActive(user)
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm truncate">{user.fullName}</h3>
                          <p className="text-xs truncate text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      {/* Status Indicator */}
                      <div className={`w-3 h-3 rounded-full ${
                        isUserActive(user) ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{t('userManagement.onboardedUsers.labels.phone')}:</span>
                        <span>{user.mobileNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{t('userManagement.onboardedUsers.labels.role')}:</span>
                        <span>{getPrimaryRoleName(user)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{t('userManagement.onboardedUsers.labels.id')}:</span>
                        <span>{user.employeeID || t('userManagement.onboardedUsers.na')}</span>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getRoleColor(getPrimaryRoleName(user))}`}
                      >
                        {getPrimaryRoleName(user)}
                      </Badge>
                      <Badge 
                        variant={isUserActive(user) ? 'default' : 'secondary'}
                        className={`text-xs ${getStatusColor(isUserActive(user) ? 'active' : 'inactive')}`}
                      >
                        {isUserActive(user) ? t('userManagement.onboardedUsers.status.active') : t('userManagement.onboardedUsers.status.inactive')}
                      </Badge>
                      {user.isPrimary && (
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                          {t('userManagement.onboardedUsers.badges.primary')}
                        </Badge>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setViewUser(user);
                            setIsViewDialogOpen(true);
                          }}
                          className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                          title={t('userManagement.onboardedUsers.actions.viewTooltip')}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeactivateUser({
                            userId: user.userId,
                            fullName: user.fullName,
                            email: user.email
                          })}
                          className={`h-7 w-7 p-0 ${
                            isUserActive(user) && user.userId !== currentUserId
                              ? 'hover:bg-red-50 hover:text-red-600'
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                          title={
                            user.userId === currentUserId
                              ? t('userManagement.onboardedUsers.actions.cannotDeactivateSelf')
                              : isUserActive(user)
                                ? t('userManagement.onboardedUsers.actions.deactivateUser')
                                : t('userManagement.onboardedUsers.actions.alreadyInactive')
                          }
                          disabled={!isUserActive(user) || user.userId === currentUserId}
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-gray-50"
                        title={t('userManagement.onboardedUsers.actions.moreOptions')}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
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

       {/* View User Details Dialog */}
       <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
         setIsViewDialogOpen(open);
         if (!open) {
           setViewUser(null);
         }
       }}>
         <DialogContent className="sm:max-w-lg">
           <DialogHeader>
                <DialogTitle>{t('userManagement.onboardedUsers.view.title')}</DialogTitle>
                <DialogDescription>{t('userManagement.onboardedUsers.view.description')}</DialogDescription>
           </DialogHeader>
           {viewUser && (
             <div className="space-y-6 text-sm">
               <div className="flex items-center gap-4 rounded-xl border bg-muted/40 p-4">
                 <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                   isUserActive(viewUser) ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                 }`}>
                   <Users className="h-6 w-6" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('userManagement.onboardedUsers.view.fullNameLabel')}</p>
                    <p className="text-lg font-semibold truncate">{viewUser.fullName || t('userManagement.onboardedUsers.view.notProvided')}</p>
                   <div className="mt-2 flex flex-wrap gap-2">
                     <Badge className={getRoleColor(getPrimaryRoleName(viewUser))}>{getPrimaryRoleName(viewUser)}</Badge>
                     <Badge variant="outline" className={isUserActive(viewUser) ? 'border-emerald-200 text-emerald-700' : 'border-gray-200 text-gray-600'}>
                        {isUserActive(viewUser) ? t('userManagement.onboardedUsers.status.active') : t('userManagement.onboardedUsers.status.inactive')}
                     </Badge>
                     {viewUser.isPrimary && (
                        <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">{t('userManagement.onboardedUsers.badges.primary')}</Badge>
                     )}
                   </div>
                 </div>
               </div>

               <div className="grid gap-4 sm:grid-cols-2">
                 <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{t('userManagement.onboardedUsers.view.contact')}</p>
                   <div className="flex items-center gap-2">
                     <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{viewUser.email || '—'}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{viewUser.mobileNumber || '—'}</span>
                   </div>
                 </div>
                 <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{t('userManagement.onboardedUsers.view.identity')}</p>
                   <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('userManagement.onboardedUsers.labels.employeeId')}</span>
                      <span className="font-medium">{viewUser.employeeID || '—'}</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('userManagement.onboardedUsers.labels.primaryUser')}</span>
                     <Badge variant="outline" className={viewUser.isPrimary ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-gray-200 text-gray-600 bg-gray-50'}>
                        {viewUser.isPrimary ? t('common.yes') : t('common.no')}
                     </Badge>
                   </div>
                 </div>
               </div>

               {viewUser.roles?.length ? (
                 <div className="rounded-lg border p-3">
                   <div className="flex items-center gap-2 mb-3">
                     <Shield className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('userManagement.onboardedUsers.view.roles')}</p>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     {viewUser.roles.map((role) => (
                       <Badge key={role.roleId} variant="secondary" className={`text-xs ${getRoleColor(role.roleName)}`}>
                         {role.roleName}
                       </Badge>
                     ))}
                   </div>
                 </div>
               ) : null}

               {viewUser.permissionKeys?.length ? (
                 <div className="rounded-lg border p-3">
                   <div className="flex items-center gap-2 mb-3">
                     <Key className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('userManagement.onboardedUsers.view.permissions')}</p>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     {viewUser.permissionKeys.map((permission) => (
                       <Badge key={permission} variant="outline" className="text-xs">
                         {permission}
                       </Badge>
                     ))}
                   </div>
                 </div>
               ) : null}
             </div>
           )}
           <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>{t('common.close')}</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 };

