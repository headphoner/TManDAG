import { registerRootComponent } from 'expo';
import { Text } from 'react-native';
import React, { useEffect, useState } from 'react';
import AgendaScreen from './AgendaScreen';
import Tasks, { TasksContext } from './Tasks';
import { useTasks } from './TasksReducer';
import useScheduler from './ScheduleHook';
import useIntializer from './InitializerHook';
import ScheduleScreen from './ScheduleScreen';
import ScreenCarousel from './ScreenCarousel';
import TasksManageScreen from './TasksManageScreen';
import { PaperProvider } from 'react-native-paper';
import DevScreen from './DevScreen';
import useNotifications from './NotificationsHook';
import constants from '../constants.json';

// register for expo to recognize `App` as the entry point component
registerRootComponent(App);

/**
 * The master component / entry point for the TMan app.
 * @returns The React Native component which constitutes the app
 */
export default function App(): React.JSX.Element {

  const [ tasks, dispatch ] = useTasks();
  const doneInitializingTasks = useIntializer(dispatch);
  const schedule = useScheduler(tasks, constants.scheduler.lookahead_millis); // calculate the task schedule
  useNotifications(tasks, schedule); // gives notifications to the user whenever a task starts
  const [ agendaTaskUUID, setAgendaTaskUUID ] = useState(null);

  // hook to re-render when we reach the start or end of scheduled instances
  useEffect(() => {
    if (schedule.length > 0) {
      // update when a scheduled instance starts
      let t1 = schedule[0].during.timeFrom >= Date.now() ?
        setTimeout(() => setAgendaTaskUUID(schedule[0].uuid), schedule[0].during.timeFrom - Date.now()) : null;

      // update when a scheduled instance ends
      let t2 = setTimeout(() => setAgendaTaskUUID(null), schedule[0].during.timeUntil - Date.now());

      // return the clean-up function
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  });

  // ensure current agenda task is valid
  if (agendaTaskUUID && !(agendaTaskUUID in tasks)) {
    setAgendaTaskUUID(null);
  }

  // if something is schedule for now and we have no agenda task, set it as the agenda task
  if (
    !agendaTaskUUID &&
    schedule.length > 0 &&
    schedule[0].during.timeFrom <= Date.now() &&
    schedule[0].during.timeUntil >= Date.now()
  ) {
    setAgendaTaskUUID(schedule[0].uuid);
  }

  if (!doneInitializingTasks) return <Text>Loading</Text>;

  ///
  /// UI Code
  ///

  let homeScreen = agendaTaskUUID ?
    <AgendaScreen
      scheduledTaskUUID={agendaTaskUUID}
      onTaskDone={ (uuid) => dispatch({ type: 'tasks/finish', task: uuid }) }
      onFinish={ () => {
        dispatch({ type: 'tasks/agenda_finish', task: agendaTaskUUID });
        setAgendaTaskUUID(null);
      } }
      onTaskSkipped={ () => {
        setAgendaTaskUUID(null);
      } }
    /> : <Text>Nothing scheduled</Text>;

  return (
    <PaperProvider>
      <TasksContext.Provider value={[tasks, dispatch]}>
        <ScreenCarousel
          screens={[
            <ScheduleScreen/>,
            homeScreen,
            <TasksManageScreen/>
          ].concat((constants.debug ? [ <DevScreen/> ] : [] ))}
          screenSelectorLabels={[
            <Text>Schedule</Text>,
            <Text>Agenda</Text>,
            <Text>Tasks</Text>
          ].concat((constants.debug ? [ <Text>Dev</Text> ] : [] ))}
          defaultScreenIndex={1}
        />
      </TasksContext.Provider>
    </PaperProvider>
  );
}