'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import {
  fetchLoyaltyBalance,
  fetchLoyaltyTransactions,
  type LoyaltyTransaction,
} from '@/lib/api/loyalty'

function formatPointsAsDollars(points: number): string {
  return `$${(points / 100).toFixed(2)}`
}

function TransactionRow({ transaction }: { transaction: LoyaltyTransaction }) {
  const t = useTranslations('account.loyalty')
  // Sign is encoded in the points field — render explicitly so customers can
  // tell credits from debits at a glance (positive green, negative muted).
  const isCredit = transaction.points > 0
  const formattedPoints = `${isCredit ? '+' : ''}${transaction.points}`
  const formattedDate = new Date(transaction.createdAt).toLocaleDateString()

  return (
    <li className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          {t(`transactionType.${transaction.type}`)}
        </span>
        {transaction.note && (
          <span className="text-xs text-muted-foreground">{transaction.note}</span>
        )}
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
      </div>
      <span
        className={
          isCredit
            ? 'text-sm font-semibold text-green-600 dark:text-green-400'
            : 'text-sm font-semibold text-muted-foreground'
        }
      >
        {formattedPoints}
      </span>
    </li>
  )
}

export function LoyaltyOverview() {
  const t = useTranslations('account.loyalty')
  const accessToken = useAuthStore((state) => state.accessToken)

  const balanceQuery = useQuery({
    queryKey: ['loyalty-balance'],
    queryFn: () => fetchLoyaltyBalance(accessToken ?? ''),
    enabled: accessToken !== null,
  })
  const transactionsQuery = useQuery({
    queryKey: ['loyalty-transactions'],
    queryFn: () => fetchLoyaltyTransactions(accessToken ?? ''),
    enabled: accessToken !== null,
  })

  const balance = balanceQuery.data?.balance ?? 0
  const transactions = transactionsQuery.data ?? []

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="size-4" aria-hidden="true" />
          {t('balanceLabel')}
        </div>
        <p className="mt-2 text-4xl font-light text-foreground tabular-nums">
          {balance.toLocaleString()}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            {t('pointsUnit')}
          </span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('balanceWorth', { dollars: formatPointsAsDollars(balance) })}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">{t('howItWorks')}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-base font-semibold text-foreground">{t('transactionsTitle')}</h3>

        {transactionsQuery.isPending && (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            {t('transactionsLoading')}
          </p>
        )}

        {transactions.length === 0 && !transactionsQuery.isPending && (
          <p className="mt-3 text-sm text-muted-foreground">{t('transactionsEmpty')}</p>
        )}

        {transactions.length > 0 && (
          <ul role="list" className="mt-3">
            {transactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
