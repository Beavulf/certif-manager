'use client';

import { ConfigProvider, Spin, Tabs } from 'antd';
import {
  Bell,
  FileBadge2,
  Server,
  Settings2,
} from 'lucide-react';

import { useSettings } from '@/hooks/use-settings';
import type { SettingsBundle } from '@/types/settings-types';

import { CertificatesUploadSettingsForm } from './certificates-upload-settings-form';
import { GeneralSettingsForm } from './general-settings-form';
import { NotificationSettingsForm } from './notification-settings-form';
import { SystemAuditPanel } from './system-audit-panel';

type SettingsPageClientProps = {
  initial: SettingsBundle;
};

export function SettingsPageClient({ initial }: SettingsPageClientProps) {
  const { data, isFetching } = useSettings(initial);
  const settings = data ?? initial;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#b45309',
          borderRadius: 10,
        },
      }}
    >
      <Spin spinning={isFetching}>
        <Tabs
          defaultActiveKey="general"
          type="card"
          items={[
            {
              key: 'general',
              label: (
                <span className="inline-flex items-center gap-2 px-1">
                  <Settings2 className="size-4" />
                  Общие
                </span>
              ),
              children: <GeneralSettingsForm settings={settings.app} />,
            },
            {
              key: 'notifications',
              label: (
                <span className="inline-flex items-center gap-2 px-1">
                  <Bell className="size-4" />
                  Уведомления
                </span>
              ),
              children: (
                <NotificationSettingsForm settings={settings.notification} />
              ),
            },
            {
              key: 'certificates',
              label: (
                <span className="inline-flex items-center gap-2 px-1">
                  <FileBadge2 className="size-4" />
                  Сертификаты и файлы
                </span>
              ),
              children: (
                <CertificatesUploadSettingsForm settings={settings.app} />
              ),
            },
            {
              key: 'system',
              label: (
                <span className="inline-flex items-center gap-2 px-1">
                  <Server className="size-4" />
                  Система и аудит
                </span>
              ),
              children: (
                <SystemAuditPanel systemStatus={settings.systemStatus} />
              ),
            },
          ]}
        />
      </Spin>
    </ConfigProvider>
  );
}
