import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-card.component.html',
  styleUrls: ['./ui-card.component.css']
})
export class UiCardComponent {
  @Input() padding: string = 'p-4'; 
  @Input() class: string = '';
}
