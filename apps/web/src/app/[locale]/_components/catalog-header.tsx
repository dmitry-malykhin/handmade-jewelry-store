interface CatalogHeaderProps {
  title: string
}

// Products count moved into <ProductGridServer> so it streams with the grid
// instead of blocking the header on the fetch (#501).
export function CatalogHeader({ title }: CatalogHeaderProps) {
  return (
    <header className="mb-8">
      <h1 id="catalog-heading" className="font-display text-4xl font-normal text-foreground">
        {title}
      </h1>
    </header>
  )
}
