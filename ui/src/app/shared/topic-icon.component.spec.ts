import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DEFAULT_TOPIC_ICON } from './topic-icons';
import { TopicIconComponent } from './topic-icon.component';

describe('TopicIconComponent', () => {
  let component: TopicIconComponent;
  let fixture: ComponentFixture<TopicIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopicIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TopicIconComponent);
    component = fixture.componentInstance;
  });

  it('renders the Material Symbols ligature as HTML outside the SVG', () => {
    component.icon = 'energy_savings_leaf';
    component.label = 'Renewable energy';
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const glyphs = Array.from(host.querySelectorAll('.glyph'));
    const icon = host.querySelector('.glyph-stack');

    expect(glyphs.length).toBe(2);
    expect(host.querySelector('.glyph-fill')).toBeTruthy();
    expect(host.querySelector('.glyph-line')).toBeTruthy();
    for (const glyph of glyphs) {
      expect(glyph.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
      expect(glyph.textContent?.trim()).toBe('energy_savings_leaf');
      expect(glyph.getAttribute('aria-hidden')).toBe('true');
    }
    expect(icon?.getAttribute('role')).toBe('img');
    expect(icon?.getAttribute('aria-label')).toBe('Renewable energy');
    expect(host.querySelectorAll('[role="img"]').length).toBe(1);
    expect(host.querySelector('svg text')).toBeNull();
  });

  it('uses the default icon for an empty value', () => {
    component.icon = '   ';
    fixture.detectChanges();

    const glyphs = fixture.nativeElement.querySelectorAll('.glyph');
    expect(glyphs.length).toBe(2);
    for (const glyph of Array.from(glyphs) as HTMLElement[]) {
      expect(glyph.textContent?.trim()).toBe(DEFAULT_TOPIC_ICON);
    }
    expect(
      fixture.nativeElement
        .querySelector('.glyph-stack')
        .getAttribute('aria-hidden')
    ).toBe('true');
  });
});
