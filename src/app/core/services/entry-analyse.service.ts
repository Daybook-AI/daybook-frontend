import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AppConstants } from '../constants/app.constants';
import { Observable } from 'rxjs';
import { IApiResponse } from '../../features/auth/interfaces/auth.interface';

@Injectable({
  providedIn: 'root',
})
export class EntryAnalyseService {
  private readonly _httpClient = inject(HttpClient);
  private readonly _apiUrl = `${AppConstants.domain}/analyse`;

  generateAnalysis(journalId: number): Observable<IApiResponse> {
    return this._httpClient.post<IApiResponse>(this._apiUrl, { journalId });
  }
}
