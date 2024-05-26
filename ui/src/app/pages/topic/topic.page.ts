import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { environment } from 'src/environments/environment';
import { Chart, registerables } from 'chart.js';

const app = initializeApp(environment.firebase);
const db = getFirestore(app);

@Component({
  selector: 'app-topic',
  templateUrl: './topic.page.html',
  styleUrls: ['./topic.page.scss'],
})
export class TopicPage implements OnInit {
  topic!: string;
  records: any[] = [];
  chart: any;

  constructor(private route: ActivatedRoute) {
    Chart.register(...registerables);
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.topic = params.get('topic')!;
      this.fetchRecords().then(() => this.initializeChart());
    });
  }

  async fetchRecords() {
    const relevanceCollection = collection(db, 'relevance');
    const q = query(relevanceCollection, where('topic', '==', this.topic));
    const querySnapshot = await getDocs(q);
    this.records = querySnapshot.docs.map((doc) => doc.data());
  }

  initializeChart() {
    const years = Array.from({ length: 41 }, (_, i) => (1980 + i).toString());
    const scores = years.map((year) => {
      const record = this.records.find((r) => r[year] !== undefined);
      return record ? record[year] : 0;
    });

    const relevanceChart = document.getElementById(
      'chart'
    ) as HTMLCanvasElement;
    this.chart = new Chart('relevanceChart', {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Relevance',
            data: scores,
            borderColor: 'hsl(43, 94%, 61%)',
            borderWidth: 6,
            pointRadius: 0,
          },
        ],
      },
      options: {
        scales: {
          x: {
            ticks: {
              color: 'white',
              maxTicksLimit: 10,
              font: {
                size: 20,
              },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              display: false,
              stepSize: 0.2,
            },
            grid: {
              display: true,
              color: 'rgba(255, 255, 255, 0.2)',
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  }
}
