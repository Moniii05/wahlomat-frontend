import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CandidatesManagementComponent } from './candidates-management.component';

describe('CandidatesManagementComponent', () => {
  let component: CandidatesManagementComponent;
  let fixture: ComponentFixture<CandidatesManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidatesManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CandidatesManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy() ;
  });
});
