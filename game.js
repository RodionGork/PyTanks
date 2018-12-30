window.javascriptInit = function() {    
    var level = determineLevel();
    var bookUrl = dataUrl + 'book' + level[0] + '/';
    var buttonRun = $('#run-button');
    var buttonReset = $('#reset-button');
    var buttonSpeed = $('#speed-button');
    var divEditor = $('#editor');
    var normalTextColor = buttonReset.css('color');
    
    window.operations = [];
    brEditor = ace.edit('editor');
    brEditor.getSession().setMode("ace/mode/python");
    this.initCode = loadFile(dataUrl + 'game' + gamePrefix + '.py');
    var levelData = JSON.parse(loadFile(bookUrl + 'level' + level[1] + '.json'));
    prepareStatement();
    prepareCode();
    prepareTitle();
    prepareFieldData();
    game = new Game(levelData.width, levelData.height);
    buttonReset.click(gameReset);
    buttonSpeed.click(gameSpeed);
    buttonRun.click(gameRun);
    
    
    function gameReset() {
        buttonRun.removeClass('disabled');
        buttonReset.css('color', normalTextColor);
        divEditor.css('opacity', 1.0);
        brEditor.setReadOnly(false);
        $('#output pre').html('');
        prepareFieldData();
        game.reset();
    };
    
    function gameSpeed() {
        var hi = /1/.test(buttonSpeed.text());
        buttonSpeed.text(hi ? '3x' : '1x');
        game.setStepTime(hi ? 150 : 500);
    }
    
    function gameRun() {
        prepareFieldData();
        game.reset();
        window.runner();
    }
    
    function loadFile(url) {
        return $.ajax(url, {async:false}).responseText;
    }
    
    function determineLevel() {
        var m = location.href.match(/level[\=\_](\d+)([a-z]?)/);
        if (m == null || m.length < 1) {
            return ['100', '001'];
        }
        var v = parseInt(m[1]);
        var book = Math.floor(v / 1000);
        var lev = (v % 1000);
        var suf = m[2];
        $('#level-select').val(lev);
        var s = '00' + v;
        return ['' + book, s.substring(s.length - 3) + suf];
    }
    
    function nextLevel() {
        var url = $('#link-next').attr('href');
        if (url != '#') {
            location.href = url;
        } else {
            alert('Oh, it was the last level of a book!');
        }
    }
    
    window.simulationStart = function() {
        game.reset();
        buttonRun.addClass('disabled');
        brEditor.setReadOnly(true);
        divEditor.css('opacity', 0.5);
    }
    
    window.gameEnd = function(result, msg) {
        if (result == 1) {
            modalAlert('Well Done!',
                    'You have completed this level!<br/><br/>Switch to the next one?',
                    function() {
                nextLevel();
            });
        } else {
            buttonReset.css('color', 'red');
            modalAlert('ERROR', msg + '<br/><br/>Click Reset button...');
        }
        operations = [];
    }
    
    function prepareStatement() {
        var div = $('#statement-pane');
        if (div.html().match(/^\s*$/)) {
            div.html(loadFile(bookUrl + 'en/descr' + level[1] + '.txt'));
        }
    }
    
    function prepareCode() {
        var div = $('#editor');
        if (div.html().match(/^\s*$/)) {
            brEditor.setValue(loadFile(bookUrl + 'code' + level[1] + '.py'));
            brEditor.moveCursorTo(0, 0, false);
            brEditor.selection.clearSelection();
        }
    }
    
    function prepareTitle() {
        var h1 = $('h1');
        var text = h1.text();
        if (!text.match(/\-/)) {
            h1.text(text + ' - ' + levelData.title);
        }
    }
    
    function prepareFieldData() {
        window.fieldData = window.initField(this.initCode, JSON.stringify(levelData));
    }
    
    window.modalAlert = function(title, text, okCallback) {
        var dialog = $('#alert-modal');
        dialog.find('.modal-header').text(title);
        dialog.find('.modal-body').html(text);
        var ok = dialog.find('.btn-primary');
        if (typeof(okCallback) == 'function') {
            ok.removeClass('hide').off('click').on('click', function() {
                okCallback();
                dialog.modal('hide');
            });
        } else {
            ok.addClass('hide');
        }
        dialog.modal('show');
    }
};

$(function() {
    brython(1);
});

