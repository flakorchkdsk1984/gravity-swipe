import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `<app-game></app-game>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
  `],
})
export class AppComponent {}
