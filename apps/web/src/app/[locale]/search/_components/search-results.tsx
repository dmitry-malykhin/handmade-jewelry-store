'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link } from '@/i18n/navigation'
import { searchProducts } from '@/lib/api/products'
import { DisplayPrice } from '@/components/shared/display-price'
import { highlightMatch } from '@/lib/search/highlight-match'

const SEARCH_DEBOUNCE_MS = 300

interface SearchResultsProps {
  initialQuery: string
}

export function SearchResults({ initialQuery }: SearchResultsProps) {
  const t = useTranslations('searchPage')
  const router = useRouter()
  const searchParams = useSearchParams()

  const [inputValue, setInputValue] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  // Debounce keystrokes → both the query the API runs against AND the URL
  // update. Single 300ms timer keeps both in lockstep.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(inputValue)
      // Sync URL so a refresh / share keeps the search term. `replace` (not
      // push) means typing doesn't pollute browser history with every chunk.
      const next = new URLSearchParams(searchParams.toString())
      if (inputValue.trim()) {
        next.set('q', inputValue.trim())
      } else {
        next.delete('q')
      }
      router.replace(`?${next.toString()}`, { scroll: false })
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [inputValue, router, searchParams])

  const { data: results, isPending } = useQuery({
    queryKey: ['search-products', debouncedQuery],
    queryFn: () => searchProducts(debouncedQuery),
    // Empty queries short-circuit on the client too — don't fire the request
    enabled: debouncedQuery.trim().length > 0,
  })

  const hasQuery = debouncedQuery.trim().length > 0
  const isLoading = hasQuery && isPending
  const showNoResults = hasQuery && !isPending && results && results.length === 0
  const showResults = hasQuery && !isPending && results && results.length > 0

  return (
    <section aria-labelledby="search-heading" className="space-y-6">
      <div className="space-y-2">
        <h1 id="search-heading" className="text-2xl font-semibold text-foreground">
          {t('title')}
        </h1>
        <Label htmlFor="search-input" className="sr-only">
          {t('inputLabel')}
        </Label>
        <Input
          id="search-input"
          type="search"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={t('inputPlaceholder')}
          autoFocus
          className="max-w-2xl"
        />
      </div>

      {!hasQuery && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('noQuery')}
        </p>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('loading')}
        </p>
      )}

      {showNoResults && (
        <div className="space-y-3" role="status">
          <p className="text-sm text-muted-foreground">
            {t('noResults', { query: debouncedQuery })}
          </p>
          <Link
            href="/shop"
            className="inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            {t('browseAll')} →
          </Link>
        </div>
      )}

      {showResults && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('resultsCount', { count: results.length })}
          </p>
          <ul role="list" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/shop/${product.slug}`}
                  className="group block overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-square overflow-hidden bg-accent/10">
                    {product.images?.[0] && (
                      <Image
                        src={product.images[0]}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <h2 className="line-clamp-2 text-sm font-medium text-foreground">
                      {highlightMatch(product.title, debouncedQuery).map((segment, segmentIndex) =>
                        segment.isMatch ? (
                          <mark
                            key={segmentIndex}
                            className="rounded-sm bg-amber-200/60 px-0.5 dark:bg-amber-500/30"
                          >
                            {segment.text}
                          </mark>
                        ) : (
                          <span key={segmentIndex}>{segment.text}</span>
                        ),
                      )}
                    </h2>
                    <DisplayPrice
                      amountUsd={parseFloat(product.price)}
                      className="mt-1 text-sm text-muted-foreground"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
