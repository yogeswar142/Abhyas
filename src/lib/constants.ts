export const APP_NAME = 'Abhyas';

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Interview', href: '/interview/new', icon: 'interview' },
  { label: 'Reports', href: '/reports', icon: 'reports' },
  { label: 'Profile', href: '/profile', icon: 'profile' },
  { label: 'Settings', href: '/settings', icon: 'settings' }
];

export const INTERVIEW_TYPES = [
  { id: 'behavioral', label: 'Behavioral', description: 'Leadership, teamwork, and cultural fit', icon: 'users' },
  { id: 'system-design', label: 'System Design', description: 'Architecture, scalability, and trade-offs', icon: 'server' },
  { id: 'technical', label: 'Technical', description: 'Algorithms, data structures, and coding', icon: 'code' },
  { id: 'product', label: 'Product', description: 'Product sense, execution, and strategy', icon: 'box' },
  { id: 'custom', label: 'Custom', description: 'Custom tailored practice session', icon: 'settings' }
];

export const SESSION_DURATIONS = [15, 30, 45, 60];
