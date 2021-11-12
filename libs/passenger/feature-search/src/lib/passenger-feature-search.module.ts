import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SearchComponent } from './search.component';
import { PassengerDomainModule } from '@flight-workspace/passenger/domain';
import { LetDirective } from '@ngrx/component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      {
        path: '',
        pathMatch: 'full',
        component: SearchComponent
      }
    ]),
    PassengerDomainModule,
    LetDirective
  ],
  declarations: [SearchComponent],
  exports: [SearchComponent]
})
export class PassengerFeatureSearchModule {}
