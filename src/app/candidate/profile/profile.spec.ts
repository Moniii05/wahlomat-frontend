import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Profile } from './profile';
//spec.ts Datei enthält einen einfachen Unit-Test, der prüft, ob die Profile korrekt erstellt werden kann

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
