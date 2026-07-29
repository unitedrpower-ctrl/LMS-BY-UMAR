import { User, Site, Attendance, Payroll, Complaint, Notice, SystemSettings, DocumentItem } from '../types';
import { LanguageCode } from './i18n';
import { 
  INITIAL_USERS, 
  INITIAL_SITES, 
  INITIAL_ATTENDANCE, 
  INITIAL_PAYROLLS, 
  INITIAL_COMPLAINTS, 
  INITIAL_NOTICES,
  INITIAL_SETTINGS,
  INITIAL_DOCUMENTS
} from '../data/mockData';

const STORAGE_KEYS = {
  USERS: 'labor_admin_users_v1',
  SITES: 'labor_admin_sites_v1',
  ATTENDANCE: 'labor_admin_attendance_v1',
  PAYROLL: 'labor_admin_payroll_v1',
  COMPLAINTS: 'labor_admin_complaints_v1',
  NOTICES: 'labor_admin_notices_v1',
  SETTINGS: 'labor_admin_settings_v1',
  DOCUMENTS: 'labor_admin_documents_v1',
  CURRENT_USER_ID: 'labor_admin_current_user_id_v1',
  CURRENT_LANG: 'labor_admin_current_lang_v1',
  MOBILE_FRAME: 'labor_admin_mobile_frame_v1'
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error loading key ${key} from localStorage:`, e);
    return defaultValue;
  }
};

export const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving key ${key} to localStorage:`, e);
  }
};

export const getInitialState = () => {
  return {
    users: loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS),
    sites: loadFromStorage<Site[]>(STORAGE_KEYS.SITES, INITIAL_SITES),
    attendance: loadFromStorage<Attendance[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE),
    payroll: loadFromStorage<Payroll[]>(STORAGE_KEYS.PAYROLL, INITIAL_PAYROLLS),
    complaints: loadFromStorage<Complaint[]>(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS),
    notices: loadFromStorage<Notice[]>(STORAGE_KEYS.NOTICES, INITIAL_NOTICES),
    settings: loadFromStorage<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
    documents: loadFromStorage<DocumentItem[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS),
    currentUserId: loadFromStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null),
    currentLang: loadFromStorage<LanguageCode>(STORAGE_KEYS.CURRENT_LANG, 'en'),
    isMobileFrame: loadFromStorage<boolean>(STORAGE_KEYS.MOBILE_FRAME, false)
  };
};

export const resetAllData = () => {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(INITIAL_SITES));
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(INITIAL_ATTENDANCE));
  localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(INITIAL_PAYROLLS));
  localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(INITIAL_COMPLAINTS));
  localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(INITIAL_NOTICES));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(INITIAL_DOCUMENTS));
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
};

export { STORAGE_KEYS };
