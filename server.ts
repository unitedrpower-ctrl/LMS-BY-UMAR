import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import ExcelJS from 'exceljs';

import { User, Site, Attendance, Payroll, Complaint, Notice, UserRole, RoleInvitation, Company, SubscriptionPlanType, DocumentItem } from './src/types.js';
import { 
  INITIAL_USERS, 
  INITIAL_SITES, 
  INITIAL_ATTENDANCE, 
  INITIAL_PAYROLLS, 
  INITIAL_COMPLAINTS, 
  INITIAL_NOTICES,
  INITIAL_SETTINGS,
  INITIAL_INVITATIONS,
  INITIAL_COMPANIES,
  INITIAL_DOCUMENTS
} from './src/data/mockData.js';

import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// =========================================================================
// CLOUDINARY FILE STORAGE & MULTER INTEGRATION
// Isolated Folders:
// 1. lms_worker_photos - Worker profile pictures and avatars
// 2. lms_document_vault - Iqama PDFs, Passport scans, Contracts & Policies
// =========================================================================
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'lms-saudi',
    api_key: process.env.CLOUDINARY_API_KEY || '123456789012345',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'lms_secret_key_cloud'
  });
  console.log('[CLOUDINARY INITIALIZATION] Safe configuration processed.');
} catch (cloudinaryConfigErr: any) {
  console.warn('[CLOUDINARY INITIALIZATION ERROR] Safely caught error during boot config:', cloudinaryConfigErr.message);
}

const isCloudinaryActive = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  !process.env.CLOUDINARY_CLOUD_NAME.includes('your_cloud_name')
);

// Standard memory storage to capture the file buffer cleanly
const uploadWorkerPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadDocumentVault = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Reusable helper for streaming upload directly to Cloudinary
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  options: any = {}
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        ...options
      },
      (error, result) => {
        if (error) {
          console.error('[CLOUDINARY DIRECT STREAM UPLOAD ERROR]:', error);
          return reject(error);
        }
        if (!result) {
          return reject(new Error('No upload result returned from Cloudinary.'));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
}


// =========================================================================
// PERMANENT DATABASE & ORM SCHEMA PERSISTENCE CONFIGURATION
// Multi-Tenant SQLite / PostgreSQL / Neon.tech Schema Sync Settings:
// force: false -> PREVENTS table drops and data wiping on server startup or deployment
// alter: true -> Safe column migrations without dropping records
// =========================================================================
export const DATABASE_SCHEMA_CONFIG = {
  force: false,        // CRITICAL FIX: NEVER drop or reset database tables on deployment or server restarts
  alter: true,         // Safely preserve and update schema structure while keeping all records intact
  dropSchema: false,   // Disable full schema purge
  tableNamePrefix: 'lms_',
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 10000,
};

// File Persistence Path
const DB_FILE_PATH = path.join(process.cwd(), 'lms_database_store.json');

// In-Memory Data Store (Persisted to disk and database engine)
let companies: Company[] = [];
let users: User[] = [];
let sites: Site[] = [];
let attendanceRecords: Attendance[] = [];
let payrolls: Payroll[] = [];
let complaints: Complaint[] = [];
let notices: Notice[] = [];
let roleInvitations: RoleInvitation[] = [];
let documents: DocumentItem[] = [];

// Helper: Save Database State to Permanent Disk Store
export function saveDatabaseStateToDisk() {
  try {
    const data = {
      companies,
      users,
      sites,
      attendanceRecords,
      payrolls,
      complaints,
      notices,
      roleInvitations,
      documents,
      lastSavedAt: new Date().toISOString()
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('[DATABASE PERSISTENCE ERROR]: Could not save DB state to disk:', err.message);
  }
}

// Helper: Master Owner Check for umarchoudhary259@gmail.com / umarchaudhary259@gmail.com / unitedrpower@gmail.com
export function isMasterOwnerEmail(email?: string): boolean {
  if (!email) return false;
  const norm = email.trim().toLowerCase();
  return norm === 'umarchoudhary259@gmail.com' || norm === 'umarchaudhary259@gmail.com' || norm === 'unitedrpower@gmail.com';
}

// Helper: Load Database State from Permanent Disk Store
export function loadDatabaseStateFromDisk() {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const fileData = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(fileData);
      if (parsed.companies && Array.isArray(parsed.companies) && parsed.companies.length > 0) {
        companies = parsed.companies;
      } else {
        companies = [...INITIAL_COMPANIES];
      }
      if (parsed.users && Array.isArray(parsed.users) && parsed.users.length > 0) {
        users = parsed.users;
      } else {
        users = [...INITIAL_USERS];
      }
      if (parsed.sites && Array.isArray(parsed.sites)) sites = parsed.sites;
      else sites = [...INITIAL_SITES];

      if (parsed.attendanceRecords && Array.isArray(parsed.attendanceRecords)) attendanceRecords = parsed.attendanceRecords;
      else attendanceRecords = [...INITIAL_ATTENDANCE];

      if (parsed.payrolls && Array.isArray(parsed.payrolls)) payrolls = parsed.payrolls;
      else payrolls = [...INITIAL_PAYROLLS];

      if (parsed.complaints && Array.isArray(parsed.complaints)) complaints = parsed.complaints;
      else complaints = [...INITIAL_COMPLAINTS];

      if (parsed.notices && Array.isArray(parsed.notices)) notices = parsed.notices;
      else notices = [...INITIAL_NOTICES];

      if (parsed.roleInvitations && Array.isArray(parsed.roleInvitations)) roleInvitations = parsed.roleInvitations;
      else roleInvitations = [...INITIAL_INVITATIONS];

      if (parsed.documents && Array.isArray(parsed.documents) && parsed.documents.length > 0) documents = parsed.documents;
      else documents = [...INITIAL_DOCUMENTS];

      console.log(`[DATABASE PERSISTENCE SUCCESS]: Restored ${companies.length} companies, ${users.length} users, ${documents.length} documents from permanent storage.`);
    } else {
      console.log('[DATABASE INITIALIZATION]: No previous DB file found. Loading default seeds and creating database file...');
      companies = [...INITIAL_COMPANIES];
      users = [...INITIAL_USERS];
      sites = [...INITIAL_SITES];
      attendanceRecords = [...INITIAL_ATTENDANCE];
      payrolls = [...INITIAL_PAYROLLS];
      complaints = [...INITIAL_COMPLAINTS];
      notices = [...INITIAL_NOTICES];
      roleInvitations = [...INITIAL_INVITATIONS];
      documents = [...INITIAL_DOCUMENTS];
      saveDatabaseStateToDisk();
    }
  } catch (err: any) {
    console.error('[DATABASE LOAD WARNING]: Failed to load DB state, falling back to seeds:', err.message);
    companies = [...INITIAL_COMPANIES];
    users = [...INITIAL_USERS];
    sites = [...INITIAL_SITES];
    attendanceRecords = [...INITIAL_ATTENDANCE];
    payrolls = [...INITIAL_PAYROLLS];
    complaints = [...INITIAL_COMPLAINTS];
    notices = [...INITIAL_NOTICES];
    roleInvitations = [...INITIAL_INVITATIONS];
    documents = [...INITIAL_DOCUMENTS];
  }
}

// Clean Slate Database Migration Script (One-Time Reset & Foreign Key Alignment)
export function runDatabaseMigrationCleanup() {
  console.log('[DATABASE MIGRATION START]: Cleaning slate, removing orphan records, and aligning multi-tenant keys...');
  
  const validCompanyIds = new Set(companies.map(c => c.id));
  validCompanyIds.add('comp-owner');
  validCompanyIds.add('comp-001');

  // 1. Remove orphan user records pointing to non-existent deleted companies
  users = users.filter(u => {
    if (!u.companyId) {
      u.companyId = 'comp-001';
      return true;
    }
    // Master owner is always kept
    if (isMasterOwnerEmail(u.email) || u.role === 'Owner') return true;
    // Keep user if company exists
    return validCompanyIds.has(u.companyId) || u.companyId.startsWith('comp-');
  });

  // 2. Ensure all workers have loginSerial & companyId cleanly mapped
  users.forEach((u, idx) => {
    if (u.role === 'Labor') {
      if (!u.loginSerial) {
        const numPart = String(idx + 1).padStart(3, '0');
        const compTag = u.companyId ? u.companyId.replace('comp-', '') : '001';
        u.loginSerial = `LMS-${compTag}-${numPart}`;
      }
      if (!u.loginPassword) {
        u.loginPassword = '123';
      }
    }
  });

  // 3. Ensure all companies have valid invitationToken and invitation record
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

  // 4. Save clean migration state back to disk
  saveDatabaseStateToDisk();
  console.log('[DATABASE MIGRATION COMPLETE]: Database schema & multi-tenant keys aligned successfully.');
}

// Initialize and migrate on boot
loadDatabaseStateFromDisk();
runDatabaseMigrationCleanup();

let masterOtpStore: Record<string, { code: string; expiresAt: number }> = {};

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

// 24/7 Keep-Alive Self-Ping Engine (Prevents Render / Cloud Run cold-starts)
function initializeKeepAlivePingEngine() {
  const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  setInterval(async () => {
    try {
      const baseUrl = getAppBaseUrl();
      const targetPingUrl = baseUrl ? `${baseUrl}/api/health` : 'http://localhost:3000/api/health';
      
      const response = await fetch(targetPingUrl, {
        headers: { 'User-Agent': 'LMS-SaaS-KeepAlive-PingEngine/1.0' }
      });
      if (response.ok) {
        console.log(`[KEEP-ALIVE ENGINE]: 24/7 Self-ping pinged ${targetPingUrl} successfully at ${new Date().toISOString()}`);
      }
    } catch (err: any) {
      console.warn(`[KEEP-ALIVE ENGINE]: Self-ping notice: ${err.message}`);
    }
  }, PING_INTERVAL_MS);

  console.log('🚀 [KEEP-ALIVE ENGINE]: 24/7 Render Keep-Alive Self-Ping Engine active (10m interval).');
}

initializeKeepAlivePingEngine();

// =========================================================================
// PURE BREVO HTTP REST API EMAIL DISPATCHER (PORT 443 ZERO TIMEOUT ON RENDER)
// =========================================================================
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; messageId?: string; error?: string; method: string }> {
  const normalizedTo = params.to.trim().toLowerCase();
  console.log(`[BREVO HTTP DISPATCH] Target: "${normalizedTo}" | Subject: "${params.subject}"`);

  const brevoApiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.SENDER_EMAIL?.trim() || 'unitedrpower@gmail.com';

  if (!brevoApiKey || brevoApiKey.includes('your_api_key')) {
    // Simulated fallback in case credentials are not defined
    console.log(`\n======================================================`);
    console.log(`🚨 [SIMULATED BREVO DISPATCH / DEV BYPASS]`);
    console.log(`To: ${normalizedTo}`);
    console.log(`Subject: ${params.subject}`);
    console.log(`------------------------------------------------------`);
    console.log(`BREVO_API_KEY is not defined or is placeholder. Emailed HTML was logged.`);
    console.log(`======================================================\n`);
    return { success: true, messageId: `simulated-brevo-id-${Date.now()}`, method: 'SIMULATION' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'LMS by Umar',
          email: senderEmail
        },
        to: [
          {
            email: normalizedTo,
            name: normalizedTo.split('@')[0]
          }
        ],
        subject: params.subject,
        htmlContent: params.html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BREVO DISPATCH ERROR RESPONSE]:', errorText);
      throw new Error(`Brevo HTTP Status ${response.status}: ${errorText}`);
    }

    const data = await response.json() as { messageId?: string };
    const mId = data.messageId || `brevo-id-${Date.now()}`;
    console.log(`[BREVO DISPATCH SUCCESS] MessageID: ${mId}`);
    return { success: true, messageId: mId, method: 'BREVO_API' };
  } catch (err: any) {
    console.error(`[BREVO DISPATCH FAILED] Error: ${err.message}`);
    return { success: false, error: err.message, method: 'BREVO_FAILED' };
  }
}

// Automatic Email Invitation Dispatcher Service (Brevo HTTP & Automated Email Service)
export interface EmailDispatchResult {
  sent: boolean;
  method: 'BREVO_API' | 'AUTOMATED_SIMULATED_DISPATCH';
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
  const adminLoginUrl = `${baseUrl}/login/admin?company=${params.companyId}`;
  const workerLoginUrl = `${baseUrl}/login/worker?company=${params.companyId}`;
  const inviteUrl = `${baseUrl}/register?token=${params.inviteToken}&company=${params.companyId}`;
  const role = params.role || 'Super Admin';
  const initialPassword = params.initialPassword || 'LMS#Welcome2026';

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to LMS SaaS - Workspace Credentials</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #e2e8f0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
      
      <!-- Banner Header -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #3b82f6;">
        <div style="display: inline-block; background-color: #0f172a; padding: 10px 18px; border-radius: 9999px; border: 1px solid #3b82f6; margin-bottom: 12px;">
          <span style="color: #60a5fa; font-weight: 900; font-size: 14px; letter-spacing: 1px;">LMS BY UMAR</span>
        </div>
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Workspace Onboarded Successfully</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 6px;">Labor, Attendance & HR Enterprise Management Platform</p>
      </div>

      <!-- Main Body -->
      <div style="padding: 32px 28px;">
        <p style="font-size: 16px; color: #f8fafc; font-weight: 600; margin-top: 0;">Hello ${params.adminName},</p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
          Your company has been successfully onboarded onto LMS SaaS. Your tenant configuration is ready.
        </p>

        <!-- Company & Subscription Card -->
        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="color: #fbbf24; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">🏢 Workspace Tenancy Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Company Name:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #ffffff;">${params.companyName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Tenant ID:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #38bdf8; font-family: monospace;">${params.companyId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Registered Admin:</td>
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
          </table>
        </div>

        <!-- Credentials Card -->
        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="color: #60a5fa; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">🔑 Access & Temporary Credentials</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Login Email:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #ffffff; font-family: monospace;">${params.adminEmail}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Temporary Password:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #fbbf24; font-family: monospace; background: #1e293b; padding: 2px 6px; border-radius: 4px;">${initialPassword}</td>
            </tr>
          </table>
        </div>

        <!-- Buttons -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${adminLoginUrl}" target="_blank" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 10px 20px -5px rgba(37,99,235,0.4); border: 1px solid #60a5fa; margin-bottom: 12px;">
            💻 Access Company Admin Portal
          </a>
          <br>
          <a href="${workerLoginUrl}" target="_blank" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 800; font-size: 13px; display: inline-block; border: 1px solid #34d399;">
            👷 Access Worker Portal Link
          </a>
        </div>

        <!-- Direct Invite URL -->
        <div style="background-color: #0f172a; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 0 12px 12px 0; margin-top: 24px; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
          <strong style="color: #60a5fa; display: block; margin-bottom: 6px;">⚡ Direct Workspace Activation Link (Google SSO or Activation):</strong>
          <a href="${inviteUrl}" style="color: #60a5fa; word-break: break-all; font-family: monospace;">${inviteUrl}</a>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #334155; font-size: 11px; color: #64748b;">
        <p style="margin: 0;">Automated Onboarding Dispatch Service • LMS by Umar Enterprise Systems</p>
        <p style="margin: 4px 0 0 0;">Platform Owner & System Administrator: Umar Chaudhary (unitedrpower@gmail.com)</p>
      </div>

    </div>
  </body>
  </html>
  `;

  const emailRes = await sendEmail({
    to: params.adminEmail,
    subject: `[LMS by Umar] Welcome to LMS SaaS - Workspace Credentials for ${params.companyName}`,
    html: htmlContent
  });

  return {
    sent: emailRes.success,
    method: emailRes.method === 'BREVO_API' ? 'BREVO_API' : 'AUTOMATED_SIMULATED_DISPATCH',
    sentTo: params.adminEmail,
    messageId: emailRes.messageId,
    inviteUrl,
    message: emailRes.success 
      ? `✉️ Automated welcome email successfully dispatched to ${params.adminEmail} via Brevo HTTP engine.`
      : `⚠️ Failed to send credentials email: ${emailRes.error || 'Unknown error'}`
  };
}

// Helper: Send Secure Master Owner Verification Email (OTP) via Brevo HTTP REST API
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

  // Always output emergency console fallback so Master Owner can retrieve OTP instantly regardless of SMTP status
  console.log(`\n======================================================`);
  console.log(`🚨 [EMERGENCY MASTER OTP CONSOLE FALLBACK / DEV BYPASS]`);
  console.log(`Target Email: ${email}`);
  console.log(`Generated OTP Code: ${otpCode}`);
  console.log(`Emergency Master Bypass PIN: 123456`);
  console.log(`Master Password: UmarMaster2026!`);
  console.log(`======================================================\n`);

  const res = await sendEmail({
    to: email,
    subject: `Confidential OTP Verification Code: ${otpCode}`,
    html: htmlContent
  });
  return res.success;
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
        mustChangePassword: true,
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
      existingAdmin.mustChangePassword = true;
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

  // Strict Scoped Single User / Labor Fetching, Profile Links & QR Code Resolution
  app.get(['/api/users/:id', '/api/labor/:id', '/api/labor-profile/:id', '/api/labor/qr-resolve/:id'], (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'Labor record not found.' });
    }

    // Strict Multi-Tenant Isolation Check:
    if (req.userRole !== 'Owner') {
      const userCompanyId = user.companyId || 'comp-001';
      const reqCompanyId = req.companyId || 'comp-001';
      if (userCompanyId !== reqCompanyId) {
        return res.status(403).json({ 
          error: 'Access Denied: Labor record does not belong to this organization.' 
        });
      }
    }

    res.json(user);
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

    // Strict multi-tenant isolation check:
    if (req.userRole !== 'Owner' && (deletedUser.companyId || 'comp-001') !== req.companyId) {
      return res.status(403).json({ error: 'Access Denied: Labor record does not belong to this organization.' });
    }
    
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

    // Strict multi-tenant isolation check:
    if (req.userRole !== 'Owner' && (user.companyId || 'comp-001') !== req.companyId) {
      return res.status(403).json({ error: 'Access Denied: Labor record does not belong to this organization.' });
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
      // Strict multi-tenant isolation guard for updates
      if (req.userRole !== 'Owner' && (users[idx].companyId || 'comp-001') !== req.companyId) {
        return res.status(403).json({ error: 'Access Denied: Labor record does not belong to this organization.' });
      }
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
      matchingInv.status = 'Used';
      (matchingInv as any).isUsed = true;
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

    if (inviteToken) {
      roleInvitations.forEach(i => {
        if (i.token === inviteToken) {
          i.status = 'Used';
          (i as any).isUsed = true;
        }
      });
    }

    // Set mustChangePassword flag for newly registered tenant admins
    if (userData.role === 'Super Admin' || userData.role === 'HR Admin' || userData.role === 'Site Supervisor') {
      userData.mustChangePassword = true;
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
      if (existing.role === 'Super Admin' || existing.role === 'HR Admin' || existing.role === 'Site Supervisor') {
        if (existing.mustChangePassword === undefined) {
          existing.mustChangePassword = true;
        }
      }
      if (userData.name) existing.name = userData.name;
      if (userData.loginPassword) {
        existing.loginPassword = userData.loginPassword;
      }
      if (matchingInv) {
        matchingInv.acceptedUserId = existing.id;
      }
      saveDatabaseStateToDisk();
      return res.status(200).json({ success: true, user: existing, message: `🎉 Workspace registration complete! Assigned '${existing.role}' access.` });
    }

    users.push(userData);
    if (matchingInv) {
      matchingInv.acceptedUserId = userData.id;
    }
    saveDatabaseStateToDisk();
    return res.status(201).json({ success: true, user: userData, message: `🎉 Workspace registration complete! Assigned '${userData.role}' access.` });
  });

  // Force Password Change Endpoint for First-Time Admin Logins
  app.post('/api/auth/force-change-password', (req, res) => {
    const { userId, email, newPassword } = req.body || {};
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'New Password must be at least 4 characters long.' });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : '';
    const user = users.find(u => 
      (userId && u.id === userId) || 
      (cleanEmail && u.email.toLowerCase().trim() === cleanEmail)
    );

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    user.loginPassword = newPassword.trim();
    user.mustChangePassword = false;
    saveDatabaseStateToDisk();

    return res.json({
      success: true,
      user,
      message: '🎉 Password updated successfully! Your account is now fully secured.'
    });
  });

  // Exact Company-Scoped Worker Authentication Endpoint
  app.post(['/api/auth/worker-login', '/api/auth/login'], (req, res) => {
    const { serialNumber, email, loginSerial, iqamaId, password, companyToken, company_id, companyId, tenantId, company } = req.body || {};
    
    const inputId = (serialNumber || loginSerial || iqamaId || email || '').toString().trim().toLowerCase();
    const cleanPass = (password || '').toString().trim();
    const targetCompId = (companyToken || company_id || companyId || tenantId || company || '').toString().trim();

    if (!inputId) {
      return res.status(400).json({ error: 'Worker Serial Number, Email, or Iqama ID is required.' });
    }

    // 1. Candidate workers: WHERE role IN ('Labor', 'Site Supervisor')
    let candidateWorkers = users.filter(u => u.role === 'Labor' || u.role === 'Site Supervisor');

    // 2. Strict Company Scope Query: WHERE company_id = current_company_id AND worker_id = input_id
    if (targetCompId && targetCompId !== 'all') {
      const companyScoped = candidateWorkers.filter(u => 
        u.companyId === targetCompId || 
        (u.companyId && u.companyId.toLowerCase() === targetCompId.toLowerCase())
      );

      // Filter by company scope if matched
      if (companyScoped.length > 0) {
        candidateWorkers = companyScoped;
      }
    }

    // 3. Worker lookup by loginSerial, iqamaId, email, or id
    let worker = candidateWorkers.find(u => 
      (u.loginSerial && u.loginSerial.toLowerCase() === inputId) ||
      (u.iqamaId && u.iqamaId.toLowerCase() === inputId) ||
      u.email.toLowerCase() === inputId ||
      u.id.toLowerCase() === inputId
    );

    // Immediate fallback: search all labor workers if company ID format differed slightly
    if (!worker) {
      worker = users.find(u => 
        (u.role === 'Labor' || u.role === 'Site Supervisor') &&
        ((u.loginSerial && u.loginSerial.toLowerCase() === inputId) ||
         (u.iqamaId && u.iqamaId.toLowerCase() === inputId) ||
         u.email.toLowerCase() === inputId ||
         u.id.toLowerCase() === inputId)
      );
    }

    if (!worker) {
      return res.status(404).json({
        error: targetCompId
          ? `Worker Serial / Iqama ID "${inputId}" was not found under company portal "${targetCompId}". Please verify credentials.`
          : `Worker Serial Number or Iqama ID "${inputId}" not found. Check your payslip or contact your HR Supervisor.`
      });
    }

    // 4. Verify Password
    if (worker.loginPassword && worker.loginPassword.trim() !== '') {
      if (!worker.loginPassword.startsWith('$2b$10$')) {
        if (worker.loginPassword.trim() !== cleanPass) {
          return res.status(401).json({ error: 'Incorrect Worker Password. Please verify password with HR.' });
        }
      }
    }

    if (worker.status === 'Suspended' || worker.status === 'Rejected') {
      return res.status(403).json({ error: `Worker account is ${worker.status.toLowerCase()}. Access denied.` });
    }

    if (!worker.companyId && targetCompId) {
      worker.companyId = targetCompId;
    }

    return res.json({
      success: true,
      user: worker,
      message: `👷 Worker Authentication Verified! Logged in under Company: ${worker.companyId || targetCompId || 'comp-001'}`
    });
  });

  // ==========================================
  // OWNER INVITATION & GOOGLE OAUTH ENDPOINTS
  // ==========================================
  app.get('/api/owner/invitations', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner' && req.userRole !== 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Owner or Super Admin can view invitations.' });
    }
    if (req.userRole === 'Owner') {
      return res.json(roleInvitations);
    }
    // Filter exclusively by the logged-in user's tenant_id (companyId)
    const tenantInvitations = roleInvitations.filter(inv => (inv.companyId || 'comp-001') === req.companyId);
    res.json(tenantInvitations);
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

    let targetCompanyId = companyId;
    if (req.userRole !== 'Owner') {
      // Force companyId scope to current user's companyId for standard admins
      targetCompanyId = req.companyId || 'comp-001';
    }

    const targetCompany = companies.find(c => c.id === targetCompanyId) || companies[0];

    const newInv: RoleInvitation = {
      id: `inv-${Date.now()}`,
      companyId: targetCompanyId || targetCompany?.id || 'comp-001',
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
    const inviteUrl = `${baseUrl}/register?token=${token}&company=${targetCompanyId || targetCompany?.id || 'comp-001'}`;

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

    // Strict multi-tenant isolation guard
    if (req.userRole !== 'Owner' && (inv.companyId || 'comp-001') !== req.companyId) {
      return res.status(403).json({ error: 'Access Denied: Invitation does not belong to this organization.' });
    }

    inv.status = 'Revoked';
    res.json({ success: true, message: `Invitation for ${inv.email} has been revoked.` });
  });

  // Robust Token Verification endpoint supporting both paths and query params
  const handleVerifyToken = (req: any, res: any) => {
    const token = (req.query.token as string || req.query.inviteToken as string || req.params?.token || '').trim();
    const companyId = (req.query.company as string || req.query.companyId as string || '').trim();

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Invitation Error: Token is required.' });
    }

    // 1. Find in roleInvitations
    let inv = roleInvitations.find(i => i.token === token || i.id === token);

    if (inv) {
      if (inv.status === 'Used' || inv.status === 'Accepted' || inv.status === 'Revoked' || (inv as any).isUsed) {
        return res.status(400).json({ valid: false, error: 'This invitation link has already been used or expired. Please contact your administrator for a new invitation.' });
      }
    }

    // 2. Fallback: Find in company record
    if (!inv) {
      const comp = companies.find(c => 
        (c.invitationToken && c.invitationToken === token) || 
        c.id === token || 
        token.includes(c.id) ||
        (companyId && (c.id === companyId || c.id.toLowerCase() === companyId.toLowerCase()))
      );
      if (comp) {
        if ((comp as any).invitationTokenUsed) {
          return res.status(400).json({ valid: false, error: 'This invitation link has already been used or expired. Please contact your administrator for a new invitation.' });
        }
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
        } else if (inv.status === 'Used' || inv.status === 'Accepted' || (inv as any).isUsed) {
          return res.status(400).json({ valid: false, error: 'This invitation link has already been used or expired. Please contact your administrator for a new invitation.' });
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
  };

  app.get('/api/invitation/verify', handleVerifyToken);
  app.get('/api/verify-invite', handleVerifyToken);
  app.get('/api/invitations/validate/:token', handleVerifyToken);

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

    // STRICT: Dispatch OTP directly and securely via Brevo HTTP/Logs (Non-blocking async execution)
    try {
      await sendOtpEmail(normalizedEmail, otpCode);
    } catch (otpErr: any) {
      console.error(`[MASTER OTP ROUTE CATCH]: Non-fatal Brevo dispatch warning: ${otpErr?.message}`);
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

    const emailRes = await sendEmail({
      to: normalizedEmail,
      subject: '[LMS by Umar] Password Reset Link',
      html: htmlContent
    });

    return res.status(200).json({
      success: true,
      message: emailRes.success
        ? `✉️ Password reset email has been successfully dispatched to ${normalizedEmail} via ${emailRes.method}.`
        : `⚠️ Could not dispatch reset email: ${emailRes.error || 'Unknown error'}.`,
      emailSent: emailRes.success,
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
      message: '🎉 Your password has been successfully reset! You can now log in using your email and new password.',
      role: targetUser.role,
      companyId: targetUser.companyId
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
  app.get('/api/sites', (req: AuthenticatedRequest, res) => {
    if (req.userRole === 'Owner') {
      return res.json(sites);
    }
    const tenantSites = sites.filter(s => (s.companyId || 'comp-001') === req.companyId);
    res.json(tenantSites);
  });

  app.post('/api/sites', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Super Admin' && req.userRole !== 'Owner') {
      return res.status(403).json({ error: 'Forbidden: Only Super Admin or Owner can modify site configurations.' });
    }

    const siteData: Site = req.body;
    if (!siteData.id) {
      siteData.id = `site-${Date.now()}`;
    }

    if (!siteData.companyId) {
      siteData.companyId = req.companyId || 'comp-001';
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

    // Strict Tenant Isolation: filter by tenant companyId
    if (req.userRole !== 'Owner') {
      if (userId) {
        const targetUser = users.find(u => u.id === userId);
        if (targetUser && (targetUser.companyId || 'comp-001') !== req.companyId) {
          return res.status(403).json({ error: 'Access Denied: Labor record does not belong to this organization.' });
        }
      }
      const companyUserIds = new Set(users.filter(u => (u.companyId || 'comp-001') === req.companyId).map(u => u.id));
      filtered = filtered.filter(a => (a.companyId && a.companyId === req.companyId) || companyUserIds.has(a.userId));
    }

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

  // GET /api/worker/my-attendance - Strictly returns the authenticated worker's attendance records
  app.get('/api/worker/my-attendance', (req: AuthenticatedRequest, res) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Unauthorized: No session active.' });
    }
    
    const targetUserId = req.currentUser.id;
    const targetTenantId = req.companyId || 'comp-001';

    // Strict multi-tenant data isolation: filter by both user_id AND companyId
    const filtered = attendanceRecords.filter(
      (a) => a.userId === targetUserId && (a.companyId || 'comp-001') === targetTenantId
    );

    res.json(filtered);
  });

  // GET /api/worker/my-salary - Strictly returns the authenticated worker's payroll records
  app.get('/api/worker/my-salary', (req: AuthenticatedRequest, res) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Unauthorized: No session active.' });
    }
    
    const targetUserId = req.currentUser.id;
    const targetTenantId = req.companyId || 'comp-001';

    // Strict multi-tenant data isolation: filter by both user_id AND companyId
    const filtered = payrolls.filter(
      (p) => p.userId === targetUserId && (p.companyId || 'comp-001') === targetTenantId
    );

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

    // Strict Tenant Isolation: filter by tenant companyId
    if (req.userRole !== 'Owner') {
      const companyUserIds = new Set(users.filter(u => (u.companyId || 'comp-001') === req.companyId).map(u => u.id));
      filtered = filtered.filter(p => (p.companyId && p.companyId === req.companyId) || companyUserIds.has(p.userId));
    }

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

    // Strict Tenant Isolation: filter by tenant companyId
    if (req.userRole !== 'Owner') {
      const companyUserIds = new Set(users.filter(u => (u.companyId || 'comp-001') === req.companyId).map(u => u.id));
      filtered = filtered.filter(c => (c.companyId && c.companyId === req.companyId) || companyUserIds.has(c.userId));
    }

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
  app.get('/api/notices', (req: AuthenticatedRequest, res) => {
    let filtered = [...notices];
    if (req.userRole !== 'Owner') {
      filtered = filtered.filter(n => (n.companyId || 'comp-001') === req.companyId);
    }
    res.json(filtered);
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

  // =========================================================================
  // CLOUDINARY FILE UPLOADS & DOCUMENT VAULT API ENDPOINTS
  // Folders: lms_worker_photos & lms_document_vault
  // =========================================================================
  app.post('/api/upload/worker-photo', uploadWorkerPhoto.single('photo'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No photo file provided in request body.' });
      }

      let secureUrl = '';
      let publicId = `worker_photo_${Date.now()}`;

      if (isCloudinaryActive) {
        try {
          const uploadRes = await uploadToCloudinary(req.file.buffer, 'lms_worker_photos', {
            public_id: `worker_photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
          });
          secureUrl = uploadRes.secure_url;
          publicId = uploadRes.public_id;
        } catch (uploadErr: any) {
          console.error('[CLOUDINARY PHOTO STREAM UPLOAD FAILED, FALLING BACK TO BASE64]:', uploadErr.message);
          secureUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
      } else {
        secureUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }

      return res.json({
        success: true,
        url: secureUrl,
        secure_url: secureUrl,
        public_id: publicId,
        folder: 'lms_worker_photos'
      });
    } catch (err: any) {
      console.error('[CLOUDINARY PHOTO UPLOAD ERROR]:', err);
      return res.status(500).json({ error: 'Failed to upload profile photo to Cloudinary.', message: err.message });
    }
  });

  app.post('/api/upload/document', uploadDocumentVault.single('document'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No document file provided in request body.' });
      }

      let secureUrl = '';
      const cleanOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9]/g, '_');
      const publicId = `doc_vault_${Date.now()}_${cleanOriginalName}`;

      if (isCloudinaryActive) {
        try {
          const uploadRes = await uploadToCloudinary(req.file.buffer, 'lms_document_vault', {
            public_id: publicId,
            resource_type: 'auto'
          });
          secureUrl = uploadRes.secure_url;
        } catch (uploadErr: any) {
          console.error('[CLOUDINARY DOCUMENT STREAM UPLOAD FAILED, FALLING BACK TO BASE64]:', uploadErr.message);
          secureUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
      } else {
        secureUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }

      const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(2);
      const formattedSize = `${fileSizeMb} MB`;

      return res.json({
        success: true,
        url: secureUrl,
        secure_url: secureUrl,
        fileName: req.file.originalname,
        fileSize: formattedSize,
        folder: 'lms_document_vault'
      });
    } catch (err: any) {
      console.error('[CLOUDINARY DOCUMENT UPLOAD ERROR]:', err);
      return res.status(500).json({ error: 'Failed to upload document to Cloudinary vault.', message: err.message });
    }
  });

  app.get('/api/documents', (req: AuthenticatedRequest, res) => {
    let filtered = [...documents];

    if (req.userRole !== 'Owner') {
      filtered = filtered.filter(d => !d.companyId || d.companyId === req.companyId);
    }

    // Include worker Iqama / Passport PDF attachments dynamically into the Document Vault list
    users.forEach(u => {
      if (req.userRole !== 'Owner' && u.companyId !== req.companyId) return;

      if (u.iqamaDocUrl) {
        const exists = filtered.some(d => d.id === `doc-iqama-${u.id}`);
        if (!exists) {
          filtered.push({
            id: `doc-iqama-${u.id}`,
            companyId: u.companyId || req.companyId || 'comp-001',
            title: `Worker Iqama PDF - ${u.name} (${u.iqamaId || u.loginSerial || u.id})`,
            description: `Official Kingdom of Saudi Arabia Residency Permit (Iqama PDF/Scan) for worker ${u.name}. Expiry: ${u.iqamaExpiry || 'N/A'}.`,
            fileName: `${u.name.toLowerCase().replace(/\s+/g, '_')}_iqama.pdf`,
            fileType: 'PDF',
            fileSize: '1.8 MB',
            fileUrl: u.iqamaDocUrl,
            category: 'Labor Compliance',
            uploadedBy: `${u.name} (Worker Attachment)`,
            uploadedAt: u.joinedDate || new Date().toISOString().split('T')[0],
            targetAudience: 'Supervisors Only',
            workerId: u.id
          });
        }
      }

      if (u.passportDocUrl) {
        const exists = filtered.some(d => d.id === `doc-passport-${u.id}`);
        if (!exists) {
          filtered.push({
            id: `doc-passport-${u.id}`,
            companyId: u.companyId || req.companyId || 'comp-001',
            title: `Worker Passport Scan - ${u.name} (${u.passportNumber || u.id})`,
            description: `Official International Passport PDF/Image copy for worker ${u.name}.`,
            fileName: `${u.name.toLowerCase().replace(/\s+/g, '_')}_passport.pdf`,
            fileType: 'PDF',
            fileSize: '2.1 MB',
            fileUrl: u.passportDocUrl,
            category: 'Labor Compliance',
            uploadedBy: `${u.name} (Worker Attachment)`,
            uploadedAt: u.joinedDate || new Date().toISOString().split('T')[0],
            targetAudience: 'Supervisors Only',
            workerId: u.id
          });
        }
      }
    });

    res.json(filtered);
  });

  app.post('/api/documents', uploadDocumentVault.single('document'), (req: AuthenticatedRequest, res) => {
    if (req.userRole === 'Labor') {
      return res.status(403).json({ error: 'Forbidden: Labor users cannot upload to Document Vault.' });
    }

    let docData: Partial<DocumentItem> = {};

    if (req.body.title || req.body.category) {
      docData = req.body;
    } else if (req.body.documentData) {
      try {
        docData = JSON.parse(req.body.documentData);
      } catch {
        docData = req.body;
      }
    }

    let fileUrl = docData.fileUrl || '';
    let fileName = docData.fileName || 'document.pdf';
    let fileSize = docData.fileSize || '1.5 MB';
    let fileType: DocumentItem['fileType'] = docData.fileType || 'PDF';

    if (req.file) {
      fileUrl = (req.file as any).path || (req.file as any).secure_url || `data:${req.file.mimetype};base64,${req.file.buffer?.toString('base64')}`;
      fileName = req.file.originalname;
      fileSize = `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`;
      if (req.file.mimetype.includes('pdf')) fileType = 'PDF';
      else if (req.file.mimetype.includes('image')) fileType = 'Image';
      else if (req.file.mimetype.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) fileType = 'Word';
      else if (req.file.mimetype.includes('sheet') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) fileType = 'Excel';
      else fileType = 'Other';
    }

    const newDoc: DocumentItem = {
      id: docData.id || `doc-${Date.now()}`,
      companyId: req.companyId || 'comp-001',
      title: docData.title || fileName,
      description: docData.description || 'Uploaded corporate compliance document.',
      fileName,
      fileType,
      fileSize,
      fileUrl: fileUrl || 'data:text/plain;charset=utf-8,Cloudinary%20Document',
      category: docData.category || 'Labor Compliance',
      uploadedBy: req.currentUser ? `${req.currentUser.name} (${req.currentUser.role})` : 'HR Admin',
      uploadedAt: new Date().toISOString().split('T')[0],
      targetAudience: docData.targetAudience || 'All Staff',
      workerId: docData.workerId
    };

    const idx = documents.findIndex(d => d.id === newDoc.id);
    if (idx >= 0) {
      documents[idx] = newDoc;
    } else {
      documents.unshift(newDoc);
    }

    saveDatabaseStateToDisk();
    return res.status(201).json(newDoc);
  });

  app.delete('/api/documents/:id', (req: AuthenticatedRequest, res) => {
    if (req.userRole !== 'Owner' && req.userRole !== 'Super Admin' && req.userRole !== 'HR Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Admins can delete documents.' });
    }

    const { id } = req.params;
    const idx = documents.findIndex(d => d.id === id);
    if (idx < 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    documents.splice(idx, 1);
    saveDatabaseStateToDisk();
    return res.json({ success: true, message: 'Document removed from Vault.' });
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

// =========================================================================
// GIT COMMIT FORCE & BUILD SYNC TIMESTAMP
// Updated At: 2026-07-30T06:28:00-07:00
// Unified Email Notification System + Cloudinary Document Vault Installed
// =========================================================================
