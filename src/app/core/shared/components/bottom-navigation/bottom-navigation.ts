import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-navigation.html',
  styles: ['.active { color: #D9A441; }'],
})
export class BottomNavigationComponent {
  readonly items = [
    { label: 'JOURNAL', route: '/journal', icon: 'journal' },
    { label: 'CHAT', route: '/chat', icon: 'chat' },
    { label: 'INSIGHTS', route: '/insights', icon: 'insights' },
  ] as const;
}
