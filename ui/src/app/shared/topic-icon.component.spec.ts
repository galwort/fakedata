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
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const glyph = host.querySelector('.glyph');

    expect(glyph?.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
    expect(glyph?.textContent?.trim()).toBe('energy_savings_leaf');
    expect(host.querySelector('svg text')).toBeNull();
  });

  it('uses the default icon for an empty value', () => {
    component.icon = '   ';
    fixture.detectChanges();

    const glyph = fixture.nativeElement.querySelector('.glyph') as HTMLElement;
    expect(glyph.textContent?.trim()).toBe(DEFAULT_TOPIC_ICON);
  });
});
