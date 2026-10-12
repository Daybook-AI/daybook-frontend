import { Injectable } from '@angular/core';
import { debounceTime, distinctUntilChanged, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DebounceService {
  debounce<T>(
    source$: Observable<T>,
    delay = 300,
  ): Observable<T> {
    return source$.pipe(
      debounceTime(delay),
      distinctUntilChanged(),
    );
  }
}