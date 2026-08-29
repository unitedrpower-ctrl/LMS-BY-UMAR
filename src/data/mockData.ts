import { User, Site, Attendance, Payroll, Complaint, Notice, SystemSettings, DocumentItem, RoleInvitation, Company } from '../types';

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-owner',
    name: 'Master LMS Platform HQ (Umar Owner)',
    companyCode: 'HQ-001',
    company_code: 'HQ-001',
    crNumber: '1010000000',
    adminName: 'Umar Chaudhary',
    adminEmail: 'unitedrpower@gmail.com',
    planType: 'CUSTOM_ENTERPRISE',
    subscriptionStartDate: '2024-01-01',
    subscriptionEndDate: '2099-12-31',
    maxLaborersAllowed: 99999,
    status: 'Active',
    pricePaidSar: 0,
    contactPhone: '+966 50 111 2222',
    createdAt: '2024-01-01 00:00'
  }
];

export const INITIAL_SETTINGS: SystemSettings = {
  currency: 'SAR',
  fridayPaidHolidayEnabled: true,
  overtimeMultiplierRate: 2.0, // Double Pay for Friday / Overtime
  absencePenaltyMultiplier: 1.0, // Deduct 1 day wage per unapproved absence
  maxDailyComplaints: 3,
  govHolidays: [
    { id: 'gov-1', date: '2026-09-23', title: 'Saudi National Day', notes: 'Official Kingdom Holiday - Full Wage Paid' },
    { id: 'gov-2', date: '2026-02-22', title: 'Saudi Foundation Day', notes: 'Official Kingdom Holiday - Full Wage Paid' },
    { id: 'gov-3', date: '2026-03-20', title: 'Eid Al-Fitr Holiday', notes: 'Public Holiday - Full Wage Paid' },
    { id: 'gov-4', date: '2026-05-27', title: 'Eid Al-Adha Holiday', notes: 'Public Holiday - Full Wage Paid' }
  ]
};

export const INITIAL_INVITATIONS: RoleInvitation[] = [];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-owner-umar-259',
    companyId: 'comp-owner',
    name: 'Umar Chaudhary (Master Owner)',
    email: 'umarchoudhary259@gmail.com',
    role: 'Owner',
    dailyRate: 350.0,
    phone: '+966 50 259 0000',
    designation: 'Platform Owner & Master Administrator',
    joinedDate: '2024-01-01',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    iqamaId: '1000000259',
    passportNumber: 'OWNER-259',
    loginSerial: 'OWNER-259',
    loginPassword: 'OwnerPass#259',
    status: 'Active',
    isGoogleUser: true,
    profileCompleted: true,
    adminPermissions: {
      canViewPayroll: true,
      canEditPayroll: true,
      canMarkAttendance: true,
      canManageSites: true,
      canManageUsers: true,
      canAccessSettings: true
    }
  },
  {
    id: 'usr-owner-umar',
    companyId: 'comp-owner',
    name: 'Umar (System Owner)',
    email: 'unitedrpower@gmail.com',
    role: 'Owner',
    dailyRate: 350.0,
    phone: '+966 50 111 2222',
    designation: 'Managing Director & System Owner',
    joinedDate: '2024-01-01',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    iqamaId: '1000000001',
    passportNumber: 'OWNER-001',
    loginSerial: 'OWNER-01',
    loginPassword: 'OwnerPass#1',
    status: 'Active',
    isGoogleUser: true,
    profileCompleted: true,
    adminPermissions: {
      canViewPayroll: true,
      canEditPayroll: true,
      canMarkAttendance: true,
      canManageSites: true,
      canManageUsers: true,
      canAccessSettings: true
    }
  }
];

export const INITIAL_SITES: Site[] = [];

export const INITIAL_ATTENDANCE: Attendance[] = [];

export const INITIAL_PAYROLLS: Payroll[] = [];

export const INITIAL_COMPLAINTS: Complaint[] = [];

export const INITIAL_NOTICES: Notice[] = [];

export const INITIAL_DOCUMENTS: DocumentItem[] = [];

