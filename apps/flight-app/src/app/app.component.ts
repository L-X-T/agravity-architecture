import { Component } from '@angular/core';

import { environment } from '../environments/environment';

@Component({
  selector: 'flight-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor() {
    if (!environment.production) {
      console.warn('hello from your console');
    }
  }
}
