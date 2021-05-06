import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Post} from '../../models/wall';
import {ActivatedRoute} from '@angular/router';
import {AudioService} from '../../services/audio.service';
import {Location} from '@angular/common';
import {TopMenuService} from '../../services/top-menu.service';
import {ApiService} from '../../services/api.service';
import {Meta, Title} from '@angular/platform-browser';

@Component({
  selector: 'app-post-page',
  templateUrl: './post-page.component.html',
  styleUrls: ['./post-page.component.css']
})
export class PostPageComponent implements OnInit, AfterViewInit, OnDestroy {

  private static xDown: number;
  protected static yDown: number;
  post: Post;
  state: string;
  currentTipIndex = -1;

  @ViewChild('content') content: ElementRef;
  ableToClick = true;

  constructor(private activeRoute: ActivatedRoute,
              private location: Location,
              private topMenuService: TopMenuService,
              private apiService: ApiService,
              private title: Title,
              private meta: Meta,
              private audioService: AudioService) {
  }

  private static handleTouchStart(evt): void {
    const firstTouch = PostPageComponent.getTouches(evt)[0];
    PostPageComponent.xDown = firstTouch.clientX;
    PostPageComponent.yDown = firstTouch.clientY;
  }

  private static handleTouchMove(evt): boolean {
    if (!PostPageComponent.xDown || !PostPageComponent.yDown) {
      return false;
    }

    const xUp = evt.touches[0].clientX;
    const yUp = evt.touches[0].clientY;

    const xDiff = PostPageComponent.xDown - xUp;
    const yDiff = PostPageComponent.yDown - yUp;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
      if (xDiff > 0) {
        /* left swipe */
      } else {
        return true;
      }
    } else {
      if (yDiff > 0) {
        /* up swipe */
      } else {
        /* down swipe */
      }
    }
    /* reset values */
    PostPageComponent.xDown = null;
    PostPageComponent.yDown = null;
  }

  private static getTouches(evt): any {
    return evt.touches ||             // browser API
      evt.originalEvent.touches; // jQuery
  }

  ngOnInit(): void {
    this.post = this.activeRoute.snapshot.data.post;
    this.playingState(this.post.id);

    this.title.setTitle(`${(this.post.title || '').replace(/(^[a-z])|( [a-z])/g, (c) => {
      return c.toUpperCase();
    })} - ${this.title.getTitle()}`);
    this.meta.updateTag({name: 'description', content: this.post.description});
  }

  play(): void {
    this.ableToClick = false;
    this.audioService.playOrQueueSound(this.post);
  }

  ngAfterViewInit(): void {
    this.content.nativeElement.addEventListener('touchstart', PostPageComponent.handleTouchStart, false);
    this.content.nativeElement.addEventListener('touchmove', (ev) => {
      if (PostPageComponent.handleTouchMove(ev)) {
        this.content.nativeElement.removeAllListeners();
        this.location.back();
      }
    }, false);
    setTimeout(() => {
      this.topMenuService.postLikedIndicator.next(this.post.liked >= 1);
    }, 1);
  }


  playingState(id: number): void {
    this.topMenuService.getSongState(id, (state, canClick) => {
      this.ableToClick = canClick;
      this.state = state;
    });
  }

  ngOnDestroy(): void {
    this.topMenuService.postLikedIndicator.next(false);

    if (this.post.seen === 0) {
      this.post.seen = 1;
      this.apiService.markPostAsSeen(this.post.id);
    }
  }

  getImages(): [] {
    return JSON.parse(this.post.images || '[]');
  }

  getTips(): [] {
    return JSON.parse(this.post.tips || '[]');
  }

  speak(idx: number): void {
    if (window.speechSynthesis.speaking && this.currentTipIndex === idx) {
      window.speechSynthesis.cancel();
      this.currentTipIndex = -1;
      return;
    }

    if (this.currentTipIndex !== -1
      && window.speechSynthesis.speaking
      && this.currentTipIndex !== idx) {
      window.speechSynthesis.cancel();
      this.currentTipIndex = idx;
    }

    const msg = new SpeechSynthesisUtterance(this.getTips()[idx]);
    window.speechSynthesis.speak(msg);
    this.currentTipIndex = idx;
  }

  getPostBody(): string[] | null {
    return this.post.body ? this.post.body.split('\n') : null;
  }

  scrollBottom(): void {
    window.scrollTo(0, document.body.scrollHeight);
  }
}
