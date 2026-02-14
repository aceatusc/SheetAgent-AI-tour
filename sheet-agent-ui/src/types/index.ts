export interface EnrichedWorkbook {
  sheets: Record<string, (string | number | null)[][]>;
  conditionalFormatting: Record<string, CFRule[]>;
  tables: Record<string, TableDef[]>;
  charts: Record<string, ChartDef[]>;
  chartImages: Record<string, string>;
  sheetNames: string[];
}

export interface CFRule {
  range: string;
  formula: string;
  fill?: string;
  fontColor?: string;
  type: string;
}

export interface TableDef {
  name: string;
  ref: string;
  displayName: string;
  hasTotalRow: boolean;
}

export interface ChartDef {
  type: 'bar' | 'column' | 'line' | 'pie' | 'area' | 'scatter';
  title: string;
  series: { name: string; data: (string | number)[] }[];
  categories: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}
