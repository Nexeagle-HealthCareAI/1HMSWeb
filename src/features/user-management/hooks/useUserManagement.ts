import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
}

// Sample data
const sampleUsers: User[] = [
  {
    id: 'U001',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@hospital.com',
    role: 'Doctor',
    department: 'Cardiology',
    status: 'active',
    lastLogin: '2024-01-15 10:30:00',
    createdAt: '2024-01-01'
  },
  {
    id: 'U002',
    name: 'Dr. Michael Wilson',
    email: 'michael.wilson@hospital.com',
    role: 'Doctor',
    department: 'Neurology',
    status: 'active',
    lastLogin: '2024-01-14 14:20:00',
    createdAt: '2024-01-02'
  },
  {
    id: 'U003',
    name: 'Emily Davis',
    email: 'emily.davis@hospital.com',
    role: 'Nurse',
    department: 'Pediatrics',
    status: 'active',
    lastLogin: '2024-01-15 09:15:00',
    createdAt: '2024-01-03'
  },
  {
    id: 'U004',
    name: 'John Smith',
    email: 'john.smith@hospital.com',
    role: 'Admin',
    department: 'Administration',
    status: 'inactive',
    lastLogin: '2024-01-10 16:45:00',
    createdAt: '2024-01-04'
  }
];

const sampleRoles: Role[] = [
  {
    id: 'R001',
    name: 'Admin',
    description: 'Full system access and management',
    permissions: ['all'],
    isActive: true
  },
  {
    id: 'R002',
    name: 'Doctor',
    description: 'Patient management and medical records',
    permissions: ['patients', 'appointments', 'prescriptions', 'reports'],
    isActive: true
  },
  {
    id: 'R003',
    name: 'Nurse',
    description: 'Patient care and basic records',
    permissions: ['patients', 'appointments', 'basic_reports'],
    isActive: true
  },
  {
    id: 'R004',
    name: 'Receptionist',
    description: 'Appointment scheduling and patient registration',
    permissions: ['appointments', 'patient_registration'],
    isActive: true
  }
];

export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>(sampleUsers);
  const [roles, setRoles] = useState<Role[]>(sampleRoles);
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const { toast } = useToast();

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const createUser = (user: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...user,
      id: `U${String(users.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setUsers(prev => [...prev, newUser]);
    toast({
      title: "User Created",
      description: "New user has been created successfully."
    });
  };

  const updateUser = (id: string, updatedUser: Partial<User>) => {
    setUsers(prev => prev.map(user => 
      user.id === id ? { ...user, ...updatedUser } : user
    ));
    toast({
      title: "User Updated",
      description: "User information has been updated successfully."
    });
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(user => user.id !== id));
    toast({
      title: "User Deleted",
      description: "User has been deleted successfully."
    });
  };

  const activateUser = (id: string) => {
    setUsers(prev => prev.map(user => 
      user.id === id ? { ...user, status: 'active' as const } : user
    ));
    toast({
      title: "User Activated",
      description: "User account has been activated successfully."
    });
  };

  const deactivateUser = (id: string) => {
    setUsers(prev => prev.map(user => 
      user.id === id ? { ...user, status: 'inactive' as const } : user
    ));
    toast({
      title: "User Deactivated",
      description: "User account has been deactivated successfully."
    });
  };

  const createRole = (role: Omit<Role, 'id'>) => {
    const newRole: Role = {
      ...role,
      id: `R${String(roles.length + 1).padStart(3, '0')}`
    };
    setRoles(prev => [...prev, newRole]);
    toast({
      title: "Role Created",
      description: "New role has been created successfully."
    });
  };

  const updateRole = (id: string, updatedRole: Partial<Role>) => {
    setRoles(prev => prev.map(role => 
      role.id === id ? { ...role, ...updatedRole } : role
    ));
    toast({
      title: "Role Updated",
      description: "Role has been updated successfully."
    });
  };

  const deleteRole = (id: string) => {
    setRoles(prev => prev.filter(role => role.id !== id));
    toast({
      title: "Role Deleted",
      description: "Role has been deleted successfully."
    });
  };

  return {
    users: filteredUsers,
    roles,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    selectedRole,
    setSelectedRole,
    selectedStatus,
    setSelectedStatus,
    createUser,
    updateUser,
    deleteUser,
    activateUser,
    deactivateUser,
    createRole,
    updateRole,
    deleteRole
  };
};
