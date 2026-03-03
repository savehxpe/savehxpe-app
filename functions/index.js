const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.onSystemRestore = functions.firestore
    .document('config/system_status')
    .onUpdate(async (change, context) => {
        const beforeStats = change.before.data();
        const afterStats = change.after.data();

        // Check if maintenance_mode transitioned from true to false
        if (beforeStats.maintenance_mode === true && afterStats.maintenance_mode === false) {
            console.log('System restored, orchestrating Global Pulse');

            // 1. Send FCM message to all citizens subscribed to 'global_alerts'
            // Note: Assumes clients have implemented messaging and subscribed to 'global_alerts' topic 
            const message = {
                notification: {
                    title: 'Signal Restored',
                    body: 'SYSTEM ONLINE: FREQUENCY VERIFIED.',
                },
                data: {
                    type: 'SYSTEM_RESTORE',
                    bonusActive: 'true'
                },
                topic: 'global_alerts'
            };

            try {
                await admin.messaging().send(message);
                console.log('Global pulse push notification sent to /topics/global_alerts.');
            } catch (error) {
                // Log errors but do not fail the function, since FCM might fail if no devices are registered etc.
                console.error('Error sending global pulse push notification:', error);
            }

            // 2. Set the `last_restored_at` timestamp on the config doc
            // This allows the frontend to orchestrate the 60-minute Re-Sync Bonus without server-side cron
            try {
                await change.after.ref.update({
                    last_restored_at: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log('last_restored_at timestamp updated.');
            } catch (error) {
                console.error('Error updating last_restored_at:', error);
            }
        }

        return null;
    });
