"""Draws the Drone Shots reference diagrams (one PNG per drone move) into drone-shots/.

Run: python scripts/drone_diagrams.py
Each image shows the drone, the subject, the flight path (dashed arrow) and where the camera points (light cone).
A faded drone marks where the move starts, the solid drone marks where it ends.
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = 2                      # supersample factor, scaled down at the end for smooth edges
W, H = 1920, 1080          # 16:9 like the preview popup
SCENE = 0.72               # the scene is shrunk into the middle 4:3 area, which is what the grid cards show
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'drone-shots')

BG_TOP = (14, 19, 23)
BG_BOT = (26, 34, 41)
GROUND = (36, 46, 54)
HILL = (30, 39, 46)
GRID = (255, 255, 255, 10)
DRONE = (232, 237, 241)
SUBJECT = (244, 162, 97)
PATH = (94, 200, 242)
TEXT = (200, 210, 218)
MUTED = (120, 134, 145)
TREE = (52, 70, 62)

FONT_DIR = 'C:/Windows/Fonts/'
def font(size, bold=False):
    name = 'segoeuib.ttf' if bold else 'segoeui.ttf'
    try:
        return ImageFont.truetype(FONT_DIR + name, size * S)
    except OSError:
        return ImageFont.load_default()

def p(x, y):
    return (x * S, y * S)

class Canvas:
    def __init__(self, view):
        self.view = view
        self.bg = Image.new('RGBA', (W * S, H * S))
        d = ImageDraw.Draw(self.bg)
        for y in range(H * S):
            t = y / (H * S)
            c = tuple(int(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3))
            d.line([(0, y), (W * S, y)], fill=c + (255,))
        self.img = self.bg
        self.layer('grid')
        self.bg = self.img
        self.img = self.overlay()   # the scene (drones, subject, paths) is drawn here, then shrunk on save

    def back(self, lay):
        self.bg = Image.alpha_composite(self.bg, lay)

    def overlay(self):
        return Image.new('RGBA', self.img.size, (0, 0, 0, 0))

    def comp(self, layer):
        self.img = Image.alpha_composite(self.img, layer)

    def layer(self, kind):
        lay = self.overlay()
        d = ImageDraw.Draw(lay)
        if kind == 'grid':
            step = 80
            for x in range(0, W, step):
                d.line([p(x, 0), p(x, H)], fill=GRID, width=S)
            for y in range(0, H, step):
                d.line([p(0, y), p(W, y)], fill=GRID, width=S)
        self.comp(lay)

    # ---- scenery ----
    def ground(self, gy=950):   # background ground line; the scene's own ground (GY) is placed onto it on save
        lay = self.overlay()
        d = ImageDraw.Draw(lay)
        pts = [p(0, gy - 60)]
        for x in range(0, W + 40, 40):
            y = gy - 70 - 45 * math.sin(x / 260.0) - 25 * math.sin(x / 97.0 + 1.3)
            pts.append(p(x, y))
        pts += [p(W, gy), p(0, gy)]
        d.polygon(pts, fill=HILL + (255,))
        d.rectangle([p(0, gy), p(W, H)], fill=GROUND + (255,))
        d.line([p(0, gy), p(W, gy)], fill=(70, 84, 94, 255), width=3 * S)
        self.back(lay)

    def top_ground(self):
        lay = self.overlay()
        d = ImageDraw.Draw(lay)
        # a path running across the frame, seen from above
        d.rectangle([p(0, 560), p(W, 700)], fill=(40, 50, 58, 255))
        for x in range(0, W, 120):
            d.rectangle([p(x, 626), p(x + 60, 634)], fill=(70, 84, 94, 255))
        self.back(lay)

    def tree(self, x, gy=820, h=330):
        lay = self.overlay()
        d = ImageDraw.Draw(lay)
        d.rectangle([p(x - 16, gy - h * 0.45), p(x + 16, gy)], fill=(44, 52, 50, 255))
        d.ellipse([p(x - 120, gy - h), p(x + 120, gy - h * 0.35)], fill=TREE + (255,))
        d.ellipse([p(x - 80, gy - h - 50), p(x + 90, gy - h * 0.6)], fill=(60, 80, 70, 255))
        self.comp(lay)

    def person_side(self, x, gy=820, alpha=255, scale=1.0):
        lay = self.overlay()
        d = ImageDraw.Draw(lay)
        c = SUBJECT + (alpha,)
        hgt = 150 * scale
        d.ellipse([p(x - 20 * scale, gy - hgt), p(x + 20 * scale, gy - hgt + 40 * scale)], fill=c)
        d.rounded_rectangle([p(x - 26 * scale, gy - hgt + 46 * scale), p(x + 26 * scale, gy - 52 * scale)], radius=14 * S, fill=c)
        d.rounded_rectangle([p(x - 22 * scale, gy - 60 * scale), p(x - 4 * scale, gy)], radius=6 * S, fill=c)
        d.rounded_rectangle([p(x + 4 * scale, gy - 60 * scale), p(x + 22 * scale, gy)], radius=6 * S, fill=c)
        self.comp(lay)

    def person_top(self, x, y, alpha=255):
        lay = self.overlay()
        d = ImageDraw.Draw(lay)
        c = SUBJECT + (alpha,)
        d.ellipse([p(x - 42, y - 22), p(x + 42, y + 22)], fill=c)
        d.ellipse([p(x - 19, y - 19), p(x + 19, y + 19)], fill=(255, 196, 140, alpha))
        self.comp(lay)

    # ---- drone ----
    def cone(self, x, y, ang, length=380, half=17, alpha=46):
        lay = self.overlay()
        d = ImageDraw.Draw(lay)
        a1 = math.radians(ang - half)
        a2 = math.radians(ang + half)
        pts = [p(x, y),
               p(x + length * math.cos(a1), y + length * math.sin(a1)),
               p(x + length * math.cos(a2), y + length * math.sin(a2))]
        d.polygon(pts, fill=(255, 255, 255, alpha))
        lay = lay.filter(ImageFilter.GaussianBlur(3 * S))
        self.comp(lay)
        lay = self.overlay()
        d = ImageDraw.Draw(lay)
        d.line([pts[0], pts[1]], fill=(255, 255, 255, alpha + 40), width=2 * S)
        d.line([pts[0], pts[2]], fill=(255, 255, 255, alpha + 40), width=2 * S)
        self.comp(lay)

    def drone_side(self, x, y, cam=None, alpha=255, cone_len=380):
        """Side-on drone. cam = camera angle in degrees (0 = right, 90 = straight down, 180 = left)."""
        if cam is not None:
            self.cone(x, y + 26, cam, length=cone_len, alpha=46 if alpha == 255 else 22)
        lay = self.overlay()
        d = ImageDraw.Draw(lay)
        c = DRONE + (alpha,)
        d.rounded_rectangle([p(x - 56, y - 14), p(x + 56, y + 14)], radius=10 * S, fill=c)
        d.line([p(x - 56, y - 6), p(x - 96, y - 20)], fill=c, width=7 * S)
        d.line([p(x + 56, y - 6), p(x + 96, y - 20)], fill=c, width=7 * S)
        for sx in (-96, 96):
            d.rectangle([p(x + sx - 4, y - 34), p(x + sx + 4, y - 20)], fill=c)
            d.ellipse([p(x + sx - 52, y - 42), p(x + sx + 52, y - 32)], fill=(232, 237, 241, int(alpha * 0.6)))
        d.line([p(x - 34, y + 14), p(x - 44, y + 40)], fill=c, width=5 * S)
        d.line([p(x + 34, y + 14), p(x + 44, y + 40)], fill=c, width=5 * S)
        d.ellipse([p(x - 14, y + 12), p(x + 14, y + 40)], fill=(150, 160, 168, alpha))
        if cam is not None:
            lx = x + 16 * math.cos(math.radians(cam))
            ly = y + 26 + 16 * math.sin(math.radians(cam))
            d.ellipse([p(lx - 6, ly - 6), p(lx + 6, ly + 6)], fill=(20, 26, 30, alpha))
        self.comp(lay)

    def drone_top(self, x, y, cam=None, alpha=255, cone_len=300):
        if cam is not None:
            self.cone(x, y, cam, length=cone_len, half=22, alpha=40 if alpha == 255 else 20)
        lay = self.overlay()
        d = ImageDraw.Draw(lay)
        c = DRONE + (alpha,)
        for a in (45, 135, 225, 315):
            ex = x + 70 * math.cos(math.radians(a))
            ey = y + 70 * math.sin(math.radians(a))
            d.line([p(x, y), p(ex, ey)], fill=c, width=9 * S)
            d.ellipse([p(ex - 36, ey - 36), p(ex + 36, ey + 36)], outline=c, width=4 * S, fill=(232, 237, 241, int(alpha * 0.18)))
        d.rounded_rectangle([p(x - 30, y - 24), p(x + 30, y + 24)], radius=10 * S, fill=c)
        if cam is not None:
            lx = x + 24 * math.cos(math.radians(cam))
            ly = y + 24 * math.sin(math.radians(cam))
            d.ellipse([p(lx - 8, ly - 8), p(lx + 8, ly + 8)], fill=(20, 26, 30, alpha))
        self.comp(lay)

    # ---- motion marks ----
    def path(self, pts, color=PATH, dash=22, gap=14, width=6, head=True):
        lay = self.overlay()
        d = ImageDraw.Draw(lay)
        # resample the polyline into dashes
        segs = list(zip(pts[:-1], pts[1:]))
        on, run = True, 0.0
        for (x1, y1), (x2, y2) in segs:
            L = math.hypot(x2 - x1, y2 - y1)
            t = 0.0
            while t < L:
                lim = dash if on else gap
                step = min(lim - run, L - t)
                if on:
                    a = (x1 + (x2 - x1) * t / L, y1 + (y2 - y1) * t / L)
                    b = (x1 + (x2 - x1) * (t + step) / L, y1 + (y2 - y1) * (t + step) / L)
                    d.line([p(*a), p(*b)], fill=color + (255,), width=width * S)
                t += step
                run += step
                if run >= lim - 1e-6:
                    on, run = not on, 0.0
        if head:
            (x1, y1), (x2, y2) = pts[-2], pts[-1]
            ang = math.atan2(y2 - y1, x2 - x1)
            sz = 30
            tip = (x2 + 8 * math.cos(ang), y2 + 8 * math.sin(ang))
            l = (tip[0] - sz * math.cos(ang - 0.45), tip[1] - sz * math.sin(ang - 0.45))
            r = (tip[0] - sz * math.cos(ang + 0.45), tip[1] - sz * math.sin(ang + 0.45))
            d.polygon([p(*tip), p(*l), p(*r)], fill=color + (255,))
        self.comp(lay)

    def arc(self, cx, cy, r, a0, a1, color=PATH, width=5):
        n = 40
        pts = [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
                cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
        self.path(pts, color=color, dash=14, gap=8, width=width)

    def label(self, x, y, text, color=TEXT, size=26, bold=False, anchor='la'):
        d = ImageDraw.Draw(self.img)
        d.text(p(x, y), text, font=font(size, bold), fill=color + (255,), anchor=anchor)

    def chip(self, x, y, text, color=PATH):
        d = ImageDraw.Draw(self.img)
        f = font(34, True)
        tw = d.textlength(text, font=f) / S
        x = max(30, min(x, W - 30 - tw - 44))   # keep the label inside the frame
        d.rounded_rectangle([p(x, y), p(x + tw + 44, y + 60)], radius=30 * S, fill=(20, 28, 34, 255), outline=color + (255,), width=2 * S)
        d.text(p(x + 22, y + 30), text, font=f, fill=color + (255,), anchor='lm')

    def frame(self, title):
        self.title = title

    def save(self, name):
        os.makedirs(OUT, exist_ok=True)
        # (ax, ay) is the scene point that lands on (bx, by) in the final image
        ax, ay, bx, by = (960, GY, 960, 950) if self.view == 'side' else (960, 630, 960, 630)
        sw, sh = int(W * S * SCENE), int(H * S * SCENE)
        scene = self.img.resize((sw, sh), Image.LANCZOS)
        full = self.bg.copy()
        full.alpha_composite(scene, (int((bx - ax * SCENE) * S), int((by - ay * SCENE) * S)))
        self.img = full
        self.label(270, 40, ('TOP VIEW' if self.view == 'top' else 'SIDE VIEW'), color=MUTED, size=30, bold=True)
        lx, ly = 1650 - 470, 52
        d = ImageDraw.Draw(self.img)
        fnt = font(22)
        d.line([p(lx, ly), p(lx + 40, ly)], fill=PATH + (255,), width=5 * S)
        d.text(p(lx + 50, ly), 'flight path', font=fnt, fill=MUTED + (255,), anchor='lm')
        d.polygon([p(lx + 180, ly), p(lx + 220, ly - 12), p(lx + 220, ly + 12)], fill=(255, 255, 255, 120))
        d.text(p(lx + 230, ly), 'camera', font=fnt, fill=MUTED + (255,), anchor='lm')
        d.ellipse([p(lx + 330, ly - 10), p(lx + 350, ly + 10)], fill=(232, 237, 241, 110))
        d.text(p(lx + 360, ly), 'start', font=fnt, fill=MUTED + (255,), anchor='lm')
        out = self.img.resize((W, H), Image.LANCZOS).convert('RGB')
        out.save(os.path.join(OUT, name + '.png'), optimize=True)
        print('wrote', name)

def bez(p0, p1, p2, n=40):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in [i / n for i in range(n + 1)]]

def cam_to(x, y, tx, ty):
    return math.degrees(math.atan2(ty - y, tx - x))

GY = 820

# ================= Bird's Eye View =================
def birds_following():
    c = Canvas('side'); c.ground()
    c.person_side(620, alpha=90)
    c.person_side(1240)
    c.path([(680, GY - 190), (1170, GY - 190)], color=SUBJECT)
    c.drone_side(620, 250, cam=90, alpha=110)
    c.path([(700, 200), (1160, 200)])
    c.drone_side(1240, 250, cam=90)
    c.chip(760, 110, 'MOVES WITH THE SUBJECT, LOOKING DOWN')
    c.frame('Following Subject (Bird\'s Eye View)'); c.save('Following Subject (Bird\'s Eye View)')

def birds_riser():
    c = Canvas('side'); c.ground()
    c.person_side(960)
    c.drone_side(960, 520, cam=90, alpha=110, cone_len=220)
    c.path([(1100, 520), (1100, 230)])
    c.drone_side(960, 200, cam=90, cone_len=560)
    c.chip(1150, 340, 'RISES STRAIGHT UP, FRAME GETS WIDER')
    c.frame('Riser (Bird\'s Eye View)'); c.save('Riser (Bird\'s Eye View)')

def birds_static():
    c = Canvas('side'); c.ground()
    c.person_side(960)
    c.drone_side(960, 260, cam=90, cone_len=520)
    c.chip(1110, 230, 'HOVERS IN PLACE, NO MOVEMENT')
    c.frame('Static (Bird\'s Eye View)'); c.save('Static (Bird\'s Eye View)')

# ================= Dolly In (Go Forward) =================
SUBX = 1450

def dolly_in_classic():
    c = Canvas('side'); c.ground()
    c.person_side(SUBX)
    c.drone_side(380, 470, cam=cam_to(380, 496, SUBX, GY - 80), alpha=110)
    c.path([(500, 430), (960, 430)])
    c.drone_side(1060, 470, cam=cam_to(1060, 496, SUBX, GY - 80), cone_len=340)
    c.chip(560, 340, 'FLIES FORWARD TOWARDS THE SUBJECT')
    c.frame('Classic (Dolly In)'); c.save('Classic (Dolly In)')

def dolly_in_gimbal_up():
    c = Canvas('side'); c.ground()
    c.person_side(SUBX)
    c.drone_side(380, 420, cam=80, alpha=110, cone_len=330)
    c.path([(500, 380), (960, 380)])
    c.drone_side(1060, 420, cam=12, cone_len=360)
    c.arc(1060, 446, 70, 80, 18)
    c.chip(560, 290, 'FORWARD, CAMERA TILTS UP FROM GROUND TO VIEW')
    c.frame('Gimbal Up (Dolly In)'); c.save('Gimbal Up (Dolly In)')

def dolly_in_gimbal_down():
    c = Canvas('side'); c.ground()
    c.person_side(SUBX)
    c.drone_side(380, 380, cam=5, alpha=110, cone_len=360)
    c.path([(500, 340), (1060, 340)])
    c.drone_side(1160, 380, cam=cam_to(1160, 406, SUBX, GY - 70), cone_len=420)
    c.arc(1160, 406, 70, 5, 55)
    c.chip(560, 250, 'FORWARD, CAMERA TILTS DOWN ONTO THE SUBJECT')
    c.frame('Gimbal Down (Dolly In)'); c.save('Gimbal Down (Dolly In)')

def dolly_in_reveal():
    c = Canvas('side'); c.ground()
    c.person_side(SUBX)
    c.drone_side(330, 560, cam=0, alpha=110, cone_len=300)
    c.tree(760)
    c.path(bez((450, 520), (760, 330), (1020, 500)))
    c.drone_side(1110, 540, cam=cam_to(1110, 566, SUBX, GY - 80), cone_len=330)
    c.chip(420, 300, 'FORWARD PAST AN OBJECT TO REVEAL THE SCENE')
    c.frame('Reveal Or Pass (Dolly In)'); c.save('Reveal Or Pass (Dolly In)')

def dolly_in_riser():
    c = Canvas('side'); c.ground()
    c.person_side(SUBX)
    c.drone_side(380, 640, cam=cam_to(380, 666, SUBX, GY - 80), alpha=110, cone_len=340)
    c.path([(500, 600), (960, 330)])
    c.drone_side(1060, 300, cam=cam_to(1060, 326, SUBX, GY - 80), cone_len=420)
    c.chip(330, 420, 'FORWARD AND UP AT THE SAME TIME')
    c.frame('Riser (Dolly In)'); c.save('Riser (Dolly In)')

# ================= Dolly Out (Go Backward) =================
SUBL = 420

def dolly_out_classic():
    c = Canvas('side'); c.ground()
    c.person_side(SUBL)
    c.drone_side(860, 470, cam=cam_to(860, 496, SUBL, GY - 80), alpha=110, cone_len=330)
    c.path([(980, 430), (1440, 430)])
    c.drone_side(1540, 470, cam=cam_to(1540, 496, SUBL, GY - 80), cone_len=420)
    c.chip(980, 340, 'FLIES BACKWARDS AWAY FROM THE SUBJECT')
    c.frame('Classic (Dolly Out)'); c.save('Classic (Dolly Out)')

def dolly_out_fall_down():
    c = Canvas('side'); c.ground()
    c.person_side(SUBL)
    c.drone_side(820, 300, cam=cam_to(820, 326, SUBL, GY - 80), alpha=110, cone_len=330)
    c.path([(940, 300), (1430, 600)])
    c.drone_side(1540, 640, cam=cam_to(1540, 666, SUBL, GY - 80), cone_len=420)
    c.chip(1060, 300, 'BACKWARDS WHILE DROPPING LOWER')
    c.frame('Fall Down (Dolly Out)'); c.save('Fall Down (Dolly Out)')

def dolly_out_pass_subject():
    c = Canvas('side'); c.ground()
    c.person_side(960)
    c.drone_side(560, 500, cam=170, alpha=110, cone_len=300)
    c.path(bez((660, 470), (960, 380), (1290, 470)))
    c.drone_side(1400, 500, cam=cam_to(1400, 526, 960, GY - 80), cone_len=580)
    c.chip(700, 280, 'BACKWARDS OVER THE SUBJECT, THEY APPEAR IN FRAME')
    c.frame('Pass Subject (Dolly Out)'); c.save('Pass Subject (Dolly Out)')

# ================= Drop Down =================
def drop_forward():
    c = Canvas('side'); c.ground()
    c.person_side(SUBX)
    c.drone_side(420, 260, cam=cam_to(420, 286, SUBX, GY - 80), alpha=110, cone_len=360)
    c.path([(540, 290), (980, 590)])
    c.drone_side(1080, 620, cam=cam_to(1080, 646, SUBX, GY - 80), cone_len=340)
    c.chip(640, 290, 'DROPS DOWN WHILE FLYING FORWARD')
    c.frame('Forward (Drop Down)'); c.save('Forward (Drop Down)')

def drop_gimbal_up():
    c = Canvas('side'); c.ground()
    c.person_side(SUBX)
    c.drone_side(760, 240, cam=85, alpha=110, cone_len=320)
    c.path([(900, 250), (900, 590)])
    c.drone_side(760, 620, cam=cam_to(760, 646, SUBX, GY - 80), cone_len=560)
    c.arc(760, 646, 70, 85, 15)
    c.chip(950, 360, 'DROPS STRAIGHT DOWN, CAMERA TILTS UP')
    c.frame('Gimbal Up (Drop Down)'); c.save('Gimbal Up (Drop Down)')

# ================= Raise Up =================
def raise_gimbal_down():
    c = Canvas('side'); c.ground()
    c.person_side(SUBX)
    c.drone_side(860, 640, cam=cam_to(860, 666, SUBX, GY - 80), alpha=110, cone_len=500)
    c.path([(1000, 620), (1000, 270)])
    c.drone_side(860, 240, cam=cam_to(860, 266, SUBX, GY - 80), cone_len=640)
    c.arc(860, 266, 70, 15, 55)
    c.chip(380, 400, 'RISES UP, CAMERA TILTS DOWN TO KEEP THE SUBJECT')
    c.frame('Gimbal Down (Raise Up)'); c.save('Gimbal Down (Raise Up)')

def raise_reverse():
    c = Canvas('side'); c.ground()
    c.person_side(SUBL)
    c.drone_side(820, 640, cam=cam_to(820, 666, SUBL, GY - 80), alpha=110, cone_len=330)
    c.path([(940, 620), (1420, 330)])
    c.drone_side(1540, 300, cam=cam_to(1540, 326, SUBL, GY - 80), cone_len=520)
    c.chip(1060, 640, 'RISES UP WHILE FLYING BACKWARDS')
    c.frame('Reverse (Raise Up)'); c.save('Reverse (Raise Up)')

# ================= Slider (top view) =================
SY = 630   # subject walks along this line
DY = 300   # drone slides along this line

def slider_base(c):
    c.top_ground()

def slider_classic():
    c = Canvas('top'); slider_base(c)
    c.person_top(520, SY, alpha=90); c.person_top(1340, SY)
    c.path([(580, SY + 70), (1270, SY + 70)], color=SUBJECT)
    c.drone_top(520, DY, cam=90, alpha=110)
    c.path([(620, DY), (1230, DY)])
    c.drone_top(1340, DY, cam=90)
    c.chip(700, 200, 'SLIDES SIDEWAYS ALONGSIDE THE SUBJECT')
    c.frame('Classic (Slider)'); c.save('Classic (Slider)')

def slider_gimbal_up():
    c = Canvas('top'); slider_base(c)
    c.person_top(520, SY, alpha=90); c.person_top(1340, SY)
    c.path([(580, SY + 70), (1270, SY + 70)], color=SUBJECT)
    c.drone_top(520, DY, cam=90, alpha=110, cone_len=200)
    c.path([(620, DY), (1230, DY)])
    c.drone_top(1340, DY, cam=90, cone_len=440)
    c.chip(600, 200, 'SLIDES SIDEWAYS, CAMERA TILTS UP FROM GROUND')
    # side inset showing the tilt
    lay = c.overlay(); d = ImageDraw.Draw(lay)
    d.rounded_rectangle([p(1340, 720), p(1880, 970)], radius=18 * S, fill=(18, 24, 29, 255), outline=(70, 84, 94, 255), width=2 * S)
    c.comp(lay)
    c.label(1364, 736, 'CAMERA TILT (SIDE VIEW)', color=MUTED, size=18, bold=True)
    c.drone_side(1500, 830, cam=80, alpha=110, cone_len=70)
    c.drone_side(1500, 830, cam=6, cone_len=320)
    c.arc(1500, 856, 46, 80, 18, width=4)
    c.frame('Gimbal Up (Slider)'); c.save('Gimbal Up (Slider)')

def slider_push_in():
    c = Canvas('top'); slider_base(c)
    c.person_top(520, SY, alpha=90); c.person_top(1340, SY)
    c.path([(580, SY + 70), (1270, SY + 70)], color=SUBJECT)
    c.drone_top(520, 230, cam=cam_to(520, 230, 520, SY), alpha=110)
    c.path([(610, 260), (1250, 420)])
    c.drone_top(1340, 450, cam=90, cone_len=180)
    c.chip(380, 800, 'SLIDES SIDEWAYS WHILE MOVING CLOSER')
    c.frame('Push In (Slider)'); c.save('Push In (Slider)')

def slider_reverse():
    c = Canvas('top'); slider_base(c)
    c.person_top(520, SY, alpha=90); c.person_top(1340, SY)
    c.path([(580, SY + 70), (1270, SY + 70)], color=SUBJECT)
    c.drone_top(1400, DY, cam=cam_to(1400, DY, 1000, SY), alpha=110)
    c.path([(1300, DY), (560, DY)])
    c.drone_top(460, DY, cam=cam_to(460, DY, 900, SY))
    c.chip(700, 200, 'SLIDES THE OPPOSITE WAY TO THE SUBJECT')
    c.frame('Reverse (Slider)'); c.save('Reverse (Slider)')

# ================= Unique =================
def unique_orbit():
    c = Canvas('top'); slider_base(c)
    cx, cy, r = 960, 560, 300
    c.person_top(cx, cy)
    n = 60
    pts = [(cx + r * math.cos(math.radians(200 + 300 * i / n)), cy + r * math.sin(math.radians(200 + 300 * i / n))) for i in range(n + 1)]
    c.path(pts)
    for a, al in ((200, 110), (320, 110)):
        x = cx + r * math.cos(math.radians(a)); y = cy + r * math.sin(math.radians(a))
        c.drone_top(x, y, cam=cam_to(x, y, cx, cy), alpha=al, cone_len=200)
    x = cx + r * math.cos(math.radians(140)); y = cy + r * math.sin(math.radians(140))
    c.drone_top(x, y, cam=cam_to(x, y, cx, cy), cone_len=220)
    c.chip(1240, 880, 'CIRCLES THE SUBJECT, CAMERA LOCKED ON THEM')
    c.frame('Orbit (Unique)'); c.save('Orbit (Unique)')

def unique_tripod():
    c = Canvas('side'); c.ground()
    c.person_side(1250)
    c.drone_side(640, 690, cam=cam_to(640, 716, 1250, GY - 80), cone_len=560)
    c.chip(380, 520, 'HOVERS LOW AND STILL, LIKE A CAMERA ON A TRIPOD')
    c.frame('Tripod (Unique)'); c.save('Tripod (Unique)')

if __name__ == '__main__':
    for fn in [birds_following, birds_riser, birds_static,
               dolly_in_classic, dolly_in_gimbal_up, dolly_in_gimbal_down, dolly_in_reveal, dolly_in_riser,
               dolly_out_classic, dolly_out_fall_down, dolly_out_pass_subject,
               drop_forward, drop_gimbal_up, raise_gimbal_down, raise_reverse,
               slider_classic, slider_gimbal_up, slider_push_in, slider_reverse,
               unique_orbit, unique_tripod]:
        fn()
