import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import type { IJournalDocument } from '../shared/interfaces/journal-document.interface';

export interface JournalDraftState {
  title: string;
  content: IJournalDocument;
}

export const EMPTY_JOURNAL_DOCUMENT: IJournalDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function extractJournalText(document: IJournalDocument | null | undefined): string {
  const visited = new Set<object>();
  const texts: string[] = [];

  const walk = (node: Record<string, unknown> | null | undefined): void => {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);

    if (typeof node['text'] === 'string') {
      texts.push(node['text']);
    }

    if (Array.isArray(node['content'])) {
      for (const child of node['content']) {
        if (child && typeof child === 'object' && !Array.isArray(child)) {
          walk(child as Record<string, unknown>);
        }
      }
    }
  };

  walk(document as Record<string, unknown> | null | undefined);

  return texts.join(' ').trim();
}

export function countJournalCharacters(document: IJournalDocument | null | undefined): number {
  return extractJournalText(document).length;
}

export function createJournalDocumentFromText(value: string): IJournalDocument {
  const text = value ?? '';

  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
}

@Injectable({ providedIn: 'root' })
export class JournalDraftService {
  private readonly draftSubject = new BehaviorSubject<JournalDraftState>({
    title: '',
    content: EMPTY_JOURNAL_DOCUMENT,
  });

  readonly draft$ = this.draftSubject.asObservable();

  get snapshot(): JournalDraftState {
    return this.draftSubject.value;
  }

  setDraft(draft: Partial<JournalDraftState> | null | undefined): void {
    const nextDraft: JournalDraftState = {
      title: draft?.title ?? this.snapshot.title,
      content: draft?.content ?? this.snapshot.content,
    };

    this.draftSubject.next(nextDraft);
  }

  update(title: string, content: IJournalDocument): void {
    this.draftSubject.next({
      title,
      content,
    });
  }

  clear(): void {
    this.draftSubject.next({
      title: '',
      content: EMPTY_JOURNAL_DOCUMENT,
    });
  }

  hasContent(): boolean {
    return countJournalCharacters(this.snapshot.content) > 0 || !!this.snapshot.title.trim();
  }
}
