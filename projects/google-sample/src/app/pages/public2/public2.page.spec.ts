import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Public2Page } from './public2.page';

describe('Public2Page', () => {
  let component: Public2Page;
  let fixture: ComponentFixture<Public2Page>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Public2Page],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Public2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
