import {Injectable} from '@angular/core';
import {ApiService} from './api.service';
import {AuthService} from './auth.service';
import {HttpErrorResponse} from '@angular/common/http';

const PUSH_KEY = 'push';

@Injectable({
  providedIn: 'root'
})
export class NewsPushService {

  constructor(private apiService: ApiService,
              private authService: AuthService) {
  }

  subscribed(): boolean {
    return localStorage.getItem(PUSH_KEY) === 'true';
  }

  subscribeUser(sub: PushSubscription): void {

    if (!this.authService.hasAuth()) {
      this.authService.userAuth.subscribe((hasAuth) => {
        if (hasAuth) {
          this.subscribeUser(sub);
        }
      });
      return;
    }

    const json = sub.toJSON();
    this.apiService.updateUser({
      sub: json
    }).toPromise()
      .then(() => {
        localStorage.setItem(PUSH_KEY, 'true');
      })
      .catch((error) => {
        console.log('Subscription server error', error);
        if (error instanceof HttpErrorResponse) {
          if (error.status === 401) {
            setTimeout(() => {
              this.apiService.registerUser({})
                .toPromise()
                .then((auth) => {
                  this.authService.setAuthorization(auth.token);
                  this.subscribeUser(sub);
                });
            }, 1000 * 30);
          }
        }
      });
  }

}
