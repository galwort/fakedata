import { Component, Input } from '@angular/core';

// A story-grid card: sparkline in the topic's color, title, mono meta line.
// Set the accent with [style.--c] on the host; clicks bubble to the parent.
@Component({
  selector: 'fd-topic-card',
  standalone: true,
  template: `
    <svg class="sparkline" viewBox="0 0 120 36" aria-hidden="true">
      <polyline [attr.points]="points" vector-effect="non-scaling-stroke"></polyline>
      <circle [attr.cx]="endX" [attr.cy]="endY" r="2.5"></circle>
    </svg>
    <h3>{{ title }}</h3>
    <p class="meta">{{ meta }}</p>
  `,
  styles: [
    `
      :host {
        display: block;
        background: var(--fd-paper);
        border: 1px solid var(--fd-rule);
        border-top: 4px solid var(--c, var(--fd-ink));
        padding: 1.1rem 1.2rem 1.15rem;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      :host(:hover) {
        transform: translateY(-3px);
        box-shadow: 0 12px 24px rgba(26, 26, 26, 0.09);
      }

      :host(:hover) h3 {
        text-decoration: underline;
        text-decoration-color: var(--c, var(--fd-ink));
        text-decoration-thickness: 3px;
        text-underline-offset: 4px;
      }

      .sparkline {
        display: block;
        width: 100%;
        height: auto;
        margin-bottom: 0.8rem;
      }

      .sparkline polyline {
        fill: none;
        stroke: var(--c, var(--fd-ink));
        stroke-width: 2;
      }

      .sparkline circle {
        fill: var(--c, var(--fd-ink));
      }

      h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 700;
        line-height: 1.3;
      }

      h3::first-letter {
        text-transform: uppercase;
      }

      .meta {
        margin: 0.55rem 0 0;
        font-family: var(--fd-mono);
        font-size: 0.6875rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--fd-gray-light);
      }
    `,
  ],
})
export class TopicCardComponent {
  @Input() title = '';
  @Input() points = '';
  @Input() endX = 0;
  @Input() endY = 0;
  @Input() meta = '';
}
