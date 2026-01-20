import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';

import { Users, UserPlus, Mail, AlertCircle, ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUserManagementApi } from '../hooks/useUserManagementApi';
import { RolesResponse, InviteUserRequest } from '../services/userManagementApi';
import { OnboardedUsers } from './OnboardedUsers';
import { InvitedUsers } from './InvitedUsers';
import { InvitationSuccessModal } from './InvitationSuccessModal';
import { useAuthStore } from '@/store/authStore';
import { ValidationUtils } from '@/utils/validation';
import { cn } from '@/lib/utils';

export const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('onboarded');
  const [invitedUsersScope, setInvitedUsersScope] = useState<'Pending' | 'Accepted' | 'Revoked' | 'ALL'>('ALL');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // API hooks
  const { getAllRoles, inviteUser } = useUserManagementApi();
  const { data: rolesResponse, isLoading: rolesLoading, error: rolesError } = getAllRoles();
  const typedRolesResponse = rolesResponse as RolesResponse | undefined;

  // Auth store
  const authStore = useAuthStore.getState();
  const currentUserId = authStore.getUserId();
  const hospitalId = authStore.getHospitalId();

  // User management states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [invitedUserInfo, setInvitedUserInfo] = useState({
    name: '',
    email: '',
    role: ''
  });
  const [inviteErrorModal, setInviteErrorModal] = useState({ open: false, message: '' });

  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    selectedRole: '',
    specialty: '',
    workingHours: ''
  });

  // Real-time validation states
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const isFormValid =
    Boolean(newUser.name && newUser.phone && newUser.selectedRole && !phoneError && !emailError);

  // Validation helpers
  const validateEmail = (email: string) => {
    if (!email) return '';
    // Simple email regex
    return /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/.test(email)
      ? ''
      : t('userManagement.validation.email');
  };
  const validatePhone = (phone: string) => {
    if (!phone) return '';
    // Accepts 10 digit numbers only
    return /^\d{10}$/.test(phone)
      ? ''
      : t('userManagement.validation.phone');
  };

  const navigationItems: Array<{
    value: 'onboarded' | 'invited';
    title: string;
    description: string;
    Icon: LucideIcon;
  }> = [
      {
        value: 'onboarded',
        title: t('userManagement.tabs.onboarded'),
        description: t('userManagement.activeUsers'),
        Icon: Users,
      },
      {
        value: 'invited',
        title: t('userManagement.tabs.invited'),
        description: t('userManagement.pendingInvitations'),
        Icon: Mail,
      }
    ];



  const handleAddUser = async () => {
    const emailErr = validateEmail(newUser.email);
    const phoneErr = validatePhone(newUser.phone);
    setEmailError(emailErr);
    setPhoneError(phoneErr);
    if (emailErr || phoneErr) return;
    if (newUser.name && newUser.phone && newUser.selectedRole && currentUserId && hospitalId) {
      const selectedRole = typedRolesResponse?.allRoles.find(r => r.roleId === newUser.selectedRole);
      const inviteData: InviteUserRequest = {
        hospitalId: hospitalId,
        roleId: newUser.selectedRole,
        name: newUser.name,
        mobile: ValidationUtils.cleanMobileNumber(newUser.phone),
        email: newUser.email,
        invitedByUserId: currentUserId
      };
      try {
        const response = await inviteUser.mutateAsync(inviteData);
        if (!response.success) {
          setInviteErrorModal({ open: true, message: response.message || t('userManagement.inviteError.defaultMessage') });
          return;
        }
        setInvitedUserInfo({
          name: newUser.name,
          email: newUser.email,
          role: selectedRole?.roleName || newUser.selectedRole
        });
        setNewUser({ name: '', email: '', phone: '', selectedRole: '', specialty: '', workingHours: '' });
        setShowAddUser(false);
        setShowSuccessModal(true);
      } catch (error) {
        console.error('Error inviting user:', error);
      }
    }
  };

  // Get role color for display
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

  // Handle view invited users navigation
  const handleViewInvitedUsers = () => {
    setActiveTab('invited');
    setInvitedUsersScope('ALL');
    setShowSuccessModal(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col z-20 relative hidden lg:flex",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Toggle Button */}
        <div className="absolute -right-3 top-6 z-30">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Sidebar Header */}
        <div className={cn(
          "h-16 flex items-center border-b border-dashed border-gray-200 dark:border-gray-800",
          isSidebarCollapsed ? "justify-center px-0" : "px-6"
        )}>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <LayoutDashboard className="h-6 w-6" />
            {!isSidebarCollapsed && (
              <span className="font-bold text-lg tracking-tight">Workspace</span>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = activeTab === item.value;
            return (
              <button
                key={item.value}
                onClick={() => setActiveTab(item.value)}
                className={cn(
                  "flex items-center w-full p-3 rounded-xl transition-all duration-200 group relative",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200",
                  isSidebarCollapsed ? "justify-center" : "gap-3"
                )}
                title={isSidebarCollapsed ? item.title : undefined}
              >
                <item.Icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                )} />

                {!isSidebarCollapsed && (
                  <div className="text-left overflow-hidden">
                    <p className="font-medium text-sm whitespace-nowrap">{item.title}</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{item.description}</p>
                  </div>
                )}

                {isActive && !isSidebarCollapsed && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative w-full h-full bg-gray-50/50 dark:bg-black/20 p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button className="w-full sm:w-auto gap-2" onClick={() => setShowAddUser(true)}>
              <Mail className="h-4 w-4" />
              {t('userManagement.inviteUser')}
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="lg:hidden">
              <TabsList className="flex gap-2 rounded-2xl bg-muted/40 p-1">
                {navigationItems.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="group relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
                  >
                    <item.Icon className="h-4 w-4 text-muted-foreground group-data-[state=active]:text-primary" />
                    <span>{item.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="onboarded" className="space-y-6">
              <OnboardedUsers />
            </TabsContent>

            <TabsContent value="invited" className="space-y-6">
              <InvitedUsers initialScope={invitedUsersScope} />
            </TabsContent>
          </Tabs>
        </div>
      </main>


      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {t('userManagement.inviteNewUser')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('userManagement.fullName')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder={t('userManagement.enterFullName')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  {t('userManagement.phone')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  value={newUser.phone}
                  onChange={(e) => {
                    setNewUser({ ...newUser, phone: e.target.value });
                    setPhoneError(validatePhone(e.target.value));
                  }}
                  placeholder={t('userManagement.enterPhoneNumber')}
                  required
                />
                {phoneError && (
                  <p className="text-xs text-red-600 mt-1">{phoneError}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('userManagement.email')}</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => {
                  setNewUser({ ...newUser, email: e.target.value });
                  setEmailError(validateEmail(e.target.value));
                }}
                placeholder={t('userManagement.enterEmailAddress')}
              />
              {emailError && (
                <p className="text-xs text-red-600 mt-1">{emailError}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label>
                {t('userManagement.selectRole')} <span className="text-red-500">*</span>
              </Label>
              {rolesLoading ? (
                <div className="p-6 text-center text-muted-foreground border rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  {t('userManagement.loadingRoles')}
                </div>
              ) : rolesError ? (
                <div className="p-6 text-center text-red-600 border border-red-200 rounded-lg">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                  {t('userManagement.errorLoadingRoles')}
                </div>
              ) : (
                <RadioGroup
                  value={newUser.selectedRole}
                  onValueChange={(value) => setNewUser({ ...newUser, selectedRole: value })}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {typedRolesResponse?.allRoles
                      ?.filter((role, idx, arr) =>
                        arr.findIndex(r => r.roleName.toLowerCase() === role.roleName.toLowerCase()) === idx
                      )
                      .map(role => (
                        <div key={role.roleId} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value={role.roleId} id={role.roleId} />
                          <Label htmlFor={role.roleId} className="flex items-center gap-2 cursor-pointer flex-1">
                            <Badge className={getRoleColor(role.roleName)}>{role.roleName}</Badge>
                          </Label>
                        </div>
                      ))}
                  </div>
                </RadioGroup>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddUser(false)}>
                {t('userManagement.cancel')}
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={!isFormValid || inviteUser.isPending}
                className="gap-2"
              >
                {inviteUser.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('userManagement.sendingInvitation')}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    {t('userManagement.sendInvitation')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Error Modal */}
      <Dialog open={inviteErrorModal.open} onOpenChange={(open) => setInviteErrorModal((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              {t('userManagement.inviteError.title')}
            </DialogTitle>
            <DialogDescription>
              {inviteErrorModal.message || t('userManagement.inviteError.defaultMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setInviteErrorModal({ open: false, message: '' })}>
              {t('userManagement.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <InvitationSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onViewInvitedUsers={handleViewInvitedUsers}
        invitedUserName={invitedUserInfo.name}
        invitedUserEmail={invitedUserInfo.email}
        invitedUserRole={invitedUserInfo.role}
      />
    </div>
  );
};