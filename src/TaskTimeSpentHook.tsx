import { useState, useEffect } from 'react';
import Tasks, { Task } from './Tasks';

/**
 * A React Native hook to track a 'time spent on {@link Task}' display.
 * This will cause the parent component to refresh every `refresh_interval` milliseconds
 * @param task - The task to track we are intereseting in tracking
 * @param refresh_interval - How long to wait before the hook should update the display
 * @returns The total amount of time spent on the task
 */
export function selectTaskTimeSpent(task: Task, refresh_interval: number = 1000) {
    const [ timeSpent, setTimeSpent ] = useState(Tasks.getTaskTimeWorkedOn(task));
    useEffect(() => {
        const refresh_timer = task.work_timer_start_timestamp ? setInterval(() => {
            if (task.work_timer_start_timestamp)
                setTimeSpent(Tasks.getTaskTimeWorkedOn(task));
        }, refresh_interval) : null;
        return () => { if (refresh_timer) clearInterval(refresh_timer); };
    });
    return timeSpent;
}