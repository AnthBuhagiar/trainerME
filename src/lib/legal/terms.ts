/**
 * Hour Power's Terms and Conditions, as riders see them at /terms. Edit the text
 * here; when the terms change in a way riders must agree to again, bump
 * TERMS_VERSION and everyone is asked to accept on their next visit.
 * "{{contact}}" is filled from CONTACT_EMAIL.
 */

export const TERMS_VERSION = "2026-10-27";

/** Carries the version ticked on the sign-in page through the Strava round trip. */
export const TERMS_COOKIE = "hp_terms";

export const TERMS_MD = String.raw`# Hour Power — Terms and Conditions

*Last updated 27 October 2026*

## 1. The short version

By signing in to Hour Power, you agree to these terms. They are written to match the promises Hour Power already makes to riders, so most of them are commitments from us, not just rules for you.

- **Your data is yours.** It is used only to show you your estimate and plan. It is never sold, shared, shown to other riders, used for advertising or used to train AI.
- **Hour Power is honest about what it knows.** Every estimate comes with a confidence range and a reason. Your training zones never change without you accepting the change.
- **Life comes first.** The plan fits the time you have. Missed sessions are never piled back on.
- **It is training guidance, not medical advice.** You ride at your own risk and should listen to your body and your doctor.
- **You can leave at any time.** Delete my account removes everything we hold and revokes Strava access straight away.

If you do not agree with these terms, please do not sign in or use Hour Power.

## 2. Who we are and who can use Hour Power

Hour Power is a cycling training web app run by Anthony Buhagiar, NSW, Australia ("we", "us"). In these terms, "you" means the rider using the app.

- **Age.** You must be 18 or older to use Hour Power.
- **Strava account.** You sign in with Strava, so you need a Strava account and must follow Strava's own terms.
- **One rider per account.** Your account is linked to your own Strava athlete profile. Do not sign in on behalf of someone else.
- **Beta.** Hour Power is currently in beta. Features may change, break or be removed, and places may be limited. We will tell you about significant changes before they happen where we can.

## 3. Our commitments to you

These commitments come from the principles Hour Power is built on. They form part of these terms, and you can hold us to them.

1. **Honest estimates.** Your hour power is always shown with a confidence range, never as a falsely precise number. The range widens when evidence is old and narrows with fresh rides.
2. **Explained changes.** Every change to your estimate or plan comes with a reason you can read.
3. **You stay in control.** A new estimate never silently changes your training zones. You choose to accept or decline it.
4. **Published accuracy.** We test the estimate against real long efforts and publish the results in the app (Progress → How accurate is it?), including where it falls short.
5. **Predictable plans, no AI at runtime.** Your plan is worked out by a fixed, published set of training rules. The same inputs always give the same plan. Your data is not sent to an AI service.
6. **Life first.** The plan fits the days and hours you choose. Life stress counts as load. Missed sessions are never carried over to make you "catch up".
7. **No dark patterns.** We will not use guilt, streak pressure or misleading prompts to keep you training or paying.

## 4. Your data and privacy

We collect only what Hour Power needs to estimate your hour power and plan your training. The full detail is on the Privacy page in the app.

| What | Why | Where it lives |
| --- | --- | --- |
| Strava profile (name, weight) | To show your name and work out power-to-weight | Your own folder on the Hour Power server |
| Rides (power, heart rate, cadence) | To estimate hour power and track progress | Stored as a summary per ride (power curve, averages) |
| Goals, training days, away dates, check-ins | To build a plan that fits your life | Your own folder |
| Strava sign-in tokens | To sync new rides | Your own folder, never shared |

- **Only you see it.** Your data is never shown to other riders, sold, shared, used for advertising or used to train AI.
- **Uploads to Strava** happen only if you allow them.
- **Deleting it.** Settings and data → Delete my account removes everything we hold for you and revokes Strava access immediately. Removing Hour Power in Strava (Settings → My Apps) also deletes your data.
- **Backups.** You can download a backup of your data at any time.
- **The law.** We handle personal information in line with the Australian Privacy Principles. If a data breach is likely to cause you serious harm, we will tell you promptly.

## 5. Health and safety

Hour Power gives general training guidance. It is not medical advice and does not replace a doctor, physiotherapist or qualified coach.

- **Check with a doctor** before starting a new training plan, especially if you have a medical condition, an injury, or have been inactive.
- **Listen to your body.** Stop a session if you feel chest pain, dizziness, unusual breathlessness or pain. No target is worth an injury.
- **Estimates can be wrong.** Hour power is an estimate with a range. Bad sensor data, a faulty power meter or a noisy heart-rate strap can make it less accurate. Use it as a guide, not a limit you must hit.
- **Ride safely outdoors.** Sessions are planned for a day, not a place. You choose where and when to ride, and you are responsible for traffic, weather and road conditions.
- **Indoor trainer control.** The workout player can set your smart trainer's resistance. Check your trainer and bike are set up correctly, and stop pedalling or end the workout if resistance feels wrong.
- **Fuel plans** are general targets for events, not dietary or medical advice.

## 6. Other services Hour Power works with

Hour Power connects to services run by other companies. Their own terms and privacy policies apply when you use them.

- **Strava.** Hour Power is an independent app. It is not made, endorsed or sponsored by Strava. If Strava changes or limits its service, some Hour Power features may stop working.
- **Intervals.icu.** If you connect it, rides are read from it and workouts can be sent to it, and on from there to Garmin or Zwift.
- **Exports.** Files you export (.zwo, .erg, .ics) and anything you send to another service are then handled under that service's terms.
- **Bluetooth devices.** The workout player works with compatible trainers and heart-rate straps through your browser. We cannot guarantee it works with every device or browser.

We are not responsible for how these services handle your data once it reaches them.

## 7. Your part

In return, we ask you to use Hour Power fairly.

- Give accurate information (weight, training days, goals) so your plan and estimate are right for you.
- Keep your Strava account secure. You are responsible for activity on your account.
- Do not try to access other riders' data, break or overload the app, or reverse-engineer it to harm it or its users.
- Do not copy, resell or redistribute Hour Power or its content as your own.
- Tell us if you find a bug or security problem, so we can fix it for everyone.

The Hour Power name, design and training rulebook belong to us. You own your ride data and anything you enter.

## 8. Fees, changes and the legal bits

**Fees.** Hour Power is free during the beta. If we introduce paid plans, we will tell you at least 30 days before any charge, explain what stays free, and never charge you without your clear agreement.

**Changes to these terms.** We may update these terms as Hour Power grows. We will tell you about important changes in the app at least 14 days before they apply. If you keep using Hour Power after that, the new terms apply; if you do not agree, you can delete your account.

**Ending your use.** You can stop using Hour Power and delete your account at any time. We may suspend or close an account that breaks these terms or puts other riders or the service at risk. Where reasonable, we will warn you first and give you time to download your data.

**Service availability.** We work to keep Hour Power running and secure, but it may sometimes be unavailable for updates, maintenance or reasons outside our control. Please keep your own backups.

**Liability.** Nothing in these terms limits your rights under the Australian Consumer Law. To the extent the law allows, we are not liable for injury, illness, lost data or other loss arising from your training or your use of Hour Power, and our total liability to you is limited to the amount you have paid us in the past 12 months.

**Governing law.** These terms are governed by the laws of New South Wales, Australia.

**Contact.** Questions, complaints or data requests: {{contact}}. We aim to reply within 7 days.
`;
