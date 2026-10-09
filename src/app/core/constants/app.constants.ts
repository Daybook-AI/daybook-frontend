import { environment } from '../../../environments/environment';

export const AppConstants = {
    domain: environment.apiUrl,
} as const;