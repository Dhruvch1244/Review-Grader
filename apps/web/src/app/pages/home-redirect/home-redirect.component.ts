import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RoleService } from '../../core/services/role.service';

@Component({
  selector: 'app-home-redirect',
  standalone: true,
  template: '',
})
export class HomeRedirectComponent {
  constructor() {
    const role = inject(RoleService).role();
    inject(Router).navigateByUrl(role === 'admin' ? '/setup' : '/scoring');
  }
}
