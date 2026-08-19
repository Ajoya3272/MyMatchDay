/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { MisSeguidosComponent } from './mis-seguidos.component';

describe('MisSeguidosComponent', () => {
  let component: MisSeguidosComponent;
  let fixture: ComponentFixture<MisSeguidosComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MisSeguidosComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MisSeguidosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
