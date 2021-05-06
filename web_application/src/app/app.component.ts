import {AfterViewInit, ChangeDetectorRef, Component, ViewChild} from '@angular/core';
import {ActivationStart, NavigationEnd, Router, RouterOutlet, Scroll} from '@angular/router';
import {animate, animateChild, group, query, style, transition, trigger} from '@angular/animations';
import {ApiService} from '../services/api.service';
import {TopMenuService} from '../services/top-menu.service';
import {ViewportScroller} from '@angular/common';
import {Location} from '@angular/common';
import {HomeStateService} from '../services/home-state.service';
import {
  AudioService, PlayerDownloadingProgress,
  PlayerErrorEvent,
  PlayerEvent,
  PlayerPausedEvent,
  PlayerPlayingEvent,
  PlayerStoppedEvent
} from '../services/audio.service';
import {Post} from '../models/wall';
import {FormControl} from '@angular/forms';
import {debounceTime, tap} from 'rxjs/operators';
import {AlertService} from '../services/alert-service';
import {SwPush} from '@angular/service-worker';
import {NewsPushService} from '../services/news-push.service';
import {MatDialog} from '@angular/material/dialog';
import {BugReportDialogueComponent} from './bug-report-dialogue/bug-report-dialogue.component';
import {AboutDialogueComponent} from './about-dialogue/about-dialogue.component';
import {environment} from '../environments/environment';

/*
const slideInAnimation = trigger('routeAnimations', [
  transition('HomePage => PostPage', [
    style({position: 'relative'}),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100%'
      })
    ]),
    query(':enter', [
      style({right: '-100%'})
    ]),
    query(':leave', animateChild()),
    group([
      query(':leave', [
        animate('300ms linear', style({right: '100%'}))
      ]),
      query(':enter', [
        animate('300ms linear', style({right: '0%'}))
      ])
    ]),
    query(':enter', animateChild()),
  ]),
  transition('PostPage => HomePage', [
    style({position: 'relative'}),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        opacity: 1,
      })
    ]),
    query(':enter', [
      style({left: '-100%'})
    ]),
    query(':leave', animateChild()),
    group([
      query(':leave', [
        animate('100ms', style({opacity: 0})),
        animate('300ms linear', style({left: '100%'}))
      ]),
      query(':enter', [
        animate('300ms linear', style({left: '0%'}))
      ])
    ]),
    query(':enter', animateChild()),
  ])
]);
*/


const slideInAnimation = trigger('routeAnimations', [
  transition('*<=>*', [
    style({opacity: 0}),
    animate('0.4s', style({opacity: 1}))
  ])
]);

const searchBoxAnimation = trigger('inOutAnimation', [
  transition(':leave', [
    style({opacity: 1}),
    animate('300ms linear', style({opacity: 0, height: 0}))
  ])
]);

const fadeInOutAnimation = trigger('fadeInOutAnimation', [
  transition(':enter', [
    style({opacity: 0}),
    animate('600ms linear', style({opacity: 1}))
  ]),
  transition(':leave', [
    style({opacity: 1}),
    animate('600ms linear', style({opacity: 0, height: 0}))
  ])
]);

const letterSpacingAnimation = trigger('letterSpacingAnimation', [
  transition(':enter', [
    style({letterSpacing: '5px', opacity: 0}),
    animate('700ms ease-out', style({opacity: 1, letterSpacing: 0}))
  ]),
  transition(':leave', [
    style({letterSpacing: '5px', opacity: 0}),
    animate('700ms linear', style({opacity: 1, letterSpacing: 0}))
  ])
]);

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [
    slideInAnimation,
    searchBoxAnimation,
    fadeInOutAnimation,
    letterSpacingAnimation
  ]
})
export class AppComponent implements AfterViewInit {
  title = 'InSoSleep';
  showMainMenu = true;

  currentId = 0;
  likeIndicator = false;

  playing = false;
  paused = false;
  stopped = false;

  queue: Array<{ state: number; id: number }> = [];
  postPlaying: Post;
  isSearching: boolean;

  searchControl: FormControl;
  suggestions: Post[] = [];

  songStateRequest: any;

  animateTopBar = false;

  canPushHistory = false;

  readonly VAPID_PUBLIC_KEY = environment.vapidPublicKey;

  @ViewChild('searchInput', {static: false}) searchInputElement;
  isLoadingSuggestions: boolean;

  constructor(private router: Router,
              private apiService: ApiService,
              private viewportScroller: ViewportScroller,
              private homeSate: HomeStateService,
              private location: Location,
              private audioApi: AudioService,
              private ref: ChangeDetectorRef,
              private alertService: AlertService,
              private swPush: SwPush,
              private newsPushService: NewsPushService,
              private dialogue: MatDialog,
              private topMenuService: TopMenuService) {
    this.isSearching = false;
    this.isLoadingSuggestions = false;
    this.searchControl = new FormControl('');

    this.searchControl.valueChanges
      .pipe(tap(() => {
        this.isLoadingSuggestions = true;
      }))
      .pipe(debounceTime(500))
      .subscribe((value) => {
        if (this.isSearching && typeof value === 'string' && value.length > 0) {
          this.apiService.suggestion(value)
            .subscribe((posts) => {
              this.isLoadingSuggestions = false;
              this.suggestions = posts;
            });
        } else {
          this.isLoadingSuggestions = false;
          this.suggestions = [];
        }
      });

    this.router.events.subscribe((event) => {
      if (event instanceof ActivationStart) {
        if (event.snapshot.url.length >= 1) {
          this.showMainMenu = false;
          this.isSearching = false;
          this.currentId = Number(event.snapshot.url[event.snapshot.url.length - 1].path);
        } else {
          this.showMainMenu = true;
          this.songStateRequest = null;
          this.ngAfterViewInit();
          this.canPushHistory = true;
        }
      }

      if (event instanceof NavigationEnd) {
        this.animateTopBar = true;
      }

      if (event instanceof Scroll) {
        if (event.position) {
          // backward navigation
          setTimeout(() => {
            viewportScroller.scrollToPosition(event.position);
          }, 80);
        } else if (event.anchor) {
          // anchor navigation
          viewportScroller.scrollToAnchor(event.anchor);
        } else {
          // forward navigation
          //viewportScroller.scrollToPosition([0, 0]);
        }
      }
    });

    topMenuService.postLikedIndicator.subscribe((likeIndicator) => {
      this.likeIndicator = likeIndicator;
    });

    this.audioApi.state.subscribe((event) => {
      this.processEvent(event);
      this.emitSongStateChange();
    });

    this.topMenuService.songState.subscribe((request) => {
      this.songStateRequest = request;
      this.emitSongStateChange();
    });

    if (!this.newsPushService.subscribed()) {
      this.swPush.subscription
        .subscribe((someSub) => {
          if (someSub) {
            this.newsPushService.subscribeUser(someSub);
          } else {
            setTimeout(() => {
              this.requestToAllowPushNotifications();
            }, 500);
          }
        }, (error) => {
          console.error('Error getting subscription', error);
        });
    }

    this.swPush.notificationClicks
      .subscribe((data) => {
        this.router.navigate(['post', data.notification.data.id]).finally();
      });

    this.swPush.messages
      .subscribe((data) => {
        try {
          console.log(data.toString());
        } catch (e) {
          console.log('Error showing', e);
        }
      });
  }


  ngAfterViewInit(): void {
    this.ref.detectChanges();
    if (this.searchInputElement) {
      this.searchInputElement.nativeElement.addEventListener('keyup', (event: KeyboardEvent) => {
          if (event.key === 'Enter') {
            this.isSearching = false;
            const q = this.searchInputElement.nativeElement.value;
            event.preventDefault();
            this.searchInputElement.nativeElement.blur();
            if (q.length > 0) {
              this.homeSate.loadWall(this.searchInputElement.nativeElement.value)
                .toPromise()
                .catch(console.error);
            } else {
              this.homeSate.loadWall(null);
            }
          }
        }
      );
    } else {
      setTimeout(() => {
        this.ngAfterViewInit();
      }, 50);
    }
  }


  prepareRoute(outlet: RouterOutlet): any {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData.animation;
  }

  likePostClick(): void {
    this.apiService.updatePostLike(this.currentId, !this.likeIndicator)
      .subscribe(() => {
        this.likeIndicator = !this.likeIndicator;
        this.homeSate.changeLikeForId(this.currentId, this.likeIndicator);
        if ('vibrate' in navigator) {
          navigator.vibrate(300);
        }
      }, (error) => {
        this.alertService.showMessage('Could not store your like:' + error.message);
      });
  }

  goBack(): void {
    if (this.canPushHistory) {
      this.location.back();
    } else {
      this.router.navigate(['/']).finally();
    }
  }

  setIsSearching(searching): void {
    this.isSearching = searching;
    if (this.isSearching) {
      this.searchInputElement.nativeElement.focus();
    } else {
      if (this.searchInputElement.nativeElement.value !== '') {
        this.homeSate.loadWall(this.searchInputElement.nativeElement.value);
      }
    }
  }


  processEvent(event: PlayerEvent<any>): void {
    if (event instanceof PlayerPlayingEvent) {
      this.playing = true;
      this.stopped = false;
      this.paused = false;
      this.setPlaying(event.data.id);

      this.apiService.audioPlaying(event.data.id);
      if (this.postPlaying
        && this.postPlaying.id !== event.data.id) {
        this.apiService.audioStopped(this.postPlaying.id);
      }

      this.homeSate.getPost(event.data.id)
        .subscribe((p) => {
          this.postPlaying = p;
        });
    } else if (event instanceof PlayerPausedEvent) {
      this.paused = true;
      this.playing = false;
      this.stopped = false;
    } else if (event instanceof PlayerStoppedEvent) {
      this.paused = false;
      this.playing = false;
      this.stopped = true;
    } else if (event instanceof PlayerErrorEvent) {
      this.alertService.showPlayerError(event);
    } else if (event instanceof PlayerDownloadingProgress) {
      if (event.data.completed) {
        this.markAsReady(event.data.id);
      } else {
        this.setInQueue(event.data.id);
      }
    }
  }

  setInQueue(id): void {
    this.findOrInsertIntoQueue(id);
  }

  findOrInsertIntoQueue(id): { state: number; id: number } {
    const some = this.queue.filter(s => s.id === id);

    if (some.length === 1) {
      return some[0];
    }
    const newOnQueue = {id, state: PlayerSongState.ON_QUEUE};
    this.queue.push(newOnQueue);

    return newOnQueue;
  }

  markAsReady(id): void {
    this.queue
      .filter(s => s.id === id && (s.state === PlayerSongState.ON_QUEUE || s.state === PlayerSongState.HISTORIC))
      .forEach(s => s.state = PlayerSongState.READY);
  }

  setPlaying(id): void {
    this.queue
      .filter(s => s.state === PlayerSongState.PLAYING)
      .forEach(s => s.state = PlayerSongState.HISTORIC);

    const current = this.findOrInsertIntoQueue(id);
    current.state = PlayerSongState.PLAYING;
  }

  startPlay(): void {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.play()
        .catch((error) => {
          this.alertService.showOnPlayError(error);
        });
    }
  }

  stopPlaying(): void {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.pause();
    }
  }

  pausePlaying(): void {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.pause();
    }
  }

  goToPost(id: number): void {
    this.isSearching = false;
    this.router.navigate(['post', id]).finally();
  }

  private emitSongStateChange(): void {
    if (!this.songStateRequest) {
      return;
    }
    const someSong = this.queue.filter(s => s.id === this.songStateRequest.id);
    if (someSong.length >= 1) {
      const song = someSong[0];
      switch (song.state) {
        case PlayerSongState.PAUSED:
        case PlayerSongState.PLAYING:
          this.songStateRequest.fn('Playing', false);
          break;
        case PlayerSongState.ON_QUEUE:
          this.songStateRequest.fn('Downloading', false);
          break;
        case PlayerSongState.READY:
          this.songStateRequest.fn('Ready & Waiting', false);
          break;
        case PlayerSongState.HISTORIC:
          this.songStateRequest.fn('Play Again', true);
          break;
        default:
          this.songStateRequest.fn('Play', true);
          break;
      }
    } else {
      this.songStateRequest.fn(this.audioApi.isPlaying() ? 'Add to Queue' : 'Play', true);
    }
  }

  hasQueuedSongs(): boolean {
    return this.queue.filter(s => s.state === PlayerSongState.ON_QUEUE || s.state === PlayerSongState.READY).length > 0;
  }

  nextSong(): void {
    if (this.hasQueuedSongs()) {
      this.audioApi.playNextSong();
    }
  }

  sharePost(): void {
    const url = location.origin + '/post/' + this.currentId;
    if (navigator.share) {
      this.homeSate.getPost(this.currentId)
        .subscribe((post) => {
          navigator.share({
            title: post.title,
            url
          }).then(() => {
            this.alertService.showMessage('Thanks for sharing');
          }).catch((error) => {
            console.log('Error Sharing', error);
          });
        });
    } else {
      const text = document.createElement('textarea');
      text.value = url;
      document.body.appendChild(text);
      text.select();
      text.setSelectionRange(0, 99999);
      document.execCommand('copy');
      document.body.removeChild(text);
      this.alertService.showMessage('Link copied. Share it on your favourite social media!');
    }
  }

  requestToAllowPushNotifications(): void {
    this.swPush.requestSubscription({
      serverPublicKey: this.VAPID_PUBLIC_KEY
    }).then((subscription) => {
      this.newsPushService.subscribeUser(subscription);
      this.alertService.showMessage('Thank you for subscribing');
    }).catch((error) => {
      console.error('Could not subscribe due to:', error);
    });
  }

  openBugReportDialogue(): void {
    this.dialogue.open(BugReportDialogueComponent, {
      width: '95vw',
    })
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.apiService.submitBugReport(data)
            .toPromise()
            .then(() => {
              this.alertService.showMessage('We\'ve receive your report. Thank you!');
            });
        }
      });
  }


  openAboutDialogue(): void {
    this.dialogue.open(AboutDialogueComponent);
  }
}

const PlayerSongState = {
  ON_QUEUE: 0,
  READY: 4,
  PLAYING: 1,
  HISTORIC: 2,
  PAUSED: 3
};

