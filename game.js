var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Game = (function () {
    function Game(canvasId) {
        var _this = this;
        this.gameStarted = false;
        this.gameOver = false;
        /** Number of frames until the next obstacle. */
        this.nextObstacle = Game.OBSTACLE_TIME;
        this.score = 0;
        this._canvas = document.getElementById(canvasId);
        this._ctx = this.canvas.getContext("2d");
        var bgTexture = document.getElementById("texture-bg");
        var floorTexture = document.getElementById("texture-floor");
        var joeTexture = document.getElementById("texture-joe");
        this.background = new ScrollingObject(bgTexture, 0, 0, this.canvas.width, this.canvas.height, Game.VELOCITY / 2);
        this.floor = new Floor(this, floorTexture);
        this.obstacles = [new Obstacle(this)];
        this.flash = new Flash(this);
        this.joe = new Joe(this, joeTexture);
        window.addEventListener("keydown", function (e) { return _this.keydown(e); }, false);
        window.requestAnimationFrame(function () { return _this.step(); });
    }
    Object.defineProperty(Game.prototype, "ctx", {
        get: function () {
            return this._ctx;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Game.prototype, "canvas", {
        get: function () {
            return this._canvas;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Game.prototype, "floor_y", {
        get: function () {
            return this.floor.y;
        },
        enumerable: true,
        configurable: true
    });
    Game.prototype.step = function () {
        var _this = this;
        if (this.gameStarted) {
            this.update();
        }
        this.draw();
        window.requestAnimationFrame(function () { return _this.step(); });
    };
    Game.prototype.draw = function () {
        var ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.background.draw(this);
        for (var _i = 0, _a = this.obstacles; _i < _a.length; _i++) {
            var obstacle = _a[_i];
            obstacle.draw(this);
        }
        this.floor.draw(this);
        this.joe.draw(this);
        this.flash.draw(this);
        ctx.fillStyle = "red";
        ctx.font = "40px sans-serif";
        ctx.fillText("Score: " + this.score, 100, 100);
    };
    Game.prototype.update = function () {
        // Check to see if Joe has collided with anything
        for (var _i = 0, _a = this.obstacles; _i < _a.length; _i++) {
            var obstacle = _a[_i];
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
        if (this.gameOver)
            return;
        this.background.update(this);
        this.floor.update(this);
        for (var _b = 0, _c = this.obstacles; _b < _c.length; _b++) {
            var obstacle = _c[_b];
            obstacle.update(this);
        }
        // See if Joe passed an obstacle
        for (var _d = 0, _e = this.obstacles; _d < _e.length; _d++) {
            var obstacle = _e[_d];
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
            this.obstacles.push(new Obstacle(this));
            this.nextObstacle = Game.OBSTACLE_TIME;
        }
        else {
            this.nextObstacle--;
        }
    };
    Game.prototype.add_point = function () {
        this.score++;
    };
    Game.prototype.end_game = function () {
        if (!this.gameOver) {
            this.flash.flash();
            this.gameOver = true;
        }
    };
    Game.prototype.keydown = function (e) {
        var code = e.keyCode;
        if (code == 32) {
            if (!this.gameStarted) {
                this.gameStarted = true;
                this.joe.jump();
            }
            else if (!this.gameOver) {
                this.joe.jump();
            }
        }
    };
    return Game;
}());
/** The speed that all the obstacles move at. */
Game.VELOCITY = -2;
/** Number of frames between obstacles. */
Game.OBSTACLE_TIME = 200;
var GameObject = (function () {
    function GameObject(x, y, width, height) {
        if (width === void 0) { width = 0; }
        if (height === void 0) { height = 0; }
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    return GameObject;
}());
var RectangularObject = (function (_super) {
    __extends(RectangularObject, _super);
    function RectangularObject() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RectangularObject.prototype.is_collision = function (other) {
        return this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y;
    };
    return RectangularObject;
}(GameObject));
/** An object which has a scrolling, repeating texture, like a background. */
var ScrollingObject = (function (_super) {
    __extends(ScrollingObject, _super);
    function ScrollingObject(texture, x, y, width, height, vx) {
        var _this = _super.call(this, x, y, width, height) || this;
        /** The offset of the texture. */
        _this.offsetX = 0;
        _this.texture = texture;
        _this.vx = vx;
        return _this;
    }
    ScrollingObject.prototype.draw = function (game) {
        game.ctx.drawImage(this.texture, this.offsetX, this.y);
        game.ctx.drawImage(this.texture, this.offsetX + this.texture.width, this.y);
    };
    ScrollingObject.prototype.update = function (game) {
        this.offsetX += this.vx;
        if (this.offsetX < -this.texture.width) {
            this.offsetX = 0;
        }
    };
    return ScrollingObject;
}(RectangularObject));
var Floor = (function (_super) {
    __extends(Floor, _super);
    function Floor(game, texture) {
        return _super.call(this, texture, 0, game.canvas.height - 100, game.canvas.width, 100, Game.VELOCITY) || this;
    }
    return Floor;
}(ScrollingObject));
var ObstacleTop = (function (_super) {
    __extends(ObstacleTop, _super);
    function ObstacleTop(x, y, width, height) {
        return _super.call(this, x, y, width, height) || this;
    }
    ObstacleTop.prototype.draw = function (game) {
        game.ctx.save();
        game.ctx.fillStyle = "green";
        game.ctx.fillRect(this.x, this.y, this.width, this.height);
        game.ctx.restore();
    };
    ObstacleTop.prototype.update = function (game) { };
    return ObstacleTop;
}(RectangularObject));
var ObstacleBottom = (function (_super) {
    __extends(ObstacleBottom, _super);
    function ObstacleBottom(x, y, width, height) {
        return _super.call(this, x, y, width, height) || this;
    }
    ObstacleBottom.prototype.draw = function (game) {
        game.ctx.save();
        game.ctx.fillStyle = "green";
        game.ctx.fillRect(this.x, this.y, this.width, this.height);
        game.ctx.restore();
    };
    ObstacleBottom.prototype.update = function (game) { };
    return ObstacleBottom;
}(RectangularObject));
var Obstacle = (function (_super) {
    __extends(Obstacle, _super);
    function Obstacle(game) {
        var _this = _super.call(this, game.canvas.width, 0, 100, game.canvas.height) || this;
        /** Whether Joe has passed this obstacle. */
        _this.passed = false;
        var splitY = Math.random() * (game.floor_y - 100 - Obstacle.SPACING) + 50;
        _this.top = new ObstacleTop(_this.x, _this.y, _this.width, splitY);
        _this.bottom = new ObstacleBottom(_this.x, splitY + Obstacle.SPACING, _this.width, _this.height - splitY - Obstacle.SPACING);
        return _this;
    }
    Obstacle.prototype.draw = function (game) {
        this.top.draw(game);
        this.bottom.draw(game);
    };
    Obstacle.prototype.update = function (game) {
        this.x += Game.VELOCITY;
        this.top.x = this.x;
        this.bottom.x = this.x;
    };
    Obstacle.prototype.is_collision = function (other) {
        return this.top.is_collision(other) || this.bottom.is_collision(other);
    };
    return Obstacle;
}(GameObject));
Obstacle.SPACING = 200;
var Joe = (function (_super) {
    __extends(Joe, _super);
    function Joe(game, texture) {
        var _this = _super.call(this, 200, game.floor_y / 2 - Joe.HEIGHT / 2, Joe.WIDTH, Joe.HEIGHT) || this;
        _this.vy = 0;
        _this.texture = texture;
        return _this;
    }
    Joe.prototype.draw = function (game) {
        var ctx = game.ctx;
        var adjVy = this.vy;
        var angle = Math.atan(this.vy / 5);
        if (angle < -Math.PI / 4) {
            angle = -Math.PI / 4;
        }
        ctx.save();
        ctx.translate(this.x + this.width / 2 + 5, this.y + this.height / 2 + 10);
        ctx.rotate(angle);
        ctx.drawImage(this.texture, -this.width / 2 - 5, -this.height / 2 - 15);
        ctx.restore();
    };
    Joe.prototype.update = function (game) {
        this.y += this.vy;
        this.vy += 0.75;
        if (this.y + this.height - 10 > game.floor_y) {
            this.y = game.floor_y - this.height + 10;
        }
        else if (this.y < -10) {
            this.y = -10;
        }
    };
    Joe.prototype.jump = function () {
        this.vy = -10;
    };
    return Joe;
}(RectangularObject));
Joe.HEIGHT = 70;
Joe.WIDTH = 100;
/** The "game over" white flash. */
var Flash = (function (_super) {
    __extends(Flash, _super);
    function Flash(game) {
        var _this = _super.call(this, 0, 0, game.canvas.width, game.canvas.height) || this;
        _this.alpha = 0;
        return _this;
    }
    Flash.prototype.flash = function () {
        this.alpha = 1;
    };
    Flash.prototype.draw = function (game) {
        game.ctx.save();
        game.ctx.fillStyle = "rgba(255,255,255," + this.alpha + ")";
        game.ctx.fillRect(this.x, this.y, this.width, this.height);
        game.ctx.restore();
    };
    Flash.prototype.update = function (game) {
        if (this.alpha > 0) {
            this.alpha -= 0.05;
        }
    };
    return Flash;
}(RectangularObject));
function init() {
    var game = new Game("canvas");
}
