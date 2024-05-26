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
    this.shuffleTopics();
    this.startTopicRotation();
  }

  shuffleTopics() {
    for (let i = this.topics.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.topics[i], this.topics[j]] = [this.topics[j], this.topics[i]];
    }
  }

  startTopicRotation() {
    if (this.topics.length > 0) {
      this.currentTopic = this.topics[this.currentTopicIndex].replace(
        /-/g,
        ' '
      );
      setInterval(() => {
        this.currentTopicIndex =
          (this.currentTopicIndex + 1) % this.topics.length;
        this.currentTopic = this.topics[this.currentTopicIndex].replace(
          /-/g,
          ' '
        );
      }, 5000);
    } else {
      this.currentTopic = 'nothing... yet';
    }
  }
}
