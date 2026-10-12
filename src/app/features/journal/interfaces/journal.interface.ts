import { IJournalDocument } from "../../../core/shared/interfaces/journal-document.interface";
import { IPaginationQuery } from "../../../core/shared/interfaces/pagination";

export interface IJournalEntry {
  id: number;
  content: string;
  category: string;
  dateLabel: string;
  aiTag: string | null;
}

export interface IJournalPayload {
  title: string;
  content: IJournalDocument;
  mood?: string;
  tags?: string[];
}

export interface IJournal {
  id: number;
  title: string;
  content: IJournalDocument;
  mood: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IJournalViewEntry {
  id: number;
  title: string;
  preview: string;
  time: string;
  mood: string;
  tags: string[];
  dateGroup: string;
}

export interface IJournalGroup {
  label: string;
  entries: IJournalViewEntry[];
}

export interface IJournalFilter {
  search?: string;
  mood?: string;
  tag?: string;
  from?: string;
  to?: string;
  sort?: 'asc' | 'desc';
}

export interface IJournalQuery {
  pagination?: IPaginationQuery;
  filters?: IJournalFilter;
}