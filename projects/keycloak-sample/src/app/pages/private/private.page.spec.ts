import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthenticationTestingModule } from 'ngx-authentication-oidc';

import { PrivatePage } from './private.page';

describe('PrivatePage', () => {
  let component: PrivatePage;
  let fixture: ComponentFixture<PrivatePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, AuthenticationTestingModule],
      declarations: [PrivatePage],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrivatePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
