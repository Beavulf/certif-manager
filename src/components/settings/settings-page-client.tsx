'use client';

import { ConfigProvider, Spin, Tabs } from 'antd';
import {
  Bell,
  FileBadge2,
  Server,
  Settings2,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { useSettings } from '@/hooks/use-settings';
import type { SettingsBundle } from '@/types/settings-types';

import { CertificatesUploadSettingsForm } from './certificates-upload-settings-form';
import { GeneralSettingsForm } from './general-settings-form';
import { NotificationSettingsForm } from './notification-settings-form';
import { SystemAuditPanel } from './system-audit-panel';

type SettingsPageClientProps = {
  initial: SettingsBundle;
};

type TabKey = 'general' | 'notifications' | 'certificates' | 'system';

const TAB_KEYS: TabKey[] = [
  'general',
  'notifications',
  'certificates',
  'system',
];

/** Активная вкладка сохраняется в ?tab= — после перезагрузки страницы не сбрасывается. */
function readInitialTab(): TabKey {
  if (typeof window === 'undefined') return 'general';
  const tab = new URLSearchParams(window.location.search).get('tab');
  return TAB_KEYS.includes(tab as TabKey) ? (tab as TabKey) : 'general';
}

function DirtyDot() {
  return (
    <span
      aria-label="Есть несохранённые изменения"
      className="ml-1 inline-block size-1.5 rounded-full bg-amber-500"
    />
  );
}

export function SettingsPageClient({ initial }: SettingsPageClientProps) {
  const { data, isFetching } = useSettings(initial);
  const settings = data ?? initial;
  const [activeTab, setActiveTab] = useState<TabKey>(readInitialTab);
  const [dirtyTabs, setDirtyTabs] = useState<Partial<Record<TabKey, boolean>>>({});

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as TabKey);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.replaceState(null, '', url);
  }, []);

  const handleDirtyChange = useCallback((key: TabKey, dirty: boolean) => {
    setDirtyTabs((prev) => {
      if (Boolean(prev[key]) === dirty) return prev;
      return { ...prev, [key]: dirty };
    });
  }, []);

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
          activeKey={activeTab}
          onChange={handleTabChange}
          type="card"
          items={[
            {
              key: 'general',
              label: (
                <span className="inline-flex items-center gap-2 px-1">
                  <Settings2 className="size-4" />
                  Общие
                  {dirtyTabs.general ? <DirtyDot /> : null}
                </span>
              ),
              children: (
                <GeneralSettingsForm
                  settings={settings.app}
                  onDirtyChange={(dirty) => handleDirtyChange('general', dirty)}
                />
              ),
            },
            {
              key: 'notifications',
              label: (
                <span className="inline-flex items-center gap-2 px-1">
                  <Bell className="size-4" />
                  Уведомления
                  {dirtyTabs.notifications ? <DirtyDot /> : null}
                </span>
              ),
              children: (
                <NotificationSettingsForm
                  settings={settings.notification}
                  onDirtyChange={(dirty) =>
                    handleDirtyChange('notifications', dirty)
                  }
                />
              ),
            },
            {
              key: 'certificates',
              label: (
                <span className="inline-flex items-center gap-2 px-1">
                  <FileBadge2 className="size-4" />
                  Сертификаты и файлы
                  {dirtyTabs.certificates ? <DirtyDot /> : null}
                </span>
              ),
              children: (
                <CertificatesUploadSettingsForm
                  settings={settings.app}
                  onDirtyChange={(dirty) =>
                    handleDirtyChange('certificates', dirty)
                  }
                />
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
