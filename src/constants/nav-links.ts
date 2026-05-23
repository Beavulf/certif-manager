import {
  LayoutGrid,
  FileBadge2,
  Upload,
  Bell,
  Settings,
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
    title: 'Загрузка',
    href: '/upload',
    icon: Upload,
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