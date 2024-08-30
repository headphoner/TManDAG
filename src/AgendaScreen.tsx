import { ScrollView, Text, View, Pressable } from 'react-native';
import Tasks, { TasksContext, UUID } from './Tasks';
import { useContext, useState, useEffect, useRef } from 'react';
import TaskSummary from './TaskSummaryComponent';
import { Svg, Circle, Polygon, Polyline } from 'react-native-svg';
import styles from './StandardUI';

function PlaySymbol(): React.JSX.Element {
    return (
    <Svg width={105} height={105}>
      <Circle r={50} cx={52.5} cy={52.5} stroke="black" strokeWidth={5} fill="none" />
      <Polygon points={[ 32.5,20, 32.5,85, 78.5,52.5 ]} />
    </Svg>);
}
function PauseSymbol(): React.JSX.Element {
    return (
    <Svg width={105} height={105}>
      <Circle r={50} cx={52.5} cy={52.5} stroke="black" strokeWidth={5} fill="none" />
      <Polygon points={[ 35,20, 47.5,20, 47.5,85, 35,85 ]} />
      <Polygon points={[ 57.5,20, 70,20, 70,85, 57.5,85 ]} />
    </Svg>);
}
function DoneSymbol(): React.JSX.Element {
    return (
    <Svg width={105} height={105}>
      <Circle r={50} cx={52.5} cy={52.5} stroke="black" strokeWidth={5} fill="none" />
      <Polyline stroke="black" points={[ 12.5,50, 37.5,75, 87.5,25 ]} strokeWidth={15} fill="none" />
    </Svg>);
}
function SkipSymbol(): React.JSX.Element {
    return (
    <Svg width={105} height={105}>
      <Circle r={50} cx={52.5} cy={52.5} stroke={"black"} strokeWidth={5} fill={"none"} />
      <Polygon points={[ 25,20, 25,85, 57.5,52.5 ]} />
      <Polygon points={[ 57.5,20, 57.5,85, 90,52.5 ]} />
    </Svg>);
}

const TICK_LENGTH = 500; // every half-second

// TODO:
//  - Default scheduling override(s)
//  - Better UI

/**
 * The agenda screen, a React Native component displays tasks 'on the agenda', along with some summary information
 * @param options
 * @param options.scheduledTaskUUID - The UUID of the task which is currently scheduled. If null, then nothing is scheduled
 * @param [options.onTaskDone] - A function which is called when the user completes the scheduled task or one of its subtasks
 * @param [options.onTaskSkipped] - A function which is called when the user skips the scheduled task or one of its subtasks
 * @param [options.onFinish] - A function which is called when all of the tasks on the agenda are skipped or completed
 * @returns A React Native component which displays tasks 'on the agenda', along with some summary information
 */
export default function(
    { scheduledTaskUUID, onTaskDone, onTaskSkipped, onFinish }:
    {
        scheduledTaskUUID: UUID,
        onTaskDone?: (uuid: UUID) => void,
        onTaskSkipped?: (uuid: UUID) => void,
        onFinish?: () => void
    }
) {

    const [ tasks, dispatch ] = useContext(TasksContext);
    const [ ignoredTasks, setIgnoredTasks ] = useState([] as UUID[]);

    if (!tasks) throw "This component requires the Tasks context";
    if (!scheduledTaskUUID) throw "Bad Task UUID";

    const linearized = Tasks
        .getDependencyLinearization(scheduledTaskUUID, tasks) // get list in actionable order
        .filter((uuid) => !(ignoredTasks.includes(uuid))); // filter out the hidden tasks
    
    if (linearized.length == 0) {
        // there is nothing to do
        return <Text>Agenda completed</Text>;
    }

    const curActionable = linearized[0];

    let isTimerActive = tasks[curActionable].work_timer_start_timestamp != null;

    function toggleTimer() {
        if (isTimerActive) dispatch({ type: 'tasks/stop_timing', task: curActionable });
        else dispatch({ type: 'tasks/start_timing', task: curActionable });
    }

    // removes a task from view
    function removeTaskFromAgenda(uuid: UUID) {
        if (isTimerActive) dispatch({ type: 'tasks/stop_timing', task: curActionable });
        setIgnoredTasks([ ...ignoredTasks, uuid ]);
        if (linearized.length == 1 && linearized[0] == uuid) {
            // we are hiding the last actionable task, and so everything must be finished
            if (onFinish) onFinish();
        }
    }

    function doneActionable() {
        removeTaskFromAgenda(curActionable);
        if (onTaskDone) onTaskDone(curActionable);
    }

    function skipActionable() {
        removeTaskFromAgenda(curActionable);
        if (onTaskSkipped) onTaskSkipped(curActionable);
    }

    return (
    <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
            <TaskSummary taskUUID={scheduledTaskUUID} showTimeScheduled={true} />
        </View>

        <View style={{ flex: 1 }}>
            <TaskSummary taskUUID={curActionable} showTimeSpent={true} />
        </View>

        <ScrollView style={[ styles.container, styles.roundedBorder, { flex: 1 } ]}>
            {linearized.map((uuid) =>
            <View key={uuid} style={[ styles.container, styles.rectBorder ]}>
                <Text style={styles.largeText}>{tasks[uuid].name}</Text>
                {tasks[uuid].parents.length > 0 ? <Text style={styles.smallText}>({tasks[uuid].parents.map((uuid2) => tasks[uuid2].name).join(", ")})</Text> : null}
            </View>)}
        </ScrollView>

        <View style={[ styles.container, styles.horizontalFlexContainer, styles.centeredContent, { flex: 1 } ]}>
            <Pressable
                onPress={toggleTimer}
                style={({pressed}) => [ { borderRadius: 52.5, backgroundColor: pressed? 'grey' : null } ]}
            >
                { isTimerActive ? (
                    <PauseSymbol/>
                ) : (
                    <PlaySymbol/>
                )}
            </Pressable>
            <Pressable
                onPress={doneActionable}
                style={({pressed}) => [ { borderRadius: 52.5, backgroundColor: pressed? 'grey' : null } ]}
            >
                <DoneSymbol/>
            </Pressable>
            <Pressable
                onPress={skipActionable}
                style={({pressed}) => [ { borderRadius: 52.5, backgroundColor: pressed? 'grey' : null } ]}
            >
                <SkipSymbol/>
            </Pressable>
        </View>
    </View>);
}