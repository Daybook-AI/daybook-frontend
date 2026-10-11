
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { IJournal, IJournalPayload } from '../../features/journal/interfaces/journal.interface';
import { AppConstants } from '../constants/app.constants';
import { IApiResponse } from '../../features/auth/interfaces/auth.interface';


@Injectable({ providedIn: 'root' })
export class JournalService {
    private readonly http = inject(HttpClient);
    private readonly api = `${AppConstants.domain}/journal`;

    create(payload: IJournalPayload): Observable<IApiResponse<IJournal>> {
        return this.http.post<IApiResponse<IJournal>>(
            this.api,
            payload,
        );
    }

    findAll(): Observable<IApiResponse<IJournal[]>> {
        return this.http.get<IApiResponse<IJournal[]>>(
            this.api,
        );
    }

    findOne(id: number): Observable<IJournal> {
        return this.http.get<IJournal>(
            `${this.api}/${id}`,
        );
    }

    update(id: number, payload: IJournalPayload): Observable<IJournal> {
        return this.http.patch<IJournal>(
            `${this.api}/${id}`,
            payload,
        );
    }

    remove(id: number): Observable<void> {
        return this.http.delete<void>(
            `${this.api}/${id}`,
        );
    }
}
