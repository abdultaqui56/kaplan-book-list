import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface NavItem {
  label: string;
  icon: 'content' | 'courses';
  hasChildren?: boolean;
}

/**
 * Application chrome: collapsible sidebar + top bar.
 * Purely presentational; page content is projected via <ng-content>.
 */
@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  readonly collapsed = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Content management', icon: 'content', hasChildren: true },
    { label: 'Courses', icon: 'courses' },
  ];

  toggleSidebar(): void {
    this.collapsed.update((c) => !c);
  }
}
