import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

// Ride saved: what was ridden, and today's hour power (it updates once the ride
// reaches Strava and the app syncs it).
class SummaryView extends WatchUi.View {
    var ride;

    function initialize(r) {
        View.initialize();
        ride = r;
    }

    function onUpdate(dc) {
        Draw.clear(dc);
        Draw.ring(dc, Draw.GREEN, null, 1, (Draw.size(dc) * 0.016).toNumber() + 2);
        var rows = [
            [:text, "SESSION SAVED", Graphics.FONT_XTINY, Draw.GREEN],
            [:text, ride.title, Graphics.FONT_SMALL, Draw.TEXT],
            [:gap, 0.02]
        ];
        var today = getApp().data.today;
        var hp = today != null ? today["hourPower"] : null;
        if (hp != null) {
            rows.add([:text, "HOUR POWER", Graphics.FONT_XTINY, Draw.ORANGE]);
            rows.add([:num, hp["w"].toString(), "W", Draw.TEXT]);
            rows.add([:text, "Updates once this ride syncs", Graphics.FONT_XTINY, Draw.MUTED]);
        }
        rows.add([:gap, 0.02]);
        var avg = ride.averageInEfforts();
        var n = ride.effortCount();
        rows.add([:grid, [
            (ride.time / 60).toString(), "MIN",
            avg != null ? avg.toString() : "--", "W EFFORTS",
            n > 0 ? "" + ride.blocks + "/" + n : "-", "BLOCKS"
        ]]);
        rows.add([:gap, 0.02]);
        rows.add([:text, "To Garmin Connect, then Strava", Graphics.FONT_XTINY, Draw.DIM]);
        Draw.stack(dc, rows);
    }
}

class SummaryDelegate extends WatchUi.BehaviorDelegate {
    function initialize() {
        BehaviorDelegate.initialize();
    }

    function onSelect() {
        return close();
    }

    function onBack() {
        return close();
    }

    function close() {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
        getApp().data.refresh(null);
        return true;
    }
}
