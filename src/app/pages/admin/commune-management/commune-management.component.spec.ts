import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommuneManagementComponent } from './commune-management.component';

describe('CommuneManagementComponent', () => {
  let component: CommuneManagementComponent;
  let fixture: ComponentFixture<CommuneManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommuneManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommuneManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
