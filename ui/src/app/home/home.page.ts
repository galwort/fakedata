import { Component, OnInit } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { environment } from 'src/environments/environment';

const app = initializeApp(environment.firebase);
const db = getFirestore(app);

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  topics: string[] = [];
  currentTopicIndex: number = 0;
  currentTopic: string = 'nothing... yet';

  constructor() {}

  ngOnInit() {
    this.fetchTopics();
  }

  async fetchTopics() {
    const querySnapshot = await getDocs(collection(db, 'topics'));
    this.topics = querySnapshot.docs.map((doc) => doc.id);
    this.startTopicRotation();
  }

  startTopicRotation() {
    if (this.topics.length > 0) {
      this.currentTopic = `${this.topics[this.currentTopicIndex]}`;
      setInterval(() => {
        this.currentTopicIndex =
          (this.currentTopicIndex + 1) % this.topics.length;
        this.currentTopic = `${this.topics[this.currentTopicIndex]}`;
      }, 5000);
    } else {
      this.currentTopic = 'nothing... yet';
    }
  }
}
