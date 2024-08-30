import { View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * A React Native component to allow a user to see and change a date/time
 * @param options 
 * @param options.value - The default time to display
 * @param [options.onChange] - A function which is called with the new date/time
 * (in milliseconds since 1 Jan 1970, UTC) each time the user changes it
 * @returns A React Native component displaying the date/time `options.value`
 * and calls `options.onChange` when the date/time is changed
 */
export default function DateTimeInputComponent(
    { value, onChange = null } :
    { value: number, onChange?: (date: number) => void }
) {
    return (
    <View style={{ flexDirection: 'row' }}>
        <DateTimePicker
          value={new Date(value)}
          mode={"date"}
          is24Hour={true}
          onChange={(_, date) => onChange(date.getTime())}/>
        <DateTimePicker
          value={new Date(value)}
          mode={"time"}
          is24Hour={true}
          onChange={(_, date) => onChange(date.getTime())}/>
    </View>);
}