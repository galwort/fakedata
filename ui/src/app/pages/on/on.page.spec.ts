import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnPage } from './on.page';

describe('TopicPage', () => {
  let component: OnPage;
  let fixture: ComponentFixture<OnPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OnPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
