import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { TopicIconComponent } from './topic-icon.component';

// A story-grid card: sparkline in the topic's color, title, mono meta line.
// Set the accent with [style.--c] on the host; clicks bubble to the parent.
@Component({
  selector: 'fd-topic-card',
  standalone: true,
  imports: [NgIf, TopicIconComponent],
  template: `
    <div class="card-top" [class.no-icon]="!showIcon">
      <fd-topic-icon
        *ngIf="showIcon"
        class="card-icon"
        [icon]="icon"
        [color]="color"
        [label]="title"
      ></fd-topic-icon>
      <svg class="sparkline" viewBox="0 0 120 36" aria-hidden="true">
        <polyline [attr.points]="points" vector-effect="non-scaling-stroke"></polyline>
        <circle [attr.cx]="endX" [attr.cy]="endY" r="2.5"></circle>
      </svg>
    </div>
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

      .card-top {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 0.85rem;
        margin-bottom: 0.8rem;
      }

      .card-icon {
        --topic-icon-size: 3.1rem;
      }

      .card-top.no-icon {
        display: block;
        margin-bottom: 0.9rem;
      }

      .card-top.no-icon .sparkline {
        height: 42px;
      }

      .sparkline {
        display: block;
        width: 100%;
        height: auto;
        min-width: 0;
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
        overflow-wrap: anywhere;
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
  @Input() icon = 'category';
  @Input() color = 'var(--fd-blue)';
  @Input() showIcon = false;
  @Input() points = '';
  @Input() endX = 0;
  @Input() endY = 0;
  @Input() meta = '';
}
