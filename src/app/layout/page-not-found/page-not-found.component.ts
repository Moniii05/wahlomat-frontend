import { Component } from '@angular/core';
import {RouterLink} from "@angular/router";
import {TranslocoModule} from '@jsverse/transloco';

@Component({
  selector: 'app-page-not-found',
    imports: [
      RouterLink,
      TranslocoModule
    ],
  templateUrl: './page-not-found.component.html',
  styleUrl: './page-not-found.component.css'
})
export class PageNotFoundComponent {

}
