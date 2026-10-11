import { Component, ElementRef, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { IJournalEntry } from '../../interfaces/journal.interface';
import { JournalService } from '../../../../core/services/journal.service';
import { finalize, map, Subject, takeUntil } from 'rxjs';
import { extractJournalText } from '../../../../core/services/journal-draft.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-recent-journals',
  imports: [],
  templateUrl: './recents.html',
  styleUrl: './recents.scss',
})
export class RecentsJournalComponent implements OnInit {
  private readonly _router = inject(Router);
  private readonly _journalService = inject(JournalService);
  private readonly _elementRef = inject(ElementRef);
  private readonly _destroy$ = new Subject<void>();

  @Input({ required: true }) isLoading!: boolean;
  @Output() openEditorEvent = new EventEmitter();

  entries: IJournalEntry[] = [];

  ngOnInit(): void {
    this.loadEntries();
  }

  get hostElement(): HTMLElement {
    return this._elementRef.nativeElement;
  }

  openEditor() {
    this.openEditorEvent.emit();
  }

  openEntry(id: string | number): void {
    this._router.navigate(['/journal', id]);
  }

  viewAllEntries(): void {
    this._router.navigate(['journal/list']);
  }

  loadEntries(): void {
    this.isLoading = true;

    this._journalService.findAll()
      .pipe(
        takeUntil(this._destroy$),
        finalize(() => {
          this.isLoading = false;
        }),
        map((res) => res.data)
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
      });
  }

  private formatDate(value: string): string {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

}
