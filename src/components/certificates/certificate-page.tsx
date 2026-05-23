'use client';

import { FileBadge2, Plus, Search, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useGetCertificatesAll } from '@/hooks/use-certificate';
import { toast } from 'sonner';
import { useState } from 'react';


export function CertificatesPage() {
  const [search, setSearch] = useState('');
  const {data=[], isLoading, refetch, error} = useGetCertificatesAll(search);

  if (error) toast.error(`Ошибка загрузки: ${error.message}`);

  const isEmpty = data.length === 0 && !isLoading;

  return (
    <>
      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="text"
                placeholder="Поиск по названию, issuer или домену"
                className="h-11 pl-9"
              />
            </div>

            <Button 
              onClick={()=>refetch()}
              variant="outline" className="h-11">
              <SlidersHorizontal className="size-4" />
              Фильтры
            </Button>
          </div>

          <Button className="h-11 px-5">
            <Plus className="size-4" />
            Добавить сертификат
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle className="text-base font-semibold">
            Список сертификатов
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr className="border-b border-border/70">
                    <th className="px-6 py-4 font-medium">Название</th>
                    <th className="px-6 py-4 font-medium">Issuer</th>
                    <th className="px-6 py-4 font-medium">Действует с</th>
                    <th className="px-6 py-4 font-medium">Истекает</th>
                    <th className="px-6 py-4 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="px-6 py-4">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-28 bg-muted animate-pulse rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-20 bg-muted animate-pulse rounded-full"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isEmpty ? (
            <div className="px-6 py-14">
              <div className="rounded-2xl border border-dashed border-border bg-accent/40 px-6 py-12 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                  <FileBadge2 className="size-6" />
                </div>

                <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                  Список сертификатов пока пуст
                </h2>

                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  После первой загрузки здесь появятся записи с названием сертификата,
                  центром сертификации, сроком действия и текущим статусом.
                </p>

                <div className="mt-5 flex items-center justify-center gap-3">
                  <Button>
                    <Plus className="size-4" />
                    Добавить первый сертификат
                  </Button>

                  <Button variant="outline">
                    Обновить список
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr className="border-b border-border/70">
                    <th className="px-6 py-4 font-medium">Название</th>
                    <th className="px-6 py-4 font-medium">Issuer</th>
                    <th className="px-6 py-4 font-medium">Действует с</th>
                    <th className="px-6 py-4 font-medium">Истекает</th>
                    <th className="px-6 py-4 font-medium">Статус</th>
                  </tr>
                </thead>

                <tbody>
                  {data ? data.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/60 transition-colors hover:bg-accent/40"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {item.subjectCN}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {item.issuer}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(item.validFrom).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(item.validTo).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  )):[]}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
   
      </Card>
    </>
  );
}