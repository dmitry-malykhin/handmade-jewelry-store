import { IsIn, IsInt, IsOptional, Min } from 'class-validator'

const CARRIERS = ['USPS', 'FedEx', 'UPS', 'DHL'] as const
type Carrier = (typeof CARRIERS)[number]

export class PurchaseLabelDto {
  @IsIn(CARRIERS)
  carrier!: Carrier

  /**
   * Insurance value in cents. Omit or pass 0 to skip insurance. The admin UI
   * caps insurance at the order total — the backend re-validates.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  insuranceCents?: number
}
