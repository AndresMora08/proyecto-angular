import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericSearchComponent } from './generic-search.component';

describe('GenericSearchComponent', () => {
  let component: GenericSearchComponent;
  let fixture: ComponentFixture<GenericSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericSearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenericSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
