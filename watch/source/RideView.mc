import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

// The interval: watts against the target, time left in the step, heart rate, cadence.
class RideView extends WatchUi.View {
    var ride;

    function initialize(r) {
        View.initialize();
        ride = r;
    }

    function onUpdate(dc) {
        Draw.clear(dc);
        var st = ride.step();
        var effort = st != null && "i".equals(st["k"]);
        var width = (Draw.size(dc) * 0.026).toNumber() + 2;
        var frac = st != null && st["s"] > 0 ? ride.stepTime / st["s"].toFloat() : 0;
        Draw.ring(dc, effort ? Draw.ORANGE : Draw.EASY, Draw.TRACK, frac, width);

        var rows = [];
        if (!ride.running) {
            rows.add([:text, "PAUSED - START resumes", Graphics.FONT_XTINY, Draw.ORANGE]);
        } else if (st == null) {
            rows.add([:text, ride.steps.size() > 0 ? "WORKOUT DONE" : "FREE RIDE", Graphics.FONT_XTINY, Draw.GREEN]);
        } else if (effort) {
            rows.add([:text, "BLOCK " + ride.effortNumber() + " / " + ride.effortCount(), Graphics.FONT_XTINY, Draw.MUTED]);
        } else {
            rows.add([:text, Draw.str(st["n"]).toUpper(), Graphics.FONT_XTINY, Draw.MUTED]);
        }

        rows.add([:num, ride.power != null ? ride.power.toString() : "--", "W", Draw.TEXT]);

        if (st != null) {
            var lo = st["lo"];
            var hi = st["hi"];
            var range = "" + lo + "-" + hi + " W";
            rows.add([:zone, lo, hi, ride.power]);
            if (ride.power == null) {
                rows.add([:text, "Target " + range, Graphics.FONT_XTINY, Draw.MUTED]);
            } else if (ride.power > hi) {
                rows.add([:text, "Ease off - " + range, Graphics.FONT_XTINY, Draw.ORANGE]);
            } else if (ride.power < lo) {
                rows.add([:text, "Push on - " + range, Graphics.FONT_XTINY, Draw.BLUE]);
            } else {
                rows.add([:text, "In zone - " + range, Graphics.FONT_XTINY, Draw.GREEN]);
            }
        } else {
            rows.add([:gap, 0.02]);
        }

        rows.add([:gap, 0.02]);
        var left = st != null ? Draw.clock(st["s"] - ride.stepTime) : Draw.clock(ride.time);
        rows.add([:grid, [
            left, st != null ? "LEFT" : "TIME",
            ride.heartRate != null ? ride.heartRate.toString() : "--", "BPM",
            ride.cadence != null ? ride.cadence.toString() : "--", "RPM"
        ]]);
        rows.add([:gap, 0.02]);

        var nx = ride.nextStep();
        if (st == null) {
            rows.add([:text, "BACK to save", Graphics.FONT_XTINY, Draw.MUTED]);
        } else if (nx != null) {
            rows.add([:text, "Next: " + Draw.length(nx["s"]) + " " + Draw.str(nx["n"]).toLower() + ", " + nx["lo"] + "-" + nx["hi"] + " W", Graphics.FONT_XTINY, Draw.MUTED]);
        } else {
            rows.add([:text, "Last step", Graphics.FONT_XTINY, Draw.MUTED]);
        }
        Draw.stack(dc, rows);
        if (ride.running) {
            Draw.startMark(dc, Draw.ORANGE);
        }
    }
}

// Start: lap (on to the next step), or resume when paused. Back: pause, then save or discard.
class RideDelegate extends WatchUi.BehaviorDelegate {
    var ride;

    function initialize(r) {
        BehaviorDelegate.initialize();
        ride = r;
    }

    function onKey(evt) {
        if (evt.getKey() == WatchUi.KEY_ENTER) {
            if (ride.running) {
                ride.next();
            } else {
                ride.resume();
            }
            WatchUi.requestUpdate();
            return true;
        }
        return false;
    }

    // Taps on the screen don't lap: only the Start button does.
    function onSelect() {
        return true;
    }

    function onNextPage() {
        return true;
    }

    function onPreviousPage() {
        return true;
    }

    function onBack() {
        ride.pause();
        var menu = new WatchUi.Menu2({ :title => "Paused" });
        menu.addItem(new WatchUi.MenuItem("Resume", null, :resume, {}));
        menu.addItem(new WatchUi.MenuItem("Save", Draw.clock(ride.time), :save, {}));
        menu.addItem(new WatchUi.MenuItem("Discard", null, :discard, {}));
        WatchUi.pushView(menu, new PauseDelegate(ride), WatchUi.SLIDE_UP);
        WatchUi.requestUpdate();
        return true;
    }
}

class PauseDelegate extends WatchUi.Menu2InputDelegate {
    var ride;

    function initialize(r) {
        Menu2InputDelegate.initialize();
        ride = r;
    }

    function onSelect(item) {
        var id = item.getId();
        if (id == :resume) {
            ride.resume();
            WatchUi.popView(WatchUi.SLIDE_DOWN);
        } else if (id == :save) {
            ride.save();
            WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
            WatchUi.switchToView(new SummaryView(ride), new SummaryDelegate(), WatchUi.SLIDE_UP);
        } else if (id == :discard) {
            var sure = new WatchUi.Menu2({ :title => "Discard ride?" });
            sure.addItem(new WatchUi.MenuItem("Keep it", null, :keep, {}));
            sure.addItem(new WatchUi.MenuItem("Discard", "Not saved anywhere", :yes, {}));
            WatchUi.pushView(sure, new DiscardDelegate(ride), WatchUi.SLIDE_LEFT);
        }
    }

    // Back from the menu: stay paused on the ride screen.
    function onBack() {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
    }
}

class DiscardDelegate extends WatchUi.Menu2InputDelegate {
    var ride;

    function initialize(r) {
        Menu2InputDelegate.initialize();
        ride = r;
    }

    function onSelect(item) {
        if (item.getId() == :yes) {
            ride.discard();
            WatchUi.popView(WatchUi.SLIDE_IMMEDIATE); // this menu
            WatchUi.popView(WatchUi.SLIDE_IMMEDIATE); // the pause menu
            WatchUi.popView(WatchUi.SLIDE_DOWN);      // the ride
        } else {
            WatchUi.popView(WatchUi.SLIDE_RIGHT);
        }
    }
}
