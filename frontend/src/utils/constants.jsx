// Constants for Attendify Application

export const COLORS = {
  primary: '#000400',
  secondary: '#11230b',
  tertiary: '#32472f',
  accent: '#67754c',
  light: '#a3a56b',
  white: '#ffffff',
  black: '#000000',
  gray: {
    100: '#f7fafc',
    200: '#edf2f7',
    300: '#e2e8f0',
    400: '#cbd5e0',
    500: '#a0aec0',
    600: '#718096',
    700: '#4a5568',
    800: '#2d3748',
    900: '#1a202c'
  },
  success: '#48bb78',
  error: '#f56565',
  warning: '#ed8936',
  info: '#4299e1'
};

export const API_BASE_URL = 'http://localhost/attendify/backend';

export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher'
};

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export const PHOTO_TYPES = [
  { value: 'front', label: 'Ön' },
  { value: 'right', label: 'Sağ' },
  { value: 'left', label: 'Sol' },
  { value: 'up', label: 'Yukarı' },
  { value: 'down', label: 'Aşağı' }
];

export const FEEDBACK_TYPES = [
  { value: 'feedback', label: 'Geri Bildirim' },
  { value: 'complaint', label: 'Şikayet' },
  { value: 'request', label: 'İstek' }
];

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent'
};

export const ROUTES = {
  LOGIN: '/',
  ADMIN: '/admin',
  ADMIN_HOME: '/admin/home',
  ADMIN_TEACHERS: '/admin/teachers',
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_CLASSES: '/admin/classes',
  ADMIN_EXPORT: '/admin/export',
  ADMIN_ATTENDANCE: '/admin/attendance',
  ADMIN_SETTINGS: '/admin/settings',
  TEACHER: '/teacher',
  TEACHER_PROFILE: '/teacher/profile',
  TEACHER_ATTENDANCE: '/teacher/attendance',
  TEACHER_CLASSES: '/teacher/classes',
  TEACHER_STUDENTS: '/teacher/students'
};