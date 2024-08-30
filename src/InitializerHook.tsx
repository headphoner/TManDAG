import { useEffect, useRef, useState } from "react";
import { getAllUUIDsInTasksDB, getTasksInDB, getTaskInDB, setTaskInDB, deleteTaskInDB } from './LocalDatabaseManager';
import { useTasks } from './TasksReducer';

/**
 * React native hook to initialize the {@link useTasks|Tasks context}
 * @param dispatch - The dispatch handler for the {@link useTasks|Tasks context}
 * @returns A promise which is completed upon the end of initialization
 */
export default function useIntializer(dispatch: (TaskAction) => void) {
    const initializationPromise = useRef(null as Promise<void>);
    const [ doneLoading, setDoneLoading ] = useState(false);
    useEffect(() => {
        if (!initializationPromise.current) {
            initializationPromise.current = getAllUUIDsInTasksDB()
                .then(getTasksInDB)
                .then((store) => dispatch({ type: 'tasks/init', payload: store }))
                .then(() => setDoneLoading(true));
        }
    });
    return doneLoading;
}