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
import { seriesFor, sparkline } from 'src/app/shared/trends';

const app = getApps().length ? getApp() : initializeApp(environment.firebase);
const db = getFirestore(app);

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
  loaded = false;
  rotation: string[] = [];
  rotationIndex = 0;
  currentTopic = '';
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
      const spark = sparkline(seriesFor(recordsByTopic[doc.id] ?? []));
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
    this.loaded = true;
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
