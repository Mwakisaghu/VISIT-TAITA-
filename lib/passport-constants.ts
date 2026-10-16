// Passport values that the BROWSER also needs. Kept apart from lib/passport.ts, which holds server-only code (it makes the secret tokens for the QR plaques), so the booklet never pulls that into the browser.
/** Points for the first verified check-in at a destination. */
export const CHECKIN_POINTS = 10;
