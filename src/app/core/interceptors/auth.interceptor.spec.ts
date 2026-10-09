import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
    let httpTesting: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
            ],
        });
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    it('refreshes once and retries a request rejected by an expired access token', () => {
        let response: unknown;
        TestBed.inject(AuthService);
        const http = TestBed.inject(HttpClient);

        http.get('/api/private').subscribe((value) => {
            response = value;
        });

        httpTesting.expectOne('/api/private').flush(
            { message: 'expired' },
            { status: 401, statusText: 'Unauthorized' },
        );

        const refreshRequest = httpTesting.expectOne(
            'http://localhost:3000/api/auth/refresh',
        );
        expect(refreshRequest.request.method).toBe('POST');
        expect(refreshRequest.request.withCredentials).toBeTrue();
        refreshRequest.flush({ status: 'success' });

        const retry = httpTesting.expectOne('/api/private');
        expect(retry.request.withCredentials).toBeTrue();
        retry.flush({ ok: true });

        expect(response).toEqual({ ok: true });
    });

    it('does not attempt refresh for authentication endpoint failures', () => {
        const http = TestBed.inject(HttpClient);
        const authService = TestBed.inject(AuthService);

        http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
        httpTesting.expectOne('/api/auth/login').flush(
            { message: 'invalid credentials' },
            { status: 401, statusText: 'Unauthorized' },
        );
        httpTesting.expectNone('http://localhost:3000/api/auth/refresh');
        expect(authService.status()).toBe('loading');
    });
});
