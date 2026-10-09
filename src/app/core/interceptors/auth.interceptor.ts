import {
    HttpErrorResponse,
    HttpInterceptorFn,
    HttpRequest,
    HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, filter, finalize, map, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { AppConstants } from '../constants/app.constants';
import { AuthService } from '../services/auth.service';

let refreshInFlight: Observable<void> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const authReq = req.clone({
        withCredentials: true,
    });

    return next(authReq).pipe(
        catchError((error: unknown) => {
            if (
                !(error instanceof HttpErrorResponse)
                || error.status !== 401
                || _isAuthEndpoint(req.url)
            ) {
                return throwError(() => error);
            }

            if (!refreshInFlight) {
                const refreshRequest = new HttpRequest(
                    'POST',
                    `${AppConstants.domain}/auth/refresh`,
                    {},
                    { withCredentials: true },
                );

                refreshInFlight = next(refreshRequest).pipe(
                    filter((event): event is HttpResponse<unknown> => event instanceof HttpResponse),
                    map(() => undefined),
                    finalize(() => {
                        refreshInFlight = null;
                    }),
                    shareReplay({ bufferSize: 1, refCount: false }),
                );
            }

            return refreshInFlight.pipe(
                switchMap(() => next(authReq)),
                catchError((refreshError: unknown) => {
                    authService.clearSession();
                    return throwError(() => refreshError);
                }),
            );
        }),
    );
};

function _isAuthEndpoint(url: string): boolean {
    return ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']
        .some((endpoint) => url.includes(endpoint));
}