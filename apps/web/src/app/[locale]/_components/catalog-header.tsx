interface CatalogHeaderProps {
  title: string
  productsCount: string
}

export function CatalogHeader({ title, productsCount }: CatalogHeaderProps) {
  return (
    <header className="mb-8">
      <h1 id="catalog-heading" className="text-3xl font-bold text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{productsCount}</p>
    </header>
  )
}
