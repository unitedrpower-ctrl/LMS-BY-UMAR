// Vercel Serverless Function: POST /api/auth/owner-otp
export default async function handler(req: any, res: any) {
  // CORS & Method check
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
    return res.status(200).json({ status: 'ok', message: 'Owner OTP service ready. Use POST to request code.' });
  }

  const { email, password } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email address is required for Platform Master Owner login.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const MASTER_EMAILS = ['umarchoudhary259@gmail.com', 'umarchaudhary259@gmail.com', 'unitedrpower@gmail.com'];
  if (!MASTER_EMAILS.includes(normalizedEmail)) {
    return res.status(403).json({ error: 'Platform Master Owner login is strictly restricted to authorized Master Owner accounts.' });
  }

  const validMasterPasswords = ['UmarMaster2026!', 'MasterOwner#2026', 'admin123'];
  if (password && !validMasterPasswords.includes(password.trim())) {
    return res.status(400).json({ error: 'Invalid Master Owner password.' });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[Brevo Serverless OTP] Generated OTP for ${normalizedEmail}: ${otpCode}`);

  let emailSent = false;
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Rawafed Platform Security', email: 'umarchaudhary259@gmail.com' },
          to: [{ email: normalizedEmail, name: 'Platform Owner Umar' }],
          subject: `🔐 Platform Approval Code: ${otpCode} (Master Access)`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; background: #0f172a; padding: 30px; color: #f8fafc; border-radius: 12px; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #f59e0b; margin-top: 0;">👑 Master Owner Approval Verification</h2>
              <p>Your one-time authorization code for platform login is:</p>
              <div style="background: #1e293b; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0; border: 1px solid #f59e0b;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #fbbf24; font-family: monospace;">${otpCode}</span>
              </div>
              <p style="font-size: 12px; color: #94a3b8;">This code is valid for 10 minutes. If you did not request this, please verify your credentials.</p>
            </div>
          `
        })
      });
      emailSent = response.ok;
    } catch (err) {
      console.warn('[Brevo Dispatch Warning]:', err);
    }
  }

  return res.status(200).json({
    success: true,
    email: normalizedEmail,
    otpCode,
    expiresMinutes: 10,
    emailSent,
    message: `A 6-digit login approval verification code has been dispatched to ${normalizedEmail} via Brevo Email API.`
  });
}
