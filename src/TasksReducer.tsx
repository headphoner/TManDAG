import { Reducer, useReducer, useEffect, useState } from "react";
import Tasks, { Task, UUID, TaskStore } from "./Tasks";
import { ScheduleRecipe, getScheduleDuring } from "./TimeUtils";
import { setTaskInDB, deleteTaskInDB } from './LocalDatabaseManager';

/**
 * A React Native hook to access and/or modify the store of all {@link Task|Tasks}
 * @todo Add logging to all actions, ability to rewind/unrewind actions
 * @returns A touple of the TaskStore and a function to call {@link dbMiddleware|the middleware} for {@link pureReducer|the reducer}
 */
export function useTasks() {
    return useReducer(dbMiddleware(pureReducer), { } as TaskStore);
}

/**
 * The middleware which syncs actions via the TaskStore hook ({@link useTasks}) to the database.
 * This allows all changes that `reducer` makes to be updated back into the database
 * @param reducer - The pure reducer for the TaskStore hook
 * @returns A pure function which mimics `reducer` but always updates the database to match the relevant changes
 */
function dbMiddleware( reducer: (store: TaskStore, action: TaskAction) => [ TaskStore, UUID[] ]):
Reducer<TaskStore, TaskAction> {
    return function (store: TaskStore, action: TaskAction): TaskStore {
        let [ newStore, updated ] = reducer(store, action);
        for (let uuid of updated) {
            if (uuid in newStore) setTaskInDB(uuid, newStore[uuid]);
            else deleteTaskInDB(uuid);
        }
        return newStore;
    }
}

/**
 * The pure function form wrapper for {@link dirtyReducer|the non-pure reducer} for the TaskStore hook ({@link useTasks}).
 * That is, the output is given as a different object than the input in memeory
 * @param store - The input state
 * @param action - The action to be taken on that state
 * @returns A tuple of the new state and all of the UUIDs of tasks which have been updated in any way
 */
function pureReducer(store: TaskStore, action: TaskAction): [ TaskStore, UUID[] ] {
    return dirtyReducer({ ...store }, action);
}

/**
 * The reducer for the TaskStore hook ({@link useTasks}).
 * This takes the current state and an action on the state and returns the next state.
 * This will may also modify the input state.
 * @param store - The current state
 * @param action - The action to take on the state
 * @returns A tuple of the new state and all of the UUIDs of tasks which have been updated in any way
 */
function dirtyReducer(store: TaskStore, action: TaskAction): [ TaskStore, UUID[] ] {
    let newTask: Task;
    let taskSt: Task;
    let children_ind: number;
    let parents_ind: number;
    let new_recipes: ScheduleRecipe[];
    let tmp_edited: UUID[];
    let edited: UUID[];
    switch (action.type) {
        case 'tasks/init':
            return [ action.payload, [ ] ];
        case 'tasks/create':
            newTask = Tasks.makePropTask(action.task);
            store[newTask.uuid] = newTask;
            return [ store, [newTask.uuid] ];
        case 'tasks/set':
            store[action.task.uuid] = Tasks.makePropTask(action.task);
            return [ store, [action.task.uuid] ];
        case 'tasks/delete':
            if (!store[action.task])
                throw new Error("Task given for deletion does not exist");
            edited = [ action.task ];
            for (let child of store[action.task].children) {
                [ store, tmp_edited ] = dirtyReducer(store, { type: 'tasks/remove_child', parent: action.task, child });
                edited = [ ...edited, ...tmp_edited ];
            }
            for (let parent of store[action.task].parents) {
                [ store, tmp_edited ] = dirtyReducer(store, { type: 'tasks/remove_child', parent, child: action.task });
                edited = [ ...edited, ...tmp_edited ];
            }
            delete store[action.task];
            return [ store, edited ];
        case 'tasks/start_timing':
            if (!store[action.task])
                throw new Error("Task given to begin timing does not exist");
            if (store[action.task].work_timer_start_timestamp)
                throw new Error("Task given to begin timing is already being timed");
            store[action.task] = { ...store[action.task], work_timer_start_timestamp: Date.now() };

            return [ store, [action.task] ];
        case 'tasks/stop_timing':
            taskSt = store[action.task];
            if (!taskSt)
                throw new Error("Task given to end timing does not exist");
            if (!taskSt.work_timer_start_timestamp)
                throw new Error("Task given to end timing was not being timed");
            store[action.task] = { ...taskSt, work_timer_start_timestamp: undefined,
                work_timer_total: taskSt.work_timer_total
                + Math.max(Date.now() - taskSt.work_timer_start_timestamp, 0) };
            return [ store, [action.task] ];
        case 'tasks/finish':
            store[action.task] = { ...store[action.task], is_done: true };
            return [ store, [action.task] ];
        case 'tasks/add_child':
            if (!store[action.parent])
                throw new Error("Task given for parent does not exist");
            if (!store[action.child])
                throw new Error("Task given for child does not exist");
            if (store[action.parent].children.indexOf(action.child) >= 0)
                throw new Error("Task given for parent is already a parent of the task given for child");
            if (store[action.child].parents.indexOf(action.parent) >= 0)
                throw new Error("Task given for child is already a child of the task given for parent");
            /**
             * @todo Circular dependency checking
             */

            store[action.parent] = { ...store[action.parent], children: [ ...store[action.parent].children, action.child ] };
            store[action.child] = { ...store[action.child], parents: [ ...store[action.child].parents, action.parent ] };
            return [ store, [action.parent, action.child] ];
        case 'tasks/remove_child':
            if (!store[action.parent])
                throw new Error("Task given for parent does not exist");
            if (!store[action.child])
                throw new Error("Task given for child does not exist");

            children_ind = store[action.parent].children.indexOf(action.child);
            parents_ind = store[action.child].parents.indexOf(action.parent);
            if (children_ind < 0)
                throw new Error("Task given for parent is not a parent of the task given for child");
            if (parents_ind < 0)
                throw new Error("Task given for child is not a child of the task given for parent");

            store[action.parent] = { ...store[action.parent],
                children: [ ...store[action.parent].children.slice(0, children_ind),
                            ...store[action.parent].children.slice(children_ind + 1) ] };
            store[action.child] = { ...store[action.child],
                parents: [ ...store[action.child].parents.slice(0, parents_ind),
                            ...store[action.child].parents.slice(parents_ind + 1) ] };
            return [ store, [action.parent, action.child] ];
        case 'tasks/agenda_finish':
            // change recipes so that we don't re-schedule this event
            new_recipes = [ ];
            for (let recipe of store[action.task].schedule_recipes) {
                let sched = getScheduleDuring(recipe, { timeFrom: Date.now(), timeUntil: Date.now() });
                if (sched.length > 0) {
                    /**
                     * @todo handle recurring (probably just move start time to after current sched instance)
                     */
                } else {
                    new_recipes.push(recipe);
                }
            }
            store[action.task] = { ...store[action.task], schedule_recipes: new_recipes };
            return [ store, [action.task] ];
        case 'tasks/create_child':
            newTask = Tasks.makePropTask(action.child);
            store = dirtyReducer(store, { type: 'tasks/set', task: newTask })[0];
            store = dirtyReducer(store, { type: 'tasks/add_child', child: newTask.uuid, parent: action.parent })[0];
            return [ store, [action.parent, newTask.uuid] ];
    }
}

///
/// List of actions recognized by the reducer
/// NOTE: actions are semantic, even if they have the same effects
///

/**
 * Action to initialize the TaskStore provided by {@link useTasks} to a certain value.
 */
export type InitializeStoreTaskAction = { type: 'tasks/init', payload: TaskStore };

/**
 * Action to create a new task in the TaskStore provided by {@link useTasks}.
 */
export type CreateTaskAction = {
    type: 'tasks/create',
    /** The data for the task to be created.
     * Missing fields Missing fields will be populated by {@link Tasks.makePropTask} */
    task: Partial<Task>
};

/**
 * Action to set the data of a task in the TaskStore provided by {@link useTasks}.
 * The task will be created if it does not exist but {@link CreateChildTaskAction} should be used if this
 * is the intended as something other than editing of a task.
 */
export type SetTaskAction = { type: 'tasks/set', task: Task };

/**
 * Action to delete a task in the TaskStore provided by {@link useTasks}
 * and update the parent/child relationships accordingly.
 * @remark This throws an error if no task exists with the UUID given.
 */
export type DeleteTaskAction = { type: 'tasks/delete', task: UUID };

/**
 * Action to mark as task as complete in the TaskStore provided by {@link useTasks}.
 * If no task exists with the UUID given, this does nothing.
 */
export type FinishTaskAction = { type: 'tasks/finish', task: UUID };

/**
 * Action to mark the 'amount of time spent on task' timer for the given task
 * as active in the TaskStore provided by {@link useTasks}.
 * @remark This throws an error if the timer is already marked as active or no task exists the UUID given.
 */
export type StartTimingTaskAction = { type: 'tasks/start_timing', task: UUID };

/**
 * Action to mark the 'amount of time spent on task' timer for the given task
 * as no longer active in the TaskStore provided by {@link useTasks}
 * and update the amount of time spent on the task accordingly.
 * @remark This throws an error if the timer is not marked as active or no task exists the UUID given.
 */
export type StopTimingTaskAction = { type: 'tasks/stop_timing', task: UUID };

/**
 * Action to add a task as the child of another in the TaskStore provided by {@link useTasks}.
 * @remark This throws an error if no task exists with the UUID of either `parent` or `child`
 * or if there is already any kind of parent-child relationship between `parent` and `child`
 * or if `parent` is a descendent of `child`
 */
export type AddChildTaskAction = { type: 'tasks/add_child', parent: UUID, child: UUID };

/**
 * Action to remove a task as the child of another in the TaskStore provided by {@link useTasks}.
 * @remark This throws an error if no task exists with the UUID of either `parent` or `child`
 * or if there is not a parent-child relationship between `parent` and `child`
 */
export type RemoveChildTaskAction = { type: 'tasks/remove_child', parent: UUID, child: UUID }; 

/**
 * Action to finish a task currently scheduled on the agenda in the TaskStore provided by {@link useTasks}.
 * @todo Add documentation on how this affects recurring schedules
 */
export type AgendaFinishTaskAction = { type: 'tasks/agenda_finish', task: UUID };

/**
 * Action to create a task as the child of another in the TaskStore provided by {@link useTasks}.
 */
export type CreateChildTaskAction = {
    type: 'tasks/create_child',
    parent: UUID,
    /** The data for the task which will become the child of `parent`.
     * Missing fields Missing fields will be populated by {@link Tasks.makePropTask} */
    child: Partial<Task>
};

/**
 * An action on the TaskStore provided by {@link useTasks} hook.
 */
export type TaskAction =
    InitializeStoreTaskAction | CreateTaskAction | SetTaskAction | DeleteTaskAction |
    FinishTaskAction | StartTimingTaskAction | StopTimingTaskAction | AddChildTaskAction |
    RemoveChildTaskAction | AgendaFinishTaskAction | CreateChildTaskAction;