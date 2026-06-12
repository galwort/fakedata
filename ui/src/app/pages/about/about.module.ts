import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AboutPageRoutingModule } from './about-routing.module';

import { AboutPage } from './about.page';
import { SparkleComponent } from 'src/app/shared/sparkle.component';
import { FooterComponent } from 'src/app/shared/footer.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AboutPageRoutingModule,
    SparkleComponent,
    FooterComponent,
  ],
  declarations: [AboutPage],
})
export class AboutPageModule {}
