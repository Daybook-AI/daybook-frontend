
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  expand,
  finalize,
  Subject,
  switchMap,
  tap,
  toArray,
} from 'rxjs';

import { DaybookHeaderComponent } from '../../../../core/shared/components/daybook-header/daybook-header';
import { BottomNavigationComponent } from '../../../../core/shared/components/bottom-navigation/bottom-navigation';
import { PaginationComponent } from '../../../../core/shared/components/pagination/pagination';
import { JournalService } from '../../../../core/services/journal.service';
import {
  IJournal,
  IJournalGroup,
  IJournalViewEntry,
} from '../../interfaces/journal.interface';
import { extractJournalText } from '../../../../core/services/journal-draft.service';
import { GoBackComponent } from '../../../../core/shared/components/go-back/go-back';
import { IJournalDocument } from '../../../../core/shared/interfaces/journal-document.interface';
import { Router } from '@angular/router';
import { DebounceService } from '../../../../core/services/debounce.service';

interface IJournalListEntry extends IJournalViewEntry {
  createdAt: Date;
  updatedAt: Date;
  timestamp: number;
}

@Component({
  selector: 'app-all-journals',
  imports: [
    CommonModule,
    FormsModule,
    DaybookHeaderComponent,
    BottomNavigationComponent,
    PaginationComponent,
    GoBackComponent,
  ],
  templateUrl: './all-journals.html',
})
export class AllJournalsComponent implements OnInit {
  private readonly _journalService = inject(JournalService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _router = inject(Router);
  private readonly _debounceService = inject(DebounceService);

  searchQuery = '';
  selectedMood = 'All';
  selectedTag = 'All';
  selectedSort: 'asc' | 'desc' = 'desc';

  currentPage = 1;
  pageSize = 10;

  showDateFilter = false;
  showTagFilter = false;

  dateFrom = '';
  dateTo = '';

  appliedDateFrom = '';
  appliedDateTo = '';

  isLoading = false;
  totalEntries = 0;

  journalGroups: IJournalGroup[] = [];
  allEntries: IJournalListEntry[] = [];
  private readonly _searchSubject = new Subject<string>();
  private readonly _loadEntriesSubject = new Subject<void>();

  ngOnInit(): void {
    this._debounceService
      .debounce(this._searchSubject, 400)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((query) => {
        this.searchQuery = query;
        this.currentPage = 1;
        this.loadEntries();
      });

    this._loadEntriesSubject
      .pipe(
        switchMap(() => {
          this.isLoading = true;

          const requestLimit = this.pageSize;
          const filters = {
            search: this.searchQuery.trim(),
            mood: this.selectedMood,
            tag: this.selectedTag,
            from: this.appliedDateFrom,
            to: this.appliedDateTo,
            sort: this.selectedSort,
          };

          let requestedPage = 1;
          const loadPage = (page: number) =>
            this._journalService.findAll({
              filters,
              pagination: {
                limit: requestLimit,
                page,
              },
            });

          return loadPage(requestedPage).pipe(
            expand((response) =>
              response.data.length === requestLimit
                ? loadPage(++requestedPage)
                : EMPTY,
            ),
            toArray(),
            tap((responses) => {
              const journals = responses.flatMap((response) => response.data);

              this.allEntries = journals.map((journal) =>
                this._mapJournalToEntry(journal),
              );
              this.journalGroups = this._mapJournalsToGroups(journals);
              this.totalEntries = journals.length;
              this._normalizeCurrentPage();
            }),
            finalize(() => {
              this.isLoading = false;
            }),
          );
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe();

    this.loadEntries();
  }

  // All available tags, derived from the loaded journal entries.
  get availableTags(): string[] {
    const tags = this.allEntries.flatMap((entry) =>
      entry.tags.map((tag) => tag.replace(/^#/, '')),
    );

    return ['All', ...new Set(tags).values()];
  }

  get totalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.allEntries.length / this.pageSize),
    );
  }

  get paginatedEntries(): IJournalListEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;

    return this.allEntries.slice(start, start + this.pageSize);
  }

  // Rebuild date groups from the currently visible page.
  get filteredGroups(): IJournalGroup[] {
    const groups = new Map<string, IJournalGroup>();

    for (const entry of this.paginatedEntries) {
      const label = this._getJournalGroupLabel(entry.updatedAt);
      const group = groups.get(label) ?? { label, entries: [] };

      group.entries.push(entry);
      groups.set(label, group);
    }

    return [...groups.values()];
  }

  get visibleEntryCount(): number {
    return this.paginatedEntries.length;
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchQuery.trim() ||
      this.appliedDateFrom ||
      this.appliedDateTo ||
      this.selectedMood !== 'All' ||
      this.selectedTag !== 'All' ||
      this.selectedSort !== 'desc'
    );
  }

  get showingFrom(): number {
    return this.allEntries.length === 0
      ? 0
      : (this.currentPage - 1) * this.pageSize + 1;
  }

  get showingTo(): number {
    return Math.min(
      this.currentPage * this.pageSize,
      this.allEntries.length,
    );
  }

  onSearchChange(value: string): void {
    this._searchSubject.next(value.trim());
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this._searchSubject.next('');
    this.loadEntries();
  }

  openEntry(entry: IJournalViewEntry): void {
    console.log('Open journal:', entry.id);
    // Later: navigate to /journal/:id
  }

  createEntry(): void {
    console.log('Create a new journal entry');
    // Later: navigate to /journal/write
  }

  goBack(): void {
    console.log('Go back to dashboard');
    // Later: use Angular Router or Location
  }

  openEntryMenu(entry: IJournalViewEntry, event: Event): void {
    event.stopPropagation();
    console.log('Open menu for:', entry.id);
  }

  loadEntries(): void {
    this._loadEntriesSubject.next();
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
    this.loadEntries();
  }

  applyDateFilter(): void {
    if (
      this.dateFrom &&
      this.dateTo &&
      this.dateFrom > this.dateTo
    ) {
      return;
    }

    this.appliedDateFrom = this.dateFrom;
    this.appliedDateTo = this.dateTo;

    this.currentPage = 1;
    this.showDateFilter = false;
    this.loadEntries();
  }

  clearDateFilter(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.appliedDateFrom = '';
    this.appliedDateTo = '';

    this.currentPage = 1;
    this.showDateFilter = false;
    this.loadEntries();
  }

  selectTag(tag: string): void {
    this.selectedTag = tag;
    this.showTagFilter = false;
    this.currentPage = 1;
    this.loadEntries();
  }

  toggleSort(): void {
    this.selectedSort =
      this.selectedSort === 'desc'
        ? 'asc'
        : 'desc';

    this.currentPage = 1;
    this.loadEntries();
  }

  clearFilters(): void {
    this.searchQuery = '';

    this.dateFrom = '';
    this.dateTo = '';
    this.appliedDateFrom = '';
    this.appliedDateTo = '';

    this.selectedMood = 'All';
    this.selectedTag = 'All';
    this.selectedSort = 'desc';

    this.currentPage = 1;
    this.showDateFilter = false;
    this.showTagFilter = false;
    this._searchSubject.next('');
    this.loadEntries();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToHome(): void {
    this._router.navigate(['/journal'])
  }

  private _normalizeCurrentPage(): void {
    this.currentPage = Math.min(
      Math.max(1, this.currentPage),
      this.totalPages,
    );
  }

  private _mapJournalToEntry(journal: IJournal): IJournalListEntry {
    const createdAt = new Date(journal.createdAt);
    const updatedAt = new Date(journal.updatedAt);

    return {
      id: journal.id,
      title: journal.title,
      preview: this._getJournalGroupPreview(journal.content),
      time: this._getJournalGroupTime(updatedAt),
      mood: journal.mood ?? '',
      tags: this._getJournalGroupTags(journal.tags),
      dateGroup: this._getJournalGroupLabel(updatedAt),
      createdAt,
      updatedAt,
      timestamp: updatedAt.getTime(),
    };
  }

  private _mapJournalsToGroups(journals: IJournal[]): IJournalGroup[] {
    const groups = new Map<string, IJournalGroup>();

    for (const journal of journals) {
      const date = new Date(journal.updatedAt);
      const label = this._getJournalGroupLabel(date);
      const group = groups.get(label) ?? { label, entries: [] };

      group.entries.push({
        id: journal.id,
        title: journal.title,
        preview: this._getJournalGroupPreview(journal.content),
        time: this._getJournalGroupTime(date),
        mood: journal.mood ?? '',
        tags: this._getJournalGroupTags(journal.tags),
        dateGroup: label,
      });

      groups.set(label, group);
    }

    return [...groups.values()];
  }

  private _getJournalGroupLabel(date: Date): string {
    const today = new Date();

    const dateKey = this._getDateKey(date);
    const todayKey = this._getDateKey(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateKey === todayKey) {
      return 'TODAY';
    }

    if (dateKey === this._getDateKey(yesterday)) {
      return 'YESTERDAY';
    }

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
  }

  private _getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private _getJournalGroupTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  private _getJournalGroupTags(tags: string[]): string[] {
    return tags.map((tag) => `#${tag.replace(/^#/, '')}`);
  }

  private _getJournalGroupPreview(content: IJournalDocument): string {
    const text = extractJournalText(content).trim();

    if (text.length <= 80) {
      return text;
    }

    return `${text.slice(0, 80).trimEnd()}...`;
  }
}
