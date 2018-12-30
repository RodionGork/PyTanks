import _sys, json
from browser import document, window, alert
from javascript import JSConstructor

ops = []

class Struct:
    def __init__(self):
        pass

def dict_to_obj(d):
    if type(d) is list:
        return list(map(dict_to_obj, d))
    if not type(d) is dict:
        return d
    o = Struct()
    for k in d:
        v = dict_to_obj(d[k])
        setattr(o, k, v)
    return o

def json_to_obj(s):
    return dict_to_obj(json.loads(s))
	
def done(operations):
    ops.clear()
    ops.extend(operations)

def _input():
    return ''

def _write_err(x):
    alert(x)

def setup(write):
    _sys.stdout.write = write

def _time():
    Date = JSConstructor(window.Date)
    return Date().getTime()

def dbg(s):
    window.console.log(s)

def init_field(level_code, level_data):
    setup_result = {}
    level_data = json_to_obj(level_data)
    ns = {'__name__':'__setup__', 'level_data':level_data,
        'level_setup_result': setup_result, 'dbg':dbg}
    exec(level_code, ns)
    return json.dumps(setup_result['res'])

def runner():
    global ops
    window.simulationStart()
    field_data = json_to_obj(window.fieldData)
    ns = {'__name__':'__game__', 'setup':setup, 'done':done, '_time':_time,
        'field_data':field_data, 'input':_input, 'dbg':dbg}
    user_code = window.brEditor.getValue()
    code = window.initCode.replace('#user_code#', user_code)
    try:
        exec(code, ns)
        dbg('done')
    except Exception as e:
        dbg('exc')
        if not hasattr(e, 'result'):
            window.modalAlert('Code Error:', str(e))
            return
        elif e.result >= 0:
            window.modalAlert('Execution Error:', str(e))
            return
        else:
            ops = e.ops
    window.operations = []
    window.operations.extend(ops)

window.initField = init_field
window.runner = runner

#_sys.stdout.write = _write
_sys.stderr.write = _write_err

window.javascriptInit();
