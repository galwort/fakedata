import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OnPageRoutingModule } from './on-routing.module';

import { OnPage } from './on.page';
import { FooterComponent } from 'src/app/shared/footer.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OnPageRoutingModule,
    FooterComponent,
  ],
  declarations: [OnPage],
})
export class OnPageModule {}
