import {Component, OnInit} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {FormControl, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-bug-report-dialogue',
  templateUrl: './bug-report-dialogue.component.html',
  styleUrls: ['./bug-report-dialogue.component.css']
})
export class BugReportDialogueComponent {

  textControl: FormControl;

  constructor(public dialogRef: MatDialogRef<BugReportDialogueComponent>) {
    this.textControl = new FormControl('');
  }

  sendBug(): void {
    this.dialogRef.close({message: this.textControl.value});
  }
}
