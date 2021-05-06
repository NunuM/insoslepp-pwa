import {MatSnackBar} from '@angular/material/snack-bar';
import {PlayerErrorEvent} from './audio.service';
import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor(private snackBar: MatSnackBar) {
  }

  showMessage(message: string): void {
    const a = this.snackBar.open(message, '',
      {
        verticalPosition: 'top',
        horizontalPosition: 'center',
        duration: 3000
      }
    );
  }

  showPlayerError(event: PlayerErrorEvent): void {
    this.showMessage(`Error on audio ${event.data.id === -1 ? '' : event.data.id}: ${event.data.error.message}`);
    console.log(event.data.id, event.data.error);
  }

  showOnPlayError(error: Error): void {
    this.showMessage(`Error playing the audio: ${error.message}`);
  }

  unableToGetPostError(postId: number, error: Error): void {
    this.showMessage('Unable fetch post details. Please check your internet connection');
  }
}
