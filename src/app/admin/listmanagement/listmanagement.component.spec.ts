import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListmanagementComponent } from './listmanagement.component';

describe('ListmanagementComponent', () => {
  let component: ListmanagementComponent;
  let fixture: ComponentFixture<ListmanagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListmanagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListmanagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
