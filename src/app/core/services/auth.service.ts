import { HttpClient } from "@angular/common/http";
import { computed, inject, Injectable, signal } from "@angular/core";
import { AppConstants } from "../constants/app.constants";
import { catchError, map, Observable, of, tap, throwError } from "rxjs";

import type { IApiResponse, ILoginPayload, IRegisterPayload, ISendOtpPayload, IVerifyOtpPayload } from "../../features/auth/interfaces/auth.interface";
import type { IUser } from "../../features/auth/interfaces/user.interface";

type AuthStatus =
    | 'loading'
    | 'authenticated'
    | 'unauthenticated';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly _httpClient = inject(HttpClient);
    private readonly _api = `${AppConstants.domain}/auth`;

    private readonly _user = signal<IUser | null>(null);
    private readonly _status = signal<AuthStatus>('loading');

    readonly user = this._user.asReadonly();
    readonly status = this._status.asReadonly();

    readonly isAuthenticated = computed(
        () => this._status() === 'authenticated',
    );

    readonly isLoading = computed(
        () => this._status() === 'loading',
    );

    private _pendingRegistration: IRegisterPayload | null = null;

    setPendingRegistration(payload: IRegisterPayload): void {
        this._pendingRegistration = payload;
    }

    getPendingRegistration(): IRegisterPayload | null {
        return this._pendingRegistration;
    }

    clearPendingRegistration(): void {
        this._pendingRegistration = null;
    }

    sendOtp(payload: ISendOtpPayload): Observable<IApiResponse> {

        return this._httpClient.post<IApiResponse>(
            `${this._api}/send-otp`,
            payload
        );
    }

    verifyOtp(payload: IVerifyOtpPayload): Observable<IApiResponse> {

        return this._httpClient.post<IApiResponse>(
            `${this._api}/verify-otp`,
            payload
        );
    }

    register(payload: IRegisterPayload): Observable<IApiResponse> {

        return this._httpClient.post<IApiResponse>(
            `${this._api}/register`,
            payload
        ).pipe(
            tap((response) => {
                this._user.set(response.data);
                this._status.set('authenticated');
            }),
        );
    }

    login(payload: ILoginPayload): Observable<IApiResponse> {
        return this._httpClient.post<IApiResponse>(
            `${this._api}/login`,
            payload,
        ).pipe(
            tap((response) => {
                this._user.set(response.data);
                this._status.set('authenticated');
            }),
        );
    }

    // Restore the session after a browser reload.
    restoreSession(): Observable<IUser | null> {
        this._status.set('loading');

        return this._httpClient
            .get<IApiResponse<IUser>>(`${this._api}/me`)
            .pipe(
                map((response) => response.data),
                tap((user) => {
                    this._user.set(user);
                    this._status.set('authenticated');
                }),
                catchError(() => {
                    this._user.set(null);
                    this._status.set('unauthenticated');

                    return of(null);
                }),
            );
    }

    logout(): Observable<IApiResponse> {
        return this._httpClient
            .post<IApiResponse>(
                `${this._api}/logout`,
                {},
            )
            .pipe(
                tap(() => this.clearSession()),
            );
    }

    clearSession(): void {
        this._user.set(null);
        this._status.set('unauthenticated');
    }
}