import { ScheduledInstance } from "./TimeUtils";
import { TaskStore, UUID } from "./Tasks";
import notifee, { TimestampTrigger, TriggerType } from '@notifee/react-native';

/**
 * Object representing a notification about a task
 * @param timestamp - Timestamp of when to display notification
 * @param title - Title of the notificaiton
 * @param body - Body text of the notification
 * @param task - The {@link UUID} of the task that the notification concerns
 */
export type TaskNotification = {
    timestamp: number;
    title: string;
    body: string;
    task: UUID;
};

export default async function useNotifications(tasks: TaskStore, schedule: ScheduledInstance[]) {
    await cancelNotifs();
    for (let inst of schedule) {
        if (inst.during.timeFrom > Date.now()) {
            await scheduleNotif({
                timestamp: inst.during.timeFrom,
                title: `Task Start: ${tasks[inst.uuid].name}`,
                body: `${tasks[inst.uuid].description}`,
                task: inst.uuid
            });
        }
    }
}

async function scheduleNotif(notif: TaskNotification) {
    // request permission to send notifications if we don't have it (iOS required)
    notifee.requestPermission();
    
    // create channel (Android required)
    const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
      });

    const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: notif.timestamp
    };
    
    // display notification
    await notifee.createTriggerNotification({
        title: notif.title,
        body: notif.body,
        android: {
            channelId: channelId
        },
        ios: {
            // TODO sound: ''
        }
    }, trigger);
}

async function cancelNotifs() {
    notifee.cancelAllNotifications();
}