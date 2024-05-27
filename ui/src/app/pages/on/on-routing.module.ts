import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OnPage } from './on.page';

const routes: Routes = [
  {
    path: '',
    component: OnPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OnPageRoutingModule {}
