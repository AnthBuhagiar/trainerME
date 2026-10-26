# Strava athlete capacity request (draft)

A new Strava API app allows only its owner. Up to **10 athletes** is self-serve in [Strava API settings](https://www.strava.com/settings/api). Beyond that, submit the app for review through Strava's developer program (the form is linked from the API settings page; email support doesn't handle these). Reviews have no fixed timeline, and Strava may approve fewer athletes than asked for.

Before submitting:
- [ ] The Strava webhook is subscribed (README → Several riders).
- [ ] `CONTACT_EMAIL` is set so `/privacy` shows a contact.
- [ ] Screenshots: the sign-in page with **Sign in with Strava**, Today, Progress, and Settings → Delete my account.
- [ ] Check the current Strava API Agreement and Brand Guidelines (the button and "Powered by Strava" wording) against the app; they change from time to time.

## Draft answers

**App name:** Hour Power

**Website:** https://hourpower.frontofficefantasy.football

**What does the app do?**
Hour Power is a training app for time-limited amateur cyclists (5–6 hours a week). It estimates each rider's hour power (best sustainable one-hour power) from their Strava rides and builds a weekly training plan around the days they have free, working back from a goal event. Riders can ride the planned workouts on a Bluetooth smart trainer in the browser and, if they choose, upload those rides to their Strava account.

**How is Strava data used?**
After the rider signs in with Strava, Hour Power reads their activities and ride streams (power, heart rate, cadence) to estimate hour power and adjust the plan to what they actually rode. Each rider sees only their own data. Nothing is shown to other users, shared, sold or used for advertising or AI training. The plan comes from fixed published rules, not an AI service.

**Scopes:** `read`, `profile:read_all` (weight, for watts per kilo), `activity:read_all` (rides, including private trainer rides), and `activity:write` (optional: upload rides recorded in Hour Power).

**Data retention and deletion:** Ride summaries and tokens are kept in a per-athlete folder on our server. Riders can delete everything from Settings (which also revokes access), and deauthorising Hour Power in Strava deletes their data through the webhook.

**How many athletes?** Start with 100: friends and club riders in Sydney preparing for events such as the GO4 Bathurst Cycling Festival.

**Commercial?** Free during testing. If a paid tier comes later, it will be for planning features; Strava data won't be sold or shown to anyone but the rider.
