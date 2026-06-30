// ...validation helpers removed...
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Users,
  Search,
  Eye,
  Pencil,

  UserX,
  Mail,
  Phone,
  Shield,
  Key,
  KeyRound
} from 'lucide-react';
import { useUserManagementApi } from '../hooks/useUserManagementApi';
import { AllUsersResponse } from '../services/userManagementApi';
import { useAuthStore } from '@/store/authStore';
import { DeactivateUserDialog } from './DeactivateUserDialog';
import { ShareLoginDialog, ShareLoginTarget } from './ShareLoginDialog';
import { QuickAddUserForm } from './QuickAddUserForm';
import { cn } from '@/lib/utils';

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

  // Edit user state
  const [editUser, setEditUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Share-login (reset + re-share credentials) state
  const [shareTarget, setShareTarget] = useState<ShareLoginTarget | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const getPrimaryRoleName = (user: AllUsersResponse['users'][number]) =>
    user.roles?.[0]?.roleName || t('userManagement.onboardedUsers.unknownRole');

  const getUserStatus = (statusId: number) => (statusId === 1 ? 'active' : 'inactive');
  const isUserActive = (user: AllUsersResponse['users'][number]) => getUserStatus(user.usersStatusId) === 'active';

  // Get unique roles for filter
  const uniqueRoles = Array.from(new Set(users.flatMap((user) => 
    user.roles?.length ? user.roles.map(r => r.roleName) : [t('userManagement.onboardedUsers.unknownRole')]
  )));

  const filteredUsers = users.filter((user) => {
    const matchesSearch = (user.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.mobileNumber || '').includes(searchTerm);
    const hasRoles = user.roles && user.roles.length > 0;
    const matchesRole = roleFilter === 'all' || 
      (hasRoles ? user.roles!.some(r => r.roleName === roleFilter) : roleFilter === t('userManagement.onboardedUsers.unknownRole'));
    const matchesStatus = statusFilter === 'all' || getUserStatus(user.usersStatusId) === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  }).sort((a, b) => {
    // Sort Active users first
    const aActive = isUserActive(a) ? 1 : 0;
    const bActive = isUserActive(b) ? 1 : 0;
    // Followed by alphabetical sorting by name as a secondary sort
    if (aActive === bActive) {
      return a.fullName.localeCompare(b.fullName);
    }
    return bActive - aActive;
  });

  const getRoleColor = (roleName?: string) => {
    switch ((roleName || 'unknown').toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'admindoctor':
        return 'bg-purple-100 text-purple-800';
      case 'doctor':
        return 'bg-brand-100 text-brand-800';
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
              <Card
                key={user.userId}
                className={cn(
                  "relative overflow-hidden group transition-all duration-300",
                  isUserActive(user)
                    ? "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:border-emerald-400/50 hover:-translate-y-1 bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-900 dark:to-emerald-900/10"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-85 hover:opacity-100 grayscale-[0.6]"
                )}
              >
                {/* Active Inner Glow Line */}
                {isUserActive(user) && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 opacity-80" />
                )}
                {/* Inactive Tag */}
                {!isUserActive(user) && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-slate-800 text-slate-100 text-[11px] font-mono font-bold tracking-widest uppercase rounded-bl-lg shadow-sm z-10 transition-colors group-hover:bg-red-900 group-hover:text-red-50">
                    INACTIVE / OFFLINE
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="space-y-4">
                    {/* Header: Avatar, Name & Email */}
                    <div className="flex items-start gap-4 p-1">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden transition-transform duration-300 group-hover:scale-105",
                        isUserActive(user)
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700"
                      )}>
                        {/* Diagonal Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent dark:from-white/10" />
                        <Users className="h-6 w-6 relative z-10" />
                        {/* Online Pulse */}
                        {isUserActive(user) && (
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse z-20" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pt-0.5">
                        <h3 className={cn(
                          "font-bold text-base truncate tracking-tight transition-colors duration-300",
                          isUserActive(user)
                            ? "text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400"
                            : "text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600"
                        )}>
                          {user.fullName}
                        </h3>
                        <p className="text-[11px] truncate text-muted-foreground font-mono mt-0.5 tracking-tight group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* HUD Details Grid - Monospace / Sci-Fi layout */}
                    <div className={cn(
                      "grid grid-cols-2 gap-3 p-3 rounded-lg border transition-colors duration-300",
                      isUserActive(user)
                        ? "bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 group-hover:border-emerald-200 dark:group-hover:border-emerald-800/50"
                        : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    )}>
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" />
                          {t('userManagement.onboardedUsers.labels.phone')}
                        </span>
                        <div className={cn(
                          "text-xs font-mono font-medium tracking-tight",
                          isUserActive(user) ? "text-slate-700 dark:text-slate-300" : "text-slate-500 dark:text-slate-500"
                        )}>
                          {user.mobileNumber}
                        </div>
                      </div>
                      <div className="space-y-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
                        <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1">
                          <Shield className="h-2.5 w-2.5" />
                          {t('userManagement.onboardedUsers.labels.id')}
                        </span>
                        <div className={cn(
                          "text-xs font-mono font-medium tracking-tight truncate",
                          isUserActive(user) ? "text-slate-700 dark:text-slate-300" : "text-slate-500 dark:text-slate-500"
                        )}>
                          {user.employeeID || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Badges & Actions Footer */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className={cn(
                                "text-[11px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 border shadow-sm transition-colors",
                                isUserActive(user)
                                  ? getRoleColor(role.roleName)
                                  : "bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                              )}
                            >
                              {role.roleName}
                            </Badge>
                          ))
                        ) : (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[11px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 border shadow-sm transition-colors",
                              isUserActive(user)
                                ? getRoleColor(undefined)
                                : "bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            )}
                          >
                            {t('userManagement.onboardedUsers.unknownRole')}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewUser(user);
                            setIsViewDialogOpen(true);
                          }}
                          className={cn(
                            "h-8 w-8 p-0 rounded-lg transition-all duration-300",
                            isUserActive(user)
                              ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-900/20 shadow-sm"
                              : "bg-transparent border-slate-300 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                          )}
                          title={t('userManagement.onboardedUsers.actions.viewTooltip')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditUser(user);
                            setIsEditDialogOpen(true);
                          }}
                          className={cn(
                            "h-8 w-8 p-0 rounded-lg transition-all duration-300 shadow-sm",
                            isUserActive(user)
                              ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-900/20"
                              : "bg-transparent border-slate-300 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                          )}
                          title="Edit user details"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShareTarget({
                              userId: user.userId,
                              fullName: user.fullName,
                              email: user.email,
                              mobileNumber: user.mobileNumber,
                            });
                            setShowShareDialog(true);
                          }}
                          className={cn(
                            "h-8 w-8 p-0 rounded-lg transition-all duration-300 shadow-sm",
                            isUserActive(user)
                              ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 dark:hover:bg-amber-900/20'
                              : 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
                          )}
                          title={isUserActive(user) ? t('userManagement.onboardedUsers.actions.shareLogin') : t('userManagement.onboardedUsers.actions.shareLoginInactive')}
                          disabled={!isUserActive(user)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivateUser({
                            userId: user.userId,
                            fullName: user.fullName,
                            email: user.email
                          })}
                          className={cn(
                            "h-8 w-8 p-0 rounded-lg transition-all duration-300 shadow-sm",
                            isUserActive(user) && user.userId !== currentUserId && !user.isPrimary
                              ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 hover:shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                              : 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
                          )}
                          title={
                            user.isPrimary
                              ? t('userManagement.onboardedUsers.actions.cannotDeactivatePrimary', 'Cannot deactivate primary user')
                              : user.userId === currentUserId
                                ? t('userManagement.onboardedUsers.actions.cannotDeactivateSelf')
                                : isUserActive(user)
                                  ? t('userManagement.onboardedUsers.actions.deactivateUser')
                                  : t('userManagement.onboardedUsers.actions.alreadyInactive')
                          }
                          disabled={!isUserActive(user) || user.userId === currentUserId || user.isPrimary}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Share Login (reset + re-share credentials) Dialog */}
      <ShareLoginDialog
        open={showShareDialog}
        onOpenChange={(open) => {
          setShowShareDialog(open);
          if (!open) setShareTarget(null);
        }}
        target={shareTarget}
      />

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

      {/* Edit User Form Modal */}
      <QuickAddUserForm
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditUser(null);
        }}
        editMode={true}
        initialData={editUser}
      />

      {/* View User Details Dialog */}
      <Sheet open={isViewDialogOpen} onOpenChange={(open) => {
        setIsViewDialogOpen(open);
        if (!open) {
          setViewUser(null);
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto flex flex-col p-0 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-950">
          <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <SheetHeader>
              <SheetTitle className="text-lg flex items-center gap-2 text-left">
                <Eye className="h-5 w-5 text-brand-500" />
                {t('userManagement.onboardedUsers.view.title')}
              </SheetTitle>
              <SheetDescription className="text-left">
                {t('userManagement.onboardedUsers.view.description')}
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/20">
            {viewUser && (
              <div className="space-y-6 text-sm">
                <div className="flex items-center gap-4 rounded-xl border bg-muted/40 p-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isUserActive(viewUser) ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
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
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 mt-auto flex justify-end">
            <Button variant="outline" className="px-6 shadow-sm" onClick={() => setIsViewDialogOpen(false)}>{t('common.close')}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div >
  );
};

