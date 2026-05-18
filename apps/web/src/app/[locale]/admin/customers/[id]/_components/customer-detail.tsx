'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { fetchAdminCustomerById, type AdminCustomerDetail } from '@/lib/api/customers'

interface CustomerDetailProps {
  userId: string
}

export function CustomerDetail({ userId }: CustomerDetailProps) {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data: customer, isPending } = useQuery({
    queryKey: ['admin-customer', userId],
    queryFn: () => fetchAdminCustomerById(userId, accessToken ?? ''),
    enabled: accessToken !== null,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/customers"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          aria-label={t('customerDetailBackAriaLabel')}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('customerDetailBack')}
        </Link>
        <h1 className="text-xl font-semibold text-foreground">{t('customerDetailTitle')}</h1>
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('customerDetailLoading')}
        </p>
      )}

      {!isPending && !customer && (
        <div className="rounded-lg border border-border bg-card p-8 text-center" role="alert">
          <p className="text-sm text-muted-foreground">{t('customerDetailNotFound')}</p>
        </div>
      )}

      {customer && (
        <>
          <ProfileCard customer={customer} />
          <OrderHistorySection customer={customer} />
          <AddressesSection customer={customer} />
        </>
      )}
    </div>
  )
}

function ProfileCard({ customer }: { customer: AdminCustomerDetail }) {
  const t = useTranslations('admin')
  return (
    <section
      aria-labelledby="customer-profile-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="customer-profile-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('customerDetailTitle')}
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{t('customerDetailFieldEmail')}</dt>
          <dd className="font-medium text-foreground">{customer.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('customerDetailFieldJoined')}</dt>
          <dd className="text-foreground">{new Date(customer.createdAt).toLocaleDateString()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('customerDetailFieldTotalOrders')}</dt>
          <dd className="tabular-nums text-foreground">{customer.totalOrders}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('customerDetailFieldLifetimeValue')}</dt>
          <dd className="tabular-nums font-semibold text-foreground">
            ${customer.lifetimeValueUsd.toFixed(2)}
          </dd>
        </div>
      </dl>
    </section>
  )
}

function OrderHistorySection({ customer }: { customer: AdminCustomerDetail }) {
  const t = useTranslations('admin')
  return (
    <section
      aria-labelledby="customer-orders-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="customer-orders-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('customerDetailSectionOrders')}
      </h2>
      {customer.orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('customerDetailOrdersEmpty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('ordersColId')}</TableHead>
              <TableHead>{t('ordersColDate')}</TableHead>
              <TableHead>{t('ordersColStatus')}</TableHead>
              <TableHead className="text-right">{t('ordersColTotal')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customer.orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-sm hover:underline"
                  >
                    {order.id.slice(-8).toUpperCase()}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {t(`ordersStatus${order.status}` as Parameters<typeof t>[0])}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ${Number(order.total).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

function AddressesSection({ customer }: { customer: AdminCustomerDetail }) {
  const t = useTranslations('admin')
  return (
    <section
      aria-labelledby="customer-addresses-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="customer-addresses-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('customerDetailSectionAddresses')}
      </h2>
      {customer.addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('customerDetailAddressesEmpty')}</p>
      ) : (
        <ul role="list" className="space-y-3 text-sm">
          {customer.addresses.map((address) => (
            <li key={address.id} className="rounded border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{address.fullName}</p>
                {address.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    {t('customerDetailAddressDefault')}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">
                {address.addressLine1}
                {address.addressLine2 ? `, ${address.addressLine2}` : ''}
              </p>
              <p className="text-muted-foreground">
                {address.city}
                {address.state ? `, ${address.state}` : ''} {address.postalCode}
              </p>
              <p className="text-muted-foreground">{address.country}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
