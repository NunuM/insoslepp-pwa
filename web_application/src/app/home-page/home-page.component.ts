import {AfterViewInit, Component, HostListener} from '@angular/core';
import {Router} from '@angular/router';
import {Post} from '../../models/wall';
import {Category} from '../../models/category';
import {TopMenuService} from '../../services/top-menu.service';
import {HomeStateService} from '../../services/home-state.service';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements AfterViewInit {
  isLoading = false;

  constructor(private router: Router,
              private topMenu: TopMenuService,
              private homeStateService: HomeStateService) {
  }

  ngAfterViewInit(): void {
    this.onScroll();
  }

  goTo(postId, likeIndicator): void {
    this.topMenu.postLikedIndicator.next(likeIndicator >= 1);
    this.router.navigate(['/post', postId]).finally();
  }

  loadNextPage(): void {
    if (this.isLoading || !this.homeStateService.hasMore() || !/^[\/| ]$/.test(location.pathname)) {
      return;
    }

    this.isLoading = true;

    this.homeStateService.nextPage()
      .subscribe(() => {
        this.isLoading = false;
      }, (error) => {
        this.isLoading = false;
        console.error(error);
      });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    const pos = (document.documentElement.scrollTop || document.body.scrollTop) + document.documentElement.offsetHeight;
    const max = document.documentElement.scrollHeight;
    if (Math.trunc((pos / max) * 100) > 95) {
      this.loadNextPage();
    }
  }

  setActiveCategory(category: Category): void {
    this.homeStateService.setCategory(category);
  }

  getFeatured(): Post[] {
    return this.homeStateService.getFeaturedPosts();
  }

  getRecent(): Post[] {
    return this.homeStateService.getRecentPosts();
  }

  getCategories(): Category[] {
    return this.homeStateService.getCategories();
  }

  getActiveCategory(): Category {
    return this.homeStateService.getActiveCategory();
  }

  getQuery(): string {
    return this.homeStateService.getQuery();
  }

}
