export interface NewsArticle {
  id: string;
  source: string;
  headline: string;
  summary: string;
  fullArticle: string;
  timestamp: string;
  category: 'AI' | 'OS' | 'Gadgets' | 'Other';
  groundingSources?: { uri: string; title: string }[];
}

export interface Launch {
    brand: string;
    model: string;
    category: string;
    description?: string;
}

export interface LaunchDate {
    date: string;
    launches: Launch[];
}
