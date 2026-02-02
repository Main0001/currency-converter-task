//CurrencyInfo - информация о валюте из CurrencyAPI
export interface CurrencyInfo {
  code: string;
  name: string;
}

//CurrenciesResponse - ответ от GET /v3/currencies
export interface CurrenciesResponse {
  data: {
    [code: string]: CurrencyInfo;
  };
}

//RateInfo - информация о курсе валюты
export interface RateInfo {
  code: string;
  value: number;
}

//RatesResponse - ответ от GET /v3/latest
export interface RatesResponse {
  data: {
    [code: string]: RateInfo;
  };
}

//RequestParams - параметры запроса к API
export interface RequestParams {
  base_currency?: string;
  currencies?: string;
}
