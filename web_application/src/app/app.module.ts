import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {HttpClientModule} from '@angular/common/http';

import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ServiceWorkerModule} from '@angular/service-worker';
import {environment} from '../environments/environment';
import {CardComponent} from './card/card.component';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatRippleModule} from '@angular/material/core';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatMenuModule} from '@angular/material/menu';
import {MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';

import { RouteReuseStrategy } from '@angular/router';


import {RouterModule} from '@angular/router';

import {HomePageComponent} from './home-page/home-page.component';
import {PostPageComponent} from './post-page/post-page.component';
import {WallResolver} from '../resolvers/wall-resolver';
import {PostResolver} from '../resolvers/post-resolver';
import {CategoryFilterPipe, QueryFilterPipe} from '../pipes/myfilter.pipe';

import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {BugReportDialogueComponent} from './bug-report-dialogue/bug-report-dialogue.component';
import { AboutDialogueComponent } from './about-dialogue/about-dialogue.component';
import {CustomReuseStrategy} from '../helpers/custom-reuse-strategy';



@NgModule({
  declarations: [
    AppComponent,
    CardComponent,
    HomePageComponent,
    PostPageComponent,
    CategoryFilterPipe,
    QueryFilterPipe,
    BugReportDialogueComponent,
    AboutDialogueComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
    MatIconModule,
    MatButtonModule,
    MatRippleModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDialogModule,
    MatInputModule,
    RouterModule,
    RouterModule.forRoot([
      {
        path: '',
        component: HomePageComponent,
        data: {
          animation: 'HomePage'
        },
        resolve: {
          wall: WallResolver
        },
      },
      {
        path: 'post/:id',
        component: PostPageComponent,
        data: {
          animation: 'PostPage'
        },
        resolve: {
          post: PostResolver
        }
      }
    ]),
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: CustomReuseStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
