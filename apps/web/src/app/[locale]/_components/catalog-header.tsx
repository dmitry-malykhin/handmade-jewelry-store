interface CatalogHeaderProps {
  title: string
  productsCount: string
}

export function CatalogHeader({ title, productsCount }: CatalogHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{productsCount}</p>
    </header>
  )
}
