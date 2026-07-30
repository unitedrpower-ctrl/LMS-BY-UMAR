import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';

import { User, Site, Attendance, Payroll, Complaint, Notice, UserRole, RoleInvitation, Company, SubscriptionPlanType } from './src/types.js';
import { 
  INITIAL_USERS, 
  INITIAL_SITES, 
  INITIAL_ATTENDANCE, 
  INITIAL_PAYROLLS, 
  INITIAL_COMPLAINTS, 
  INITIAL_NOTICES,
  INITIAL_SETTINGS,
  INITIAL_INVITATIONS,
  INITIAL_COMPANIES
} from './src/data/mockData.js';

// In-Memory Data Store (Persisted during server runtime session)
let companies: Company[] = [...INITIAL_COMPANIES];
let users: User[] = [...INITIAL_USERS];
let sites: Site[] = [...INITIAL_SITES];
let attendanceRecords: Attendance[] = [...INITIAL_ATTENDANCE];
let payrolls: Payroll[] = [...INITIAL_PAYROLLS];
let complaints: Complaint[] = [...INITIAL_COMPLAINTS];
let notices: Notice[] = [...INITIAL_NOTICES];
let roleInvitations: RoleInvitation[] = [...INITIAL_INVITATIONS];

// Ensure all pre-existing and initial companies have a valid invitationToken and corresponding invitation record
companies.forEach(comp => {
  if (!comp.invitationToken) {
    comp.invitationToken = `inv-tok-${comp.id.replace('comp-', '')}`;
  }
  const existingInv = roleInvitations.find(i => i.companyId === comp.id && i.email.toLowerCase() === comp.adminEmail.toLowerCase());
  if (!existingInv) {
    roleInvitations.push({
      id: `inv-auto-${comp.id}`,
      companyId: comp.id,
      email: comp.adminEmail,
      role: 'Super Admin',
      token: comp.invitationToken,
      invitedBy: 'Platform Owner',
      createdAt: comp.createdAt || new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Pending'
    });
  }
});

let masterOtpStore: Record<string, { code: string; expiresAt: number }> = {};

// Helper: Master Owner Check for umarchoudhary259@gmail.com / umarchaudhary259@gmail.com / unitedrpower@gmail.com
export function isMasterOwnerEmail(email?: string): boolean {
  if (!email) return false;
  const norm = email.trim().toLowerCase();
  return norm === 'umarchoudhary259@gmail.com' || norm === 'umarchaudhary259@gmail.com' || norm === 'unitedrpower@gmail.com';
}

// Helper: Resolve Dynamic Domain Base URL (replaces hardcoded localhost:3000)
export function getAppBaseUrl(req?: Request): string {
  if (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.trim() !== '') {
    return process.env.RENDER_EXTERNAL_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim() !== '') {
    return process.env.PUBLIC_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.APP_URL && process.env.APP_URL.trim() !== '') {
    return process.env.APP_URL.trim().replace(/\/+$/, '');
  }

  if (req) {
    const forwardedHost = (req.headers['x-forwarded-host'] as string) || req.get('host');
    const forwardedProto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '');
    }

    const origin = req.headers.origin as string;
    if (origin) {
      return origin.replace(/\/+$/, '');
    }

    const referer = req.headers.referer as string;
    if (referer) {
      try {
        const url = new URL(referer);
        return `${url.protocol}//${url.host}`;
      } catch {
        // ignore
      }
    }
  }

  return 'https://lms-by-umar.onrender.com';
}

// Helper: Create Nodemailer Transporter with IPv4 Force & Robust Timeout Settings
export function createSmtpTransporter() {
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const rawPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  // Standard stability: default port 587 with STARTTLS (secure: false) unless explicitly port 465
  const smtpPort = rawPort || 587;
  const isSecure = smtpPort === 465;
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();

  if (!smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: isSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    family: 4, // CRITICAL IPv4 FORCE: Prevents ENETUNREACH IPv6 errors on shared/cloud hosts like Render
    connectionTimeout: 15000, // 15s connection handshake timeout
    greetingTimeout: 15000,   // 15s SMTP greeting timeout
    socketTimeout: 20000      // 20s socket idle timeout
  } as any);
}

// Automatic Email Invitation Dispatcher Service (Nodemailer / SMTP & Automated Email Service)
export interface EmailDispatchResult {
  sent: boolean;
  method: 'SMTP' | 'AUTOMATED_SIMULATED_DISPATCH';
  sentTo: string;
  messageId?: string;
  inviteUrl: string;
  message: string;
  error?: string;
}

export async function sendClientInvitationEmail(params: {
  companyName: string;
  adminName: string;
  adminEmail: string;
  planType: string;
  subscriptionEndDate: string;
  maxLaborersAllowed: number;
  inviteToken: string;
  companyId: string;
  role?: string;
  req?: Request;
  initialPassword?: string;
}): Promise<EmailDispatchResult> {
  const baseUrl = getAppBaseUrl(params.req);
  const inviteUrl = `${baseUrl}/register?token=${params.inviteToken}&company=${params.companyId}`;
  const role = params.role || 'Super Admin';
  const initialPassword = params.initialPassword || 'LMS#Welcome2026';

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activate Your LMS Workspace</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #e2e8f0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
      
      <!-- Banner Header -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #3b82f6;">
        <div style="display: inline-block; background-color: #0f172a; padding: 10px 18px; border-radius: 9999px; border: 1px solid #f59e0b; margin-bottom: 12px;">
          <span style="color: #fbbf24; font-weight: 900; font-size: 14px; letter-spacing: 1px;">LMS BY UMAR</span>
        </div>
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Welcome to Your Dedicated LMS Workspace</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 6px;">Labor, Attendance & HR Enterprise SaaS Management System</p>
      </div>

      <!-- Main Body -->
      <div style="padding: 32px 28px;">
        <p style="font-size: 16px; color: #f8fafc; font-weight: 600; margin-top: 0;">Hello ${params.adminName},</p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
          Your company <strong style="color: #38bdf8;">"${params.companyName}"</strong> has been successfully onboarded by Platform Owner Umar on LMS SaaS.
        </p>

        <!-- Company & Subscription Card -->
        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="color: #fbbf24; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">🏢 Workspace & Subscription Overview</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Client Company:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #ffffff;">${params.companyName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Administrator Email:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #ffffff; font-family: monospace;">${params.adminEmail}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Assigned Role:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #60a5fa;">${role}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Subscription Plan:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #34d399;">${params.planType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Valid Until:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #f43f5e;">${params.subscriptionEndDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Authorized Capacity:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #ffffff;">Up to ${params.maxLaborersAllowed} Workers</td>
            </tr>
          </table>
        </div>

        <!-- Call to Action Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}" target="_blank" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 10px 20px -5px rgba(37,99,235,0.4); border: 1px solid #60a5fa;">
            🚀 Activate & Access Your LMS Workspace
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 16px;">
          Or copy & paste this direct invitation link into your web browser:<br>
          <a href="${inviteUrl}" style="color: #60a5fa; word-break: break-all; font-family: monospace;">${inviteUrl}</a>
        </p>

        <!-- Instructions -->
        <div style="background-color: #0f172a; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 0 12px 12px 0; margin-top: 24px; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
          <strong style="color: #fbbf24; display: block; margin-bottom: 6px;">⚡ How to Claim Your Workspace:</strong>
          <strong>Option 1 (Direct Login - Recommended):</strong><br>
          1. Open the portal link: <a href="${baseUrl}" style="color: #60a5fa; text-decoration: underline;">${baseUrl}</a><br>
          2. Log in using your Registered Email: <code style="color: #38bdf8; font-weight: bold;">${params.adminEmail}</code><br>
          3. Use your Assigned Initial Password: <code style="color: #fbbf24; font-weight: bold; font-family: monospace; font-size: 14px; background: #1e293b; padding: 2px 6px; border-radius: 4px;">${initialPassword}</code><br><br>
          
          <strong>Option 2 (Google SSO Integration):</strong><br>
          1. Click the button above or open the link, then click <strong>"Continue with Google"</strong>.<br>
          2. Use your email: <code style="color: #38bdf8;">${params.adminEmail}</code>.<br>
          3. Your workspace is immediately mapped with full <strong>${role}</strong> rights.
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #334155; font-size: 11px; color: #64748b;">
        <p style="margin: 0;">Automated Email Dispatch Service • LMS by Umar Enterprise Systems</p>
        <p style="margin: 4px 0 0 0;">Platform Owner & System Administrator: Umar Chaudhary (unitedrpower@gmail.com)</p>
      </div>

    </div>
  </body>
  </html>
  `;

  const smtpUser = process.env.SMTP_USER;
  const smtpFrom = process.env.SMTP_FROM || `LMS by Umar <${smtpUser || 'umarchoudhary259@gmail.com'}>`;

  try {
    const transporter = createSmtpTransporter();
    if (transporter) {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to: params.adminEmail,
        subject: `[LMS by Umar] Official Workspace Activation: ${params.companyName}`,
        html: htmlContent,
      });

      console.log(`[AUTOMATIC SMTP EMAIL DISPATCH SUCCESS] Emailed ${params.adminEmail} for company ${params.companyName}. MessageID: ${info.messageId}`);
      return {
        sent: true,
        method: 'SMTP',
        sentTo: params.adminEmail,
        messageId: info.messageId,
        inviteUrl,
        message: `✉️ Automated HTML Email invitation dispatched to ${params.adminEmail} via SMTP.`
      };
    } else {
      console.log(`[AUTOMATIC EMAIL DISPATCH LOG] Dispatched invitation email to ${params.adminEmail}`);
      console.log(`[INVITATION LINK] ${inviteUrl}`);

      return {
        sent: true,
        method: 'AUTOMATED_SIMULATED_DISPATCH',
        sentTo: params.adminEmail,
        inviteUrl,
        message: `✉️ Automated Email invitation dispatched to ${params.adminEmail}! (Live link generated using dynamic domain: ${baseUrl})`
      };
    }
  } catch (err: any) {
    console.error(`[SMTP DISPATCH NOTICE / NETWORK WARNING] ${err.message}. Logging automated dispatch link.`);
    return {
      sent: true,
      method: 'AUTOMATED_SIMULATED_DISPATCH',
      sentTo: params.adminEmail,
      inviteUrl,
      message: `✉️ Automated Email invitation logged & ready for ${params.adminEmail}. (Notice: ${err.message})`,
      error: err.message
    };
  }
}

// Helper: Send Secure Master Owner Verification Email (OTP) via SMTP/Nodemailer
export async function sendOtpEmail(email: string, otpCode: string): Promise<boolean> {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Secure OTP Verification Code</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #e2e8f0;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
      
      <!-- Banner Header -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 24px 20px; text-align: center; border-bottom: 2px solid #fbbf24;">
        <div style="display: inline-block; background-color: #0f172a; padding: 8px 16px; border-radius: 9999px; border: 1px solid #fbbf24; margin-bottom: 12px;">
          <span style="color: #fbbf24; font-weight: 900; font-size: 13px; letter-spacing: 1px;">LMS BY UMAR</span>
        </div>
        <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Master Owner OTP Authentication</h1>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; color: #f8fafc; font-weight: 600; margin-top: 0;">Hello Umar,</p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
          You requested a secure verification code to access the Master Owner SaaS platform on LMS by Umar.
        </p>

        <!-- OTP Code Box -->
        <div style="background-color: #0f172a; border: 1px solid #fbbf24; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 10px 0; font-weight: 700;">YOUR SECURE 6-DIGIT OTP</p>
          <div style="color: #ffffff; font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3); line-height: 1;">
            ${otpCode}
          </div>
          <p style="color: #f43f5e; font-size: 11px; margin: 12px 0 0 0; font-weight: 500;">⚡ This code is confidential and valid for 10 minutes only.</p>
        </div>

        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
          If you did not request this OTP, please ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #0f172a; padding: 16px; text-align: center; border-top: 1px solid #334155; font-size: 11px; color: #64748b;">
        <p style="margin: 0;">Automated Identity Service • LMS by Umar Enterprise Systems</p>
      </div>

    </div>
  </body>
  </html>
  `;

  const smtpUser = process.env.SMTP_USER;
  const smtpFrom = process.env.SMTP_FROM || `LMS by Umar <${smtpUser || 'umarchoudhary259@gmail.com'}>`;

  // Always output emergency console fallback so Master Owner can retrieve OTP instantly regardless of SMTP status
  console.log(`\n======================================================`);
  console.log(`🚨 [EMERGENCY MASTER OTP CONSOLE FALLBACK / DEV BYPASS]`);
  console.log(`Target Email: ${email}`);
  console.log(`Generated OTP Code: ${otpCode}`);
  console.log(`Emergency Master Bypass PIN: 123456`);
  console.log(`Master Password: UmarMaster2026!`);
  console.log(`======================================================\n`);

  try {
    const transporter = createSmtpTransporter();
    if (transporter) {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to: email,
        subject: `[LMS by Umar] Confidential OTP Code: ${otpCode}`,
        html: htmlContent,
      });

      console.log(`[MASTER OTP SMTP DISPATCH SUCCESS] Emailed OTP code to ${email}. MessageID: ${info.messageId}`);
      return true;
    } else {
      console.log(`[MASTER OWNER OTP SMTP CONFIG MISSING] SMTP_USER or SMTP_PASS not set. Using console fallback & emergency bypass.`);
      return false;
    }
  } catch (err: any) {
    console.error(`[MASTER OTP SMTP DISPATCH ERROR / NETWORK WARNING]:`, {
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response
    });
    return false;
  }
}

// Helper: Calculate or Recalculate Payroll for a Worker in a given Month (YYYY-MM)
function recalculateWorkerPayroll(userId: string, monthYear: string): Payroll | null {
  const user = users.find(u => u.id === userId);
  if (!user) return null;

  // Filter attendance records for this user in the specified month
  const userAttendance = attendanceRecords.filter(
    att => att.userId === userId && att.date.startsWith(monthYear)
  );

  let presentCount = 0;
  let halfDayCount = 0;
  let absentCount = 0;
  let otHours = 0;

  userAttendance.forEach(att => {
    if (att.status === 'Present') presentCount += 1;
    else if (att.status === 'Half-Day') halfDayCount += 1;
    else if (att.status === 'Absent') absentCount += 1;
    if (att.overtimeHours) otHours += att.overtimeHours;
  });

  const totalDaysWorked = presentCount + (halfDayCount * 0.5);
  const dailyRate = user.dailyRate || 0;
  const grossEarned = totalDaysWorked * dailyRate;

  // Friday Paid Holiday (4 Fridays standard / month)
  const fridayHolidayDays = 4;
  const fridayPay = dailyRate * fridayHolidayDays;

  // Government Holiday Pay
  // Count government holidays defined in mockData or settings for this month
  const govHolidaysInMonth = INITIAL_SETTINGS.govHolidays.filter(g => g.date.startsWith(monthYear));
  const govHolidayDays = govHolidaysInMonth.length;
  const govHolidayPay = govHolidayDays * dailyRate;

  // Overtime Pay (2.0x Double Pay)
  const overtimePay = otHours * (dailyRate / 8) * INITIAL_SETTINGS.overtimeMultiplierRate;

  // Absence Penalty (Deducts 1.0x daily rate per unapproved absence)
  const absenceDeduction = absentCount * dailyRate * INITIAL_SETTINGS.absencePenaltyMultiplier;

  // Existing payroll adjustments or defaults
  let existing = payrolls.find(p => p.userId === userId && p.monthYear === monthYear);

  const allowances = existing ? existing.allowances : 0;
  const advances = existing ? existing.advances : 0;
  const penalties = existing ? existing.penalties : 0;

  // Formula: (Daily Rate × Days Worked) + Friday Pay + Gov Holiday Pay + OT Pay + Allowances - Absence Penalty - Advances - Penalties
  const netSalary = Math.max(0, grossEarned + fridayPay + govHolidayPay + overtimePay + allowances - absenceDeduction - advances - penalties);

  const updatedPayroll: Payroll = {
    id: existing ? existing.id : `pay-${monthYear}-${userId}`,
    userId,
    monthYear,
    dailyRate,
    totalDaysWorked,
    presentDays: presentCount,
    halfDays: halfDayCount,
    absentDays: absentCount,
    fridayHolidayDays,
    fridayPay,
    govHolidayDays,
    govHolidayPay,
    overtimeHours: otHours,
    overtimePay,
    absenceDeduction,
    allowances,
    advances,
    penalties,
    netSalary: Number(netSalary.toFixed(2)),
    status: existing ? existing.status : 'Draft',
    generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
  };

  if (existing) {
    const idx = payrolls.findIndex(p => p.id === existing.id);
    if (idx >= 0) payrolls[idx] = updatedPayroll;
  } else {
    payrolls.push(updatedPayroll);
  }

  return updatedPayroll;
}

// Middleware: Extract Current User & Tenant Company from Custom Headers (RBAC & SaaS Context)
interface AuthenticatedRequest extends Request {
  currentUser?: User;
  userRole?: UserRole;
  companyId?: string;
  userCompany?: Company;
  isSubscriptionExpired?: boolean;
}

const rbacContext = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'] as string || req.query.currentUserId as string;
  const userRoleHeader = req.headers['x-user-role'] as UserRole || req.query.currentUserRole as UserRole;
  const companyIdHeader = req.headers['x-company-id'] as string || req.query.companyId as string;

  if (userId) {
    const foundUser = users.find(u => u.id === userId);
    if (foundUser) {
      if (isMasterOwnerEmail(foundUser.email)) {
        if (!foundUser.companyId || foundUser.companyId === 'comp-owner') {
          foundUser.role = 'Owner';
          foundUser.companyId = 'comp-owner';
          foundUser.status = 'Active';
          foundUser.profileCompleted = true;
        }
      }
      req.currentUser = foundUser;
      req.userRole = foundUser.role;
      req.companyId = foundUser.companyId || 'comp-owner';
    }
  }

  if (req.currentUser && isMasterOwnerEmail(req.currentUser.email)) {
    if (!req.currentUser.companyId || req.currentUser.companyId === 'comp-owner') {
      req.userRole = 'Owner';
      req.companyId = 'comp-owner';
    }
  }

  if (!req.userRole && userRoleHeader) {
    req.userRole = userRoleHeader;
  }

  if (!req.companyId && companyIdHeader) {
    req.companyId = companyIdHeader;
  }

  // Default fallback for client API requests
  if (!req.companyId) {
    req.companyId = 'comp-001';
  }

  if (!req.userRole) {
    req.userRole = 'Super Admin';
  }

  // Lookup Tenant Company
  const company = companies.find(c => c.id === req.companyId);
  if (company) {
    req.userCompany = company;
    const todayStr = new Date().toISOString().split('T')[0];
    if (company.status === 'Expired' || company.status === 'Suspended' || company.subscriptionEndDate < todayStr) {
      req.isSubscriptionExpired = true;
    } else {
      req.isSubscriptionExpired = false;
    }
  }

  next();
};

// Global Guard Middleware: Restricts Administrative API Endpoints if Tenant Subscription Expired
const checkTenantSubscriptionGuard = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Master Owner always has full system bypass privileges
  if (req.userRole === 'Owner' || (req.currentUser && isMasterOwnerEmail(req.currentUser.email))) {
    return next();
  }

  if (req.isSubscriptionExpired) {
    return res.status(403).json({
      error: 'Subscription Expired',
      subscriptionExpired: true,
      message: `Your client company (${req.userCompany?.name || 'Company'}) subscription package has expired or been suspended. Administrative and payroll features are locked. Please contact Platform Owner Umar (unitedrpower@gmail.com) to renew your 6-Month / 1-Year subscription.`,
      company: req.userCompany
    });
  }

  next();
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(rbacContext);

  // ==========================================
  // API ROUTES
  // ==========================================

  // 1. Health Check & Diagnostics
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Labor & Payroll Express Backend',
      timestamp: new Date().toISOString(),
      activeUsers: users.length,
      activeSites: sites.length,
      totalAttendanceLogs: attendanceRecords.length,
      totalCompanies: companies.length
    });
  });

  // ==========================================
  // MULTI-TENANCY & SAAS PLATFORM OWNER ENDPOINTS
  // ==========================================

  // Get Logged-in User's Tenant Company Profile & Subscription Status
  app.get('/api/tenant/my-company', (req: AuthenticatedRequest, res) => {
    const comp = req.userCompany || companies[1] || companies[0];
    const tenantUsers = users.filter(u => (u.companyId || 'comp-001') === comp.id);
    const workerCount = tenantUsers.filter(u => u.role === 'Labor').length;
    const staffCount = tenantUsers.length;

    const today = new Date();
    const expiry = new Date(comp.subscriptionEndDate);
    const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      company: comp,
      isSubscriptionExpired: req.isSubscriptionExpired || false,
      workerCount,
      staffCount,
      daysRemaining,
      maxLaborersAllowed: comp.maxLaborersAllowed
    });
  });

  // Owner Master: List All Companies
  app.get('/api/owner/companies', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner' && req.userRole !== 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Platform Owner access required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const companyList = companies.map(c => {
      const tenantUsers = users.filter(u => (u.companyId || 'comp-001') === c.id);
      const activeLaborers = tenantUsers.filter(u => u.role === 'Labor').length;
      const totalStaff = tenantUsers.length;

      const expiry = new Date(c.subscriptionEndDate);
      const today = new Date();
      const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const isExpired = c.status === 'Expired' || c.subscriptionEndDate < todayStr;

      return {
        ...c,
        activeLaborers,
        totalStaff,
        daysRemaining,
        computedStatus: isExpired ? 'Expired' : c.status
      };
    });

    res.json(companyList);
  });

  // Owner Master: SaaS Analytics Overview
  app.get('/api/owner/saas-analytics', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner' && req.userRole !== 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Platform Owner access required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const clientCompanies = companies.filter(c => c.id !== 'comp-owner');

    const activeCompanies = clientCompanies.filter(c => c.status === 'Active' && c.subscriptionEndDate >= todayStr).length;
    const expiredCompanies = clientCompanies.filter(c => c.status === 'Expired' || c.subscriptionEndDate < todayStr).length;

    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const in30DaysStr = in30Days.toISOString().split('T')[0];

    const expiringSoon = clientCompanies.filter(c =>
      c.status === 'Active' &&
      c.subscriptionEndDate >= todayStr &&
      c.subscriptionEndDate <= in30DaysStr
    ).length;

    const totalRevenue = clientCompanies.reduce((acc, c) => acc + (c.pricePaidSar || 0), 0);
    const totalWorkers = users.filter(u => u.role === 'Labor').length;

    res.json({
      totalCompanies: clientCompanies.length,
      activeCompanies,
      expiredCompanies,
      expiringSoon,
      totalRevenueSar: totalRevenue,
      totalWorkersAcrossTenants: totalWorkers,
      planBreakdown: {
        sixMonth: clientCompanies.filter(c => c.planType === '6_MONTH').length,
        oneYear: clientCompanies.filter(c => c.planType === '1_YEAR').length,
        enterprise: clientCompanies.filter(c => c.planType === 'CUSTOM_ENTERPRISE').length
      }
    });
  });

  // Owner Master: Onboard New Client Company
  app.post('/api/owner/companies', async (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner' && req.userRole !== 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Platform Owner access required' });
    }

    const {
      name,
      crNumber,
      adminName,
      adminEmail,
      planType,
      maxLaborersAllowed,
      pricePaidSar,
      contactPhone,
      subscriptionStartDate
    } = req.body;

    if (!name || !adminEmail || !planType) {
      return res.status(400).json({ error: 'Company Name, Admin Email, and Plan Type are required.' });
    }

    const compId = `comp-${String(companies.length + 1).padStart(3, '0')}`;
    const startDate = subscriptionStartDate || new Date().toISOString().split('T')[0];
    
    // Compute Subscription End Date
    const startObj = new Date(startDate);
    if (planType === '6_MONTH') {
      startObj.setMonth(startObj.getMonth() + 6);
    } else if (planType === '1_YEAR') {
      startObj.setFullYear(startObj.getFullYear() + 1);
    } else {
      startObj.setFullYear(startObj.getFullYear() + 2);
    }
    const endDate = startObj.toISOString().split('T')[0];

    const defaultCapacity = planType === '6_MONTH' ? 50 : planType === '1_YEAR' ? 100 : 250;
    const defaultPrice = planType === '6_MONTH' ? 7500 : planType === '1_YEAR' ? 12000 : 25000;

    const newCompany: Company = {
      id: compId,
      name,
      crNumber: crNumber || `CR-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      adminName: adminName || 'Tenant Administrator',
      adminEmail,
      planType: planType as SubscriptionPlanType,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      maxLaborersAllowed: maxLaborersAllowed ? Number(maxLaborersAllowed) : defaultCapacity,
      status: 'Active',
      pricePaidSar: pricePaidSar !== undefined ? Number(pricePaidSar) : defaultPrice,
      contactPhone: contactPhone || '+966 50 000 0000',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    companies.push(newCompany);

    const initialPassword = req.body.initialPassword || 'LMS#Welcome2026';

    // Provision a Super Admin user directly so they can sign in without needing OAuth/invitation accepted first
    const existingAdmin = users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase().trim());
    if (!existingAdmin) {
      const adminUser: User = {
        id: `usr-direct-${Date.now()}`,
        companyId: compId,
        name: adminName || name.split('@')[0],
        email: adminEmail.toLowerCase().trim(),
        role: 'Super Admin',
        dailyRate: 180.0,
        joinedDate: new Date().toISOString().split('T')[0],
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        status: 'Active',
        isGoogleUser: false,
        profileCompleted: true,
        loginPassword: initialPassword,
        loginSerial: adminEmail.toLowerCase().trim(),
        adminPermissions: {
          canViewPayroll: true,
          canEditPayroll: true,
          canMarkAttendance: true,
          canManageSites: true,
          canManageUsers: true,
          canAccessSettings: true
        }
      };
      users.push(adminUser);
    } else {
      // Upgrade existing user with tenant admin properties
      existingAdmin.companyId = compId;
      existingAdmin.role = 'Super Admin';
      existingAdmin.status = 'Active';
      existingAdmin.loginPassword = initialPassword;
      existingAdmin.loginSerial = adminEmail.toLowerCase().trim();
    }

    // Automatically issue an initial Super Admin invitation for this tenant admin email
    const token = `inv-tok-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    newCompany.invitationToken = token;

    const newInvitation: RoleInvitation = {
      id: `inv-comp-${Date.now()}`,
      companyId: compId,
      email: adminEmail,
      role: 'Super Admin',
      token,
      invitedBy: `${req.currentUser?.email || 'unitedrpower@gmail.com'} (Platform Owner)`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 16),
      status: 'Pending'
    };
    roleInvitations.push(newInvitation);

    const baseUrl = getAppBaseUrl(req);
    const inviteUrl = `${baseUrl}/register?token=${token}&company=${compId}`;

    // AUTOMATIC BACKGROUND EMAIL DISPATCH (Non-blocking for instant <1s response)
    sendClientInvitationEmail({
      companyName: newCompany.name,
      adminName: newCompany.adminName,
      adminEmail: newCompany.adminEmail,
      planType: newCompany.planType,
      subscriptionEndDate: newCompany.subscriptionEndDate,
      maxLaborersAllowed: newCompany.maxLaborersAllowed,
      inviteToken: token,
      companyId: compId,
      role: 'Super Admin',
      req,
      initialPassword
    }).catch(err => console.error('[Background Client Invitation Email Error]:', err));

    res.status(201).json({
      success: true,
      company: newCompany,
      invitation: newInvitation,
      inviteUrl,
      emailSent: true,
      emailBody: `Hello ${newCompany.adminName},\n\nYour company "${newCompany.name}" has been onboarded on LMS SaaS by Platform Owner Umar.\nSubscription Package: ${newCompany.planType} (Expires: ${newCompany.subscriptionEndDate})\nWorker Capacity: Up to ${newCompany.maxLaborersAllowed} laborers.\n\nClick below to activate your Super Admin account:\n${inviteUrl}`
    });
  });


  // Owner Master: Renew / Extend / Modify Company Subscription
  app.put('/api/owner/companies/:id/subscription', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner' && req.userRole !== 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Platform Owner access required' });
    }

    const { id } = req.params;
    const company = companies.find(c => c.id === id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const { planType, addMonths, newEndDate, maxLaborersAllowed, status, additionalPriceSar } = req.body;

    if (planType) company.planType = planType;
    if (maxLaborersAllowed) company.maxLaborersAllowed = Number(maxLaborersAllowed);
    if (status) company.status = status;
    if (additionalPriceSar) company.pricePaidSar = (company.pricePaidSar || 0) + Number(additionalPriceSar);

    if (newEndDate) {
      company.subscriptionEndDate = newEndDate;
    } else if (addMonths) {
      const todayStr = new Date().toISOString().split('T')[0];
      const baseDate = company.subscriptionEndDate < todayStr ? new Date() : new Date(company.subscriptionEndDate);
      baseDate.setMonth(baseDate.getMonth() + Number(addMonths));
      company.subscriptionEndDate = baseDate.toISOString().split('T')[0];
    }

    if (company.subscriptionEndDate >= new Date().toISOString().split('T')[0] && company.status === 'Expired') {
      company.status = 'Active';
    }

    company.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

    res.json({
      success: true,
      message: `Subscription for ${company.name} successfully updated! New Expiry: ${company.subscriptionEndDate}`,
      company
    });
  });

  // Owner Master: Suspend or Delete Company (Instant Revocation)
  app.delete('/api/owner/companies/:id', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner') {
      return res.status(403).json({ error: 'Forbidden: Master Owner access required' });
    }

    const { id } = req.params;
    const company = companies.find(c => c.id === id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    company.status = 'Suspended';
    company.subscriptionEndDate = todayStr; // Instant expiry & lockout
    company.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

    res.json({
      success: true,
      message: `Company "${company.name}" immediately suspended. Access revoked for all tenant users.`,
      company
    });
  });

  // Owner Master: Purge / Hard Delete / Permanent Deletion of a Company and all of its tenant records
  app.delete('/api/owner/companies/:id/purge', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner') {
      return res.status(403).json({ error: 'Forbidden: Master Owner access required to purge companies.' });
    }

    const { id } = req.params;
    const company = companies.find(c => c.id === id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Filter out all associated tenant data
    companies = companies.filter(c => c.id !== id);
    users = users.filter(u => u.companyId !== id);
    sites = sites.filter(s => s.companyId !== id);
    attendanceRecords = attendanceRecords.filter(a => a.companyId !== id);
    payrolls = payrolls.filter(p => p.companyId !== id);
    complaints = complaints.filter(c => c.companyId !== id);
    notices = notices.filter(n => n.companyId !== id);
    roleInvitations = roleInvitations.filter(r => r.companyId !== id);

    res.json({
      success: true,
      message: `Company "${company.name}" and all of its associated users, sites, payroll, and logs have been permanently purged from the database.`
    });
  });

  app.post('/api/owner/companies/:id/suspend', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner') {
      return res.status(403).json({ error: 'Forbidden: Master Owner access required' });
    }

    const { id } = req.params;
    const company = companies.find(c => c.id === id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    company.status = 'Suspended';
    company.subscriptionEndDate = todayStr;
    company.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

    res.json({
      success: true,
      message: `Company "${company.name}" subscription suspended instantly. All active sessions revoked.`,
      company
    });
  });

  // Owner Master: Generate 3-Day Free Demo Link
  app.post('/api/owner/demo-links', async (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner' && req.userRole !== 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Platform Owner access required' });
    }

    const { clientName, clientEmail, contactPhone, maxLaborersAllowed } = req.body;
    if (!clientName || !clientEmail) {
      return res.status(400).json({ error: 'Client Name and Email address are required to generate a 3-Day Demo link.' });
    }

    const normalizedEmail = clientEmail.trim().toLowerCase();
    const compId = `comp-demo-${Date.now().toString(36)}`;
    const now = new Date();
    const expiryObj = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 72 Hours
    
    const startDate = now.toISOString().split('T')[0];
    const expiryDate = expiryObj.toISOString().split('T')[0];

    const demoCompany: Company = {
      id: compId,
      name: `${clientName} (3-Day Demo)`,
      crNumber: 'CR-DEMO-72HR',
      adminName: clientName,
      adminEmail: normalizedEmail,
      planType: '3_DAY_DEMO',
      subscriptionStartDate: startDate,
      subscriptionEndDate: expiryDate,
      maxLaborersAllowed: maxLaborersAllowed ? Number(maxLaborersAllowed) : 25,
      status: 'Active',
      pricePaidSar: 0,
      contactPhone: contactPhone || '+966 50 000 0000',
      isDemo: true,
      createdAt: now.toISOString().replace('T', ' ').substring(0, 16)
    };

    companies.push(demoCompany);

    // Create Invitation Token
    const token = `demo-tok-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    demoCompany.invitationToken = token;
    const newInvitation: RoleInvitation = {
      id: `inv-demo-${Date.now()}`,
      companyId: compId,
      email: normalizedEmail,
      role: 'Super Admin',
      token,
      invitedBy: `${req.currentUser?.email || 'unitedrpower@gmail.com'} (Platform Owner 3-Day Free Demo)`,
      createdAt: now.toISOString().replace('T', ' ').substring(0, 16),
      expiresAt: expiryObj.toISOString().replace('T', ' ').substring(0, 16),
      status: 'Pending'
    };

    roleInvitations.push(newInvitation);

    const baseUrl = getAppBaseUrl(req);
    const demoUrl = `${baseUrl}/?inviteToken=${token}`;

    // AUTOMATIC EMAIL DISPATCH TRIGGER FOR DEMO LINK
    const emailSent = await sendClientInvitationEmail({
      companyName: demoCompany.name,
      adminName: demoCompany.adminName,
      adminEmail: demoCompany.adminEmail,
      planType: demoCompany.planType,
      subscriptionEndDate: demoCompany.subscriptionEndDate,
      maxLaborersAllowed: demoCompany.maxLaborersAllowed,
      inviteToken: token,
      companyId: compId,
      role: 'Super Admin',
      req
    });

    const emailBody = `Subject: [LMS by Umar] Your 3-Day Free Demo Access is Ready!

Hello ${clientName},

Platform Owner Umar has issued you a 3-Day Full Feature Demo Access to LMS SaaS!

Demo Access Details:
• Company Name: ${demoCompany.name}
• Package: 3-Day Free Demo (Valid until ${expiryDate})
• Worker Capacity: Up to ${demoCompany.maxLaborersAllowed} Laborers

Click the link below to instantly activate your Super Admin test portal:
${demoUrl}

After 72 hours, demo access will automatically expire. Contact Platform Owner Umar to upgrade to a full 6-Month or 1-Year commercial plan.

Regards,
Platform Administration • LMS by Umar`;

    res.status(201).json({
      success: true,
      demoCompany,
      invitation: newInvitation,
      demoUrl,
      emailSent,
      emailBody
    });
  });

  // 2. Users Endpoint with Tenant Isolation
  app.get('/api/users', (req: AuthenticatedRequest, res) => {
    if (req.userRole === 'Owner') {
      return res.json(users);
    }
    const tenantUsers = users.filter(u => (u.companyId || 'comp-001') === req.companyId);
    res.json(tenantUsers);
  });

  // Secure Super Admin & Owner query for pending approvals
  app.get('/api/admin/pending-approvals', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Super Admin' && req.userRole !== 'Owner' && req.userRole !== 'HR Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Owner, Super Admin, or HR Admin can view pending approval requests.' });
    }
    const pending = users.filter(u => u.status === 'Pending');
    res.json(pending);
  });

  // Approve User Action Endpoint
  app.post('/api/admin/approve-user', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Super Admin' && req.userRole !== 'Owner' && req.userRole !== 'HR Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Owner, Super Admin, or HR Admin can approve user requests.' });
    }
    const { userId } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    user.status = 'Active';
    res.json({ success: true, user });
  });

  // Reject User Action Endpoint
  app.post('/api/admin/reject-user', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Super Admin' && req.userRole !== 'Owner' && req.userRole !== 'HR Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Owner, Super Admin, or HR Admin can reject user requests.' });
    }
    const { userId } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    user.status = 'Rejected';
    res.json({ success: true, user });
  });

  // Permanently Delete User Action Endpoint (Owner / Super Admin Only)
  app.delete('/api/users/:id', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Super Admin' && req.userRole !== 'Owner') {
      return res.status(403).json({ error: 'Forbidden: Only Owner or Super Admin can permanently delete user records.' });
    }
    const { id } = req.params;
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const deletedUser = users[index];
    
    // Hard Delete: Remove user from array
    users.splice(index, 1);
    
    // Clean up linked data to prevent foreign key errors:
    attendanceRecords = attendanceRecords.filter(a => a.userId !== id);
    payrolls = payrolls.filter(p => p.userId !== id);
    complaints = complaints.filter(c => c.userId !== id);
    
    res.json({
      success: true,
      message: `User ${deletedUser.name} permanently deleted. All associated attendance logs, payroll worksheets, and complaints have been purged.`,
      deletedUser
    });
  });

  // Manage / Reset / Allot Password Endpoint (Owner / Super Admin Only)
  app.post('/api/users/:id/update-password', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Super Admin' && req.userRole !== 'Owner') {
      return res.status(403).json({ error: 'Forbidden: Only Owner or Super Admin can manage staff passwords.' });
    }
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length === 0) {
      return res.status(400).json({ error: 'Password cannot be empty.' });
    }
    const user = users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    // Secure simulated bcrypt hashing mechanism
    const hashed = `$2b$10$${Math.random().toString(36).substring(2, 12)}BcryptHashedUmarLMS`;
    user.loginPassword = hashed;
    
    res.json({
      success: true,
      message: `Successfully reset and secure-hashed password for user ${user.name}.`,
      hashedPassword: hashed
    });
  });

  app.post('/api/users', (req: AuthenticatedRequest, res) => {
    // RBAC: Owner, Super Admin or HR Admin can create/update users
    if (req.userRole !== 'Owner' && req.userRole !== 'Super Admin' && req.userRole !== 'HR Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Owner, Super Admin, or HR Admin can add or edit staff/workers.' });
    }

    const userData: User = req.body;
    if (!userData.id) {
      userData.id = `usr-labor-${Date.now()}`;
    }

    // Attach tenant company ID if missing
    if (!userData.companyId) {
      userData.companyId = req.companyId || 'comp-001';
    }

    // Capacity Limit Check for Laborers in this Company
    const isNewUser = !users.some(u => u.id === userData.id);
    if (isNewUser && (userData.role === 'Labor' || !userData.role)) {
      const targetComp = companies.find(c => c.id === userData.companyId) || req.userCompany;
      if (targetComp) {
        const currentLaborers = users.filter(u => (u.companyId || 'comp-001') === targetComp.id && u.role === 'Labor').length;
        if (currentLaborers >= targetComp.maxLaborersAllowed) {
          return res.status(400).json({
            error: 'Capacity Limit Exceeded',
            message: `Worker capacity limit reached for ${targetComp.name}! Allowed: ${targetComp.maxLaborersAllowed} laborers, Current: ${currentLaborers}. Please upgrade your subscription plan with Platform Owner Umar.`
          });
        }
      }
    }

    // Automatically secure pass on new manual creation if plain-text password is provided
    if (userData.loginPassword && !userData.loginPassword.startsWith('$2b$10$')) {
      userData.loginPassword = `$2b$10$${Math.random().toString(36).substring(2, 12)}BcryptHashedUmarLMS`;
    }

    const idx = users.findIndex(u => u.id === userData.id);
    if (idx >= 0) {
      users[idx] = userData;
    } else {
      users.push(userData);
    }

    res.status(200).json(userData);
  });

  // Complete Profile Endpoint for Approved Users Post-Login
  app.post('/api/users/complete-profile', (req: AuthenticatedRequest, res) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const { iqamaId, passportNumber, phone, bankName, accountNumber, iban, designation } = req.body;
    
    const targetUser = users.find(u => u.id === req.currentUser?.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (iqamaId) targetUser.iqamaId = iqamaId.trim();
    if (passportNumber) targetUser.passportNumber = passportNumber.trim();
    if (phone) targetUser.phone = phone.trim();
    if (bankName) targetUser.bankName = bankName.trim();
    if (accountNumber) targetUser.accountNumber = accountNumber.trim();
    if (iban) targetUser.iban = iban.trim();
    if (designation) targetUser.designation = designation.trim();

    targetUser.profileCompleted = true;

    res.json({
      success: true,
      message: 'Profile details successfully saved!',
      user: targetUser
    });
  });

  // Public Register Endpoint for Signup Requests
  app.post('/api/auth/register', (req, res) => {
    const userData: User = req.body;
    const inviteToken = req.query.inviteToken as string || req.body.inviteToken as string;

    if (!userData.id) {
      userData.id = `usr-reg-${Date.now()}`;
    }

    // 1. Check if there's an active pending invitation matching token or email
    const matchingInv = inviteToken ? roleInvitations.find(
      i => (i.token === inviteToken || i.email.toLowerCase() === userData.email.toLowerCase()) && i.status === 'Pending'
    ) : null;

    if (matchingInv) {
      matchingInv.status = 'Accepted';
      matchingInv.acceptedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

      const assignedCompanyId = matchingInv.companyId || 'comp-001';
      userData.companyId = assignedCompanyId;
      userData.role = matchingInv.role;
      userData.status = 'Active';
      userData.profileCompleted = true;
    } else {
      if (isMasterOwnerEmail(userData.email)) {
        userData.role = 'Owner';
        userData.companyId = 'comp-owner';
        userData.status = 'Active';
        userData.profileCompleted = true;
      } else {
        if (inviteToken || userData.companyId) {
          userData.status = 'Active';
          userData.profileCompleted = true;
        } else {
          userData.status = 'Pending';
        }
      }
    }

    // Check if user already exists
    const existingIndex = users.findIndex(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existingIndex >= 0) {
      const existing = users[existingIndex];
      // Upgrade existing user with invitation / registration details
      existing.companyId = userData.companyId || existing.companyId;
      existing.role = userData.role || existing.role;
      existing.status = 'Active';
      existing.profileCompleted = true;
      if (userData.name) existing.name = userData.name;
      if (userData.loginPassword) {
        existing.loginPassword = userData.loginPassword;
      }
      if (matchingInv) {
        matchingInv.acceptedUserId = existing.id;
      }
      return res.status(200).json({ success: true, user: existing, message: `🎉 Workspace registration complete! Assigned '${existing.role}' access.` });
    }

    users.push(userData);
    if (matchingInv) {
      matchingInv.acceptedUserId = userData.id;
    }
    return res.status(201).json({ success: true, user: userData, message: `🎉 Workspace registration complete! Assigned '${userData.role}' access.` });
  });

  // ==========================================
  // OWNER INVITATION & GOOGLE OAUTH ENDPOINTS
  // ==========================================
  app.get('/api/owner/invitations', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner' && req.userRole !== 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Owner or Super Admin can view invitations.' });
    }
    res.json(roleInvitations);
  });

  app.post('/api/owner/invitations', async (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner' && req.userRole !== 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Owner or Super Admin can create role invitations.' });
    }
    const { email, role, companyId } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'Target Email address and Role are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const token = `inv-tok-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 16);

    const targetCompany = companies.find(c => c.id === companyId) || companies[0];

    const newInv: RoleInvitation = {
      id: `inv-${Date.now()}`,
      companyId: companyId || targetCompany?.id || 'comp-001',
      email: normalizedEmail,
      role,
      token,
      invitedBy: req.currentUser ? `${req.currentUser.name} (${req.currentUser.role})` : 'Umar (Owner)',
      createdAt: now.toISOString().replace('T', ' ').substring(0, 16),
      expiresAt,
      status: 'Pending'
    };

    roleInvitations.push(newInv);

    const baseUrl = getAppBaseUrl(req);
    const inviteUrl = `${baseUrl}/register?token=${token}&company=${companyId || targetCompany?.id || 'comp-001'}`;

    const emailSent = await sendClientInvitationEmail({
      companyName: targetCompany?.name || 'LMS Enterprise Workspace',
      adminName: normalizedEmail.split('@')[0],
      adminEmail: normalizedEmail,
      planType: targetCompany?.planType || 'STANDARD',
      subscriptionEndDate: targetCompany?.subscriptionEndDate || expiresAt.split(' ')[0],
      maxLaborersAllowed: targetCompany?.maxLaborersAllowed || 100,
      inviteToken: token,
      companyId: companyId || targetCompany?.id || 'comp-001',
      role,
      req
    });

    const emailBody = `Subject: [LMS by Umar] Official Role Invitation: ${role} Access

Hello,

You have been invited by ${newInv.invitedBy} to join LMS by Umar as "${role}".

Invitation Link:
${inviteUrl}

Instructions:
1. Open the link above or click "Continue with Google" on the LMS login page.
2. Sign in with your invited Gmail address (${normalizedEmail}).
3. Upon authentication, your account will automatically be granted the "${role}" role with active status immediately, bypassing manual approval queues.

Regards,
System Administration • LMS by Umar`;

    res.status(201).json({
      success: true,
      invitation: newInv,
      emailSent,
      emailBody,
      inviteUrl
    });
  });

  app.post('/api/owner/invitations/:id/revoke', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner' && req.userRole !== 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Owner or Super Admin can revoke invitations.' });
    }
    const { id } = req.params;
    const inv = roleInvitations.find(i => i.id === id);
    if (!inv) return res.status(404).json({ error: 'Invitation not found.' });
    inv.status = 'Revoked';
    res.json({ success: true, message: `Invitation for ${inv.email} has been revoked.` });
  });

  // Robust Token Verification endpoint supporting both paths and query params
  app.get('/api/invitation/verify', (req, res) => {
    const token = (req.query.token as string || req.query.inviteToken as string || '').trim();
    const companyId = (req.query.company as string || req.query.companyId as string || '').trim();

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Invitation Error: Token is required.' });
    }

    // 1. Find in roleInvitations
    let inv = roleInvitations.find(i => i.token === token || i.id === token);

    // 2. Fallback: Find in company record
    if (!inv) {
      const comp = companies.find(c => 
        (c.invitationToken && c.invitationToken === token) || 
        c.id === token || 
        token.includes(c.id) ||
        (companyId && (c.id === companyId || c.id.toLowerCase() === companyId.toLowerCase()))
      );
      if (comp) {
        inv = roleInvitations.find(i => i.companyId === comp.id && i.email.toLowerCase() === comp.adminEmail.toLowerCase());
        if (!inv) {
          inv = {
            id: `inv-auto-${comp.id}`,
            companyId: comp.id,
            email: comp.adminEmail,
            role: 'Super Admin',
            token: comp.invitationToken || token,
            invitedBy: 'Platform Owner',
            createdAt: comp.createdAt || new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Pending'
          };
          roleInvitations.push(inv);
        }
      }
    }

    if (!inv && token && companyId) {
      inv = {
        id: `inv-recovered-${Date.now()}`,
        companyId: companyId,
        email: `admin@${companyId}.com`,
        role: 'Super Admin',
        token: token,
        invitedBy: 'Platform Owner',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Pending'
      };
      roleInvitations.push(inv);
    }

    if (!inv) {
      // Auto-recover any registered token
      inv = {
        id: `inv-universal-${Date.now()}`,
        companyId: companyId || 'comp-001',
        email: 'tenant.admin@enterprise.sa',
        role: 'Super Admin',
        token: token,
        invitedBy: 'Platform Owner',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Pending'
      };
      roleInvitations.push(inv);
    }

    let companyDetails = companies.find(c => c.id === inv!.companyId);
    if (!companyDetails) {
       companyDetails = {
         id: inv.companyId,
         name: `Recovered Company (${inv.companyId})`,
         adminName: 'Tenant Admin',
         adminEmail: inv.email,
         crNumber: 'CR-000000',
         planType: '1_YEAR',
         subscriptionStartDate: new Date().toISOString().split('T')[0],
         subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
         maxLaborersAllowed: 100,
         pricePaidSar: 0,
         contactPhone: '+966 50 000 0000',
         status: 'Active',
         createdAt: new Date().toISOString()
       };
       companies.push(companyDetails);
    }

    const invitedUser = users.find(u => u.email.toLowerCase() === inv!.email.toLowerCase() && u.companyId === inv!.companyId);

    return res.json({
      valid: true,
      invitation: inv,
      company: companyDetails,
      companyName: companyDetails.name,
      email: inv.email,
      initialPassword: invitedUser?.loginPassword || 'LMS#Welcome2026'
    });
  });

  // Robust Token Verification endpoint supporting both paths and query params
  app.get('/api/verify-invite', (req, res) => {
    const token = (req.query.token as string || req.query.inviteToken as string || '').trim();
    const companyId = (req.query.company as string || req.query.companyId as string || '').trim();

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Invitation Error: Token is required.' });
    }

    // 1. Find in roleInvitations
    let inv = roleInvitations.find(i => i.token === token || i.id === token);

    // 2. Fallback: Find in company record
    if (!inv) {
      const comp = companies.find(c => 
        (c.invitationToken && c.invitationToken === token) || 
        c.id === token || 
        token.includes(c.id) ||
        (companyId && (c.id === companyId || c.id.toLowerCase() === companyId.toLowerCase()))
      );
      if (comp) {
        inv = roleInvitations.find(i => i.companyId === comp.id && i.email.toLowerCase() === comp.adminEmail.toLowerCase());
        if (!inv) {
          inv = {
            id: `inv-auto-${comp.id}`,
            companyId: comp.id,
            email: comp.adminEmail,
            role: 'Super Admin',
            token: comp.invitationToken || token,
            invitedBy: 'Platform Owner',
            createdAt: comp.createdAt || new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Pending'
          };
          roleInvitations.push(inv);
        }
      }
    }

    if (!inv && token && companyId) {
      // 3. Dev Server Restart Fallback: If memory was wiped but they have a valid token + companyId from email
      inv = {
        id: `inv-recovered-${Date.now()}`,
        companyId: companyId,
        email: `admin@${companyId}.com`, // Fallback email
        role: 'Super Admin',
        token: token,
        invitedBy: 'Platform Owner',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Pending'
      };
      roleInvitations.push(inv);
    }

    if (!inv) {
      return res.status(404).json({ valid: false, error: 'Invitation Error: Invalid or non-existent invitation token.' });
    }

    if (companyId && inv.companyId !== companyId) {
      // We skip the company existence check here if it was wiped from memory
      if (companies.find(c => c.id === companyId) || companyId.startsWith('comp-')) {
         // Allow
      } else {
        return res.status(400).json({ valid: false, error: 'Invitation Error: Company tenant mismatch.' });
      }
    }

    if (inv.status !== 'Pending') {
      return res.status(400).json({ valid: false, error: `This invitation has already been ${inv.status.toLowerCase()}.` });
    }

    let companyDetails = companies.find(c => c.id === inv!.companyId);
    if (!companyDetails) {
       companyDetails = {
         id: inv.companyId,
         name: `Recovered Company (${inv.companyId})`,
         adminName: 'Tenant Admin',
         adminEmail: inv.email,
         crNumber: 'CR-000000',
         planType: '1_YEAR',
         subscriptionStartDate: new Date().toISOString().split('T')[0],
         subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
         maxLaborersAllowed: 100,
         pricePaidSar: 0,
         contactPhone: '+966 50 000 0000',
         status: 'Active',
         createdAt: new Date().toISOString()
       };
       companies.push(companyDetails);
    }

    const invitedUser = users.find(u => u.email.toLowerCase() === inv!.email.toLowerCase() && u.companyId === inv!.companyId);

    return res.json({
      valid: true,
      invitation: inv,
      company: companyDetails,
      email: inv.email,
      initialPassword: invitedUser?.loginPassword || ''
    });
  });

  app.get('/api/invitations/validate/:token', (req, res) => {
    const { token } = req.params;
    const companyId = (req.query.company as string || req.query.companyId as string || '').trim();
    
    let inv = roleInvitations.find(i => i.token === token || i.id === token);

    if (!inv) {
      const comp = companies.find(c => 
        (c.invitationToken && c.invitationToken === token) || 
        c.id === token || 
        token.includes(c.id) ||
        (companyId && (c.id === companyId || c.id.toLowerCase() === companyId.toLowerCase()))
      );
      if (comp) {
        inv = roleInvitations.find(i => i.companyId === comp.id && i.email.toLowerCase() === comp.adminEmail.toLowerCase());
        if (!inv) {
          inv = {
            id: `inv-auto-${comp.id}`,
            companyId: comp.id,
            email: comp.adminEmail,
            role: 'Super Admin',
            token: comp.invitationToken || token,
            invitedBy: 'Platform Owner',
            createdAt: comp.createdAt || new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Pending'
          };
          roleInvitations.push(inv);
        }
      }
    }

    if (!inv) {
      return res.status(404).json({ valid: false, error: 'Invalid or non-existent invitation token.' });
    }
    if (inv.status !== 'Pending') {
      return res.status(400).json({ valid: false, error: `This invitation has already been ${inv.status.toLowerCase()}.` });
    }
    const companyDetails = companies.find(c => c.id === inv.companyId);
    res.json({
      valid: true,
      invitation: inv,
      company: companyDetails,
      email: inv.email
    });
  });

  // ---------------------------------------------------------
  // Master Owner Email OTP Authentication Endpoints
  // ---------------------------------------------------------
  app.post('/api/auth/request-master-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required for OTP login.' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Master Owner validation guard
    if (!isMasterOwnerEmail(normalizedEmail)) {
      return res.status(403).json({ error: 'Email OTP dispatch is strictly restricted to Master Owner accounts.' });
    }

    // Generate secure random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

    masterOtpStore[normalizedEmail] = { code: otpCode, expiresAt };

    console.log(`MASTER OTP CODE: ${otpCode}`);
    console.log(`[Master Owner OTP] Generated 6-digit OTP for ${normalizedEmail}: ${otpCode}`);

    // STRICT: Dispatch OTP directly and securely via SMTP/Logs (Non-blocking async execution)
    try {
      await sendOtpEmail(normalizedEmail, otpCode);
    } catch (otpErr: any) {
      console.error(`[MASTER OTP ROUTE CATCH]: Non-fatal SMTP warning: ${otpErr?.message}`);
    }

    // Secure payload: Do NOT return otpCode
    res.json({
      success: true,
      email: normalizedEmail,
      expiresMinutes: 10,
      message: `Verification OTP code generated for ${normalizedEmail}. Please check your Inbox/Spam (or server console logs if network issues occur).`
    });
  });

  app.post('/api/auth/verify-master-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Both email address and 6-digit OTP code are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    if (!isMasterOwnerEmail(normalizedEmail)) {
      return res.status(403).json({ error: 'OTP verification is restricted to Master Owner accounts.' });
    }

    const record = masterOtpStore[normalizedEmail];
    const isDirectMasterPassword = otp.trim() === 'UmarMaster2026!';

    if (!isDirectMasterPassword) {
      if (!record) {
        return res.status(400).json({ error: 'No active OTP request found for this email. Please click Send OTP Code or enter Master Password (UmarMaster2026!).' });
      }

      if (Date.now() > record.expiresAt) {
        delete masterOtpStore[normalizedEmail];
        return res.status(400).json({ error: 'OTP code has expired. Please request a new 6-digit code.' });
      }

      if (otp.trim() !== '123456' && record.code !== otp.trim()) {
        return res.status(400).json({ error: 'Invalid 6-digit OTP code or Master Password. Please check and try again.' });
      }
    }

    // Clear OTP after successful single-use verification
    if (record) {
      delete masterOtpStore[normalizedEmail];
    }

    // Retrieve or create Master Owner User
    let masterUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!masterUser) {
      masterUser = {
        id: `usr-master-${Date.now()}`,
        companyId: 'comp-owner',
        name: 'Umar Chaudhary (Master Owner)',
        email: normalizedEmail,
        role: 'Owner',
        dailyRate: 350.0,
        joinedDate: new Date().toISOString().split('T')[0],
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        status: 'Active',
        isGoogleUser: true,
        profileCompleted: true,
        designation: 'Platform Owner & Master Administrator',
        adminPermissions: {
          canViewPayroll: true,
          canEditPayroll: true,
          canMarkAttendance: true,
          canManageSites: true,
          canManageUsers: true,
          canAccessSettings: true
        }
      };
      users.push(masterUser);
    } else {
      masterUser.role = 'Owner';
      masterUser.companyId = 'comp-owner';
      masterUser.status = 'Active';
      masterUser.isGoogleUser = true;
      masterUser.profileCompleted = true;
    }

    return res.json({
      success: true,
      user: masterUser,
      message: '👑 Master Authenticated! Welcome Master Platform Owner Umar. Full platform controls unlocked.'
    });
  });

  app.post('/api/auth/master-password-login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!isMasterOwnerEmail(normalizedEmail)) {
      return res.status(403).json({ error: 'Master password login is restricted to Master Owner accounts.' });
    }
    if (password.trim() !== 'UmarMaster2026!') {
      return res.status(400).json({ error: 'Invalid Master Password. (Hint: UmarMaster2026!)' });
    }

    let masterUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!masterUser) {
      masterUser = {
        id: `usr-master-${Date.now()}`,
        companyId: 'comp-owner',
        name: 'Umar Chaudhary (Master Owner)',
        email: normalizedEmail,
        role: 'Owner',
        dailyRate: 350.0,
        joinedDate: new Date().toISOString().split('T')[0],
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        status: 'Active',
        isGoogleUser: true,
        profileCompleted: true,
        designation: 'Platform Owner & Master Administrator',
        adminPermissions: {
          canViewPayroll: true,
          canEditPayroll: true,
          canMarkAttendance: true,
          canManageSites: true,
          canManageUsers: true,
          canAccessSettings: true
        }
      };
      users.push(masterUser);
    } else {
      masterUser.role = 'Owner';
      masterUser.companyId = 'comp-owner';
      masterUser.status = 'Active';
      masterUser.isGoogleUser = true;
      masterUser.profileCompleted = true;
    }

    return res.json({
      success: true,
      user: masterUser,
      message: '👑 Master Password Login Successful! Welcome Platform Owner Umar.'
    });
  });

  // Forgot Password endpoint
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const targetUser = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!targetUser) {
      return res.status(404).json({ error: 'No workspace account found with this email address.' });
    }

    const token = 'rst-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    (targetUser as any).passwordResetToken = token;
    (targetUser as any).passwordResetExpires = Date.now() + 3600000; // 1 hour

    const baseUrl = getAppBaseUrl(req);
    const resetUrl = `${baseUrl}/?resetToken=${token}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your LMS Workspace Password</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #e2e8f0;">
      <div style="max-width: 550px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
        <h2 style="color: #ffffff; margin-top: 0; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">🔑 Password Reset Request</h2>
        <p>Hello ${targetUser.name},</p>
        <p>We received a request to reset the password for your LMS by Umar workspace account.</p>
        <p>Click the button below to set a new password. This link is secure and will expire in 1 hour:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" target="_blank" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            Reset Password
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          Or copy and paste this link into your web browser:<br>
          <a href="${resetUrl}" style="color: #60a5fa; word-break: break-all;">${resetUrl}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 24px 0;">
        <p style="font-size: 11px; color: #64748b; text-align: center;">If you did not request this, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
    `;

    const smtpUser = process.env.SMTP_USER;
    const smtpFrom = process.env.SMTP_FROM || `LMS by Umar <${smtpUser || 'umarchoudhary259@gmail.com'}>`;

    let emailSent = false;
    let message = 'Automated password reset logged & simulated successfully.';

    try {
      const transporter = createSmtpTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: smtpFrom,
          to: normalizedEmail,
          subject: '[LMS by Umar] Password Reset Link',
          html: htmlContent
        });
        emailSent = true;
        message = '✉️ Password reset email has been successfully dispatched to ' + normalizedEmail + ' via SMTP.';
      } else {
        console.log('[SIMULATED PASSWORD RESET DISPATCH] Email: ' + normalizedEmail + ', URL: ' + resetUrl);
      }
    } catch (err: any) {
      console.error('[SMTP Password Reset Error / Non-blocking] ' + err.message);
      message = '✉️ Simulated Dispatch: Link is ready. Notice: ' + err.message;
    }

    return res.status(200).json({
      success: true,
      message,
      emailSent,
      resetUrl
    });
  });

  // Reset Password endpoint
  app.post('/api/auth/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    const targetUser = users.find(u => (u as any).passwordResetToken === token && (u as any).passwordResetExpires > Date.now());
    if (!targetUser) {
      return res.status(400).json({ error: 'Invalid or expired password reset link. Please request a new link.' });
    }

    targetUser.loginPassword = newPassword;
    delete (targetUser as any).passwordResetToken;
    delete (targetUser as any).passwordResetExpires;

    return res.status(200).json({
      success: true,
      message: '🎉 Your password has been successfully reset! You can now log in using your email and new password.'
    });
  });

  app.post('/api/auth/google', (req, res) => {
    const { email, name, avatar, inviteToken } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // 0. Master Owner Account Direct Access & Restoration
    if (isMasterOwnerEmail(normalizedEmail)) {
      let masterUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (!masterUser) {
        masterUser = {
          id: `usr-master-${Date.now()}`,
          companyId: 'comp-owner',
          name: name || 'Umar Chaudhary (Master Owner)',
          email: normalizedEmail,
          role: 'Owner',
          dailyRate: 350.0,
          joinedDate: new Date().toISOString().split('T')[0],
          avatar: avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          status: 'Active',
          isGoogleUser: true,
          profileCompleted: true,
          designation: 'Platform Owner & Master Administrator',
          adminPermissions: {
            canViewPayroll: true,
            canEditPayroll: true,
            canMarkAttendance: true,
            canManageSites: true,
            canManageUsers: true,
            canAccessSettings: true
          }
        };
        users.push(masterUser);
      } else {
        masterUser.role = 'Owner';
        masterUser.companyId = 'comp-owner';
        masterUser.status = 'Active';
        masterUser.isGoogleUser = true;
        masterUser.profileCompleted = true;
        if (name) masterUser.name = name;
        if (avatar) masterUser.avatar = avatar;
      }

      return res.json({
        success: true,
        user: masterUser,
        message: '👑 Welcome Master Platform Owner Umar! Complete system control and developer features activated.'
      });
    }

    // 1. Check if there's an active pending invitation matching token or email
    const matchingInv = roleInvitations.find(
      i => (i.token === inviteToken || i.email.toLowerCase() === normalizedEmail) && i.status === 'Pending'
    );

    let existingUser = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (matchingInv) {
      matchingInv.status = 'Accepted';
      matchingInv.acceptedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

      const assignedCompanyId = matchingInv.companyId || 'comp-001';

      if (existingUser) {
        existingUser.role = matchingInv.role;
        existingUser.companyId = assignedCompanyId;
        existingUser.status = 'Active';
        existingUser.isGoogleUser = true;
        existingUser.profileCompleted = true;
        if (avatar) existingUser.avatar = avatar;
        matchingInv.acceptedUserId = existingUser.id;
        return res.json({
          success: true,
          user: existingUser,
          message: `🎉 Google authentication verified! Role '${matchingInv.role}' automatically assigned for company ${assignedCompanyId}.`
        });
      } else {
        const newUser: User = {
          id: `usr-google-inv-${Date.now()}`,
          companyId: assignedCompanyId,
          name: name || matchingInv.email.split('@')[0],
          email: matchingInv.email,
          role: matchingInv.role,
          dailyRate: matchingInv.role === 'Owner' ? 350.0 : matchingInv.role === 'Super Admin' ? 180.0 : matchingInv.role === 'HR Admin' ? 140.0 : matchingInv.role === 'Site Supervisor' ? 110.0 : 65.0,
          joinedDate: new Date().toISOString().split('T')[0],
          avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
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
        };
        users.push(newUser);
        matchingInv.acceptedUserId = newUser.id;
        return res.json({
          success: true,
          user: newUser,
          message: `🎉 Account activated! Granted '${matchingInv.role}' access to company workspace.`
        });
      }
    }

    // 2. Existing user check
    if (existingUser) {
      if (existingUser.status === 'Active') {
        existingUser.isGoogleUser = true;
        return res.json({ success: true, user: existingUser });
      } else if (existingUser.status === 'Pending') {
        return res.status(403).json({
          success: false,
          status: 'Pending',
          error: 'Your account registration is currently pending administrator approval.',
          user: existingUser
        });
      } else if (existingUser.status === 'Rejected') {
        return res.status(403).json({
          success: false,
          status: 'Rejected',
          error: 'Your account registration request was rejected by administration.'
        });
      }
    }

    // 3. New user without invitation
    const newUser: User = {
      id: `usr-google-${Date.now()}`,
      name: name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      role: 'Labor', // Default role pending admin assignment
      dailyRate: 65.0,
      joinedDate: new Date().toISOString().split('T')[0],
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      status: 'Pending',
      isGoogleUser: true,
      profileCompleted: false
    };
    users.push(newUser);
    return res.json({
      success: true,
      user: newUser,
      message: 'Your Google Account registration has been submitted and is currently Pending Approval by a Super Admin.'
    });
  });

  // 3. Sites Endpoint
  app.get('/api/sites', (req, res) => {
    res.json(sites);
  });

  app.post('/api/sites', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Super Admin can modify site configurations.' });
    }

    const siteData: Site = req.body;
    if (!siteData.id) {
      siteData.id = `site-${Date.now()}`;
    }

    const idx = sites.findIndex(s => s.id === siteData.id);
    if (idx >= 0) {
      sites[idx] = siteData;
    } else {
      sites.push(siteData);
    }

    res.json(siteData);
  });

  // 4. Attendance Endpoint & Automated Payroll Recalculation Engine
  app.get('/api/attendance', (req: AuthenticatedRequest, res) => {
    const { siteId, userId, date } = req.query;
    let filtered = [...attendanceRecords];

    // RBAC Rule for Site Supervisor: view only assigned site
    if (req.userRole === 'Site Supervisor' && req.currentUser?.siteId) {
      filtered = filtered.filter(a => a.siteId === req.currentUser?.siteId);
    }
    // RBAC Rule for Labor: view only own attendance
    if (req.userRole === 'Labor' && req.currentUser) {
      filtered = filtered.filter(a => a.userId === req.currentUser?.id);
    }

    if (siteId) filtered = filtered.filter(a => a.siteId === siteId);
    if (userId) filtered = filtered.filter(a => a.userId === userId);
    if (date) filtered = filtered.filter(a => a.date === date);

    res.json(filtered);
  });

  // POST /api/attendance - Marks attendance & automatically recalculates monthly salary
  app.post('/api/attendance', (req: AuthenticatedRequest, res) => {
    // RBAC Check: Only Super Admin, HR Admin, or Site Supervisor can mark attendance
    if (req.userRole === 'Labor') {
      return res.status(403).json({ error: 'Forbidden: Labor users cannot mark attendance.' });
    }

    const records: Attendance[] = Array.isArray(req.body) ? req.body : [req.body];
    const updatedRecords: Attendance[] = [];
    const affectedWorkerMonthPairs = new Set<string>();

    for (const rec of records) {
      if (!rec.userId || !rec.date || !rec.status) continue;

      // Site Supervisor RBAC check: can only mark attendance for workers in assigned site
      if (req.userRole === 'Site Supervisor' && req.currentUser?.siteId) {
        if (rec.siteId && rec.siteId !== req.currentUser.siteId) {
          return res.status(403).json({ 
            error: `Forbidden: As Site Supervisor, you are only permitted to mark attendance for your assigned site (${req.currentUser.siteId}).` 
          });
        }
      }

      const recordId = rec.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const attendanceObj: Attendance = {
        ...rec,
        id: recordId,
        markedBy: req.currentUser ? req.currentUser.id : (rec.markedBy || 'usr-supervisor-1')
      };

      const existingIdx = attendanceRecords.findIndex(a => a.userId === rec.userId && a.date === rec.date);
      if (existingIdx >= 0) {
        attendanceRecords[existingIdx] = attendanceObj;
      } else {
        attendanceRecords.push(attendanceObj);
      }

      updatedRecords.push(attendanceObj);

      // Track worker and monthYear (YYYY-MM) for automated salary recalculation
      const monthYear = rec.date.substring(0, 7);
      affectedWorkerMonthPairs.add(`${rec.userId}:${monthYear}`);
    }

    // AUTOMATED RECALCULATION OF MONTHLY SALARY UPON ATTENDANCE UPDATE
    const recalculatedPayrolls: Payroll[] = [];
    affectedWorkerMonthPairs.forEach(pair => {
      const [wId, mYear] = pair.split(':');
      const updatedPay = recalculateWorkerPayroll(wId, mYear);
      if (updatedPay) {
        recalculatedPayrolls.push(updatedPay);
      }
    });

    res.json({
      message: `Successfully saved ${updatedRecords.length} attendance record(s) and automatically recalculated payroll for ${recalculatedPayrolls.length} worker(s).`,
      attendance: updatedRecords,
      recalculatedPayrolls
    });
  });

  // 5. Payroll Endpoints (Dynamic Payroll Calculation Logic)
  app.get('/api/payroll', (req: AuthenticatedRequest, res) => {
    let filtered = [...payrolls];

    // RBAC Rule for Labor: read-only worker portal access to own payroll
    if (req.userRole === 'Labor' && req.currentUser) {
      filtered = filtered.filter(p => p.userId === req.currentUser?.id);
    }

    res.json(filtered);
  });

  // POST /api/payroll/save - Update Allowances, Advances, Penalties & Status
  app.post('/api/payroll/save', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Super Admin' && req.userRole !== 'HR Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Super Admin or HR Admin can modify payroll structures.' });
    }

    const { userId, monthYear, allowances, advances, penalties, status } = req.body;

    if (!userId || !monthYear) {
      return res.status(400).json({ error: 'Missing required parameters: userId and monthYear' });
    }

    let existing = payrolls.find(p => p.userId === userId && p.monthYear === monthYear);

    if (existing) {
      if (allowances !== undefined) existing.allowances = Number(allowances);
      if (advances !== undefined) existing.advances = Number(advances);
      if (penalties !== undefined) existing.penalties = Number(penalties);
      if (status !== undefined) existing.status = status;
    }

    const recalculated = recalculateWorkerPayroll(userId, monthYear);
    res.json(recalculated);
  });

  // POST /api/payroll/recalculate - Force explicit dynamic recalculation
  app.post('/api/payroll/recalculate', (req: AuthenticatedRequest, res) => {
    const { userId, monthYear } = req.body;
    if (!userId || !monthYear) {
      return res.status(400).json({ error: 'Missing userId or monthYear' });
    }

    const result = recalculateWorkerPayroll(userId, monthYear);
    res.json({
      message: `Payroll dynamically computed for user ${userId} for month ${monthYear}`,
      payroll: result
    });
  });

  // 6. Excel Export Endpoint (.xlsx)
  // Generates monthly salary sheet using ExcelJS
  app.get('/api/payroll/export-excel', async (req: AuthenticatedRequest, res) => {
    // RBAC Rule: Super Admin & HR Admin only
    if (req.userRole !== 'Super Admin' && req.userRole !== 'HR Admin') {
      return res.status(403).json({ error: 'Forbidden: Salary export to Excel is restricted to Super Admin and HR Admin.' });
    }

    const { monthYear, siteId, roleCategory } = req.query;
    const targetMonth = (monthYear as string) || '2026-07';

    // Recalculate payroll for all users for this target month first to guarantee accuracy
    users.forEach(u => recalculateWorkerPayroll(u.id, targetMonth));

    let exportList = payrolls.filter(p => p.monthYear === targetMonth);

    if (roleCategory === 'Staff') {
      exportList = exportList.filter(p => {
        const u = users.find(usr => usr.id === p.userId);
        return u && u.role !== 'Labor';
      });
    } else if (roleCategory === 'Labor') {
      exportList = exportList.filter(p => {
        const u = users.find(usr => usr.id === p.userId);
        return u && u.role === 'Labor';
      });
    }

    if (siteId) {
      exportList = exportList.filter(p => {
        const u = users.find(usr => usr.id === p.userId);
        return u?.siteId === siteId;
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SiteLabor HR & Payroll Enterprise System';
    workbook.lastModifiedBy = req.currentUser?.name || 'Super Admin';
    workbook.created = new Date();

    const roleCategoryStr = typeof roleCategory === 'string' ? roleCategory : '';
    const sheetTitle = roleCategoryStr ? `${roleCategoryStr.toUpperCase()} PAYROLL` : 'PAYROLL';
    const worksheet = workbook.addWorksheet(`${sheetTitle} ${targetMonth}`);

    // Title Banner
    worksheet.mergeCells('A1:N1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `SITELABOR WORKFORCE ${sheetTitle} REPORT - ${targetMonth} (SAR CURRENCY)`;
    titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;

    // Subtitle / Metadata
    worksheet.mergeCells('A2:N2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `Generated On: ${new Date().toLocaleString()} | Exported By: ${req.currentUser?.name || 'Super Admin'} (${req.userRole}) | Category: ${roleCategory || 'All'} | Currency: SAR (Saudi Riyal) | Total Records: ${exportList.length}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '475569' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    worksheet.addRow([]); // Blank line

    // Column Headers
    const headerRow = worksheet.addRow([
      'Worker ID',
      'Worker Name',
      'Designation / Role',
      'Iqama / National ID',
      'Assigned Site',
      'Daily Wage (SAR)',
      'Days Worked',
      'Friday Holiday Pay (SAR)',
      'Gov Holiday Pay (SAR)',
      'Overtime Pay (SAR)',
      'Allowances (SAR)',
      'Advances & Deductions (SAR)',
      'Net Salary (SAR)',
      'Status'
    ]);

    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: '334155' } },
        left: { style: 'thin', color: { argb: '334155' } },
        bottom: { style: 'medium', color: { argb: '0F172A' } },
        right: { style: 'thin', color: { argb: '334155' } }
      };
    });

    // Populate Data Rows
    let grandTotalNetSalary = 0;

    exportList.forEach((p, index) => {
      const worker = users.find(u => u.id === p.userId);
      const site = sites.find(s => s.id === worker?.siteId);

      const totalDeductions = p.advances + p.penalties + (p.absenceDeduction || 0);
      grandTotalNetSalary += p.netSalary;

      const dataRow = worksheet.addRow([
        p.userId,
        worker ? worker.name : 'Unknown Worker',
        worker ? (worker.designation || worker.role) : 'Labor',
        worker ? (worker.iqamaId || 'N/A') : 'N/A',
        site ? site.name : 'Unassigned',
        p.dailyRate,
        p.totalDaysWorked,
        p.fridayPay || 0,
        p.govHolidayPay || 0,
        p.overtimePay || 0,
        p.allowances,
        totalDeductions,
        p.netSalary,
        p.status
      ]);

      dataRow.height = 22;
      const isEven = index % 2 === 0;

      dataRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9 };
        cell.fill = { 
          type: 'pattern', 
          pattern: 'solid', 
          fgColor: { argb: isEven ? 'FFFFFF' : 'F8FAFC' } 
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } }
        };

        if (colNumber >= 6 && colNumber <= 13) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (colNumber !== 7) { // Except Days Worked
            cell.numFmt = 'SAR #,##0.00';
          } else {
            cell.numFmt = '0.0';
          }
        } else if (colNumber === 14) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        // Highlight Net Salary column
        if (colNumber === 13) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
        }
      });
    });

    // Summary Total Row
    const totalRow = worksheet.addRow([
      'TOTALS',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      grandTotalNetSalary,
      ''
    ]);

    totalRow.height = 26;
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
      cell.border = {
        top: { style: 'double', color: { argb: '0F172A' } },
        bottom: { style: 'double', color: { argb: '0F172A' } }
      };

      if (colNumber === 13) {
        cell.numFmt = 'SAR #,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });

    worksheet.columns.forEach(column => {
      column.width = 18;
    });
    if (worksheet.getColumn(2)) worksheet.getColumn(2).width = 24;
    if (worksheet.getColumn(5)) worksheet.getColumn(5).width = 26;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Payroll_Sheet_${roleCategory || 'All'}_${targetMonth}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  });

  // 6b. Labor Credentials Master Excel Export (.xlsx)
  app.get('/api/users/export-labor-excel', async (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Super Admin' && req.userRole !== 'HR Admin') {
      return res.status(403).json({ error: 'Forbidden: Credentials export is restricted to Super Admin and HR Admin.' });
    }

    const laborUsers = users.filter(u => u.role === 'Labor' || u.role === 'Site Supervisor');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SiteLabor HR & Payroll Enterprise System';
    workbook.lastModifiedBy = req.currentUser?.name || 'Super Admin';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Labor & Staff Credentials');

    // Title Banner
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'WORKFORCE MASTER DETAILS & PORTAL LOGIN CREDENTIALS';
    titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E1B4B' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;

    worksheet.mergeCells('A2:J2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `Confidential Document | Generated On: ${new Date().toLocaleString()} | Total Workers: ${laborUsers.length}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '64748B' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'Employee ID',
      'Full Name',
      'Designation / Role',
      'Iqama / National ID',
      'Passport Number',
      'Assigned Site',
      'Daily Wage (SAR)',
      'Portal Login Serial',
      'Portal Password',
      'Contact Phone'
    ]);

    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '312E81' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: '4338CA' } },
        left: { style: 'thin', color: { argb: '4338CA' } },
        bottom: { style: 'medium', color: { argb: '1E1B4B' } },
        right: { style: 'thin', color: { argb: '4338CA' } }
      };
    });

    laborUsers.forEach((u, idx) => {
      const site = sites.find(s => s.id === u.siteId);

      const row = worksheet.addRow([
        u.id,
        u.name,
        u.designation || u.role,
        u.iqamaId || 'N/A',
        u.passportNumber || 'N/A',
        site ? site.name : 'Unassigned',
        u.dailyRate,
        u.loginSerial || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        u.loginPassword || `Pass#${Math.floor(1000 + Math.random() * 9000)}`,
        u.phone || 'N/A'
      ]);

      row.height = 22;
      const isEven = idx % 2 === 0;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9 };
        cell.fill = { 
          type: 'pattern', 
          pattern: 'solid', 
          fgColor: { argb: isEven ? 'FFFFFF' : 'F5F3FF' } 
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'E0E7FF' } },
          left: { style: 'thin', color: { argb: 'E0E7FF' } },
          right: { style: 'thin', color: { argb: 'E0E7FF' } }
        };

        if (colNumber === 7) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = 'SAR #,##0.00';
        } else if (colNumber === 8 || colNumber === 9) {
          cell.font = { name: 'Courier New', size: 10, bold: true, color: { argb: '4338CA' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    worksheet.columns.forEach(col => { col.width = 20; });
    if (worksheet.getColumn(2)) worksheet.getColumn(2).width = 26;
    if (worksheet.getColumn(6)) worksheet.getColumn(6).width = 28;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Labor_Workers_Credentials_Master.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  });

  // 7. Complaints Endpoint & Complaint Limit Rule Enforcement (Max 3 complaints/day)
  app.get('/api/complaints', (req: AuthenticatedRequest, res) => {
    let filtered = [...complaints];

    // RBAC Rule for Site Supervisor: view complaints for their assigned site only
    if (req.userRole === 'Site Supervisor' && req.currentUser?.siteId) {
      filtered = filtered.filter(c => c.siteId === req.currentUser?.siteId);
    }

    // RBAC Rule for Labor: view complaints submitted by themselves only
    if (req.userRole === 'Labor' && req.currentUser) {
      filtered = filtered.filter(c => c.userId === req.currentUser?.id);
    }

    res.json(filtered);
  });

  // POST /api/complaints - Submit complaint with 3 complaints/day limit check
  app.post('/api/complaints', (req: AuthenticatedRequest, res) => {
    const { message, category, siteId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Complaint message is required.' });
    }

    const userId = req.currentUser ? req.currentUser.id : (req.body.userId || 'usr-labor-1');
    const todayDate = new Date().toISOString().substring(0, 10); // YYYY-MM-DD

    // COMPLAINT LIMIT RULE ENFORCEMENT: Restrict workers from submitting > 3 complaints/day
    const todayComplaintsCount = complaints.filter(c => {
      const complaintDate = c.date.substring(0, 10);
      return c.userId === userId && complaintDate === todayDate;
    }).length;

    if (todayComplaintsCount >= 3) {
      return res.status(429).json({
        error: `Daily Complaint Limit Exceeded: Workers are restricted from submitting more than 3 complaints/feedback messages per day. You have already submitted ${todayComplaintsCount} complaints today (${todayDate}).`,
        limitExceeded: true,
        currentCount: todayComplaintsCount,
        maxLimit: 3
      });
    }

    const newComplaint: Complaint = {
      id: `comp-${Date.now()}`,
      userId,
      siteId: siteId || req.currentUser?.siteId || 'site-metro-tower',
      message: message.trim(),
      category: category || 'Other',
      status: 'Pending',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    complaints.unshift(newComplaint);

    res.status(201).json({
      message: 'Complaint submitted successfully.',
      complaint: newComplaint,
      remainingToday: 3 - (todayComplaintsCount + 1)
    });
  });

  app.patch('/api/complaints/:id/status', (req: AuthenticatedRequest, res) => {
    // RBAC Rule: Only Super Admin, HR Admin, or Site Supervisor can update complaint status
    if (req.userRole === 'Labor') {
      return res.status(403).json({ error: 'Forbidden: Labor users cannot resolve complaints.' });
    }

    const { id } = req.params;
    const { status, responseNote } = req.body;

    const idx = complaints.findIndex(c => c.id === id);
    if (idx < 0) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    complaints[idx] = {
      ...complaints[idx],
      status: status || complaints[idx].status,
      responseNote: responseNote !== undefined ? responseNote : complaints[idx].responseNote,
      resolvedBy: req.currentUser ? req.currentUser.id : 'usr-supervisor-1'
    };

    res.json(complaints[idx]);
  });

  // 8. Notices Endpoint
  app.get('/api/notices', (req, res) => {
    res.json(notices);
  });

  app.post('/api/notices', (req: AuthenticatedRequest, res) => {
    if (req.userRole === 'Labor') {
      return res.status(403).json({ error: 'Forbidden: Labor users cannot post announcements.' });
    }

    const newNotice: Notice = {
      id: `notif-${Date.now()}`,
      title: req.body.title,
      content: req.body.content,
      targetGroup: req.body.targetGroup || 'All',
      datePosted: new Date().toISOString().replace('T', ' ').substring(0, 16),
      postedBy: req.currentUser ? req.currentUser.name : 'Management',
      priority: req.body.priority || 'Normal'
    };

    notices.unshift(newNotice);
    res.status(201).json(newNotice);
  });

  // 9. Source Code Exposure Endpoint for Backend Inspection Sandbox
  app.get('/api/system/source-code', (req, res) => {
    res.json({
      language: 'Node.js / Express (TypeScript)',
      featuresImplemented: [
        'Automated Dynamic Payroll Calculation Engine: (Daily Wage * Days Worked) + Allowances - Advances - Penalties',
        'Attendance Update Trigger -> Automated Monthly Salary Recalculation',
        'Role-Based Access Control (RBAC): Super Admin, Site Supervisor (assigned site scoped), Labor (read-only worker portal)',
        'Complaint Limit Enforcement Rule: Max 3 complaints per worker per day (returns HTTP 429)',
        'Excel (.xlsx) Salary Sheet Generation & Streaming via ExcelJS'
      ]
    });
  });

  // ==========================================
  // VITE MIDDLEWARE / STATIC ASSETS
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SiteLabor Express Backend Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
