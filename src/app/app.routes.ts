import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
    {
        path: 'auth',
        canActivate: [guestGuard],
        children: [

            {
                path: 'register',
                loadComponent: () =>
                    import('../app/features/auth/pages/register-user/register-user')
                        .then(m => m.RegisterComponent)
            },

            {
                path: 'verify-otp',
                loadComponent: () =>
                    import('../app/features/auth/pages/otp-verify/otp-verify')
                        .then(m => m.VerifyOtpComponent)
            },

            {
                path: 'login',
                loadComponent: () =>
                    import('../app/features/auth/pages/login/login')
                        .then(m => m.LoginComponent)
            }

        ]
    },

    {
        path: 'journal',
        canActivate: [authGuard],
        loadComponent: () =>
            import('../app/features/journal/pages/journal')
                .then(c => c.JournalComponenet)
    },

    {
        path: '',
        redirectTo: 'auth/login',
        pathMatch: 'full'
    },
    {
        path: 'auth',
        redirectTo: 'auth/login',
        pathMatch: 'full'
    },

    {
        path: '**',
        redirectTo: 'auth/login'
    }
];
