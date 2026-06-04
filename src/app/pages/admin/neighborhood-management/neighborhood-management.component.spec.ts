import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NeighborhoodManagementComponent } from './neighborhood-management.component';

describe('NeighborhoodManagementComponent', () => {
  let component: NeighborhoodManagementComponent;
  let fixture: ComponentFixture<NeighborhoodManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NeighborhoodManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NeighborhoodManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
