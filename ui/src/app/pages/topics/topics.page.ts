import { Component, OnInit } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { colorFor, topicTitle } from 'src/app/shared/palette';

const app = getApps().length ? getApp() : initializeApp(environment.firebase);
const db = getFirestore(app);

type SortField = 'title' | 'insertMs' | 'modifiedMs' | 'runs';

interface TopicRow {
  id: string;
  title: string;
  color: string;
  formattedInsertTime: string;
  formattedModifiedTime: string;
  insertMs: number;
  modifiedMs: number;
  runs: number;
}

@Component({
  selector: 'app-topics',
  templateUrl: './topics.page.html',
  styleUrls: ['./topics.page.scss'],
})
export class TopicsPage implements OnInit {
  topics: TopicRow[] = [];
  sortField: SortField = 'modifiedMs';
  sortAsc = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.fetchTopics();
  }

  async fetchTopics() {
    const querySnapshot = await getDocs(collection(db, 'topics'));
    this.topics = querySnapshot.docs.map((doc) => {
      const data = doc.data() as any;
      const insertTime = data['insert_time']?.toDate?.();
      const modifiedTime = data['modified_time']?.toDate?.();
      return {
        id: doc.id,
        title: topicTitle(doc.id),
        color: colorFor(doc.id),
        formattedInsertTime: this.formatDate(insertTime),
        formattedModifiedTime: this.formatDate(modifiedTime),
        insertMs: insertTime ? insertTime.getTime() : 0,
        modifiedMs: modifiedTime ? modifiedTime.getTime() : 0,
        runs: data['runs'] ?? 0,
      };
    });
    this.applySort();
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
    this.topics = [...this.topics].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * dir;
      }
      return ((av as number) - (bv as number)) * dir;
    });
  }

  arrowFor(field: SortField): string {
    if (this.sortField !== field) return '';
    return this.sortAsc ? '▲' : '▼';
  }

  navigateToTopic(topicId: string) {
    this.router.navigate(['/on', topicId]);
  }
}
