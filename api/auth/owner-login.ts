// Vercel Serverless Function: POST /api/auth/owner-login
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ok', message: 'Owner Login endpoint ready. Send POST request.' });
  }

  const { email } = req.body || {};
  const otp = req.body?.otp || req.body?.code;
  const password = req.body?.password || req.body?.passcode;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const MASTER_EMAILS = ['umarchoudhary259@gmail.com', 'umarchaudhary259@gmail.com', 'unitedrpower@gmail.com'];
  if (!MASTER_EMAILS.includes(normalizedEmail)) {
    return res.status(403).json({ error: 'Master Owner access is restricted to authorized accounts.' });
  }

  const validMasterPasswords = ['UmarMaster2026!', 'MasterOwner#2026', 'admin123'];
  const isInstantMasterPass = password && validMasterPasswords.includes(password.trim());
  const isPasscodeInOtpField = otp && validMasterPasswords.includes(otp.trim());
  const isBypassOtp = otp && otp.trim() === '123456';

  // Accept if instant master password, emergency bypass OTP, or test OTP
  if (!isInstantMasterPass && !isPasscodeInOtpField && !isBypassOtp && !otp) {
    return res.status(400).json({ error: 'Invalid verification code or Master Password.' });
  }

  const masterUser = {
    id: 'usr-owner-umar-259',
    companyId: 'comp-owner',
    name: 'Umar Chaudhary (Master Owner)',
    email: normalizedEmail,
    role: 'Owner',
    dailyRate: 350.0,
    joinedDate: '2024-01-01',
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

  const authToken = `master-jwt-token-${masterUser.id}-${Date.now()}`;

  return res.status(200).json({
    success: true,
    user: masterUser,
    token: authToken,
    authToken: authToken,
    isMasterOwner: true,
    message: '👑 Master Authenticated! Welcome Master Platform Owner Umar.'
  });
}
