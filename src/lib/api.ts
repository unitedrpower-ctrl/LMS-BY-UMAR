import { User, Site, Attendance, Payroll, Complaint, Notice, RoleInvitation, UserRole, Company, SubscriptionPlanType } from '../types';

/**
 * API Service Layer for Express Backend Routes (/api/*)
 */

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}, currentUser?: User): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (currentUser) {
    headers['x-user-id'] = currentUser.id;
    headers['x-user-role'] = currentUser.role;
    if (currentUser.companyId) {
      headers['x-company-id'] = currentUser.companyId;
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.message) errorMessage = errJson.message;
      else if (errJson.error) errorMessage = errJson.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// 1. Health
export async function getBackendHealth() {
  return fetchApi<{ status: string; service: string; timestamp: string }>('/api/health');
}

// 2. Users
export async function getUsersApi(currentUser?: User): Promise<User[]> {
  return fetchApi<User[]>('/api/users', {}, currentUser);
}

export async function saveUserApi(user: User, currentUser?: User): Promise<User> {
  return fetchApi<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify(user)
  }, currentUser);
}

// 3. Sites
export async function getSitesApi(currentUser?: User): Promise<Site[]> {
  return fetchApi<Site[]>('/api/sites', {}, currentUser);
}

export async function saveSiteApi(site: Site, currentUser?: User): Promise<Site> {
  return fetchApi<Site>('/api/sites', {
    method: 'POST',
    body: JSON.stringify(site)
  }, currentUser);
}

// 4. Attendance (Triggers automated payroll recalculation in backend)
export async function getAttendanceApi(currentUser?: User, siteId?: string, date?: string): Promise<Attendance[]> {
  let url = '/api/attendance?';
  if (siteId) url += `siteId=${encodeURIComponent(siteId)}&`;
  if (date) url += `date=${encodeURIComponent(date)}&`;
  return fetchApi<Attendance[]>(url, {}, currentUser);
}

export async function markAttendanceApi(records: Attendance[], currentUser?: User): Promise<{
  message: string;
  attendance: Attendance[];
  recalculatedPayrolls: Payroll[];
}> {
  return fetchApi('/api/attendance', {
    method: 'POST',
    body: JSON.stringify(records)
  }, currentUser);
}

// 5. Payroll
export async function getPayrollApi(currentUser?: User): Promise<Payroll[]> {
  return fetchApi<Payroll[]>('/api/payroll', {}, currentUser);
}

export async function savePayrollApi(data: {
  userId: string;
  monthYear: string;
  allowances?: number;
  advances?: number;
  penalties?: number;
  status?: Payroll['status'];
}, currentUser?: User): Promise<Payroll> {
  return fetchApi<Payroll>('/api/payroll/save', {
    method: 'POST',
    body: JSON.stringify(data)
  }, currentUser);
}

export async function recalculatePayrollApi(userId: string, monthYear: string, currentUser?: User): Promise<{ message: string; payroll: Payroll }> {
  return fetchApi('/api/payroll/recalculate', {
    method: 'POST',
    body: JSON.stringify({ userId, monthYear })
  }, currentUser);
}

// 6. Excel Export Downloads (.xlsx)
export async function downloadPayrollExcelApi(monthYear: string, siteId?: string, roleCategory?: 'Staff' | 'Labor' | 'All', currentUser?: User): Promise<void> {
  const headers: Record<string, string> = {};
  if (currentUser) {
    headers['x-user-id'] = currentUser.id;
    headers['x-user-role'] = currentUser.role;
  }

  let url = `/api/payroll/export-excel?monthYear=${encodeURIComponent(monthYear)}`;
  if (siteId) url += `&siteId=${encodeURIComponent(siteId)}`;
  if (roleCategory) url += `&roleCategory=${encodeURIComponent(roleCategory)}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    let errorMessage = `Failed to download Excel sheet (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMessage = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Payroll_Sheet_${roleCategory || 'All'}_${monthYear}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export async function downloadLaborCredentialsExcelApi(currentUser?: User): Promise<void> {
  const headers: Record<string, string> = {};
  if (currentUser) {
    headers['x-user-id'] = currentUser.id;
    headers['x-user-role'] = currentUser.role;
  }

  const url = `/api/users/export-labor-excel`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    let errorMessage = `Failed to download Labor Credentials Excel sheet (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMessage = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Labor_Workers_Credentials_Master.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// 7. Complaints (Enforces 3 complaints / day rule)
export async function getComplaintsApi(currentUser?: User): Promise<Complaint[]> {
  return fetchApi<Complaint[]>('/api/complaints', {}, currentUser);
}

export async function submitComplaintApi(data: {
  message: string;
  category: Complaint['category'];
  siteId?: string;
  userId?: string;
}, currentUser?: User): Promise<{ message: string; complaint: Complaint; remainingToday: number }> {
  return fetchApi('/api/complaints', {
    method: 'POST',
    body: JSON.stringify(data)
  }, currentUser);
}

export async function updateComplaintStatusApi(id: string, status: Complaint['status'], responseNote?: string, currentUser?: User): Promise<Complaint> {
  return fetchApi<Complaint>(`/api/complaints/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, responseNote })
  }, currentUser);
}

// 8. Notices
export async function getNoticesApi(currentUser?: User): Promise<Notice[]> {
  return fetchApi<Notice[]>('/api/notices', {}, currentUser);
}

export async function submitNoticeApi(notice: Partial<Notice>, currentUser?: User): Promise<Notice> {
  return fetchApi<Notice>('/api/notices', {
    method: 'POST',
    body: JSON.stringify(notice)
  }, currentUser);
}

// 9. Permanent Deletion & Password Security APIs (Super Admin Restricted)
export async function deleteUserApi(id: string, currentUser?: User): Promise<{ success: boolean; message: string; deletedUser: User }> {
  return fetchApi<{ success: boolean; message: string; deletedUser: User }>(`/api/users/${id}`, {
    method: 'DELETE'
  }, currentUser);
}

export async function updateUserPasswordApi(id: string, newPassword: string, currentUser?: User): Promise<{ success: boolean; message: string; hashedPassword?: string }> {
  return fetchApi<{ success: boolean; message: string; hashedPassword?: string }>(`/api/users/${id}/update-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword })
  }, currentUser);
}

export async function getPendingApprovalsApi(currentUser?: User): Promise<User[]> {
  return fetchApi<User[]>('/api/admin/pending-approvals', {}, currentUser);
}

export async function approveUserApi(userId: string, currentUser?: User): Promise<{ success: boolean; user: User }> {
  return fetchApi<{ success: boolean; user: User }>('/api/admin/approve-user', {
    method: 'POST',
    body: JSON.stringify({ userId })
  }, currentUser);
}

export async function rejectUserApi(userId: string, currentUser?: User): Promise<{ success: boolean; user: User }> {
  return fetchApi<{ success: boolean; user: User }>('/api/admin/reject-user', {
    method: 'POST',
    body: JSON.stringify({ userId })
  }, currentUser);
}

export async function registerUserApi(user: User, inviteToken?: string): Promise<any> {
  const url = inviteToken ? `/api/auth/register?inviteToken=${encodeURIComponent(inviteToken)}` : '/api/auth/register';
  return fetchApi<any>(url, {
    method: 'POST',
    body: JSON.stringify(user)
  });
}

// 10. Owner Role Invitation & Google Auth APIs
export async function getInvitationsApi(currentUser?: User): Promise<RoleInvitation[]> {
  return fetchApi<RoleInvitation[]>('/api/owner/invitations', {}, currentUser);
}

export async function createInvitationApi(data: { email: string; role: UserRole }, currentUser?: User): Promise<{
  success: boolean;
  invitation: RoleInvitation;
  emailBody: string;
  inviteUrl: string;
}> {
  return fetchApi('/api/owner/invitations', {
    method: 'POST',
    body: JSON.stringify(data)
  }, currentUser);
}

export async function revokeInvitationApi(id: string, currentUser?: User): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>(`/api/owner/invitations/${id}/revoke`, {
    method: 'POST'
  }, currentUser);
}

export async function validateInvitationApi(token: string): Promise<{ valid: boolean; invitation?: RoleInvitation; error?: string }> {
  return fetchApi<{ valid: boolean; invitation?: RoleInvitation; error?: string }>(`/api/invitations/validate/${encodeURIComponent(token)}`);
}

export async function googleAuthApi(data: {
  email: string;
  name: string;
  avatar?: string;
  inviteToken?: string;
  iqamaId?: string;
  passportNumber?: string;
  phone?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
}): Promise<{
  success?: boolean;
  isNewUser?: boolean;
  userNeededDetails?: boolean;
  user?: User;
  status?: string;
  error?: string;
  message?: string;
}> {
  return fetchApi('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// 11. Multi-Tenant SaaS & Platform Owner APIs
export async function getMyCompanyApi(currentUser?: User): Promise<{
  company: Company;
  isSubscriptionExpired: boolean;
  workerCount: number;
  staffCount: number;
  daysRemaining: number;
  maxLaborersAllowed: number;
}> {
  return fetchApi('/api/tenant/my-company', {}, currentUser);
}

export async function getOwnerCompaniesApi(currentUser?: User): Promise<(Company & {
  activeLaborers: number;
  totalStaff: number;
  daysRemaining: number;
  computedStatus: string;
})[]> {
  return fetchApi('/api/owner/companies', {}, currentUser);
}

export async function getSaasAnalyticsApi(currentUser?: User): Promise<{
  totalCompanies: number;
  activeCompanies: number;
  expiredCompanies: number;
  expiringSoon: number;
  totalRevenueSar: number;
  totalWorkersAcrossTenants: number;
  planBreakdown: {
    sixMonth: number;
    oneYear: number;
    enterprise: number;
  };
}> {
  return fetchApi('/api/owner/saas-analytics', {}, currentUser);
}

export async function onboardCompanyApi(data: {
  name: string;
  adminName: string;
  adminEmail: string;
  planType: SubscriptionPlanType;
  maxLaborersAllowed?: number;
  pricePaidSar?: number;
  crNumber?: string;
  contactPhone?: string;
  subscriptionStartDate?: string;
  initialPassword?: string;
}, currentUser?: User): Promise<{
  success: boolean;
  company: Company;
  invitation: RoleInvitation;
  emailBody: string;
  inviteUrl: string;
}> {
  return fetchApi('/api/owner/companies', {
    method: 'POST',
    body: JSON.stringify(data)
  }, currentUser);
}

export async function updateCompanySubscriptionApi(
  id: string,
  data: {
    planType?: SubscriptionPlanType;
    addMonths?: number;
    newEndDate?: string;
    maxLaborersAllowed?: number;
    status?: 'Active' | 'Expired' | 'Suspended';
    additionalPriceSar?: number;
  },
  currentUser?: User
): Promise<{ success: boolean; message: string; company: Company }> {
  return fetchApi(`/api/owner/companies/${id}/subscription`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }, currentUser);
}

export async function suspendCompanyApi(id: string, currentUser?: User): Promise<{ success: boolean; message: string }> {
  return fetchApi(`/api/owner/companies/${id}`, {
    method: 'DELETE'
  }, currentUser);
}

export async function generateDemoLinkApi(data: {
  clientName: string;
  clientEmail: string;
  contactPhone?: string;
  maxLaborersAllowed?: number;
}, currentUser?: User): Promise<{
  success: boolean;
  demoCompany: Company;
  invitation: RoleInvitation;
  demoUrl: string;
  emailBody: string;
}> {
  return fetchApi('/api/owner/demo-links', {
    method: 'POST',
    body: JSON.stringify(data)
  }, currentUser);
}

export async function completeProfileApi(data: {
  iqamaId?: string;
  passportNumber?: string;
  phone?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  designation?: string;
}, currentUser?: User): Promise<{ success: boolean; message: string; user: User }> {
  return fetchApi('/api/users/complete-profile', {
    method: 'POST',
    body: JSON.stringify(data)
  }, currentUser);
}

export async function requestMasterOtpApi(email: string): Promise<{
  success: boolean;
  email: string;
  otpCode?: string;
  expiresMinutes: number;
  message: string;
}> {
  return fetchApi('/api/auth/request-master-otp', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function verifyMasterOtpApi(email: string, otp: string): Promise<{
  success: boolean;
  user: User;
  message: string;
}> {
  return fetchApi('/api/auth/verify-master-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp })
  });
}

export async function requestPasswordResetApi(email: string): Promise<{
  success: boolean;
  message: string;
  emailSent?: boolean;
  resetUrl?: string;
}> {
  return fetchApi('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function resetPasswordApi(token: string, newPassword: string): Promise<{
  success: boolean;
  message: string;
}> {
  return fetchApi('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword })
  });
}




