
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import {
  JournalDraftService,
  countJournalCharacters,
  createJournalDocumentFromText,
  extractJournalText,
} from '../../../../core/services/journal-draft.service';
import { IJournalDocument } from '../../../../core/shared/components/journal-editor/journal-editor';
import { JournalService } from '../../../../core/services/journal.service';
import { IJournalEntry } from '../../interfaces/journal.interface';

@Component({
  selector: 'app-journal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './journal.html',
  styleUrl: './journal.scss',
})
export class JournalComponenet implements OnInit, OnDestroy {
  private readonly _router = inject(Router);
  private readonly _authService = inject(AuthService);
  private readonly _journalService = inject(JournalService);
  private readonly _draftService = inject(JournalDraftService);
  private readonly _destroy$ = new Subject<void>();

  journalTitle = '';
  journalContent: IJournalDocument = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  };
  quickComposerText = '';

  isSaving = false;
  isLoadingEntries = false;
  isProfileMenuOpen = false;
  isLoggingOut = false;
  isDirty = false;

  saveError = '';
  entries: IJournalEntry[] = [];

  reflectionPrompt = 'What has been taking up most of your mind lately?';

  readonly todayLabel = new Date().toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  ngOnInit(): void {
    const draft = this._draftService.snapshot;
    this.journalTitle = draft.title;
    this.journalContent = draft.content;
    this.quickComposerText = extractJournalText(draft.content);

    this._draftService.draft$
      .pipe(takeUntil(this._destroy$))
      .subscribe((draftState) => {
        this.journalTitle = draftState.title;
        this.journalContent = draftState.content;
        this.quickComposerText = extractJournalText(draftState.content);
      });

    this.loadEntries();
  }

  get hasDraftContent(): boolean {
    return extractJournalText(this.journalContent).length > 0;
  }

  get draftPreview(): string {
    return extractJournalText(this.journalContent);
  }

  get totalCharacters(): number {
    return countJournalCharacters(this.journalContent);
  }

  openEditor(): void {
    this.persistDraft();
    this.isProfileMenuOpen = false;
    this.saveError = '';
    this._router.navigate(['/journal/write']);
  }

  onTitleChange(): void {
    this.isDirty = true;
    this.persistDraft();
  }

  onQuickComposerInput(event: Event): void {
    const nextValue = (event.target as HTMLTextAreaElement).value;
    this.quickComposerText = nextValue;
    this.journalContent = createJournalDocumentFromText(nextValue);
    this.isDirty = true;
    this.persistDraft();
  }

  saveEntry(): void {
    const title = this.journalTitle.trim();
    const content = this.journalContent;

    if (this.isSaving || !title) {
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    this._journalService.create({ title, content })
      .pipe(
        takeUntil(this._destroy$),
        finalize(() => {
          this.isSaving = false;
        }),
      )
      .subscribe({
        next: () => {
          this.resetDraft();
          this.loadEntries();
        },
        error: () => {
          this.saveError = 'Unable to save your journal. Please try again.';
        },
      });
  }

  useReflectionPrompt(): void {
    this.journalTitle = 'Daily reflection';
    this.journalContent = createJournalDocumentFromText(this.reflectionPrompt);
    this.quickComposerText = this.reflectionPrompt;
    this.isDirty = true;
    this.persistDraft();
    this.openEditor();
  }

  // -----------------------------
  // Journal API
  // -----------------------------

  loadEntries(): void {
    this.isLoadingEntries = true;

    this._journalService.findAll()
      .pipe(
        takeUntil(this._destroy$),
        finalize(() => {
          this.isLoadingEntries = false;
        }),
      )
      .subscribe({
        next: (journals) => {
          this.entries = journals.map((journal) => ({
            id: journal.id,
            content: extractJournalText(journal.content),
            category: journal.tags?.[0] ?? 'Personal',
            dateLabel: this.formatDate(journal.createdAt),
            aiTag: null,
          }));
        },
        error: () => {
          // Do not erase existing entries if a refresh fails.
        },
      });
  }

  private resetDraft(): void {
    this.journalTitle = '';
    this.quickComposerText = '';
    this.journalContent = {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    };
    this.isDirty = false;
    this._draftService.clear();
  }

  private persistDraft(): void {
    this._draftService.update(this.journalTitle, this.journalContent);
  }

  // -----------------------------
  // Dashboard actions
  // -----------------------------

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  viewAllEntries(): void {
    this._router.navigate(['/journal']);
  }

  openEntry(id: string | number): void {
    this._router.navigate(['/journal', id]);
  }

  navigateTo(page: 'journal' | 'chat' | 'insights'): void {
    const routes = {
      journal: '/journal',
      chat: '/chat',
      insights: '/insights',
    };

    this._router.navigate([routes[page]]);
  }

  // -----------------------------
  // Helpers
  // -----------------------------

  private formatDate(value: string): string {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  // -----------------------------
  // Authentication
  // -----------------------------

  logout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;
    this.isProfileMenuOpen = false;

    this._authService.logout()
      .pipe(
        takeUntil(this._destroy$),
        finalize(() => {
          this.isLoggingOut = false;
        }),
      )
      .subscribe({
        next: () => {
          this._router.navigate(['/auth/login'], {
            replaceUrl: true,
          });
        },
        error: () => {
          this._authService.clearSession();

          this._router.navigate(['/auth/login'], {
            replaceUrl: true,
          });
        },
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
