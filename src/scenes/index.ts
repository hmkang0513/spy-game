// 씬 목록 (02 §4). 첫 번째 씬이 먼저 실행된다
import { BootScene } from './BootScene';
import { TitleScene } from './TitleScene';
import { LevelSelectScene } from './LevelSelectScene';
import { BriefingScene } from './BriefingScene';
import { LevelScene } from './LevelScene';
import { HUDScene } from './HUDScene';
import { DialogueScene } from './DialogueScene';
import { LockpickScene } from './LockpickScene';
import { PauseScene } from './PauseScene';
import { ResultScene } from './ResultScene';
import { CreditsScene } from './CreditsScene';

export const SCENES = [
  BootScene,
  TitleScene,
  LevelSelectScene,
  BriefingScene,
  LevelScene,
  HUDScene,
  DialogueScene,
  LockpickScene,
  PauseScene,
  ResultScene,
  CreditsScene,
];

