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

  if (constants.debug) console.log("\n\n");

  const [ tasks, dispatch ] = useTasks();
  const doneInitializingTasks = useIntializer(dispatch);
  const schedule = useScheduler(tasks, 1000 * 60 * 60 * 24 * 365); // creates a one-at-a-time schedule
  useNotifications(tasks, schedule); // gives notifications to the user for when tasks start
  const [ agendaTaskUUID, setAgendaTaskUUID ] = useState(null);

  // hook to re-render when we reach the start or end of a schedule instance
  useEffect(() => {
    if (schedule.length > 0) {
      let t1 = schedule[0].during.timeFrom >= Date.now() ?
        setTimeout(() => setAgendaTaskUUID(schedule[0].uuid), schedule[0].during.timeFrom - Date.now()) : null;
      let t2 = setTimeout(() => setAgendaTaskUUID(null), schedule[0].during.timeUntil - Date.now());
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  });

  // check if the current agenda is valid
  if (agendaTaskUUID && !(agendaTaskUUID in tasks)) {
    setAgendaTaskUUID(null);
  }

  // check if we can set the currently scheduled item (if it exists) for the agenda
  if (
    !agendaTaskUUID &&
    schedule.length > 0 &&
    schedule[0].during.timeFrom <= Date.now() &&
    schedule[0].during.timeUntil >= Date.now()
  ) {
    console.log('set schedule for agenda');
    setAgendaTaskUUID(schedule[0].uuid);
  }

  if (agendaTaskUUID in tasks) console.log(tasks[agendaTaskUUID].name);


  if (constants.debug) {
    for (let itm of schedule) {
      console.log(`SCHEDULE: ${tasks[itm.uuid].name} from ${new Date(itm.during.timeFrom)}: until ${new Date(itm.during.timeUntil)}`);
    }
  }

  if (!doneInitializingTasks) return <Text>Loading</Text>;

  // TODO (if any bugs appear) : change same-instant event scheduling so that they're emitted by the same timer

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