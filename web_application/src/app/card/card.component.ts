import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

const RX = /\.0+$|(\.[0-9]*[1-9])0+$/;

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css']
})
export class CardComponent {

  @Input()
  id: number;

  @Input()
  title: string;

  @Input()
  description: string;

  @Input()
  likes: number;

  @Input()
  live: number;

  @Output()
  clicked: EventEmitter<number>;

  @Input()
  liked: number;

  @Input()
  color: number;

  constructor() {
    this.clicked = new EventEmitter<number>();
  }

  emitClicked(): void {
    this.clicked.emit(this.id);
  }

  numberFormatter(num, digits): string {
    const si = [
      {value: 1, symbol: ''},
      {value: 1E3, symbol: 'k'},
      {value: 1E6, symbol: 'M'},
      {value: 1E9, symbol: 'G'},
      {value: 1E12, symbol: 'T'},
      {value: 1E15, symbol: 'P'},
      {value: 1E18, symbol: 'E'}
    ];

    let i;
    for (i = si.length - 1; i > 0; i--) {
      if (num >= si[i].value) {
        break;
      }
    }
    return (num / si[i].value).toFixed(digits).replace(RX, '$1') + si[i].symbol;
  }
}
