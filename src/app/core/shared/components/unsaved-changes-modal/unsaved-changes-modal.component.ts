import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-unsaved-changes-modal',
  standalone: true,
  templateUrl: './unsaved-changes-modal.component.html',
  styleUrl: './unsaved-changes-modal.component.scss',
})
export class UnsavedChangesModalComponent {
  @Output() stay = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
}
