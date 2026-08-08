import { Label } from '@/components/ui/label'

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}

export function FormField({ label, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
