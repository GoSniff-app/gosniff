const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const functionsV1 = require('firebase-functions/v1');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

// ─── Stale check-in sweep ────────────────────────────────────────────────────

const AUTO_CHECKOUT_MS = 60 * 60 * 1000; // 60 minutes

exports.sweepStaleCheckIns = onSchedule(
  { schedule: 'every 5 minutes', region: 'us-central1' },
  async () => {
    const db = getFirestore();

    const snap = await db.collection('dogs').where('checkedIn', '==', true).get();
    if (snap.empty) return;

    const cutoffMs = Date.now() - AUTO_CHECKOUT_MS;
    const batch = db.batch();
    let count = 0;

    snap.docs.forEach((d) => {
      const checkedInMs = d.data().checkedInTime?.toMillis?.() ?? 0;
      if (checkedInMs > 0 && checkedInMs < cutoffMs) {
        batch.update(d.ref, {
          checkedIn: false,
          checkedInLocation: null,
          checkedInAt: null,
          checkedInTime: null,
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Swept ${count} stale check-in(s).`);
    }
  }
);

// ─── Hourly Firestore hygiene ─────────────────────────────────────────────────

exports.hourlyCleanup = onSchedule(
  { schedule: 'every 60 minutes', region: 'us-central1' },
  async () => {
    const db = getFirestore();

    // 1. Alerts: delete expired (expiresAt in the past) OR inactive (denied early)
    const [expiredSnap, inactiveSnap] = await Promise.all([
      db.collection('alerts').where('expiresAt', '<', Timestamp.now()).get(),
      db.collection('alerts').where('active', '==', false).get(),
    ]);
    const alertRefMap = new Map();
    [...expiredSnap.docs, ...inactiveSnap.docs].forEach((d) => alertRefMap.set(d.id, d.ref));
    if (alertRefMap.size > 0) {
      await Promise.all([...alertRefMap.values()].map((ref) => ref.delete()));
      console.log(`Deleted ${alertRefMap.size} stale alert(s).`);
    }

    // 2. Messages: delete read messages older than 24 hours.
    // Only Timestamp-valued readAt fields satisfy the < filter, so null/unset are naturally excluded.
    const msgCutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const oldReadMsgsSnap = await db.collectionGroup('messages').where('readAt', '<', msgCutoff).get();
    if (!oldReadMsgsSnap.empty) {
      await Promise.all(oldReadMsgsSnap.docs.map((d) => d.ref.delete()));
      console.log(`Deleted ${oldReadMsgsSnap.size} old read message(s).`);
    }

    // 3. Orphaned pack docs: packLinks/packRequests whose referenced dog no longer exists.
    // Fetch all pack docs, collect unique dog IDs, batch-check existence, delete orphans.
    const [linksSnap, requestsSnap] = await Promise.all([
      db.collection('packLinks').get(),
      db.collection('packRequests').get(),
    ]);

    const dogIdsToCheck = new Set();
    linksSnap.docs.forEach((d) => (d.data().dogIds || []).forEach((id) => dogIdsToCheck.add(id)));
    requestsSnap.docs.forEach((d) => {
      const { fromDogId, toDogId } = d.data();
      if (fromDogId) dogIdsToCheck.add(fromDogId);
      if (toDogId) dogIdsToCheck.add(toDogId);
    });

    const dogChecks = await Promise.all([...dogIdsToCheck].map((id) => db.collection('dogs').doc(id).get()));
    const existingDogIds = new Set(dogChecks.filter((s) => s.exists).map((s) => s.id));

    const orphanedRefs = [];
    linksSnap.docs.forEach((d) => {
      if ((d.data().dogIds || []).some((id) => !existingDogIds.has(id))) orphanedRefs.push(d.ref);
    });
    requestsSnap.docs.forEach((d) => {
      const { fromDogId, toDogId } = d.data();
      if ((fromDogId && !existingDogIds.has(fromDogId)) || (toDogId && !existingDogIds.has(toDogId))) {
        orphanedRefs.push(d.ref);
      }
    });

    if (orphanedRefs.length > 0) {
      await Promise.all(orphanedRefs.map((ref) => ref.delete()));
      console.log(`Deleted ${orphanedRefs.length} orphaned pack document(s).`);
    }
  }
);

// ─── Welcome email on new user signup ────────────────────────────────────────

const WELCOME_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;border-bottom:2px solid #e5e5e5;">
              <p style="margin:0;font-size:24px;font-weight:700;color:#1a4a3a;">GoSniff 🐾</p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:28px 0 0 0;">
              <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#1a4a3a;">Welcome to GoSniff: Quick Set Up Guide</p>
              <p style="margin:0;">You're in! We're so glad you and your pup joined the pack.</p>
            </td>
          </tr>

          <!-- What is GoSniff? -->
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#1a4a3a;">What is GoSniff?</p>
              <p style="margin:0;">GoSniff is a real-time social map (Waze plus Grindr, but for dogs) where you see which dogs are at the park right now, check in when you're out, message your dog friends, and get alerts about lost dogs, coyotes, or other stuff worth knowing about. It's the easiest way to make dog playdates happen and find walking buddies when you want them.</p>
            </td>
          </tr>

          <!-- Web app, not downloaded -->
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#1a4a3a;">GoSniff is a web app, not a downloaded app</p>
              <p style="margin:0 0 12px 0;">GoSniff isn't in the App Store (yet). You access it through your phone's browser, but you can add it to your home screen so it looks and feels exactly like a regular app.</p>

              <p style="margin:0 0 8px 0;font-weight:700;">iPhone:</p>
              <ol style="margin:0 0 16px 0;padding-left:20px;">
                <li style="margin-bottom:6px;">Open Safari (must be Safari, not Chrome or another browser).</li>
                <li style="margin-bottom:6px;">Go to <a href="https://gosniff.app" style="color:#00869a;text-decoration:none;">gosniff.app</a> (delete the old gosniff.vercel.app from your home screen if you have it).</li>
                <li style="margin-bottom:6px;">Tap the Share button at the bottom.</li>
                <li style="margin-bottom:6px;">Tap "Add to Home Screen."</li>
                <li style="margin-bottom:6px;">Make sure "Open as Web App" is checked.</li>
                <li style="margin-bottom:6px;">Tap "Add."</li>
              </ol>

              <p style="margin:0 0 8px 0;font-weight:700;">Android:</p>
              <ol style="margin:0 0 8px 0;padding-left:20px;">
                <li style="margin-bottom:6px;">Open Chrome.</li>
                <li style="margin-bottom:6px;">Go to <a href="https://gosniff.app" style="color:#00869a;text-decoration:none;">gosniff.app</a> (delete the old gosniff.vercel.app from your home screen if you have it).</li>
                <li style="margin-bottom:6px;">Tap the three dots (menu) in the top right.</li>
                <li style="margin-bottom:6px;">Tap "Add to Home Screen."</li>
                <li style="margin-bottom:6px;">Tap "Add."</li>
              </ol>
            </td>
          </tr>

          <!-- Two permissions -->
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#1a4a3a;">You need to allow two permissions</p>

              <p style="margin:0 0 6px 0;font-weight:700;">Location:</p>
              <p style="margin:0 0 16px 0;">GoSniff is a map, so it needs to know where you are so you can check in at parks and see which dogs are nearby. When GoSniff asks "Allow location access?"—tap Allow. You control your check-in visibility each time you check in (you can set it to public or friends-only).</p>

              <p style="margin:0 0 6px 0;font-weight:700;">Notifications:</p>
              <p style="margin:0;">Notifications let your dog friends tell you when they're at the park. Without notifications, you have to remember to open the app to find out. With them, you get a ping when your pack checks in. Tap Allow when GoSniff asks.</p>
            </td>
          </tr>

          <!-- Privacy -->
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#1a4a3a;">Privacy—your human identity is never revealed</p>
              <p style="margin:0 0 12px 0;">Your human account is completely private. Other people see your dog's name, photo, breed, and energy level but they never see your email, phone number, or your name. Only the dogs you explicitly invite to your pack can message your dog.</p>
              <p style="margin:0;">Your check-in location is only visible to the dogs you choose. Every time you check in, you pick: visible to other dogs nearby, or visible only to your pack. You can update your location if you're on the move, delete your check-in anytime, and after 60 minutes you're automatically off the map.</p>
            </td>
          </tr>

          <!-- Beta -->
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#1a4a3a;">You're in beta</p>
              <p style="margin:0 0 16px 0;">We're still building GoSniff. Things might be glitchy. If something breaks or feels weird, let me know at <a href="mailto:ren@godogpro.com" style="color:#00869a;text-decoration:none;">ren@godogpro.com</a>.</p>
              <p style="margin:0;font-weight:700;">Welcome to the pack!</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0;font-size:13px;color:#888888;">You're receiving this because you just created a GoSniff account. Questions? Email us at <a href="mailto:ren@godogpro.com" style="color:#888888;">ren@godogpro.com</a>.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

exports.sendWelcomeEmail = functionsV1.auth.user().onCreate(async (user) => {
  const email = user.email;

  if (!email) {
    console.log('sendWelcomeEmail: no email on new user, skipping.');
    return;
  }

  console.log(`sendWelcomeEmail: sending welcome email to ${email}`);

  const db = getFirestore();

  await db.collection('mail').add({
    to: [email],
    message: {
      subject: 'Welcome to GoSniff: Quick Set Up Guide',
      html: WELCOME_HTML,
    },
  });

  console.log(`sendWelcomeEmail: mail document written for ${email}`);
});

// ─── Pack check-in push notifications ────────────────────────────────────────

exports.sendCheckInNotification = onDocumentUpdated(
  { document: 'dogs/{dogId}', region: 'us-central1' },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Only fire on new check-ins (false → true)
    if (before.checkedIn !== false || after.checkedIn !== true) return;

    const dogId = event.params.dogId;
    const dogName = after.name || 'A dog';
    const locationName = after.checkedInAt || 'the park';
    const ownerUid = after.humanIds?.[0];

    if (!ownerUid) return;

    const db = getFirestore();
    const fcm = getMessaging();

    // Find all pack links that include this dog
    const packLinksSnap = await db
      .collection('packLinks')
      .where('dogIds', 'array-contains', dogId)
      .get();

    if (packLinksSnap.empty) return;

    // Collect unique human UIDs to notify by looking up the other dog in each link
    const humanIdSet = new Set();
    await Promise.all(
      packLinksSnap.docs.map(async (linkDoc) => {
        const otherDogId = linkDoc.data().dogIds.find((id) => id !== dogId);
        if (!otherDogId) return;
        const otherDogSnap = await db.collection('dogs').doc(otherDogId).get();
        if (!otherDogSnap.exists) return;
        const otherHumanId = otherDogSnap.data()?.humanIds?.[0];
        if (otherHumanId && otherHumanId !== ownerUid) humanIdSet.add(otherHumanId);
      })
    );

    if (humanIdSet.size === 0) return;

    let notifiedCount = 0;

    await Promise.all(
      [...humanIdSet].map(async (humanId) => {
        const humanRef = db.collection('humans').doc(humanId);
        const humanSnap = await humanRef.get();
        if (!humanSnap.exists) return;

        const humanData = humanSnap.data();

        // Skip if this dog is muted for check-in notifications
        if (humanData.mutedCheckInDogIds?.includes(dogId)) return;

        const fcmTokens = humanData.fcmTokens || [];
        if (fcmTokens.length === 0) return;

        const staleTokenStrings = [];

        await Promise.all(
          fcmTokens.map((tokenEntry) =>
            fcm.send({
              token: tokenEntry.token,
              notification: {
                title: 'GoSniff',
                body: `${dogName} just checked in at ${locationName}! 🐕`,
              },
              webpush: {
                fcmOptions: { link: 'https://gosniff.vercel.app' },
              },
            }).catch((err) => {
              if (err.code === 'messaging/registration-token-not-registered') {
                staleTokenStrings.push(tokenEntry.token);
              } else {
                console.error(`FCM send failed for human ${humanId}:`, err.message);
              }
            })
          )
        );

        // Clean up any stale tokens
        if (staleTokenStrings.length > 0) {
          const updatedTokens = fcmTokens.filter(
            (t) => !staleTokenStrings.includes(t.token)
          );
          await humanRef.update({ fcmTokens: updatedTokens });
          console.log(`Removed ${staleTokenStrings.length} stale token(s) for human ${humanId}`);
        }

        notifiedCount++;
      })
    );

    console.log(`Sent check-in notification for ${dogName} to ${notifiedCount} humans`);
  }
);

// ─── New message push notifications ──────────────────────────────────────────

exports.sendMessageNotification = onDocumentCreated(
  { document: 'conversations/{conversationId}/messages/{messageId}', region: 'us-central1' },
  async (event) => {
    const messageData = event.data.data();
    const { conversationId } = event.params;

    const fromDogId = messageData.fromDogId;
    const rawText = messageData.text || '';
    const notifBody = rawText.length > 100 ? rawText.slice(0, 100) + '...' : rawText;

    if (!fromDogId) return;

    const db = getFirestore();
    const fcm = getMessaging();

    // Read the parent conversation
    const convoSnap = await db.collection('conversations').doc(conversationId).get();
    if (!convoSnap.exists) return;

    const { dogIds, humanIds } = convoSnap.data();

    // Identify recipient dog and human
    const recipientDogId = dogIds.find((id) => id !== fromDogId);
    if (!recipientDogId) return;

    const recipientDogSnap = await db.collection('dogs').doc(recipientDogId).get();
    if (!recipientDogSnap.exists) return;
    const recipientHumanId = recipientDogSnap.data()?.humanIds?.[0];
    if (!recipientHumanId) return;

    // Read recipient human doc
    const recipientRef = db.collection('humans').doc(recipientHumanId);
    const recipientSnap = await recipientRef.get();
    if (!recipientSnap.exists) return;

    const recipientData = recipientSnap.data();

    // Skip if sender is muted
    if (recipientData.mutedMessageDogIds?.includes(fromDogId)) return;

    const fcmTokens = recipientData.fcmTokens || [];
    if (fcmTokens.length === 0) return;

    // Get sender dog name for notification title
    const senderDogSnap = await db.collection('dogs').doc(fromDogId).get();
    const senderName = senderDogSnap.exists ? (senderDogSnap.data()?.name || 'Someone') : 'Someone';

    const staleTokenStrings = [];

    await Promise.all(
      fcmTokens.map((tokenEntry) =>
        fcm.send({
          token: tokenEntry.token,
          notification: {
            title: senderName,
            body: notifBody,
          },
          webpush: {
            fcmOptions: { link: 'https://gosniff.vercel.app' },
          },
        }).catch((err) => {
          if (err.code === 'messaging/registration-token-not-registered') {
            staleTokenStrings.push(tokenEntry.token);
          } else {
            console.error(`FCM send failed for human ${recipientHumanId}:`, err.message);
          }
        })
      )
    );

    if (staleTokenStrings.length > 0) {
      const updatedTokens = fcmTokens.filter((t) => !staleTokenStrings.includes(t.token));
      await recipientRef.update({ fcmTokens: updatedTokens });
      console.log(`Removed ${staleTokenStrings.length} stale token(s) for human ${recipientHumanId}`);
    }

    console.log(`Sent message notification from ${senderName} to human ${recipientHumanId}`);
  }
);

// ─── Test email send (TEMPORARY — for verifying email delivery) ────────────────
//
// HTTPS endpoint to confirm the email pipeline works end-to-end.
//
// NOTE: The Firebase Admin SDK cannot send email on its own. This project sends
// mail the same way sendWelcomeEmail does: by writing a document to the `mail`
// collection, which the "Trigger Email" Firestore extension delivers via SendGrid.
// This function follows that exact pattern. The `from` address is set to
// noreply@gosniff.app, but the extension will only honor it if that sender is
// verified in SendGrid and the extension is configured to allow a custom From;
// otherwise it falls back to the extension's default sender.

const { onRequest } = require('firebase-functions/v2/https');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.testEmailSend = onRequest(
  { region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      console.log(`testEmailSend: rejected ${req.method} request`);
      res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
      return;
    }

    // Accept the address from a JSON body { "email": "..." } or a form/query param.
    const email = (req.body?.email || req.query?.email || '').toString().trim();

    if (!email || !EMAIL_RE.test(email)) {
      console.log(`testEmailSend: invalid or missing email -> "${email}"`);
      res.status(400).json({ success: false, error: 'Provide a valid "email" in the POST body.' });
      return;
    }

    console.log(`testEmailSend: queuing test email to ${email}`);

    try {
      const db = getFirestore();

      const mailRef = await db.collection('mail').add({
        to: [email],
        from: 'noreply@gosniff.app',
        message: {
          subject: 'GoSniff test email 🐾',
          text: `This is a test email from GoSniff sent to ${email}. If you received this, the email pipeline is working.`,
          html: `<p>This is a <strong>test email</strong> from GoSniff sent to ${email}.</p><p>If you received this, the email pipeline is working. 🐾</p>`,
        },
      });

      console.log(`testEmailSend: SUCCESS — mail document ${mailRef.id} created for ${email}`);

      res.status(200).json({
        success: true,
        message: `Test email queued for ${email}.`,
        mailDocId: mailRef.id,
        note: 'Delivery is handled asynchronously by the Trigger Email extension (SendGrid). Check the recipient inbox and the mail document\'s "delivery" field for final status.',
      });
    } catch (err) {
      console.error(`testEmailSend: ERROR queuing email to ${email}:`, err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─── Custom password reset flow ───────────────────────────────────────────────
//
// A self-contained reset flow that does NOT rely on Firebase's oobCode emails.
// 1) sendPasswordResetEmail: validates the account, mints a Firestore code, emails
//    a link to /reset-password?code=...  (delivery via the Trigger Email extension)
// 2) verifyResetCode: server-side validation of a custom code (clients are logged
//    out during reset, so they can't read the private passwordResetCodes collection)
// 3) confirmPasswordResetWithCode: applies the new password via the Admin SDK,
//    then deletes the used code.

const { onCall } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');

const RESET_CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_RESEND_WINDOW_MS = 5 * 60 * 1000;  // throttle re-sends to 1 per 5 min
const RESET_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateResetCode() {
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += RESET_CODE_CHARS[crypto.randomInt(RESET_CODE_CHARS.length)];
  }
  return out;
}

function buildResetEmailHtml(resetUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <tr>
            <td style="padding-bottom:24px;border-bottom:2px solid #e5e5e5;">
              <p style="margin:0;font-size:24px;font-weight:700;color:#1a4a3a;">GoSniff 🐾</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0 0 0;">
              <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#1a4a3a;">Reset your password</p>
              <p style="margin:0 0 24px 0;">Click the link below to reset your password. This link expires in 24 hours.</p>
              <p style="margin:0 0 24px 0;">
                <a href="${resetUrl}" style="display:inline-block;background:#0097A7;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:12px;">Reset Password</a>
              </p>
              <p style="margin:0 0 8px 0;font-size:14px;color:#737373;">Or paste this link into your browser:</p>
              <p style="margin:0 0 24px 0;font-size:14px;word-break:break-all;"><a href="${resetUrl}" style="color:#00869a;">${resetUrl}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0;font-size:13px;color:#888888;">If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

exports.sendPasswordResetEmail = onCall({ region: 'us-central1' }, async (request) => {
  const email = (request.data?.email || '').toString().trim();

  // Malformed input is a client-side problem, not account enumeration.
  if (!email || !EMAIL_RE.test(email)) {
    return { error: 'invalid-email' };
  }

  const db = getFirestore();

  // Verify the account exists in the humans collection. The human doc id is the uid.
  // NOTE: To prevent account enumeration, we return the SAME generic success
  // whether or not an account exists — we just don't send mail when it doesn't.
  const humansSnap = await db.collection('humans').where('email', '==', email).limit(1).get();
  if (humansSnap.empty) {
    console.log(`sendPasswordResetEmail: no account for ${email} (returning generic success)`);
    return { success: true };
  }
  const uid = humansSnap.docs[0].id;

  // Throttle: if a code was created for this email in the last 5 minutes, don't
  // mint another. Report success so we don't leak timing/account info or spam.
  const recentSnap = await db.collection('passwordResetCodes').where('email', '==', email).get();
  const now = Date.now();
  const hasRecent = recentSnap.docs.some((d) => {
    const created = d.data().createdAt?.toMillis?.() ?? 0;
    return created > 0 && now - created < RESET_RESEND_WINDOW_MS;
  });
  if (hasRecent) {
    console.log(`sendPasswordResetEmail: throttled re-send for ${email}`);
    return { success: true };
  }

  const code = generateResetCode();
  const resetUrl = `https://gosniff.app/reset-password?code=${code}`;

  await db.collection('passwordResetCodes').doc(code).set({
    email,
    uid,
    code,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: now + RESET_CODE_TTL_MS, // stored as ms since epoch
  });

  // No `from` set: uses the extension's verified default sender (like
  // sendWelcomeEmail). Re-add `from: 'noreply@gosniff.app'` once verified in SendGrid.
  await db.collection('mail').add({
    to: [email],
    message: {
      subject: 'Reset your GoSniff password',
      html: buildResetEmailHtml(resetUrl),
      text: `Reset your GoSniff password. Click the link below (expires in 24 hours):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    },
  });

  console.log(`sendPasswordResetEmail: reset code created and email queued for ${email}`);
  return { success: true };
});

exports.verifyResetCode = onCall({ region: 'us-central1' }, async (request) => {
  const code = (request.data?.code || '').toString();
  if (!code) return { error: 'invalid' };

  const db = getFirestore();
  const snap = await db.collection('passwordResetCodes').doc(code).get();
  if (!snap.exists) return { error: 'invalid' };

  const data = snap.data();
  if (!data.expiresAt || data.expiresAt < Date.now()) {
    await snap.ref.delete().catch(() => {});
    return { error: 'expired' };
  }

  // Return only the (non-sensitive) email so the page can show whose account it is.
  return { valid: true, email: data.email || '' };
});

exports.confirmPasswordResetWithCode = onCall({ region: 'us-central1' }, async (request) => {
  const code = (request.data?.code || '').toString();
  const newPassword = (request.data?.newPassword || '').toString();

  if (!code) return { error: 'invalid' };
  if (!newPassword || newPassword.length < 6) return { error: 'weak-password' };

  const db = getFirestore();
  const ref = db.collection('passwordResetCodes').doc(code);
  const snap = await ref.get();
  if (!snap.exists) return { error: 'invalid' };

  const data = snap.data();
  if (!data.expiresAt || data.expiresAt < Date.now()) {
    await ref.delete().catch(() => {});
    return { error: 'expired' };
  }

  try {
    // Prefer the uid stored on the code doc; fall back to email lookup.
    let uid = data.uid;
    if (!uid) {
      const userRecord = await getAuth().getUserByEmail(data.email);
      uid = userRecord.uid;
    }

    await getAuth().updateUser(uid, { password: newPassword });
    await ref.delete().catch(() => {});

    console.log(`confirmPasswordResetWithCode: password updated for uid ${uid}`);
    return { success: true };
  } catch (err) {
    if (err.code === 'auth/user-not-found') return { error: 'invalid' };
    if (err.code === 'auth/weak-password') return { error: 'weak-password' };
    console.error('confirmPasswordResetWithCode: error applying new password:', err);
    return { error: 'server' };
  }
});
