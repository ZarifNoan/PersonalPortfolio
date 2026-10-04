"""Captures the Fuzzy Logic project's Tkinter desktop app, tab by tab, for its gallery (Windows only).

The app's source is not in this repo: pass the folder holding its main.py / gui/ / fuzzy_system/. The script only
imports it (no file there is written: bytecode is off and the working directory is a temp folder), drives the real
window programmatically and saves each screen as a PNG in <out dir>:

  predict-at-risk.png   Predict tab after 'Run prediction' for an at-risk student (54 / 38 / 42)
  sets-at-risk.png      Fuzzy Sets tab: membership functions with that student marked
  inference-at-risk.png Inference tab: aggregation/defuzzification and the rules fired
  predict-strong.png    Predict tab for a strong student (88 / 78 / 85), from a fresh window so it is run #1 too
  cohort.png            Cohort tab after 'Generate 800 students' then 'Evaluate'
  rules.png             Rule Base tab (the 27 fuzzy rules)

The window is 1440 x 900 logical px rendered at SCALE x (default 1.7, so 2448 x 1530 physical px): the process is
per-monitor DPI aware, Tk's scaling is raised before the app builds its widgets (fonts and matplotlib's device pixel
ratio follow it), and the app's few pixel-valued layout settings (wrap lengths, paddings, tree column widths and row
height) are scaled to match, as a DPI-aware Tk would. Three presentation tweaks, none changing any content: the Cohort
sash gives the confusion matrix 58% of the width (its title is clipped at the default split), the Rule Base table's
Rationale column takes the spare width (the longest rationale is cut off otherwise), and the matplotlib canvases ask for
1 x 1 px so they no longer push the status bar out of the window (they still fill their panes). Each image is the client area
grabbed with PrintWindow, so the system title bar (drawn at the monitor's own DPI) is left out.

The whole window must be on one monitor (off-screen parts capture black). CAP_X / CAP_Y move the outer window to that
monitor's top-left (virtual-desktop px), e.g. a 2560 x 1600 monitor left of and above the primary one:

  set PYTHONDONTWRITEBYTECODE=1
  set CAP_X=-2560 & set CAP_Y=-512
  python scripts/capture-fuzzy-app.py "<path to SourceCode>" <out dir> [scale]

Then copy them into src/assets/images/fuzzy-logic/ as 01-predict.png (predict-at-risk; also the mockup's screen),
02-fuzzy-sets.png, 03-inference.png, 04-predict-strong-student.png, 05-cohort.png and 06-rule-base.png.
"""
import ctypes
import ctypes.wintypes as w
import os
import sys
import tempfile
import time

sys.dont_write_bytecode = True
if len(sys.argv) < 3:
    sys.exit(__doc__)
SRC, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
SCALE = float(sys.argv[3]) if len(sys.argv) > 3 else 1.7
LOGICAL = (1440, 900)
AT_RISK, STRONG = (54, 38, 42), (88, 78, 85)  # attendance, test score, project work (%)

ctypes.windll.shcore.SetProcessDpiAwareness(2)  # per-monitor aware: no bitmap stretching, exact pixel sizes
os.chdir(tempfile.mkdtemp(prefix='fuzzy-capture-'))
sys.path.insert(0, SRC)

from tkinter import font as tkfont, ttk  # noqa: E402
from PIL import Image  # noqa: E402
from gui.app import FuzzyApp  # noqa: E402

user32, dwm, gdi32 = ctypes.windll.user32, ctypes.windll.dwmapi, ctypes.windll.gdi32


def sc(v):
    return int(round(float(v) * SCALE))


class Driven(FuzzyApp):
    """The app as shipped, with Tk scaling raised before its widgets are built."""

    def _build_style(self):
        self.tk.call('tk', 'scaling', SCALE * 96 / 72)
        for f in ('TkDefaultFont', 'TkTextFont', 'TkHeadingFont', 'TkMenuFont', 'TkFixedFont', 'TkTooltipFont',
                  'TkCaptionFont', 'TkSmallCaptionFont', 'TkIconFont'):
            try:  # re-resolve the named fonts' point sizes at the new scaling
                self.tk.call('font', 'configure', f, '-size', int(self.tk.call('font', 'actual', f, '-size')))
            except Exception:
                pass
        super()._build_style()
        line = tkfont.nametofont('TkDefaultFont').metrics('linespace')
        ttk.Style(self).configure('Treeview', rowheight=int(line + 6 * SCALE))


def walk(widget):
    yield widget
    for child in widget.winfo_children():
        yield from walk(child)


def hidpi(root):
    """Scale the app's pixel-valued layout (wrap lengths, paddings, tree columns) by SCALE."""
    for wd in walk(root):
        try:
            wl = str(wd.cget('wraplength'))
            if wl and float(wl) > 0:
                wd.configure(wraplength=sc(wl))
        except Exception:
            pass
        try:
            pad = str(wd.cget('padding'))
            if pad:
                wd.configure(padding=[sc(x) for x in pad.split()])
        except Exception:
            pass
        try:
            info = wd.pack_info()
            wd.pack_configure(**{k: tuple(sc(x) for x in str(info[k]).split()) for k in ('padx', 'pady', 'ipadx', 'ipady')})
        except Exception:
            pass
        if wd.winfo_class() == 'Treeview':
            for col in ('#0',) + tuple(wd.cget('columns')):
                wd.column(col, width=sc(wd.column(col, 'width')))


def pump(app, seconds):
    end = time.time() + seconds
    while time.time() < end:
        app.update()
        time.sleep(0.02)


def hwnd_of(app):
    return user32.GetAncestor(app.winfo_id(), 2)  # GA_ROOT


class BIH(ctypes.Structure):
    _fields_ = [('biSize', w.DWORD), ('biWidth', w.LONG), ('biHeight', w.LONG), ('biPlanes', w.WORD),
                ('biBitCount', w.WORD), ('biCompression', w.DWORD), ('biSizeImage', w.DWORD),
                ('biXPelsPerMeter', w.LONG), ('biYPelsPerMeter', w.LONG), ('biClrUsed', w.DWORD),
                ('biClrImportant', w.DWORD)]


def capture(app, name):
    """PrintWindow the whole window, then keep the client area."""
    app.update_idletasks()
    hwnd = hwnd_of(app)
    r = w.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    wd, ht = r.right - r.left, r.bottom - r.top
    hdc = user32.GetWindowDC(hwnd)
    mdc = gdi32.CreateCompatibleDC(hdc)
    bmp = gdi32.CreateCompatibleBitmap(hdc, wd, ht)
    gdi32.SelectObject(mdc, bmp)
    ok = user32.PrintWindow(hwnd, mdc, 2)  # PW_RENDERFULLCONTENT
    buf = ctypes.create_string_buffer(wd * ht * 4)
    gdi32.GetDIBits(mdc, bmp, 0, ht, buf, ctypes.byref(BIH(ctypes.sizeof(BIH), wd, -ht, 1, 32, 0, 0, 0, 0, 0, 0)), 0)
    gdi32.DeleteObject(bmp)
    gdi32.DeleteDC(mdc)
    user32.ReleaseDC(hwnd, hdc)
    img = Image.frombuffer('RGBA', (wd, ht), buf, 'raw', 'BGRA', 0, 1).convert('RGB')
    x0, y0 = app.winfo_rootx() - r.left, app.winfo_rooty() - r.top
    img = img.crop((x0, y0, x0 + app.winfo_width(), y0 + app.winfo_height()))
    path = os.path.join(OUT, name)
    img.save(path, optimize=True)
    print(f'{name} {img.size}{"" if ok else "  (PrintWindow FAILED)"}')


def open_app():
    app = Driven()
    hidpi(app)
    app.maxsize(10000, 10000)
    W, H = sc(LOGICAL[0]), sc(LOGICAL[1])
    app.geometry(f'{W}x{H}+0+0')
    app.attributes('-topmost', True)
    pump(app, 0.5)
    if 'CAP_X' in os.environ:  # Tk clamps negative geometry, so move the outer window with Win32
        user32.SetWindowPos(hwnd_of(app), 0, int(os.environ['CAP_X']), int(os.environ['CAP_Y']), 0, 0, 0x0001 | 0x0004)
        pump(app, 1.0)
    if (app.winfo_width(), app.winfo_height()) != (W, H):
        app.geometry(f'{W}x{H}')
    pump(app, 1.0)
    return app


def select(app, title):
    nb = app.notebook
    nb.select(next(t for t in nb.tabs() if nb.tab(t, 'text').strip() == title))


def predict(app, marks):
    select(app, 'Predict')
    for name, v in zip(('attendance', 'test_score', 'project_work'), marks):
        app.vars[name].set(v)
    app._on_input_edited()  # what typing into the spinboxes triggers
    app.run_button.invoke()
    pump(app, 1.0)


def settle(app, seconds=2.5):
    """Let the tab's figures draw. A matplotlib canvas asks for its full figure size, which makes the notebook push the
    app's status bar out of the window; ask for 1 x 1 instead (it still fills its pane) so every screen keeps it."""
    pump(app, seconds / 2)
    for canvas in app._canvases.values():
        canvas.get_tk_widget().configure(width=1, height=1)
    pump(app, seconds / 2)


def button(app, text):
    return next(wd for wd in walk(app) if wd.winfo_class() == 'TButton' and str(wd.cget('text')) == text)


def main():
    os.makedirs(OUT, exist_ok=True)

    # A strong student, in a window of its own (only the Predict tab has been shown, so the layout is the default).
    app = open_app()
    predict(app, STRONG)
    capture(app, 'predict-strong.png')
    app.destroy()

    app = open_app()
    predict(app, AT_RISK)
    capture(app, 'predict-at-risk.png')
    for title, name in (('Fuzzy Sets', 'sets-at-risk.png'), ('Inference', 'inference-at-risk.png')):
        select(app, title)
        settle(app)
        capture(app, name)

    select(app, 'Cohort')
    pump(app, 0.5)
    panes = app.cohort_figure_frame.master
    panes.sashpos(0, int(panes.winfo_width() * 0.42))
    for text in ('Generate 800 students', 'Evaluate'):
        button(app, text).invoke()
        pump(app, 1.0)
    settle(app)
    capture(app, 'cohort.png')

    select(app, 'Rule Base')
    tree = next(wd for wd in walk(app) if wd.winfo_class() == 'Treeview' and 'why' in wd.cget('columns'))
    for col in ('#0', 'attendance', 'test', 'project', 'then'):
        tree.column(col, stretch=False)
    settle(app)
    capture(app, 'rules.png')
    app.destroy()


if __name__ == '__main__':
    main()
