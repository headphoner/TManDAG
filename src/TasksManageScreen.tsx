import { useState, useContext } from "react";
import { View, ColorValue } from "react-native";
import { Button } from 'react-native-paper';
import Tasks, { Task, UUID, TasksContext } from "./Tasks";
import styles from './StandardUI';
import TaskGraphComponent from "./TaskGraphComponent";
import TaskEdit from "./TaskEditComponent";
import { SetTaskAction, CreateChildTaskAction, CreateTaskAction } from "./TasksReducer";
import constants from "../constants.json";

type StagedTaskAction = CreateTaskAction | CreateChildTaskAction | SetTaskAction;

/**
 * The tasks management screen gives an overview of all tasks in the form of a dependency graph.
 * The screen also allows the user to edit tasks.
 * @returns A React Native component comprising the tasks management screen
 */
export default function TasksManageScreen() {
    const [ tasks, dispatch ] = useContext(TasksContext);
    const [ selected, setSelected ] = useState(null as UUID);
    const [ stagedTaskAction, setStagedTaskAction ] = useState(null as StagedTaskAction);
    if (!tasks) throw new Error("This component requires the Tasks context");

    function toggleSelected(task: UUID) {
        if (task == selected) setSelected(null);
        else setSelected(task);
    }

    function addTask() {
        setStagedTaskAction({ type: 'tasks/create', task: { } });
    }

    function addChildTask() {
        setStagedTaskAction({ type: 'tasks/create_child', parent: selected, child: { } });
    }

    function editTask() {
        setStagedTaskAction({ type: 'tasks/set', task: tasks[selected] });
    }

    function deleteTask() {
        setSelected(null);
        dispatch({ type: 'tasks/delete', task: selected });
    }

    if (stagedTaskAction) {
        let task: Partial<Task>;
        let disabledFields: (keyof Task)[];
        let dispatch_helper: (t: Partial<Task>) => StagedTaskAction;
        switch (stagedTaskAction.type) {
            case 'tasks/create':
            case 'tasks/set':
                task = stagedTaskAction.task;
                disabledFields = [ ];
                dispatch_helper = (task) => ({ ...stagedTaskAction, task: Tasks.makePropTask(task) });
                break;
            case 'tasks/create_child':
                task = stagedTaskAction.child;
                disabledFields = [ 'parents' ];
                dispatch_helper = (child) => ({ ...stagedTaskAction, child });
                break;
        }
        return <TaskEdit
            task={task}
            onCancel={() => setStagedTaskAction(null)}
            disabledFields={disabledFields}
            onConfirm={(nTask) => {
                dispatch(dispatch_helper(nTask));
                setStagedTaskAction(null);
            }
        } />;
    }

    // calculate highlight colors
    let highlights =
        Object.keys(tasks)
        .filter((uuid) => tasks[uuid].is_done)
        .reduce((prev, uuid) => { prev[uuid] = constants.task_graph.done_color; return prev; },
                {} as {[key:UUID]: ColorValue});
    if (selected) {
        highlights[selected] = constants.task_graph.selected_color;
    }

    return (
    <View style={[styles.verticalFlexContainer]}>
        <TaskGraphComponent
            tasks={tasks} highlights={highlights}
            onTaskPress={toggleSelected}
            onBackgroundPress={() => setSelected(null)}/>
        <View style={[styles.verticalFlexContainer, {position: 'absolute', bottom: 150, backgroundColor: 'white'}]}>
            { /* if there is a selected task */ selected?
            <View style={styles.horizontalFlexContainer}>
                <Button onPress={addChildTask}>
                    Create Child Task
                </Button>
                <Button onPress={editTask}>
                    Edit Task
                </Button>
                <Button onPress={deleteTask}>
                    Delete Task
                </Button>
            </View>
            :
            <Button onPress={addTask}>
                Create New Task
            </Button>
            }
        </View>
    </View>);
}