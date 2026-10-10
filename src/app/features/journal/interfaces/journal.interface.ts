import { IJournalDocument } from "../../../core/shared/components/journal-editor/journal-editor";

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