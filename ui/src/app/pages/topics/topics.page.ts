import { Component, OnInit } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { colorFor, topicTitle } from 'src/app/shared/palette';
import { FIRST_YEAR, seriesFor } from 'src/app/shared/trends';

const app = getApps().length ? getApp() : initializeApp(environment.firebase);
const db = getFirestore(app);

type SortField =
  | 'title'
  | 'insertMs'
  | 'modifiedMs'
  | 'runs'
  | 'avg'
  | 'peak'
  | 'peakYear';

interface TopicRow {
  id: string;
  title: string;
  color: string;
  formattedInsertTime: string;
  formattedModifiedTime: string;
  insertMs: number;
  modifiedMs: number;
  runs: number;
  hasData: boolean;
  avg: number;
  peak: number;
  peakYear: number;
  avgDisplay: string;
  peakDisplay: string;
  peakYearDisplay: string;
}

// Session cache so revisiting the page renders instantly while a fresh
// snapshot loads in the background.
let cachedRows: TopicRow[] | null = null;

@Component({
  selector: 'app-topics',
  templateUrl: './topics.page.html',
  styleUrls: ['./topics.page.scss'],
})
export class TopicsPage implements OnInit {
  topics: TopicRow[] = [];
  view: TopicRow[] = [];
  searchQuery = '';
  loaded = false;
  sortField: SortField = 'modifiedMs';
  sortAsc = false;

  constructor(private router: Router) {}

  ngOnInit() {
    if (cachedRows) {
      this.topics = cachedRows;
      this.applySort();
      this.loaded = true;
    }
    this.fetchTopics();
  }

  async fetchTopics() {
    const [topicsSnap, relevanceSnap] = await Promise.all([
      getDocs(collection(db, 'topics')),
      getDocs(collection(db, 'relevance')),
    ]);

    const recordsByTopic: Record<string, any[]> = {};
    for (const d of relevanceSnap.docs) {
      const data = d.data() as any;
      if (!data['topic']) continue;
      (recordsByTopic[data['topic']] ||= []).push(data);
    }

    cachedRows = topicsSnap.docs.map((doc) => {
      const data = doc.data() as any;
      const insertTime = data['insert_time']?.toDate?.();
      const modifiedTime = data['modified_time']?.toDate?.();

      const series = seriesFor(recordsByTopic[doc.id] ?? []);
      const hasData = series.some((v) => v > 0);
      let avg = 0;
      let peak = 0;
      let peakYear = 0;
      if (hasData) {
        let peakIndex = 0;
        series.forEach((v, i) => {
          if (v > series[peakIndex]) peakIndex = i;
        });
        avg = series.reduce((sum, v) => sum + v, 0) / series.length;
        peak = series[peakIndex];
        peakYear = FIRST_YEAR + peakIndex;
      }

      return {
        id: doc.id,
        title: topicTitle(doc.id),
        color: colorFor(doc.id),
        formattedInsertTime: this.formatDate(insertTime),
        formattedModifiedTime: this.formatDate(modifiedTime),
        insertMs: insertTime ? insertTime.getTime() : 0,
        modifiedMs: modifiedTime ? modifiedTime.getTime() : 0,
        runs: data['runs'] ?? 0,
        hasData,
        avg,
        peak,
        peakYear,
        avgDisplay: hasData ? `${Math.round(avg * 100)}%` : '—',
        peakDisplay: hasData ? `${Math.round(peak * 100)}%` : '—',
        peakYearDisplay: hasData ? `${peakYear}` : '—',
      };
    });
    this.topics = cachedRows;
    this.applySort();
    this.loaded = true;
  }

  private formatDate(date?: Date): string {
    return date
      ? `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
      : '';
  }

  sortBy(field: SortField) {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = field === 'title';
    }
    this.applySort();
  }

  private applySort() {
    const dir = this.sortAsc ? 1 : -1;
    const field = this.sortField;
    const isStat = field === 'avg' || field === 'peak' || field === 'peakYear';
    this.topics = [...this.topics].sort((a, b) => {
      // Topics with no relevance data sort last on stat columns either way.
      if (isStat && a.hasData !== b.hasData) return a.hasData ? -1 : 1;
      const av = a[field];
      const bv = b[field];
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * dir;
      }
      return ((av as number) - (bv as number)) * dir;
    });
    this.updateView();
  }

  updateView() {
    const query = this.searchQuery.trim().toLowerCase();
    this.view = query
      ? this.topics.filter((t) => t.title.toLowerCase().includes(query))
      : this.topics;
  }

  arrowFor(field: SortField): string {
    if (this.sortField !== field) return '';
    return this.sortAsc ? '▲' : '▼';
  }

  navigateToTopic(topicId: string) {
    this.router.navigate(['/on', topicId]);
  }
}
