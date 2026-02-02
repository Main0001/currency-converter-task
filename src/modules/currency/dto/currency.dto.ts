import { IsOptional, IsString, IsNotEmpty, Length, Matches } from 'class-validator';

//CurrenciesResponse - ответ для GET /api/currencies
export interface CurrenciesResponse {
  currencies: string[];
}

//RatesQuery - параметры запроса для GET /api/rates
export class RatesQuery {
  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'base must be exactly 3 characters' })
  @Matches(/^[A-Z]{3}$/, { message: 'base must be 3 uppercase letters (ISO 4217)' })
  base?: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z]{3}(,[A-Z]{3})*$/, {
    message: 'targets must be comma-separated 3-letter uppercase currency codes (ISO 4217), e.g., "USD,EUR,GBP"',
  })
  targets: string;
}

//RatesResponse - ответ для GET /api/rates
export interface RatesResponse {
  base: string;
  rates: { [currency: string]: number };
  timestamp: string;
}
