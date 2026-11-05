import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

const PAGES = 4;
const PAGE_TODAY = 0;
const PAGE_SESSION = 1;
const PAGE_CHECKIN = 2;
const PAGE_GOAL = 3;

// One of the four pages, drawn from the last fetched day.
class PageView extends WatchUi.View {
    var page;

    function initialize(p) {
        View.initialize();
        page = p;
    }

    function onShow() {
        var data = getApp().data;
        // Coming back to the app after a while: fetch again.
        if (data.today == null || data.daysOld() != 0) {
            data.refresh(null);
        }
    }

    function onUpdate(dc) {
        Draw.clear(dc);
        var data = getApp().data;
        if (data.today == null) {
            empty(dc, data);
        } else if (page == PAGE_TODAY) {
            todayPage(dc, data);
        } else if (page == PAGE_SESSION) {
            sessionPage(dc, data);
        } else if (page == PAGE_CHECKIN) {
            checkinPage(dc, data);
        } else {
            goalPage(dc, data);
        }
    }

    // A note at the foot of the page when the data is old or the last fetch failed.
    function status(data) {
        if (data.loading) {
            return "Updating...";
        }
        if (data.message != null) {
            return data.message;
        }
        var old = data.daysOld();
        if (old > 0) {
            return "From " + Draw.str(data.today["dateLabel"]) + ". Not updated";
        }
        return null;
    }

    function addStatus(rows, data) {
        var s = status(data);
        if (s != null) {
            rows.add([:gap, 0.02]);
            rows.add([:text, s, Graphics.FONT_XTINY, Draw.DIM]);
        }
    }

    function empty(dc, data) {
        Draw.ring(dc, Draw.ORANGE, Draw.TRACK, 0, 6);
        var rows = [[:text, "HOUR POWER", Graphics.FONT_XTINY, Draw.ORANGE], [:gap, 0.03]];
        if (data.linkCode != null) {
            // Linking: enter this on the phone.
            rows.add([:text, "LINK THIS WATCH", Graphics.FONT_XTINY, Draw.MUTED]);
            rows.add([:text, data.linkCode, Graphics.FONT_LARGE, Draw.TEXT]);
            rows.add([:gap, 0.02]);
            rows.add([:text, "In Hour Power on your phone:", Graphics.FONT_XTINY, Draw.MUTED]);
            rows.add([:text, "Settings, Garmin watch app", Graphics.FONT_XTINY, Draw.SOFT]);
        } else if (data.message != null) {
            rows.add([:text, data.message, Graphics.FONT_SMALL, Draw.TEXT]);
            rows.add([:gap, 0.02]);
            rows.add([:pill, "START to try again", Draw.TEXT, Draw.LINE]);
        } else {
            rows.add([:text, data.linked() ? "Loading today..." : "Getting a link code...", Graphics.FONT_SMALL, Draw.TEXT]);
        }
        Draw.stack(dc, rows);
    }

    function minutesLine(s) {
        var where = s["indoor"] ? "trainer" : "outdoors";
        if (!"ride".equals(s["kind"])) {
            where = "strength".equals(s["kind"]) ? "strength" : Draw.str(s["kind"]);
        }
        return "" + s["minutes"] + " min, " + where;
    }

    function todayPage(dc, data) {
        var t = data.today;
        var week = t["week"];
        var frac = week != null && week["plannedMin"] > 0 ? week["doneMin"] / week["plannedMin"].toFloat() : 0;
        Draw.ring(dc, Draw.ORANGE, Draw.TRACK, frac, (Draw.size(dc) * 0.016).toNumber() + 2);

        var rows = [[:text, Draw.str(t["dateLabel"]), Graphics.FONT_XTINY, Draw.MUTED], [:gap, 0.015]];
        var hp = t["hourPower"];
        rows.add([:text, "HOUR POWER", Graphics.FONT_XTINY, Draw.ORANGE]);
        if (hp != null) {
            rows.add([:num, hp["w"].toString(), "W", Draw.TEXT]);
            rows.add([:text, "range " + hp["low"] + "-" + hp["high"] + " W", Graphics.FONT_XTINY, Draw.MUTED]);
        } else {
            rows.add([:text, "Sync rides in the app", Graphics.FONT_SMALL, Draw.TEXT]);
        }
        rows.add([:line]);

        var s = t["session"];
        if (s == null) {
            var off = "off".equals(t["checkin"]);
            rows.add([:text, off ? "TODAY - DAY OFF" : "TODAY - REST", Graphics.FONT_XTINY, Draw.MUTED]);
            rows.add([:text, "Nothing planned", Graphics.FONT_SMALL, Draw.TEXT]);
        } else {
            var label = s["done"] ? "DONE TODAY" : "TODAY - " + Draw.str(s["startLabel"]);
            rows.add([:text, label, Graphics.FONT_XTINY, s["done"] ? Draw.GREEN : Draw.MUTED]);
            rows.add([:text, Draw.str(s["title"]), Graphics.FONT_SMALL, Draw.TEXT]);
            rows.add([:text, minutesLine(s), Graphics.FONT_XTINY, Draw.MUTED]);
            if (data.rideable()) {
                Draw.startMark(dc, Draw.ORANGE);
            }
        }

        var g = t["goal"];
        if (g != null) {
            var days = g["days"] - data.daysOld();
            rows.add([:gap, 0.025]);
            rows.add([:pill, Draw.str(g["name"]) + " in " + days + (days == 1 ? " day" : " days"), Draw.BLUE_LIGHT, Draw.BLUE_DARK]);
        }
        addStatus(rows, data);
        Draw.stack(dc, rows);
    }

    function sessionPage(dc, data) {
        var s = data.session();
        if (s == null) {
            Draw.ring(dc, Draw.ORANGE, Draw.TRACK, 0, 6);
            var rows = [
                [:text, "TODAY", Graphics.FONT_XTINY, Draw.MUTED],
                [:text, "Rest day", Graphics.FONT_MEDIUM, Draw.TEXT],
                [:text, "Nothing to ride today", Graphics.FONT_XTINY, Draw.MUTED]
            ];
            addStatus(rows, data);
            Draw.stack(dc, rows);
            return;
        }
        var ride = "ride".equals(s["kind"]);
        var rows = [];
        var label = s["done"] ? "DONE TODAY" : (s["target"] != null && s["detail"] != null ? "TODAY - KEY SESSION" : "TODAY");
        rows.add([:text, label, Graphics.FONT_XTINY, s["done"] ? Draw.GREEN : Draw.MUTED]);
        if (s["adjusted"] != null) {
            rows.add([:text, s["adjusted"], Graphics.FONT_XTINY, Draw.ORANGE]);
        }
        rows.add([:text, Draw.str(s["title"]), Graphics.FONT_MEDIUM, Draw.TEXT]);
        if (s["detail"] != null) {
            rows.add([:text, s["detail"], Graphics.FONT_SMALL, Draw.SOFT]);
        }
        if (ride && s["steps"] != null && s["steps"].size() > 0) {
            rows.add([:gap, 0.02]);
            rows.add([:bars, s["steps"], Draw.ORANGE]);
        }
        if (s["target"] != null) {
            rows.add([:text, "TARGET " + s["target"]["lo"] + "-" + s["target"]["hi"] + " W", Graphics.FONT_SMALL, Draw.ORANGE]);
        } else if (ride && (s["steps"] == null || s["steps"].size() == 0)) {
            rows.add([:text, "Sync rides in the app for watt targets", Graphics.FONT_XTINY, Draw.MUTED]);
        }
        rows.add([:text, minutesLine(s), Graphics.FONT_XTINY, Draw.MUTED]);
        if (data.rideable()) {
            rows.add([:gap, 0.02]);
            rows.add([:pill, "START to ride", Draw.TEXT, Draw.LINE]);
            if (s["minMinutes"] != null) {
                rows.add([:text, "MENU (hold UP) for the length", Graphics.FONT_XTINY, Draw.DIM]);
            }
            Draw.startMark(dc, Draw.ORANGE);
        } else if (!ride) {
            rows.add([:text, "Log it in the app", Graphics.FONT_XTINY, Draw.DIM]);
        }
        addStatus(rows, data);
        Draw.stack(dc, rows);
    }

    function checkinPage(dc, data) {
        var mood = data.today["checkin"];
        var rows = [
            [:text, "CHECK-IN", Graphics.FONT_XTINY, Draw.MUTED],
            [:text, "How's today?", Graphics.FONT_MEDIUM, Draw.TEXT],
            [:gap, 0.03]
        ];
        if (mood == null) {
            rows.add([:text, "Not answered yet", Graphics.FONT_SMALL, Draw.MUTED]);
        } else {
            rows.add([:text, moodName(mood), Graphics.FONT_SMALL, Draw.ORANGE]);
            rows.add([:text, moodEffect(mood), Graphics.FONT_XTINY, Draw.MUTED]);
        }
        rows.add([:gap, 0.03]);
        rows.add([:pill, mood == null ? "START to answer" : "START to change", Draw.TEXT, Draw.LINE]);
        addStatus(rows, data);
        Draw.startMark(dc, Draw.ORANGE);
        Draw.stack(dc, rows);
    }

    function goalPage(dc, data) {
        var g = data.today["goal"];
        Draw.ring(dc, Draw.BLUE, Draw.BLUE_DARK, 0, (Draw.size(dc) * 0.02).toNumber() + 2);
        if (g == null) {
            Draw.stack(dc, [
                [:text, "GOAL", Graphics.FONT_XTINY, Draw.BLUE_LIGHT],
                [:text, "No goal yet", Graphics.FONT_MEDIUM, Draw.TEXT],
                [:text, "Set one in the app", Graphics.FONT_XTINY, Draw.MUTED]
            ]);
            return;
        }
        var days = g["days"] - data.daysOld();
        var rows = [
            [:text, Draw.str(g["name"]).toUpper(), Graphics.FONT_XTINY, Draw.BLUE_LIGHT],
            [:num, days.toString(), null, Draw.TEXT],
            [:text, days == 1 ? "DAY TO GO" : "DAYS TO GO", Graphics.FONT_XTINY, Draw.MUTED]
        ];
        if (g["km"] != null) {
            var line = "" + g["km"] + " km";
            if (g["climbM"] != null) {
                line += ", " + g["climbM"] + " m up";
            }
            rows.add([:text, line, Graphics.FONT_XTINY, Draw.SOFT]);
        }
        if (g["finish"] != null) {
            rows.add([:line]);
            rows.add([:text, "FINISH TODAY", Graphics.FONT_XTINY, Draw.MUTED]);
            rows.add([:text, g["finish"], Graphics.FONT_MEDIUM, Draw.BLUE]);
            if (g["target"] != null) {
                rows.add([:text, "Target " + g["target"], Graphics.FONT_XTINY, Draw.MUTED]);
            }
        }
        addStatus(rows, data);
        Draw.stack(dc, rows);
    }
}

function moodName(mood) {
    if ("good".equals(mood)) {
        return "Good";
    } else if ("tired".equals(mood)) {
        return "Tired";
    } else if ("short".equals(mood)) {
        return "Short on time";
    }
    return "Off today";
}

function moodEffect(mood) {
    if ("good".equals(mood)) {
        return "Riding as planned";
    } else if ("tired".equals(mood)) {
        return "Easy riding instead. Nothing to catch up";
    } else if ("short".equals(mood)) {
        return "Cut to fit, the key efforts kept";
    }
    return "Today's training moves to a free day";
}

class PageDelegate extends WatchUi.BehaviorDelegate {
    var page;

    function initialize(p) {
        BehaviorDelegate.initialize();
        page = p;
    }

    function go(p, transition) {
        WatchUi.switchToView(new PageView(p), new PageDelegate(p), transition);
        return true;
    }

    function onNextPage() {
        return go((page + 1) % PAGES, WatchUi.SLIDE_UP);
    }

    function onPreviousPage() {
        return go((page + PAGES - 1) % PAGES, WatchUi.SLIDE_DOWN);
    }

    function onSelect() {
        var data = getApp().data;
        if (data.today == null) {
            data.refresh(null);
            return true;
        }
        if ((page == PAGE_TODAY || page == PAGE_SESSION) && data.rideable()) {
            startRide(data.session());
        } else if (page == PAGE_CHECKIN) {
            openCheckin();
        } else if (page == PAGE_TODAY) {
            go(PAGE_SESSION, WatchUi.SLIDE_UP);
        }
        return true;
    }

    function onMenu() {
        var data = getApp().data;
        var menu = new WatchUi.Menu2({ :title => "Hour Power" });
        menu.addItem(new WatchUi.MenuItem("Update now", null, :refresh, {}));
        var s = data.session();
        if (data.rideable() && s["minMinutes"] != null) {
            menu.addItem(new WatchUi.MenuItem("Ride length", "" + s["minutes"] + " min", :length, {}));
        }
        menu.addItem(new WatchUi.MenuItem("Check-in", null, :checkin, {}));
        WatchUi.pushView(menu, new OptionsDelegate(), WatchUi.SLIDE_UP);
        return true;
    }

    function onBack() {
        if (page != PAGE_TODAY) {
            return go(PAGE_TODAY, WatchUi.SLIDE_DOWN);
        }
        return false; // leave the app
    }
}

function startRide(session) {
    var ride = new Ride(session);
    getApp().ride = ride;
    ride.start();
    WatchUi.pushView(new RideView(ride), new RideDelegate(ride), WatchUi.SLIDE_UP);
}

function openCheckin() {
    var menu = new WatchUi.Menu2({ :title => "How's today?" });
    menu.addItem(new WatchUi.MenuItem("Good", "As planned", "good", {}));
    menu.addItem(new WatchUi.MenuItem("Tired", "Easy riding instead", "tired", {}));
    menu.addItem(new WatchUi.MenuItem("Short on time", "Cut to fit", "short", {}));
    menu.addItem(new WatchUi.MenuItem("Off today", "Move it to a free day", "off", {}));
    WatchUi.pushView(menu, new CheckinDelegate(), WatchUi.SLIDE_UP);
}

class CheckinDelegate extends WatchUi.Menu2InputDelegate {
    function initialize() {
        Menu2InputDelegate.initialize();
    }

    function onSelect(item) {
        getApp().data.checkin(item.getId());
        WatchUi.popView(WatchUi.SLIDE_DOWN);
    }
}

class OptionsDelegate extends WatchUi.Menu2InputDelegate {
    function initialize() {
        Menu2InputDelegate.initialize();
    }

    function onSelect(item) {
        var id = item.getId();
        var data = getApp().data;
        if (id == :refresh) {
            WatchUi.popView(WatchUi.SLIDE_DOWN);
            data.refresh(data.minutes);
        } else if (id == :checkin) {
            WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
            openCheckin();
        } else if (id == :length) {
            WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
            openLengths(data.session());
        }
    }
}

// "Only 35 min?": lengths the workout allows, every 15 min (30 past two hours).
function openLengths(s) {
    var menu = new WatchUi.Menu2({ :title => "Time to ride" });
    var min = s["minMinutes"];
    var max = s["maxMinutes"];
    var now = s["minutes"];
    menu.addItem(new WatchUi.MenuItem("As planned", null, 0, {}));
    for (var m = min; m <= max; m += 5) {
        var step = m > 120 ? 30 : 15;
        if (m == min || m == max || m % step == 0 || m == now) {
            menu.addItem(new WatchUi.MenuItem("" + m + " min", m == now ? "Now" : null, m, {}));
        }
    }
    WatchUi.pushView(menu, new LengthDelegate(), WatchUi.SLIDE_UP);
}

class LengthDelegate extends WatchUi.Menu2InputDelegate {
    function initialize() {
        Menu2InputDelegate.initialize();
    }

    function onSelect(item) {
        var m = item.getId();
        getApp().data.refresh(m == 0 ? null : m);
        WatchUi.popView(WatchUi.SLIDE_DOWN);
    }
}
