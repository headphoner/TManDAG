import React, { useContext } from 'react';
import { View, Pressable, TouchableWithoutFeedback } from 'react-native';
import Tasks, { TaskStore, UUID, TasksContext } from './Tasks';
import { Svg, Line } from 'react-native-svg';
import { Text, Button } from 'react-native-paper';
import styles from './StandardUI';
import notifee, { TimestampTrigger, TriggerType } from '@notifee/react-native';
/**
 * Screen with some dev utils
 * @returns React Native component with various development and testing utilities
 */
export default function DevScreen() {

    async function sendTestNotif() {
        // request permission to send notifications (iOS required)
        notifee.requestPermission();
        
        // create channel (Android required)
        const channelId = await notifee.createChannel({
            id: 'default',
            name: 'Default Channel',
          });

        const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: Date.now() + 1000 * 3
        };
        
        // display notification
        await notifee.createTriggerNotification({
            title: 'Task Time',
            body: 'Test Notification',
            android: {
                channelId: channelId
            }
        }, trigger);
    }

    return (
    <View>
        <Text>Welcome to the dev screen</Text>
        <Button onPress={sendTestNotif}>Send test notification in 3 seconds</Button>
    </View>)
}