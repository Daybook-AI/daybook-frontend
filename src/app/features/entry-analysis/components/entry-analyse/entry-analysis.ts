import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import {
  LucideChevronDown,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideClock,
  LucideLoaderCircle,
  LucideRefreshCw,
  LucideSparkles,
} from '@lucide/angular';
import { IEntryAnalysis } from '../../interfaces/entry-analysis';
import { EntryAnalyseService } from '../../../../core/services/entry-analyse.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-entry-analysis',
  standalone: true,
  imports: [
    LucideChevronDown,
    LucideCircleAlert,
    LucideCircleCheck,
    LucideLoaderCircle,
    LucideClock,
    LucideRefreshCw,
    LucideSparkles,
  ],
  templateUrl: './entry-analysis.html',
  styleUrl: './entry-analysis.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryAnalysisComponent {
  private readonly _entryAnalysisService = inject(EntryAnalyseService);
  private readonly _destroyRef = inject(DestroyRef);

  @Input({ required: true }) journalId!: number;

  analysis: IEntryAnalysis | null = null;
  expanded = signal<boolean>(false);
  isOutdated = signal<boolean>(false);
  isAnalyzing = signal<boolean>(false);
  error: string | null = null;

  toggleExpanded(): void {
    this.expanded.update(value => !value);

    if (this.expanded() === true) {
      this.regenerateAnalysis();
    }
  }

  regenerateAnalysis(): void {
    if (this.isAnalyzing()) {
      return;
    }

    this.isAnalyzing.set(true);
    this.error = null;

    this._entryAnalysisService
      .generateAnalysis(this.journalId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => this.isAnalyzing.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.analysis = res.data;
          this.isOutdated.set(false);
        },
        error: (err) => {
          console.error('Entry analysis failed:', err);
          this.error = 'Failed to analyse your entry. Please try again.';
        },
      });
  }

  get formattedCreatedAt(): string {
    if (!this.analysis?.createdAt) {
      return '';
    }

    const date = new Date(this.analysis.createdAt);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }
}