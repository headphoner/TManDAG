import React, { createContext } from 'react';
import uuidTools from 'react-native-uuid';
import { Timespan, ScheduleRecipe, getScheduleDuring, getSoonestScheduledTimespan } from './TimeUtils';
import { TaskAction } from './TasksReducer';

/**
 * The React Native context used to maintain the global TaskStore state.
 */
export const TasksContext: React.Context<[TaskStore, (action: TaskAction) => void]> = createContext([{ }, function(){}]);

/**
 * Universal Unique Identifier for {@link Task|Tasks}.
 */
export type UUID = string | number;

export type Task = {
    readonly uuid: UUID,

    /** An array of all of the UUIDS of tasks which depend on this task (this may be also written as 'is a parent of') */
    readonly children: UUID[],

    /** An array of all of the UUIDS of tasks which this task depends on (this may be also written as 'is a child of') */
    readonly parents: UUID[],
    readonly name: string,
    readonly description: string|undefined,

    /** Whether this task has been completed */
    readonly is_done: boolean,

    /** Recipes for when to schedule this task */
    readonly schedule_recipes: ScheduleRecipe[],

    /**
     * If set, this is the time when we started timing this task as being worked on. `work_timer_total` will be updated when this is unset by the relevant TaskAction(s)
     */
    readonly work_timer_start_timestamp?: number,

    /** Total amount of time that has been spent on this task, not including any time since `work_timer_start_timestamp` */
    readonly work_timer_total: number // time spent on the task, total
}

/**
 * Local store of all tasks
 */
export type TaskStore = { [key: UUID]: Task };

namespace Tasks {

    /**
     * UUID to be used as a placeholder or for invalid tasks.
     */
    export const INVALID_UUID_CONST: UUID = -1;

    /**
     * Default parameters for a task, used when creating tasks where they are not supplied.
     */
    export const DEFAULT_TASK: Task = { uuid: INVALID_UUID_CONST, name: "New Task", description: "", children: [ ], parents: [ ],
    schedule_recipes: [ ], is_done: false, work_timer_total: 0 };

    /**
     * Function to populate a task, given only a partial amount of data.
     * @param options - A task object with some (or all) of its fields populated
     * @returns A fully populated task object. All previously unpopulated fields are populated by the
     * default values given in {@link DEFAULT_TASK} except `uuid`, which is randomly generated if not populated
     */
    export function makePropTask(options: Partial<Task> = { }): Task {
        return { ...DEFAULT_TASK, uuid: uuidTools.v4().toString(), ...options } as Task;
    }

    /**
     * Function to linearize a task dependency DAG
     * @param taskUUID - The task whose dependency DAG is to be linearized
     * @param tasks - A store of tasks which includes the dependency DAG for `taskUUID`
     * @returns A leaves-first linearization of the dependency DAG for `taskUUID`
     */
    export function getDependencyLinearization(taskUUID: UUID, tasks: TaskStore): UUID[] {
        // DFS and use first occurrence, added after exiting exploration of children to linearize
        let explored = new Set<UUID>();
        let ret = [ ];

        function dfs(uuid: UUID) {
            if (!explored.has(uuid) && !tasks[uuid].is_done) {
                explored.add(uuid);
                tasks[uuid].children.forEach((child_uuid) => dfs(child_uuid));
                ret.push(uuid);
            }
        }

        dfs(taskUUID);

        return ret;
    }

    /**
     * Function to get an ordering of tasks by dependency relationships
     * @param toOrder - The set of UUIDs for tasks to be ordered
     * @param tasks - A store of tasks which includes the dependency DAGs for all tasks in `toOrder`
     * @returns A leaves-first ordering of tasks in `toOrder`
     */
    export function getDependencyOrdering(toOrder: Set<UUID>, tasks: TaskStore) {
        // we will do this by linearizes the entire graph and then give the subsequence which contains toOrder
        // TODO: memoize for later calls
        // we will connect all source nodes to a single, known 'root' for easy linearization
        let sources = [ ];
        let explored = new Set<UUID>();
        function dfs(node: UUID) {
            if (explored.has(node)) return;
            explored.add(node);

            if (tasks[node].parents.length == 0) sources.push(node);
            for (let child of tasks[node].children) dfs(child);
        }
        for (let node in tasks) {
            dfs(node);
        }

        let root = Tasks.makePropTask({ children: sources });
        let easy_tasks = { ...tasks };
        easy_tasks[root.uuid] = root;

        return getDependencyLinearization(root.uuid, easy_tasks).filter((uuid) => toOrder.has(uuid));
    }

    /**
     * Function to check whether a given task is scheduled during a given timespan.
     * @param task - The task
     * @param during - The timespan
     * @returns Whether `task` is scheduled during any point of `during`
     */
    export function isTaskScheduled(task: Task, during: Timespan): boolean {
        return getTaskSchedule(task, during).length > 0;
    }

    /**
     * Function to get all timespans during which a task is scheduled within a given timespan.
     * @param task - The task
     * @param during - The timespan
     * @returns A list of times that this tasks is scheduled withing the timespan `during`, sorted by start time
     */
    export function getTaskSchedule(task: Task, during: Timespan): Timespan[] {
        if (!task || !task.schedule_recipes) throw new Error("Bad task");
        return task.schedule_recipes
            .map((recipe) => getScheduleDuring(recipe, during))             // get the schedules for each recipe
            .reduce((prev, cur) => [ ...prev, ...cur ], [ ] as Timespan[])  // merge the different recipes' schedules
            .sort((t1, t2) => t1.timeFrom - t2.timeFrom);                   // sort the schedule by start time
    }

    /**
     * Function to get the soonest scheduled timespan for a given task (optional: after a given point in time)
     * @param task - The task
     * @param startingFrom - The time after which the scheduled timespan must (optional)
     * @returns The timespan scheduled for `task` which has the earliest start time (which ends after `startingFrom`)
     */
    export function getTaskSoonestScheduledTimespan(task: Task, startingFrom: number = Number.MIN_SAFE_INTEGER): Timespan|null {
        let sorted = getTaskSchedule(task, { timeFrom: startingFrom, timeUntil: Number.MAX_SAFE_INTEGER });
        if (sorted.length > 0) return sorted[0];
        else return null;
    }

    /**
     * Function to calculate the amount of time spent on a given task
     * @param task - The task
     * @returns The amount of time that the task has been worked on
     */
    export function getTaskTimeWorkedOn(task: Task): number {
        return task.work_timer_total + (task.work_timer_start_timestamp? (Date.now() - task.work_timer_start_timestamp) : 0);
    }
}

export default Tasks;
