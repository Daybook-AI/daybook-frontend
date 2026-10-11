import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-daybook-header',
  standalone: true,
  templateUrl: './daybook-header.html',
})
export class DaybookHeaderComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isProfileMenuOpen = false;
  isLoggingOut = false;

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  logout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isProfileMenuOpen = false;
    this.isLoggingOut = true;

    this.authService.logout()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoggingOut = false;
        }),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/auth/login'], { replaceUrl: true });
        },
        error: () => {
          this.authService.clearSession();
          this.router.navigate(['/auth/login'], { replaceUrl: true });
        },
      });
  }
}
