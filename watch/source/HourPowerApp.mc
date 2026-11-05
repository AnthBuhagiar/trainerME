import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

// Hour Power Lite. Pages: today, session, check-in, goal (up and down to move).
// Start rides today's session with watt targets; Back pauses it.
class HourPowerApp extends Application.AppBase {
    var data;
    // The ride in progress, if any (saved if the app is closed mid-ride).
    var ride = null;

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state) {
        data = new HourPowerData();
        data.refresh(null);
    }

    function onStop(state) {
        if (ride != null) {
            ride.closeOnExit();
            ride = null;
        }
    }

    function getInitialView() {
        return [new PageView(0), new PageDelegate(0)];
    }

    function onSettingsChanged() {
        data.refresh(null);
        WatchUi.requestUpdate();
    }
}

function getApp() {
    return Application.getApp();
}
