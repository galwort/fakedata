import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from 'firebase/firestore';
import { environment } from 'src/environments/environment';
import { Chart, registerables } from 'chart.js';
import { colorFor, topicTitle } from 'src/app/shared/palette';

const app = getApps().length ? getApp() : initializeApp(environment.firebase);
const db = getFirestore(app);

const FIRST_YEAR = 1980;
const LAST_YEAR = 2020;
const MONO = "'Roboto Mono', 'SFMono-Regular', Consolas, monospace";

@Component({
  selector: 'app-on',
  templateUrl: './on.page.html',
  styleUrls: ['./on.page.scss'],
})
export class OnPage implements OnInit {
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

  constructor(private route: ActivatedRoute) {
    Chart.register(...registerables);
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.topic = params.get('topic')!;
      this.topic_title = topicTitle(this.topic);
      this.color = colorFor(this.topic);
      this.fetchTopicMeta();
      this.fetchRecords().then(() => this.initializeChart());
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
    const scores = years.map((year) => {
      const record = this.records.find((r) => r[year] !== undefined);
      return record ? record[year] : 0;
    });

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
