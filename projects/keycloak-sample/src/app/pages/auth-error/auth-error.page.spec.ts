import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthErrorPage } from './auth-error.page';

describe('AuthErrorPage', () => {
  let component: AuthErrorPage;
  let fixture: ComponentFixture<AuthErrorPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AuthErrorPage ]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthErrorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
