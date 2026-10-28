import { TestBed } from '@angular/core/testing';

import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  it('toggles the sidebar collapsed state', async () => {
    await TestBed.configureTestingModule({ imports: [ShellComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    const toggle = el.querySelector<HTMLButtonElement>('.sidebar__toggle')!;
    expect(el.querySelector('.shell--collapsed')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    await fixture.whenStable();

    expect(el.querySelector('.shell--collapsed')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
