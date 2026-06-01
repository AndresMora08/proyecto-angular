import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntityManagementComponent } from './entity-management.component';

describe('EntityManagementComponent', () => {
  let component: EntityManagementComponent;
  let fixture: ComponentFixture<EntityManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntityManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
