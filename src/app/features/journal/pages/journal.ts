import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { JournalEntry } from '../interfaces/journal.interface';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-journal',
  imports: [FormsModule, CommonModule],
  templateUrl: './journal.html',
  styleUrl: './journal.scss',
})
export class JournalComponenet {
  private readonly _router = inject(Router);
  private readonly _authService = inject(AuthService);

  journalContent = '';
  isSaving = false;
  isProfileMenuOpen = false;
  isLoggingOut = false;

  reflectionPrompt = 'What has been taking up most of your mind lately?';

  entries: JournalEntry[] = [
    {
      id: 1,
      content:
        'Finally made progress on the project today. Realized stepping back and walking was what unlocked the architecture, not staring at the editor for hours.',
      category: 'Work',
      dateLabel: 'Today, 4:30 PM',
      aiTag: 'Clarity'
    },
    {
      id: 2,
      content:
        "I've been thinking about what really matters. Slowing down the pace of my evenings has made conversations with friends feel genuinely present again.",
      category: 'Personal',
      dateLabel: 'Yesterday, 8:15 PM',
      aiTag: 'Balance'
    }
  ];

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
      insights: '/insights'
    };

    this._router.navigate([routes[page]]);
  }

  useReflectionPrompt(): void {
    this.journalContent = this.reflectionPrompt;
    this.focusJournalInput();
  }

  focusJournalInput(): void {
    document.getElementById('journalContent')?.focus();
  }

  saveEntry(): void {
    const content = this.journalContent.trim();

    if (!content || this.isSaving) {
      return;
    }

    // Connect your journal service here.
    // Set isSaving = true while the request is in progress.
  }

  logout(): void {
    if (this.isLoggingOut) return;

    this.isLoggingOut = true;
    this.isProfileMenuOpen = false;

    this._authService.logout()
      .pipe(
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
          // Clear local authentication state even if
          // the logout request fails.
          this._authService.clearSession();

          this._router.navigate(['/auth/login'], {
            replaceUrl: true,
          });
        },
      });
  }
}
