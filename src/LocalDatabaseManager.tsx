import { TaskNotification } from './NotificationsHook';
import Tasks, { TaskStore, Task, UUID } from './Tasks';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TASK_DB_PREFIX = "tasks/";

/**
 * Function to get all of the UUIDs in the AsyncStorage tasks database
 * @returns A promise for all of the UUIDs of tasks in the AsyncStorage tasks database
 */
export function getAllUUIDsInTasksDB(): Promise<UUID[]> {
  return AsyncStorage.getAllKeys()
    .then((keys) => keys.filter((key) => key.startsWith(TASK_DB_PREFIX)).map((key) => key.slice(TASK_DB_PREFIX.length)));
}

/**
 * Function to get tasks in the AsyncStorage tasks database
 * @param uuids - The UUIDs for the tasks to be retrieved
 * @returns A promise for the tasks in the AsyncStorage tasks database with UUID matching any of the elements of `uuids`
 */
export function getTasksInDB(uuids: UUID[]): Promise<TaskStore> {
  return AsyncStorage
    .multiGet(uuids.map((uuid) => TASK_DB_PREFIX + uuid.toString()))
    .then((keyValPairs) => {
      let ret = { } as TaskStore;
      for (let pair of keyValPairs) {
        let task = rehydrateTask(pair[1]);
        ret[task.uuid] = task;
      }
      return ret;
    });
}

/**
 * Function to get a task in the AsyncStorage tasks database
 * @param uuid - The UUID for the task to be retrieved
 * @returns A promise for the task in the AsyncStorage tasks database matching whose UUID matches `uuids`
 */
export function getTaskInDB(uuid: UUID): Promise<Task> {
  return AsyncStorage.getItem(TASK_DB_PREFIX + uuid.toString()).then((dehyd) => rehydrateTask(dehyd));
}

/**
 * Function to set a task in the AsyncStorage tasks database
 * @param uuid - The UUID of the task to be set
 * @param state - The new state for the task with UUID `uuid`.
 * Unsupplied fields will be populated by {@link Tasks.makePropTask}
 * @returns A promise which is completed when the set is finished
 */
export function setTaskInDB(uuid: UUID, state: Partial<Task>): Promise<void> {
  return AsyncStorage.setItem(TASK_DB_PREFIX + uuid.toString(), dehydrateTask(Tasks.makePropTask(state)));
}

/**
 * Function to delete a task in the AsyncStorage tasks database
 * @param uuid - The UUID of the task to be deleted
 * @returns A promise which is completed when the deletion is finished
 */
export function deleteTaskInDB(uuid: UUID): Promise<void> {
  return AsyncStorage.removeItem(TASK_DB_PREFIX + uuid.toString());
}

/**
 * Function to serialize a task, for storage in the task database
 * @param task - The task to be serialized
 * @returns A string representing the task
 */
function dehydrateTask(task: Task): string {
  return JSON.stringify(task);
}

/**
 * Function to restantiate a serialized task from {@link dehydrateTask}
 * @param dehydratedTask - The task to have serialization undone
 * @returns The task as it was before {@link dehydrateTask|serialization}
 */
function rehydrateTask(dehydratedTask: string): Task {
  return JSON.parse(dehydratedTask) as Task;
}