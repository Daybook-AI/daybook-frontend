
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, expand, finalize, tap, toArray } from 'rxjs';

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

  private _allEntries: IJournalListEntry[] = [];

  ngOnInit(): void {
    this.loadEntries();
  }

  // All available tags, derived from the loaded journal entries.
  get availableTags(): string[] {
    const tags = this._allEntries.flatMap((entry) =>
      entry.tags.map((tag) => tag.replace(/^#/, '')),
    );

    return ['All', ...new Set(tags).values()];
  }

  // Apply all filters and sorting before pagination.
  get filteredEntries(): IJournalListEntry[] {
    const query = this.searchQuery.trim().toLowerCase();

    const fromDate = this.appliedDateFrom
      ? new Date(`${this.appliedDateFrom}T00:00:00`).getTime()
      : null;

    const toDate = this.appliedDateTo
      ? new Date(`${this.appliedDateTo}T23:59:59.999`).getTime()
      : null;

    return this._allEntries
      .filter((entry) => {
        const matchesSearch =
          !query ||
          entry.title.toLowerCase().includes(query) ||
          entry.preview.toLowerCase().includes(query) ||
          entry.tags.some((tag) =>
            tag.toLowerCase().includes(query),
          );

        const matchesMood =
          this.selectedMood === 'All' ||
          entry.mood === this.selectedMood;

        const matchesTag =
          this.selectedTag === 'All' ||
          entry.tags.some(
            (tag) => tag.replace(/^#/, '') === this.selectedTag,
          );

        const matchesFrom =
          fromDate === null || entry.timestamp >= fromDate;

        const matchesTo =
          toDate === null || entry.timestamp <= toDate;

        return (
          matchesSearch &&
          matchesMood &&
          matchesTag &&
          matchesFrom &&
          matchesTo
        );
      })
      .sort((a, b) =>
        this.selectedSort === 'desc'
          ? b.timestamp - a.timestamp
          : a.timestamp - b.timestamp,
      );
  }

  get totalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredEntries.length / this.pageSize),
    );
  }

  get paginatedEntries(): IJournalListEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;

    return this.filteredEntries.slice(start, start + this.pageSize);
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
    return this.filteredEntries.length === 0
      ? 0
      : (this.currentPage - 1) * this.pageSize + 1;
  }

  get showingTo(): number {
    return Math.min(
      this.currentPage * this.pageSize,
      this.filteredEntries.length,
    );
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
    this.isLoading = true;

    const requestLimit = this.pageSize;
    let requestedPage = 1;
    const loadPage = (page: number) =>
      this._journalService.findAll({
        filters: {},
        pagination: {
          limit: requestLimit,
          page,
        },
      });

    loadPage(requestedPage)
      .pipe(
        expand((response) =>
          response.data.length === requestLimit
            ? loadPage(++requestedPage)
            : EMPTY,
        ),
        toArray(),
        takeUntilDestroyed(this._destroyRef),
        finalize(() => {
          this.isLoading = false;
        }),
        tap((responses) => {
          const journals = responses.flatMap((response) => response.data);

          this._allEntries = journals.map((journal) =>
            this._mapJournalToEntry(journal),
          );

          this.journalGroups = this._mapJournalsToGroups(journals);
          this.totalEntries = journals.length;

          // Keep pagination valid if the loaded dataset changes.
          this._normalizeCurrentPage();
        }),
      )
      .subscribe();
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
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
  }

  clearDateFilter(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.appliedDateFrom = '';
    this.appliedDateTo = '';

    this.currentPage = 1;
    this.showDateFilter = false;
  }

  selectTag(tag: string): void {
    this.selectedTag = tag;
    this.showTagFilter = false;
    this.currentPage = 1;
  }

  toggleSort(): void {
    this.selectedSort =
      this.selectedSort === 'desc'
        ? 'asc'
        : 'desc';

    this.currentPage = 1;
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
