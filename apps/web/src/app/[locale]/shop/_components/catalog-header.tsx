interface CatalogHeaderProps {
  totalCount: number
  breadcrumbHome: string
  breadcrumbShop: string
  breadcrumbLabel: string
  title: string
  productsCount: string
}

export function CatalogHeader({
  breadcrumbHome,
  breadcrumbShop,
  breadcrumbLabel,
  title,
  productsCount,
}: CatalogHeaderProps) {
  return (
    <header className="mb-8">
      <nav aria-label={breadcrumbLabel}>
        <ol className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <li>{breadcrumbHome}</li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-foreground">{breadcrumbShop}</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{productsCount}</p>
    </header>
  )
}
