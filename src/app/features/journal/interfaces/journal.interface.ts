export interface JournalEntry {
  id: string | number;
  content: string;
  category: 'Personal' | 'Work' | 'Health';
  dateLabel: string;
  aiTag?: string;
}