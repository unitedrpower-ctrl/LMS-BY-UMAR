export type UserRole = 'Owner' | 'Super Admin' | 'Site Supervisor' | 'HR Admin' | 'Labor';

export type SubscriptionPlanType = '6_MONTH' | '1_YEAR' | 'CUSTOM_ENTERPRISE' | '3_DAY_DEMO';

export type CompanyStatus = 'Active' | 'Expired' | 'Suspended';

export interface Company {
  id: string; // e.g., 'comp-001'
  name: string;
  crNumber?: string; // Commercial Registration / Trade License Number
  adminName: string;
  adminEmail: string;
  planType: SubscriptionPlanType;
  subscriptionStartDate: string; // YYYY-MM-DD
  subscriptionEndDate: string; // YYYY-MM-DD
  maxLaborersAllowed: number;
  status: CompanyStatus;
  pricePaidSar: number;
  contactPhone?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface RoleInvitation {
  id: string;
  companyId?: string;
  email: string;
  role: UserRole;
  token: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: 'Pending' | 'Accepted' | 'Expired' | 'Revoked';
  acceptedAt?: string;
  acceptedUserId?: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half-Day';

export type ComplaintStatus = 'Pending' | 'In Progress' | 'Resolved';

export type TargetGroup = 'All' | string; // 'All' or siteId

export interface AdminPermissions {
  canViewPayroll: boolean;
  canEditPayroll: boolean;
  canMarkAttendance: boolean;
  canManageSites: boolean;
  canManageUsers: boolean;
  canAccessSettings: boolean;
}

export interface User {
  id: string;
  companyId?: string; // Tenant Isolation Link
  name: string;
  email: string;
  role: UserRole;
  siteId?: string; // Assigned site ID
  dailyRate: number; // in SAR
  phone?: string;
  avatar?: string;
  designation?: string;
  joinedDate: string;
  // Labor Registration & Credentials & Bank Account
  iqamaId?: string;
  passportNumber?: string;
  loginSerial?: string;
  loginPassword?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  status?: 'Active' | 'Inactive' | 'Pending' | 'Rejected';
  registeredAt?: string;
  isGoogleUser?: boolean;
  profileCompleted?: boolean;
  // Granular Admin Permissions
  adminPermissions?: AdminPermissions;
}

export interface Site {
  id: string;
  companyId?: string; // Tenant Isolation Link
  name: string;
  location: string;
  supervisorId?: string;
  laborerIds: string[];
  status: 'Active' | 'Completed' | 'On Hold';
  budget?: number;
}

export interface Attendance {
  id: string;
  companyId?: string; // Tenant Isolation Link
  userId: string;
  siteId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedBy: string; // Supervisor ID
  notes?: string;
  overtimeHours?: number; // Hours worked extra
  isFridayOvertime?: boolean; // Worked on Friday
}

export interface GovHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  notes?: string;
}

export interface Payroll {
  id: string;
  companyId?: string; // Tenant Isolation Link
  userId: string;
  monthYear: string; // YYYY-MM
  dailyRate: number; // in SAR
  totalDaysWorked: number; // e.g., 22.5 (half days count as 0.5)
  presentDays: number;
  halfDays: number;
  absentDays: number;
  fridayHolidayDays?: number; // Paid Friday holidays
  fridayPay?: number; // Friday base pay in SAR
  govHolidayDays?: number; // Paid government holidays
  govHolidayPay?: number; // Gov holiday pay in SAR
  overtimeHours?: number; // Accumulated OT hours
  overtimePay?: number; // Total OT pay in SAR
  absenceDeduction?: number; // Absence Penalty in SAR
  allowances: number; // SAR
  advances: number; // SAR
  penalties: number; // SAR
  netSalary: number; // SAR
  status: 'Draft' | 'Approved' | 'Paid';
  generatedAt: string;
}

export interface SystemSettings {
  currency: string; // Default 'SAR'
  fridayPaidHolidayEnabled: boolean; // Automatically count Fridays as official paid holidays
  overtimeMultiplierRate: number; // e.g. 1.5x, 2.0x (Double Pay), 3.0x (Triple Pay)
  absencePenaltyMultiplier: number; // 1.0 = 1 day wage deduction, 2.0 = 2 days wage deduction, 3.0 = 3 days wage deduction
  maxDailyComplaints: number; // Default 3 complaints per day
  govHolidays: GovHoliday[];
}

export interface Complaint {
  id: string;
  companyId?: string; // Tenant Isolation Link
  userId: string;
  siteId?: string;
  message: string;
  date: string; // YYYY-MM-DD HH:mm or ISO
  status: ComplaintStatus;
  responseNote?: string;
  resolvedBy?: string;
  category: 'Safety' | 'Wage/Payroll' | 'Site Condition' | 'Supervisor Issue' | 'Other';
}

export interface Notice {
  id: string;
  companyId?: string; // Tenant Isolation Link
  title: string;
  content: string;
  targetGroup: TargetGroup; // 'All' or siteId
  datePosted: string;
  postedBy: string; // User ID / Name
  priority: 'Normal' | 'Urgent' | 'Important';
}

export interface DocumentItem {
  id: string;
  companyId?: string; // Tenant Isolation Link
  title: string;
  description: string;
  fileName: string;
  fileType: 'PDF' | 'Word' | 'Excel' | 'Image' | 'Contract' | 'Other';
  fileSize: string; // e.g., '1.2 MB'
  fileUrl: string; // Data URL or storage link
  category: 'Safety Policy' | 'Labor Compliance' | 'Contracts' | 'Site Permits' | 'Circulars' | 'Other';
  uploadedBy: string; // Name/ID of Admin
  uploadedAt: string; // ISO string or date
  targetAudience?: 'All Staff' | 'Supervisors Only' | 'Workers & Laborers';
}

export interface SQLQueryExample {
  id: string;
  title: string;
  description: string;
  category: 'DDL Schema' | 'Prisma Schema' | 'Payroll Queries' | 'Attendance Queries' | 'Complaints & Limits';
  code: string;
}
