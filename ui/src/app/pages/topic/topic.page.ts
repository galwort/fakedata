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
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 1.0,
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
