import { Controller, Get } from '@nestjs/common'
import { CurrencyService } from './currency.service'

@Controller('exchange-rates')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  /**
   * Public endpoint — no auth. The storefront fetches this on every fresh
   * session via TanStack Query (1h staleTime) so prices can be rendered in
   * the visitor's chosen currency.
   */
  @Get()
  async getExchangeRates() {
    return this.currencyService.getExchangeRates()
  }
}
