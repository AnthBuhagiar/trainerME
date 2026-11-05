import Toybox.Application;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.Math;
import Toybox.Time;
import Toybox.Timer;
import Toybox.Time.Gregorian;
import Toybox.WatchUi;

// Today's plan from the Hour Power server (GET /api/watch/today), kept in storage so
// the watch still shows the last day it fetched when the phone is out of reach.
// Everything goes through the phone (Garmin Connect); the watch never signs in.
// Unlinked, it shows a code to enter in Hour Power on the phone, then gets its key.
class HourPowerData {
    var today = null;     // the server's reply (a Dictionary), or null before the first fetch
    var message = null;   // what went wrong on the last fetch, if anything
    var loading = false;
    var minutes = null;   // a length chosen on the watch for today's ride ("Only 35 min?")
    var linkCode = null;  // shown while linking, e.g. "K7P-42Q"
    var linkToken = null; // proves to the server it's this watch collecting the key
    var linkTimer = null;

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

    function key() {
        var k = Application.Storage.getValue("watchKey");
        return k instanceof String && k.length() > 0 ? k : null;
    }

    function linked() {
        return key() != null;
    }

    function headers(json) {
        var h = { "Authorization" => "Bearer " + key() };
        if (json) {
            h["Content-Type"] = Communications.REQUEST_CONTENT_TYPE_JSON;
        }
        return h;
    }

    function ready() {
        if (server() == null) {
            message = "No server address. See watch/README.md";
            WatchUi.requestUpdate();
            return false;
        }
        if (!linked()) {
            startLink();
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
            // Unlinked on the phone (or linked to another watch): link again.
            forget();
            message = null;
            startLink();
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

    // ---- Linking from the phone ----

    function forget() {
        Application.Storage.deleteValue("watchKey");
        Application.Storage.deleteValue("today");
        today = null;
    }

    // Ask for a code to show. Called whenever the watch has no key.
    function startLink() {
        if (linkCode != null || loading || server() == null) {
            return;
        }
        loading = true;
        Communications.makeWebRequest(server() + "/api/watch/link", {}, {
            :method => Communications.HTTP_REQUEST_METHOD_POST,
            :headers => { "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        }, method(:onLinkStart));
        WatchUi.requestUpdate();
    }

    function onLinkStart(code, body) {
        loading = false;
        if (code == 200 && body instanceof Dictionary && body["code"] != null) {
            linkCode = body["code"];
            linkToken = body["token"];
            message = null;
            if (linkTimer == null) {
                linkTimer = new Timer.Timer();
            }
            linkTimer.start(method(:pollLink), 3000, true);
        } else {
            linkFailed(code);
        }
        WatchUi.requestUpdate();
    }

    function pollLink() {
        if (linkToken == null || loading) {
            return;
        }
        loading = true;
        Communications.makeWebRequest(server() + "/api/watch/link", {}, {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :headers => { "Authorization" => "Bearer " + linkToken },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        }, method(:onLinkPoll));
    }

    function onLinkPoll(code, body) {
        loading = false;
        if (code == 200 && body instanceof Dictionary && "linked".equals(body["status"]) && body["key"] != null) {
            stopLink();
            Application.Storage.setValue("watchKey", body["key"]);
            refresh(null);
        } else if (code == 410) {
            // The code ran out: get a fresh one.
            stopLink();
            startLink();
        } else if (code != 200) {
            linkFailed(code);
        }
        WatchUi.requestUpdate();
    }

    function stopLink() {
        if (linkTimer != null) {
            linkTimer.stop();
        }
        linkCode = null;
        linkToken = null;
    }

    function linkFailed(code) {
        if (code == -104 || code == -2) {
            message = "Phone not connected";
        } else if (code == 429) {
            message = "Busy. Trying again shortly";
        } else {
            message = "Couldn't reach Hour Power (" + code + ")";
        }
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
