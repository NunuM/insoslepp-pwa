import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {Wall} from '../models/wall';
import {Observable} from 'rxjs';
import {Injectable} from '@angular/core';
import {HomeStateService} from '../services/home-state.service';

@Injectable({providedIn: 'root'})
export class WallResolver implements Resolve<Wall> {

  constructor(
    private homeStateService: HomeStateService) {
  }

  resolve(route: ActivatedRouteSnapshot,
          state: RouterStateSnapshot): Observable<Wall> {
    return this.homeStateService.getWall();
  }


}
