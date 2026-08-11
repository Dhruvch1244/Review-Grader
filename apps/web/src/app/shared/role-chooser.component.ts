import { Component, inject } from '@angular/core';
import { RoleService } from '../core/services/role.service';
import { ButtonComponent } from '../ui/button.component';
import { CardComponent, CardContentComponent } from '../ui/card.component';

@Component({
  selector: 'app-role-chooser',
  standalone: true,
  imports: [ButtonComponent, CardComponent, CardContentComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-muted px-6">
      <app-card class="max-w-sm w-full">
        <app-card-content class="py-8 text-center space-y-5">
          <div>
            <p class="text-lg font-semibold tracking-tight">Review Grader</p>
            <p class="text-sm text-muted-foreground mt-1">Who's using this?</p>
          </div>
          <div class="flex flex-col gap-2">
            <button appButton size="lg" (click)="choose('admin')">Admin</button>
            <button appButton variant="outline" size="lg" (click)="choose('reviewer')">Reviewer</button>
          </div>
          <p class="text-xs text-muted-foreground">
            Admin manages rosters, dimension weights, and resets. Reviewer scores.
          </p>
        </app-card-content>
      </app-card>
    </div>
  `,
})
export class RoleChooserComponent {
  private roleService = inject(RoleService);

  choose(role: 'admin' | 'reviewer') {
    this.roleService.setRole(role);
  }
}
