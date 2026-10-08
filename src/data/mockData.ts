import { User, Site, Attendance, Payroll, Complaint, Notice, SystemSettings, DocumentItem, RoleInvitation, Company } from '../types';

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-001',
    name: 'Al-Bawani Contracting Co.',
    companyCode: 'BAW-001',
    company_code: 'BAW-001',
    crNumber: '1010892741',
    address: 'King Fahd Road, Olaya District, Riyadh, Saudi Arabia',
    logoUrl: '/lms_by_umar_icon.jpg',
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
    id: 'usr-admin-umar',
    companyId: 'comp-001',
    name: 'Umar Chaudhary (Super Admin)',
    email: 'unitedrpower@gmail.com',
    role: 'Super Admin',
    dailyRate: 350.0,
    phone: '+966 50 111 2222',
    designation: 'Managing Director & System Administrator',
    joinedDate: '2024-01-01',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    iqamaId: '1000000001',
    passportNumber: 'ADMIN-001',
    loginSerial: 'ADMIN-01',
    loginPassword: 'admin123',
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
    id: 'usr-admin-khalid',
    companyId: 'comp-001',
    name: 'Khalid Al-Mansoor',
    email: 'hr@lms.com',
    role: 'HR Admin',
    dailyRate: 200.0,
    phone: '+966 50 222 3333',
    designation: 'Human Resources Manager',
    joinedDate: '2024-02-15',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    iqamaId: '1000000002',
    passportNumber: 'HR-002',
    loginSerial: 'HR-01',
    loginPassword: 'hr123',
    status: 'Active',
    profileCompleted: true,
    adminPermissions: {
      canViewPayroll: true,
      canEditPayroll: true,
      canMarkAttendance: true,
      canManageSites: false,
      canManageUsers: true,
      canAccessSettings: false
    }
  },
  {
    id: 'usr-sup-tariq',
    companyId: 'comp-001',
    name: 'Tariq Mahmoud',
    email: 'supervisor@lms.com',
    role: 'Site Supervisor',
    siteId: 'site-001',
    dailyRate: 150.0,
    phone: '+966 50 333 4444',
    designation: 'Project Field Supervisor',
    joinedDate: '2024-03-01',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    iqamaId: '1000000003',
    passportNumber: 'SUP-003',
    loginSerial: 'SUP-01',
    loginPassword: 'sup123',
    status: 'Active',
    profileCompleted: true,
    adminPermissions: {
      canViewPayroll: false,
      canEditPayroll: false,
      canMarkAttendance: true,
      canManageSites: false,
      canManageUsers: false,
      canAccessSettings: false
    }
  },
  {
    id: 'usr-labor-101',
    companyId: 'comp-001',
    name: 'Ahmed Khan',
    email: 'ahmed.khan@worker.sa',
    role: 'Labor',
    siteId: 'site-001',
    dailyRate: 75.0,
    phone: '+966 55 101 0001',
    designation: 'Senior Mason / بناء عام',
    joinedDate: '2024-04-10',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2481029381',
    iqamaExpiry: '2026-12-15',
    passportNumber: 'P8920192',
    sponsorName: 'Direct Company Hire',
    loginSerial: 'EMP-101',
    loginPassword: '123456',
    bankName: 'Al-Rajhi Bank',
    accountNumber: '8810293847',
    iban: 'SA4480000881029384700001',
    status: 'Active',
    profileCompleted: true
  },
  {
    id: 'usr-labor-102',
    companyId: 'comp-001',
    name: 'Bilal Hossain',
    email: 'bilal.hossain@worker.sa',
    role: 'Labor',
    siteId: 'site-001',
    dailyRate: 70.0,
    phone: '+966 55 102 0002',
    designation: 'Finish Carpenter / نجار مسلح',
    joinedDate: '2024-04-12',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2549102938',
    iqamaExpiry: '2026-11-20',
    passportNumber: 'P4729103',
    sponsorName: 'Direct Company Hire',
    loginSerial: 'EMP-102',
    loginPassword: '123456',
    bankName: 'SNB Al-Ahli',
    accountNumber: '4472910382',
    iban: 'SA2210000447291038200001',
    status: 'Active',
    profileCompleted: true
  },
  {
    id: 'usr-labor-103',
    companyId: 'comp-001',
    name: 'Mohammad Rashid',
    email: 'rashid.m@worker.sa',
    role: 'Labor',
    siteId: 'site-002',
    dailyRate: 85.0,
    phone: '+966 55 103 0003',
    designation: 'Certified Site Electrician / كهربائي تمديدات',
    joinedDate: '2024-05-01',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2619842103',
    iqamaExpiry: '2026-10-25',
    passportNumber: 'P3819201',
    sponsorName: 'Al-Rashid Subcontracting',
    loginSerial: 'EMP-103',
    loginPassword: '123456',
    bankName: 'Riyad Bank',
    accountNumber: '3381920194',
    iban: 'SA5520000338192019400001',
    status: 'Active',
    profileCompleted: true
  },
  {
    id: 'usr-labor-104',
    companyId: 'comp-001',
    name: 'Suresh Kumar',
    email: 'suresh.k@worker.sa',
    role: 'Labor',
    siteId: 'site-002',
    dailyRate: 65.0,
    phone: '+966 55 104 0004',
    designation: 'Steel Fixer / حداد مسلح',
    joinedDate: '2024-05-15',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2398471928',
    iqamaExpiry: '2026-10-15',
    passportNumber: 'P1928374',
    sponsorName: 'Direct Company Hire',
    loginSerial: 'EMP-104',
    loginPassword: '123456',
    bankName: 'Alinma Bank',
    accountNumber: '5519283746',
    iban: 'SA1105000551928374600001',
    status: 'Active',
    profileCompleted: true
  }
];

export const INITIAL_SITES: Site[] = [
  {
    id: 'site-001',
    companyId: 'comp-001',
    name: 'King Salman Park Tower - Zone A',
    location: 'Central Riyadh, Saudi Arabia',
    supervisorId: 'usr-sup-tariq',
    laborerIds: ['usr-labor-101', 'usr-labor-102'],
    status: 'Active',
    budget: 4500000
  },
  {
    id: 'site-002',
    companyId: 'comp-001',
    name: 'Diriyah Heritage District - Phase 2',
    location: 'Diriyah, Riyadh Region',
    supervisorId: 'usr-sup-tariq',
    laborerIds: ['usr-labor-103', 'usr-labor-104'],
    status: 'Active',
    budget: 8200000
  }
];

export const INITIAL_ATTENDANCE: Attendance[] = [
  {
    id: 'att-001',
    companyId: 'comp-001',
    userId: 'usr-labor-101',
    siteId: 'site-001',
    date: '2026-10-01',
    status: 'Present',
    markedBy: 'usr-sup-tariq',
    overtimeHours: 2
  },
  {
    id: 'att-002',
    companyId: 'comp-001',
    userId: 'usr-labor-102',
    siteId: 'site-001',
    date: '2026-10-01',
    status: 'Present',
    markedBy: 'usr-sup-tariq'
  },
  {
    id: 'att-003',
    companyId: 'comp-001',
    userId: 'usr-labor-103',
    siteId: 'site-002',
    date: '2026-10-01',
    status: 'Present',
    markedBy: 'usr-sup-tariq',
    overtimeHours: 3
  },
  {
    id: 'att-004',
    companyId: 'comp-001',
    userId: 'usr-labor-104',
    siteId: 'site-002',
    date: '2026-10-01',
    status: 'Half-Day',
    markedBy: 'usr-sup-tariq'
  }
];

export const INITIAL_PAYROLLS: Payroll[] = [
  {
    id: 'pay-2026-10-usr-labor-101',
    companyId: 'comp-001',
    userId: 'usr-labor-101',
    monthYear: '2026-10',
    dailyRate: 75.0,
    totalDaysWorked: 26,
    presentDays: 26,
    halfDays: 0,
    absentDays: 0,
    fridayHolidayDays: 4,
    fridayPay: 300.0,
    govHolidayDays: 1,
    govHolidayPay: 75.0,
    overtimeHours: 12,
    overtimePay: 225.0,
    absenceDeduction: 0,
    allowances: 250.0,
    advances: 100.0,
    penalties: 0,
    netSalary: 2700.0,
    status: 'Approved',
    generatedAt: '2026-10-08 10:00'
  },
  {
    id: 'pay-2026-10-usr-labor-102',
    companyId: 'comp-001',
    userId: 'usr-labor-102',
    monthYear: '2026-10',
    dailyRate: 70.0,
    totalDaysWorked: 25,
    presentDays: 25,
    halfDays: 0,
    absentDays: 1,
    fridayHolidayDays: 4,
    fridayPay: 280.0,
    govHolidayDays: 1,
    govHolidayPay: 70.0,
    overtimeHours: 6,
    overtimePay: 105.0,
    absenceDeduction: 70.0,
    allowances: 200.0,
    advances: 0,
    penalties: 0,
    netSalary: 2335.0,
    status: 'Approved',
    generatedAt: '2026-10-08 10:00'
  },
  {
    id: 'pay-2026-10-usr-labor-103',
    companyId: 'comp-001',
    userId: 'usr-labor-103',
    monthYear: '2026-10',
    dailyRate: 85.0,
    totalDaysWorked: 26,
    presentDays: 26,
    halfDays: 0,
    absentDays: 0,
    fridayHolidayDays: 4,
    fridayPay: 340.0,
    govHolidayDays: 1,
    govHolidayPay: 85.0,
    overtimeHours: 15,
    overtimePay: 318.75,
    absenceDeduction: 0,
    allowances: 300.0,
    advances: 150.0,
    penalties: 0,
    netSalary: 3103.75,
    status: 'Draft',
    generatedAt: '2026-10-08 10:00'
  },
  {
    id: 'pay-2026-10-usr-labor-104',
    companyId: 'comp-001',
    userId: 'usr-labor-104',
    monthYear: '2026-10',
    dailyRate: 65.0,
    totalDaysWorked: 24.5,
    presentDays: 24,
    halfDays: 1,
    absentDays: 1,
    fridayHolidayDays: 4,
    fridayPay: 260.0,
    govHolidayDays: 1,
    govHolidayPay: 65.0,
    overtimeHours: 4,
    overtimePay: 65.0,
    absenceDeduction: 65.0,
    allowances: 150.0,
    advances: 0,
    penalties: 0,
    netSalary: 2067.5,
    status: 'Draft',
    generatedAt: '2026-10-08 10:00'
  }
];

export const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: 'cmp-001',
    companyId: 'comp-001',
    userId: 'usr-labor-101',
    siteId: 'site-001',
    message: 'Need additional safety helmets and heavy-duty dust masks for the masonry crew on Zone A.',
    date: '2026-10-05 08:30',
    status: 'Resolved',
    responseNote: 'Safety officer issued 10 new helmets and 2 boxes of N95 masks.',
    resolvedBy: 'usr-sup-tariq',
    category: 'Safety'
  }
];

export const INITIAL_NOTICES: Notice[] = [
  {
    id: 'not-001',
    companyId: 'comp-001',
    title: 'Kingdom Foundation Day & Paid Holiday Notice',
    content: 'All site personnel are informed that official government holidays are fully paid in accordance with Saudi Labor Law.',
    targetGroup: 'All',
    datePosted: '2026-10-01',
    postedBy: 'Umar Chaudhary (Super Admin)',
    priority: 'Important'
  }
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-001',
    companyId: 'comp-001',
    title: 'Saudi Labor Law Safety Standards & PPE Policy',
    description: 'Official corporate workplace health, heat exhaustion prevention, and safety guidelines.',
    fileName: 'safety_policy_2026.pdf',
    fileType: 'PDF',
    fileSize: '1.8 MB',
    fileUrl: '#',
    category: 'Safety Policy',
    uploadedBy: 'Umar Chaudhary',
    uploadedAt: '2026-10-01 12:00',
    targetAudience: 'All Staff'
  }
];
