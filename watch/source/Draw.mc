import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;

// Drawing for round screens of any size: a ring at the edge and a centred stack of
// rows that shrinks to fit. Colours from the Hour Power Lite mock-up.
module Draw {
    const BLACK = 0x000000;
    const TEXT = 0xF3F5F7;
    const SOFT = 0xC9D1D9;
    const MUTED = 0x9AA6B2;
    const DIM = 0x6B7682;
    const ORANGE = 0xFF6A1A;
    const GREEN = 0x5CC28A;
    const BLUE = 0x38BDF8;
    const BLUE_LIGHT = 0x7DD3FC;
    const BLUE_DARK = 0x0C2230;
    const TRACK = 0x1D2731;
    const LINE = 0x2A323D;
    const GREY = 0x3A444F;
    const EASY = 0x4A5A6A;

    function clear(dc) {
        dc.setColor(TEXT, BLACK);
        dc.clear();
    }

    function size(dc) {
        return dc.getWidth() < dc.getHeight() ? dc.getWidth() : dc.getHeight();
    }

    // A ring at the screen's edge filled clockwise from 12 o'clock (frac 0..1).
    function ring(dc, color, track, frac, width) {
        var cx = dc.getWidth() / 2;
        var cy = dc.getHeight() / 2;
        var r = size(dc) / 2 - width / 2 - 1;
        dc.setPenWidth(width);
        if (track != null) {
            dc.setColor(track, Graphics.COLOR_TRANSPARENT);
            dc.drawCircle(cx, cy, r);
        }
        if (frac != null && frac * 360 >= 1) {
            dc.setColor(color, Graphics.COLOR_TRANSPARENT);
            if (frac >= 1) {
                dc.drawCircle(cx, cy, r);
            } else {
                var end = 90 - (frac * 360).toNumber();
                if (end < 0) {
                    end += 360;
                }
                dc.drawArc(cx, cy, r, Graphics.ARC_CLOCKWISE, 90, end);
            }
        }
        dc.setPenWidth(1);
    }

    // A short mark beside the Start button (top right) when Start does something.
    function startMark(dc, color) {
        var w = (size(dc) * 0.02).toNumber();
        if (w < 4) {
            w = 4;
        }
        var r = size(dc) / 2 - w / 2 - 1;
        dc.setPenWidth(w);
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawArc(dc.getWidth() / 2, dc.getHeight() / 2, r, Graphics.ARC_CLOCKWISE, 40, 20);
        dc.setPenWidth(1);
    }

    function maxWidth(dc) {
        return (dc.getWidth() * 0.78).toNumber();
    }

    // The largest font up to `font` that fits; cut with "..." if even the smallest doesn't.
    function fitFont(dc, text, font) {
        var max = maxWidth(dc);
        var f = font;
        while (f > Graphics.FONT_XTINY && dc.getTextWidthInPixels(text, f) > max) {
            f -= 1;
        }
        return f;
    }

    function fitText(dc, text, font) {
        var max = maxWidth(dc);
        if (dc.getTextWidthInPixels(text, font) <= max) {
            return text;
        }
        var t = text;
        while (t.length() > 1 && dc.getTextWidthInPixels(t + "...", font) > max) {
            t = t.substring(0, t.length() - 1);
        }
        return t + "...";
    }

    // Rows (arrays, first item the kind):
    //   [:text, string, font, color]            shrinks to fit the width
    //   [:gap, fraction of screen]
    //   [:num, digits, unit, color]             the big number with a small unit
    //   [:line]                                 a short divider
    //   [:pill, string, text color, fill]
    //   [:bars, steps, accent]                  the workout's shape
    //   [:zone, lo, hi, watts]                  where the power sits against the target
    //   [:grid, [value, label, value, label, value, label]]
    function stack(dc, rows) {
        // Shrink step by step until it fits inside the round screen.
        var level = 0;
        var h = height(dc, rows, level);
        while (level < 3 && h > size(dc) * 0.80) {
            level += 1;
            h = height(dc, rows, level);
        }
        var y = dc.getHeight() / 2 - h / 2;
        for (var i = 0; i < rows.size(); i++) {
            var rh = rowHeight(dc, rows[i], level);
            drawRow(dc, rows[i], y, rh, level);
            y += rh;
        }
    }

    function height(dc, rows, level) {
        var h = 0;
        for (var i = 0; i < rows.size(); i++) {
            h += rowHeight(dc, rows[i], level);
        }
        return h;
    }

    function textFont(font, level) {
        var f = font - (level >= 2 ? 1 : 0);
        return f < Graphics.FONT_XTINY ? Graphics.FONT_XTINY : f;
    }

    function numFont(level, digits) {
        if (!isDigits(digits)) {
            return level >= 1 ? Graphics.FONT_MEDIUM : Graphics.FONT_LARGE;
        }
        if (level == 0) {
            return Graphics.FONT_NUMBER_HOT;
        }
        return level == 1 ? Graphics.FONT_NUMBER_MEDIUM : Graphics.FONT_NUMBER_MILD;
    }

    function isDigits(s) {
        if (s == null || s.length() == 0) {
            return false;
        }
        var chars = s.toCharArray();
        for (var i = 0; i < chars.size(); i++) {
            var c = chars[i].toNumber();
            if (c < 48 || c > 57) {
                return false;
            }
        }
        return true;
    }

    function rowHeight(dc, row, level) {
        var kind = row[0];
        var s = size(dc);
        if (kind == :text) {
            return dc.getFontHeight(textFont(row[2], level));
        } else if (kind == :gap) {
            return (s * row[1] * (level >= 3 ? 0.5 : 1.0)).toNumber();
        } else if (kind == :num) {
            // Number fonts carry space above and below the digits.
            return (dc.getFontHeight(numFont(level, row[1])) * 0.82).toNumber();
        } else if (kind == :line) {
            return (s * 0.05).toNumber();
        } else if (kind == :pill) {
            return dc.getFontHeight(Graphics.FONT_XTINY) + (s * 0.035).toNumber() + 4;
        } else if (kind == :bars) {
            return (s * (level >= 2 ? 0.09 : 0.12)).toNumber() + 6;
        } else if (kind == :zone) {
            return (s * 0.07).toNumber();
        } else if (kind == :grid) {
            return dc.getFontHeight(textFont(Graphics.FONT_MEDIUM, level)) + dc.getFontHeight(Graphics.FONT_XTINY);
        }
        return 0;
    }

    function drawRow(dc, row, y, rh, level) {
        var kind = row[0];
        var cx = dc.getWidth() / 2;
        var s = size(dc);
        var mid = y + rh / 2;
        var center = Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER;
        if (kind == :text) {
            var f = fitFont(dc, row[1], textFont(row[2], level));
            dc.setColor(row[3], Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, mid, f, fitText(dc, row[1], f), center);
        } else if (kind == :num) {
            var nf = numFont(level, row[1]);
            var uf = Graphics.FONT_SMALL;
            var nw = dc.getTextWidthInPixels(row[1], nf);
            var uw = row[2] == null ? 0 : dc.getTextWidthInPixels(row[2], uf) + 4;
            var x = cx - (nw + uw) / 2;
            dc.setColor(row[3], Graphics.COLOR_TRANSPARENT);
            dc.drawText(x, mid, nf, row[1], Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
            if (row[2] != null) {
                dc.setColor(MUTED, Graphics.COLOR_TRANSPARENT);
                var uy = mid + rh / 2 - dc.getFontHeight(uf) / 2 - (rh * 0.08).toNumber();
                dc.drawText(x + nw + 4, uy, uf, row[2], Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
            }
        } else if (kind == :line) {
            dc.setColor(LINE, Graphics.COLOR_TRANSPARENT);
            var lw = (s * 0.36).toNumber();
            dc.fillRectangle(cx - lw / 2, mid, lw, 1);
        } else if (kind == :pill) {
            var pf = Graphics.FONT_XTINY;
            var t = fitText(dc, row[1], pf);
            var pw = dc.getTextWidthInPixels(t, pf) + (s * 0.08).toNumber();
            var ph = rh - 4;
            dc.setColor(row[3], Graphics.COLOR_TRANSPARENT);
            dc.fillRoundedRectangle(cx - pw / 2, mid - ph / 2, pw, ph, ph / 2);
            dc.setColor(row[2], Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, mid, pf, t, center);
        } else if (kind == :bars) {
            bars(dc, row[1], row[2], y + 3, rh - 6);
        } else if (kind == :zone) {
            zone(dc, row[1], row[2], row[3], mid);
        } else if (kind == :grid) {
            grid(dc, row[1], y, level);
        }
    }

    // Each step as a bar: width by time, height by watts.
    function bars(dc, steps, accent, top, h) {
        if (steps == null || steps.size() == 0) {
            return;
        }
        var w = (size(dc) * 0.62).toNumber();
        var total = 0;
        var maxW = 1;
        for (var i = 0; i < steps.size(); i++) {
            total += steps[i]["s"];
            if (steps[i]["hi"] > maxW) {
                maxW = steps[i]["hi"];
            }
        }
        if (total <= 0) {
            return;
        }
        var x = (dc.getWidth() - w) / 2.0;
        var gap = steps.size() * 2 < w / 3 ? 2 : 0;
        for (var i = 0; i < steps.size(); i++) {
            var st = steps[i];
            var bw = w * st["s"] / total.toFloat();
            var frac = st["hi"] / maxW.toFloat();
            if (frac < 0.25) {
                frac = 0.25;
            }
            var bh = (h * frac).toNumber();
            dc.setColor("i".equals(st["k"]) ? accent : GREY, Graphics.COLOR_TRANSPARENT);
            var drawW = (bw - gap).toNumber();
            if (drawW < 1) {
                drawW = 1;
            }
            dc.fillRectangle(x.toNumber(), top + h - bh, drawW, bh);
            x += bw;
        }
    }

    // A bar with the target window in green and a tick at the current watts.
    function zone(dc, lo, hi, watts, mid) {
        var w = (size(dc) * 0.5).toNumber();
        var h = (size(dc) * 0.025).toNumber();
        if (h < 6) {
            h = 6;
        }
        var span = hi - lo;
        if (span < 20) {
            span = 20;
        }
        var min = lo - span * 1.5;
        var max = hi + span * 1.5;
        var x0 = dc.getWidth() / 2 - w / 2;
        dc.setColor(TRACK, Graphics.COLOR_TRANSPARENT);
        dc.fillRoundedRectangle(x0, mid - h / 2, w, h, h / 2);
        var a = x0 + (w * (lo - min) / (max - min)).toNumber();
        var b = x0 + (w * (hi - min) / (max - min)).toNumber();
        dc.setColor(GREEN, Graphics.COLOR_TRANSPARENT);
        dc.fillRoundedRectangle(a, mid - h / 2, b - a, h, h / 2);
        if (watts != null) {
            var p = watts < min ? min : (watts > max ? max : watts);
            var px = x0 + (w * (p - min) / (max - min)).toNumber();
            dc.setColor(TEXT, Graphics.COLOR_TRANSPARENT);
            dc.fillRoundedRectangle(px - 2, mid - h, 4, h * 2, 2);
        }
    }

    // Three numbers with labels, with dividers between.
    function grid(dc, cells, y, level) {
        var w = (size(dc) * 0.62).toNumber();
        var col = w / 3;
        var x0 = dc.getWidth() / 2 - w / 2;
        var vf = textFont(Graphics.FONT_MEDIUM, level);
        var vh = dc.getFontHeight(vf);
        var lh = dc.getFontHeight(Graphics.FONT_XTINY);
        for (var i = 0; i < 3; i++) {
            var cx = x0 + col * i + col / 2;
            dc.setColor(TEXT, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, y + vh / 2, vf, cells[i * 2], Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            dc.setColor(MUTED, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, y + vh + lh / 2, Graphics.FONT_XTINY, cells[i * 2 + 1], Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            if (i > 0) {
                dc.setColor(LINE, Graphics.COLOR_TRANSPARENT);
                dc.fillRectangle(x0 + col * i, y + 4, 1, vh + lh - 8);
            }
        }
    }

    // "7:48" from seconds.
    function clock(seconds) {
        if (seconds < 0) {
            seconds = 0;
        }
        var m = seconds / 60;
        var s = seconds % 60;
        if (m >= 60) {
            return "" + (m / 60) + ":" + (m % 60).format("%02d") + ":" + s.format("%02d");
        }
        return "" + m + ":" + s.format("%02d");
    }

    // "4 min" or "45 s" or "1:30".
    function length(seconds) {
        if (seconds % 60 == 0) {
            return "" + (seconds / 60) + " min";
        }
        if (seconds < 60) {
            return "" + seconds + " s";
        }
        return clock(seconds);
    }

    function str(v) {
        return v == null ? "" : v.toString();
    }
}
