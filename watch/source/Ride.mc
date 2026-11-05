import Toybox.Activity;
import Toybox.ActivityRecording;
import Toybox.Attention;
import Toybox.Lang;
import Toybox.Position;
import Toybox.Sensor;
import Toybox.Timer;
import Toybox.WatchUi;

// Riding today's session: records a cycling activity (saved to Garmin Connect, then
// Strava if linked) and walks the steps with their watt targets. Power, heart rate and
// cadence come from the sensors paired with the watch.
class Ride {
    var title;
    var indoor;
    var steps;          // [{n, s, lo, hi, k}], may be empty: a free ride
    var idx = 0;        // the step being ridden (== steps.size(): past the last)
    var stepTime = 0;   // seconds into this step
    var time = 0;       // seconds ridden, pauses left out
    var running = false;
    var power = null;   // 3 s average
    var heartRate = null;
    var cadence = null;
    var recent = [];
    var workSum = 0;    // watts summed over seconds in the efforts
    var workCount = 0;
    var blocks = 0;     // efforts ridden through
    var session = null;
    var timer = null;

    function initialize(s) {
        title = s["title"] != null ? s["title"].toString() : "Hour Power ride";
        indoor = s["indoor"] == true;
        steps = s["steps"] != null ? s["steps"] : [];
    }

    function start() {
        Sensor.setEnabledSensors([Sensor.SENSOR_HEARTRATE, Sensor.SENSOR_BIKEPOWER, Sensor.SENSOR_BIKECADENCE]);
        Sensor.enableSensorEvents(method(:onSensor));
        if (!indoor) {
            Position.enableLocationEvents(Position.LOCATION_CONTINUOUS, method(:onPosition));
        }
        session = ActivityRecording.createSession({
            :name => title,
            :sport => Activity.SPORT_CYCLING,
            :subSport => indoor ? Activity.SUB_SPORT_INDOOR_CYCLING : Activity.SUB_SPORT_ROAD
        });
        session.start();
        running = true;
        timer = new Timer.Timer();
        timer.start(method(:onTick), 1000, true);
        alert(false);
    }

    function onSensor(info) {
        heartRate = info.heartRate;
        cadence = info.cadence;
        if (info.power != null) {
            recent.add(info.power);
            if (recent.size() > 3) {
                recent = recent.slice(1, null);
            }
            var sum = 0;
            for (var i = 0; i < recent.size(); i++) {
                sum += recent[i];
            }
            power = (sum / recent.size().toFloat() + 0.5).toNumber();
        } else {
            recent = [];
            power = null;
        }
    }

    function onPosition(info) {
        // Recorded by the activity session; nothing to show.
    }

    function onTick() {
        if (!running) {
            return;
        }
        time += 1;
        stepTime += 1;
        var st = step();
        if (st != null && "i".equals(st["k"]) && power != null) {
            workSum += power;
            workCount += 1;
        }
        if (st != null && stepTime >= st["s"]) {
            next();
        } else if (st != null && st["s"] - stepTime == 3) {
            // A heads-up before the change.
            if (Attention has :playTone) {
                Attention.playTone(Attention.TONE_KEY);
            }
        }
        WatchUi.requestUpdate();
    }

    function step() {
        return idx < steps.size() ? steps[idx] : null;
    }

    function nextStep() {
        return idx + 1 < steps.size() ? steps[idx + 1] : null;
    }

    // On to the next step: when the time's up, or Start pressed to lap.
    function next() {
        var st = step();
        if (st == null) {
            session.addLap();
            alert(false);
            return;
        }
        // An effort counts once most of it is ridden.
        if ("i".equals(st["k"]) && stepTime >= st["s"] * 0.6) {
            blocks += 1;
        }
        idx += 1;
        stepTime = 0;
        session.addLap();
        alert(step() != null && "i".equals(step()["k"]));
    }

    function alert(hard) {
        if (Attention has :playTone) {
            Attention.playTone(hard ? Attention.TONE_INTERVAL_ALERT : Attention.TONE_LAP);
        }
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(75, hard ? 600 : 300)]);
        }
    }

    function pause() {
        if (running) {
            running = false;
            session.stop();
        }
    }

    function resume() {
        if (!running) {
            session.start();
            running = true;
        }
    }

    function stopAll() {
        running = false;
        if (timer != null) {
            timer.stop();
            timer = null;
        }
        Sensor.enableSensorEvents(null);
        if (!indoor) {
            Position.enableLocationEvents(Position.LOCATION_DISABLE, null);
        }
        if (session != null && session.isRecording()) {
            session.stop();
        }
    }

    function save() {
        stopAll();
        session.save();
        getApp().ride = null;
    }

    function discard() {
        stopAll();
        session.discard();
        getApp().ride = null;
    }

    // The app closed mid-ride: keep anything over a minute.
    function closeOnExit() {
        stopAll();
        if (time >= 60) {
            session.save();
        } else {
            session.discard();
        }
    }

    // Efforts: number, and which one this is (1-based, 0 outside them).
    function effortCount() {
        var n = 0;
        for (var i = 0; i < steps.size(); i++) {
            if ("i".equals(steps[i]["k"])) {
                n += 1;
            }
        }
        return n;
    }

    function effortNumber() {
        var st = step();
        if (st == null || !"i".equals(st["k"])) {
            return 0;
        }
        var n = 0;
        for (var i = 0; i <= idx; i++) {
            if ("i".equals(steps[i]["k"])) {
                n += 1;
            }
        }
        return n;
    }

    function averageInEfforts() {
        return workCount > 0 ? (workSum / workCount.toFloat() + 0.5).toNumber() : null;
    }
}
