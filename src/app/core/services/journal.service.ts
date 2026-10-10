
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { IJournal, IJournalPayload } from '../../features/journal/interfaces/journal.interface';


@Injectable({ providedIn: 'root' })
export class JournalService {
    private readonly http = inject(HttpClient);
    private readonly api = '/api/journals';

    create(payload: IJournalPayload): Observable<IJournal> {
        return this.http.post<IJournal>(
            this.api,
            payload,
        );
    }

    findAll(): Observable<IJournal[]> {
        return this.http.get<IJournal[]>(
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
