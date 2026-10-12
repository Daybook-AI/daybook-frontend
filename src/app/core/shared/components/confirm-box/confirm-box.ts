import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ConfirmBoxVariant = 'danger' | 'warning' | 'info';

@Component({
    selector: 'app-confirm-box',
    standalone: true,
    templateUrl: './confirm-box.html',
    styleUrl: './confirm-box.scss',
})
export class ConfirmBoxComponent {
    @Input() title = 'Are you sure?';
    @Input() message = 'Do you want to continue?';

    @Input() confirmText = 'Confirm';
    @Input() cancelText = 'Cancel';

    @Input() variant: ConfirmBoxVariant = 'warning';
    @Input() isLoading = false;

    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    onConfirm(): void {
        if (this.isLoading) {
            return;
        }

        this.confirm.emit();
    }

    onCancel(): void {
        if (this.isLoading) {
            return;
        }

        this.cancel.emit();
    }
}