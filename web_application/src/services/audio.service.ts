import {Injectable} from '@angular/core';
import {Post} from '../models/wall';
import {Url} from 'url';
import {BehaviorSubject} from 'rxjs';
import {ApiService} from './api.service';

export interface Downloading {
  id: number;
  completed: boolean;
}

export interface PlayingSong {
  id: number;
}

export interface PlayerError {
  id?: number;
  partId?: number;
  error: Error;
}

export abstract class PlayerEvent<T> {
  event: number;
  data: T;

  constructor(eventNumber: number, data: T) {
    this.event = eventNumber;
    this.data = data;
  }
}

export class PlayerPausedEvent extends PlayerEvent<string> {
}

export class PlayerPlayingEvent extends PlayerEvent<PlayingSong> {
}

export class PlayerStoppedEvent extends PlayerEvent<string> {
}

export class PlayerErrorEvent extends PlayerEvent<PlayerError> {
}

export class PlayerDownloadingProgress extends PlayerEvent<Downloading> {
}


@Injectable({
  providedIn: 'root'
})
export class AudioService {

  audioCtx: AudioContext;
  currentPlaying = -1;
  worker: any;
  player: Player;

  holder: HTMLAudioElement;

  state: BehaviorSubject<PlayerEvent<any>>;

  currentSource: AudioBufferSourceNode;

  audioPos = 0;
  queue: Array<{ id: number, url: string }> = [];

  _isPlaying = false;

  constructor(private apiService: ApiService) {
    this.audioCtx = new (window.AudioContext || window['webkitAudioContext'])();

    this.state = new BehaviorSubject<PlayerEvent<any>>(AudioService.createStoppedEvent());

    this.holder = document.createElement('audio');
    document.body.appendChild(this.holder);
    this.holder.onpause = () => {
      this.state.next(AudioService.createPausedEvent());
      /*this.audioCtx
        .suspend()
        .then(() => {
          this.state.next(AudioService.createPausedEvent());
        })
        .catch((error) => {
          this.state.next(AudioService.createErrorEvent(error));
        });*/
    };
    this.holder.onplay = () => {
      this.state.next(AudioService.createPlayingEvent(this.currentPlaying));
      /*this.audioCtx
        .resume()
        .catch((error) => {
          this.state.next(AudioService.createErrorEvent(error));
        });*/
    };

    this.holder.onended = () => {
      this.play(this.queue[this.audioPos + 1], this.audioPos + 1);
    };

    //this.worker = new Worker('../app/app.worker', {type: 'module'});
    //this.player = new Player(this.worker, this.audioCtx, this.state);
    //this.player.onNewAudio((a, b, c) => {
    //  this.processQueue(a, b, c);
    //});
  }

  private static createStoppedEvent(): PlayerStoppedEvent {
    return new PlayerStoppedEvent(1, 'stopped');
  }

  private static createPausedEvent(): PlayerPausedEvent {
    return new PlayerPausedEvent(2, 'paused');
  }

  public static createErrorEvent(error: Error, id?: number, partId?: number): PlayerErrorEvent {
    return new PlayerErrorEvent(3, {error, id, partId});
  }

  private static createPlayingEvent(id: number): PlayerPlayingEvent {
    return new PlayerPlayingEvent(4, {id});
  }

  public static createProgressEvent(id, completed): PlayerDownloadingProgress {
    return new PlayerDownloadingProgress(5, {id, completed});
  }

  isPlaying(): boolean {
    return this._isPlaying;
  }

  isPlayingThis(id): boolean {
    return this.currentPlaying === id;
  }

  stop(): any {
    this.audioCtx.resume().finally();
  }

  playOrQueueSound(post: Post): void {
    //this.player.newSong(post.id);

    this.apiService.audioSource(post.id)
      .subscribe((response) => {
        const idx = this.queue.length;
        this.queue.push({id: post.id, url: response.url});
        if (!this._isPlaying) {
          this.play(this.queue[idx], idx);
        } else {
          this.state.next(AudioService.createProgressEvent(post.id, false));
          this.state.next(AudioService.createProgressEvent(post.id, true));
        }
      });
  }

  play(data, idx): void {
    if (!(typeof data === 'object' && data.hasOwnProperty('url') && data.hasOwnProperty('id'))) {
      this._isPlaying = false;
      return;
    }

    this.holder.src = data.url;
    this.currentPlaying = data.id;
    this.holder.load();
    this.holder.play()
      .then(() => {
        this._isPlaying = true;
        this.audioPos = idx;
        this.state.next(AudioService.createPlayingEvent(this.currentPlaying));
      })
      .catch((error) => {
        this.currentPlaying = -1;
        this.state.next(AudioService.createErrorEvent(error, this.currentPlaying, -1));
      });
  }

  processQueue(audioBuffer: AudioBuffer, offset, id): void {
    if (this._isPlaying) {
      return;
    }
    this._isPlaying = true;
    this.currentPlaying = id;

    this.state.next(AudioService.createPlayingEvent(id));

    this.currentSource = this.audioCtx.createBufferSource();
    this.currentSource.buffer = audioBuffer;
    const analyzer = this.audioCtx.createAnalyser();
    this.currentSource.connect(analyzer).connect(this.audioCtx.destination);
    AudioVisualizer.visualize(analyzer, {value: 'f'});
    this.currentSource.onended = () => {
      this._isPlaying = false;
      const t = this.player.nextAudioBuffer(this.currentPlaying, this.currentSource.buffer.duration);
      if (t) {
        this.processQueue(t.audioBuffer, t.offset, t.id);
      } else {
        this.state.next(AudioService.createStoppedEvent());
      }
    };

    if (offset && offset > 0) {
      this.currentSource.start(0, offset);
    } else {
      this.currentSource.start();
    }
  }

  createSilence(seconds = 1): Url {
    const sampleRate = 8000;
    const numChannels = 1;
    const bitsPerSample = 8;

    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = Math.ceil(seconds * sampleRate) * blockAlign;
    const chunkSize = 36 + dataSize;
    const byteLength = 8 + chunkSize;

    const buffer = new ArrayBuffer(byteLength);
    const view = new DataView(buffer);

    view.setUint32(0, 0x52494646, false);    // Chunk ID 'RIFF'
    view.setUint32(4, chunkSize, true);      // File size
    view.setUint32(8, 0x57415645, false);    // Format 'WAVE'
    view.setUint32(12, 0x666D7420, false);   // Sub-chunk 1 ID 'fmt '
    view.setUint32(16, 16, true);            // Sub-chunk 1 size
    view.setUint16(20, 1, true);             // Audio format
    view.setUint16(22, numChannels, true);   // Number of channels
    view.setUint32(24, sampleRate, true);    // Sample rate
    view.setUint32(28, byteRate, true);      // Byte rate
    view.setUint16(32, blockAlign, true);    // Block align
    view.setUint16(34, bitsPerSample, true); // Bits per sample
    view.setUint32(36, 0x64617461, false);   // Sub-chunk 2 ID 'data'
    view.setUint32(40, dataSize, true);      // Sub-chunk 2 size

    for (let offset = 44; offset < byteLength; offset++) {
      view.setUint8(offset, 128);
    }

    const blob = new Blob([view], {type: 'audio/wav'});
    return URL.createObjectURL(blob);
  }

  playNextSong(): void {
    //this.currentPlaying = -1;
    //if (this.currentSource) {
    //  this.currentSource.stop();
    //}
    this.holder.pause();
    this.play(this.queue[this.audioPos + 1], this.audioPos + 1);
  }

}

class Player {

  songs: Map<string, Song>;
  audioQueue: Song[];
  audioIterator = 0;
  worker: Worker;
  listeners: any[];

  audioCtx: AudioContext;

  constructor(worker, audioCtx, state: BehaviorSubject<PlayerEvent<any>>) {
    this.songs = new Map();
    this.audioQueue = [];
    this.worker = worker;

    this.worker.onmessage = (message) => {
      if (message.data.cmd === 0) {
        this.songPiece(message.data.data);
      } else if (message.data.cmd === 1) {
        state.next(AudioService.createProgressEvent(message.data.id, message.data.isLast));
      } else if (message.data.cmd === 2) {
        state.next(AudioService.createErrorEvent(message.data.error, message.data.id, message.data.part));
      }
    };

    this.listeners = [];
    this.audioCtx = audioCtx;
  }

  newSong(id): void {
    const s = new Song(id, this.audioCtx);

    this.songs.set(id.toString(), s);
    this.audioQueue.push(s);

    this.worker.postMessage({cmd: 'request', id});
  }

  songPiece(message): void {
    if (this.songs.has(message.id.toString())) {

      let callback = (err) => {
        if (err) {
          return;
        }

        const n = this.nextAudioBuffer(message.id, 0);

        this.listeners.forEach((l) => {
          l(n.audioBuffer, n.offset, message.id);
        });
      };

      if (message.partId > 1) {
        callback = null;
      }

      this.songs.get(message.id.toString()).processBuffer(message.partId,
        message.body,
        message.isLast,
        callback);
    }
  }

  nextAudioBuffer(id, duration, retry = 0): { id: number, offset: number, audioBuffer: AudioBuffer } {
    const current = this.audioQueue.filter(s => s.id === id)[0];

    if (current) {
      if (current.audioBuffer && current.audioBuffer.duration > duration) {
        return {
          id: current.id,
          offset: duration,
          audioBuffer: current.audioBuffer
        };
      } else if (!current.audioBuffer) {
        current.pollAudioBuffer(() => {
          if (current.audioBuffer) {
            this.listeners.map((l) => {
              l(current.audioBuffer, duration, current.id);
            });
          } else {
            if (retry < 3) {
              setTimeout(() => {
                this.nextAudioBuffer(id, duration, ++retry);
              }, 50000);
            } else {
              this.audioQueue.splice(this.audioQueue.indexOf(current), 1);
              return this.nextAudioBuffer(-1, 0);
            }
          }
        });
      } else if (current.audioBuffer && current.isProcessingPrevious && !current.finishProcessing) {

        const r = setInterval(() => {
          if (current.isProcessingPrevious === false) {
            this.listeners.map((l) => {
              l(current.audioBuffer, duration, current.id);
            });
            window.clearInterval(r);
          }
        }, 9000);

      } else {
        return this.nextAudioBuffer(-1, 0);
      }
    } else {
      this.audioIterator += 1;
      const next = this.audioQueue[this.audioIterator];
      if (next && next.audioBuffer) {
        return {
          id: next.id,
          offset: 0,
          audioBuffer: next.audioBuffer
        };
      }
    }
  }

  onNewAudio(cb): void {
    this.listeners.push(cb);
  }
}


class Song {

  id: number;
  currentBufferIdx: number;
  buffers: Map<number, ArrayBuffer>;
  isProcessingPrevious: boolean;
  finishProcessing: boolean;
  audioBuffer: AudioBuffer;
  audioCtx: AudioContext;

  constructor(id, audioCtx) {
    this.id = id;
    this.currentBufferIdx = 0;
    this.buffers = new Map();
    this.isProcessingPrevious = false;
    this.finishProcessing = false;
    this.audioBuffer = null;
    this.audioCtx = audioCtx;
  }

  processBuffer(pieceId, arrayBuffer, isLast = false, cb): void {
    this.buffers.set(pieceId, arrayBuffer);
    if (isLast) {
      this._cleanBuffers(pieceId);
    }

    if (cb) {
      this.pollAudioBuffer(cb);
    }
  }

  _cleanBuffers(pieceId): void {
    this.pollAudioBuffer(() => {
      if (this.buffers.size === (pieceId + 1)) {
        this.buffers.clear();
        this.currentBufferIdx = 0;
        this.isProcessingPrevious = true;
        this.finishProcessing = true;
      }
    });
  }

  pollAudioBuffer(cb): any {

    if (this.isProcessingPrevious) {
      return this.audioBuffer;
    }

    this.isProcessingPrevious = true;

    let totalLength = 0;
    let seqIdx = this.currentBufferIdx;

    for (; seqIdx < this.buffers.size; seqIdx++) {
      if (this.buffers.has(seqIdx)) {
        totalLength += this.buffers.get(seqIdx).byteLength;
      } else {
        break;
      }
    }

    let dst = new Uint8Array(0);

    for (let i = this.currentBufferIdx; i < seqIdx; i++) {
      const buffer = this.buffers.get(i);

      const tmp = new Uint8Array(dst.byteLength + buffer.byteLength);
      tmp.set(new Uint8Array(dst), 0);
      tmp.set(new Uint8Array(buffer), dst.byteLength);

      dst = tmp;
    }

    if (dst.byteLength === 0) {
      this.isProcessingPrevious = false;
      return this.audioBuffer;
    }

    this.currentBufferIdx = 0;

    this.audioCtx.decodeAudioData(dst.buffer, (audioBuffer) => {
      this.audioBuffer = audioBuffer;
      this.isProcessingPrevious = false;
      cb(null);
    }, (error) => {
      console.error(error);
      this.isProcessingPrevious = false;
    }).catch((error) => {
      console.error(error);
      this.isProcessingPrevious = false;
    });
  }
}

class AudioVisualizer {
  static visualize(analyser: AnalyserNode, visualSelect): void {
    const canvas = document.querySelector('canvas');
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const canvasCtx = canvas.getContext('2d');


    const visualSetting = visualSelect.value;

    if (visualSetting === 's') {
      analyser.fftSize = 2048;
      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);

      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

      const draw = () => {

        const drawVisual = requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = '#121421';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgba(255, 255, 255)';

        canvasCtx.beginPath();

        const sliceWidth = WIDTH * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {

          const v = dataArray[i] / 128.0;
          const y = v * HEIGHT / 2;

          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
      };

      draw();

    } else if (visualSetting === 'f') {
      analyser.fftSize = 256;
      const bufferLengthAlt = analyser.frequencyBinCount;

      const dataArrayAlt = new Uint8Array(bufferLengthAlt);

      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

      const drawAlt = () => {
        const drawVisual = requestAnimationFrame(drawAlt);

        analyser.getByteFrequencyData(dataArrayAlt);

        canvasCtx.fillStyle = '#121421';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

        const barWidth = (WIDTH / bufferLengthAlt) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLengthAlt; i++) {
          barHeight = dataArrayAlt[i];

          canvasCtx.fillStyle = `rgb(${barHeight},${barHeight / 2},${barHeight / 3})`;
          canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);

          x += barWidth;
        }
      };

      drawAlt();

    } else if (visualSetting === 'off') {
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
      canvasCtx.fillStyle = 'red';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }
}
