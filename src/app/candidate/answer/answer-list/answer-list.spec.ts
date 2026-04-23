import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnswerList } from './answer-list';

describe('AnswerList', () => {
  let component: AnswerList;
  let fixture: ComponentFixture<AnswerList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnswerList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnswerList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
