import { Component } from '@angular/core';
import {RouterModule} from '@angular/router';
import {TranslocoModule} from '@jsverse/transloco';

@Component({
  selector: 'app-footer',
  imports: [RouterModule,
  TranslocoModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {

}
