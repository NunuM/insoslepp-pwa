import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  authorization: string;

  userAuth: BehaviorSubject<boolean>;

  constructor() {
    this.authorization = localStorage.getItem('auth') || '';
    this.userAuth = new BehaviorSubject<boolean>(this.hasAuth());
  }

  hasAuth(): boolean {
    return this.authorization.length > 1;
  }

  getAuthorization(): string {
    return this.authorization;
  }

  setAuthorization(auth: string): void {
    this.authorization = auth;
    localStorage.setItem('auth', auth);
    this.userAuth.next(true);
  }
}
