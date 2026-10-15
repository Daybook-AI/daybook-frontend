import { Component, Input } from '@angular/core';
import { LucideSparkles, LucideLoaderCircle } from '@lucide/angular';

@Component({
  selector: 'app-analyse-button',
  imports: [
    LucideLoaderCircle,
    LucideSparkles
  ],
  templateUrl: './analyse-button.html',
  styleUrl: './analyse-button.scss',
})
export class AnalyseButton {


  @Input({ required: true })
  journalId!: number;

  isAnalyzing = false;

  analyzeEntry() {
    if (this.isAnalyzing || !this.journalId) {
      return;
    }

    this.isAnalyzing = true;


  }
}
