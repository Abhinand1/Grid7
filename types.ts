export interface Article {
  id: string;
  source: string;
  headline: string;
  summary: string;
  fullArticle: string;
  timestamp: string; // ISO 8601 format
  category: 'AI' | 'OS' | 'Gadgets' | 'Other';
  groundingSources?: {
    uri: string;
    title: string;
  }[];
}

export interface LaunchEvent {
    brand: string;
    model: string;
    category: 'Mobile' | 'Laptop' | 'VR/AR' | 'OS' | 'Other';
    description?: string;
}

export interface TimelineData {
    date: string; // e.g., "October 2024" or "2024-10-15"
    launches: LaunchEvent[];
}