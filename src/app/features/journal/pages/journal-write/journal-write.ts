import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';

import { PendingChangesComponent } from '../../../../core/guards/pending-changes.guard';
import { JournalService } from '../../../../core/services/journal.service';
import {
  JournalDraftService,
  EMPTY_JOURNAL_DOCUMENT,
  countJournalCharacters,
  extractJournalText,
} from '../../../../core/services/journal-draft.service';
import {
  JournalEditorComponent,
} from '../../components/journal-editor/journal-editor';
import { IJournalDocument } from '../../../../core/shared/interfaces/journal-document.interface';
import { UnsavedChangesModalComponent } from '../../../../core/shared/components/unsaved-changes-modal/unsaved-changes-modal.component';
import { GoBackComponent } from '../../../../core/shared/components/go-back/go-back';
import { BottomNavigationComponent } from '../../../../core/shared/components/bottom-navigation/bottom-navigation';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyseButton } from '../../../entry-analysis/components/analyse-button/analyse-button';
import { EntryAnalysisComponent } from '../../../entry-analysis/components/entry-analyse/entry-analysis';
type JournalMode = 'create' | 'edit';

@Component({
  selector: 'app-journal-write-page',
  standalone: true,
  imports: [JournalEditorComponent, UnsavedChangesModalComponent, GoBackComponent, BottomNavigationComponent, AnalyseButton, EntryAnalysisComponent],
  templateUrl: './journal-write.html',
  styleUrl: './journal-write.scss',
})
export class JournalWritePageComponent implements OnInit, PendingChangesComponent {
  private readonly _router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly _journalService = inject(JournalService);
  private readonly _draftService = inject(JournalDraftService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _location = inject(Location)

  @ViewChild(JournalEditorComponent)
  editorComponent?: JournalEditorComponent;

  journalTitle = '';
  journalId: number | null = null;
  journalMood: string | undefined;
  journalTags: string[] | undefined;
  journalContent: IJournalDocument | null = EMPTY_JOURNAL_DOCUMENT;
  saveError = '';
  isSaving = false;
  isLoadingEntry = false;
  loadError = '';
  menuOpen = false;
  isDirty = false;
  showUnsavedChangesModal = false;
  pendingNavigationUrl: string | null = null;
  allowDeactivate = false;
  readonly todayLabel = new Date().toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  journalMode: JournalMode = 'create';

  ngOnInit(): void {
    this._draftService.draft$
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((draftState) => {
        if (this.journalMode === 'create') {
          this.journalTitle = draftState.title ?? '';
          this.journalContent = draftState.content;
        }
      });

    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        distinctUntilChanged(),
        switchMap((routeId) => {
          this.saveError = '';
          this.loadError = '';
          this.isDirty = false;
          this.menuOpen = false;

          if (routeId === null) {
            return of({ kind: 'create' as const });
          }

          this.journalId = null;
          this.journalMode = 'edit';
          this.journalTitle = '';
          this.journalContent = null;
          this.journalMood = undefined;
          this.journalTags = undefined;

          const parsedId = Number(routeId);
          if (!Number.isInteger(parsedId) || parsedId <= 0) {
            return of({ kind: 'invalid' as const });
          }

          this.journalId = parsedId;
          this.isLoadingEntry = true;

          return this._journalService.findOne(parsedId).pipe(
            map(({ data: journal }) => ({
              kind: 'loaded' as const,
              id: parsedId,
              journal,
            })),
            catchError(() => of({ kind: 'error' as const, id: parsedId })),
          );
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe((result) => {
        this.isLoadingEntry = false;

        if (result.kind === 'create') {
          this.journalId = null;
          this.journalMode = 'create';
          const draft = this._draftService.snapshot;
          this.journalTitle = draft.title ?? '';
          this.journalContent = draft.content;
          this.journalMood = undefined;
          this.journalTags = undefined;
          return;
        }

        if (result.kind === 'invalid') {
          this.journalId = null;
          this.journalMode = 'edit';
          this.journalContent = null;
          this.loadError = 'This journal entry could not be found.';
          return;
        }

        if (result.kind === 'error') {
          this.journalId = result.id;
          this.journalMode = 'edit';
          this.journalContent = null;
          this.loadError = 'Unable to load this journal entry. Please try again.';
          return;
        }

        this.journalId = result.id;
        this.journalMode = 'edit';
        this.journalTitle = result.journal.title ?? '';
        this.journalContent = result.journal.content;
        this.journalMood = result.journal.mood ?? undefined;
        this.journalTags = result.journal.tags;
      });
  }

  get characterCount(): number {
    return countJournalCharacters(this.journalContent);
  }

  get hasTextContent(): boolean {
    return extractJournalText(this.journalContent).length > 0;
  }

  get editorContent(): IJournalDocument {
    return this.journalContent ?? EMPTY_JOURNAL_DOCUMENT;
  }

  get isJournalReady(): boolean {
    return this.journalContent !== null;
  }

  get canSaveEntry(): boolean {
    return !this.isSaving
      && typeof this.journalTitle === 'string'
      && this.journalTitle.trim().length > 0
      && this.isJournalReady;
  }

  hasContentChanged(text: string): boolean {
    const originalText = extractJournalText(this.journalContent);
    return JSON.stringify(originalText) === JSON.stringify(originalText);
  }

  canDeactivate(): boolean {
    if (this.isSaving) {
      return false;
    }

    if (!this.isDirty) {
      return true;
    }

    this.pendingNavigationUrl = 'back';
    this.showUnsavedChangesModal = true;

    return false;
  }

  @HostListener('window:beforeunload', ['$event'])
  protectAgainstPageUnload(event: BeforeUnloadEvent): void {
    if (this.isDirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  onTitleChange(): void {
    this.isDirty = true;
    this.persistDraft();
  }

  onTitleInput(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.journalTitle = input.value;
      this.onTitleChange();
    }
  }

  onJournalContentChange(content: IJournalDocument): void {
    if (JSON.stringify(content) === JSON.stringify(this.journalContent)) {
      return;
    }

    this.journalContent = content;
    this.isDirty = true;
    this.persistDraft();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  saveDraft(): void {
    if (this.journalMode !== 'create') {
      return;
    }
    this.persistDraft();
    this.menuOpen = false;
  }

  clearFormatting(): void {
    this.editorComponent?.clearFormatting();
    this.menuOpen = false;
    this.isDirty = true;
    this.persistDraft();
  }

  keepWriting(): void {
    this.showUnsavedChangesModal = false;
    this.pendingNavigationUrl = null;
    this.allowDeactivate = false;
  }

  discardChanges(): void {
    this.showUnsavedChangesModal = false;
    this.allowDeactivate = true;

    if (this.journalId === null) {
      this._draftService.clear();
    }

    this.menuOpen = false;
    this.isDirty = false;

    const targetUrl = this.pendingNavigationUrl;
    this.pendingNavigationUrl = null;

    if (targetUrl === 'back') {
      this.navigateBack();
      return;
    }

    this._router.navigateByUrl(targetUrl ?? '/journal');
  }

  discardDraft(): void {
    this.pendingNavigationUrl = '/journal';

    if (this.isDirty) {
      this.showUnsavedChangesModal = true;
      return;
    }

    if (this.journalId === null) {
      this._draftService.clear();
    }
    this.menuOpen = false;
    this.isDirty = false;
    this._router.navigate(['/journal']);
  }

  backToJournal(): void {
    if (this.isDirty) {
      this.pendingNavigationUrl = 'back';
      this.showUnsavedChangesModal = true;
      return;
    }

    this.navigateBack();
  }

  private navigateBack(): void {
    if (window.history.length > 1) {
      this._location.back();
    } else {
      this._router.navigate(['/journal']);
    }
  }

  saveEntry(): void {
    const title = (this.journalTitle ?? '').trim();
    const content = this.journalContent;

    if (this.isSaving || !title || content === null) {
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    this.pendingNavigationUrl = null;

    const payload = {
      title,
      content,
      mood: this.journalMood,
      tags: this.journalTags,
    };
    const journalId = this.journalId;
    const onSaveSuccess = () => {
      this.isSaving = false;
      if (journalId === null) {
        this._draftService.clear();
      }
      this.isDirty = false;
      this.showUnsavedChangesModal = false;

      if (journalId) {
        this._router.navigate(['/journal/list']);
        return;
      }

      this._router.navigate(['/journal']);
    };
    const onSaveError = () => {
      this.isSaving = false;
      this.saveError = 'Unable to save your journal. Please try again.';
    };

    if (journalId === null) {
      this._journalService.create(payload).subscribe({
        next: onSaveSuccess,
        error: onSaveError,
      });
    } else {
      this._journalService.update(journalId, payload).subscribe({
        next: onSaveSuccess,
        error: onSaveError,
      });
    }
  }

  private persistDraft(): void {
    if (this.journalId === null && this.journalContent !== null) {
      this._draftService.update(this.journalTitle, this.journalContent);
    }
  }
}
