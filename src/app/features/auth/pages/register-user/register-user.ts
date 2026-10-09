import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IRegisterPayload } from '../../interfaces/auth.interface';

@Component({
  selector: 'app-register-user',
  imports: [ReactiveFormsModule],
  templateUrl: './register-user.html',
  styleUrl: './register-user.scss',
})
export class RegisterComponent {
  private readonly _router = inject(Router);
  private readonly _fb = inject(FormBuilder);
  private readonly _authService = inject(AuthService);

  showPassword = false;
  showConfirmPassword = false;

  registerFormGroup = this._fb.group(
    {
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(4),
          Validators.maxLength(25),
          Validators.pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/)]
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(25),
          Validators.pattern(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/
          )
        ]
      ],

      confirmPassword: [
        '',
        [
          Validators.required
        ]
      ],

      terms: [
        false,
        Validators.requiredTrue
      ]
    },
    {
      validators: this.passwordMatchValidator
    }
  );

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword
      ? null
      : { passwordMismatch: true };
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.registerFormGroup.invalid) {
      this.registerFormGroup.markAllAsTouched();
      return;
    }

    const { username, email, password } = this.registerFormGroup.getRawValue();

    const payload: IRegisterPayload = {
      username: username!,
      email: email!,
      password: password!
    };

    this._authService.sendOtp({
      email: payload.email
    }).subscribe({
      next: () => {

        this._authService.setPendingRegistration(payload);

        this._router.navigate([
          '/auth/verify-otp'
        ]);
      },

      error: (error) => {
        console.error(error);
      }
    });
  }
}
