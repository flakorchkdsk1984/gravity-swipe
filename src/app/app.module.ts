import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';
import { GameComponent } from './game/game.component';
import { GameUIComponent } from './game/ui/game-ui.component';
import { GameOverComponent } from './game/ui/game-over.component';
import { TutorialComponent } from './game/ui/tutorial.component';
import { GameStateService } from './game/services/game-state.service';

@NgModule({
  declarations: [
    AppComponent,
    GameComponent,
    GameUIComponent,
    GameOverComponent,
    TutorialComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
  ],
  providers: [GameStateService],
  bootstrap: [AppComponent],
})
export class AppModule {}
