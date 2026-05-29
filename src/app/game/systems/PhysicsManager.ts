import Phaser from 'phaser';
import { Player }         from '../objects/Player';
import { Obstacle }       from '../objects/Obstacle';
import { Enemy }          from '../objects/Enemy';
import { EventBus }       from '../systems/EventBus';
import { GameEvent, Vec2 } from '../config/types';
import { GAME_CONFIG }    from '../config/GameConfig';

const NEAR_MISS_DIST = 35;

export class PhysicsManager {
  private scene: Phaser.Scene;
  private player: Player;
  private obstacleGroup: Phaser.Physics.Arcade.Group | null = null;
  private enemyGroup:    Phaser.Physics.Arcade.Group | null = null;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene  = scene;
    this.player = player;
  }

  registerObstacleGroup(group: Phaser.Physics.Arcade.Group): void {
    this.obstacleGroup = group;

    // Collider: player bounces off obstacles
    this.scene.physics.add.collider(
      this.player,
      group,
      (playerObj, obsObj) => {
        const obs = obsObj as unknown as Obstacle;
        if (!obs.isActive()) return;

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);

        // Destroy on impact
        obs.takeDamage(1);

        // Reflect velocity (handled by Phaser bounce, but add a nudge)
        this.player.onBounce({ x: 0, y: 0 });

        // Near-miss check for other obstacles
        this._checkNearMisses(obsObj as Phaser.GameObjects.GameObject);
      },
    );
  }

  registerEnemyGroup(group: Phaser.Physics.Arcade.Group): void {
    this.enemyGroup = group;

    // Overlap: player destroys enemies on touch
    this.scene.physics.add.overlap(
      this.player,
      group,
      (playerObj, enemyObj) => {
        const en = enemyObj as unknown as Enemy;
        if (!en.isActive()) return;
        en.takeDamage(1);
        this.player.onBounce({ x: 0, y: 0 });
        this._checkNearMisses(enemyObj as Phaser.GameObjects.GameObject);
      },
    );
  }

  private _checkNearMisses(hitObj: Phaser.GameObjects.GameObject): void {
    if (!this.obstacleGroup) return;

    const px = this.player.x;
    const py = this.player.y;

    for (const obj of this.obstacleGroup.getChildren()) {
      if (obj === hitObj) continue;
      const obs = obj as unknown as Obstacle;
      if (!obs.isActive()) continue;
      const dist = Math.hypot(px - obs.x, py - obs.y);
      if (dist < NEAR_MISS_DIST + GAME_CONFIG.physics.playerRadius) {
        EventBus.emit(GameEvent.PLAYER_NEAR_MISS, {
          position: { x: px, y: py },
          obstaclePos: { x: obs.x, y: obs.y },
          dist,
        });
        break; // one near-miss per frame is enough
      }
    }
  }

  update(_delta: number): void {
    // World-bounds bounce → detect and emit PLAYER_BOUNCE
    const body  = this.player.body as Phaser.Physics.Arcade.Body;
    const bData = body.blocked;
    if (bData.left || bData.right) {
      const normal: Vec2 = { x: bData.left ? 1 : -1, y: 0 };
      this.player.onBounce(normal);
    }
    if (bData.up || bData.down) {
      const normal: Vec2 = { x: 0, y: bData.up ? 1 : -1 };
      this.player.onBounce(normal);
    }
  }

  destroy(): void {
    // Colliders are destroyed with the scene
  }
}
