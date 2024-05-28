import { Component, OnInit } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { environment } from 'src/environments/environment';

const app = initializeApp(environment.firebase);
const db = getFirestore(app);

@Component({
  selector: 'app-topics',
  templateUrl: './topics.page.html',
  styleUrls: ['./topics.page.scss'],
})
export class TopicsPage implements OnInit {
  topics: any[] = [];

  constructor() {}

  ngOnInit() {
    this.fetchTopics();
  }

  async fetchTopics() {
    const querySnapshot = await getDocs(collection(db, 'topics'));
    this.topics = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      const insertTime = data['insert_time']?.toDate();
      const formattedInsertTime = insertTime
        ? `${
            insertTime.getMonth() + 1
          }/${insertTime.getDate()}/${insertTime.getFullYear()}`
        : '';
      const modifiedTime = data['modified_time']?.toDate();
      const formattedModifiedTime = modifiedTime
        ? `${
            modifiedTime.getMonth() + 1
          }/${modifiedTime.getDate()}/${modifiedTime.getFullYear()}`
        : '';
      return {
        id: doc.id,
        ...data,
        formattedInsertTime,
        formattedModifiedTime,
      };
    });
  }
}
