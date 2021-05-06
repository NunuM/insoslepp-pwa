import {Injectable} from '@angular/core';
import {Post, Wall} from '../models/wall';
import {Observable, of} from 'rxjs';
import {ApiService} from './api.service';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {AuthService} from './auth.service';
import {Category} from '../models/category';
import {AlertService} from './alert-service';


const WALL_FEATURED_KEY = 'wall_featured';
const WALL_RECENT_KEY = 'wall_recent';
const CATEGORIES_KEY = 'wall_categories';

const PAGE_SIZE = 20;

@Injectable({
  providedIn: 'root'
})
export class HomeStateService {

  private lastWallPage = -1;
  private posts: Map<number, Post> = new Map();
  private categories: Category[];
  private activeCategory = {name: 'all', id: 0};
  private query: string = null;

  protected _hasMore: boolean;

  constructor(private apiService: ApiService,
              private alertService: AlertService,
              private authService: AuthService) {
    this.loadCategories()
      .toPromise()
      .catch((error) => {
        this.categories = JSON.parse(localStorage.getItem(CATEGORIES_KEY));
        console.log('Error getting categories', error);
      });
  }

  hasMore(): boolean {
    return this._hasMore;
  }

  loadCategories(): Observable<Category[]> {
    return this.apiService.getCategories()
      .pipe(tap((cats) => {
        this.categories = [{name: 'all', id: 0}, ...cats];
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(this.categories));
      }));
  }

  getCategories(): Array<Category> {
    return this.categories;
  }

  getPost(postId: number): Observable<Post> {
    if (this.posts.has(postId)) {
      const post = this.posts.get(postId);
      if (!post._is_complete) {
        this.apiService.getPost(postId)
          .subscribe((p) => {
            post.body = p.body;
            post.tips = p.tips;
            post._is_complete = true;
          }, (error) => {
            this.alertService.unableToGetPostError(postId, error);
          });
      }

      return of(post);
    }

    return this.apiService.getPost(postId)
      .pipe(tap((p) => {
        p._is_complete = true;
        this.posts.set(p.id, p);
      }));
  }

  changeLikeForId(currentId: number, likeIndicator: boolean): void {
    const postObservable = this.getPost(currentId);

    postObservable.subscribe((p) => {
      p.liked = likeIndicator ? 1 : 0;
      p.likes += likeIndicator ? 1 : -1;
    });
  }

  getWall(page?: number, catId?: number, q?: string): Observable<Wall> {
    if (this.authService.hasAuth()) {
      return this.getWallForPage(page, catId, q)
        .pipe(catchError(this.handleError('get wall', page, {recent: [], featured: []})));
    } else {
      return this.apiService.registerUser({})
        .pipe(switchMap((auth) => {
            this.authService.setAuthorization(auth.token);
            return this.getWallForPage(page, catId, q);
          }),
          catchError(this.handleError('get wall', page, {recent: [], featured: []})));
    }
  }

  private handleError(operation = 'operation', page?: number, result?: Wall): (error: any) => Observable<Wall> {
    return (error: any): Observable<Wall> => {

      // Let the app keep running by returning an empty result.
      if (!page || page === 0) {
        this.alertService.showMessage('Serving old data. Please, check your internet connection and reload the page!');
        return of(this.loadWallFromCache());
      } else {
        this.alertService.showMessage(`Cannot get wall: ${error.message}`);
      }

      return of(result);
    };
  }

  private getWallForPage(page = 0, catId = 0, q?: string): Observable<Wall> {
    if (this.lastWallPage >= page && this.activeCategory.id === catId && (q || null) === this.query) {
      return of({
        recent: this.getRecentPosts(),
        featured: this.getFeaturedPosts()
      });
    } else {
      return this.apiService
        .getWall(page, catId, q)
        .pipe(map((wall) => {
          this.lastWallPage = page;
          this._hasMore = wall.recent.length >= PAGE_SIZE;
          this.parseResults(wall);

          if (this.lastWallPage === 0) {
            this.storeWall().finally();
          }

          return {
            recent: this.getRecentPosts(),
            featured: this.getFeaturedPosts()
          };
        }));
    }
  }

  loadWall(query: string): Observable<boolean> {
    this.query = query;
    this._hasMore = true;
    this.lastWallPage = -1;
    return this.getWall(0, this.activeCategory.id, this.query)
      .pipe(map(() => true));
  }

  private parseResults(wall): void {
    wall.recent.forEach((p) => {
      this.posts.set(p.id, p);
    });

    wall.featured.forEach((p) => {
      p._is_featured = true;
      this.posts.set(p.id, p);
    });
  }

  nextPage(): Observable<boolean> {
    return this.getWall(
      this.lastWallPage + 1,
      this.activeCategory.id === 0 ? null : this.activeCategory.id,
      this.query
    ).pipe(map(() => true));
  }

  getFeaturedPosts(): Post[] {
    return Array.from(this.posts.values())
      .filter(p => p._is_featured);
  }

  getRecentPosts(): Post[] {
    return Array.from(this.posts.values());
  }

  setCategory(category: Category): void {
    this.getWall(0, category.id, this.query).toPromise().catch(console.error);
    this.activeCategory = category;
  }

  getActiveCategory(): Category {
    return this.activeCategory;
  }

  getQuery(): string {
    return this.query;
  }

  loadWallFromCache(): Wall {
    const wall = {recent: [], featured: []};
    const recentStr = localStorage.getItem(WALL_RECENT_KEY);
    const featuredStr = localStorage.getItem(WALL_FEATURED_KEY);

    try {
      if (recentStr) {
        wall.recent = JSON.parse(recentStr);
      }

      if (featuredStr) {
        wall.featured = JSON.parse(featuredStr);
      }
    } catch (e) {
      console.log('Error loading data from cache', e);
    }

    this.parseResults(wall);

    return wall;
  }

  storeWall(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        localStorage.setItem(WALL_RECENT_KEY, JSON.stringify(this.getRecentPosts()));
        localStorage.setItem(WALL_FEATURED_KEY, JSON.stringify(this.getFeaturedPosts()));
        resolve(true);
      } catch (e) {
        localStorage.removeItem(WALL_FEATURED_KEY);
        localStorage.removeItem(WALL_RECENT_KEY);
        resolve(false);
      }
    });
  }
}
