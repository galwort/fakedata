import { Component, Input } from '@angular/core';
import { DEFAULT_TOPIC_ICON } from './topic-icons';

let nextTopicIconId = 0;

@Component({
  selector: 'fd-topic-icon',
  standalone: true,
  template: `
    <svg
      class="topic-icon-svg"
      viewBox="0 0 64 64"
      [style.color]="color"
      [attr.aria-label]="label || null"
      [attr.aria-hidden]="label ? null : 'true'"
      role="img"
    >
      <defs>
        <filter [attr.id]="filterId" x="-18%" y="-18%" width="136%" height="136%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.085 0.12"
            numOctaves="2"
            [attr.seed]="noiseSeed"
            result="noise"
          ></feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="0.42"
            xChannelSelector="R"
            yChannelSelector="G"
          ></feDisplacementMap>
        </filter>
      </defs>

      <path
        class="wash"
        [attr.filter]="filterUrl(filterId)"
        d="M15.5 15.3C24.8 5.9 42.4 5.4 50.9 15.2c9 10.4 3.7 29.1-8.6 35.9-12.9 7.1-29.5 1.2-35-10.3-4.5-9.4 1.3-18.3 8.2-25.5z"
      ></path>
      <text class="glyph glyph-fill" x="32" y="34" [attr.filter]="filterUrl(filterId)">
        {{ displayIcon }}
      </text>
      <text class="glyph glyph-line" x="32" y="34" [attr.filter]="filterUrl(filterId)">
        {{ displayIcon }}
      </text>
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-grid;
        width: var(--topic-icon-size, 3rem);
        height: var(--topic-icon-size, 3rem);
        color: var(--fd-blue);
        flex: 0 0 auto;
      }

      .topic-icon-svg {
        display: block;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      .wash {
        fill: color-mix(in srgb, currentColor 18%, white);
        opacity: 0.74;
      }

      .glyph {
        font-family: 'Material Symbols Outlined', 'Material Icons';
        font-feature-settings: 'liga';
        font-variation-settings: 'FILL' 1, 'wght' 650, 'GRAD' 0, 'opsz' 48;
        font-size: 34px;
        text-anchor: middle;
        dominant-baseline: central;
      }

      .glyph-fill {
        fill: currentColor;
        stroke: var(--fd-ink);
        stroke-width: 0.24px;
        paint-order: stroke fill;
      }

      .glyph-line {
        fill: none;
        stroke: var(--fd-ink);
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.35px;
      }

    `,
  ],
})
export class TopicIconComponent {
  @Input() icon = DEFAULT_TOPIC_ICON;
  @Input() color = 'var(--fd-blue)';
  @Input() label = '';

  private readonly componentId = nextTopicIconId++;
  readonly filterId = `topic-icon-filter-${this.componentId}`;
  readonly noiseSeed = (this.componentId % 17) + 3;

  get displayIcon(): string {
    return this.icon?.trim() || DEFAULT_TOPIC_ICON;
  }

  filterUrl(id: string): string {
    return `url(#${id})`;
  }
}
