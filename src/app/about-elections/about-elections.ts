import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {TranslocoModule} from '@jsverse/transloco';

@Component({
  selector: 'app-about-elections',
  standalone: true,
  imports: [RouterLink,
  TranslocoModule],
  templateUrl: './about-elections.html',
  styleUrl: './about-elections.css',
})
export class AboutElections {}
