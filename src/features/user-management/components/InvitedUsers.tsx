import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Search,

  RefreshCw,
  MoreHorizontal,
  UserPlus,
  AlertCircle,
  Calendar,
  Phone,
  AtSign,
  Send,
  Ban,
  Info,
  FileText
} from 'lucide-react';
import { useUserManagementApi } from '../hooks/useUserManagementApi';
import { InvitedUser } from '../services/userManagementApi';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface InvitedUsersProps {
  initialScope?: 'Pending' | 'Accepted' | 'Revoked' | 'ALL';
}

export const InvitedUsers: React.FC<InvitedUsersProps> = ({ initialScope = 'ALL' }) => {
  const { t } = useTranslation();
  const authStore = useAuthStore.getState();
  const hospitalId = authStore.getHospitalId();
  const currentUserId = authStore.getUserId();
  const navigate = useNavigate();

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
  }).sort((a, b) => {
    // Sort logic: Pending (Active) = 1, Accepted = 2, Revoked/Expired = 3
    const getOrder = (status: string, expiresAt: string) => {
      const s = status.toLowerCase();
      if (s === 'pending') {
        return isExpired(expiresAt) ? 3 : 1;
      }
      if (s === 'accepted') return 2;
      return 3;
    };

    const aOrder = getOrder(a.status, a.expiresAt);
    const bOrder = getOrder(b.status, b.expiresAt);

    if (aOrder !== bOrder) return aOrder - bOrder;
    // Alphabetical secondary sort
    return a.recipientName.localeCompare(b.recipientName);
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

  const scopeFilters = useMemo(
    () => [
      {
        value: 'ALL',
        label: t('userManagement.invitedUsers.status.all'),
        count: allUsers.length,
        badgeClass: 'bg-primary/10 text-primary',
        dotClass: 'bg-primary/70'
      },
      {
        value: 'Pending',
        label: t('userManagement.invitedUsers.status.pending'),
        count: getStatusCount('Pending'),
        badgeClass: 'bg-amber-50 text-amber-700',
        dotClass: 'bg-amber-500'
      },
      {
        value: 'Accepted',
        label: t('userManagement.invitedUsers.status.accepted'),
        count: getStatusCount('Accepted'),
        badgeClass: 'bg-emerald-50 text-emerald-700',
        dotClass: 'bg-emerald-500'
      },
      {
        value: 'Revoked',
        label: t('userManagement.invitedUsers.status.revoked'),
        count: getStatusCount('Revoked'),
        badgeClass: 'bg-rose-50 text-rose-700',
        dotClass: 'bg-rose-500'
      }
    ] as const,
    [allUsers.length, t]
  );

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
    if (!dateString) return t('userManagement.invitedUsers.na');
    // Ensure the date string is treated as UTC if it doesn't specify a timezone
    const utcDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    return new Date(utcDateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get display status - API should return the correct status
  const getDisplayStatus = (status: string) => {
    const key = status.toLowerCase();
    return t(`userManagement.invitedUsers.status.${key}`, { defaultValue: status });
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
            <h3 className="text-lg font-semibold mb-2">{t('userManagement.invitedUsers.hospitalMissingTitle')}</h3>
            <p className="text-muted-foreground">{t('userManagement.invitedUsers.hospitalMissingMessage')}</p>
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
            <p className="text-muted-foreground">{t('userManagement.invitedUsers.loading')}</p>
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
            <h3 className="text-lg font-semibold mb-2">{t('userManagement.invitedUsers.errorTitle')}</h3>
            <p className="text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t('userManagement.invitedUsers.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-11 sm:w-[180px]">
                  <SelectValue placeholder={t('userManagement.invitedUsers.rolePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('userManagement.invitedUsers.allRoles')}</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expiration Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Invitation links will automatically expire <strong>7 days</strong> after they are sent.
          If a user's link expires, you can use the Resend button to send them a new one.
        </p>
      </div>

      {/* Enhanced Users List */}
      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('userManagement.invitedUsers.emptyTitle')}</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {searchTerm || roleFilter !== 'all'
                  ? t('userManagement.invitedUsers.emptyFilterHint')
                  : t('userManagement.invitedUsers.emptyScopeHint', {
                    scope: t(`userManagement.invitedUsers.status.${activeScope.toLowerCase()}`, { defaultValue: activeScope.toLowerCase() })
                  })
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map(user => {
            // Determine detailed status for styling
            const isStatusPending = user.status.toLowerCase() === 'pending';
            const isPending = isStatusPending && !isExpired(user.expiresAt);
            const isAccepted = user.status.toLowerCase() === 'accepted';
            const isInactive = !isPending && !isAccepted; // Revoked or Expired

            return (
              <Card
                key={user.invitationId}
                className={cn(
                  "relative overflow-hidden group transition-all duration-300",
                  isPending ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)] hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] hover:border-amber-400/50 hover:-translate-y-1 bg-gradient-to-br from-white to-amber-50/40 dark:from-slate-900 dark:to-amber-900/10" :
                    isAccepted ? "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:border-emerald-400/50 hover:-translate-y-1 bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-900 dark:to-emerald-900/10" :
                      "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-85 hover:opacity-100 grayscale-[0.6]"
                )}
              >
                {/* Active Inner Glow Lines */}
                {isPending && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 opacity-80" />
                )}
                {isAccepted && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 opacity-80" />
                )}
                {/* Inactive Tag */}
                {isInactive && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-slate-800 text-slate-100 text-[9px] font-mono font-bold tracking-widest uppercase rounded-bl-lg shadow-sm z-10 transition-colors group-hover:bg-red-900 group-hover:text-red-50">
                    {user.status.toLowerCase() === 'revoked' ? 'REVOKED' : 'EXPIRED'}
                  </div>
                )}

                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Left Side: Avatar & Identity */}
                    <div className="flex items-start gap-4 flex-1 w-full lg:w-auto p-1">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden transition-transform duration-300 group-hover:scale-105",
                        isPending ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800" :
                          isAccepted ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" :
                            "bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700"
                      )}>
                        {/* Diagonal Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent dark:from-white/10" />
                        <UserPlus className="h-6 w-6 relative z-10" />
                        {/* Status Pulse */}
                        {isPending && (
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse z-20" />
                        )}
                        {isAccepted && (
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)] z-20" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={cn(
                            "font-bold text-base truncate tracking-tight transition-colors duration-300",
                            isPending ? "text-slate-900 dark:text-white" :
                              isAccepted ? "text-slate-900 dark:text-white" :
                                "text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600"
                          )}>
                            {user.recipientName}
                          </h3>
                          <Badge className={cn(
                            "text-[9px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 border shadow-sm transition-colors",
                            isPending ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" :
                              isAccepted ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" :
                                "bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                          )}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(user.status)}
                              <span className="capitalize">{getDisplayStatus(user.status)}</span>
                            </div>
                          </Badge>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                            <AtSign className="h-3 w-3" />
                            <span className="truncate tracking-tight">{user.recipientEmail}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                            <Phone className="h-3 w-3" />
                            <span className="tracking-tight">{user.recipientMobile}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[9px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 border shadow-sm transition-colors",
                              !isInactive
                                ? getRoleColor(user.roleName)
                                : "bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            )}
                          >
                            {user.roleName}
                          </Badge>

                          {isStatusPending && (
                            <Badge variant="outline" className="text-[9px] font-mono tracking-widest uppercase text-blue-600 border-blue-200 bg-blue-50/50">
                              <Send className="h-2.5 w-2.5 mr-1" />
                              {t('userManagement.invitedUsers.badges.canResend')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Timeline & Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto h-full justify-between lg:justify-end border-t lg:border-t-0 border-slate-100 dark:border-slate-800 pt-3 lg:pt-0">
                      {/* Modular Timeline Grid */}
                      <div className={cn(
                        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 p-3 rounded-lg border transition-colors duration-300 w-full sm:w-auto",
                        !isInactive
                          ? "bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60"
                          : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      )}>
                        <div className="flex items-center justify-between gap-3 text-[10px] font-mono">
                          <span className="text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar className="h-3 w-3" /> Created</span>
                          <span className={cn("font-medium", !isInactive ? "text-slate-700 dark:text-slate-300" : "text-slate-500")}>{formatDate(user.createdAt)}</span>
                        </div>

                        {isPending ? (
                          <div className="flex items-center justify-between gap-3 text-[10px] font-mono border-t sm:border-t-0 sm:border-l lg:border-t lg:border-l-0 border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 sm:pl-3 lg:pt-2 lg:pl-0">
                            <span className="text-slate-400 uppercase tracking-widest flex items-center gap-1"><Clock className="h-3 w-3" /> Expires</span>
                            <span className="font-medium text-amber-600 dark:text-amber-500">{formatDate(user.expiresAt)}</span>
                          </div>
                        ) : isAccepted ? (
                          <div className="flex items-center justify-between gap-3 text-[10px] font-mono border-t sm:border-t-0 sm:border-l lg:border-t lg:border-l-0 border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 sm:pl-3 lg:pt-2 lg:pl-0">
                            <span className="text-slate-400 uppercase tracking-widest flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Accepted</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-500">{formatDate(user.acceptedAt!)}</span>
                          </div>
                        ) : user.revokedAt ? (
                          <div className="flex items-center justify-between gap-3 text-[10px] font-mono border-t sm:border-t-0 sm:border-l lg:border-t lg:border-l-0 border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 sm:pl-3 lg:pt-2 lg:pl-0">
                            <span className="text-slate-400 uppercase tracking-widest flex items-center gap-1"><XCircle className="h-3 w-3" /> Revoked</span>
                            <span className="font-medium text-red-600 dark:text-red-500">{formatDate(user.revokedAt)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 text-[10px] font-mono border-t sm:border-t-0 sm:border-l lg:border-t lg:border-l-0 border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 sm:pl-3 lg:pt-2 lg:pl-0">
                            <span className="text-slate-400 uppercase tracking-widest flex items-center gap-1"><Clock className="h-3 w-3" /> Expired</span>
                            <span className="font-medium text-slate-500">{formatDate(user.expiresAt)}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 w-full sm:w-auto h-full justify-center">
                        <div className="flex gap-2 justify-end sm:justify-start">


                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(user, 'resend')}
                            disabled={manageInvitation.isPending || isProcessing(user.invitationId) || !isStatusPending}
                            className={cn(
                              "h-8 px-3 rounded-lg shadow-sm transition-all duration-300",
                              isStatusPending
                                ? "text-blue-700 hover:text-blue-800 border-blue-200 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/40 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                : "opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200"
                            )}
                          >
                            {isProcessing(user.invitationId) ? (
                              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600 sm:mr-1"></div>
                            ) : (
                              <Send className="h-3.5 w-3.5 sm:mr-1" />
                            )}
                            <span className="hidden sm:inline">
                              {isProcessing(user.invitationId)
                                ? t('userManagement.invitedUsers.actions.resending')
                                : t('userManagement.invitedUsers.actions.resend')}
                            </span>
                          </Button>
                        </div>

                        {/* Processing Indicator */}
                        {isProcessing(user.invitationId) && (
                          <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono text-blue-600 tracking-wider uppercase">
                            <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-blue-600"></div>
                            <span>{t('userManagement.invitedUsers.actions.processing')}</span>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Action Confirmation Sheet */}
      <Sheet open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <SheetContent side="right" className="w-full sm:w-[500px] border-l border-gray-100 dark:border-gray-800 flex flex-col h-full bg-white dark:bg-slate-950 p-0 gap-0">
          <div className={cn(
            "px-6 py-5 border-b border-gray-100 dark:border-gray-800",
            actionType === 'revoke' ? 'bg-red-50 dark:bg-red-950/20' : 'bg-blue-50 dark:bg-blue-950/20'
          )}>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-left">
                {actionType === 'revoke' ? <Ban className="h-5 w-5 text-red-600 dark:text-red-500" /> : <Send className="h-5 w-5 text-blue-600 dark:text-blue-500" />}
                {actionType === 'resend'
                  ? t('userManagement.invitedUsers.confirm.resendTitle')
                  : t('userManagement.invitedUsers.confirm.revokeTitle')}
              </SheetTitle>
              <SheetDescription className="text-sm mt-2 text-left">
                {actionType === 'resend' ? (
                  <>
                    {t('userManagement.invitedUsers.confirm.resendDescription', {
                      name: selectedInvitation?.recipientName ?? ''
                    })}
                    <br /><br />
                    <span className="text-muted-foreground">
                      {t('userManagement.invitedUsers.confirm.resendNote', {
                        email: selectedInvitation?.recipientEmail ?? ''
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    {t('userManagement.invitedUsers.confirm.revokeDescription', {
                      name: selectedInvitation?.recipientName ?? ''
                    })}
                    <br /><br />
                    <span className="text-muted-foreground">
                      {t('userManagement.invitedUsers.confirm.revokeNote')}
                    </span>
                  </>
                )}
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 p-6">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-4 space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Recipient</span>
                <span className="text-sm font-medium">{selectedInvitation?.recipientName}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</span>
                <span className="text-sm font-medium">{selectedInvitation?.recipientEmail}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Role</span>
                <span className="text-sm font-medium">{selectedInvitation?.roleName}</span>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 mt-auto bg-gray-50/50 dark:bg-gray-900/50">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={handleActionConfirm}
              disabled={manageInvitation.isPending || isProcessing(selectedInvitation?.invitationId || '')}
              className={actionType === 'revoke' ? 'bg-red-600 hover:bg-red-700 text-white shadow-md' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'}
            >
              {manageInvitation.isPending || isProcessing(selectedInvitation?.invitationId || '') ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {actionType === 'resend'
                    ? t('userManagement.invitedUsers.actions.resending')
                    : t('userManagement.invitedUsers.actions.revoking')}
                </>
              ) : (
                actionType === 'resend'
                  ? t('userManagement.invitedUsers.confirm.resendConfirm')
                  : t('userManagement.invitedUsers.confirm.revokeConfirm')
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

