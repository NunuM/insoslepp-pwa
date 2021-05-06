import {Injectable} from '@angular/core';
import {HttpClient, HttpEvent} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../environments/environment';
import {Post, Wall} from '../models/wall';
import {Category} from '../models/category';
import {AuthService} from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient, private authService: AuthService) {
  }

  registerUser(payload: any): Observable<{ token: string }> {
    return this.http.post<any>(`${environment.api.host}${environment.api.resources.users}`, payload);
  }

  getWall(page = 0, categoryId?: number, q?: string): Observable<Wall> {
    return this.http.get<Wall>(`${environment.api.host}${environment.api.resources.wall}?page=${page}${categoryId && categoryId > 0 ? '&cat=' + categoryId : ''}${q ? '&q=' + q : ''}`, {
      headers: {
        Authorization: this.authService.getAuthorization()
      }
    });
  }

  getPost(id: number): Observable<Post> {
    return this.http.get<Post>(`${environment.api.host}${environment.api.resources.posts}/${id}`,
      {
        headers: {
          Authorization: this.authService.getAuthorization()
        }
      });
  }

  getAudioStream(postId: number): Observable<ArrayBuffer> {
    return this.http.get(`${environment.api.host}${environment.api.resources.audioStream}/${postId}`, {
      responseType: 'arraybuffer'
    });
  }

  getCategories(): Observable<Array<Category>> {
    return this.http.get<Array<Category>>(`${environment.api.host}${environment.api.resources.categories}`);
  }

  updatePostLike(postId, liked: boolean): Observable<void> {
    return this.http.post<void>(`${environment.api.host}${environment.api.resources.posts}/${postId}/liked`, {
      liked
    }, {
      headers: {
        Authorization: this.authService.getAuthorization()
      }
    });
  }

  suggestion(q: string): Observable<Array<Post>> {
    return this.http.get<Array<Post>>(`${environment.api.host}${environment.api.resources.suggestion}?q=${q}`, {
      headers: {
        Authorization: this.authService.getAuthorization()
      }
    });
  }

  markPostAsSeen(postId: number): void {
    this.http.post<void>(`${environment.api.host}${environment.api.resources.posts}/${postId}/seen`, {}, {
      headers: {
        Authorization: this.authService.getAuthorization()
      }
    }).subscribe(() => {
    }, (error) => {
      console.error(error);
    });
  }

  audioPlaying(postId: number): void {
    this.http.post(`${environment.api.host}${environment.api.resources.posts}/${postId}/live`, {
      play: true
    }, {
      headers: {
        Authorization: this.authService.getAuthorization()
      }
    }).toPromise()
      .catch(console.log);
  }

  audioStopped(postId: number): void {
    this.http.post(`${environment.api.host}${environment.api.resources.posts}/${postId}/live`, {
      play: false
    }, {
      headers: {
        Authorization: this.authService.getAuthorization()
      }
    }).toPromise()
      .catch(console.log);
  }

  audioSource(postId: number): Observable<{ url: string }> {
    return this.http.post<any>(`${environment.api.host}${environment.api.resources.audioInfo}/${postId}`, {}, {
      headers: {
        Authorization: this.authService.getAuthorization()
      }
    });
  }

  updateUser(payload: { sub: PushSubscriptionJSON }): Observable<void> {
    return this.http.put<void>(`${environment.api.host}${environment.api.resources.users}`, payload, {
      headers: {
        Authorization: this.authService.getAuthorization()
      }
    });
  }

  submitBugReport(payload: any): Observable<void> {
    return this.http.post<void>(`${environment.api.host}${environment.api.resources.bugs}`, payload, {
      headers: {
        Authorization: this.authService.getAuthorization()
      }
    });
  }
}
