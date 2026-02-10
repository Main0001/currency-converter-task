import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrencyService } from './currency.service';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { UserId } from '../../common/decorators/user-id.decorator';
import { RatesQuery } from './dto/currency.dto';
import type { CurrenciesResponse, RatesResponse } from './dto/currency.dto';

@ApiTags('currencies')
@Controller('api')
@UseGuards(UserAuthGuard)
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('currencies')
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests/min
  @ApiOperation({ summary: 'Get list of supported currencies' })
  @ApiResponse({
    status: 200,
    description: 'Currency list successfully retrieved',
    schema: {
      example: { currencies: ['USD', 'EUR', 'GBP', 'JPY'] },
    },
  })
  @ApiResponse({ status: 429, description: 'Too many requests (limit: 100/min)' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async getCurrencies(): Promise<CurrenciesResponse> {
    const currencies = await this.currencyService.getSupportedCurrencies();
    return { currencies };
  }

  @Get('rates')
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: 'Get exchange rates' })
  @ApiQuery({
    name: 'base',
    required: false,
    description: 'Base currency (if not specified - taken from user settings)',
    example: 'USD',
  })
  @ApiQuery({
    name: 'targets',
    required: true,
    description: 'Target currencies separated by comma',
    example: 'EUR,GBP,JPY',
  })
  @ApiResponse({
    status: 200,
    description: 'Exchange rates successfully retrieved',
    schema: {
      example: {
        base: 'USD',
        rates: { EUR: 0.85, GBP: 0.73, JPY: 110.5 },
        timestamp: '2026-01-22T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 429, description: 'Too many requests (limit: 100/min)' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async getRates(
    @Query() query: RatesQuery,
    @UserId() userId: string,
  ): Promise<RatesResponse> {
    const targets = query.targets
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    return this.currencyService.getExchangeRates(query.base, targets, userId);
  }
}
