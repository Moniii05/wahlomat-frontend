import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutElections } from './about-elections';

describe('AboutElections', () => {
  let component: AboutElections;
  let fixture: ComponentFixture<AboutElections>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutElections]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AboutElections);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
