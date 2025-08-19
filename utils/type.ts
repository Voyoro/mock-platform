export interface ApiConfig {
  fields: Record<string, any>;
  count?: number;
  delay?: number | { max: number; min: number };
  query?: Record<string, any>;
}
