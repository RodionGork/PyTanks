$(function() {
    function doOperations() {
        if (operations.length == 0 || !game.isReady()) {
            return;
        }
        op = operations.shift();
        opcode = op[0];
        if (opcode == 'prn') {
            var pre = $('#output-pre');
            pre.text(pre.text() + op[1]);
            pre.scrollTop(pre[0].scrollHeight);
        } else if (opcode == 'end') {
            if (op[1] == -2) {
                game.explodeTank();
            }
            setTimeout(function() {window.gameEnd(op[1], op.length > 2 ? op[2] : null)}, 30);
        } else {
            try {
                game.operation(op);
            } catch (e) {
                alert('Error:\n' + e.message);
                operations = [];
            }
        }
    }
    
    setInterval(doOperations, 50);
});

function Game(w, h) {
    
    var self = this;
    var objGroup = null;
    var objects = null;
    var sz = 40;
    var width = w;
    var height = h;
    var stepTime = 500;
    var rotation = [[0, 1], [-1, 0], [0, -1], [1, 0]];
    var lcg0 = Math.floor(Math.random() * 1000000);
    var lcg = lcg0;
    var phaserGame;
    var busy = null;
    var sounds = {};
    var animate = {
        'star': function(o) {
            o.animations.add('ani');
            o.play('ani', 9 + Math.floor(Math.random() * 4), true);
        }
    };
    
    phaserGame = gameSetup();
    
    this.reset = function() {
        phaserGame.sound.stopAll();
        window.operations = [];
        destroy();
        busy = 'init';
    }
    
    this.isReady = function() {
        return busy === null;
    }
    
    this.isSuccess = function() {
        var stars = objects['star'];
        for (var i = 0; i < stars.length; i++) {
            if (stars[i].alive) {
                return false;
            }
        }
        return true;
    }
    
    this.setStepTime = function(t) {
        stepTime = t;
    }
    
    this.operation = function(op) {
        switch (op[0]) {
            case 'fwd': self.forward(); break;
            case 'lt': self.left(); break;
            case 'rt': self.right(); break;
            case 'pck': self.pick(); break;
            case 'fire': self.fire(op); break;
        }
    }
    
    this.forward = function() {
        var tank = getTank();
        tank.bringToTop();
        var rot = rotation[tank.rot];
        var nextX = tank.logicX + rot[0];
        var nextY = tank.logicY + rot[1];
        tank.move = {x0:tank.x, y0:tank.y, t0:phaserGame.time.now};
        tank.logicX = nextX;
        tank.logicY = nextY;
        tank.move.t1 = tank.move.t0 + stepTime;
        tank.move.x1 = mkX(tank.logicX);
        tank.move.y1 = mkY(tank.logicY);
        busy = 'move';
        if (!sounds.engine.isPlaying) {
            sounds.engine.fadeIn(200, 1);
        }
    }
    
    this.left = function() {
        turn(1);
    }
    
    this.right = function() {
        turn(-1);
    }
    
    this.pick = function() {
        var tank = getTank();
        var star = findObject(tank.logicX, tank.logicY, 'star');
        star.kill();
        sounds.pick.play();
    }
    
    function turn(phi) {
        var tank = getTank();
        tank.move = {d0: tank.rot * Math.PI / 2, t0: phaserGame.time.now};
        tank.rot = (tank.rot + rotation.length + phi) % rotation.length;
        tank.move.d1 = tank.move.d0 + phi * Math.PI / 2;
        tank.move.t1 = tank.move.t0 + stepTime;
        busy = 'turn';
        if (!sounds.engineTurn.isPlaying) {
            sounds.engineTurn.fadeIn(200, 1);
        }
    }
    
    this.fire = function(op) {
        var x = op[1];
        var y = op[2];
        var state = op[3];
        if (x < 0) {
            return;
        }
        var t = findObject(x, y, 'target');
        if (state > 0) {
            t.frame = state - 1;
        } else {
            t.kill();
            explode(x, y);
        }
    }
    
    function gameSetup() {
        var game = new Phaser.Game(width * sz, height * sz,
                Phaser.AUTO, 'gamescreen',
                { preload: gamePreload, update: gameUpdate, create: gameCreate });
        return game;
    }
    
    function rnd() {
        lcg = (250001 * lcg + 13) % 65536;
        return lcg;
    }
    
    function gamePreload() {
        phaserGame.load.spritesheet('star', dataUrl + 'star.png', 40, 40);
        phaserGame.load.spritesheet('target', dataUrl + 'target.png', 40, 40);
        phaserGame.load.spritesheet('fire', dataUrl + 'fire.png', 40, 40);
        phaserGame.load.image('wall', dataUrl + 'wall.png');
        phaserGame.load.image('hhog', dataUrl + 'hedgehog.png');
        phaserGame.load.spritesheet('tank', dataUrl + 'tank.png', 40, 40);
        phaserGame.load.spritesheet('grass', dataUrl + 'grass.png', 20, 20);
        loadSound('engine', 'engine');
        loadSound('engineturn', 'engine2');
        loadSound('explode', 'explode');
        loadSound('pick', 'pick');
        phaserGame.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        phaserGame.scale.maxWidth = width * sz;
        phaserGame.scale.maxHeight = height * sz;
        phaserGame.scale.refresh();
    }

    function loadSound(name, file) {
        phaserGame.load.audio(name, [dataUrl + file + '.mp3', dataUrl + file + '.ogg']);
    }
    
    function gameCreate() {
        sounds.engine = phaserGame.add.audio('engine');
        sounds.engineTurn = phaserGame.add.audio('engineturn');
        sounds.explode = phaserGame.add.audio('explode');
        sounds.pick = phaserGame.add.audio('pick');
        phaserGame.stage.backgroundColor = '#3c6';
        busy = 'init';
    }
    
    function reinit() {
        lcg = lcg0;
        objGroup = phaserGame.add.group();
        objects = [];
        placeGrass();
        var data = JSON.parse(window.fieldData)
        placeActiveElements(data.field);
        placeTank(data.tank);
    }
    
    function destroy() {
        for (var key in objects) {
            var obj = objects[key];
            if (obj instanceof Array) {
                for (var i in obj) {
                    obj[i].destroy();
                }
            } else {
                obj.destroy();
            }
        }
        objects = [];
        objGroup.destroy();
    }
    
    function placeGrass() {
        for (var j = 0; j < height; j++) {
            for (var i = 0; i < width; i++) {
                var g = rnd() % 7;
                if (g >= 2) {
                    continue;
                }
                addObject(i, j, 'grass').frame = g;
            }
        }
    }
    
    function placeActiveElements(field) {
        for (var y in field) {
            var row = field[y];
            for (var x in row) {
                var cell = row[x];
                if (['star', 'wall', 'hhog'].indexOf(cell) >= 0) {
                    addObject(x, y, cell);
                } else if (cell.startsWith('target')) {
                    placeTarget(x, y, cell);
                }
            }
        }
    }
    
    function placeTarget(x, y, cell) {
        addObject(x, y, 'target').frame = parseInt(cell.charAt(cell.length - 1)) - 1;
    }

    function placeTank(data) {
        addObject(data.x, data.y, 'tank');
        var tank = getTank();
        tank.animations.add('move');
        tank.rot = 0;
    }
    
    function getTank() {
        return (typeof(objects['tank']) != 'undefined' && objects['tank'].length > 0)
                ? objects['tank'][0] : null;
    }
    
    function findObject(x, y, kind) {
        var objs = objects[kind];
        if (typeof(objs) == 'undefined') {
            return null;
        }
        for (var i = 0; i < objs.length; i++) {
            var o = objs[i];
            if (o.logicX == x && o.logicY == y) {
                return o;
            }
        }
        return null;
    }
    
    function addObject(x, y, kind, callback) {
        var img = objGroup.create(mkX(x), mkY(y), kind);
        scale(img, sz, sz);
        img.logicX = x;
        img.logicY = y;
        img.anchor.setTo(0.5, 0.5);
        if (typeof(objects[kind]) == 'undefined') {
            objects[kind] = [];
        }
        objects[kind].push(img);
        if (typeof(callback) == 'function') {
            callback(img);
        }
        if (typeof(animate[kind]) != 'undefined') {
            animate[kind](img);
        }
        return img;
    }

    function mkX(x) {
        return x * sz + sz / 2;
    }
    
    function mkY(y) {
        return (height - y) * sz - sz / 2;
    }
    
    function scale(image, w, h) {
        image.scale.setTo(w / image.width, h / image.height);
    }
    
    function gameUpdate() {
        if (busy == 'init') {
            reinit();
            busy = null;
        }
        if (busy == 'move') {
            processMove();
        } else if (busy == 'turn') {
            processTurn();
        }
    }
    
    function processMove() {
        var tank = getTank();
        var move = tank.move;
        var now = phaserGame.time.now;
        var alpha = (now - move.t0) / (move.t1 - move.t0);
        if (alpha < 1) {
            tank.x = Math.round(alpha * (move.x1 - move.x0) + move.x0);
            tank.y = Math.round(alpha * (move.y1 - move.y0) + move.y0);
            tank.animations.play('move', 19, true);
        } else {
            tank.x = move.x1;
            tank.y = move.y1;
            tank.animations.stop();
            busy = null;
            setTimeout(function() {
                if (busy != 'move') sounds.engine.fadeOut(100);
            }, 60);
        }
    }
    
    function processTurn() {
        var tank = getTank();
        var move = tank.move;
        var now = phaserGame.time.now;
        var alpha = (now - move.t0) / (move.t1 - move.t0);
        if (alpha < 1) {
            tank.rotation = -(alpha * (move.d1 - move.d0) + move.d0);
            tank.animations.play('move', 19, true);
        } else {
            tank.rotation = - tank.rot * Math.PI / 2;
            tank.animations.stop();
            busy = null;
            setTimeout(function() {
                if (busy != 'turn') sounds.engineTurn.fadeOut(100);
            }, 60);
        }
    }
    
    this.explodeTank = function() {
        var tank = getTank();
        tank.kill();
        explode(tank.x, tank.y);
    }
    
    function explode(x, y) {
        sounds.explode.play();
        var tank = getTank();
        var fire = addObject(x, y, 'fire');
        fire.animations.add('ani');
        fire.play('ani', 11, true);
    }
    
    this.getObjects = function() {
        return objects;
    }
}

