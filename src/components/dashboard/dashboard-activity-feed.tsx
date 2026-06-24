'use client';

import { ConfigProvider, Tag } from 'antd';
import { History } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dayjs from '@/lib/dayjs-config';
import { AUDIT_ACTION_LABELS } from '@/types/settings-types';
import type { DashboardAuditItem } from '@/types/dashboard-types';

type DashboardActivityFeedProps = {
  items: DashboardAuditItem[];
};

export function DashboardActivityFeed({ items }: DashboardActivityFeedProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-6 py-4">
        <div className="flex items-center gap-2">
          <History className="size-4 text-amber-700" />
          <CardTitle className="text-base font-semibold">
            Последняя активность
          </CardTitle>
        </div>
        <Link
          href="/settings"
          className="text-xs font-medium text-amber-800 hover:underline"
        >
          Журнал аудита
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Событий пока нет
          </p>
        ) : (
          <ConfigProvider
            theme={{
              token: { colorPrimary: '#b45309', borderRadius: 8 },
            }}
          >
            <ul className="divide-y divide-border/60">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start gap-x-3 gap-y-1 px-6 py-3.5"
                >
                  <span className="w-[8.5rem] shrink-0 text-xs tabular-nums text-muted-foreground">
                    {dayjs(item.createdAt).format('DD.MM.YY HH:mm')}
                  </span>
                  <Tag color="gold" className="!m-0 shrink-0">
                    {AUDIT_ACTION_LABELS[item.action] ?? item.action}
                  </Tag>
                  <span className="min-w-0 flex-1 text-sm text-foreground">
                    {item.displayName ?? '—'}
                  </span>
                  {item.adUsername && (
                    <span className="text-xs text-muted-foreground">
                      {item.adUsername}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </ConfigProvider>
        )}
      </CardContent>
    </Card>
  );
}
