import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { PendingChangesComponent } from '../../../../core/guards/pending-changes.guard';
import { JournalService } from '../../../../core/services/journal.service';
import {
  JournalDraftService,
  countJournalCharacters,
  extractJournalText,
} from '../../../../core/services/journal-draft.service';
import {
  IJournalDocument,
  JournalEditorComponent,
} from '../../../../core/shared/components/journal-editor/journal-editor';
import { UnsavedChangesModalComponent } from '../../../../core/shared/components/unsaved-changes-modal/unsaved-changes-modal.component';

@Component({
  selector: 'app-journal-write-page',
  standalone: true,
  imports: [JournalEditorComponent, UnsavedChangesModalComponent],
  templateUrl: './journal-write.html',
  styleUrl: './journal-write.scss',
})
export class JournalWritePageComponent implements OnInit, OnDestroy, PendingChangesComponent {
  private readonly router = inject(Router);
  private readonly journalService = inject(JournalService);
  private readonly draftService = inject(JournalDraftService);
  private readonly destroy$ = new Subject<void>();

  @ViewChild(JournalEditorComponent)
  editorComponent?: JournalEditorComponent;

  journalTitle = '';
  journalContent: IJournalDocument = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  };
  saveError = '';
  isSaving = false;
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

  ngOnInit(): void {
    const draft = this.draftService.snapshot;
    this.journalTitle = draft.title;
    this.journalContent = draft.content;

    this.draftService.draft$
      .pipe(takeUntil(this.destroy$))
      .subscribe((draftState) => {
        this.journalTitle = draftState.title;
        this.journalContent = draftState.content;
      });
  }

  get characterCount(): number {
    return countJournalCharacters(this.journalContent);
  }

  get hasTextContent(): boolean {
    return extractJournalText(this.journalContent).length > 0;
  }

  canDeactivate(): boolean {
    if (this.isSaving) {
      return false;
    }

    if (!this.isDirty) {
      return true;
    }

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

  onJournalContentChange(content: IJournalDocument): void {
    this.journalContent = content;
    this.isDirty = true;
    this.persistDraft();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  saveDraft(): void {
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
    this.draftService.clear();
    this.menuOpen = false;
    this.isDirty = false;

    const targetUrl = this.pendingNavigationUrl ?? '/journal';
    this.pendingNavigationUrl = null;

    this.router.navigateByUrl(targetUrl);
  }

  discardDraft(): void {
    this.pendingNavigationUrl = '/journal';

    if (this.isDirty) {
      this.showUnsavedChangesModal = true;
      return;
    }

    this.draftService.clear();
    this.menuOpen = false;
    this.isDirty = false;
    this.router.navigate(['/journal']);
  }

  backToJournal(): void {
    if (!this.isDirty) {
      this.router.navigate(['/journal']);
      return;
    }

    this.pendingNavigationUrl = '/journal';
    this.showUnsavedChangesModal = true;
  }

  saveEntry(): void {
    const title = this.journalTitle.trim();
    const content = this.journalContent;

    if (this.isSaving || !title) {
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    this.pendingNavigationUrl = null;

    this.journalService.create({
      title,
      content,
    })
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.draftService.clear();
          this.isDirty = false;
          this.showUnsavedChangesModal = false;
          this.router.navigate(['/journal']);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = 'Unable to save your journal. Please try again.';
        },
      });
  }

  private persistDraft(): void {
    this.draftService.update(this.journalTitle, this.journalContent);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
