import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { SparkleComponent } from 'src/app/shared/sparkle.component';
import { FooterComponent } from 'src/app/shared/footer.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    SparkleComponent,
    FooterComponent,
  ],
  declarations: [HomePage],
})
export class HomePageModule {}
