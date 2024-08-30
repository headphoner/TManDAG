import { DimensionValue, Text, View } from 'react-native';
import Tasks, { TasksContext, UUID } from './Tasks';
import { useState, useContext, Fragment, useEffect } from 'react';
import styles, { ThinLine, getDateLabelText, getTimeLabel } from './StandardUI';
import { Timespan, getDoTimespansOverlap, ScheduledInstance } from './TimeUtils';

// TODO:
//  - Ability to change from-to dates inside the screen
//  - Allow pressing a schedule bar to view the task
//  - Long press on time marker allows you to move it
//  - Long press somewhere else allows you to schedule something for the time you press at

const TIMEVIEW_DEFAULT_SIZE = 1000 * 60 * 60 * 12; // 12 hours

/**
 * The schedule screen which allows the user to view all of the tasks scheduled during a timespan.
 * The tasks are shown as bars from their start to stop time.
 * @param options
 * @param options.timeView - the timespan that the displayed events must be in
 * @returns A React Native component which displays all tasks which are scheduled for any time during `timeView`
 */
export default function ScheduleScreen() {
    const [ tasks, dispatch ] = useContext(TasksContext);
    const [ timeView, setTimeView ] = useState({ timeFrom: Date.now(), timeUntil: Date.now() + TIMEVIEW_DEFAULT_SIZE });
    // effect to update the display to keep the time up to date
    useEffect(() => {
        const refresh_timer = setInterval(() => {
            setTimeView({ timeFrom: Date.now(), timeUntil: Date.now() + TIMEVIEW_DEFAULT_SIZE });
        }, 1000 /* every second */);
        return () => { clearInterval(refresh_timer); };
    });

    if (!tasks) throw new Error("This component requires the Tasks context");

    // create the UI as a list of columns of non-overlapping tasks
    let abstractColumns : ScheduledInstance[][];
    {
        // we will use this for shorthand
        function getDoColsOverlap(a: ScheduledInstance[], b: ScheduledInstance[]) {
            for (let inst_a of a) {
                for (let inst_b of b) {
                    if (getDoTimespansOverlap(inst_a.during, inst_b.during)) {
                        return true;
                    }
                }
            }
            return false;
        }

        /*
        * We will create the abstract columns iteratively by:
        * 1. order the tasks by a linearization of the DAG without non-scheduled tasks
        * 2. assign each scheduled instance for each task to its own column
        * 3. 'simulate gravity' -- collapse each as far left until it 'hits something'
        * 4. sort each column
        */

        // get the linearization
        let tasks_btwn = new Set<UUID>();
        for (let uuid in tasks) {
            if (Tasks.getTaskSchedule(tasks[uuid], timeView).length > 0) {
                tasks_btwn.add(uuid);
            }
        }

        let lin_tasks = Tasks
            .getDependencyOrdering(tasks_btwn, tasks)
            .reverse(); // the linearization given originally is leaves-first

        // 'simulate gravity'
        abstractColumns  = [ [] ];
        for (let uuid of lin_tasks) {
            outer: for (let timespan of Tasks.getTaskSchedule(tasks[uuid], timeView)) {
                let inst: ScheduledInstance = { uuid: uuid, during: timespan };
                for (let ind = abstractColumns.length-1; ind >= 0; ind--) {
                    let col = abstractColumns[ind];
                    if (getDoColsOverlap(col, [ inst ])) {
                        if (ind == abstractColumns.length-1) {
                            // it doesn't fit at the top layer
                            abstractColumns.push([ inst ]);
                        } else {
                            // put it in the next-highest layer
                            abstractColumns[ind+1].push(inst);
                        }
                        continue outer;
                    }
                }
                // it didn't 'hit' anything -- put it in the first layer
                abstractColumns[0].push(inst);
            }
        }

        // sort each column
        abstractColumns.forEach((col) => col.sort((a,b) => a.during.timeFrom - b.during.timeFrom));
    }

    const totalDur = timeView.timeUntil - timeView.timeFrom;
    const elementColumns = abstractColumns.map((column) => column.map(
        (inst, ind) => {
            let containerEnd = Math.min(inst.during.timeUntil, timeView.timeUntil);
            let containerStart = Math.max(inst.during.timeFrom, timeView.timeFrom)
            let durPerc = (containerEnd - containerStart) / totalDur;
            let heightPerc : DimensionValue = `${100 * durPerc}%`;
            let distance: number;
            if (ind > 0) {
                let prev = column[ind - 1];
                distance = inst.during.timeFrom - prev.during.timeUntil;
            } else {
                distance = containerStart - timeView.timeFrom; // distance from start of view
            }
            // spacer to space between prev entry and this or to align from ground zero
            let spacerSizePerc: DimensionValue = `${(100.0 * distance) / totalDur}%`;
            return (
            <Fragment key={ind}>
                <View style={{ height: spacerSizePerc }} />
                <View style={[ styles.rectBorder, { height: heightPerc, overflow: 'scroll' } ]} >
                    { /* only render if timestamp is after start */ inst.during.timeFrom > timeView.timeFrom ? 
                        <Text style={{ textAlign: 'center', fontVariant: ['tabular-nums'] }}>
                            {getTimeLabel(inst.during.timeFrom)}
                        </Text>
                    : null }
                    <ThinLine/>
                    <Text style={{ flex:1, textAlign: 'center' }}>{tasks[inst.uuid].name}</Text>
                    <ThinLine/>
                    { /* only render if timestamp is before end */ inst.during.timeUntil < timeView.timeUntil ? 
                        <Text style={{ textAlign: 'center', fontVariant: ['tabular-nums'] }}>
                            {getTimeLabel(inst.during.timeUntil)}
                        </Text>
                    : null }
                </View>
            </Fragment>);
        }
    ));

    return (
    <View style={[ styles.verticalFlexContainer, styles.centeredContent ]}>
        <Text style={styles.smallText}>{getDateLabelText(timeView.timeFrom)}</Text>
        <Text style={styles.largeText}>{getTimeLabel(timeView.timeFrom)}</Text>
        <ThinLine/>
        <View style={[ styles.horizontalFlexContainer, { justifyContent: 'center', width: '100%' } ]}>
            <View style={styles.verticalFlexContainer}/>
            {elementColumns.map((column, ind) => {
                return <View key={ind} style={[ styles.verticalFlexContainer ]}>{column}</View>;
            })}
            <View style={styles.verticalFlexContainer}/>
        </View>
        <ThinLine/>
        <Text style={styles.largeText}>{getTimeLabel(timeView.timeUntil)}</Text>
        <Text style={styles.smallText}>{getDateLabelText(timeView.timeUntil)}</Text>
    </View>);
}