import { Component, OnDestroy, OnInit } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { colorFor, topicTitle } from 'src/app/shared/palette';

const app = getApps().length ? getApp() : initializeApp(environment.firebase);
const db = getFirestore(app);

const FIRST_YEAR = 1980;
const LAST_YEAR = 2020;
// How many recently-updated topics make the front page. Keep at or below 30,
// the limit for a Firestore 'in' query.
const LATEST_COUNT = 12;

interface TopicCard {
  id: string;
  title: string;
  color: string;
  meta: string;
  points: string;
  endX: number;
  endY: number;
  modifiedMs: number;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  cards: TopicCard[] = [];
  rotation: string[] = [];
  rotationIndex = 0;
  currentTopic = 'nothing... yet';
  accent = 'var(--fd-gold)';
  fading = false;
  private timer: any;

  constructor(private router: Router) {}

  ngOnInit() {
    this.fetchData();
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  async fetchData() {
    const topicsSnap = await getDocs(
      query(
        collection(db, 'topics'),
        orderBy('modified_time', 'desc'),
        limit(LATEST_COUNT)
      )
    );
    const ids = topicsSnap.docs.map((d) => d.id);

    const recordsByTopic: Record<string, any[]> = {};
    if (ids.length) {
      const relevanceSnap = await getDocs(
        query(collection(db, 'relevance'), where('topic', 'in', ids))
      );
      for (const d of relevanceSnap.docs) {
        const data = d.data() as any;
        if (!data['topic']) continue;
        (recordsByTopic[data['topic']] ||= []).push(data);
      }
    }

    this.cards = topicsSnap.docs.map((doc) => {
      const data = doc.data() as any;
      const modified = data['modified_time']?.toDate?.();
      const updated = modified
        ? `${
            modified.getMonth() + 1
          }/${modified.getDate()}/${modified.getFullYear()}`
        : '';
      const runs = data['runs'] ?? 0;
      const spark = this.sparkline(
        this.seriesFor(recordsByTopic[doc.id] ?? [])
      );
      return {
        id: doc.id,
        title: topicTitle(doc.id),
        color: colorFor(doc.id),
        meta: [updated && `Updated ${updated}`, `${runs} run${runs === 1 ? '' : 's'}`]
          .filter(Boolean)
          .join(' · '),
        modifiedMs: modified ? modified.getTime() : 0,
        ...spark,
      };
    });

    this.rotation = this.shuffle(this.cards.map((c) => c.id));
    this.startTopicRotation();
  }

  private seriesFor(records: any[]): number[] {
    const series: number[] = [];
    for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
      const record = records.find((r) => r[year.toString()] !== undefined);
      series.push(record ? record[year.toString()] : 0);
    }
    return series;
  }

  private sparkline(series: number[]) {
    const w = 120;
    const h = 36;
    const pad = 3;
    const step = (w - pad * 2) / (series.length - 1);
    const coords = series.map((v, i) => {
      const x = pad + i * step;
      const y = pad + (1 - Math.max(0, Math.min(1, v))) * (h - pad * 2);
      return [Number(x.toFixed(1)), Number(y.toFixed(1))];
    });
    const [endX, endY] = coords[coords.length - 1];
    return {
      points: coords.map(([x, y]) => `${x},${y}`).join(' '),
      endX,
      endY,
    };
  }

  private shuffle(items: string[]): string[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  startTopicRotation() {
    if (!this.rotation.length) return;
    this.applyTopic();
    this.timer = setInterval(() => {
      this.fading = true;
      setTimeout(() => {
        this.rotationIndex = (this.rotationIndex + 1) % this.rotation.length;
        this.applyTopic();
        this.fading = false;
      }, 250);
    }, 5000);
  }

  private applyTopic() {
    const id = this.rotation[this.rotationIndex];
    this.currentTopic = topicTitle(id);
    this.accent = colorFor(id);
  }

  navigateToTopic() {
    if (!this.rotation.length) return;
    this.router.navigate(['/on/', this.rotation[this.rotationIndex]]);
  }

  open(topicId: string) {
    this.router.navigate(['/on/', topicId]);
  }
}
