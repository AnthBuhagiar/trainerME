import Toybox.Application;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.Math;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.WatchUi;

// Today's plan from the Hour Power server (GET /api/watch/today), kept in storage so
// the watch still shows the last day it fetched when the phone is out of reach.
class HourPowerData {
    var today = null;     // the server's reply (a Dictionary), or null before the first fetch
    var message = null;   // what went wrong on the last fetch, if anything
    var loading = false;
    var minutes = null;   // a length chosen on the watch for today's ride ("Only 35 min?")

    function initialize() {
        var cached = Application.Storage.getValue("today");
        if (cached instanceof Dictionary) {
            today = cached;
        }
    }

    function setting(id) {
        var v = Application.Properties.getValue(id);
        if (v == null) {
            return null;
        }
        v = v.toString();
        // Typed on a phone: drop spaces at either end.
        while (v.length() > 0 && v.substring(0, 1).equals(" ")) {
            v = v.substring(1, v.length());
        }
        while (v.length() > 0 && v.substring(v.length() - 1, v.length()).equals(" ")) {
            v = v.substring(0, v.length() - 1);
        }
        return v.length() > 0 ? v : null;
    }

    function server() {
        var s = setting("serverUrl");
        if (s == null) {
            return null;
        }
        if (s.find("://") == null) {
            s = "https://" + s;
        }
        while (s.length() > 0 && s.substring(s.length() - 1, s.length()).equals("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
    }

    function headers(json) {
        var h = { "Authorization" => "Bearer " + setting("watchKey") };
        if (json) {
            h["Content-Type"] = Communications.REQUEST_CONTENT_TYPE_JSON;
        }
        return h;
    }

    function ready() {
        if (server() == null || setting("watchKey") == null) {
            message = "Add the server and watch key in Connect IQ settings";
            WatchUi.requestUpdate();
            return false;
        }
        return !loading;
    }

    // Fetch today; `mins` refits today's ride to that length (null: as planned).
    function refresh(mins) {
        if (!ready()) {
            return;
        }
        minutes = mins;
        var params = {};
        if (mins != null) {
            params["minutes"] = mins;
        }
        loading = true;
        Communications.makeWebRequest(server() + "/api/watch/today", params, {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :headers => headers(false),
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        }, method(:onToday));
        WatchUi.requestUpdate();
    }

    // mood: "good", "tired", "short" or "off". The server replies with the day as changed.
    function checkin(mood) {
        if (today != null) {
            today["checkin"] = mood;
        }
        if (!ready()) {
            return;
        }
        loading = true;
        minutes = null;
        Communications.makeWebRequest(server() + "/api/watch/checkin", { "mood" => mood }, {
            :method => Communications.HTTP_REQUEST_METHOD_POST,
            :headers => headers(true),
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        }, method(:onToday));
        WatchUi.requestUpdate();
    }

    function onToday(code, body) {
        loading = false;
        if (code == 200 && body instanceof Dictionary) {
            today = body;
            message = null;
            Application.Storage.setValue("today", body);
        } else if (code == 401) {
            message = "Watch key not recognised. Make a new one in the app";
        } else if (code == 403) {
            message = "Open Hour Power on your phone and accept the terms";
        } else if (code == -104 || code == -2) {
            message = "Phone not connected";
        } else if (code == -400 || code == -402) {
            message = "Server reply not understood. Check the server address";
        } else {
            message = "Couldn't reach Hour Power (" + code + ")";
        }
        WatchUi.requestUpdate();
    }

    // Days from the day the data is for to today on the watch (0 when fresh).
    function daysOld() {
        if (today == null || today["date"] == null) {
            return 0;
        }
        var d = today["date"].toString();
        var then = Gregorian.moment({
            :year => d.substring(0, 4).toNumber(),
            :month => d.substring(5, 7).toNumber(),
            :day => d.substring(8, 10).toNumber(),
            :hour => 12
        });
        var n = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        var now = Gregorian.moment({ :year => n.year, :month => n.month, :day => n.day, :hour => 12 });
        return Math.round(now.compare(then) / 86400.0).toNumber();
    }

    function session() {
        return today == null ? null : today["session"];
    }

    // Today's session can be ridden here: a ride, not already done, on today's data.
    function rideable() {
        var s = session();
        return s != null && "ride".equals(s["kind"]) && daysOld() == 0;
    }
}
