
import { useState, useEffect } from "react";
import Tasks, { UUID, TaskStore } from "./Tasks";
import { Timespan, ScheduledInstance, getScheduleDuring } from "./TimeUtils";

/**
 * React Native hook to schedule events on the agenda
 * @param tasks - The set of tasks which may be scheduled
 * @param lookahead - Amount of time into the future we look to construct the schedule, in milliseconds
 * @returns A list of all the scheduled instances for `tasks` within a timespan of now and `lookahead` milliseconds from now.
 * If two tasks are scheduled for overlapping timespans, then the overlap is assigned to
 * the task with the timespan which starts later.
 * Output is sorted by start time, ascending.
 * @todo Add caching in the calculation
 */
export default function useScheduler(tasks: TaskStore, lookahead: number): ScheduledInstance[] {

    // window we look within for scheduling
    let window : Timespan = {
        timeFrom: Date.now(),
        timeUntil: Date.now() + lookahead
    };

    // a list of every instance of scheduling that each task 'wants'
    let schedule = 
        Object.keys(tasks)                                              // (UUID[]) start with task UUIDs
        .map((uuid) => tasks[uuid])                                     // (Task[]) get the task objects
        .map(                                                           // (ScheduledInstance[][]) get the schedules
            (task) =>                                                   // -- Following is for each task :
                task.schedule_recipes                                   // -- (ScheduleRecipe[]) get the schedule recipes
                .map((recipe) => getScheduleDuring(recipe, window))     // -- (Timespan[][]) get the schedule during the window
                .reduce((arr, timespan) =>                              // -- (Timespan[]) collate the timespan arrays
                    [ ...arr, ...timespan ], [ ])
                .map((timespan) =>                                      // -- (ScheduledInstance[]) convert to sched insts
                    ({ uuid: task.uuid, during: timespan }) as ScheduledInstance)
        )
        .reduce((arr, insts) => [ ...arr, ...insts ], [ ])              // (ScheduledInstance[]) collate the sched insts
        .sort((a, b) => a.during.timeFrom - b.during.timeFrom);         // sort by start time

    // dealing with overlaps: give everything to the later-starting instances
    // we can find overlaps by binary searching for the last element with start time before a given end time
    for (let ind = 0; ind < schedule.length; ind++) {
        let req = schedule[ind];
        let task = tasks[schedule[ind].uuid];

        // handle each of the elems past ind which overlap with `req`
        for (let ind2 = ind+1; getIndWithLatestStartTime(req.during.timeUntil) >= ind2 && ind2 < schedule.length; ind2++) {
            let req2 = schedule[ind2];

            // handle the overlap: cut up `task`

            // picture before:
            // ----------- req ----------
            //      --- req2 ----

            // picture after:
            // -req-             - req3 -
            //      --- req2 ----
            let newTimespan = getPieceBefore(req.during, req2.during.timeFrom);
            let insertTimespan = getPieceAfter(req.during, req2.during.timeUntil);

            if (newTimespan) {
                req.during = newTimespan;
            } else {
                // there was nothing left, delete it 
                schedule.splice(ind, 1);
                break; // this request no longer exists, continue the outer loop
            }

            if (insertTimespan) {
                // we have a new timespan req to put in
                let req3: ScheduledInstance = { uuid: task.uuid, during: insertTimespan };
                let insertInd = getIndWithLatestStartTime(insertTimespan.timeFrom);
                schedule.splice(insertInd, 0, req3);
            }
        }
    }

    return schedule;

    /**
     * Gets the index in requests with the latest start time which is before `before`
     * @todo Make a binary search
     * @param before - Time before which the start times must be
     * @returns The index in requests with the latest start time which is before `before`
     */
    function getIndWithLatestStartTime(before) {
        let ind = 0;
        // go through list until we find end or an element which starts after `before`
        for (; ind < schedule.length && schedule[ind].during.timeFrom <= before; ind++);
        return ind;
    }

    /**
     * Get the portion of a span before a given time, null if none
     */
    function getPieceBefore(span: Timespan, before: number): Timespan|null {
        if (span.timeFrom >= before) return null;
        else return { timeFrom: span.timeFrom, timeUntil: Math.min(before, span.timeUntil) };
    }

    /**
     * Get the portion of a span after a given time, null if none
     */
    function getPieceAfter(span: Timespan, after: number): Timespan|null {
        if (span.timeUntil <= after) return null;
        else return { timeFrom: Math.max(after, span.timeFrom), timeUntil: span.timeUntil };
    }
}