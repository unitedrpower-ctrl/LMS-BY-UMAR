import { User, Site, Attendance, Payroll, Complaint, Notice, SystemSettings, DocumentItem, RoleInvitation, Company } from '../types';

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-owner',
    name: 'Master LMS Platform HQ (Umar Owner)',
    crNumber: '1010000000',
    adminName: 'Umar Al-Otaibi',
    adminEmail: 'unitedrpower@gmail.com',
    planType: 'CUSTOM_ENTERPRISE',
    subscriptionStartDate: '2024-01-01',
    subscriptionEndDate: '2099-12-31',
    maxLaborersAllowed: 99999,
    status: 'Active',
    pricePaidSar: 0,
    contactPhone: '+966 50 111 2222',
    createdAt: '2024-01-01 00:00'
  },
  {
    id: 'comp-001',
    name: 'Al-Bawardi Contracting Co.',
    crNumber: '1010892019',
    adminName: 'Eleanor Vance',
    adminEmail: 'admin@laborcorp.com',
    planType: '1_YEAR',
    subscriptionStartDate: '2026-01-01',
    subscriptionEndDate: '2027-01-01',
    maxLaborersAllowed: 100,
    status: 'Active',
    pricePaidSar: 12000,
    contactPhone: '+966 11 445 8899',
    createdAt: '2026-01-01 09:00'
  },
  {
    id: 'comp-002',
    name: 'Saudi Mega Construction Ltd',
    crNumber: '1010774321',
    adminName: 'Khalid Al-Mansoor',
    adminEmail: 'khalid.admin@gmail.com',
    planType: '6_MONTH',
    subscriptionStartDate: '2026-04-01',
    subscriptionEndDate: '2026-10-01',
    maxLaborersAllowed: 50,
    status: 'Active',
    pricePaidSar: 7500,
    contactPhone: '+966 12 667 3344',
    createdAt: '2026-04-01 11:30'
  },
  {
    id: 'comp-003',
    name: 'Desert Oasis Industrial Solutions',
    crNumber: '1010332211',
    adminName: 'Sarih Al-Ghamdi',
    adminEmail: 'expired.admin@oasis.sa',
    planType: '6_MONTH',
    subscriptionStartDate: '2025-10-01',
    subscriptionEndDate: '2026-04-01', // Expired
    maxLaborersAllowed: 25,
    status: 'Expired',
    pricePaidSar: 4500,
    contactPhone: '+966 13 889 1122',
    createdAt: '2025-10-01 08:15'
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

export const INITIAL_INVITATIONS: RoleInvitation[] = [
  {
    id: 'inv-1001',
    companyId: 'comp-001',
    email: 'sarah.supervisor@gmail.com',
    role: 'Site Supervisor',
    token: 'tok-sup-9812',
    invitedBy: 'unitedrpower@gmail.com (Owner)',
    createdAt: '2026-07-25 10:00',
    expiresAt: '2026-08-25 10:00',
    status: 'Pending'
  },
  {
    id: 'inv-1002',
    companyId: 'comp-002',
    email: 'khalid.admin@gmail.com',
    role: 'Super Admin',
    token: 'tok-adm-4412',
    invitedBy: 'unitedrpower@gmail.com (Owner)',
    createdAt: '2026-07-26 14:30',
    expiresAt: '2026-08-26 14:30',
    status: 'Pending'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-owner-umar-259-o',
    companyId: 'comp-owner',
    name: 'Umar Chaudhary (Master Owner)',
    email: 'umarchoudhary259@gmail.com',
    role: 'Owner',
    dailyRate: 350.0,
    phone: '+966 50 259 0000',
    designation: 'Platform Owner & Master Administrator',
    joinedDate: '2023-01-01',
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
    id: 'usr-owner-umar-259',
    companyId: 'comp-owner',
    name: 'Umar Chaudhary (Master Owner)',
    email: 'UmarChaudhary259@gmail.com',
    role: 'Owner',
    dailyRate: 350.0,
    phone: '+966 50 259 0000',
    designation: 'Platform Owner & Master Administrator',
    joinedDate: '2023-01-01',
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
    joinedDate: '2023-01-01',
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
  },
  {
    id: 'usr-super-admin',
    companyId: 'comp-001',
    name: 'Eleanor Vance',
    email: 'admin@laborcorp.com',
    role: 'Super Admin',
    dailyRate: 180.0,
    phone: '+1 (555) 019-2834',
    designation: 'Chief Operations Officer',
    joinedDate: '2024-01-15',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2100984712',
    passportNumber: 'A9081234',
    loginSerial: 'ADMIN-001',
    loginPassword: 'AdminPass#1',
    status: 'Active',
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
    id: 'usr-hr-admin',
    name: 'David Miller',
    email: 'david.hr@laborcorp.com',
    role: 'HR Admin',
    dailyRate: 140.0,
    phone: '+1 (555) 018-9921',
    designation: 'Senior HR & Payroll Manager',
    joinedDate: '2024-03-01',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2211874921',
    passportNumber: 'B8172938',
    loginSerial: 'HR-002',
    loginPassword: 'HrPass#2026',
    adminPermissions: {
      canViewPayroll: true,
      canEditPayroll: true,
      canMarkAttendance: true,
      canManageSites: false,
      canManageUsers: true,
      canAccessSettings: true
    }
  },
  {
    id: 'usr-supervisor-1',
    name: 'Carlos Rodriguez',
    email: 'carlos.site1@laborcorp.com',
    role: 'Site Supervisor',
    siteId: 'site-metro-tower',
    dailyRate: 110.0,
    phone: '+1 (555) 014-4432',
    designation: 'Site Supervisor - Metro Tower',
    joinedDate: '2024-05-10',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2398102931',
    passportNumber: 'C7281920',
    loginSerial: 'SUP-101',
    loginPassword: 'SuperPass#1',
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
    id: 'usr-supervisor-2',
    name: 'Sarah Jenkins',
    email: 'sarah.site2@laborcorp.com',
    role: 'Site Supervisor',
    siteId: 'site-grand-bridge',
    dailyRate: 115.0,
    phone: '+1 (555) 017-8820',
    designation: 'Site Supervisor - Grand Bridge',
    joinedDate: '2024-06-20',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2491029381',
    passportNumber: 'D9182736',
    loginSerial: 'SUP-102',
    loginPassword: 'SuperPass#2',
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
    id: 'usr-labor-1',
    name: 'Mateo Silva',
    email: 'mateo.silva@laborcorp.com',
    role: 'Labor',
    siteId: 'site-metro-tower',
    dailyRate: 65.0,
    phone: '+1 (555) 012-3341',
    designation: 'Senior Mason & Carpenter',
    joinedDate: '2025-01-10',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2549102938',
    passportNumber: 'E9102837',
    loginSerial: 'EMP-1001',
    loginPassword: 'WorkerPass#1'
  },
  {
    id: 'usr-labor-2',
    name: 'Ravi Kumar',
    email: 'ravi.k@laborcorp.com',
    role: 'Labor',
    siteId: 'site-metro-tower',
    dailyRate: 60.0,
    phone: '+1 (555) 013-7722',
    designation: 'Steel Fixer & Welder',
    joinedDate: '2025-02-14',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2619028371',
    passportNumber: 'F8192039',
    loginSerial: 'EMP-1002',
    loginPassword: 'WorkerPass#2'
  },
  {
    id: 'usr-labor-3',
    name: 'Ahmed Hassan',
    email: 'ahmed.h@laborcorp.com',
    role: 'Labor',
    siteId: 'site-grand-bridge',
    dailyRate: 70.0,
    phone: '+1 (555) 016-5511',
    designation: 'Heavy Equipment Helper',
    joinedDate: '2025-03-05',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2719028341',
    passportNumber: 'G9102938',
    loginSerial: 'EMP-1003',
    loginPassword: 'WorkerPass#3'
  },
  {
    id: 'usr-labor-4',
    name: 'John O\'Connor',
    email: 'john.oc@laborcorp.com',
    role: 'Labor',
    siteId: 'site-grand-bridge',
    dailyRate: 62.0,
    phone: '+1 (555) 019-4410',
    designation: 'General Construction Worker',
    joinedDate: '2025-04-12',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2819028351',
    passportNumber: 'H1029384',
    loginSerial: 'EMP-1004',
    loginPassword: 'WorkerPass#4'
  },
  {
    id: 'usr-labor-5',
    name: 'Chen Wei',
    email: 'chen.wei@laborcorp.com',
    role: 'Labor',
    siteId: 'site-metro-tower',
    dailyRate: 68.0,
    phone: '+1 (555) 015-9933',
    designation: 'Electrician Assistant',
    joinedDate: '2025-05-01',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    iqamaId: '2910293841',
    passportNumber: 'I9102837',
    loginSerial: 'EMP-1005',
    loginPassword: 'WorkerPass#5',
    status: 'Active'
  },
  {
    id: 'usr-pending-signup-1',
    name: 'Tariq Al-Mansoor',
    email: 'tariq.mansoor@laborcorp.com',
    role: 'HR Admin',
    dailyRate: 150.0,
    phone: '+966 50 123 9847',
    designation: 'Assistant HR Specialist (Pending Approval)',
    joinedDate: '2026-07-28',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    status: 'Pending',
    registeredAt: '2026-07-28 09:30'
  }
];

export const INITIAL_SITES: Site[] = [
  {
    id: 'site-metro-tower',
    name: 'Metro Tower Commercial Phase 2',
    location: '450 Downtown Avenue, Plaza District',
    supervisorId: 'usr-supervisor-1',
    laborerIds: ['usr-labor-1', 'usr-labor-2', 'usr-labor-5'],
    status: 'Active',
    budget: 1250000
  },
  {
    id: 'site-grand-bridge',
    name: 'Grand River Expressway Bridge',
    location: 'North Bypass Highway, Mile Marker 14',
    supervisorId: 'usr-supervisor-2',
    laborerIds: ['usr-labor-3', 'usr-labor-4'],
    status: 'Active',
    budget: 2400000
  },
  {
    id: 'site-sunshine-villas',
    name: 'Sunshine Eco Residential Villas',
    location: '88 Suburb Ring Road',
    supervisorId: undefined,
    laborerIds: [],
    status: 'On Hold',
    budget: 850000
  }
];

export const INITIAL_ATTENDANCE: Attendance[] = [
  // Today's Date placeholder will be dynamically generated, but here are standard entries
  {
    id: 'att-1',
    userId: 'usr-labor-1',
    siteId: 'site-metro-tower',
    date: '2026-07-28',
    status: 'Present',
    markedBy: 'usr-supervisor-1',
    notes: 'Arrived on time. High safety gear check passed.'
  },
  {
    id: 'att-2',
    userId: 'usr-labor-2',
    siteId: 'site-metro-tower',
    date: '2026-07-28',
    status: 'Half-Day',
    markedBy: 'usr-supervisor-1',
    notes: 'Left early at 1:00 PM due to approved doctor appointment.'
  },
  {
    id: 'att-3',
    userId: 'usr-labor-5',
    siteId: 'site-metro-tower',
    date: '2026-07-28',
    status: 'Present',
    markedBy: 'usr-supervisor-1'
  },
  {
    id: 'att-4',
    userId: 'usr-labor-3',
    siteId: 'site-grand-bridge',
    date: '2026-07-28',
    status: 'Present',
    markedBy: 'usr-supervisor-2'
  },
  {
    id: 'att-5',
    userId: 'usr-labor-4',
    siteId: 'site-grand-bridge',
    date: '2026-07-28',
    status: 'Absent',
    markedBy: 'usr-supervisor-2',
    notes: 'Sick leave notified via SMS.'
  },
  // Yesterday
  {
    id: 'att-6',
    userId: 'usr-labor-1',
    siteId: 'site-metro-tower',
    date: '2026-07-27',
    status: 'Present',
    markedBy: 'usr-supervisor-1'
  },
  {
    id: 'att-7',
    userId: 'usr-labor-2',
    siteId: 'site-metro-tower',
    date: '2026-07-27',
    status: 'Present',
    markedBy: 'usr-supervisor-1'
  }
];

export const INITIAL_PAYROLLS: Payroll[] = [
  {
    id: 'pay-jul-mateo',
    userId: 'usr-labor-1',
    monthYear: '2026-07',
    dailyRate: 65.0,
    totalDaysWorked: 22.5,
    presentDays: 21,
    halfDays: 3,
    absentDays: 2,
    allowances: 120.0, // Overtime & hazard allowance
    advances: 100.0,  // Mid-month cash advance
    penalties: 0.0,
    netSalary: 1482.50, // (65 * 22.5) + 120 - 100
    status: 'Approved',
    generatedAt: '2026-07-27 10:30'
  },
  {
    id: 'pay-jul-ravi',
    userId: 'usr-labor-2',
    monthYear: '2026-07',
    dailyRate: 60.0,
    totalDaysWorked: 20.0,
    presentDays: 19,
    halfDays: 2,
    absentDays: 4,
    allowances: 80.0,
    advances: 50.0,
    penalties: 20.0, // Safety helmet violation penalty
    netSalary: 1210.00, // (60 * 20) + 80 - 50 - 20
    status: 'Draft',
    generatedAt: '2026-07-27 11:15'
  },
  {
    id: 'pay-jul-ahmed',
    userId: 'usr-labor-3',
    monthYear: '2026-07',
    dailyRate: 70.0,
    totalDaysWorked: 24.0,
    presentDays: 24,
    halfDays: 0,
    absentDays: 1,
    allowances: 150.0,
    advances: 0.0,
    penalties: 0.0,
    netSalary: 1830.00,
    status: 'Paid',
    generatedAt: '2026-07-25 16:00'
  }
];

export const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: 'comp-101',
    userId: 'usr-labor-1',
    siteId: 'site-metro-tower',
    message: 'Scaffolding on 4th floor west wing needs additional safety harness points.',
    category: 'Safety',
    status: 'In Progress',
    date: '2026-07-28 08:30',
    responseNote: 'Safety inspector dispatched. Harness cables will be installed by noon.'
  },
  {
    id: 'comp-102',
    userId: 'usr-labor-2',
    siteId: 'site-metro-tower',
    message: 'Discrepancy in my June overtime pay calculation on pay slip.',
    category: 'Wage/Payroll',
    status: 'Pending',
    date: '2026-07-28 09:15'
  },
  {
    id: 'comp-103',
    userId: 'usr-labor-4',
    siteId: 'site-grand-bridge',
    message: 'Drinking water dispenser on East bank needs refilling and ice replenishment.',
    category: 'Site Condition',
    status: 'Resolved',
    date: '2026-07-27 14:00',
    resolvedBy: 'usr-supervisor-2',
    responseNote: 'Refilled 3 fresh water carboys at site rest station.'
  }
];

export const INITIAL_NOTICES: Notice[] = [
  {
    id: 'notif-1',
    title: 'Mandatory Safety Gear Audit - All Active Sites',
    content: 'All workers must wear certified hard hats, steel-toe boots, and high-visibility vests. Supervisors will conduct spot checks every morning.',
    targetGroup: 'All',
    datePosted: '2026-07-26 09:00',
    postedBy: 'Eleanor Vance',
    priority: 'Urgent'
  },
  {
    id: 'notif-2',
    title: 'Metro Tower Concrete Pouring Schedule Shift',
    content: 'Concrete pouring for Level 5 deck is rescheduled to Thursday 6:00 AM. Breakfast and coffee will be provided at site camp.',
    targetGroup: 'site-metro-tower',
    datePosted: '2026-07-27 15:30',
    postedBy: 'Carlos Rodriguez',
    priority: 'Important'
  },
  {
    id: 'notif-3',
    title: 'Monthly Payslip Release & Bank Transfer Notice',
    content: 'July payroll accounts have been submitted for bank processing. Please verify your registered bank account details with HR before July 30th.',
    targetGroup: 'All',
    datePosted: '2025-07-25 11:00',
    postedBy: 'David Miller',
    priority: 'Normal'
  }
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-101',
    title: 'Saudi Labor Law Compliance Regulations 2026',
    description: 'Kingdom of Saudi Arabia official Ministry of Human Resources rules regarding working hours, overtime multiplier, heat safety, and employee rights.',
    fileName: 'saudi_labor_compliance_2026.pdf',
    fileType: 'PDF',
    fileSize: '3.4 MB',
    fileUrl: 'data:text/plain;charset=utf-8,LMS%20by%20Umar%20-%20Saudi%20Labor%20Law%20Compliance%20Document',
    category: 'Labor Compliance',
    uploadedBy: 'Eleanor Vance (Super Admin)',
    uploadedAt: '2026-07-15',
    targetAudience: 'All Staff'
  },
  {
    id: 'doc-102',
    title: 'Construction Site High-Temperature & PPE Guidelines',
    description: 'Mandatory midday break policy, hydration requirements, and personal protective equipment (PPE) protocols for active construction sites.',
    fileName: 'site_safety_ppe_guidelines.pdf',
    fileType: 'PDF',
    fileSize: '1.8 MB',
    fileUrl: 'data:text/plain;charset=utf-8,LMS%20by%20Umar%20-%20Site%20Safety%20Guidelines',
    category: 'Safety Policy',
    uploadedBy: 'Carlos Rodriguez (Site Supervisor)',
    uploadedAt: '2026-07-20',
    targetAudience: 'Workers & Laborers'
  },
  {
    id: 'doc-103',
    title: 'Riyadh Metro Extension Site Permit & License',
    description: 'Official municipal construction clearance permit, structural engineering approval, and environmental safety license for Metro Tower site.',
    fileName: 'riyadh_metro_site_permit.pdf',
    fileType: 'PDF',
    fileSize: '4.2 MB',
    fileUrl: 'data:text/plain;charset=utf-8,LMS%20by%20Umar%20-%20Metro%20Site%20Permit',
    category: 'Site Permits',
    uploadedBy: 'David Miller (HR Admin)',
    uploadedAt: '2026-07-02',
    targetAudience: 'Supervisors Only'
  },
  {
    id: 'doc-104',
    title: 'Standard Skilled Labor Employment Agreement Template',
    description: 'Bilingual (Arabic & English) standard labor contract outlining daily wage rates, Friday holiday entitlements, and overtime calculation rules.',
    fileName: 'standard_labor_contract_template.docx',
    fileType: 'Word',
    fileSize: '850 KB',
    fileUrl: 'data:text/plain;charset=utf-8,LMS%20by%20Umar%20-%20Standard%20Labor%20Contract',
    category: 'Contracts',
    uploadedBy: 'David Miller (HR Admin)',
    uploadedAt: '2026-07-10',
    targetAudience: 'All Staff'
  },
  {
    id: 'doc-105',
    title: 'Monthly Wage Payroll Audit & Reconciliation Ledger',
    description: 'Spreadsheet template for double-checking supervisor attendance roll calls against bank account IBAN payroll disbursements.',
    fileName: 'payroll_disbursement_audit_2026.xlsx',
    fileType: 'Excel',
    fileSize: '2.1 MB',
    fileUrl: 'data:text/plain;charset=utf-8,LMS%20by%20Umar%20-%20Payroll%20Audit%20Ledger',
    category: 'Labor Compliance',
    uploadedBy: 'Eleanor Vance (Super Admin)',
    uploadedAt: '2026-07-25',
    targetAudience: 'Supervisors Only'
  }
];

