import random

class Tank:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.az = 0

class CustomException(Exception):
    def __init__(self, msg, result, ops):
        super().__init__(msg)
        self.customException = True
        self.result = result
        self.ops = ops

class TimeoutException(CustomException):
    def __init__(self, result, ops):
        super().__init__('Code runs too long, perhaps in endless loop', result, ops)

rot = [[0, 1], [-1, 0], [0, -1], [1, 0]]
operations = []
info = {}
field = []
stars = 0
tank = None
result = 0
time_start = 0

def failure(msg, res = -1):
    global result
    add_op(['end', res, msg])
    result = res
    raise CustomException('program attempted an incorrect operation', result, operations)

def add_op(o):
    if result == 0:
        operations.append(o)

def _write(x):
    add_op(['prn', x])

def _write_err(x):
    add_op(['err'], x)

def check_time():
    if _time() - time_start > 1000:
        dbg('bla')
        raise TimeoutException(result, operations)

def look_at(x, y):
    if x < 0 or x >= info.width or y < 0 or y >= info.height:
        return 'out'
    else:
        return field[y][x]
    
    
def look_dir(d):
    check_time()
    dx, dy = rot[(tank.az + d) % 4]
    return look_at(tank.x + dx, tank.y + dy)

def look_ahead():
    return look_dir(0)

def look_right():
    return look_dir(3)

def look_left():
    return look_dir(1)

def look_below():
    check_time()
    return field[tank.y][tank.x]
    
def forward():
    check_time()
    dx, dy = rot[tank.az]
    tank.x += dx
    tank.y += dy
    peek = look_at(tank.x, tank.y)
    if peek == 'out':
        failure('Tank run out of the battlefield!', -2)
    elif peek in ['wall', 'hhog']:
        failure('Tank collided with an obstacle!', -2)
    else:
        add_op(['fwd'])

def left():
    check_time()
    tank.az = (tank.az + 1) % len(rot)
    add_op(['lt'])

def right():
    check_time()
    tank.az = (tank.az + 3) % len(rot)
    add_op(['rt'])

def pick():
    global stars
    check_time()
    if result != 0:
        return
    if field[tank.y][tank.x] != 'star':
        failure('There is no star to pick up!')
    else:
        add_op(['pck'])
        stars += 1
        field[tank.y][tank.x] = ''

def fire():
    curx, cury = tank.x, tank.y
    dx, dy = rot[tank.az]
    while True:
        curx += dx
        cury += dy
        v = look_at(curx, cury)
        if v in ['out', 'wall']:
            add_op(['fire', -1, -1, -1])
            break
        if v.startswith('target'):
            hits = int(v[-1]) - 1
            add_op(['fire', curx, cury, hits])
            field[cury][curx] = '' if hits == 0 else ('target-' + str(hits))
            break

def tank_x():
    return tank.x

def tank_y():
    return tank.y

def place_objects_rnd(field, kind, spots, amt):
    s = list(spots)
    random.shuffle(s)
    s = s[:amt]
    add_op(['put', kind, s])
    for i in range(amt):
        x, y = s[i]
        field[y][x] = kind

def place_objects(field, kind, os):
    total = 0
    for o in os:
        if hasattr(o, 'x'):
            field[o.y][o.x] = kind
            total += 1
        elif hasattr(o, 'spots'):
            amt = 1
            if hasattr(o, 'amt'):
                amt = o.amt
            place_objects_rnd(field, kind, o.spots, amt)
            total += amt
    return total

def place_walls(field, walls):
    for w in walls:
        cnt = 1
        dx = 0
        dy = 0
        if hasattr(w, 'len'):
            cnt = w.len
            dx = 1
        elif hasattr(w, 'ht'):
            cnt = w.ht
            dy = 1
        for i in range(cnt):
            field[w.y + i * dy][w.x + i * dx] = 'wall'

def place_targets(field, ts):
    for t in ts:
        hits = 1 if not hasattr(t, 'hits') else t.hits
        field[t.y][t.x] = 'target-' + str(hits)

def place_tank_rnd(field, data_tank):
    place_objects_rnd(field, 'tank', data_tank.spots, 1)
    dbg(operations[-1])
    x, y = operations[-1][2][0]
    dbg('placing tank randomly {} {}'.format(x, y))
    field[y][x] = ''
    return (x, y)

def create_state(data):
    field = []
    for i in range(data.height):
        field.append([''] * data.width)
    if hasattr(data, 'stars'):
        total_stars = place_objects(field, 'star', data.stars)
    else:
        total_stars = 0
    if hasattr(data, 'walls'):
        place_walls(field, data.walls)
    if hasattr(data, 'hhogs'):
        place_objects(field, 'hhog', data.hhogs)
    if hasattr(data, 'targets'):
        place_targets(field, data.targets)
    if not hasattr(data.tank, 'x'):
        x, y = place_tank_rnd(field, data.tank)
    else:
        x, y = data.tank.x, data.tank.y
    return {'field':field, 'tank':{'x':x, 'y':y, 'd':0},
            'info':{'width':data.width, 'height':data.height, 'stars':total_stars}}

def level_init(data):
    global time_start, field, tank, info
    setup(_write)
    field = data.field
    tank = Tank(data.tank.x, data.tank.y)
    info = data.info
    time_start = _time()
    dbg('initialized')

def check_is_setup():
    return __name__ == '__setup__'

if not check_is_setup():
    dbg('calling level_init')
    level_init(field_data)

#user_code#

def level_main():
    global result
    if result == 0:
        stars_left = info.stars - stars
        if stars_left > 0:
            failure('Not all stars were picked up!\n{} more left...'.format(stars_left))
        else:
            add_op(['end', 1])
            result = 1
    done(operations)

if not check_is_setup():
    dbg('calling level_main')
    level_main()
else:
    dbg('calling create_state')
    level_setup_result['res'] = create_state(level_data)

