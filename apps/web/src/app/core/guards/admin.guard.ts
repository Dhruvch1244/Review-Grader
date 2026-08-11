import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RoleService } from '../services/role.service';

export const adminGuard: CanActivateFn = () => {
  const role = inject(RoleService).role();
  if (role === 'admin') return true;
  return inject(Router).createUrlTree(['/scoring']);
};
