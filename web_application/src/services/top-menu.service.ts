import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TopMenuService {

  public songState: Subject<{ id: number, fn: any }>;
  public postLikedIndicator: BehaviorSubject<boolean>;

  constructor() {
    this.songState = new Subject<any>();
    this.postLikedIndicator = new BehaviorSubject<boolean>(false);
  }

  getSongState(id, fn): void {
    this.songState.next({id, fn});
  }
}
