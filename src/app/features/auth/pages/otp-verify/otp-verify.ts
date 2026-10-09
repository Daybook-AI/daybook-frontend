import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { IRegisterPayload } from '../../interfaces/auth.interface';

@Component({
  selector: 'app-otp-verify',
  imports: [ReactiveFormsModule],
  templateUrl: './otp-verify.html',
  styleUrl: './otp-verify.scss',
})
export class VerifyOtpComponent {
  private readonly _fb = inject(FormBuilder);
  private readonly _router = inject(Router);
  private readonly _authService = inject(AuthService);

  isLoading = false;
  isResending = false;

  errorMessage = '';
  successMessage = '';

  readonly otpForm = this._fb.group({
    otp: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\d{6}$/)
      ]
    ]
  });


  get email(): string {
    return this._authService.getPendingRegistration()?.email ?? '';
  }

  onOtpInput(): void {
    const value = this.otpForm.controls.otp.value ?? '';

    const numericValue = value
      .replace(/\D/g, '')
      .slice(0, 6);

    this.otpForm.controls.otp.setValue(
      numericValue,
      { emitEvent: false }
    );
  }


  verifyOtp(): void {

    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    const registration =
      this._authService.getPendingRegistration();

    if (!registration) {
      this._router.navigate(['/auth/register']);
      return;
    }

    const otp = this.otpForm.controls.otp.value;

    if (!otp) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this._authService.verifyOtp({
      email: registration.email,
      otp
    }).subscribe({

      next: () => {
        this.createAccount(registration);
      },

      error: (error) => {
        this.isLoading = false;

        this.errorMessage =
          error?.error?.message ??
          'Invalid or expired OTP.';
      }

    });
  }


  private createAccount(registration: IRegisterPayload): void {

    this._authService.register(registration).subscribe({

      next: () => {

        this.isLoading = false;

        this._authService.clearPendingRegistration();

        this._router.navigate(['/journal']);

      },

      error: (error) => {

        this.isLoading = false;

        this.errorMessage =
          error?.error?.message ??
          'Unable to create your account. Please try again.';
      }

    });
  }


  resendOtp(): void {

    const registration =
      this._authService.getPendingRegistration();

    if (!registration || this.isResending) {
      return;
    }

    this.isResending = true;
    this.errorMessage = '';
    this.successMessage = '';

    this._authService.sendOtp({
      email: registration.email
    }).subscribe({

      next: (response) => {

        this.isResending = false;

        this.successMessage =
          response.message || 'A new OTP has been sent.';
      },

      error: (error) => {

        this.isResending = false;

        this.errorMessage =
          error?.error?.message ??
          'Unable to resend OTP.';
      }

    });
  }


  goBack(): void {
    this._router.navigate(['/auth/register']);
  }
}
