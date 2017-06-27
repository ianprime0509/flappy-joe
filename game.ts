class Game {
    /** The speed that all the obstacles move at. */
    static readonly VELOCITY: number = -2;
    /** Number of frames between obstacles. */
    private static readonly OBSTACLE_TIME: number = 200;

    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;

    private gameStarted: boolean = false;
    private gameOver: boolean = false;
    /** Number of frames until the next obstacle. */
    private nextObstacle: number = Game.OBSTACLE_TIME;
    private score: number = 0;

    private obstacleTexture: HTMLImageElement;

    private background: ScrollingObject;
    private flash: Flash;
    private joe: Joe;
    private floor: Floor;
    private obstacles: Obstacle[];

    constructor(canvasId: string) {
        this._canvas = <HTMLCanvasElement>document.getElementById(canvasId);
        this._ctx = this.canvas.getContext("2d")!;

        let bgTexture = <HTMLImageElement>document.getElementById("texture-bg");
        let floorTexture = <HTMLImageElement>document.getElementById("texture-floor");
        let joeTexture = <HTMLImageElement>document.getElementById("texture-joe");

        this.obstacleTexture = <HTMLImageElement>document.getElementById("texture-obstacle");

        this.background = new ScrollingObject(bgTexture, 0, 0, this.canvas.width, this.canvas.height, Game.VELOCITY / 2);
        this.floor = new Floor(this, floorTexture);
        this.obstacles = [new Obstacle(this, this.obstacleTexture)];
        this.flash = new Flash(this);
        this.joe = new Joe(this, joeTexture);

        window.addEventListener("keydown", (e) => this.keydown(e), false);
        window.requestAnimationFrame(() => this.step());
    }

    get ctx(): CanvasRenderingContext2D {
        return this._ctx;
    }

    get canvas(): HTMLCanvasElement {
        return this._canvas;
    }

    get floor_y(): number {
        return this.floor.y;
    }

    private step() {
        if (this.gameStarted) {
            this.update();
        }
        this.draw();

        window.requestAnimationFrame(() => this.step());
    }

    private draw() {
        let ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.background.draw(this);
        for (let obstacle of this.obstacles) {
            obstacle.draw(this);
        }
        this.floor.draw(this);
        this.joe.draw(this);
        this.flash.draw(this);

        // Draw score counter
        if (this.gameStarted && !this.gameOver) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(this.canvas.width / 2 - 100, 10, 200, 70);
            ctx.fillStyle = "black";
            ctx.font = "40px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, 40, 200);
        }
    }

    private update() {
        // Check to see if Joe has collided with anything
        for (let obstacle of this.obstacles) {
            if (obstacle.is_collision(this.joe)) {
                this.end_game();
            }
        }
        if (this.floor.is_collision(this.joe)) {
            this.end_game();
        }

        this.flash.update(this);
        this.joe.update(this);

        // Everything after this point should not update when the game has ended
        if (this.gameOver) return;

        this.background.update(this);
        this.floor.update(this);
        for (let obstacle of this.obstacles) {
            obstacle.update(this);
        }

        // See if Joe passed an obstacle
        for (let obstacle of this.obstacles) {
            if (!obstacle.passed && this.joe.x + this.joe.width / 2 > obstacle.x + obstacle.width / 2) {
                obstacle.passed = true;
                this.add_point();
            }
        }

        // See if we can get rid of any obstacles
        if (this.obstacles.length != 0 && this.obstacles[0].x + this.obstacles[0].width <= 0) {
            this.obstacles.shift();
        }
        // Generate a new obstacle if necessary
        if (this.nextObstacle == 0) {
            this.obstacles.push(new Obstacle(this, this.obstacleTexture));
            this.nextObstacle = Game.OBSTACLE_TIME;
        } else {
            this.nextObstacle--;
        }
    }

    private add_point() {
        this.score++;
    }

    private end_game() {
        if (!this.gameOver) {
            this.flash.flash();
            this.gameOver = true;
        }
    }

    private keydown(e: KeyboardEvent) {
        let code = e.keyCode;
        if (code == 32) {
            if (!this.gameStarted) {
                this.gameStarted = true;
                this.joe.jump();
            } else if (!this.gameOver) {
                this.joe.jump();
            }
        }
    }
}

abstract class GameObject {
    public x: number;
    public y: number;
    public width: number;
    public height: number;

    constructor(x: number, y: number, width: number = 0, height: number = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    public abstract draw(game: Game): void;
    public abstract update(game: Game): void;
}

abstract class RectangularObject extends GameObject {
    public is_collision(other: RectangularObject) {
        return this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y;
    }
}

/** An object which has a scrolling, repeating texture, like a background. */
class ScrollingObject extends RectangularObject {
    private texture: HTMLImageElement;
    private vx: number;
    /** The offset of the texture. */
    private offsetX: number = 0;

    constructor(texture: HTMLImageElement, x: number, y: number, width: number, height: number, vx: number) {
        super(x, y, width, height);
        this.texture = texture;
        this.vx = vx;
    }

    public draw(game: Game) {
        game.ctx.drawImage(this.texture, this.offsetX, this.y);
        game.ctx.drawImage(this.texture, this.offsetX + this.texture.width, this.y);
    }

    public update(game: Game) {
        this.offsetX += this.vx;
        if (this.offsetX < -this.texture.width) {
            this.offsetX = 0;
        }
    }
}

class Floor extends ScrollingObject {
    constructor(game: Game, texture: HTMLImageElement) {
        super(texture, 0, game.canvas.height - 100, game.canvas.width, 100, Game.VELOCITY);
    }
}

class ObstacleTop extends RectangularObject {
    private texture: HTMLImageElement;

    constructor(texture: HTMLImageElement, x: number, y: number, width: number, height: number) {
        super(x, y, width, height);
        this.texture = texture;
    }

    public draw(game: Game) {
        // Draw texture tiling upwards
        for (let y = this.y + this.height - this.texture.height; y + this.texture.height >= 0; y -= this.texture.height) {
            game.ctx.drawImage(this.texture, this.x, y);
        }
    }

    public update(game: Game) { }
}

class ObstacleBottom extends RectangularObject {
    private texture: HTMLImageElement;

    constructor(texture: HTMLImageElement, x: number, y: number, width: number, height: number) {
        super(x, y, width, height);
        this.texture = texture;
    }

    public draw(game: Game) {
        // Draw texture tiling downwards
        for (let y = this.y; y <= game.floor_y; y += this.texture.height) {
            game.ctx.drawImage(this.texture, this.x, y);
        }
    }

    public update(game: Game) { }
}

class Obstacle extends GameObject {
    private static readonly SPACING: number = 200;

    private top: ObstacleTop;
    private bottom: ObstacleBottom;

    /** Whether Joe has passed this obstacle. */
    public passed: boolean = false;

    constructor(game: Game, texture: HTMLImageElement) {
        super(game.canvas.width, 0, texture.width, game.canvas.height);
        let splitY = Math.random() * (game.floor_y - 100 - Obstacle.SPACING) + 50;
        this.top = new ObstacleTop(texture, this.x, this.y, this.width, splitY);
        this.bottom = new ObstacleBottom(texture, this.x, splitY + Obstacle.SPACING, this.width, this.height - splitY - Obstacle.SPACING);
    }

    public draw(game: Game) {
        this.top.draw(game);
        this.bottom.draw(game);
    }

    public update(game: Game) {
        this.x += Game.VELOCITY;
        this.top.x = this.x;
        this.bottom.x = this.x;
    }

    public is_collision(other: RectangularObject) {
        return this.top.is_collision(other) || this.bottom.is_collision(other);
    }
}

class Joe extends RectangularObject {
    private static readonly HEIGHT: number = 70;
    private static readonly WIDTH: number = 100;

    private texture: HTMLImageElement;
    private vy: number = 0;

    constructor(game: Game, texture: HTMLImageElement) {
        super(200, game.floor_y / 2 - Joe.HEIGHT / 2, Joe.WIDTH, Joe.HEIGHT);
        this.texture = texture;
    }

    public draw(game: Game) {
        let ctx = game.ctx;

        let adjVy = this.vy;
        let angle = Math.atan(this.vy / 5);
        if (angle < -Math.PI / 4) {
            angle = -Math.PI / 4;
        }
        ctx.save();
        ctx.translate(this.x + this.width / 2 + 5, this.y + this.height / 2 + 10);
        ctx.rotate(angle);
        ctx.drawImage(this.texture, -this.width / 2 - 5, -this.height / 2 - 15);
        ctx.restore();
    }

    public update(game: Game) {
        this.y += this.vy;
        this.vy += 0.75;

        if (this.y + this.height - 10 > game.floor_y) {
            this.y = game.floor_y - this.height + 10;
        } else if (this.y < -10) {
            this.y = -10;
        }
    }

    public jump() {
        this.vy = -10;
    }
}

/** The "game over" white flash. */
class Flash extends RectangularObject {
    private alpha: number = 0;

    constructor(game: Game) {
        super(0, 0, game.canvas.width, game.canvas.height);
    }

    public flash() {
        this.alpha = 1;
    }

    public draw(game: Game) {
        game.ctx.save();
        game.ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
        game.ctx.fillRect(this.x, this.y, this.width, this.height);
        game.ctx.restore();
    }

    public update(game: Game) {
        if (this.alpha > 0) {
            this.alpha -= 0.05;
        }
    }
}

function init() {
    let game = new Game("canvas");
}
