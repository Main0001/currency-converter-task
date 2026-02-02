//Объект с кодами валют и их курсами
export interface ExchangeRates {
  [currency: string]: number;
}

//RatesCache - структура кеша курсов валют в Firestore
export interface RatesCache {
  base: string;              // Базовая валюта (USD, EUR, etc)
  rates: ExchangeRates;      // Курсы валют
  cached_at: number;         // Когда закешировано
  expires_at: number;        // Когда истекает кеш
}
