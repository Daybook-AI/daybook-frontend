import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-go-back',
  standalone: true,
  templateUrl: './go-back.html',
})
export class GoBackComponent {
  label = input<string>('');
  ariaLabel = input<string>('Go back');

  backClick = output<void>();
}