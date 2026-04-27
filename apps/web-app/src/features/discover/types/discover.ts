export interface StockInfo {
  logo: string;
  name: string;
  description: string;

  summary?: string;

  buyInfo?: {
    platform: string;
    url: string;

    description?: string;
  };
}
