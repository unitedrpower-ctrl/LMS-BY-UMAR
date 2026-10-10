export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token, x-user-id, x-user-role');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ok', endpoint: '/api/auth/admin-login', allowedMethods: ['POST'] });
  }

  const { email, loginSerial, emailOrSerial, username, password } = req.body || {};
  const inputIdentifier = (email || loginSerial || emailOrSerial || username || '').toString().trim().toLowerCase();
  const inputPassword = (password || '').toString().trim();

  if (!inputIdentifier) {
    return res.status(400).json({ error: 'Email Address or Login Serial is required.' });
  }

  const staff = [
    {
      id: 'usr-admin-umar',
      name: 'Umar Chaudhary (Super Admin)',
      email: 'unitedrpower@gmail.com',
      role: 'Super Admin',
      dailyRate: 350.0,
      loginSerial: 'ADMIN-01',
      loginPassword: 'admin123',
      status: 'Active',
      designation: 'Managing Director & System Administrator',
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
      name: 'Khalid Al-Mansoor',
      email: 'hr@lms.com',
      role: 'HR Admin',
      dailyRate: 200.0,
      loginSerial: 'HR-01',
      loginPassword: 'hr123',
      status: 'Active',
      designation: 'Human Resources Manager',
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
      name: 'Tariq Mahmoud',
      email: 'supervisor@lms.com',
      role: 'Site Supervisor',
      siteId: 'site-001',
      dailyRate: 150.0,
      loginSerial: 'SUP-01',
      loginPassword: 'sup123',
      status: 'Active',
      designation: 'Project Field Supervisor',
      adminPermissions: {
        canViewPayroll: false,
        canEditPayroll: false,
        canMarkAttendance: true,
        canManageSites: false,
        canManageUsers: false,
        canAccessSettings: false
      }
    }
  ];

  const matched = staff.find(s => 
    s.email.toLowerCase() === inputIdentifier ||
    s.loginSerial.toLowerCase() === inputIdentifier ||
    s.id.toLowerCase() === inputIdentifier
  );

  if (!matched) {
    return res.status(404).json({ error: `Account "${inputIdentifier}" was not found. Please verify credentials.` });
  }

  const validPasswords = [
    matched.loginPassword,
    process.env.ADMIN_FALLBACK_PASSWORD,
    process.env.MASTER_PASSWORD,
    process.env.OWNER_PASSCODE
  ].filter(Boolean) as string[];

  if (!validPasswords.some(p => p.trim() === inputPassword)) {
    return res.status(401).json({ error: 'Invalid Password. Please check credentials.' });
  }

  const token = `jwt-admin-${matched.id}-${Date.now()}`;
  const company = {
    id: 'comp-001',
    name: 'Al-Bawani Contracting Co.',
    crNumber: '1010892741',
    address: 'King Fahd Road, Olaya District, Riyadh, Saudi Arabia',
    logoUrl: '/lms_by_umar_icon.jpg'
  };

  return res.status(200).json({
    success: true,
    token,
    user: matched,
    company,
    message: `Welcome back, ${matched.name}!`
  });
}
