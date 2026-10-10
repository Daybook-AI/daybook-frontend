import { CanDeactivateFn } from '@angular/router';

export interface PendingChangesComponent {
  canDeactivate: () => boolean;
}

export const pendingChangesGuard: CanDeactivateFn<PendingChangesComponent> = (
  component,
) => component ? component.canDeactivate() : true;
