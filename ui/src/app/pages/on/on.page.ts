import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  limit,
  orderBy,
  startAt,
  documentId,
} from 'firebase/firestore';
import { environment } from 'src/environments/environment';
import { Chart, registerables } from 'chart.js';
import { colorFor, topicTitle } from 'src/app/shared/palette';
import {
  FIRST_YEAR,
  LAST_YEAR,
  seriesFor,
  sparkline,
  pearson,
} from 'src/app/shared/trends';

const app = getApps().length ? getApp() : initializeApp(environment.firebase);
const db = getFirestore(app);

const MONO = "'Roboto Mono', 'SFMono-Regular', Consolas, monospace";
// Sample size for the similar-trends comparison and the minimum correlation
// a topic needs to qualify as "similar".
const SAMPLE_SIZE = 200;
const MIN_MATCH = 0.5;

interface SimilarCard {
  id: string;
  title: string;
  color: string;
  meta: string;
  points: string;
  endX: number;
  endY: number;
}

@Component({
  selector: 'app-on',
  templateUrl: './on.page.html',
  styleUrls: ['./on.page.scss'],
})
export class OnPage implements OnInit {
  @ViewChild(IonContent) content?: IonContent;

  topic = '';
  topic_title = 'nothing... yet';
  records: any[] = [];
  chart: any;
  color = '#1a1a1a';
  updated = '';
  runs = 0;
  hasData = false;
  peakYear = '';
  peakPct = 0;
  latestPct = 0;
  lastYear = LAST_YEAR;
  similar: SimilarCard[] = [];
  private currentSeries: number[] = [];

  constructor(private route: ActivatedRoute, private router: Router) {
    Chart.register(...registerables);
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.topic = params.get('topic')!;
      this.topic_title = topicTitle(this.topic);
      this.color = colorFor(this.topic);
      this.similar = [];
      this.content?.scrollToTop(0);
      this.fetchTopicMeta();
      this.fetchRecords().then(() => {
        this.initializeChart();
        this.fetchSimilar();
      });
    });
  }

  async fetchTopicMeta() {
    const snapshot = await getDoc(doc(db, 'topics', this.topic));
    const data = snapshot.data() as any;
    if (!data) return;
    this.runs = data['runs'] ?? 0;
    const modified = data['modified_time']?.toDate?.();
    this.updated = modified
      ? `${
          modified.getMonth() + 1
        }/${modified.getDate()}/${modified.getFullYear()}`
      : '';
  }

  async fetchRecords() {
    const relevanceCollection = collection(db, 'relevance');
    const q = query(relevanceCollection, where('topic', '==', this.topic));
    const querySnapshot = await getDocs(q);
    this.records = querySnapshot.docs.map((doc) => doc.data());
  }

  initializeChart() {
    const years = Array.from(
      { length: LAST_YEAR - FIRST_YEAR + 1 },
      (_, i) => (FIRST_YEAR + i).toString()
    );
    const scores = seriesFor(this.records);
    this.currentSeries = scores;

    this.computeStats(years, scores);

    const canvas = document.getElementById(
      'relevanceChart'
    ) as HTMLCanvasElement;
    if (!canvas) {
      console.error('Failed to find the canvas element');
      return;
    }

    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Relevance',
            data: scores,
            borderColor: this.color,
            borderWidth: 3,
            tension: 0,
            fill: false,
            pointRadius: scores.map((_, i) =>
              i === scores.length - 1 ? 4 : 0
            ),
            pointBackgroundColor: this.color,
            pointBorderColor: this.color,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: this.color,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 8, right: 16 } },
        interaction: { intersect: false, mode: 'index' },
        scales: {
          x: {
            grid: { display: false },
            border: { color: '#1a1a1a', width: 2 },
            ticks: {
              color: '#888888',
              maxTicksLimit: 9,
              maxRotation: 0,
              font: { family: MONO, size: 12 },
            },
          },
          y: {
            min: 0,
            max: 1,
            border: { display: false },
            grid: { color: '#e2e2e2', drawTicks: false },
            ticks: {
              color: '#888888',
              stepSize: 0.25,
              padding: 8,
              callback: (value) => `${Math.round((value as number) * 100)}%`,
              font: { family: MONO, size: 12 },
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            backgroundColor: '#1a1a1a',
            padding: 12,
            cornerRadius: 0,
            caretSize: 0,
            titleFont: { family: MONO, size: 12 },
            bodyFont: { family: MONO, size: 13, weight: 700 },
            callbacks: {
              title: () => '',
              label: (context) => {
                const year = context.label;
                const value = context.raw as number;
                return `${year} · ${Math.round(value * 100)}%`;
              },
            },
          },
        },
      },
    });
  }

  // Correlate this topic's curve against a sample of other topics and keep
  // the closest shapes. A sample keeps Firestore reads bounded — the archive
  // holds thousands of topics.
  async fetchSimilar() {
    if (!this.hasData) return;
    const requested = this.topic;

    // Relevance doc ids start with the topic name, so a plain limit() would
    // always sample the same alphabetical head. Start at a random letter and
    // top up from the beginning when the window lands near the end.
    const randomStart = String.fromCharCode(
      97 + Math.floor(Math.random() * 26)
    );
    const sampleSnap = await getDocs(
      query(
        collection(db, 'relevance'),
        orderBy(documentId()),
        startAt(randomStart),
        limit(SAMPLE_SIZE)
      )
    );
    let sampleDocs = sampleSnap.docs;
    if (sampleDocs.length < SAMPLE_SIZE) {
      const topUpSnap = await getDocs(
        query(
          collection(db, 'relevance'),
          orderBy(documentId()),
          limit(SAMPLE_SIZE - sampleDocs.length)
        )
      );
      sampleDocs = sampleDocs.concat(topUpSnap.docs);
    }

    const recordsByTopic: Record<string, any[]> = {};
    for (const d of sampleDocs) {
      const data = d.data() as any;
      const id = data['topic'];
      if (!id || id === requested) continue;
      (recordsByTopic[id] ||= []).push(data);
    }

    const matches = Object.entries(recordsByTopic)
      .map(([id, records]) => {
        const series = seriesFor(records);
        const r = pearson(this.currentSeries, series);
        return r === null ? null : { id, series, r };
      })
      .filter(
        (m): m is { id: string; series: number[]; r: number } =>
          m !== null && m.r >= MIN_MATCH
      )
      .sort((a, b) => b.r - a.r)
      .slice(0, 3);

    // A click may have navigated to another topic while we were fetching.
    if (this.topic !== requested) return;

    this.similar = matches.map((m) => ({
      id: m.id,
      title: topicTitle(m.id),
      color: colorFor(m.id),
      meta: `r = ${m.r.toFixed(3)}`,
      ...sparkline(m.series),
    }));
  }

  open(topicId: string) {
    this.router.navigate(['/on', topicId]);
  }

  private computeStats(years: string[], scores: number[]) {
    this.hasData = scores.some((s) => s > 0);
    if (!this.hasData) return;
    let peakIndex = 0;
    scores.forEach((s, i) => {
      if (s > scores[peakIndex]) peakIndex = i;
    });
    this.peakYear = years[peakIndex];
    this.peakPct = Math.round(scores[peakIndex] * 100);
    this.latestPct = Math.round(scores[scores.length - 1] * 100);
  }
}
