export interface ApiConfig {
  method: string;
  stream?: boolean;
  fields: Record<string, any>;
  count?: number;
  delay?: number | { max: number; min: number };
  query?: Record<string, any>;
  page?: string
  size?: string
  db?: boolean
  rowData?: string
}
