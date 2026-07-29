import { SQLQueryExample } from '../types';

export const POSTGRES_DDL_SCHEMA = `-- ============================================================
-- LABOR & ADMIN MANAGEMENT SYSTEM - DATABASE SCHEMA (PostgreSQL)
-- ============================================================

-- 1. Create Custom Enum Types
CREATE TYPE user_role AS ENUM ('Super Admin', 'Site Supervisor', 'HR Admin', 'Labor');
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Half-Day');
CREATE TYPE complaint_status AS ENUM ('Pending', 'In Progress', 'Resolved');
CREATE TYPE site_status AS ENUM ('Active', 'Completed', 'On Hold');

-- 2. Groups / Sites Table
CREATE TABLE sites (
    site_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_name VARCHAR(150) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status site_status DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users Table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'Labor',
    site_id UUID REFERENCES sites(site_id) ON DELETE SET NULL,
    daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 50.00 CHECK (daily_rate >= 0),
    designation VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add Foreign Key for Site Supervisor in sites table
ALTER TABLE sites 
ADD COLUMN supervisor_id UUID REFERENCES users(user_id) ON DELETE SET NULL;

-- 4. Attendance Table
CREATE TABLE attendance (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(site_id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status attendance_status NOT NULL DEFAULT 'Present',
    marked_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_daily_attendance UNIQUE (user_id, date)
);

-- 5. Payroll Table
CREATE TABLE payroll (
    payroll_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    daily_rate NUMERIC(10, 2) NOT NULL CHECK (daily_rate >= 0),
    total_days_worked NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (total_days_worked >= 0),
    allowances NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (allowances >= 0),
    advances NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (advances >= 0),
    penalties NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (penalties >= 0),
    net_salary NUMERIC(10, 2) NOT NULL GENERATED ALWAYS AS (
        (daily_rate * total_days_worked) + allowances - advances - penalties
    ) STORED,
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Paid')),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_monthly_payroll UNIQUE (user_id, month_year)
);

-- 6. Complaints Table
CREATE TABLE complaints (
    complaint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(site_id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'General',
    status complaint_status NOT NULL DEFAULT 'Pending',
    response_note TEXT,
    resolved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Notices Table
CREATE TABLE notices (
    notice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    target_group VARCHAR(50) NOT NULL DEFAULT 'All', -- 'All' or site_id UUID string
    priority VARCHAR(20) DEFAULT 'Normal' CHECK (priority IN ('Normal', 'Important', 'Urgent')),
    posted_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    date_posted TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_site_id ON users(site_id);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_attendance_site_date ON attendance(site_id, date);
CREATE INDEX idx_payroll_user_month ON payroll(user_id, month_year);
CREATE INDEX idx_complaints_user_date ON complaints(user_id, created_at);
CREATE INDEX idx_notices_target ON notices(target_group);

-- ============================================================
-- TRIGGER: Enforce Max 3 Complaints Per Day Per User
-- ============================================================
CREATE OR REPLACE FUNCTION check_daily_complaint_limit()
RETURNS TRIGGER AS $$
DECLARE
    daily_count INT;
BEGIN
    SELECT COUNT(*) INTO daily_count
    FROM complaints
    WHERE user_id = NEW.user_id 
      AND DATE(created_at) = CURRENT_DATE;

    IF daily_count >= 3 THEN
        RAISE EXCEPTION 'Daily complaint limit reached (Maximum 3 complaints per day allowed).';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_complaint_limit
BEFORE INSERT ON complaints
FOR EACH ROW
EXECUTE FUNCTION check_daily_complaint_limit();
`;

export const PRISMA_SCHEMA = `// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  SUPER_ADMIN @map("Super Admin")
  SITE_SUPERVISOR @map("Site Supervisor")
  HR_ADMIN @map("HR Admin")
  LABOR @map("Labor")
}

enum AttendanceStatus {
  PRESENT @map("Present")
  ABSENT @map("Absent")
  HALF_DAY @map("Half-Day")
}

enum ComplaintStatus {
  PENDING @map("Pending")
  IN_PROGRESS @map("In Progress")
  RESOLVED @map("Resolved")
}

model Site {
  id           String        @id @default(uuid()) @map("site_id")
  name         String        @map("site_name")
  location     String
  status       String        @default("Active")
  createdAt    DateTime      @default(now()) @map("created_at")
  
  // Relations
  supervisorId String?       @map("supervisor_id")
  supervisor   User?         @relation("SiteSupervisor", fields: [supervisorId], references: [id])
  laborers     User[]        @relation("AssignedLaborers")
  attendances  Attendance[]
  complaints   Complaint[]
}

model User {
  id           String       @id @default(uuid()) @map("user_id")
  name         String
  email        String       @unique
  phone        String?
  role         Role         @default(LABOR)
  dailyRate    Decimal      @default(50.00) @map("daily_rate") @db.Decimal(10, 2)
  designation  String?
  createdAt    DateTime     @default(now()) @map("created_at")

  // Site Relation
  siteId       String?      @map("site_id")
  site         Site?        @relation("AssignedLaborers", fields: [siteId], references: [id])
  
  // Inverse Relations
  supervisedSites Site[]    @relation("SiteSupervisor")
  attendances     Attendance[] @relation("LaborAttendance")
  markedAttendances Attendance[] @relation("SupervisorMarked")
  payrolls        Payroll[]
  complaints      Complaint[]   @relation("UserComplaints")
  resolvedComplaints Complaint[] @relation("ResolvedBy")
  notices         Notice[]
}

model Attendance {
  id         String           @id @default(uuid()) @map("attendance_id")
  userId     String           @map("user_id")
  user       User             @relation("LaborAttendance", fields: [userId], references: [id], onDelete: Cascade)
  siteId     String           @map("site_id")
  site       Site             @relation(fields: [siteId], references: [id], onDelete: Cascade)
  date       DateTime         @db.Date
  status     AttendanceStatus @default(PRESENT)
  markedBy   String           @map("marked_by")
  supervisor User             @relation("SupervisorMarked", fields: [markedBy], references: [id])
  notes      String?
  createdAt  DateTime         @default(now()) @map("created_at")

  @@unique([userId, date])
}

model Payroll {
  id              String   @id @default(uuid()) @map("payroll_id")
  userId          String   @map("user_id")
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  monthYear       String   @map("month_year") // YYYY-MM
  dailyRate       Decimal  @map("daily_rate") @db.Decimal(10, 2)
  totalDaysWorked Decimal  @default(0) @map("total_days_worked") @db.Decimal(5, 2)
  allowances      Decimal  @default(0) @db.Decimal(10, 2)
  advances        Decimal  @default(0) @db.Decimal(10, 2)
  penalties       Decimal  @default(0) @db.Decimal(10, 2)
  netSalary       Decimal  @map("net_salary") @db.Decimal(10, 2)
  status          String   @default("Draft")
  generatedAt     DateTime @default(now()) @map("generated_at")

  @@unique([userId, monthYear])
}

model Complaint {
  id           String          @id @default(uuid()) @map("complaint_id")
  userId       String          @map("user_id")
  user         User            @relation("UserComplaints", fields: [userId], references: [id], onDelete: Cascade)
  siteId       String?         @map("site_id")
  site         Site?           @relation(fields: [siteId], references: [id])
  message      String
  category     String          @default("General")
  status       ComplaintStatus @default(PENDING)
  responseNote String?         @map("response_note")
  resolvedBy   String?         @map("resolved_by")
  resolver     User?           @relation("ResolvedBy", fields: [resolvedBy], references: [id])
  createdAt    DateTime        @default(now()) @map("created_at")
}

model Notice {
  id          String   @id @default(uuid()) @map("notice_id")
  title       String
  content     String
  targetGroup String   @default("All") @map("target_group")
  priority    String   @default("Normal")
  postedBy    String   @map("posted_by")
  author      User     @relation(fields: [postedBy], references: [id], onDelete: Cascade)
  datePosted  DateTime @default(now()) @map("date_posted")
}
`;

export const SQL_QUERY_EXAMPLES: SQLQueryExample[] = [
  {
    id: 'q1',
    title: 'Calculate Monthly Payroll from Attendance Data',
    category: 'Payroll Queries',
    description: 'Calculates total days worked (Present = 1.0, Half-Day = 0.5) for a given month and generates net salary.',
    code: `WITH MonthlyAttendance AS (
    SELECT 
        user_id,
        COUNT(CASE WHEN status = 'Present' THEN 1 END) AS present_days,
        COUNT(CASE WHEN status = 'Half-Day' THEN 1 END) AS half_days,
        (COUNT(CASE WHEN status = 'Present' THEN 1 END) + 
         (COUNT(CASE WHEN status = 'Half-Day' THEN 1 END) * 0.5)) AS total_days_worked
    FROM attendance
    WHERE TO_CHAR(date, 'YYYY-MM') = '2026-07'
    GROUP BY user_id
)
SELECT 
    u.user_id,
    u.name,
    u.role,
    u.daily_rate,
    COALESCE(ma.present_days, 0) AS present_days,
    COALESCE(ma.half_days, 0) AS half_days,
    COALESCE(ma.total_days_worked, 0) AS total_days_worked,
    (u.daily_rate * COALESCE(ma.total_days_worked, 0)) AS base_salary
FROM users u
LEFT JOIN MonthlyAttendance ma ON u.user_id = ma.user_id
WHERE u.role = 'Labor';`
  },
  {
    id: 'q2',
    title: 'Enforce Max 3 Complaints Daily Limit Validation',
    category: 'Complaints & Limits',
    description: 'Checks if a user has already submitted 3 or more complaints today before allowing a new entry.',
    code: `SELECT 
    user_id,
    COUNT(*) AS complaints_today,
    CASE 
        WHEN COUNT(*) >= 3 THEN 'LIMIT_REACHED (Max 3 Allowed)'
        ELSE 'CAN_SUBMIT'
    END AS submission_eligibility
FROM complaints
WHERE user_id = 'user-labor-1'
  AND DATE(created_at) = CURRENT_DATE
GROUP BY user_id;`
  },
  {
    id: 'q3',
    title: 'Daily Site Attendance & Worker Count Summary',
    category: 'Attendance Queries',
    description: 'Summarizes present, absent, and half-day labor count per construction site for today.',
    code: `SELECT 
    s.site_id,
    s.site_name,
    COUNT(a.attendance_id) AS total_marked,
    COUNT(CASE WHEN a.status = 'Present' THEN 1 END) AS present_count,
    COUNT(CASE WHEN a.status = 'Half-Day' THEN 1 END) AS half_day_count,
    COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) AS absent_count
FROM sites s
LEFT JOIN attendance a ON s.site_id = a.site_id AND a.date = CURRENT_DATE
GROUP BY s.site_id, s.site_name
ORDER BY s.site_name ASC;`
  },
  {
    id: 'q4',
    title: 'Fetch Target Site Notices for a Laborer',
    category: 'DDL Schema',
    description: 'Returns all notices targeted either to "All" or to the specific Site ID assigned to the user.',
    code: `SELECT 
    n.notice_id,
    n.title,
    n.content,
    n.priority,
    n.date_posted,
    u.name AS author_name
FROM notices n
JOIN users u ON n.posted_by = u.user_id
WHERE n.target_group = 'All' 
   OR n.target_group = (SELECT site_id FROM users WHERE user_id = 'user-labor-1')
ORDER BY n.date_posted DESC;`
  }
];
