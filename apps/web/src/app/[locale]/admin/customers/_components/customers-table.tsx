'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { useAuthStore } from '@/store/auth.store'
import { fetchAdminCustomers } from '@/lib/api/customers'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

export function CustomersTable() {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  const { data, isPending } = useQuery({
    queryKey: ['admin-customers', { page, search }],
    queryFn: () => fetchAdminCustomers({ page, limit: PAGE_SIZE, search }, accessToken ?? ''),
    enabled: accessToken !== null,
  })

  return (
    <section aria-labelledby="customers-heading" className="space-y-4">
      <div>
        <h1 id="customers-heading" className="text-xl font-semibold text-foreground">
          {t('customersTitle')}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('customersDescription')}</p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('customersSearchPlaceholder')}
          className="max-w-sm"
        />
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('customerDetailLoading')}
        </p>
      )}

      {data && data.data.length === 0 && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('customersEmpty')}
        </p>
      )}

      {data && data.data.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('customersColEmail')}</TableHead>
                <TableHead>{t('customersColJoined')}</TableHead>
                <TableHead className="text-right">{t('customersColOrders')}</TableHead>
                <TableHead className="text-right">{t('customersColLtv')}</TableHead>
                <TableHead>{t('customersColLastOrder')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {customer.email}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{customer.totalOrders}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    ${customer.lifetimeValueUsd.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.lastOrderAt
                      ? new Date(customer.lastOrderAt).toLocaleDateString()
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('customersPaginationPageOf', {
                  page: data.meta.page,
                  totalPages: data.meta.totalPages,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  {t('customersPaginationPrev')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  {t('customersPaginationNext')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
