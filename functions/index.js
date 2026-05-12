const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const functionsV1 = require('firebase-functions/v1');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
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
              <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#1a4a3a;">You're in!</p>
              <p style="margin:0 0 16px 0;">Welcome to GoSniff, the real-time social network for dogs (and the humans attached to them).</p>
              <p style="margin:0 0 24px 0;">GoSniff lets you see which dogs are at the park right now, check in when you're out and about, message your dog's friends, and get alerts about stuff like coyote sightings or lost dogs nearby. Waze + Tinder, canine version.</p>
              <p style="margin:0 0 8px 0;font-weight:700;">A few things to know before you head out:</p>
            </td>
          </tr>

          <!-- Section 1 -->
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#1a4a3a;">IT LOOKS LIKE AN APP, BUT IT'S A WEBSITE (THAT'S ON PURPOSE)</p>
              <p style="margin:0 0 12px 0;">GoSniff is a web app, which means there's nothing to download from the App Store or Google Play. You just open it in your phone's browser and use it.</p>
              <p style="margin:0 0 12px 0;">Here's the good part: you can add it to your phone's home screen so it looks and feels exactly like a regular app.</p>

              <p style="margin:0 0 8px 0;font-weight:700;">To add GoSniff to your iPhone home screen:</p>
              <ol style="margin:0 0 16px 0;padding-left:20px;">
                <li style="margin-bottom:6px;">Open Safari (it has to be Safari, not Chrome or another browser).</li>
                <li style="margin-bottom:6px;">Go to <a href="https://gosniff.vercel.app" style="color:#00869a;text-decoration:none;">https://gosniff.vercel.app</a> and log in.</li>
                <li style="margin-bottom:6px;">Tap the Share button at the bottom of the screen (the little square with an arrow pointing up).</li>
                <li style="margin-bottom:6px;">Scroll down and tap "Add to Home Screen."</li>
                <li style="margin-bottom:6px;">Tap "Add" in the top right corner.</li>
                <li style="margin-bottom:6px;">That's it! You'll see the GoSniff icon on your home screen just like any other app.</li>
              </ol>

              <p style="margin:0 0 8px 0;font-weight:700;">To add GoSniff to your Android home screen:</p>
              <ol style="margin:0 0 8px 0;padding-left:20px;">
                <li style="margin-bottom:6px;">Open Chrome.</li>
                <li style="margin-bottom:6px;">Go to <a href="https://gosniff.vercel.app" style="color:#00869a;text-decoration:none;">https://gosniff.vercel.app</a> and log in.</li>
                <li style="margin-bottom:6px;">Tap the three dots in the top right corner.</li>
                <li style="margin-bottom:6px;">Tap "Add to Home Screen" (or "Install App" if you see that option).</li>
                <li style="margin-bottom:6px;">Tap "Add."</li>
                <li style="margin-bottom:6px;">Done! GoSniff now lives on your home screen.</li>
              </ol>
            </td>
          </tr>

          <!-- Section 2 -->
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#1a4a3a;">YOU NEED TO TURN ON LOCATION (THIS IS THE IMPORTANT PART)</p>
              <p style="margin:0 0 12px 0;">GoSniff is a map. It needs to know where you are to work. When you first open GoSniff, your browser will ask "Allow GoSniff to access your location?" Tap "Allow" or "While Using."</p>
              <p style="margin:0 0 12px 0;">If you accidentally tapped "Don't Allow" or "Block" (or if nothing happens when you try to check in), you'll need to fix it in your phone's settings:</p>

              <p style="margin:0 0 8px 0;font-weight:700;">On iPhone:</p>
              <ol style="margin:0 0 16px 0;padding-left:20px;">
                <li style="margin-bottom:6px;">Open Settings.</li>
                <li style="margin-bottom:6px;">Scroll down to Safari (or whatever browser you're using).</li>
                <li style="margin-bottom:6px;">Tap Location.</li>
                <li style="margin-bottom:6px;">Make sure it's set to "Ask" or "Allow."</li>
                <li style="margin-bottom:6px;">Go back to GoSniff and reload the page.</li>
              </ol>

              <p style="margin:0 0 8px 0;font-weight:700;">On Android:</p>
              <ol style="margin:0 0 16px 0;padding-left:20px;">
                <li style="margin-bottom:6px;">Open Settings.</li>
                <li style="margin-bottom:6px;">Tap Apps, then find Chrome (or your browser).</li>
                <li style="margin-bottom:6px;">Tap Permissions, then Location.</li>
                <li style="margin-bottom:6px;">Select "Allow only while using the app."</li>
                <li style="margin-bottom:6px;">Go back to GoSniff and reload the page.</li>
              </ol>

              <p style="margin:0 0 8px 0;">If location still isn't working, try closing and reopening your browser, or restarting your phone. (The classic "turn it off and turn it back on" really does work most of the time.)</p>
            </td>
          </tr>

          <!-- Section 3 -->
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#1a4a3a;">MEET NEW DOGS</p>
              <p style="margin:0 0 12px 0;">When you check in, you can choose to be visible to everyone on GoSniff or just your pack (your friends list). If you're looking to meet new dogs, check in as visible to everyone. Other GoSniff users at or near your park can see your dog's profile, say hi, and send a pack request. Once you and another dog are in each other's packs, you can message each other and get notified when they check in. That's how the friend list grows. Your pack starts small, but every check-in is a chance to meet someone new.</p>
              <p style="margin:0 0 8px 0;">And don't worry, you're always in control. If someone's giving you weird vibes, you can remove them from your pack at any time. You can also flag a dog as a "frenemy." Maybe their dog doesn't get along with yours, or maybe the human is just a lot. Either way, flagging a frenemy means you'll get a heads-up alert whenever that dog checks in near you so you can steer clear. No drama, just information.</p>
            </td>
          </tr>

          <!-- Section 4 -->
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#1a4a3a;">ABOUT YOUR PRIVACY</p>
              <p style="margin:0 0 12px 0;">GoSniff never tracks you in the background. Your location only appears on the map when you manually tap "We're here!" to check in. When you're not checked in, you're invisible. Nobody can see you, period. You're also automatically checked out after 60 minutes of inactivity, so even if you forget, you won't be left on the map.</p>
              <p style="margin:0 0 12px 0;">You also have the option to make your check-ins visible to everyone on the app or only to dogs in your pack (your friends list). That's your call, every single time you check in.</p>
              <p style="margin:0 0 8px 0;">The only identity anyone sees on GoSniff is your dog. Your name, email, and personal info are never visible to other users.</p>
            </td>
          </tr>

          <!-- Section 5 -->
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#1a4a3a;">YOU'RE PART OF THE BETA</p>
              <p style="margin:0 0 12px 0;">GoSniff is currently in beta, which is a fancy way of saying we're still building it and you're one of the first people to try it. Things might be a little rough around the edges. You might find bugs. A feature might not work the way you expect. That's totally normal and actually really helpful for us to know about.</p>
              <p style="margin:0 0 8px 0;">If something breaks, seems weird, or if you have an idea for something you wish it could do, please tell us! Take a screenshot or write a quick note and email Ren at <a href="mailto:ren@godogpro.com" style="color:#00869a;text-decoration:none;">ren@godogpro.com</a>. No bug is too small, no idea is too weird.</p>
            </td>
          </tr>

          <!-- Section 6 / CTA -->
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;">
              <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#1a4a3a;">GO SNIFF SOMETHING</p>
              <p style="margin:0 0 24px 0;">Open GoSniff, check in at your favorite park, and see who's out there. Your dog's new best friend might already be waiting.</p>
              <p style="margin:0 0 6px 0;font-weight:700;">Welcome to the pack!</p>
              <p style="margin:0;">The GoSniff Team</p>
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
      subject: 'Welcome to GoSniff! Read this before your first check-in',
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
