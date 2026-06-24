import {
  LayoutGrid,
  FileBadge2,
  Bell,
  Settings,
  Users,
} from 'lucide-react';

export const dashboardLinks = [
  {
    title: 'Обзор',
    href: '/',
    icon: LayoutGrid,
  },
  {
    title: 'Сертификаты',
    href: '/certificates',
    icon: FileBadge2,
  },
  {
    title: 'Сотрудники',
    href: '/employees',
    icon: Users,
  },
  {
    title: 'Уведомления',
    href: '/notifications',
    icon: Bell,
  },
  {
    title: 'Настройки',
    href: '/settings',
    icon: Settings,
  },
];