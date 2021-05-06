import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {Post} from '../models/wall';
import {Observable} from 'rxjs';
import {HomeStateService} from '../services/home-state.service';

@Injectable({providedIn: 'root'})
export class PostResolver implements Resolve<Post> {

  constructor(private homeStateService: HomeStateService) {
  }

  resolve(route: ActivatedRouteSnapshot,
          state: RouterStateSnapshot): Observable<Post> {
    return this.homeStateService.getPost(Number(route.paramMap.get('id')));
  }

}
