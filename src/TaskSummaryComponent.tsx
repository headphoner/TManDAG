import { useContext, useState } from 'react';
import { Text, StyleSheet, ScrollView, View, Pressable } from 'react-native';
import Tasks, { TasksContext, Task, UUID } from './Tasks';
import styles, { ThinLine, getTimeLabel, getDateLabelText } from "./StandardUI";
import { selectTaskTimeSpent } from './TaskTimeSpentHook';

/**
 * A simple time / date display
 * @param time - A point in time, given in milliseconds since Unix epoch (1 Jan 1970, UTC)
 * @returns The time / date display component
 */
function QuickTimeDateComponent({ time } : { time: number}): React.JSX.Element {
    return (
    <View style={[ styles.centeredContent, { flexDirection: 'column' } ]}>
        <Text style={{fontVariant: ['tabular-nums']}}>{getDateLabelText(time)}</Text>
        <Text style={{fontVariant: ['tabular-nums']}}>{getTimeLabel(time)}</Text>
    </View>);
}

/**
 * The task summary component.
 * This component gives a summary the fields of a given task.
 * @param options
 * @param options.taskUUID - UUID of the task to summarize
 * @param [options.showTimeSpent] - Whether to display the total time spent on the task in the summary
 * @param [options.showTimeScheduled] - Whether to display the most current instance when the task is scheduled
 * @returns The task summary React Native component
 */
export default function TaskSummaryComponent(
    { taskUUID, showTimeSpent = false, showTimeScheduled = false } :
    { taskUUID: UUID, showTimeSpent?: boolean, showTimeScheduled?: boolean }
): React.JSX.Element {
    // populate default values
    const [ tasks, dispatch ] = useContext(TasksContext);
    const timeSpent = selectTaskTimeSpent(tasks[taskUUID]);
    if (!tasks) throw new Error("This component requires the Tasks context");
    
    let task = tasks[taskUUID];

    function paddedNumber(num: number, len: number) {
        let str = num.toString();
        while (str.length < len) str = "0" + str;
        return str;
    }

    let hoursSpent = paddedNumber(Math.max(Math.floor(timeSpent/(60*60*1000.0)),0), 2);
    let minutesSpent = paddedNumber(Math.max(Math.floor(timeSpent/(60*1000.0)),0) % 60, 2);
    let secondsSpent = paddedNumber(Math.max(Math.floor(timeSpent/1000.0),0) % 60, 2);

    let nextSched = Tasks.getTaskSoonestScheduledTimespan(tasks[taskUUID]);

    return (
    <View style={[ styles.container, styles.roundedBorder ]}>
        
        {/* The identifiers: the name of the task and the name of its parent(s), if any exist */}
        <View style={[ styles.centeredContent ]}>
            <Text style={styles.headerText}>{task.name}</Text>
            { task.parents.length == 0 ? null :
            <Text style={styles.smallText}>
                ({task.parents.map((uuid) => tasks[uuid].name).join(", ")})
            </Text> }
        </View>
        
        { task.description ? <><ThinLine/><Text>{task.description}</Text></> : null }

        { /* The time stuff */ }
        { showTimeScheduled ? (
            <>
            <ThinLine/>
            <View style={{ flexDirection: 'row' }}>
                { nextSched ?
                <>
                    <View style={[ styles.horizontalFlexContainer, { alignItems: 'center', justifyContent: 'flex-start' } ]}>
                        <Text style={styles.largeText}>
                            From
                        </Text>
                        <QuickTimeDateComponent time={nextSched.timeFrom}/>
                    </View>
                    <View style={[ styles.horizontalFlexContainer, { alignItems: 'center', justifyContent: 'flex-end' } ]}>
                        <Text style={[ styles.largeText ]}>
                            Until
                        </Text>
                        <QuickTimeDateComponent time={nextSched.timeUntil}/>
                    </View>
                </>
                : null}
            </View>
            </>
        ): null }

        { showTimeSpent ? <><ThinLine/>{<Text style={{fontVariant: ['tabular-nums']}}>
            Time spent: {hoursSpent}h {minutesSpent}m {secondsSpent}s
        </Text> }</> : null }

    </View>);
}